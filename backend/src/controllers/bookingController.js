const pool = require("../config/db");

// GET /api/bookings/my-bookings
async function getMyBookings(req, res) {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `
      SELECT
        b.id AS booking_id,
        b.customer_email,
        b.total_amount,
        b.status,
        b.expires_at,
        b.created_at,

        s.id AS showtime_id,
        s.start_time,
        s.is_premiere,

        m.id AS movie_id,
        m.title AS movie_title,
        m.poster_url,
        m.duration_min,
        m.age_rating,

        h.city,
        h.name AS hall_name,

        COALESCE(
          json_agg(
            json_build_object(
              'row_number', bs.row_number,
              'seat_number', bs.seat_number,
              'ticket_type', bs.ticket_type,
              'seat_price', bs.seat_price
            )
          ) FILTER (WHERE bs.id IS NOT NULL),
          '[]'
        ) AS seats

      FROM bookings b
      JOIN showtimes s ON b.showtime_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      LEFT JOIN booked_seats bs ON b.id = bs.booking_id

      WHERE b.user_id = $1

      GROUP BY
        b.id,
        s.id,
        m.id,
        h.id

      ORDER BY b.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      message: "Unable to retrieve your bookings.",
    });
  }
}

module.exports = {
  getMyBookings,
};
