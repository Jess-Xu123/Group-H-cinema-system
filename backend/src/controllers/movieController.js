const pool = require("../config/db");

// Get published and upcoming movies
async function getMovies(req, res) {
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
        OR is_upcoming = TRUE
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Failed to fetch movies:", err);

    res.status(500).json({
      error: "Failed to fetch movies",
    });
  }
}

// Add a new movie
async function addMovie(req, res) {
  try {
    const {
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
      is_upcoming = false,
      is_published = false,
    } = req.body;

    // Validate required fields
    if (
      !title ||
      !description ||
      !duration_min ||
      !genre ||
      !age_rating ||
      !poster_url ||
      !trailer_url ||
      !banner_ad_url
    ) {
      return res.status(400).json({
        message: "Please provide all required movie fields.",
      });
    }

    if (!Number.isInteger(Number(duration_min)) || Number(duration_min) <= 0) {
      return res.status(400).json({
        message: "Duration must be a positive integer.",
      });
    }

    if (
      base_price !== undefined &&
      base_price !== null &&
      (isNaN(Number(base_price)) || Number(base_price) < 0)
    ) {
      return res.status(400).json({
        message: "Base price must be a valid non-negative number.",
      });
    }

    const query = `
      INSERT INTO movies (
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
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      external_api_id || null,
      title,
      description,
      Number(duration_min),
      genre,
      age_rating,
      base_price ?? null,
      poster_url,
      trailer_url,
      banner_ad_url,
      is_upcoming,
      is_published,
    ];

    const { rows } = await pool.query(query, values);

    res.status(201).json({
      message: "Movie added successfully.",
      movie: rows[0],
    });
  } catch (err) {
    console.error("Failed to add movie:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "A movie with this external API ID already exists.",
      });
    }

    res.status(500).json({
      message: "Failed to add movie.",
    });
  }
}

// Get all movies for admin and staff management
async function getAllMoviesForManagement(req, res) {
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
      ORDER BY id ASC;
    `;

    const { rows } = await pool.query(query);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Failed to fetch movies for management:", err);
    res.status(500).json({
      error: "Failed to fetch movies for management"
    });
  }
}

// Update an existing movie
async function updateMovie(req, res) {
    const { id } = req.params;

    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
        message: "Invalid movie ID."
    });
    }

  const {
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
  } = req.body;

  if (
    !title ||
    !description ||
    !duration_min ||
    !genre ||
    !age_rating ||
    !poster_url ||
    !trailer_url ||
    !banner_ad_url
  ) {
    return res.status(400).json({
      message: "Please provide all required movie fields."
    });
  }

  if (!Number.isInteger(Number(duration_min)) || Number(duration_min) <= 0) {
    return res.status(400).json({
      message: "Duration must be a positive integer."
    });
  }

  if (
    base_price !== null &&
    base_price !== "" &&
    (isNaN(Number(base_price)) || Number(base_price) < 0)
  ) {
    return res.status(400).json({
      message: "Base price must be a valid non-negative number."
    });
  }

  try {
    const query = `
      UPDATE movies
      SET
        external_api_id = $1,
        title = $2,
        description = $3,
        duration_min = $4,
        genre = $5,
        age_rating = $6,
        base_price = $7,
        poster_url = $8,
        trailer_url = $9,
        banner_ad_url = $10,
        is_upcoming = $11,
        is_published = $12
      WHERE id = $13
      RETURNING *;
    `;

    const values = [
      external_api_id || null,
      title,
      description,
      Number(duration_min),
      genre,
      age_rating,
      base_price === "" || base_price === undefined
        ? null
        : base_price,
      poster_url,
      trailer_url,
      banner_ad_url,
      Boolean(is_upcoming),
      Boolean(is_published),
      id
    ];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Movie not found."
      });
    }

    res.status(200).json({
      message: "Movie updated successfully.",
      movie: rows[0]
    });
  } catch (err) {
    console.error("Failed to update movie:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        message: "A movie with this external API ID already exists."
      });
    }

    res.status(500).json({
      message: "Failed to update movie."
    });
  }
}

// Delete a movie safely
async function deleteMovie(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      message: "Invalid movie ID."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check whether the movie exists and lock the row
    const movieResult = await client.query(
      `SELECT id, title
       FROM movies
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (movieResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Movie not found."
      });
    }

    // Check whether the movie has showtimes
    const showtimeResult = await client.query(
      `SELECT id
       FROM showtimes
       WHERE movie_id = $1
       LIMIT 1`,
      [id]
    );

    if (showtimeResult.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "Cannot delete this movie because it has associated showtimes. Unpublish it instead."
      });
    }

    // Delete the movie
    const deleteResult = await client.query(
      `DELETE FROM movies
       WHERE id = $1
       RETURNING id, title`,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Movie deleted successfully.",
      movie: deleteResult.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("Failed to delete movie:", err);

    return res.status(500).json({
      message: "Failed to delete movie."
    });

  } finally {
    client.release();
  }
}

module.exports = {
  getMovies,
  addMovie,
  getAllMoviesForManagement,
  updateMovie,
  deleteMovie
};
