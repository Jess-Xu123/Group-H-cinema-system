const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");
const showtimeRoutes = require("./routes/showtimeRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Authentication routes
app.use("/api/auth", authRoutes);

// Movies routes
app.use("/api/movies", movieRoutes);

// Showtimes routes
app.use("/api/showtimes", showtimeRoutes);

// Booking routes
app.use("/api/bookings", bookingRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "RIO Cinema Backend is running!",
  });
});

module.exports = app;