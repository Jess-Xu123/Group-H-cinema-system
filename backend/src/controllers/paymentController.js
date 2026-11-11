async function createCheckoutSession(req, res) {
  try {
    // Check Stripe configuration only when payment is requested.
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        message: "Stripe payments are not configured yet.",
      });
    }

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    const { screening, selectedSeats, total, customerDetails } = req.body;

    // Create Stripe payment session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${screening.movie_title} (${selectedSeats.length} tickets)`,
              description: `${screening.city} · ${screening.hall_name}`,
            },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
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

module.exports = { createCheckoutSession };

