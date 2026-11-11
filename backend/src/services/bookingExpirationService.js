const pool = require("../config/db");

// Must be called inside an existing transaction.
// Locking booking rows prevents expiration racing with payment/reservation updates.
async function expireShowtimeBookings(client, showtimeId) {
  const result = await client.query(
    `
    SELECT id
    FROM bookings
    WHERE showtime_id = $1
      AND status IN ('checkout_locked', 'reserved_unpaid')
      AND expires_at <= NOW()
    FOR UPDATE SKIP LOCKED
    `,
    [showtimeId]
  );

  for (const row of result.rows) {
    const expired = await client.query(
      `
      UPDATE bookings
      SET status = 'expired'
      WHERE id = $1
        AND status IN ('checkout_locked', 'reserved_unpaid')
        AND expires_at <= NOW()
      RETURNING id
      `,
      [row.id]
    );

    if (expired.rowCount > 0) {
      await client.query(
        `
        UPDATE booked_seats
        SET released_at = NOW()
        WHERE booking_id = $1
          AND released_at IS NULL
        `,
        [row.id]
      );
    }
  }

  return result.rowCount;
}

// Periodic batch cleanup. Historical bookings and seats are never deleted.
async function expireExpiredBookings(batchSize = 100) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT id
      FROM bookings
      WHERE status IN ('checkout_locked', 'reserved_unpaid')
        AND expires_at <= NOW()
      ORDER BY expires_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [batchSize]
    );

    for (const row of result.rows) {
      const expired = await client.query(
        `
        UPDATE bookings
        SET status = 'expired'
        WHERE id = $1
          AND status IN ('checkout_locked', 'reserved_unpaid')
          AND expires_at <= NOW()
        RETURNING id
        `,
        [row.id]
      );

      if (expired.rowCount > 0) {
        await client.query(
          `
          UPDATE booked_seats
          SET released_at = NOW()
          WHERE booking_id = $1
            AND released_at IS NULL
          `,
          [row.id]
        );
      }
    }

    await client.query("COMMIT");
    return result.rowCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  expireShowtimeBookings,
  expireExpiredBookings,
};
