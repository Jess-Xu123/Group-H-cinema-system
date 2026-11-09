import { useEffect, useState } from "react";
import { 
    addMovie, 
    updateMovie
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
          formData.base_price === "" ? null : Number(formData.base_price),
      };

    if (editingMovie) {
        const result = await updateMovie(editingMovie.id, formData);

        setSuccess("Movie updated successfully.");

        if (onMovieUpdated) {
            onMovieUpdated(result.movie);
        }
    } else {
        const result = await addMovie(formData);

        setSuccess("Movie added successfully.");

        if (onMovieAdded) {
            onMovieAdded(result.movie);
        }
    }

      setSuccess("Movie added successfully!");
      setFormData(initialFormData);

      if (onMovieAdded) {
        onMovieAdded(result.movie);
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
          <option value="7">7</option>
          <option value="12">12</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="PG-13">PG-13</option>
          <option value="R">R</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="base_price">Base Price</label>
        <input
          id="base_price"
          name="base_price"
          type="number"
          min="0"
          step="0.01"
          value={formData.base_price}
          onChange={handleChange}
          placeholder="e.g. 12.50"
        />
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