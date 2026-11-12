const crypto = require("crypto");
const pool = require("../config/db");

// Hash algorithm must match bookingController.js.
function hashGuestToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function guestTokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;

  const candidate = Buffer.from(hashGuestToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");

  return (
    candidate.length === stored.length &&
    crypto.timingSafeEqual(candidate, stored)
  );
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getGuestToken(req) {
  return (
    req.get("x-guest-checkout-token") ||
    req.body?.guest_checkout_token ||
    null
  );
}

function amountToCents(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const cents = Math.round(value * 100);

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return null;
  }

  return cents;
}

async function createCheckoutSession(req, res) {
  const bookingId = validId(req.body?.booking_id);

  if (!bookingId) {
    return res.status(400).json({
      message: "A valid booking_id is required.",
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({
      message: "Stripe payments are not configured yet.",
    });
  }

  if (!process.env.CLIENT_URL) {
    return res.status(503).json({
      message: "CLIENT_URL is not configured.",
    });
  }

  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const client = await pool.connect();

  let booking;
  let paymentAttempt;
  let seats = [];
  let existingAttempt = false;

  try {
    await client.query("BEGIN");

    // Lock the booking while checking its status and ownership.
    const bookingResult = await client.query(
      `
      SELECT
        b.id,
        b.user_id,
        b.customer_email,
        b.total_amount,
        b.status,
        b.expires_at,
        b.guest_token_hash,
        b.showtime_id,
        s.start_time,
        m.title AS movie_title,
        h.city,
        h.name AS hall_name
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id
      WHERE b.id = $1
      FOR UPDATE OF b
      `,
      [bookingId]
    );

    booking = bookingResult.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    // Only checkout_locked and reserved_unpaid can be paid online.
    if (
      !["checkout_locked", "reserved_unpaid"].includes(booking.status)
    ) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This booking cannot be paid.",
        status: booking.status,
      });
    }

    // Check expiry before creating a payment attempt.
    if (new Date(booking.expires_at) <= new Date()) {
      await client.query(
        `
        UPDATE bookings
        SET status = 'expired'
        WHERE id = $1
          AND status IN ('checkout_locked', 'reserved_unpaid')
        `,
        [bookingId]
      );

      await client.query(
        `
        UPDATE booked_seats
        SET released_at = NOW()
        WHERE booking_id = $1
          AND released_at IS NULL
        `,
        [bookingId]
      );

      await client.query("COMMIT");

      return res.status(410).json({
        message: "This booking has expired. Please select your seats again.",
      });
    }

    // Logged-in reservation payment.
    if (booking.status === "reserved_unpaid") {
      if (
        !req.user?.userId ||
        Number(req.user.userId) !== Number(booking.user_id)
      ) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          message: "Only the owner of this reservation can pay for it.",
        });
      }
    }

    // Checkout hold payment: verify either the owner or guest token.
    if (booking.status === "checkout_locked") {
      if (booking.user_id) {
        if (
          !req.user?.userId ||
          Number(req.user.userId) !== Number(booking.user_id)
        ) {
          await client.query("ROLLBACK");
          return res.status(403).json({
            message: "You cannot pay for another user's booking.",
          });
        }
      } else {
        const guestToken = getGuestToken(req);

        if (!guestTokenMatches(guestToken, booking.guest_token_hash)) {
          await client.query("ROLLBACK");
          return res.status(403).json({
            message: "A valid guest checkout token is required.",
          });
        }
      }
    }

    const amountCents = amountToCents(booking.total_amount);

    if (!amountCents) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "The booking has an invalid payment amount.",
      });
    }

    // Only active seats belonging to this booking are included.
    const seatsResult = await client.query(
      `
      SELECT row_number, seat_number, ticket_type
      FROM booked_seats
      WHERE booking_id = $1
        AND showtime_id = $2
        AND released_at IS NULL
      ORDER BY row_number, seat_number
      `,
      [bookingId, booking.showtime_id]
    );

    seats = seatsResult.rows;

    if (seats.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This booking has no active seats.",
      });
    }

    // Reuse the latest active Checkout Session when possible.
    const previousResult = await client.query(
      `
      SELECT *
      FROM stripe_payment_attempts
      WHERE booking_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [bookingId]
    );

    const previousAttempt = previousResult.rows[0];

    if (previousAttempt?.status === "created") {
      if (previousAttempt.stripe_checkout_session_id) {
        paymentAttempt = previousAttempt;
        existingAttempt = true;
      } else {
        // Another request may currently be creating the Stripe Session.
        const ageMs =
          Date.now() - new Date(previousAttempt.created_at).getTime();

        if (ageMs < 2 * 60 * 1000) {
          await client.query("COMMIT");

          return res.status(409).json({
            message: "A payment session is currently being created. Please try again shortly.",
          });
        }

        // An old attempt without a session can safely be marked failed.
        await client.query(
          `
          UPDATE stripe_payment_attempts
          SET status = 'failed',
              failure_message = 'Checkout Session creation did not complete.',
              updated_at = NOW()
          WHERE id = $1
            AND status = 'created'
            AND stripe_checkout_session_id IS NULL
          `,
          [previousAttempt.id]
        );
      }
    }

    if (!existingAttempt) {
      const idempotencyKey = `rio_booking_${bookingId}_${crypto.randomUUID()}`;

      const attemptResult = await client.query(
        `
        INSERT INTO stripe_payment_attempts (
          booking_id,
          idempotency_key,
          amount_cents,
          currency,
          status
        )
        VALUES ($1, $2, $3, 'eur', 'created')
        RETURNING *
        `,
        [bookingId, idempotencyKey, amountCents]
      );

      paymentAttempt = attemptResult.rows[0];
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Prepare Stripe Checkout error:", error);

    return res.status(500).json({
      message: "Unable to prepare this payment.",
    });
  } finally {
    client.release();
  }

  // Reuse an existing Stripe Session if it is still open.
  if (existingAttempt) {
    try {
      const existingSession = await stripe.checkout.sessions.retrieve(
        paymentAttempt.stripe_checkout_session_id
      );

      if (
        existingSession.status === "open" &&
        existingSession.url &&
        existingSession.payment_status === "unpaid"
      ) {
        return res.status(200).json({
          url: existingSession.url,
          reused: true,
        });
      }

      if (existingSession.status === "complete") {
        return res.status(409).json({
          message: "This payment session has already been completed. Payment confirmation is being processed.",
        });
      }

      await pool.query(
        `
        UPDATE stripe_payment_attempts
        SET status = 'expired',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'created'
        `,
        [paymentAttempt.id]
      );
    } catch (error) {
      console.error("Retrieve existing Stripe Session error:", error);

      return res.status(503).json({
        message: "Unable to check the existing payment session. Please try again.",
      });
    }

    // The old session is no longer usable. Create a new attempt.
    const idempotencyKey = `rio_booking_${bookingId}_${crypto.randomUUID()}`;

    try {
      const result = await pool.query(
        `
        INSERT INTO stripe_payment_attempts (
          booking_id,
          idempotency_key,
          amount_cents,
          currency,
          status
        )
        VALUES ($1, $2, $3, 'eur', 'created')
        RETURNING *
        `,
        [bookingId, idempotencyKey, amountToCents(booking.total_amount)]
      );

      paymentAttempt = result.rows[0];
    } catch (error) {
      console.error("Create replacement payment attempt error:", error);

      return res.status(500).json({
        message: "Unable to create a new payment attempt.",
      });
    }
  }

  try {
    const clientUrl = process.env.CLIENT_URL.replace(/\/+$/, "");

    const seatDescription = seats
      .map(
        (seat) => `Row ${seat.row_number}, Seat ${seat.seat_number}`
      )
      .join("; ");

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",



        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `${booking.movie_title} (${seats.length} tickets)`,
                description: `${booking.city} · ${booking.hall_name} · ${seatDescription}`,
              },
              unit_amount: paymentAttempt.amount_cents,
            },
            quantity: 1,
          },
        ],

        customer_email: booking.customer_email,

        client_reference_id: String(booking.id),

        metadata: {
          booking_id: String(booking.id),
          payment_attempt_id: String(paymentAttempt.id),
        },

        payment_intent_data: {
          metadata: {
            booking_id: String(booking.id),
            payment_attempt_id: String(paymentAttempt.id),
          },
        },

        success_url:
          `${clientUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${clientUrl}/checkout?booking_id=${booking.id}`,
      },
      {
        idempotencyKey: paymentAttempt.idempotency_key,
      }
    );

    await pool.query(
      `
      UPDATE stripe_payment_attempts
      SET stripe_checkout_session_id = $2,
          session_expires_at = TO_TIMESTAMP($3),
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        paymentAttempt.id,
        session.id,
        session.expires_at,
      ]
    );

    return res.status(200).json({
      url: session.url,
      reused: false,
    });
  } catch (error) {
    console.error("Stripe Checkout Session Error:", error);

    try {
      await pool.query(
        `
        UPDATE stripe_payment_attempts
        SET status = 'failed',
            failure_message = $2,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'created'
        `,
        [
          paymentAttempt.id,
          String(error.message || "Stripe Checkout creation failed").slice(0, 1000),
        ]
      );
    } catch (dbError) {
      console.error("Failed to update payment attempt:", dbError);
    }

    return res.status(500).json({
      message: "Unable to create the payment session.",
    });
  }
}

module.exports = {
  createCheckoutSession,
};
