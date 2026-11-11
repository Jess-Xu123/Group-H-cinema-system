const express = require("express");
const {
  getMyBookings,
  holdSeats,
  confirmBookingPayment,
  releaseBookingHold,
} = require("../controllers/bookingController");

const { authMiddleware, requireStaffOrAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/bookings/my-bookings
router.get("/my-bookings", authMiddleware, getMyBookings);

router.post("/hold", holdSeats);
router.post("/:id/confirm", confirmBookingPayment);
router.delete("/:id/hold", releaseBookingHold);

module.exports = router;