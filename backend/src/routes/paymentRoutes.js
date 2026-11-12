const express = require("express");
const router = express.Router();

const {
  optionalAuthMiddleware,
} = require("../middleware/optionalAuthMiddleware");

const {
  createCheckoutSession,
  getCheckoutSessionStatus,
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

router.get(
  "/checkout-session/:sessionId",
  optionalAuthMiddleware,
  getCheckoutSessionStatus
);

module.exports = router;