const express = require("express");
const {
  getMovies,
  addMovie,
  getAllMoviesForManagement,
  updateMovie,
  deleteMovie
} = require("../controllers/movieController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Allow only admin and staff
function requireStaffOrAdmin(req, res, next) {
  if (!["admin", "staff"].includes(req.user.role)) {
    return res.status(403).json({
      message: "Access denied. Staff or admin role required.",
    });
  }

  next();
}

// Get movies (public)
router.get("/", getMovies);

router.get(
  "/manage",
  authMiddleware,
  requireStaffOrAdmin,
  getAllMoviesForManagement
);

// Add movie (admin/staff only)
router.post("/", authMiddleware, requireStaffOrAdmin, addMovie);

// Update a movie (Admin and Staff only)
router.put(
  "/:id",
  authMiddleware,
  requireStaffOrAdmin,
  updateMovie
);

// Delete a movie (Admin and Staff only)
router.delete(
  "/:id",
  authMiddleware,
  requireStaffOrAdmin,
  deleteMovie
);

module.exports = router;