import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getMovies, getShowtimes } from "../api/cinemaApi";
import "../css/Showtimes.css";

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatScreeningDate(value) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
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
  const [selectedCity, setSelectedCity] = useState(
    searchParams.get("city") || "Oulu",
  );
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [chosenShowtimeId, setChosenShowtimeId] = useState(
    searchParams.get("showtimeId") || "",
  );
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState(null);
  const loadKey = `${id}:${selectedCity}`;
  const isLoading = loadedKey !== loadKey;
  const currentError =
    error?.key === loadKey ? error.message : "";

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
  const movieShowtimes = showtimes.filter(
    (showtime) => String(showtime.movie_id) === id,
  );
  const selectedShowtimeId = movieShowtimes.some(
    (showtime) => String(showtime.showtime_id) === chosenShowtimeId,
  )
    ? chosenShowtimeId
    : movieShowtimes[0]
      ? String(movieShowtimes[0].showtime_id)
      : "";

  const selectedShowtime = movieShowtimes.find(
    (showtime) => String(showtime.showtime_id) === selectedShowtimeId,
  );
  const trailerEmbedUrl = getYouTubeEmbedUrl(movie?.trailer_url);

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
                  ) : movie.trailer_url ? (
                    <a
                      className="showtimes-details-link"
                      href={movie.trailer_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch the trailer ↗
                    </a>
                  ) : (
                    <p className="showtimes-feedback">
                      No trailer is available in the seed data.
                    </p>
                  )}
                </section>
              </section>

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
                        onClick={() => setSelectedCity(city)}
                      >
                        {selectedCity === city ? "✓ " : ""}
                        {city}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="showtimes-calendar">
                  <span>Choose a screening</span>
                  <select
                    value={selectedShowtimeId}
                    onChange={(event) =>
                      setChosenShowtimeId(event.target.value)
                    }
                    disabled={movieShowtimes.length === 0}
                  >
                    {movieShowtimes.length === 0 && (
                      <option value="">No screenings available</option>
                    )}
                    {movieShowtimes.map((showtime) => (
                      <option
                        key={showtime.showtime_id}
                        value={showtime.showtime_id}
                      >
                        {formatScreeningDate(showtime.start_time)} ·{" "}
                        {formatTime(showtime.start_time)} ·{" "}
                        {showtime.hall_name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedShowtime && (
                  <>
                    <div className="movie-selected-slot">
                      <div className="movie-selected-slot-time">
                        <strong>{formatTime(selectedShowtime.start_time)}</strong>
                        <span>
                          {selectedShowtime.hall_name} ·{" "}
                          {selectedShowtime.city}
                        </span>
                      </div>
                      <div className="movie-selected-slot-price">
                        €{Number(selectedShowtime.base_price).toFixed(2)}
                        <span>per adult</span>
                      </div>
                    </div>
                    <button
                      className="movie-select-seats"
                      type="button"
                      onClick={() =>
                        navigate(`/seats/${selectedShowtime.showtime_id}`)
                      }
                    >
                      Select seats · {formatTime(selectedShowtime.start_time)}
                      <span aria-hidden="true">→</span>
                    </button>
                  </>
                )}
                {!isLoading && !error && movieShowtimes.length === 0 && (
                  <p className="showtimes-feedback">
                    No public screenings are scheduled in {selectedCity}.
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
