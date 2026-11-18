const express = require("express");
const router = express.Router();

const {
  createPrivateScreeningEnquiry,
  getPrivateScreeningEnquiries,
  getPrivateScreeningEnquiryById,
  approvePrivateScreeningEnquiry,
  rejectPrivateScreeningEnquiry,
  confirmPrivateScreeningEnquiry,
} = require("../controllers/privateScreeningController");

const {
  authMiddleware,
  requireStaffOrAdmin,
} = require("../middleware/authMiddleware");

// Public: customer submits an enquiry
router.post("/", createPrivateScreeningEnquiry);

// All routes below require Staff/Admin
router.use(authMiddleware, requireStaffOrAdmin);

// Get all enquiries (optional filters: status, location, date)
router.get("/admin", getPrivateScreeningEnquiries);

// Get one enquiry
router.get("/admin/:id", getPrivateScreeningEnquiryById);

// Approve: pending -> contacted
router.patch("/admin/:id/approve", approvePrivateScreeningEnquiry);

// Reject: pending/contacted -> rejected
router.patch("/admin/:id/reject", rejectPrivateScreeningEnquiry);

// Confirm: contacted -> confirmed, linked to a showtime
router.patch("/admin/:id/confirm", confirmPrivateScreeningEnquiry);

module.exports = router;
