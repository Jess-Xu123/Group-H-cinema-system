const express = require("express");
const pool = require("../config/db");
const { getBookableSeatCount } = require("../services/seatLayout");

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

    // Paid seats remain occupied until explicitly released; expiry only applies
    // to unpaid checkout holds and reservations.
    const bookedSeatsQuery = `
      SELECT bs.row_number, bs.seat_number
      FROM booked_seats bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.showtime_id = $1
        AND b.status IN ('paid', 'reserved_unpaid', 'checkout_locked')
        AND bs.released_at IS NULL
        AND (
          b.status = 'paid'
          OR (
            b.status IN ('reserved_unpaid', 'checkout_locked')
            AND (b.expires_at IS NULL OR b.expires_at > NOW())
          )
        )
      ORDER BY bs.row_number, bs.seat_number;
    `;
    const bookedSeatsResult = await pool.query(bookedSeatsQuery, [showtimeId]);
    
    const takenBookableSeats = bookedSeatsResult.rows.filter(
      (seat) =>
        seat.row_number > 0 &&
        !(seat.row_number === 1 && seat.seat_number === 1),
    ).length;
    const bookableSeatCount = getBookableSeatCount(
      rows[0].total_rows,
      rows[0].seats_per_row,
    );
    const isSoldOut = takenBookableSeats >= bookableSeatCount;

        return res.json({
          screening: rows[0],
          bookedSeats: bookedSeatsResult.rows,
          isSoldOut,
        });
  } catch (err) {
    console.error("Failed to fetch seat map:", err);
    return res.status(500).json({ error: "Failed to fetch seat map." });
  }
});

router.post("/:id/waitlist", async (req, res) => {
  const showtimeId = Number(req.params.id);
  const email = String(req.body.customer_email || "").trim().toLowerCase();

  if (!Number.isInteger(showtimeId) || showtimeId < 1) {
    return res.status(400).json({ error: "Showtime ID must be a positive integer." });
  }
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

try {
    const checkQuery = `
      SELECT
        h.total_rows,
        h.seats_per_row,
        COUNT(bs.id) FILTER (
          WHERE bs.row_number > 0
            AND NOT (bs.row_number = 1 AND bs.seat_number = 1)
        )::int AS taken_seats
      FROM showtimes s JOIN halls h ON s.hall_id = h.id
      LEFT JOIN bookings b
        ON b.showtime_id = s.id
        AND b.status IN ('paid', 'reserved_unpaid', 'checkout_locked')
        AND (
          b.status = 'paid'
          OR (
            b.status IN ('reserved_unpaid', 'checkout_locked')
            AND (b.expires_at IS NULL OR b.expires_at > NOW())
          )
        )
      LEFT JOIN booked_seats bs
        ON bs.booking_id = b.id
        AND bs.showtime_id = s.id
        AND bs.released_at IS NULL
      WHERE s.id = $1 AND s.is_private_company = FALSE
      GROUP BY h.total_rows, h.seats_per_row;
    `;
    const { rows } = await pool.query(checkQuery, [showtimeId]);
    if (rows.length === 0) return res.status(404).json({ error: "Showtime not found." });
    const bookableSeatCount = getBookableSeatCount(
      rows[0].total_rows,
      rows[0].seats_per_row,
    );
    if (rows[0].taken_seats < bookableSeatCount) return res.status(400).json({ error: "Seats are still available." });

    const insertResult = await pool.query(
      `INSERT INTO premiere_waitlist (showtime_id, customer_email)
       VALUES ($1, $2)
       RETURNING id, showtime_id, customer_email, is_notified, created_at;`,
      [showtimeId, email]
    );

    return res.status(201).json({
      message: "Added to the waiting list.",
      waitlistEntry: insertResult.rows[0],
    });

  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Already on the waiting list." });
    return res.status(500).json({ error: "Failed to check availability." });
  }

});

module.exports = router;