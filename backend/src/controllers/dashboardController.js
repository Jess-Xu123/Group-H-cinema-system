const pool = require("../config/db");

// Get dashboard alerts and sales overview
async function getDashboardAlerts(req, res) {
  try {
// Count reservations waiting for payment
const unpaidReservationsQuery = `
    SELECT COUNT(*)::int AS count
    FROM bookings
    WHERE status = 'reserved_unpaid';
`;

// Count screenings starting within the next 30 minutes
const upcomingScreeningsQuery = `
    SELECT COUNT(*)::int AS count
    FROM showtimes
    WHERE start_time >= NOW()
    AND start_time <= NOW() + INTERVAL '30 minutes';
`;

// Count confirmed tickets sold for today's screenings
const confirmedTicketsQuery = `
    SELECT COUNT(bs.id)::int AS count
    FROM booked_seats bs
    JOIN bookings b ON bs.booking_id = b.id
    JOIN showtimes s ON bs.showtime_id = s.id
    WHERE b.status = 'paid'
    AND s.start_time >= CURRENT_DATE
    AND s.start_time < CURRENT_DATE + INTERVAL '1 day';
`;

// Calculate today's confirmed ticket sales revenue
const ticketSalesQuery = `
    SELECT COALESCE(SUM(b.total_amount), 0)::numeric(10, 2) AS total
    FROM bookings b
    JOIN showtimes s ON b.showtime_id = s.id
    WHERE b.status = 'paid'
    AND s.start_time >= CURRENT_DATE
    AND s.start_time < CURRENT_DATE + INTERVAL '1 day';
`;

    const [
    unpaidResult,
    upcomingResult,
    confirmedTicketsResult,
    ticketSalesResult,
    roomOccupancyResult,
    ] = await Promise.all([
    pool.query(unpaidReservationsQuery),
    pool.query(upcomingScreeningsQuery),
    pool.query(confirmedTicketsQuery),
    pool.query(ticketSalesQuery),
    pool.query(roomOccupancyQuery),
    ]);

    res.status(200).json({
      unpaidReservations: unpaidResult.rows[0].count,
      upcomingScreenings: upcomingResult.rows[0].count,
      confirmedTickets: confirmedTicketsResult.rows[0].count,
      ticketSales: Number(ticketSalesResult.rows[0].total),
      roomOccupancy: Number(roomOccupancyResult.rows[0].occupancy),
    });
  } catch (error) {
    console.error("Error fetching dashboard alerts:", error);

    res.status(500).json({
      message: "Failed to fetch dashboard alerts.",
    });
  }
}


// Calculate today's average room occupancy
const roomOccupancyQuery = `
    SELECT
    COALESCE(
        ROUND(
        SUM(sold.seats_sold)::numeric * 100
        / NULLIF(SUM(h.capacity), 0),
        2
        ),
        0
    ) AS occupancy
    FROM showtimes s
    JOIN halls h ON s.hall_id = h.id
    LEFT JOIN (
    SELECT
        b.showtime_id,
        COUNT(bs.id)::int AS seats_sold
    FROM bookings b
    LEFT JOIN booked_seats bs ON bs.booking_id = b.id
    WHERE b.status = 'paid'
    GROUP BY b.showtime_id
    ) sold ON sold.showtime_id = s.id
    WHERE s.start_time >= CURRENT_DATE
    AND s.start_time < CURRENT_DATE + INTERVAL '1 day';
`;

// Get today's published screenings and ticket sales
async function getTodayProgramme(req, res) {
  try {
    const query = `
    SELECT
        s.id AS showtime_id,
        s.start_time,
        m.title AS movie_title,
        h.city AS cinema_city,
        h.name AS room_name,
        COALESCE(sold_data.sold, 0)::int AS sold,
        COALESCE(revenue_data.revenue, 0)::numeric(10, 2) AS revenue
    FROM showtimes s
    JOIN movies m ON s.movie_id = m.id
    JOIN halls h ON s.hall_id = h.id

    LEFT JOIN (
        SELECT
        b.showtime_id,
        COUNT(bs.id)::int AS sold
        FROM bookings b
        JOIN booked_seats bs ON bs.booking_id = b.id
        WHERE b.status = 'paid'
        GROUP BY b.showtime_id
    ) sold_data ON sold_data.showtime_id = s.id

    LEFT JOIN (
        SELECT
        showtime_id,
        SUM(total_amount) AS revenue
        FROM bookings
        WHERE status = 'paid'
        GROUP BY showtime_id
    ) revenue_data ON revenue_data.showtime_id = s.id

    WHERE s.start_time >= CURRENT_DATE
        AND s.start_time < CURRENT_DATE + INTERVAL '7 day'
        AND m.is_published = TRUE

    ORDER BY s.start_time ASC;
    `;
    const result = await pool.query(query);

    res.status(200).json({
      screenings: result.rows.map((row) => ({
        ...row,
        revenue: Number(row.revenue),
      })),
    });
  } catch (error) {
    console.error("Error fetching today's programme:", error);

    res.status(500).json({
      message: "Failed to fetch today's programme.",
    });
  }
}


// Get room-by-room occupancy for today's screenings
async function getRoomOccupancy(req, res) {
  try {
    const query = `
      SELECT
        h.id AS hall_id,
        h.city AS cinema_city,
        h.name AS room_name,
        h.capacity,
        COUNT(DISTINCT s.id)::int AS screenings,
        COALESCE(SUM(sold.seats_sold), 0)::int AS seats_sold,
        COALESCE(
          ROUND(
            COALESCE(SUM(sold.seats_sold), 0)::numeric * 100
            / NULLIF(h.capacity * COUNT(DISTINCT s.id), 0),
            2
          ),
          0
        ) AS occupancy
      FROM halls h
      LEFT JOIN showtimes s
        ON s.hall_id = h.id
        AND s.start_time >= CURRENT_DATE
        AND s.start_time < CURRENT_DATE + INTERVAL '1 day'
      LEFT JOIN (
        SELECT
          b.showtime_id,
          COUNT(bs.id)::int AS seats_sold
        FROM bookings b
        JOIN booked_seats bs ON bs.booking_id = b.id
        WHERE b.status = 'paid'
        GROUP BY b.showtime_id
      ) sold ON sold.showtime_id = s.id
      GROUP BY h.id, h.city, h.name, h.capacity
      ORDER BY h.city, h.name;
    `;

    const result = await pool.query(query);

    res.status(200).json({
      rooms: result.rows.map((row) => ({
        ...row,
        occupancy: Number(row.occupancy),
      })),
    });
  } catch (error) {
    console.error("Error fetching room occupancy:", error);

    res.status(500).json({
      message: "Failed to fetch room occupancy.",
    });
  }
}


module.exports = {
  getDashboardAlerts,
  getTodayProgramme,
  getRoomOccupancy,
};
