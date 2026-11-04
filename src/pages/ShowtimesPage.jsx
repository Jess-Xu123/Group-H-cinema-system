import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getShowtimes } from "../api/cinemaApi";
import "../css/Showtimes.css";

function getLocalDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateKey() {
  return getLocalDateKey(new Date());
}

function formatDateHeading(dateKey) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatMonthHeading(dateKey) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function getWeekDates(dateKey) {
  const selected = new Date(`${dateKey}T12:00:00`);
  const mondayOffset = (selected.getDay() + 6) % 7;
  selected.setDate(selected.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selected);
    date.setDate(selected.getDate() + index);
    return {
      value: getLocalDateKey(date),
      weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
      day: date.getDate(),
    };
  });
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function ShowtimesPage() {
  const { state } = useLocation();
  const [selectedCity, setSelectedCity] = useState(state?.city || "Oulu");
  const [selectedDate, setSelectedDate] = useState(todayDateKey);
  const [showtimes, setShowtimes] = useState([]);
  const [loadedCity, setLoadedCity] = useState(null);
  const [error, setError] = useState(null);
  const isLoading = loadedCity !== selectedCity;
  const currentError =
    error?.city === selectedCity ? error.message : "";
  const weekDates = getWeekDates(selectedDate);
  const datesWithShowtimes = new Set(
    showtimes
      .filter((showtime) => showtime.city === selectedCity)
      .map((showtime) => getLocalDateKey(showtime.start_time)),
  );

  useEffect(() => {
    const controller = new AbortController();

    getShowtimes({ city: selectedCity }, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setShowtimes(results);
        setError(null);
        setLoadedCity(selectedCity);
        const availableDates = [
          ...new Set(results.map((showtime) => getLocalDateKey(showtime.start_time))),
        ].sort();
        const firstUpcomingDate =
          availableDates.find((date) => date >= todayDateKey()) ??
          availableDates[0];

        if (firstUpcomingDate) {
          setSelectedDate(firstUpcomingDate);
        }
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError({ city: selectedCity, message: requestError.message });
          setLoadedCity(selectedCity);
        }
      });

    return () => controller.abort();
  }, [selectedCity]);

  const dayShowtimes = showtimes.filter(
    (showtime) =>
      showtime.city === selectedCity &&
      getLocalDateKey(showtime.start_time) === selectedDate,
  );
  const movieCount = new Set(dayShowtimes.map((showtime) => showtime.movie_id))
    .size;

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={selectedCity}
        onLocationChange={setSelectedCity}
      />

      <main className="showtimes-page rio-container">
        <header className="showtimes-header">
          <div>
            <p className="cinema-eyebrow">YOUR CINEMA. YOUR DAY.</p>
            <h1>Let’s go to the movies.</h1>
            <p className="showtimes-intro">
              Every film, every screening in your chosen cinema.
            </p>
          </div>

          <div className="city-selector" aria-label="Choose your cinema">
            <span className="cinema-label">CHOOSE YOUR CINEMA</span>
            <div className="city-selector-options">
              {["Oulu", "Tampere"].map((city) => (
                <button
                  key={city}
                  type="button"
                  className={selectedCity === city ? "is-selected" : ""}
                  aria-pressed={selectedCity === city}
                  onClick={() => setSelectedCity(city)}
                >
                  {selectedCity === city ? "✓ " : ""}
                  {city}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="showtimes-date-section" aria-label="Choose a date">
          <div className="showtimes-section-caption">
            <h2>{formatMonthHeading(selectedDate)}</h2>
            <span>Showing at RIO Cinema {selectedCity}</span>
          </div>
          <div className="showtimes-date-picker-row">
            <div className="showtimes-date-list">
              {weekDates.map((date) => (
                <button
                  key={date.value}
                  type="button"
                  className={`showtimes-date ${
                    selectedDate === date.value ? "is-selected" : ""
                  }`}
                  aria-pressed={selectedDate === date.value}
                  disabled={date.value < todayDateKey()}
                  aria-label={`${date.weekday}, ${date.day}; ${
                    datesWithShowtimes.has(date.value)
                      ? "screenings available"
                      : "no screenings scheduled"
                  }`}
                  onClick={() => setSelectedDate(date.value)}
                >
                  <span>{date.value === todayDateKey() ? "Today" : date.weekday}</span>
                  <strong>{date.day}</strong>
                  {datesWithShowtimes.has(date.value) && (
                    <i className="showtimes-date-indicator" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            <label className="showtimes-calendar-control">
              <span className="showtimes-calendar-button">
                <svg
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                  <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
                </svg>
                <span>Calendar</span>
              </span>
              <input
                type="date"
                value={selectedDate}
                min={todayDateKey()}
                aria-label="Choose any screening date"
                onChange={(event) => {
                  if (event.target.value) {
                    setSelectedDate(event.target.value);
                  }
                }}
              />
            </label>
          </div>
        </section>

        <section className="showtimes-results" aria-live="polite">
          <div className="showtimes-section-caption">
            <h2>
              {selectedDate ? formatDateHeading(selectedDate) : "Select a date"}
            </h2>
            <span>
              {movieCount} {movieCount === 1 ? "film" : "films"} ·{" "}
              {dayShowtimes.length}{" "}
              {dayShowtimes.length === 1 ? "screening" : "screenings"}
            </span>
          </div>

          {isLoading && (
            <p className="showtimes-feedback" role="status">
              Loading showtimes…
            </p>
          )}
          {currentError && (
            <p className="showtimes-feedback showtimes-error" role="alert">
              {currentError}
            </p>
          )}
          {!isLoading && !currentError && dayShowtimes.length === 0 && (
            <p className="showtimes-feedback">
              No screenings are scheduled for this date. Choose another date.
            </p>
          )}

          <div className="showtimes-movie-list">
            {dayShowtimes.map((showtime) => {
              const detailsUrl = `/movie/${showtime.movie_id}?${new URLSearchParams({
                showtimeId: String(showtime.showtime_id),
                city: selectedCity,
              })}`;
              const price = Number(showtime.base_price);

              return (
                <article
                  className="showtimes-movie-card"
                  key={showtime.showtime_id}
                >
                  <Link
                    className="showtimes-poster-link"
                    to={detailsUrl}
                    aria-label={`View ${showtime.movie_title} details`}
                  >
                    <img
                      className="showtimes-poster"
                      src={showtime.poster_url}
                      alt={`${showtime.movie_title} poster`}
                    />
                  </Link>
                  <div className="showtimes-movie-info">
                    <p className="showtimes-genre">{showtime.genre}</p>
                    <h3>
                      <Link to={detailsUrl}>{showtime.movie_title}</Link>
                      {showtime.age_rating && (
                        <span className="showtimes-age">
                          {showtime.age_rating}
                        </span>
                      )}
                    </h3>
                    <p className="showtimes-runtime">
                      {showtime.duration_min} min
                    </p>
                    <Link className="showtimes-details-link" to={detailsUrl}>
                      Movie details ↗
                    </Link>
                  </div>

                  <Link
                    className="showtimes-slot"
                    to={detailsUrl}
                    aria-label={`View ${showtime.movie_title} details for ${formatTime(showtime.start_time)}`}
                  >
                    <span className="showtimes-slot-time">
                      {formatTime(showtime.start_time)}
                    </span>
                    <span className="showtimes-slot-price">
                      €{Number.isFinite(price) ? price.toFixed(2) : "—"}
                    </span>
                    <span className="showtimes-slot-room">
                      {showtime.hall_name} · {showtime.city}
                    </span>
                    <span className="showtimes-slot-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
