const pool = require("../config/db");

const {
  markBookingPaidFromVerifiedStripe,
} = require("./bookingController");

function positiveId(value) {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function getPaymentIntentId(session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id || null;
}

async function handleStripeWebhook(req, res) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).send("Stripe is not configured.");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe webhook is not configured.");
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).send("Raw request body is required.");
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  let event;

  // 1. Verify Stripe signature.
  try {
    const signature = req.get("stripe-signature");

    if (!signature) {
      return res.status(400).send("Missing Stripe signature.");
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature error:", error.message);
    return res.status(400).send("Invalid Stripe webhook signature.");
  }

  const session = event.data?.object || {};

  const bookingId = positiveId(session.metadata?.booking_id);
  const paymentAttemptId = positiveId(
    session.metadata?.payment_attempt_id
  );

  const requiresAttempt = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
  ].includes(event.type);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 2. Register event. Stripe event ID is the primary key.
    await client.query(
      `
      INSERT INTO stripe_webhook_events (
        stripe_event_id,
        event_type,
        stripe_object_id,
        booking_id,
        payment_attempt_id,
        processing_status,
        attempt_count,
        received_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, 'received', 0, NOW(), NOW())
      ON CONFLICT (stripe_event_id) DO NOTHING
      `,
      [
        event.id,
        event.type,
        session.id || null,
        bookingId,
        paymentAttemptId,
      ]
    );

    // 3. Lock event row to prevent concurrent duplicate processing.
    const eventResult = await client.query(
      `
      SELECT *
      FROM stripe_webhook_events
      WHERE stripe_event_id = $1
      FOR UPDATE
      `,
      [event.id]
    );

    const webhookEvent = eventResult.rows[0];

    if (webhookEvent.processing_status === "processed") {
      await client.query("COMMIT");

      return res.status(200).json({
        received: true,
        duplicate: true,
      });
    }

    await client.query(
      `
      UPDATE stripe_webhook_events
      SET processing_status = 'processing',
          attempt_count = attempt_count + 1,
          last_error = NULL,
          updated_at = NOW()
      WHERE stripe_event_id = $1
      `,
      [event.id]
    );

    // 4. Ignore unrelated Stripe events safely.
    if (!requiresAttempt) {
      await client.query(
        `
        UPDATE stripe_webhook_events
        SET processing_status = 'processed',
            processed_at = NOW(),
            updated_at = NOW()
        WHERE stripe_event_id = $1
        `,
        [event.id]
      );

      await client.query("COMMIT");

      return res.status(200).json({ received: true });
    }

    if (!bookingId || !paymentAttemptId || !session.id) {
      throw new Error("Missing booking or payment attempt metadata.");
    }

    // 5. Lock and verify the payment attempt.
    const attemptResult = await client.query(
      `
      SELECT *
      FROM stripe_payment_attempts
      WHERE id = $1
        AND booking_id = $2
      FOR UPDATE
      `,
      [paymentAttemptId, bookingId]
    );

    const attempt = attemptResult.rows[0];

    if (!attempt) {
      throw new Error("Payment attempt not found.");
    }

    if (attempt.stripe_checkout_session_id !== session.id) {
      throw new Error("Checkout Session does not match payment attempt.");
    }

    // 6. Handle successful payment.
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      // A completed Checkout Session is not necessarily a paid Session.
      if (session.payment_status !== "paid") {
        await client.query(
          `
          UPDATE stripe_webhook_events
          SET processing_status = 'processed',
              processed_at = NOW(),
              updated_at = NOW()
          WHERE stripe_event_id = $1
          `,
          [event.id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
          received: true,
          paymentStatus: session.payment_status,
        });
      }

      const paymentIntentId = getPaymentIntentId(session);

      if (!paymentIntentId) {
        throw new Error("Paid Checkout Session has no PaymentIntent ID.");
      }

      // Verify amount and currency against our database.
      if (
        Number(session.amount_total) !== Number(attempt.amount_cents) ||
        String(session.currency).toLowerCase() !== attempt.currency
      ) {
        throw new Error("Stripe payment amount or currency mismatch.");
      }

      // This function uses its own transaction and locks the Booking.
      const paymentResult = await markBookingPaidFromVerifiedStripe(
        bookingId,
        paymentIntentId
      );

      if (paymentResult.ok) {
        // Normal payment, or duplicate notification for the same payment.
        await client.query(
          `
          UPDATE stripe_payment_attempts
          SET stripe_payment_intent_id = $2,
              status = 'completed',
              failure_message = NULL
              updated_at = NOW()
          WHERE id = $1
          `,
          [paymentAttemptId, paymentIntentId]
        );
      } else {
        // Stripe payment succeeded, but the Booking cannot be marked as paid.
        // Refunds are not supported currently, so flag this for manual review.

        const manualReviewMessage =
            `Stripe payment succeeded but could not be applied to booking. ` +
            `Manual review required. Reason: ${
            paymentResult.reason || "not_payable"
            }`;

        await client.query(
            `
            UPDATE stripe_payment_attempts
            SET stripe_payment_intent_id = $2,
                status = 'completed',
                failure_message = $3,
                updated_at = NOW()
            WHERE id = $1
            `,
            [
            paymentAttemptId,
            paymentIntentId,
            manualReviewMessage.slice(0, 1000),
            ]
        );

        console.error(
            `MANUAL PAYMENT REVIEW REQUIRED: booking ${bookingId}, ` +
            `payment attempt ${paymentAttemptId}, PaymentIntent ${paymentIntentId}. ` +
            `Reason: ${paymentResult.reason || "not_payable"}`
        );
        }
    }

    // 7. Handle expired Checkout Session.
    if (event.type === "checkout.session.expired") {
      await client.query(
        `
        UPDATE stripe_payment_attempts
        SET status = 'expired',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'created'
        `,
        [paymentAttemptId]
      );
    }

    // 8. Handle failed asynchronous payment.
    if (event.type === "checkout.session.async_payment_failed") {
      await client.query(
        `
        UPDATE stripe_payment_attempts
        SET status = 'failed',
            failure_message = 'Stripe asynchronous payment failed.',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'created'
        `,
        [paymentAttemptId]
      );
    }

    // 9. Mark event processed.
    await client.query(
      `
      UPDATE stripe_webhook_events
      SET processing_status = 'processed',
          processed_at = NOW(),
          updated_at = NOW()
      WHERE stripe_event_id = $1
      `,
      [event.id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      received: true,
      event_type: event.type,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Stripe webhook processing error:", error);

    // Record failure outside the rolled-back transaction.
    try {
      await pool.query(
        `
        INSERT INTO stripe_webhook_events (
          stripe_event_id,
          event_type,
          stripe_object_id,
          booking_id,
          payment_attempt_id,
          processing_status,
          attempt_count,
          last_error,
          received_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 'failed', 1, $6, NOW(), NOW())
        ON CONFLICT (stripe_event_id)
        DO UPDATE SET
          processing_status = 'failed',
          attempt_count = stripe_webhook_events.attempt_count + 1,
          last_error = EXCLUDED.last_error,
          updated_at = NOW()
        `,
        [
          event.id,
          event.type,
          session.id || null,
          bookingId,
          paymentAttemptId,
          String(error.message || "Webhook processing failed").slice(0, 1000),
        ]
      );
    } catch (logError) {
      console.error("Failed to record webhook error:", logError);
    }

    // Non-2xx tells Stripe to retry delivery.
    return res.status(500).send("Webhook processing failed.");
  } finally {
    client.release();
  }
}

module.exports = {
  handleStripeWebhook,
};