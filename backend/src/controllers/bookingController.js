const crypto = require("crypto");
const pool = require("../config/db");
const {
  expireShowtimeBookings,
} = require("../services/bookingExpirationService");

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

  return (
    candidate.length === stored.length &&
    crypto.timingSafeEqual(candidate, stored)
  );
}

function getGuestToken(req) {
  return (
    req.get("x-guest-checkout-token") || req.body?.guest_checkout_token || null
  );
}

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Read the current ticket discounts. The SQL migration seeds both keys with 50.
// The fallback also keeps booking creation functional if a key is accidentally missing.
async function getTicketDiscountSettings(dbClient = pool) {
  const result = await dbClient.query(
    `SELECT setting_key, setting_value
     FROM system_settings
     WHERE setting_key IN (
       'child_ticket_discount_percent',
       'loyalty_ticket_discount_percent'
     )`,
  );

  const values = Object.fromEntries(
    result.rows.map((row) => [row.setting_key, Number(row.setting_value)]),
  );

  return {
    child_ticket_discount_percent: Number.isInteger(
      values.child_ticket_discount_percent,
    )
      ? values.child_ticket_discount_percent
      : 50,
    loyalty_ticket_discount_percent: Number.isInteger(
      values.loyalty_ticket_discount_percent,
    )
      ? values.loyalty_ticket_discount_percent
      : 50,
  };
}

