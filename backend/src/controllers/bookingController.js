const crypto = require("crypto");
const pool = require("../config/db");
const { expireShowtimeBookings } = require("../services/bookingExpirationService");

const ALLOWED_TICKET_TYPES = new Set([
  "normal",
  "child_under_12",
  "wheelchair",
  "loyalty_10th",
]);

function hashGuestToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function guestTokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;

  const candidate = Buffer.from(hashGuestToken(String(token)), "hex");
  const stored = Buffer.from(storedHash, "hex");

  return candidate.length === stored.length &&
    crypto.timingSafeEqual(candidate, stored);
}

function getGuestToken(req) {
  return req.get("x-guest-checkout-token") ||
    req.body?.guest_checkout_token ||
    null;
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeSeats(seats, hall) {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new Error("At least one seat must be selected.");
  }

  const seen = new Set();

  return seats.map((seat) => {
    const row = Number(seat.row_number ?? seat.row);
    const number = Number(seat.seat_number ?? seat.seat ?? seat.number);
    const ticketType = seat.ticket_type || "normal";

    if (
      !Number.isInteger(row) ||
      !Number.isInteger(number) ||
      row < 0 ||
      row > Number(hall.total_rows) ||
      number < 1 ||
      number > Number(hall.seats_per_row) ||
      row === 13 ||
      (row === 1 && number === 1) ||
      (row === 0 && number > 10) ||
      !ALLOWED_TICKET_TYPES.has(ticketType)
    ) {
      throw new Error("Invalid seat selection.");
    }

    const key = `${row}:${number}`;
    if (seen.has(key)) {
      throw new Error("The same seat was selected more than once.");
    }
    seen.add(key);

    return { row_number: row, seat_number: number, ticket_type: ticketType };
  });
}

async function getUserEmail(client, userId) {
  const result = await client.query(
    "SELECT email FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0]?.email || null;
}

// GET /api/bookings/my-bookings
async function getMyBookings(req, res) {
  try {
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
              'seat_price', bs.seat_price,
              'released_at', bs.released_at
            )
            ORDER BY bs.row_number, bs.seat_number
          ) FILTER (WHERE bs.id IS NOT NULL),
          '[]'::json
        ) AS seats
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id
      LEFT JOIN booked_seats bs ON bs.booking_id = b.id
      WHERE b.user_id = $1
      GROUP BY b.id, s.id, m.id, h.id
      ORDER BY b.created_at DESC
      `,
      [req.user.userId]
    );

    return res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error("Get my bookings error:", error);
    return res.status(500).json({
      message: "Unable to retrieve your bookings.",
    });
  }
}

// GET /api/bookings/admin
// Staff/Admin only. Retrieve all bookings, including guest and historical bookings.
async function getAdminBookings(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        b.id AS booking_id,
        b.user_id,
        u.full_name AS customer_name,
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
              'seat_price', bs.seat_price,
              'released_at', bs.released_at
            )
            ORDER BY bs.row_number, bs.seat_number
          ) FILTER (WHERE bs.id IS NOT NULL),
          '[]'::json
        ) AS seats
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN booked_seats bs ON bs.booking_id = b.id
      GROUP BY b.id, s.id, m.id, h.id, u.id
      ORDER BY b.created_at DESC
      `
    );

    return res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    return res.status(500).json({
      message: "Unable to retrieve bookings.",
    });
  }
}

