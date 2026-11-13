import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAdminShowtimes,
  getShowtimeOptions,
  createShowtime,
  updateShowtime,
  deleteShowtime,
} from "../../api/showtimeApi";
import "../../css/admin/AdminShowtimes.css";

const EMPTY_FORM = {
  movie_id: "",
  hall_id: "",
  start_time: "",
  is_premiere: false,
  is_private_company: false,
  company_name: "",
};

function toLocalDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getLocalDate(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function AdminShowtimesPage() {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editingShowtime, setEditingShowtime] = useState(null);

  const [filters, setFilters] = useState({
    city: "",
    date: "",
    hall_id: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const formRef = useRef(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [showtimeData, options] = await Promise.all([
        getAdminShowtimes(),
        getShowtimeOptions(),
      ]);

      setShowtimes(showtimeData);
      setMovies(options.movies);
      setHalls(options.halls);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cities = useMemo(
    () => [...new Set(halls.map((hall) => hall.city))].sort(),
    [halls]
  );

  const availableHalls = useMemo(
    () =>
      halls.filter(
        (hall) => !filters.city || hall.city === filters.city
      ),
    [halls, filters.city]
  );

  const formHalls = useMemo(() => {
    const selectedMovieHall = halls.find(
      (hall) => String(hall.id) === String(formData.hall_id)
    );

    if (!selectedMovieHall) return halls;

    return halls.filter(
      (hall) => hall.city === selectedMovieHall.city
    );
  }, [halls, formData.hall_id]);

  const filteredShowtimes = useMemo(() => {
    return showtimes.filter((showtime) => {
      if (filters.city && showtime.city !== filters.city) return false;

      if (
        filters.date &&
        getLocalDate(showtime.start_time) !== filters.date
      ) {
        return false;
      }

      if (
        filters.hall_id &&
        String(showtime.hall_id) !== filters.hall_id
      ) {
        return false;
      }

      return true;
    });
  }, [showtimes, filters]);

  function scrollToForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleEdit(showtime) {
    setEditingShowtime(showtime);

    setFormData({
      movie_id: String(showtime.movie_id),
      hall_id: String(showtime.hall_id),
      start_time: toLocalDateTime(showtime.start_time),
      is_premiere: showtime.is_premiere,
      is_private_company: showtime.is_private_company,
      company_name: showtime.company_name || "",
    });

    setError("");
    setSuccess("");
    scrollToForm();
  }

  function handleCancelEdit() {
    setEditingShowtime(null);
    setFormData(EMPTY_FORM);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.movie_id || !formData.hall_id || !formData.start_time) {
      setError("Please complete all required fields.");
      return;
    }

    if (formData.is_private_company && !formData.company_name.trim()) {
      setError("Please enter the company name.");
      return;
    }

    const payload = {
      movie_id: Number(formData.movie_id),
      hall_id: Number(formData.hall_id),
      start_time: new Date(formData.start_time).toISOString(),
      is_premiere: formData.is_premiere,
      is_private_company: formData.is_private_company,
      company_name: formData.is_private_company
        ? formData.company_name.trim()
        : null,
    };

    setIsSubmitting(true);

    try {
      if (editingShowtime) {
        await updateShowtime(editingShowtime.id, payload);
        setSuccess("Showtime updated successfully.");
      } else {
        await createShowtime(payload);
        setSuccess("Showtime created successfully.");
      }

      setEditingShowtime(null);
      setFormData(EMPTY_FORM);

      await loadData();
      scrollToForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(showtime) {
    const confirmed = window.confirm(
      `Delete the screening of "${showtime.movie_title}" at ${formatDateTime(showtime.start_time)}?`
    );

    if (!confirmed) return;

    setDeletingId(showtime.id);
    setDeleteError("");

    try {
      await deleteShowtime(showtime.id);

      setShowtimes((previous) =>
        previous.filter((item) => item.id !== showtime.id)
      );

      if (editingShowtime?.id === showtime.id) {
        handleCancelEdit();
      }
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const coreFieldsLocked =
    Boolean(editingShowtime?.has_bookings);

  return (
    <div className="admin-showtimes-page">
      <div className="admin-page-header">
        <h1>Showtime Management</h1>
        <p>Schedule and manage movie screenings across all cinemas.</p>
      </div>

      <section ref={formRef} className="showtime-form-section">
        <h2>{editingShowtime ? "Edit Showtime" : "Add Showtime"}</h2>

        {coreFieldsLocked && (
          <p className="showtime-info-message">
            This showtime has booking records. Movie, hall and start time
            cannot be changed. Premiere and private-company details can
            still be edited.
          </p>
        )}

        <form onSubmit={handleSubmit} className="showtime-form">
          <div className="showtime-form-grid">
            <label>
              Movie
              <select
                name="movie_id"
                value={formData.movie_id}
                onChange={handleChange}
                disabled={coreFieldsLocked}
                required
              >
                <option value="">Select movie</option>
                {movies.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title} ({movie.duration_min} min)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Hall
              <select
                name="hall_id"
                value={formData.hall_id}
                onChange={handleChange}
                disabled={coreFieldsLocked}
                required
              >
                <option value="">Select hall</option>
                {formHalls.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    {hall.city} - {hall.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start Time
              <input
                type="datetime-local"
                lang="en"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                disabled={coreFieldsLocked}
                required
              />
            </label>

            <label className="showtime-checkbox-label">
              <input
                type="checkbox"
                name="is_premiere"
                checked={formData.is_premiere}
                onChange={handleChange}
              />
              Premiere
            </label>

            <label className="showtime-checkbox-label">
              <input
                type="checkbox"
                name="is_private_company"
                checked={formData.is_private_company}
                onChange={handleChange}
              />
              Private Company Screening
            </label>

            {formData.is_private_company && (
              <label>
                Company Name
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </label>
            )}
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="showtime-success">{success}</p>}

          <div className="showtime-form-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editingShowtime
                  ? "Update Showtime"
                  : "Add Showtime"}
            </button>

            {editingShowtime && (
              <button
                type="button"
                className="showtime-cancel-button"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="showtime-list-section">
        <div className="showtime-list-header">
          <h2>Showtimes</h2>
          <span>{filteredShowtimes.length} screenings</span>
        </div>

        <div className="showtime-filters">
          <label>
            City
            <select
              value={filters.city}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  city: event.target.value,
                  hall_id: "",
                }))
              }
            >
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label>
            Date
            <input
              type="date"
              lang="en"
              value={filters.date}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  date: event.target.value,
                }))
              }
            />
          </label>

          <label>
            Hall
            <select
              value={filters.hall_id}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  hall_id: event.target.value,
                }))
              }
            >
              <option value="">All halls</option>
              {availableHalls.map((hall) => (
                <option key={hall.id} value={hall.id}>
                  {hall.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="showtime-clear-filters"
            onClick={() =>
              setFilters({ city: "", date: "", hall_id: "" })
            }
          >
            Clear Filters
          </button>
        </div>

        {isLoading && <p>Loading showtimes...</p>}
        {error && !isSubmitting && <p className="form-error">{error}</p>}
        {deleteError && <p className="form-error">{deleteError}</p>}

        {!isLoading && filteredShowtimes.length === 0 && (
          <p>No showtimes found.</p>
        )}

        <div className="showtime-list">
          {filteredShowtimes.map((showtime) => (
            <article className="showtime-list-item" key={showtime.id}>
              <div className="showtime-item-main">
                {showtime.poster_url && (
                  <img
                    src={showtime.poster_url}
                    alt={showtime.movie_title}
                    className="showtime-poster"
                  />
                )}

                <div className="showtime-item-info">
                  <h3>{showtime.movie_title}</h3>
                  <p>{showtime.city} · {showtime.hall_name}</p>
                  <p>Start: {formatDateTime(showtime.start_time)}</p>
                  <p>End: {formatDateTime(showtime.end_time)}</p>
                  <p>Duration: {showtime.duration_min} minutes</p>

                  <div className="showtime-tags">
                    {showtime.is_premiere && <span>Premiere</span>}
                    {showtime.is_private_company && (
                      <span>Private: {showtime.company_name}</span>
                    )}
                    {showtime.has_bookings && (
                      <span>{showtime.booking_count} booking(s)</span>
                    )}
                    {!showtime.is_published && <span>Unpublished movie</span>}
                  </div>
                </div>
              </div>

              <div className="showtime-item-actions">
                <button
                  type="button"
                  className="showtime-edit-button"
                  onClick={() => handleEdit(showtime)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="showtime-delete-button"
                  onClick={() => handleDelete(showtime)}
                  disabled={
                    deletingId === showtime.id || showtime.has_bookings
                  }
                  title={
                    showtime.has_bookings
                      ? "Cannot delete a showtime with booking records."
                      : ""
                  }
                >
                  {deletingId === showtime.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminShowtimesPage;
