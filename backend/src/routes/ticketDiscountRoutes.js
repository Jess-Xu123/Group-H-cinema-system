const express = require("express");

const {
  getTicketDiscounts,
  updateTicketDiscounts,
} = require("../controllers/ticketDiscountController");

const {
  authMiddleware,
  requireAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Public read: Guest Checkout also needs current discounts.
router.get("/", getTicketDiscounts);

// Only Admin can update discount percentages.
router.put("/", authMiddleware, requireAdmin, updateTicketDiscounts);

module.exports = router;