const express = require("express");
const {
  getMyBookings,
} = require("../controllers/bookingController");

const { authMiddleware, requireStaffOrAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/bookings/my-bookings
router.get("/my-bookings", authMiddleware, getMyBookings);

module.exports = router;
