const express = require("express");
const router = express.Router();

const {
  optionalAuthMiddleware,
} = require("../middleware/optionalAuthMiddleware");

const {
  createCheckoutSession,
} = require("../controllers/paymentController");

const {
  handleStripeWebhook,
} = require("../controllers/stripeWebhookController");

// Stripe webhook must not require login.
router.post("/webhook", handleStripeWebhook);

// Checkout Session creation.
router.post(
  "/create-checkout-session",
  optionalAuthMiddleware,
  createCheckoutSession
);

module.exports = router;