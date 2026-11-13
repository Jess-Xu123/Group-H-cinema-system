const express = require("express");
const pool = require("../config/db");

const {
  authMiddleware,
  requireStaffOrAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireStaffOrAdmin);

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseStartTime(value) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBoolean(value) {
  return value === true || value === "true";
}

async function checkTimeConflict(client, hallId, startTime, durationMin, excludeId = null) {
  const result = await client.query(
    `
      SELECT
        s.id,
        m.title,
        s.start_time,
        s.start_time + (m.duration_min * INTERVAL '1 minute') AS end_time
      FROM showtimes s
      JOIN movies m ON m.id = s.movie_id
      WHERE s.hall_id = $1
        AND ($4::int IS NULL OR s.id <> $4)
        AND s.start_time < (
          $2::timestamptz + ($3::int * INTERVAL '1 minute')
        )
        AND (
          s.start_time + (m.duration_min * INTERVAL '1 minute')
        ) > $2::timestamptz
      LIMIT 1
    `,
    [hallId, startTime, durationMin, excludeId]
  );

  return result.rows[0] || null;
}

async function lockHall(client, hallId) {
  const result = await client.query(
    "SELECT id FROM halls WHERE id = $1 FOR UPDATE",
    [hallId]
  );

  return result.rowCount > 0;
}

function buildShowtimeResponse(row) {
  return {
    ...row,
    has_bookings: Number(row.booking_count) > 0,
  };
}

// GET /api/admin/showtimes
// Admin view: includes private-company showtimes and unpublished movies.
router.get("/", async (req, res) => {
  try {
    const { city, date, movie_id, hall_id } = req.query;

    const conditions = [];
    const params = [];

    if (city) {
      params.push(city);
      conditions.push(`h.city = $${params.length}`);
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          error: "Date must use YYYY-MM-DD format.",
        });
      }

      params.push(date);
      const index = params.length;

      conditions.push(`
        s.start_time >= ($${index}::date::timestamp AT TIME ZONE 'Europe/Helsinki')
        AND s.start_time < (
          ($${index}::date + INTERVAL '1 day')::timestamp
          AT TIME ZONE 'Europe/Helsinki'
        )
      `);
    }

    if (movie_id) {
      const id = parseId(movie_id);
      if (!id) {
        return res.status(400).json({ error: "Invalid movie ID." });
      }

      params.push(id);
      conditions.push(`s.movie_id = $${params.length}`);
    }

    if (hall_id) {
      const id = parseId(hall_id);
      if (!id) {
        return res.status(400).json({ error: "Invalid hall ID." });
      }

      params.push(id);
      conditions.push(`s.hall_id = $${params.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
        SELECT
          s.id,
          s.movie_id,
          s.hall_id,
          s.start_time,
          s.is_premiere,
          s.is_private_company,
          s.company_name,

          m.title AS movie_title,
          m.duration_min,
          m.poster_url,
          m.is_published,

          h.name AS hall_name,
          h.city,
          h.capacity,

          (
            SELECT COUNT(*)
            FROM bookings b
            WHERE b.showtime_id = s.id
          ) AS booking_count,

          s.start_time + (m.duration_min * INTERVAL '1 minute')
            AS end_time

        FROM showtimes s
        JOIN movies m ON m.id = s.movie_id
        JOIN halls h ON h.id = s.hall_id

        ${whereClause}

        ORDER BY s.start_time ASC
      `,
      params
    );

    return res.json(result.rows.map(buildShowtimeResponse));
  } catch (err) {
    console.error("Failed to fetch admin showtimes:", err);
    return res.status(500).json({
      error: "Failed to fetch showtimes.",
    });
  }
});

