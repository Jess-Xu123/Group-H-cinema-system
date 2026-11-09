import { useEffect, useState, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getMovies, getShowtimes } from "../api/cinemaApi";
import "../css/MovieDetail.css";
import "../css/Showtimes.css";

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

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

function formatFullDateHeader(dateKey) {
  if (!dateKey) return "";
  const dateObj = new Date(`${dateKey}T12:00:00`);
  const isToday = dateKey === todayDateKey();
  const formatted = new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
  return isToday ? `Today · ${formatted}` : formatted;
}

function getThreeDaysList(baseDateKey) {
  const start = new Date(`${baseDateKey || todayDateKey()}T12:00:00`);
  return Array.from({ length: 3 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    const key = getLocalDateKey(d);
    return {
      value: key,
      label:
        key === todayDateKey()
          ? "Today"
          : new Intl.DateTimeFormat("en", { weekday: "short" }).format(d),
      dayNum: d.getDate(),
      monthShort: new Intl.DateTimeFormat("en", { month: "short" }).format(d),
    };
  });
}

function getYouTubeEmbedUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    let videoId;

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.slice(1);
    } else if (
      url.hostname === "youtube.com" ||
      url.hostname === "www.youtube.com" ||
      url.hostname === "m.youtube.com"
    ) {
      videoId =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : url.pathname.startsWith("/embed/")
            ? url.pathname.split("/")[2]
            : null;
    }

    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export default function MovieDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateInputRef = useRef(null);

  const [selectedCity, setSelectedCity] = useState(
    searchParams.get("city") || "Oulu",
  );
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayDateKey);
  const [chosenShowtimeId, setChosenShowtimeId] = useState(
    searchParams.get("showtimeId") || "",
  );
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);

  const loadKey = `${id}:${selectedCity}`;
  const isLoading = loadedKey !== loadKey;
  const currentError = error?.key === loadKey ? error.message : "";

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getMovies(controller.signal),
      getShowtimes({ city: selectedCity }, controller.signal),
    ])
      .then(([movieResults, showtimeResults]) => {
        if (controller.signal.aborted) return;
        setMovies(movieResults);
        setShowtimes(showtimeResults);
        setError(null);
        setLoadedKey(loadKey);

        //Get all the screenings of the current movie in the current city
        const filmShowtimes = showtimeResults.filter(
          (s) => String(s.movie_id) === id && s.city === selectedCity,
        );
        const availableDates = [
          ...new Set(filmShowtimes.map((s) => getLocalDateKey(s.start_time))),
        ].sort();

        //Select the first date with available screenings by default.
        const defaultDate =
          availableDates.find((d) => d >= todayDateKey()) ||
          availableDates[0] ||
          todayDateKey();
        setSelectedDate(defaultDate);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError({ key: loadKey, message: requestError.message });
          setLoadedKey(loadKey);
        }
      });

    return () => controller.abort();
  }, [id, loadKey, selectedCity]);

  const movie = movies.find((item) => String(item.id) === id);

  //1. Filter for all showtimes for the selected movie in the current city.
  const movieShowtimes = showtimes.filter(
    (showtime) =>
      String(showtime.movie_id) === id && showtime.city === selectedCity,
  );

  //2. Filter for the screenings corresponding to the currently selected date
  const dayShowtimes = movieShowtimes.filter(
    (showtime) => getLocalDateKey(showtime.start_time) === selectedDate,
  );

  //3. Currently selected screening
  const selectedShowtime =
    dayShowtimes.find(
      (showtime) => String(showtime.showtime_id) === chosenShowtimeId,
    ) || dayShowtimes[0];

  const threeDaysTabs = getThreeDaysList(todayDateKey());
  const trailerEmbedUrl = getYouTubeEmbedUrl(movie?.trailer_url);

  function openDatePicker() {
    const dateInput = dateInputRef.current;
    if (!dateInput) return;

    if (typeof dateInput.showPicker === "function") {
      dateInput.showPicker();
    } else {
      dateInput.focus();
    }
  }

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={selectedCity}
        onLocationChange={setSelectedCity}
      />

      <main className="movie-detail-page rio-container">
        {isLoading && (
          <p className="showtimes-feedback" role="status">
            Loading movie details…
          </p>
        )}
        {currentError && (
          <p className="showtimes-feedback showtimes-error" role="alert">
            {currentError}
          </p>
        )}
        {!isLoading && !error && !movie && (
          <section className="movie-not-found">
            <h1>Movie not found</h1>
            <p>This film is not listed in the database.</p>
            <Link className="showtimes-details-link" to="/showtimes">
              Back to showtimes
            </Link>
          </section>
        )}

        {movie && !isLoading && !currentError && (
          <>
            <section className="movie-detail-hero">
              <img
                className="movie-detail-backdrop"
                src={movie.poster_url}
                alt=""
                aria-hidden="true"
              />
              <div className="movie-detail-hero-content">
                <Link className="movie-detail-back-link" to="/movies">
                  ← All movies
                </Link>
                <p className="cinema-eyebrow">NOW SHOWING AT RIO</p>
                <h1>{movie.title}</h1>
                <div className="movie-detail-meta">
                  <span>{movie.genre}</span>
                  {movie.duration_min && <span>{movie.duration_min} min</span>}
                  <span>{movie.age_rating}</span>
                </div>
              </div>
            </section>

            <div className="movie-detail-content">
              <section className="movie-detail-copy">
                <h2>About the movie</h2>
                <p>{movie.description}</p>

                <dl className="movie-detail-facts">
                  <div>
                    <dt>GENRE</dt>
                    <dd>{movie.genre}</dd>
                  </div>
                  <div>
                    <dt>DURATION</dt>
                    <dd>{movie.duration_min} minutes</dd>
                  </div>
                  <div>
                    <dt>AGE RESTRICTION</dt>
                    <dd>{movie.age_rating}</dd>
                  </div>
                </dl>

                <section className="movie-trailer">
                  <h2>Trailer</h2>
                  {trailerEmbedUrl ? (
                    <iframe
                      src={trailerEmbedUrl}
                      title={`${movie.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : (
                    /*movie.trailer_url ? (
                    <a
                      className="showtimes-details-link"
                      href={movie.trailer_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch the trailer ↗
                    </a>
                  ) : */ <p className="showtimes-feedback">
                      No trailer is available in the seed data.
                    </p>
                  )}
                </section>
              </section>

              {/* Ticket panel on the right */}
              <aside className="movie-booking-panel">
                <div className="movie-booking-heading">
                  <h2>See it at Rio</h2>
                  <div className="city-selector-options">
                    {["Oulu", "Tampere"].map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={selectedCity === city ? "is-selected" : ""}
                        aria-pressed={selectedCity === city}
                        onClick={() => {
                          setSelectedCity(city);
                          setChosenShowtimeId("");
                        }}
                      >
                        {selectedCity === city ? "✓ " : ""}
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar view (Tab 1, Tab 2, Tab 3 ) */}
                <div className="detail-date-grid">
                  {threeDaysTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`detail-date-tab ${
                        selectedDate === tab.value ? "is-selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedDate(tab.value);
                        setChosenShowtimeId("");
                      }}
                    >
                      <span className="tab-weekday">
                        {tab.label} {selectedDate === tab.value ? "✓" : ""}
                      </span>
                      <strong className="tab-daynum">
                        {tab.dayNum} {tab.monthShort}
                      </strong>
                    </button>
                  ))}

                  {/* Calendar button */}
                  <div
                    className="detail-calendar-btn"
                    role="button"
                    tabIndex={0}
                    aria-label="Choose a screening date"
                    onClick={openDatePicker}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDatePicker();
                      }
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                      <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
                    </svg>
                    <span>Calendar</span>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDate}
                      min={todayDateKey()}
                      className="visually-hidden-date-input"
                      onChange={(e) => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* Full descriptive text for the selected date */}
                <p className="detail-date-full-label">
                  {formatFullDateHeader(selectedDate)}
                </p>

                {/* Display cards for specific sessions on the current date */}
                {dayShowtimes.length > 0 ? (
                  <div className="movie-showtime-slots">
                    {dayShowtimes.map((st) => {
                      const isSelected =
                        String(st.showtime_id) ===
                        String(selectedShowtime?.showtime_id);
                      return (
                        <div
                          key={st.showtime_id}
                          className={`movie-selected-slot ${
                            isSelected ? "is-active-slot" : ""
                          }`}
                          onClick={() =>
                            setChosenShowtimeId(String(st.showtime_id))
                          }
                        >
                          <div className="movie-selected-slot-time">
                            <strong>{formatTime(st.start_time)}</strong>
                            <span>{st.hall_name} · 2D</span>
                          </div>
                          <div className="movie-selected-slot-price">
                            €{Number(st.base_price).toFixed(2)}
                            <span>per adult</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="showtimes-feedback">
                    No screenings scheduled for this date in {selectedCity}.
                  </p>
                )}

                {/* Seat selection button */}
                {selectedShowtime && (
                  <button
                    className="movie-select-seats"
                    type="button"
                    onClick={() =>
                      navigate(`/seats/${selectedShowtime.showtime_id}`)
                    }
                  >
                    Select seats · {formatTime(selectedShowtime.start_time)}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                )}
                <div className="navigation-text">
                  Choose your seats next. Review your order before paying.
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