function normalizeSeats(seats, hall) {
  if (!Array.isArray(seats) || seats.length === 0) {
    throw new Error("At least one seat must be selected.");
  }
  if (seats.length > 6) {
    throw new Error("Maximum 6 tickets allowed per booking.");
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
  const result = await client.query("SELECT email FROM users WHERE id = $1", [
    userId,
  ]);

  return result.rows[0]?.email || null;
}

async function notifyWaitlistForShowtime(dbClient, showtimeId) {
  const { rows } = await dbClient.query(
    `UPDATE premiere_waitlist
     SET is_notified = TRUE
     WHERE showtime_id = $1
       AND is_notified = FALSE
     RETURNING id, customer_email;`,
    [showtimeId],
  );

  if (rows.length > 0) {
    console.log(
      `[Waitlist Alert] Showtime #${showtimeId}: Notified ${rows.map((r) => r.customer_email).join(", ")}`,
    );
  }

  return rows;
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
      [req.user.userId],
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
      `,
    );

    return res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    return res.status(500).json({
      message: "Unable to retrieve bookings.",
    });
  }
}

// GET /api/bookings/loyalty-rewards
// return user's currently available half-price rewards
async function getLoyaltyRewards(req, res) {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `
        SELECT
          u.paid_tickets_count,
          FLOOR(u.paid_tickets_count / 10.0)::int AS earned_rewards,
          COUNT(*) FILTER (
            WHERE bs.id IS NOT NULL AND b.status = 'paid'
          )::int AS redeemed_rewards,
          COUNT(*) FILTER (
            WHERE bs.id IS NOT NULL
              AND b.status IN ('checkout_locked', 'reserved_unpaid')
              AND b.expires_at > NOW()
          )::int AS reserved_rewards
        FROM users u
        LEFT JOIN bookings b ON b.user_id = u.id
        LEFT JOIN booked_seats bs
          ON bs.booking_id = b.id
         AND bs.ticket_type = 'loyalty_10th'
         AND bs.released_at IS NULL
        WHERE u.id = $1
        GROUP BY u.id
      `,
      [userId],
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ message: "User account not found." });
    }

    const discountSettings = await getTicketDiscountSettings();
    const earned = Number(row.earned_rewards);
    const redeemed = Number(row.redeemed_rewards);
    const reserved = Number(row.reserved_rewards);

    return res.status(200).json({
      paid_tickets_count: Number(row.paid_tickets_count),
      earned_rewards: earned,
      redeemed_rewards: redeemed,
      reserved_rewards: reserved,
      available_rewards: Math.max(0, earned - redeemed - reserved),
      loyalty_ticket_discount_percent:
        discountSettings.loyalty_ticket_discount_percent,
    });
  } catch (error) {
    console.error("Get loyalty rewards error:", error);
    return res.status(500).json({
      message: "Unable to retrieve loyalty rewards.",
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
    return res
      .status(400)
      .json({ message: "A valid showtime_id is required." });
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
      [showtimeId],
    );

    const showtime = showtimeResult.rows[0];
    if (!showtime) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Showtime not found." });
    }

    if (new Date(showtime.start_time) <= new Date()) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "This showtime has already started." });
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
    let paidTicketsCount = 0;

    if (req.user?.userId) {
      userId = req.user.userId;

      // Lock the user row to prevent concurrent reward redemption
      const userResult = await client.query(
        `
        SELECT email, paid_tickets_count
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [userId],
      );

      const user = userResult.rows[0];

      if (!user) {
        await client.query("ROLLBACK");
        return res.status(401).json({
          message: "Your account could not be verified.",
        });
      }

      customerEmail = user.email;
      paidTicketsCount = Number(user.paid_tickets_count);
    } else {
      customerEmail = String(req.body?.customer_email || "")
        .trim()
        .toLowerCase();

      if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ message: "A valid customer_email is required." });
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

    // Convert the movie's base price into cents to avoid floating-point issues.
    const basePriceCents = Math.round(Number(showtime.base_price) * 100);

    const loyaltySeatsCount = normalizedSeats.filter(
      (seat) => seat.ticket_type === "loyalty_10th",
    ).length;

    // Loyalty rewards are only available to registered users.
    if (loyaltySeatsCount > 0 && !userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "You must log in to use a loyalty reward.",
      });
    }

    // Calculate the number of rewards already used or reserved.
    if (loyaltySeatsCount > 0) {
      const rewardUsageResult = await client.query(
        `
        SELECT
          COUNT(*) FILTER (
            WHERE b.status = 'paid'
          )::int AS redeemed_count,

          COUNT(*) FILTER (
            WHERE bs.id IS NOT NULL
              AND b.status IN ('checkout_locked', 'reserved_unpaid')
              AND b.expires_at > NOW()
          )::int AS reserved_count

        FROM booked_seats bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.user_id = $1
          AND bs.ticket_type = 'loyalty_10th'
          AND bs.released_at IS NULL
        `,
        [userId],
      );

      const redeemedCount = rewardUsageResult.rows[0].redeemed_count;
      const reservedCount = rewardUsageResult.rows[0].reserved_count;

      const earnedRewards = Math.floor(paidTicketsCount / 10);

      const availableRewards = earnedRewards - redeemedCount - reservedCount;

      if (loyaltySeatsCount > availableRewards) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          message: `You only have ${Math.max(0, availableRewards)} loyalty reward(s) available.`,
        });
      }
    }

    // Read the latest percentages inside this booking transaction.
    const discountSettings = await getTicketDiscountSettings(client);

    // Calculate every seat price on the server. Frontend prices are never trusted.
    const seatsWithPrices = normalizedSeats.map((seat) => {
      let discountPercent = 0;

      if (seat.ticket_type === "child_under_12") {
        discountPercent = discountSettings.child_ticket_discount_percent;
      } else if (seat.ticket_type === "loyalty_10th") {
        discountPercent = discountSettings.loyalty_ticket_discount_percent;
      }

      const priceCents = Math.round(
        (basePriceCents * (100 - discountPercent)) / 100,
      );

      return {
        ...seat,
        seatPrice: (priceCents / 100).toFixed(2),
        priceCents,
      };
    });

    // Calculate the total booking amount.
    const totalAmountCents = seatsWithPrices.reduce(
      (total, seat) => total + seat.priceCents,
      0,
    );

    const totalAmount = (totalAmountCents / 100).toFixed(2);

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
      [userId, showtimeId, customerEmail, totalAmount, guestTokenHash],
    );

    const booking = bookingResult.rows[0];

    for (const seat of seatsWithPrices) {
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
          seat.seatPrice,
        ],
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
      [bookingId],
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
        [bookingId],
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId],
      );
      await client.query("COMMIT");
      return res
        .status(410)
        .json({ message: "The 15-minute checkout hold has expired." });
    }

    const userId = req.user.userId;
    const userEmail = await getUserEmail(client, userId);

    if (!userEmail) {
      await client.query("ROLLBACK");
      return res
        .status(401)
        .json({ message: "Your account could not be verified." });
    }

    if (booking.user_id && Number(booking.user_id) !== Number(userId)) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "This booking belongs to another user." });
    }

    if (
      !booking.user_id &&
      !guestTokenMatches(getGuestToken(req), booking.guest_token_hash)
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message:
          "A valid guest checkout token is required to claim this booking.",
      });
    }

    const reservationExpiry =
      new Date(booking.start_time).getTime() - 120 * 60 * 1000;
    if (reservationExpiry <= Date.now()) {
      await client.query(
        `UPDATE bookings SET status = 'expired'
         WHERE id = $1 AND status = 'checkout_locked'`,
        [bookingId],
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId],
      );
      await client.query("COMMIT");
      return res.status(410).json({
        message: "It is too late to create a reservation for this showtime.",
      });
    }

    const unpaidResult = await client.query(
      `SELECT COUNT(bs.id)::int AS seat_count
       FROM booked_seats bs
       JOIN bookings b ON b.id = bs.booking_id
       WHERE bs.released_at IS NULL
         AND (b.id = $2 OR (b.user_id = $1 AND b.status = 'reserved_unpaid' AND b.expires_at > NOW()))`,
      [userId, bookingId],
    );
    if (unpaidResult.rows[0].seat_count > 6) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Maximum 6 unpaid reserved seats allowed." });
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
      [bookingId, userId, userEmail, new Date(reservationExpiry)],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Your seats are reserved until 2 hours before the movie starts.",
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
      [bookingId],
    );
    const booking = result.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (booking.status !== "checkout_locked") {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "This checkout hold cannot be released." });
    }

    if (booking.user_id) {
      if (!req.user || Number(req.user.userId) !== Number(booking.user_id)) {
        await client.query("ROLLBACK");
        return res
          .status(403)
          .json({ message: "You cannot release another user's hold." });
      }
    } else if (
      !guestTokenMatches(getGuestToken(req), booking.guest_token_hash)
    ) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "A valid guest checkout token is required." });
    }

    const newStatus =
      new Date(booking.expires_at) <= new Date() ? "expired" : "cancelled";

    await client.query("UPDATE bookings SET status = $2 WHERE id = $1", [
      bookingId,
      newStatus,
    ]);
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId],
    );

    await notifyWaitlistForShowtime(client, booking.showtime_id);

    await client.query("COMMIT");
    return res.status(200).json({
      message:
        newStatus === "expired"
          ? "The checkout hold had expired."
          : "Seat hold released.",
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
      [bookingId],
    );
    const booking = result.rows[0];

    if (!booking) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found." });
    }

    if (Number(booking.user_id) !== Number(req.user.userId)) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ message: "You cannot cancel another user's reservation." });
    }

    if (booking.status !== "reserved_unpaid") {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Only unpaid reservations can be cancelled." });
    }

    const newStatus =
      new Date(booking.expires_at) <= new Date() ? "expired" : "cancelled";

    await client.query("UPDATE bookings SET status = $2 WHERE id = $1", [
      bookingId,
      newStatus,
    ]);
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId],
    );

    await client.query("COMMIT");
    return res
      .status(200)
      .json({ message: "Reservation updated.", status: newStatus });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cancel reservation error:", error);
    return res.status(500).json({ message: "Failed to cancel reservation." });
  } finally {
    client.release();
  }
}

