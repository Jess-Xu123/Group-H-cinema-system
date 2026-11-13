import { useEffect, useState } from "react";
import { 
    addMovie, 
    updateMovie,
    importMovie,
    searchMoviesByTitle
 } from "../../api/movieApi";

function MovieForm({
  onMovieAdded,
  editingMovie,
  onMovieUpdated,
  onCancelEdit
}) {
  const initialFormData = {
    external_api_id: "",
    title: "",
    description: "",
    duration_min: "",
    genre: "",
    age_rating: "",
    base_price: "",
    poster_url: "",
    trailer_url: "",
    banner_ad_url: "",
    is_upcoming: false,
    is_published: false,
  };

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (editingMovie) {
        setFormData({
        external_api_id: editingMovie.external_api_id || "",
        title: editingMovie.title || "",
        description: editingMovie.description || "",
        duration_min: editingMovie.duration_min || "",
        genre: editingMovie.genre || "",
        age_rating: editingMovie.age_rating || "",
        base_price: editingMovie.base_price ?? "",
        poster_url: editingMovie.poster_url || "",
        trailer_url: editingMovie.trailer_url || "",
        banner_ad_url: editingMovie.banner_ad_url || "",
        is_upcoming: editingMovie.is_upcoming ?? false,
        is_published: editingMovie.is_published ?? false,
        });

        setError("");
        setSuccess("");
    }

    if (!editingMovie) {
    setFormData({
        external_api_id: "",
        title: "",
        description: "",
        duration_min: "",
        genre: "",
        age_rating: "",
        base_price: "",
        poster_url: "",
        trailer_url: "",
        banner_ad_url: "",
        is_upcoming: false,
        is_published: false,
        });
    }
  }, [editingMovie]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleTmdbFetch() {
    if (!formData.external_api_id.trim()) {
      setError("Please enter a TMDB Movie ID first (e.g., 550).");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await importMovie(formData.external_api_id.trim());
      const m = result.movie || result;

      setFormData((prev) => ({
        ...prev,
        title: m.title || prev.title,
        description: m.description || prev.description,
        duration_min: m.duration_min || prev.duration_min,
        genre: m.genre || prev.genre,
        age_rating: m.age_rating || prev.age_rating || "S",
        poster_url: m.poster_url || prev.poster_url,
        trailer_url: m.trailer_url || prev.trailer_url,
        banner_ad_url: m.banner_ad_url || prev.banner_ad_url,
      }));

      setSuccess("Movie details loaded from TMDB. Complete the form and click Add Movie to save.");
    } catch (err) {
      setError(` Outage / Fallback Warning: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError("");
    try {
      const results = await searchMoviesByTitle(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) setError("No matching movies found on TMDB.");
    } catch (err) {
      setError(` Outage Warning: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSelectMovie(selectedId) {
    setSearchResults([]);
    setSearchQuery("");
    setFormData((prev) => ({ ...prev, external_api_id: String(selectedId) }));

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await importMovie(String(selectedId));
      const m = result.movie || result;

      setFormData((prev) => ({
        ...prev,
        title: m.title || prev.title,
        description: m.description || prev.description,
        duration_min: m.duration_min || prev.duration_min,
        genre: m.genre || prev.genre,
        age_rating: m.age_rating || prev.age_rating || "S",
        poster_url: m.poster_url || prev.poster_url,
        trailer_url: m.trailer_url || prev.trailer_url,
        banner_ad_url: m.banner_ad_url || prev.banner_ad_url,
      }));

      setSuccess("Movie details loaded from TMDB. Enter base price and click Add Movie to save.");
    } catch (err) {
      setError(` Outage / Fallback Warning: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }


  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.duration_min ||
      !formData.genre.trim() ||
      !formData.age_rating ||
      !formData.poster_url.trim() ||
      !formData.trailer_url.trim() ||
      !formData.banner_ad_url.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);

    try {
      const movieData = {
        ...formData,
        external_api_id: formData.external_api_id.trim() || null,
        duration_min: Number(formData.duration_min),
        base_price:
          formData.base_price === ""
            ? null
            : Number(formData.base_price),
      };

      if (editingMovie) {
        const result = await updateMovie(
          editingMovie.id,
          movieData
        );

        setSuccess("Movie updated successfully.");

        if (onMovieUpdated) {
          onMovieUpdated(result.movie);
        }
      } else {
        const result = await addMovie(movieData);

        setSuccess("Movie added successfully.");

        if (onMovieAdded) {
          onMovieAdded(result.movie);
        }

        setFormData(initialFormData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }


  return (
    <form onSubmit={handleSubmit} className="movie-form">
      <h2>{editingMovie ? "Edit Movie" : "Add New Movie"}</h2>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      <div className="form-group">
        <label htmlFor="title">Movie Title *</label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="duration_min">Duration (minutes) *</label>
        <input
          id="duration_min"
          name="duration_min"
          type="number"
          min="1"
          step="1"
          value={formData.duration_min}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="genre">Genre *</label>
        <input
          id="genre"
          name="genre"
          type="text"
          value={formData.genre}
          onChange={handleChange}
          placeholder="e.g. Action, Drama"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="age_rating">Age Rating *</label>
        <select
          id="age_rating"
          name="age_rating"
          value={formData.age_rating}
          onChange={handleChange}
          required
        >
          <option value="">Select age rating</option>
          <option value="S">S</option>
          <option value="K-7">K-7</option>
          <option value="K-12">K-12</option>
          <option value="K-16">K-16</option>
          <option value="K-18">K-18</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="base_price">Base Price *</label>
        <input
          id="base_price"
          name="base_price"
          type="number"
          min="0"
          step="0.01"
          value={formData.base_price}
          onChange={handleChange}
          placeholder="e.g. 12.50"
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label>Search TMDB by Movie Name</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="e.g. Fight Club, Dune..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: "260px" }}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              background: "#14141b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              maxWidth: "420px",
              overflow: "hidden",
            }}
          >
            {searchResults.map((m) => (
              <div
                key={m.id}
                onClick={() => handleSelectMovie(m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {m.poster_url && (
                  <img
                    src={m.poster_url}
                    alt=""
                    style={{ width: "24px", height: "36px", objectFit: "cover", borderRadius: "2px" }}
                  />
                )}
                <span style={{ fontWeight: "bold", color: "#fff" }}>{m.title}</span>
                <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>({m.release_year})</span>
                <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "var(--rio-gold, #e3b757)" }}>
                  Select & Import →
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="external_api_id">External API ID</label>
        <input
          id="external_api_id"
          name="external_api_id"
          type="text"
          value={formData.external_api_id}
          onChange={handleChange}
        />
        <button
          type="button"
          onClick={handleTmdbFetch}
          disabled={isLoading}
        >
          {isLoading ? "Fetching..." : "Fetch from TMDB"}
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="poster_url">Poster URL *</label>
        <input
          id="poster_url"
          name="poster_url"
          type="url"
          value={formData.poster_url}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="trailer_url">Trailer URL *</label>
        <input
          id="trailer_url"
          name="trailer_url"
          type="url"
          value={formData.trailer_url}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="banner_ad_url">Banner Ad URL *</label>
        <input
          id="banner_ad_url"
          name="banner_ad_url"
          type="url"
          value={formData.banner_ad_url}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            name="is_upcoming"
            checked={formData.is_upcoming}
            onChange={handleChange}
          />
          Upcoming Movie
        </label>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            name="is_published"
            checked={formData.is_published}
            onChange={handleChange}
          />
          Publish Movie
        </label>
      </div>

    <button type="submit" disabled={isLoading}>
    {isLoading
        ? "Saving..."
        : editingMovie
        ? "Update Movie"
        : "Add Movie"}
    </button>

    {editingMovie && (
    <button
        type="button"
        onClick={onCancelEdit}
        disabled={isLoading}
    >
        Cancel
    </button>
    )}
    </form>
  );
}

export default MovieForm;