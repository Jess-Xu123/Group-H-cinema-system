const Stripe = require("stripe");
const { markBookingPaidFromVerifiedStripe } = require("./bookingController");

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe payments are not configured.");
  }
  return Stripe(process.env.STRIPE_SECRET_KEY);
}

async function createCheckoutSession(req, res) {
  try {
    // Check Stripe configuration only when payment is requested.
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        message: "Stripe payments are not configured yet.",
      });
    }

    const payload = req.body.bookingData || req.body;
    const {
      bookingId,
      screening,
      selectedSeats = [],
      total,
      customerDetails,
    } = payload;

    if (!bookingId) {
      return res
        .status(400)
        .json({ message: "Booking ID is required before payment." });
    }

    // Create Stripe payment session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${screening?.movie_title || "Movie Ticket"} (${selectedSeats.length} tickets)`,
              description: `${screening?.city || "Cinema"} · ${screening.hall_name || "Hall"}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        booking_id: String(bookingId),
      },
      success_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/checkout?payment=cancelled`,
      customer_email: customerDetails?.email,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout Session Error:", error);

    return res.status(500).json({
      message: "Unable to create payment session.",
    });
  }
}

async function handleStripeWebhook(req, res) {
  const sig = req.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!process.env.STRIPE_SECRET_KEY || !endpointSecret) {
    return res.status(503).json({ message: "Stripe webhooks are not configured." });
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // when user finishes payment

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true });
    }

    const bookingId = Number(session.metadata?.booking_id);
    const paymentIntentId = session.payment_intent;

    if (bookingId) {
      try {
        const result = await markBookingPaidFromVerifiedStripe(
          bookingId,
          paymentIntentId,
        );
        if (!result.ok) {
          console.error(
            `Booking #${bookingId} could not be marked paid: ${result.reason}`,
          );
          return res.status(500).json({ message: "Booking payment update failed." });
        }
        console.log(`Booking #${bookingId} marked as PAID:`, result);
      } catch (dbError) {
        console.error(`Failed to mark booking #${bookingId} as paid:`, dbError);
        return res.status(500).json({ message: "Database update failed." });
      }
    }
  }

  return res.status(200).json({ received: true });
}

module.exports = { createCheckoutSession, handleStripeWebhook };