// GET /api/admin/showtimes/options
// Options for the create/edit form.
router.get("/options", async (req, res) => {
  try {
    const [moviesResult, hallsResult] = await Promise.all([
      pool.query(`
        SELECT id, title, duration_min
        FROM movies
        ORDER BY title ASC
      `),
      pool.query(`
        SELECT id, city, name, capacity
        FROM halls
        ORDER BY city ASC, name ASC
      `),
    ]);

    return res.json({
      movies: moviesResult.rows,
      halls: hallsResult.rows,
    });
  } catch (err) {
    console.error("Failed to fetch showtime options:", err);
    return res.status(500).json({
      error: "Failed to load showtime options.",
    });
  }
});

// POST /api/admin/showtimes
router.post("/", async (req, res) => {
  const movieId = parseId(req.body.movie_id);
  const hallId = parseId(req.body.hall_id);
  const startTime = parseStartTime(req.body.start_time);

  const isPremiere = parseBoolean(req.body.is_premiere);
  const isPrivateCompany = parseBoolean(req.body.is_private_company);
  const companyName = String(req.body.company_name || "").trim();

  if (!movieId || !hallId || !startTime) {
    return res.status(400).json({
      error: "Movie, hall and a valid start time are required.",
    });
  }

  if (isPrivateCompany && !companyName) {
    return res.status(400).json({
      error: "Company name is required for private-company showtimes.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Serialize schedule changes for this hall.
    const hallExists = await lockHall(client, hallId);

    if (!hallExists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hall not found." });
    }

    const movieResult = await client.query(
      "SELECT id, duration_min FROM movies WHERE id = $1",
      [movieId]
    );

    if (movieResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Movie not found." });
    }

    const durationMin = movieResult.rows[0].duration_min;

    const conflict = await checkTimeConflict(
      client,
      hallId,
      startTime,
      durationMin
    );

    if (conflict) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `This hall already has a conflicting screening: "${conflict.title}".`,
        conflict,
      });
    }

    const result = await client.query(
      `
        INSERT INTO showtimes (
          movie_id,
          hall_id,
          start_time,
          is_premiere,
          is_private_company,
          company_name
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [
        movieId,
        hallId,
        startTime,
        isPremiere,
        isPrivateCompany,
        isPrivateCompany ? companyName : null,
      ]
    );

    await client.query("COMMIT");

    const created = await pool.query(
      `
        SELECT
          s.id,
          s.movie_id,
          s.hall_id,
          s.start_time,
          s.is_premiere,
          s.is_private_company,
          s.company_name,
          m.title AS movie_title,
          m.duration_min,
          m.poster_url,
          m.is_published,
          h.name AS hall_name,
          h.city,
          h.capacity,
          0 AS booking_count,
          s.start_time + (m.duration_min * INTERVAL '1 minute') AS end_time
        FROM showtimes s
        JOIN movies m ON m.id = s.movie_id
        JOIN halls h ON h.id = s.hall_id
        WHERE s.id = $1
      `,
      [result.rows[0].id]
    );

    return res.status(201).json(buildShowtimeResponse(created.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to create showtime:", err);

    return res.status(500).json({
      error: "Failed to create showtime.",
    });
  } finally {
    client.release();
  }
});

// PUT /api/admin/showtimes/:id
router.put("/:id", async (req, res) => {
  const showtimeId = parseId(req.params.id);
  const movieId = parseId(req.body.movie_id);
  const hallId = parseId(req.body.hall_id);
  const startTime = parseStartTime(req.body.start_time);

  const isPremiere = parseBoolean(req.body.is_premiere);
  const isPrivateCompany = parseBoolean(req.body.is_private_company);
  const companyName = String(req.body.company_name || "").trim();

  if (!showtimeId || !movieId || !hallId || !startTime) {
    return res.status(400).json({
      error: "Invalid showtime, movie, hall or start time.",
    });
  }

  if (isPrivateCompany && !companyName) {
    return res.status(400).json({
      error: "Company name is required for private-company showtimes.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
        SELECT *
        FROM showtimes
        WHERE id = $1
        FOR UPDATE
      `,
      [showtimeId]
    );

    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Showtime not found." });
    }

    const current = currentResult.rows[0];

    const bookingResult = await client.query(
      "SELECT EXISTS (SELECT 1 FROM bookings WHERE showtime_id = $1) AS has_bookings",
      [showtimeId]
    );

    const hasBookings = bookingResult.rows[0].has_bookings;

    const coreFieldsChanged =
      Number(current.movie_id) !== movieId ||
      Number(current.hall_id) !== hallId ||
      new Date(current.start_time).getTime() !== startTime.getTime();

    if (hasBookings && coreFieldsChanged) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error:
          "This showtime has booking records. Movie, hall and start time cannot be changed.",
      });
    }

    const hallExists = await lockHall(client, hallId);

    if (!hallExists) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Hall not found." });
    }

    const movieResult = await client.query(
      "SELECT id, duration_min FROM movies WHERE id = $1",
      [movieId]
    );

    if (movieResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Movie not found." });
    }

    const conflict = await checkTimeConflict(
      client,
      hallId,
      startTime,
      movieResult.rows[0].duration_min,
      showtimeId
    );

    if (conflict) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `This hall already has a conflicting screening: "${conflict.title}".`,
        conflict,
      });
    }

    await client.query(
      `
        UPDATE showtimes
        SET
          movie_id = $1,
          hall_id = $2,
          start_time = $3,
          is_premiere = $4,
          is_private_company = $5,
          company_name = $6
        WHERE id = $7
      `,
      [
        movieId,
        hallId,
        startTime,
        isPremiere,
        isPrivateCompany,
        isPrivateCompany ? companyName : null,
        showtimeId,
      ]
    );

    await client.query("COMMIT");

    const updated = await pool.query(
      `
        SELECT
          s.id,
          s.movie_id,
          s.hall_id,
          s.start_time,
          s.is_premiere,
          s.is_private_company,
          s.company_name,
          m.title AS movie_title,
          m.duration_min,
          m.poster_url,
          m.is_published,
          h.name AS hall_name,
          h.city,
          h.capacity,
          (
            SELECT COUNT(*) FROM bookings b WHERE b.showtime_id = s.id
          ) AS booking_count,
          s.start_time + (m.duration_min * INTERVAL '1 minute') AS end_time
        FROM showtimes s
        JOIN movies m ON m.id = s.movie_id
        JOIN halls h ON h.id = s.hall_id
        WHERE s.id = $1
      `,
      [showtimeId]
    );

    return res.json(buildShowtimeResponse(updated.rows[0]));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to update showtime:", err);

    return res.status(500).json({
      error: "Failed to update showtime.",
    });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/showtimes/:id
