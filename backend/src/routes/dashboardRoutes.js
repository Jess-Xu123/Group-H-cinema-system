const express = require("express");
const router = express.Router();

const {
  getDashboardAlerts,
  getTodayProgramme,
  getRoomOccupancy,
} = require("../controllers/dashboardController");

const { authMiddleware, requireStaffOrAdmin } = require("../middleware/authMiddleware");

router.get(
  "/alerts",
  authMiddleware,
  (req, res, next) => {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Staff or admin role required.",
      });
    }

    next();
  },
  getDashboardAlerts
);

router.get(
  "/today-programme",
  authMiddleware,
  (req, res, next) => {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Staff or admin role required.",
      });
    }
    next();
  },
  getTodayProgramme
);

router.get(
  "/room-occupancy",
  authMiddleware,
  (req, res, next) => {
    if (!["admin", "staff"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Staff or admin role required.",
      });
    }
    next();
  },
  getRoomOccupancy
);

module.exports = router;