async function markBookingPaidInTransaction(
  client,
  bookingId,
  stripePaymentId = null,
) {
  const result = await client.query(
    "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
    [bookingId],
  );

  console.log("[PAYMENT] Booking row locked", {
    bookingId,
    status: result.rows[0]?.status,
  });
  const booking = result.rows[0];

  if (!booking) return { ok: false, reason: "not_found" };
  if (booking.status === "paid")
    return { ok: true, alreadyPaid: true, booking };

  if (!["checkout_locked", "reserved_unpaid"].includes(booking.status)) {
    return { ok: false, reason: "not_payable" };
  }

  if (new Date(booking.expires_at) <= new Date()) {
    await client.query("UPDATE bookings SET status = 'expired' WHERE id = $1", [
      bookingId,
    ]);
    await client.query(
      `UPDATE booked_seats SET released_at = NOW()
       WHERE booking_id = $1 AND released_at IS NULL`,
      [bookingId],
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
    [bookingId, stripePaymentId],
  );

  const paidBooking = updated.rows[0];

  if (paidBooking.user_id) {
    const countResult = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM booked_seats
      WHERE booking_id = $1
        AND released_at IS NULL
        AND ticket_type != 'loyalty_10th'
      `,
      [bookingId],
    );

    await client.query(
      `UPDATE users
       SET paid_tickets_count = paid_tickets_count + $1
       WHERE id = $2`,
      [countResult.rows[0].count, paidBooking.user_id],
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
      [bookingId],
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
        [bookingId],
      );
      await client.query(
        `UPDATE booked_seats SET released_at = NOW()
         WHERE booking_id = $1 AND released_at IS NULL`,
        [bookingId],
      );
      await client.query("COMMIT");
      return res.status(410).json({ message: "This reservation has expired." });
    }

    const paid = await markBookingPaidInTransaction(client, bookingId, null);
    if (!paid.ok) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "This reservation can no longer be paid." });
    }

    await client.query("COMMIT");
    return res.status(200).json({
      message: "Offline payment confirmed.",
      booking: paid.booking,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Offline payment confirmation error:", error);
    return res
      .status(500)
      .json({ message: "Failed to confirm offline payment." });
  } finally {
    client.release();
  }
}

// Call this ONLY after the Stripe webhook signature has been verified.
// If an existing transaction client is supplied, reuse that transaction.
// Otherwise, create a separate transaction.
async function markBookingPaidFromVerifiedStripe(
  bookingId,
  paymentIntentId,
  existingClient = null,
) {
  // Reuse the Webhook's existing transaction.
  if (existingClient) {
    return markBookingPaidInTransaction(
      existingClient,
      bookingId,
      paymentIntentId,
    );
  }

  // Keep support for callers that do not provide an existing client.
  let client;

  try {
    client = await pool.connect();

    await client.query("BEGIN");

    const result = await markBookingPaidInTransaction(
      client,
      bookingId,
      paymentIntentId,
    );

    await client.query("COMMIT");

    return result;
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("[PAYMENT] Rollback failed:", rollbackError.message);
      }
    }

    console.error("[PAYMENT] markBookingPaidFromVerifiedStripe error:", error);

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

async function getAdminWaitlist(req, res) {
  try {
    const sql = `
      SELECT
        w.id,
        w.showtime_id,
        w.customer_email,
        w.is_notified,
        w.created_at,
        m.title AS movie_title,
        s.start_time
      FROM premiere_waitlist w
      LEFT JOIN showtimes s ON w.showtime_id = s.id
      LEFT JOIN movies m ON s.movie_id = m.id
      ORDER BY w.created_at ASC, w.id ASC;
    `;
    const { rows } = await pool.query(sql);
    return res.json({ waitlist: rows });
  } catch (err) {
    console.error("Get admin waitlist error:", err);
    return res.status(500).json({ error: err.message });
  }
}

async function notifyWaitlistEntry(req, res) {
  const waitlistId = Number(req.params.id);
  if (!Number.isInteger(waitlistId) || waitlistId < 1)
    return res.status(400).json({ error: "Invalid waitlist ID." });
  try {
    const { rows } = await pool.query(
      `UPDATE premiere_waitlist SET is_notified = TRUE WHERE id = $1 RETURNING *;`,
      [waitlistId],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Waitlist entry not found." });
    console.log(
      `[Waitlist Alert] Manual alert sent to ${rows[0].customer_email}`,
    );
    return res.json({ message: "Notification sent.", entry: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: "Failed to notify recipient." });
  }
}

async function removeWaitlistEntry(req, res) {
  const waitlistId = Number(req.params.id);
  if (!Number.isInteger(waitlistId) || waitlistId < 1)
    return res.status(400).json({ error: "Invalid waitlist ID." });
  try {
    const { rows } = await pool.query(
      `DELETE FROM premiere_waitlist WHERE id = $1 RETURNING id;`,
      [waitlistId],
    ); // <-- Blank #2
    if (rows.length === 0)
      return res.status(404).json({ error: "Waitlist entry not found." }); // <-- Blank #3
    return res.json({ message: "Removed from waiting list.", id: waitlistId });
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove waitlist entry." });
  }
}

async function assignWaitlistSeat(req, res) {
  const waitlistId = Number(req.params.id);
  if (!Number.isInteger(waitlistId) || waitlistId < 1) {
    return res.status(400).json({ error: "Invalid waitlist ID." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const wlRes = await client.query(
      `SELECT * FROM premiere_waitlist WHERE id = $1 FOR UPDATE;`,
      [waitlistId],
    );
    if (wlRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Waitlist entry not found." });
    }
    const entry = wlRes.rows[0];

    const infoRes = await client.query(
      `SELECT s.start_time, s.is_premiere, m.base_price, h.total_rows, h.seats_per_row
       FROM showtimes s
       JOIN movies m ON s.movie_id = m.id
       JOIN halls h ON s.hall_id = h.id
       WHERE s.id = $1;`,
      [entry.showtime_id],
    );
    if (infoRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Showtime not found." });
    }
    const info = infoRes.rows[0];

    await expireShowtimeBookings(client, entry.showtime_id);

    const takenRes = await client.query(
      `SELECT row_number, seat_number
       FROM booked_seats
       WHERE showtime_id = $1 AND released_at IS NULL;`,
      [entry.showtime_id],
    );
    const taken = new Set(
      takenRes.rows.map((r) => `${r.row_number}-${r.seat_number}`),
    );

    const maxRow =
      Number(info.total_rows) >= 13
        ? Number(info.total_rows) + 1
        : Number(info.total_rows);

    let openSeat = null;
    for (let r = 1; r <= maxRow && !openSeat; r++) {
      if (r === 13) continue;
      for (let s = 1; s <= Number(info.seats_per_row); s++) {
        if ((r === 1 && s === 1) || taken.has(`${r}-${s}`)) continue;
        openSeat = { row_number: r, seat_number: s };
        break;
      }
    }

    if (!openSeat) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "No open seats available." });
    }

    const price = Number(
      (Number(info.base_price) * (info.is_premiere ? 1.15 : 1)).toFixed(2),
    );
    const userRes = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1);`,
      [entry.customer_email],
    );
    const userId = userRes.rows[0]?.id || null;
    const status = userId ? "reserved_unpaid" : "checkout_locked";
    const expiresAt = userId
      ? new Date(new Date(info.start_time).getTime() - 2 * 60 * 60 * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);

    const bookRes = await client.query(
      `INSERT INTO bookings (user_id, showtime_id, customer_email, total_amount, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id;`,
      [
        userId,
        entry.showtime_id,
        entry.customer_email,
        price,
        status,
        expiresAt,
      ],
    );

    await client.query(
      `INSERT INTO booked_seats (booking_id, showtime_id, row_number, seat_number, ticket_type, seat_price)
       VALUES ($1, $2, $3, $4, 'normal', $5);`,
      [
        bookRes.rows[0].id,
        entry.showtime_id,
        openSeat.row_number,
        openSeat.seat_number,
        price,
      ],
    );

    await client.query(`DELETE FROM premiere_waitlist WHERE id = $1;`, [
      waitlistId,
    ]);
    await client.query("COMMIT");

    return res.status(201).json({
      message: "Seat assigned.",
      booking_id: bookRes.rows[0].id,
      seat: openSeat,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Assign waitlist seat error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to assign seat." });
  } finally {
    client.release();
  }
}

module.exports = {
  getMyBookings,
  getAdminBookings,
  getLoyaltyRewards,
  holdSeats,
  reserveBooking,
  releaseBookingHold,
  cancelReservation,
  confirmOfflinePayment,
  markBookingPaidFromVerifiedStripe,
  getAdminWaitlist,
  notifyWaitlistEntry,
  removeWaitlistEntry,
  assignWaitlistSeat,
  notifyAdminWaitlistEntry: notifyWaitlistEntry,
  removeAdminWaitlistEntry: removeWaitlistEntry,
  assignAdminWaitlistSeat: assignWaitlistSeat,
};
