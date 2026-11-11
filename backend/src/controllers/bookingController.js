const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function getOptionalUserId(req) {
  try {
    const token = req.cookies?.token;
    if (!token || !process.env.JWT_SECRET) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
}

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

async function holdSeats(req, res) {
  const { showtime_id, customer_email, seats, user_id } = req.body;
  const showtimeId = Number(showtime_id);

  if (!Number.isInteger(showtimeId) || showtimeId < 1) {
    return res.status(400).json({
      error: "A valid showtime_id is required.",
      message: "A valid showtime_id is required.",
    });
  }

  if (!customer_email || !String(customer_email).trim()) {
    return res.status(400).json({
      error: "Customer email is required to hold seats.",
      message: "Customer email is required to hold seats.",
    });
  }

  if (!Array.isArray(seats) || seats.length === 0) {
    return res.status(400).json({
      error: "At least one seat must be selected.",
      message: "At least one seat must be selected.",
    });
  }

  const resolvedUserId = user_id || getOptionalUserId(req);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM bookings
       WHERE showtime_id = $1
         AND status IN ('checkout_locked', 'reserved_unpaid')
         AND expires_at <= NOW();`,
      [showtimeId]
    );

    const totalAmount = seats.reduce(
      (sum, seat) => sum + Number(seat.seat_price ?? seat.price ?? 0),
      0
    );

    const bookingResult = await client.query(
      `INSERT INTO bookings (
         user_id, showtime_id, customer_email, total_amount, status, expires_at
       )
       VALUES ($1, $2, $3, $4, 'checkout_locked', NOW() + INTERVAL '15 minutes')
       RETURNING id, user_id, showtime_id, customer_email, total_amount, status, expires_at, created_at;`,
      [resolvedUserId, showtimeId, String(customer_email).trim().toLowerCase(), totalAmount.toFixed(2)]
    );

    const newBooking = bookingResult.rows[0];

    for (const seat of seats) {
      await client.query(
        `INSERT INTO booked_seats (
           booking_id, showtime_id, row_number, seat_number, ticket_type, seat_price
         ) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          newBooking.id,
          showtimeId,
          Number(seat.row_number ?? seat.row),
          Number(seat.seat_number ?? seat.seat ?? seat.number),
          seat.ticket_type || "normal",
          Number(seat.seat_price ?? seat.price ?? 0).toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Seats locked for 15 minutes.",
      booking: newBooking,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        error: "One or more selected seats are already held or booked by another customer.",
        message: "One or more selected seats are already held or booked by another customer.",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        error: "Invalid seat selection (Row 13 and Owner Seat #1 cannot be booked).",
        message: "Invalid seat selection (Row 13 and Owner Seat #1 cannot be booked).",
      });
    }

    console.error("Hold seats error:", error);
    return res.status(500).json({
      error: "Failed to hold seats.",
      message: "Failed to hold seats.",
    });
  } finally {
    client.release();
  }
}

async function confirmBookingPayment(req, res) {
  const bookingId = Number(req.params.id);
  const { stripe_payment_id } = req.body || {};

  if (!Number.isInteger(bookingId) || bookingId < 1) {
    return res.status(400).json({
      error: "Invalid booking ID.",
      message: "Invalid booking ID.",
    });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE bookings
       SET status = 'paid',
           stripe_payment_id = $1,
           expires_at = NULL
       WHERE id = $2
         AND status = 'checkout_locked'
         AND expires_at > NOW()
       RETURNING *;`,
      [stripe_payment_id || `sim_${Date.now()}`, bookingId]
    );

    if (rows.length === 0) {
      await pool.query(
        `DELETE FROM bookings
         WHERE id = $1
           AND status = 'checkout_locked'
           AND expires_at <= NOW();`,
        [bookingId]
      );

      return res.status(410).json({
        error: "Payment timeout: Your 15-minute seat hold has expired and your seats were released.",
        message: "Payment timeout: Your 15-minute seat hold has expired and your seats were released.",
      });
    }

    const confirmedBooking = rows[0];

    if (confirmedBooking.user_id) {
      const seatCountRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM booked_seats WHERE booking_id = $1;`,
        [confirmedBooking.id]
      );
      const ticketCount = seatCountRes.rows[0].count;

      await pool.query(
        `UPDATE users SET paid_tickets_count = paid_tickets_count + $1 WHERE id = $2;`,
        [ticketCount, confirmedBooking.user_id]
      );
    }

    return res.status(200).json({
      message: "Payment confirmed! Your tickets are booked.",
      booking: confirmedBooking,
    });
  } catch (error) {
    console.error("Confirm booking payment error:", error);
    return res.status(500).json({
      error: "Failed to confirm payment.",
      message: "Failed to confirm payment.",
    });
  }
}

async function releaseBookingHold(req, res) {
  const bookingId = Number(req.params.id);

  if (!Number.isInteger(bookingId) || bookingId < 1) {
    return res.status(400).json({
      error: "Invalid booking ID.",
      message: "Invalid booking ID.",
    });
  }

  try {
    await pool.query(
      `DELETE FROM bookings WHERE id = $1 AND status = 'checkout_locked';`,
      [bookingId]
    );

    return res.status(200).json({
      message: "Seat hold released.",
    });
  } catch (error) {
    console.error("Release booking hold error:", error);
    return res.status(500).json({
      error: "Failed to release seat hold.",
      message: "Failed to release seat hold.",
    });
  }
}

module.exports = {
  getMyBookings,
  holdSeats,
  confirmBookingPayment,
  releaseBookingHold,
};