router.delete("/:id", async (req, res) => {
  const showtimeId = parseId(req.params.id);

  if (!showtimeId) {
    return res.status(400).json({ error: "Invalid showtime ID." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const showtimeResult = await client.query(
      "SELECT id FROM showtimes WHERE id = $1 FOR UPDATE",
      [showtimeId]
    );

    if (showtimeResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Showtime not found." });
    }

    const bookingResult = await client.query(
      "SELECT EXISTS (SELECT 1 FROM bookings WHERE showtime_id = $1) AS has_bookings",
      [showtimeId]
    );

    if (bookingResult.rows[0].has_bookings) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "This showtime has booking records and cannot be deleted.",
      });
    }

    const waitlistResult = await client.query(
      "SELECT EXISTS (SELECT 1 FROM premiere_waitlist WHERE showtime_id = $1) AS has_waitlist",
      [showtimeId]
    );

    if (waitlistResult.rows[0].has_waitlist) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "This showtime has premiere waitlist entries and cannot be deleted.",
      });
    }

    await client.query("DELETE FROM showtimes WHERE id = $1", [showtimeId]);

    await client.query("COMMIT");

    return res.json({ message: "Showtime deleted successfully." });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to delete showtime:", err);

    return res.status(500).json({
      error: "Failed to delete showtime.",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
