const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city } = req.query;

    let query = `
      SELECT
        s.id AS showtime_id,
        s.movie_id,
        s.start_time,
        s.is_premiere,
        m.title AS movie_title,
        m.base_price,
        m.age_rating,
        h.id AS hall_id,
        h.city,
        h.name AS hall_name,
        h.capacity
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE s.is_private_company = FALSE
        AND m.is_published = TRUE
    `;

    const params = [];

    if (city) {
      params.push(city);
      query += ` AND h.city = $1`;
    }

    query += ` ORDER BY s.start_time ASC;`;

    const { rows } = await pool.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch showtimes:", err);

    res.status(500).json({
      error: "Failed to fetch showtimes",
    });
  }
});

module.exports = router;