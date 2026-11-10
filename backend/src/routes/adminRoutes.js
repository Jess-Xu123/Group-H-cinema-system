const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.post("/movies/import", async (req, res) => {
  const { external_api_id, manual_data } = req.body;

  if (!external_api_id && !manual_data) {
    return res.status(400).json({ error: "Payload requires either external_api_id or manual_data." });
  }

  let moviePayload = null;
  let isFallback = !external_api_id;

  if (external_api_id) {
    try {
      const url = `https://api.themoviedb.org/3/movie/${external_api_id}?api_key=${process.env.TMDB_KEY}`;
      const apiRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!apiRes.ok) throw new Error("External API error");
      const data = await apiRes.json();
      moviePayload = {
        external_api_id: String(data.id),
        title: data.title,
        description: data.overview || "No description provided.",
        duration_min: data.runtime || 120,
        genre: data.genres?.[0]?.name || "Drama",
        poster_url: data.poster_path
          ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
          : "https://placehold.co/300x450?text=Poster",
      };
    } catch {
      isFallback = true;
    }
  }

  if (isFallback) {
    if (!manual_data || !manual_data.title) {
      return res.status(503).json({
        error: "External movie API is offline or unreachable. Please supply movie details manually."
      });
    }
    moviePayload = {
      external_api_id: manual_data.external_api_id || `manual_${Date.now()}`,
      title: manual_data.title,
      description: manual_data.description || "No description provided.",
      duration_min: Number(manual_data.duration_min) || 120,
      genre: manual_data.genre || "General",
      poster_url: manual_data.poster_url || "https://placehold.co/300x450?text=Poster",
    };
  }

  const query = `
    INSERT INTO movies (
      external_api_id, 
      title, 
      description, 
      duration_min, 
      genre, 
      age_rating, 
      poster_url, 
      trailer_url, 
      banner_ad_url, 
      is_published
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE) 
    RETURNING *;
  `;

  const values = [
    moviePayload.external_api_id,
    moviePayload.title,
    moviePayload.description,
    moviePayload.duration_min,
    moviePayload.genre,
    "S",
    moviePayload.poster_url,
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://placehold.co/800x200?text=Ad"
  ];

  try {
    const { rows } = await pool.query(query, values);

    const message = isFallback
      ? "Movie saved locally via offline fallback."
      : "Movie imported and cached from external API.";
    return res.status(201).json({ message, isFallback, movie: rows[0] });
  } catch (dbErr) {
    if (dbErr.code === "23505") {
      return res.status(409).json({ error: "This movie has already been imported into the database." });
    }
    return res.status(500).json({ error: "Failed to save movie", details: dbErr.message });
  }
});

module.exports = router;