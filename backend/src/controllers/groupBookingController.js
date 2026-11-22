const pool = require("../config/db");
const {
  expireShowtimeBookings,
} = require("../services/bookingExpirationService");

const ALLOWED_TICKET_TYPES = [
  "normal",
  "child_under_12",
  "wheelchair",
  "loyalty_10th",
];

const MAX_GROUP_TICKETS = 50;

function validId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeGroupSeats(seats, hall) {
  if (!Array.isArray(seats)) {
    throw new Error("Seats must be an array.");
  }

  if (seats.length <= 6) {
    throw new Error("Group Booking requires more than 6 tickets.");
  }

  if (seats.length > MAX_GROUP_TICKETS) {
    throw new Error(`Maximum ${MAX_GROUP_TICKETS} tickets per group request.`);
  }

  const totalRows = Number(hall.total_rows);
  const capacity = Number(hall.capacity);

  const seen = new Set();

  return seats.map((seat) => {
    // Use actual database seat number, NOT frontend S-layout position.
    const row = Number(seat.row_number ?? seat.row);
    const number = Number(seat.seat_number ?? seat.number);

    const ticketType = seat.ticket_type || "normal";

    if (
      !Number.isInteger(row) ||
      !Number.isInteger(number) ||
      row < 0 ||
      row >= totalRows ||
      number <= 0 ||
      number > capacity
    ) {
      throw new Error(
        `Invalid seat: row ${row}, seat ${number}. ` +
          `This hall supports ${totalRows} rows and ${capacity} seats in total.`,
      );
    }

    if (!ALLOWED_TICKET_TYPES.includes(ticketType)) {
      throw new Error("One or more ticket types are invalid.");
    }

    if (row === 0) {
      if (ticketType !== "wheelchair" || number < 1 || number > 10) {
        throw new Error("Row 0 is reserved for wheelchair tickets.");
      }
    } else {
      if (row === 1 && number === 1) {
        throw new Error("This seat is not available for booking.");
      }

      if (ticketType === "wheelchair") {
        throw new Error("Wheelchair tickets must use a wheelchair space.");
      }
    }

    const key = `${row}-${number}`;

    if (seen.has(key)) {
      throw new Error("Duplicate seats are not allowed.");
    }

    seen.add(key);

    return {
      row_number: row,
      seat_number: number,
      ticket_type: ticketType,
    };
  });
}

async function getShowtimeAndHall(client, showtimeId, lock = false) {
  const result = await client.query(
    `
    SELECT
      s.id AS showtime_id,
      s.start_time,
      s.movie_id,
      m.title AS movie_title,
      m.base_price,
      h.id AS hall_id,
      h.name AS hall_name,
      h.city,
      h.capacity,
      h.total_rows,
      h.seats_per_row
    FROM showtimes s
    JOIN movies m ON m.id = s.movie_id
    JOIN halls h ON h.id = s.hall_id
    WHERE s.id = $1
    ${lock ? "FOR UPDATE OF s" : ""}
    `,
    [showtimeId],
  );

  return result.rows[0] || null;
}

async function checkSeatsAvailable(client, showtimeId, seats) {
  const result = await client.query(
    `
    SELECT row_number, seat_number
    FROM booked_seats
    WHERE showtime_id = $1
      AND released_at IS NULL
      AND (
        ${seats
          .map(
            (_, index) =>
              `(row_number = $${index * 2 + 2} AND seat_number = $${index * 2 + 3})`,
          )
          .join(" OR ")}
      )
    `,
    [
      showtimeId,
      ...seats.flatMap((seat) => [seat.row_number, seat.seat_number]),
    ],
  );

  if (result.rows.length > 0) {
    const unavailable = result.rows
      .map((seat) => `Row ${seat.row_number}, Seat ${seat.seat_number}`)
      .join(", ");

    throw new Error(`These seats are no longer available: ${unavailable}.`);
  }
}

