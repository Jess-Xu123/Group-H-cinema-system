const pool = require("../config/db");

// Get all halls
async function getHalls(req, res) {
  try {
    const query = `
      SELECT
        id,
        city,
        name,
        capacity,
        total_rows,
        seats_per_row,
        wheelchair_limit
      FROM halls
      ORDER BY city ASC, id ASC;
    `;

    const { rows } = await pool.query(query);

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Failed to fetch halls:", err);

    return res.status(500).json({
      message: "Failed to fetch halls."
    });
  }
}

// Get one hall by ID
async function getHallById(req, res) {
  const { id } = req.params;
  const hallId = Number(id);

  if (!Number.isSafeInteger(hallId) || hallId <= 0) {
    return res.status(400).json({
      message: "Invalid hall ID."
    });
  }

  try {
    const query = `
      SELECT
        id,
        city,
        name,
        capacity,
        total_rows,
        seats_per_row,
        wheelchair_limit
      FROM halls
      WHERE id = $1;
    `;

    const { rows } = await pool.query(query, [hallId]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Hall not found."
      });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Failed to fetch hall:", err);

    return res.status(500).json({
      message: "Failed to fetch hall."
    });
  }
}

// Get monthly statistics for all halls
async function getHallStatistics(req, res) {
  try {
    // Use the current month if no month is provided
    const month =
      req.query.month || new Date().toISOString().slice(0, 7);

    // Validate YYYY-MM format
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        message: "Invalid month. Please use YYYY-MM format."
      });
    }

    const query = `
      WITH monthly_showtimes AS (
        SELECT
          hall_id,
          COUNT(*)::INTEGER AS showtime_count
        FROM showtimes
        WHERE start_time >= (to_date($1 || '-01', 'YYYY-MM-DD'))
          AND start_time < ((to_date($1 || '-01', 'YYYY-MM-DD')) + INTERVAL '1 month')
        GROUP BY hall_id
      ),

      paid_tickets AS (
        SELECT
          s.hall_id,
          COUNT(bs.id)::INTEGER AS tickets_sold
        FROM bookings b
        INNER JOIN showtimes s
          ON s.id = b.showtime_id
        INNER JOIN booked_seats bs
          ON bs.booking_id = b.id
        WHERE b.status = 'paid'
          AND s.start_time >= (to_date($1 || '-01', 'YYYY-MM-DD'))
          AND s.start_time < ((to_date($1 || '-01', 'YYYY-MM-DD')) + INTERVAL '1 month')
        GROUP BY s.hall_id
      ),

      paid_revenue AS (
        SELECT
          s.hall_id,
          COALESCE(SUM(b.total_amount), 0)::NUMERIC(12, 2)
            AS revenue
        FROM bookings b
        INNER JOIN showtimes s
          ON s.id = b.showtime_id
        WHERE b.status = 'paid'
          AND s.start_time >= (to_date($1 || '-01', 'YYYY-MM-DD'))
          AND s.start_time < ((to_date($1 || '-01', 'YYYY-MM-DD')) + INTERVAL '1 month')
        GROUP BY s.hall_id
      )

      SELECT
        h.id AS hall_id,
        h.city,
        h.name,
        h.capacity,
        h.total_rows,
        h.seats_per_row,
        h.wheelchair_limit,

        COALESCE(ms.showtime_count, 0)::INTEGER
          AS showtime_count,

        COALESCE(pt.tickets_sold, 0)::INTEGER
          AS tickets_sold,

        COALESCE(pr.revenue, 0)::NUMERIC(12, 2)
          AS revenue,

        (
          h.capacity * COALESCE(ms.showtime_count, 0)
        )::INTEGER AS available_seats,

        CASE
          WHEN COALESCE(ms.showtime_count, 0) = 0 THEN 0
          ELSE ROUND(
            (
              COALESCE(pt.tickets_sold, 0)::NUMERIC
              /
              (
                h.capacity::NUMERIC
                * ms.showtime_count
              )
            ) * 100,
            2
          )
        END AS occupancy_rate

      FROM halls h

      LEFT JOIN monthly_showtimes ms
        ON ms.hall_id = h.id

      LEFT JOIN paid_tickets pt
        ON pt.hall_id = h.id

      LEFT JOIN paid_revenue pr
        ON pr.hall_id = h.id

      ORDER BY h.city ASC, h.id ASC;
    `;

    const { rows } = await pool.query(query, [month]);

    // Calculate overall statistics
    const overall = rows.reduce(
      (result, hall) => {
        result.total_halls += 1;
        result.total_capacity += Number(hall.capacity);
        result.showtime_count += Number(hall.showtime_count);
        result.tickets_sold += Number(hall.tickets_sold);
        result.revenue += Number(hall.revenue);
        result.available_seats += Number(hall.available_seats);

        return result;
      },
      {
        total_halls: 0,
        total_capacity: 0,
        showtime_count: 0,
        tickets_sold: 0,
        revenue: 0,
        available_seats: 0
      }
    );

    overall.occupancy_rate =
      overall.available_seats === 0
        ? 0
        : Number(
            (
              (overall.tickets_sold / overall.available_seats) *
              100
            ).toFixed(2)
          );

    overall.revenue = Number(overall.revenue.toFixed(2));

    // Convert PostgreSQL numeric values to JavaScript numbers
    const halls = rows.map((hall) => ({
      ...hall,
      capacity: Number(hall.capacity),
      total_rows: Number(hall.total_rows),
      seats_per_row: Number(hall.seats_per_row),
      wheelchair_limit:
        hall.wheelchair_limit === null
          ? null
          : Number(hall.wheelchair_limit),
      showtime_count: Number(hall.showtime_count),
      tickets_sold: Number(hall.tickets_sold),
      revenue: Number(hall.revenue),
      available_seats: Number(hall.available_seats),
      occupancy_rate: Number(hall.occupancy_rate)
    }));

    return res.status(200).json({
      period: month,
      overall,
      halls
    });
  } catch (err) {
    console.error("Failed to fetch hall statistics:", err);

    return res.status(500).json({
      message: "Failed to fetch hall statistics."
    });
  }
}

module.exports = {
  getHalls,
  getHallById,
  getHallStatistics
};
