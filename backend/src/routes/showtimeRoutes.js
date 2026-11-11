const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

router.get("/", async (req, res) => {
  try {
    const { city, date } = req.query;

    if (date && !isValidDate(date)) {
      return res.status(400).json({ error: "Date must use YYYY-MM-DD format." });
    }

    let query = `
      SELECT
        s.id AS showtime_id,
        s.movie_id,
        s.start_time,
        s.is_premiere,
        m.description AS movie_description,
        m.duration_min,
        m.genre,
        m.poster_url,
        m.trailer_url,
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
      query += ` AND h.city = $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND s.start_time >= ($${params.length}::date::timestamp AT TIME ZONE 'Europe/Helsinki')
        AND s.start_time < (($${params.length}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Europe/Helsinki')`;
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

router.get("/:id/seats", async (req, res) => {
  const showtimeId = Number(req.params.id);
  if (!Number.isInteger(showtimeId) || showtimeId < 1) {
    return res.status(400).json({ error: "Showtime ID must be a positive integer." });
  }

  try {

    await pool.query(
      `DELETE FROM bookings
       WHERE showtime_id = $1
         AND status IN ('checkout_locked', 'reserved_unpaid')
         AND expires_at <= NOW();`,
      [showtimeId]
    );
    
    const screeningQuery = `
      SELECT
        s.id AS showtime_id,
        s.movie_id,
        s.start_time,
        s.is_premiere,
        m.title AS movie_title,
        m.base_price,
        m.poster_url,
        m.age_rating,
        h.id AS hall_id,
        h.city,
        h.name AS hall_name,
        h.capacity,
        h.total_rows,
        h.seats_per_row,
        h.wheelchair_limit
      FROM showtimes s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      WHERE s.id = $1
        AND s.is_private_company = FALSE
        AND m.is_published = TRUE;
    `;
    const { rows } = await pool.query(screeningQuery, [showtimeId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Showtime not found." });
    }

    const bookedSeatsQuery = `
      SELECT bs.row_number, bs.seat_number
      FROM booked_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.showtime_id = $1
        AND b.status IN ('paid', 'reserved_unpaid', 'checkout_locked')
        AND (b.expires_at IS NULL OR b.expires_at > NOW())
      ORDER BY bs.row_number, bs.seat_number;
    `;
    const bookedSeatsResult = await pool.query(bookedSeatsQuery, [showtimeId]);

    return res.json({
      screening: rows[0],
      bookedSeats: bookedSeatsResult.rows,
    });
  } catch (err) {
    console.error("Failed to fetch seat map:", err);
    return res.status(500).json({ error: "Failed to fetch seat map." });
  }
});

module.exports = router;