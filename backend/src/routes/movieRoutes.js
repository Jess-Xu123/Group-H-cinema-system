const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        external_api_id,
        title,
        description,
        duration_min,
        genre,
        age_rating,
        base_price,
        poster_url,
        trailer_url,
        banner_ad_url,
        is_upcoming,
        is_published
      FROM movies
      WHERE is_published = TRUE
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch movies:", err);
    res.status(500).json({
      error: "Failed to fetch movies",
    });
  }
});

module.exports = router;