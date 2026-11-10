const express = require("express");
const router = express.Router();

const {
  getHalls,
  getHallById,
  getHallStatistics
} = require("../controllers/hallController");

const {
  authMiddleware,
  requireStaffOrAdmin
} = require("../middleware/authMiddleware");

// All hall routes require authentication
// and admin/staff permissions
router.use(authMiddleware);
router.use(requireStaffOrAdmin);

// NOTICE:
// Put /statistics before /:id, so Express does not treat "statistics" as an ID.

// GET /api/halls/statistics?month=2026-11
router.get("/statistics", getHallStatistics);

// GET /api/halls
router.get("/", getHalls);

// GET /api/halls/:id
router.get("/:id", getHallById);

module.exports = router;

