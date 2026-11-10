const express = require("express");
const router = express.Router();

const {
  getUserStatistics,
  getUsers,
  getUserById,
  updateUserRole,
} = require("../controllers/userController");

const {
  authMiddleware,
  requireAdmin,
} = require("../middleware/authMiddleware");

// All Users Management endpoints require Admin.
router.use(authMiddleware);
router.use(requireAdmin);

// Statistics must come before /:id.
router.get("/statistics", getUserStatistics);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id/role", updateUserRole);

module.exports = router;