async function getTicketDiscountSettings(client) {
  const result = await client.query(
    `
    SELECT setting_key, setting_value
    FROM system_settings
    WHERE setting_key IN (
      'child_ticket_discount_percent',
      'loyalty_ticket_discount_percent'
    )
    `,
  );

  const settings = Object.fromEntries(
    result.rows.map((row) => [row.setting_key, Number(row.setting_value)]),
  );

  return {
    child: Number.isFinite(settings.child_ticket_discount_percent)
      ? settings.child_ticket_discount_percent
      : 50,

    loyalty: Number.isFinite(settings.loyalty_ticket_discount_percent)
      ? settings.loyalty_ticket_discount_percent
      : 50,
  };
}

async function getAvailableLoyaltyRewards(client, userId) {
  const result = await client.query(
    `
    SELECT
      u.paid_tickets_count,

      (
        SELECT COUNT(*)
        FROM booked_seats bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.user_id = u.id
          AND b.status = 'paid'
          AND bs.ticket_type = 'loyalty_10th'
          AND bs.released_at IS NULL
      ) AS redeemed,

      (
        SELECT COUNT(*)
        FROM booked_seats bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.user_id = u.id
          AND b.status IN ('checkout_locked', 'reserved_unpaid')
          AND b.expires_at > NOW()
          AND bs.ticket_type = 'loyalty_10th'
          AND bs.released_at IS NULL
      ) AS reserved

    FROM users u
    WHERE u.id = $1
    `,
    [userId],
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Customer account not found.");
  }

  const earned = Math.floor(Number(user.paid_tickets_count || 0) / 10);

  const redeemed = Number(user.redeemed || 0);
  const reserved = Number(user.reserved || 0);

  return Math.max(0, earned - redeemed - reserved);
}

function calculateSeatPrice(basePrice, ticketType, discounts) {
  let discount = 0;

  if (ticketType === "child_under_12") {
    discount = discounts.child;
  } else if (ticketType === "loyalty_10th") {
    discount = discounts.loyalty;
  }

  const price = (Number(basePrice) * (100 - discount)) / 100;

  return Math.round(price * 100) / 100;
}

