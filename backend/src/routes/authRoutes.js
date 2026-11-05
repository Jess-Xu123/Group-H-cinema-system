const express = require("express");
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateProfile);
router.put("/password", authMiddleware, changePassword);
router.delete("/account", authMiddleware, deleteAccount);
router.post("/logout", logout);

module.exports = router;