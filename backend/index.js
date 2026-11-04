import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'RIO Cinema Backend' });
});

app.get('/api/movies', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        external_api_id,
        title,
        description,
        duration_min,
        genre,
        age_rating,
        base_price,
        poster_url,
        trailer_url,
        banner_ad_url,
        is_upcoming,
        is_published
      FROM movies
      WHERE is_published = TRUE
      ORDER BY id ASC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch movies', details: err.message });
  }
});

app.get('/api/showtimes', async (req, res) => {
  try {
    const { city } = req.query;

    let query = `
      SELECT 
        s.id AS showtime_id,
        s.movie_id,
        s.start_time,
        s.is_premiere,
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
      query += ` AND h.city = $1`;
    }

    query += ` ORDER BY s.start_time ASC;`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch showtimes', details: err.message });
  }
});

// GET /api/showtimes/:id/seats
app.get('/api/showtimes/:id/seats', async (req, res) => {
  try {
    const showtimeId = req.params.id;

    if (isNaN(showtimeId)) {
      return res.status(400).json({ error: 'Invalid showtime ID. ID must be a number.' });
    }

    const query = `
      SELECT 
        s.id AS showtime_id,
        s.start_time,
        s.is_premiere,
        m.title AS movie_title,
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
      WHERE s.id = $1;
    `;

    const { rows } = await pool.query(query, [showtimeId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Showtime not found' });
    }

    res.json({
      screening: rows[0],
      bookedSeats: []
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch seat map', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RIO Backend running on http://localhost:${PORT}`);
});