// POST /api/bookings/group-requests
// Customer submits a request. No seats are held here.
async function createGroupBookingRequest(req, res) {
  const userId = validId(req.user?.userId);
  const showtimeId = validId(req.body?.showtime_id);

  if (!userId) {
    return res.status(401).json({
      message: "Please log in to request a group booking.",
    });
  }

  if (!showtimeId) {
    return res.status(400).json({
      message: "A valid showtime_id is required.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const showtime = await getShowtimeAndHall(client, showtimeId);

    if (!showtime) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Showtime not found.",
      });
    }

    if (new Date(showtime.start_time) <= new Date()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "This showtime has already started.",
      });
    }

    const seats = normalizeGroupSeats(req.body?.seats, showtime);

    const userResult = await client.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    if (userResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Customer account not found.",
      });
    }

    // Give immediate feedback, but do not lock seats.
    await checkSeatsAvailable(client, showtimeId, seats);

    const requestResult = await client.query(
      `
      INSERT INTO group_booking_requests (
        customer_id,
        showtime_id,
        status
      )
      VALUES ($1, $2, 'pending')
      RETURNING id, status, created_at
      `,
      [userId, showtimeId],
    );

    const request = requestResult.rows[0];

    for (const seat of seats) {
      await client.query(
        `
        INSERT INTO group_booking_request_seats (
          request_id,
          row_number,
          seat_number,
          ticket_type
        )
        VALUES ($1, $2, $3, $4)
        `,
        [request.id, seat.row_number, seat.seat_number, seat.ticket_type],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message:
        "Your Group Booking request has been submitted. Seats are not held until the request is approved.",
      request: {
        id: request.id,
        status: request.status,
        created_at: request.created_at,
        showtime_id: showtimeId,
        movie_title: showtime.movie_title,
        seat_count: seats.length,
        seats,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    return res.status(400).json({
      message: error.message || "Unable to submit Group Booking request.",
    });
  } finally {
    client.release();
  }
}

// GET /api/bookings/group-requests/my
async function getMyGroupBookingRequests(req, res) {
  const userId = validId(req.user?.userId);

  if (!userId) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.status,
        r.created_at,
        r.reviewed_at,
        r.approval_note,
        r.booking_id,

        s.start_time,
        m.title AS movie_title,
        h.city,
        h.name AS hall_name,

        COALESCE(
          json_agg(
            json_build_object(
              'row_number', rs.row_number,
              'seat_number', rs.seat_number,
              'ticket_type', rs.ticket_type
            )
            ORDER BY rs.row_number, rs.seat_number
          ) FILTER (WHERE rs.id IS NOT NULL),
          '[]'::json
        ) AS seats

      FROM group_booking_requests r
      JOIN showtimes s ON s.id = r.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id

      LEFT JOIN group_booking_request_seats rs
        ON rs.request_id = r.id

      WHERE r.customer_id = $1

      GROUP BY r.id, s.id, m.id, h.id
      ORDER BY r.created_at DESC
      `,
      [userId],
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get my Group Booking requests error:", error);

    return res.status(500).json({
      message: "Unable to load your Group Booking requests.",
    });
  }
}

// GET /api/bookings/group-requests/admin
async function getAdminGroupBookingRequests(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.status,
        r.created_at,
        r.reviewed_at,
        r.approval_note,
        r.booking_id,

        u.id AS customer_id,
        u.full_name AS customer_name,
        u.email AS customer_email,

        s.id AS showtime_id,
        s.start_time,
        m.title AS movie_title,
        m.base_price,
        h.city,
        h.name AS hall_name,

        COALESCE(
          json_agg(
            json_build_object(
              'row_number', rs.row_number,
              'seat_number', rs.seat_number,
              'ticket_type', rs.ticket_type
            )
            ORDER BY rs.row_number, rs.seat_number
          ) FILTER (WHERE rs.id IS NOT NULL),
          '[]'::json
        ) AS seats

      FROM group_booking_requests r
      JOIN users u ON u.id = r.customer_id
      JOIN showtimes s ON s.id = r.showtime_id
      JOIN movies m ON m.id = s.movie_id
      JOIN halls h ON h.id = s.hall_id

      LEFT JOIN group_booking_request_seats rs
        ON rs.request_id = r.id

      GROUP BY r.id, u.id, s.id, m.id, h.id
      ORDER BY
        CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END,
        r.created_at DESC
      `,
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Get admin Group Booking requests error:", error);

    return res.status(500).json({
      message: "Unable to load Group Booking requests.",
    });
  }
}

