const express = require("express");

const {
  getMyBookings,
  getAdminBookings,
  holdSeats,
  reserveBooking,
  releaseBookingHold,
  cancelReservation,
  confirmOfflinePayment,
  getAdminWaitlist,
  notifyWaitlistEntry,
  assignWaitlistSeat,
  removeWaitlistEntry,
  getLoyaltyRewards,
} = require("../controllers/bookingController");

const {
  authMiddleware,
  requireStaffOrAdmin,
} = require("../middleware/authMiddleware");

const { optionalAuthMiddleware } = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.get("/my-bookings", authMiddleware, getMyBookings);
router.get(
  "/admin",
  authMiddleware,
  requireStaffOrAdmin,
  getAdminBookings
);

router.post("/hold", optionalAuthMiddleware, holdSeats);
router.get("/loyalty-rewards", authMiddleware, getLoyaltyRewards);
router.post("/:id/reserve", authMiddleware, reserveBooking);
router.delete("/:id/hold", optionalAuthMiddleware, releaseBookingHold);
router.post("/:id/cancel", authMiddleware, cancelReservation);

router.post(
  "/:id/offline-payment",
  authMiddleware,
  requireStaffOrAdmin,
  confirmOfflinePayment
);

router.get("/admin/waitlist", authMiddleware, requireStaffOrAdmin, getAdminWaitlist);
router.post("/admin/waitlist/:id/notify", authMiddleware, requireStaffOrAdmin, notifyWaitlistEntry);
router.post("/admin/waitlist/:id/assign", authMiddleware, requireStaffOrAdmin, assignWaitlistSeat);
router.post("/admin/waitlist/:id/assign-seat", authMiddleware, requireStaffOrAdmin, assignWaitlistSeat);
router.delete("/admin/waitlist/:id", authMiddleware, requireStaffOrAdmin, removeWaitlistEntry);
// There is intentionally no public /:id/confirm route.
// Stripe must call markBookingPaidFromVerifiedStripe only after webhook
// signature verification in the Stripe integration.

module.exports = router;