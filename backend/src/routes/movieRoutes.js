const express = require("express");
const {
  getMovies,
  addMovie,
  getAllMoviesForManagement,
  updateMovie,
  deleteMovie
} = require("../controllers/movieController");

const { 
  authMiddleware, 
  requireStaffOrAdmin
} = require("../middleware/authMiddleware");

const router = express.Router();


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