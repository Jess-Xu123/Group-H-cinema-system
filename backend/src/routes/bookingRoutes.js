const express = require("express");

const {
  getMyBookings,
  holdSeats,
  reserveBooking,
  releaseBookingHold,
  cancelReservation,
  confirmOfflinePayment,
} = require("../controllers/bookingController");

const {
  authMiddleware,
  requireStaffOrAdmin,
} = require("../middleware/authMiddleware");

const { optionalAuthMiddleware } = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.get("/my-bookings", authMiddleware, getMyBookings);

router.post("/hold", optionalAuthMiddleware, holdSeats);
router.post("/:id/reserve", authMiddleware, reserveBooking);
router.delete("/:id/hold", optionalAuthMiddleware, releaseBookingHold);
router.post("/:id/cancel", authMiddleware, cancelReservation);

router.post(
  "/:id/offline-payment",
  authMiddleware,
  requireStaffOrAdmin,
  confirmOfflinePayment
);

// There is intentionally no public /:id/confirm route.
// Stripe must call markBookingPaidFromVerifiedStripe only after webhook
// signature verification in the Stripe integration.

module.exports = router;