// POST /api/bookings/group-requests/:id/approve
async function approveGroupBookingRequest(req, res) {
  const requestId = validId(req.params.id);
  const staffId = validId(req.user?.userId);

  if (!requestId || !staffId) {
    return res.status(400).json({
      message: "Invalid request or staff account.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Lock the request to prevent double approval/rejection.
    const requestResult = await client.query(
      `
      SELECT *
      FROM group_booking_requests
      WHERE id = $1
      FOR UPDATE
      `,
      [requestId],
    );

    const request = requestResult.rows[0];

    if (!request) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Group Booking request not found.",
      });
    }

    if (request.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This request has already been reviewed.",
      });
    }

    // Same showtime lock used by ordinary seat holds.
    const showtime = await getShowtimeAndHall(
      client,
      request.showtime_id,
      true,
    );

    if (!showtime) {
      throw new Error("The requested showtime no longer exists.");
    }

    // Run existing expiry cleanup before checking seat availability.
    await expireShowtimeBookings(client, request.showtime_id);

    const userResult = await client.query(
      `
      SELECT id, email
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [request.customer_id],
    );

    const customer = userResult.rows[0];

    if (!customer) {
      throw new Error("Customer account not found.");
    }

    const seatsResult = await client.query(
      `
      SELECT row_number, seat_number, ticket_type
      FROM group_booking_request_seats
      WHERE request_id = $1
      ORDER BY row_number, seat_number
      `,
      [requestId],
    );

    const seats = normalizeGroupSeats(seatsResult.rows, showtime);

    const startTime = new Date(showtime.start_time).getTime();
    const now = Date.now();
    const showtimeCutoff = startTime - 120 * 60 * 1000;

    if (showtimeCutoff <= now) {
      throw new Error(
        "There is not enough time to approve this request before the screening.",
      );
    }

    await checkSeatsAvailable(client, request.showtime_id, seats);

    const loyaltySeatCount = seats.filter(
      (seat) => seat.ticket_type === "loyalty_10th",
    ).length;

    if (loyaltySeatCount > 0) {
      const availableRewards = await getAvailableLoyaltyRewards(
        client,
        customer.id,
      );

      if (loyaltySeatCount > availableRewards) {
        throw new Error(
          `This customer has only ${availableRewards} available Loyalty reward(s), but the request contains ${loyaltySeatCount}.`,
        );
      }
    }

    const discounts = await getTicketDiscountSettings(client);

    let totalCents = 0;

    const pricedSeats = seats.map((seat) => {
      const price = calculateSeatPrice(
        showtime.base_price,
        seat.ticket_type,
        discounts,
      );

      const cents = Math.round(price * 100);
      totalCents += cents;

      return {
        ...seat,
        seat_price: (cents / 100).toFixed(2),
      };
    });

    // Deadline: 24 hours after approval, or 2 hours before showtime.
    const paymentDeadline = new Date(
      Math.min(now + 24 * 60 * 60 * 1000, showtimeCutoff),
    );

    const bookingResult = await client.query(
      `
      INSERT INTO bookings (
        user_id,
        showtime_id,
        customer_email,
        total_amount,
        status,
        expires_at
      )
      VALUES ($1, $2, $3, $4, 'reserved_unpaid', $5)
      RETURNING *
      `,
      [
        customer.id,
        request.showtime_id,
        customer.email,
        (totalCents / 100).toFixed(2),
        paymentDeadline,
      ],
    );

    const booking = bookingResult.rows[0];

    for (const seat of pricedSeats) {
      await client.query(
        `
        INSERT INTO booked_seats (
          booking_id,
          showtime_id,
          row_number,
          seat_number,
          ticket_type,
          seat_price
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          booking.id,
          request.showtime_id,
          seat.row_number,
          seat.seat_number,
          seat.ticket_type,
          seat.seat_price,
        ],
      );
    }

    await client.query(
      `
      UPDATE group_booking_requests
      SET status = 'approved',
          booking_id = $2,
          reviewed_by = $3,
          reviewed_at = NOW(),
          approval_note = $4
      WHERE id = $1
      `,
      [requestId, booking.id, staffId, req.body?.note || null],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Group Booking approved and seats reserved.",
      booking: {
        id: booking.id,
        status: booking.status,
        total_amount: booking.total_amount,
        expires_at: booking.expires_at,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Approve Group Booking error:", error);

    return res.status(409).json({
      message: error.message || "Unable to approve this Group Booking.",
    });
  } finally {
    client.release();
  }
}

// POST /api/bookings/group-requests/:id/reject
async function rejectGroupBookingRequest(req, res) {
  const requestId = validId(req.params.id);
  const staffId = validId(req.user?.userId);

  if (!requestId || !staffId) {
    return res.status(400).json({
      message: "Invalid request or staff account.",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE group_booking_requests
      SET status = 'rejected',
          reviewed_by = $2,
          reviewed_at = NOW(),
          approval_note = $3
      WHERE id = $1
        AND status = 'pending'
      RETURNING id, status
      `,
      [requestId, staffId, req.body?.note || null],
    );

    if (result.rowCount === 0) {
      return res.status(409).json({
        message: "Request not found or already reviewed.",
      });
    }

    return res.json({
      message: "Group Booking request rejected.",
      request: result.rows[0],
    });
  } catch (error) {
    console.error("Reject Group Booking error:", error);

    return res.status(500).json({
      message: "Unable to reject this request.",
    });
  }
}

module.exports = {
  createGroupBookingRequest,
  getMyGroupBookingRequests,
  getAdminGroupBookingRequests,
  approveGroupBookingRequest,
  rejectGroupBookingRequest,
};