// POST /api/bookings/hold
// Price is calculated from movies.base_price; frontend seat_price is ignored.
// Until ticket-specific pricing is agreed, every ticket type uses base_price.
async function holdSeats(req, res) {
  const showtimeId = validId(req.body?.showtime_id);
  const { seats } = req.body || {};

  if (!showtimeId) {
    return res.status(400).json({ message: "A valid showtime_id is required." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Serialize seat-hold requests for the same showtime.
    const showtimeResult = await client.query(
      `
      SELECT
        s.id, s.start_time, m.base_price,
        h.total_rows, h.seats_per_row
      FROM showtimes s
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id
      WHERE s.id = $1
      FOR UPDATE OF s
      `,
      [showtimeId]
    );

    const showtime = showtimeResult.rows[0];
    if (!showtime) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Showtime not found." });
    }

    if (new Date(showtime.start_time) <= new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "This showtime has already started." });
    }

    if (showtime.base_price === null || showtime.base_price === undefined) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This movie does not have a configured ticket price.",
      });
    }

    await expireShowtimeBookings(client, showtimeId);

    let customerEmail;
    let userId = null;

    if (req.user?.userId) {
      userId = req.user.userId;
      customerEmail = await getUserEmail(client, userId);

      if (!customerEmail) {
        await client.query("ROLLBACK");
        return res.status(401).json({ message: "Your account could not be verified." });
      }
    } else {
      customerEmail = String(req.body?.customer_email || "").trim().toLowerCase();

      if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "A valid customer_email is required." });
      }
    }

    let normalizedSeats;
    try {
      normalizedSeats = normalizeSeats(seats, {
        total_rows: showtime.total_rows,
        seats_per_row: showtime.seats_per_row,
      });
    } catch (validationError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: validationError.message });
    }

    const unitPrice = Number(showtime.base_price);
    const totalAmount = unitPrice * normalizedSeats.length;
    const guestToken = userId ? null : crypto.randomBytes(32).toString("hex");
    const guestTokenHash = guestToken ? hashGuestToken(guestToken) : null;

    const bookingResult = await client.query(
      `
      INSERT INTO bookings (
        user_id, showtime_id, customer_email, total_amount,
        status, expires_at, guest_token_hash
      )
      VALUES (
        $1, $2, $3, $4,
        'checkout_locked', NOW() + INTERVAL '15 minutes', $5
      )
      RETURNING id, user_id, showtime_id, customer_email,
                total_amount, status, expires_at, created_at
      `,
      [
        userId,
        showtimeId,
        customerEmail,
        totalAmount.toFixed(2),
        guestTokenHash,
      ]
    );

    const booking = bookingResult.rows[0];

    for (const seat of normalizedSeats) {
      await client.query(
        `
        INSERT INTO booked_seats (
          booking_id, showtime_id, row_number, seat_number,
          ticket_type, seat_price
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          booking.id,
          showtimeId,
          seat.row_number,
          seat.seat_number,
          seat.ticket_type,
          unitPrice.toFixed(2),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Seats locked for 15 minutes.",
      booking,
      ...(guestToken ? { guest_checkout_token: guestToken } : {}),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "One or more selected seats are already held or booked.",
      });
    }

    if (error.code === "23514") {
      return res.status(400).json({
        message: "Invalid seat selection.",
      });
    }

    console.error("Hold seats error:", error);
    return res.status(500).json({ message: "Failed to hold seats." });
  } finally {
    client.release();
  }
}

// POST /api/bookings/:id/reserve
// A guest can convert their existing checkout by presenting its one-time token.
async function reserveBooking(req, res) {
  const bookingId = validId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT b.*, s.start_time
      FROM bookings b
      JOIN showtimes s ON s.id = b.showtime_id
      WHERE b.id = $1
      FOR UPDATE OF b
      `,
      [bookingId]
    );

    const booking = result.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status !== "checkout_locked") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Only an active checkout can be converted to a reservation.",
      });
    }

    if (new Date(booking.expires_at) <= new Date()) {
      await client.query(
        `UPDATE bookings SET status = 'expired'
         WHERE id = $1 AND status = 'checkout_locked'`,
        [bookingId]
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId]
      );
      await client.query("COMMIT");
      return res.status(410).json({ message: "The 15-minute checkout hold has expired." });
    }

    const userId = req.user.userId;
    const userEmail = await getUserEmail(client, userId);

    if (!userEmail) {
      await client.query("ROLLBACK");
      return res.status(401).json({ message: "Your account could not be verified." });
    }

    if (booking.user_id && Number(booking.user_id) !== Number(userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "This booking belongs to another user." });
    }

    if (!booking.user_id && !guestTokenMatches(getGuestToken(req), booking.guest_token_hash)) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "A valid guest checkout token is required to claim this booking.",
      });
    }

    const reservationExpiry = new Date(booking.start_time).getTime() - 15 * 60 * 1000;
    if (reservationExpiry <= Date.now()) {
      await client.query(
        `UPDATE bookings SET status = 'expired'
         WHERE id = $1 AND status = 'checkout_locked'`,
        [bookingId]
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId]
      );
      await client.query("COMMIT");
      return res.status(410).json({
        message: "It is too late to create a reservation for this showtime.",
      });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET user_id = $2,
          customer_email = $3,
          status = 'reserved_unpaid',
          expires_at = $4,
          guest_token_hash = NULL
      WHERE id = $1 AND status = 'checkout_locked'
      RETURNING id, user_id, showtime_id, customer_email,
                total_amount, status, expires_at, created_at
      `,
      [bookingId, userId, userEmail, new Date(reservationExpiry)]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Your seats are reserved until 15 minutes before the movie starts.",
      booking: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reserve booking error:", error);
    return res.status(500).json({ message: "Failed to create reservation." });
  } finally {
    client.release();
  }
}

// DELETE /api/bookings/:id/hold
async function releaseBookingHold(req, res) {
  const bookingId = validId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status !== "checkout_locked") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "This checkout hold cannot be released." });
    }

    if (booking.user_id) {
      if (!req.user || Number(req.user.userId) !== Number(booking.user_id)) {
        await client.query("ROLLBACK");
        return res.status(403).json({ message: "You cannot release another user's hold." });
      }
    } else if (!guestTokenMatches(getGuestToken(req), booking.guest_token_hash)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "A valid guest checkout token is required." });
    }

    const newStatus = new Date(booking.expires_at) <= new Date()
      ? "expired"
      : "cancelled";

    await client.query(
      "UPDATE bookings SET status = $2 WHERE id = $1",
      [bookingId, newStatus]
    );
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId]
    );

    await client.query("COMMIT");
    return res.status(200).json({
      message: newStatus === "expired" ? "The checkout hold had expired." : "Seat hold released.",
      status: newStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Release booking hold error:", error);
    return res.status(500).json({ message: "Failed to release seat hold." });
  } finally {
    client.release();
  }
}

// POST /api/bookings/:id/cancel
async function cancelReservation(req, res) {
  const bookingId = validId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (Number(booking.user_id) !== Number(req.user.userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You cannot cancel another user's reservation." });
    }

    if (booking.status !== "reserved_unpaid") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Only unpaid reservations can be cancelled." });
    }

    const newStatus = new Date(booking.expires_at) <= new Date()
      ? "expired"
      : "cancelled";

    await client.query(
      "UPDATE bookings SET status = $2 WHERE id = $1",
      [bookingId, newStatus]
    );
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId]
    );

    await client.query("COMMIT");
    return res.status(200).json({ message: "Reservation updated.", status: newStatus });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cancel reservation error:", error);
    return res.status(500).json({ message: "Failed to cancel reservation." });
  } finally {
    client.release();
  }
}

async function markBookingPaidInTransaction(client, bookingId, stripePaymentId = null) {
  const result = await client.query(
    "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
    [bookingId]
  );
  const booking = result.rows[0];

  if (!booking) return { ok: false, reason: "not_found" };
  if (booking.status === "paid") return { ok: true, alreadyPaid: true, booking };

  if (!["checkout_locked", "reserved_unpaid"].includes(booking.status)) {
    return { ok: false, reason: "not_payable" };
  }

  if (new Date(booking.expires_at) <= new Date()) {
    await client.query(
      "UPDATE bookings SET status = 'expired' WHERE id = $1",
      [bookingId]
    );
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId]
    );
    return { ok: false, reason: "expired" };
  }

  const updated = await client.query(
    `
    UPDATE bookings
    SET status = 'paid',
        stripe_payment_id = COALESCE($2, stripe_payment_id)
    WHERE id = $1
    RETURNING *
    `,
    [bookingId, stripePaymentId]
  );

  const paidBooking = updated.rows[0];

  if (paidBooking.user_id) {
    const countResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM booked_seats
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId]
    );

    await client.query(
      `UPDATE users
       SET paid_tickets_count = paid_tickets_count + $1
       WHERE id = $2`,
      [countResult.rows[0].count, paidBooking.user_id]
    );
  }

  return { ok: true, alreadyPaid: false, booking: paidBooking };
}

// POST /api/bookings/:id/offline-payment
// Staff/Admin only. This endpoint confirms cash/card payment made at the cinema.
async function confirmOfflinePayment(req, res) {
  const bookingId = validId(req.params.id);
  if (!bookingId) {
    return res.status(400).json({ message: "Invalid booking ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = result.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status === "paid") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "This booking has already been paid.",
      });
    }

    if (booking.status !== "reserved_unpaid") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Only an active unpaid reservation can be confirmed offline.",
      });
    }

    if (new Date(booking.expires_at) <= new Date()) {
      await client.query(
        "UPDATE bookings SET status = 'expired' WHERE id = $1",
        [bookingId]
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId]
      );
      await client.query("COMMIT");
      return res.status(410).json({ message: "This reservation has expired." });
    }

    const paid = await markBookingPaidInTransaction(client, bookingId, null);
    if (!paid.ok) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "This reservation can no longer be paid." });
    }

    await client.query("COMMIT");
    return res.status(200).json({
      message: "Offline payment confirmed.",
      booking: paid.booking,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Offline payment confirmation error:", error);
    return res.status(500).json({ message: "Failed to confirm offline payment." });
  } finally {
    client.release();
  }
}

// Call this ONLY after the Stripe webhook signature has been verified by the
// Stripe integration. Do not expose it as a public HTTP route.
async function markBookingPaidFromVerifiedStripe(bookingId, paymentIntentId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await markBookingPaidInTransaction(
      client,
      bookingId,
      paymentIntentId
    );
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getMyBookings,
  getAdminBookings,
  holdSeats,
  reserveBooking,
  releaseBookingHold,
  cancelReservation,
  confirmOfflinePayment,
  markBookingPaidFromVerifiedStripe,
};
