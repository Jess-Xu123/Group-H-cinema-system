import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { getMovies, getShowtimes } from "../../api/cinemaApi";
import "../../css/MoviesPage.css";

export default function MoviesPage() {
  const [selectedCity, setSelectedCity] = useState("Oulu");
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("now_showing");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchMoviesData() {
      try {
        setLoading(true);
        setError(null);

        const [moviesData, showtimesData] = await Promise.all([
          getMovies(controller.signal),
          getShowtimes({ city: selectedCity }, controller.signal),
        ]);

        setMovies(Array.isArray(moviesData) ? moviesData : []);
        setShowtimes(Array.isArray(showtimesData) ? showtimesData : []);
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Failed to fetch movies data:", error);
        setError(error.message || "Unable to load movies. Please try again later.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchMoviesData();

    return () => controller.abort();
  }, [selectedCity]);

    const currentCityShowtimes = showtimes.filter(
      (showtime) =>
        new Date(showtime.start_time) > new Date(),
    );

    const nowShowing = movies.filter(
      (movie) =>
        !movie.is_upcoming &&
        currentCityShowtimes.some(
          (showtime) =>
            Number(showtime.movie_id) === Number(movie.id),
        ),
    );

    const comingSoon = movies.filter(
      (movie) =>
        movie.is_upcoming &&
        currentCityShowtimes.some(
          (showtime) =>
            Number(showtime.movie_id) === Number(movie.id),
        ),
    );

    const displayedMovies =
      activeTab === "now_showing" ? nowShowing : comingSoon;

    const hasPremiere = (movieId) =>
      currentCityShowtimes.some(
        (showtime) =>
          Number(showtime.movie_id) === Number(movieId) &&
          showtime.is_premiere,
      );

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={selectedCity}
        onLocationChange={setSelectedCity}
      />

      <main className="movies-page rio-container">
        <header className="movies-header">
          <div className="movies-heading-copy">
            <p className="movies-eyebrow">— FIND YOUR NEXT GREAT STORY</p>
            <h1 className="movies-page-title">A world of stories.</h1>
            <p className="movies-intro">
              Big ideas, familiar faces, unexpected escapes. What will you watch
              next?
            </p>
          </div>

          <div className="movies-cinema-selector">
            <span className="movies-selector-label">YOUR CINEMA</span>
            <div className="movies-city-options" aria-label="Choose your cinema">
              {["Oulu", "Tampere"].map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`movies-city-button${
                    selectedCity === city ? " is-active" : ""
                  }`}
                  onClick={() => setSelectedCity(city)}
                  aria-pressed={selectedCity === city}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </header>

        <nav className="movies-tabs" aria-label="Movie categories">
          <button
            type="button"
            className={`movies-tab${
              activeTab === "now_showing" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("now_showing")}
            aria-pressed={activeTab === "now_showing"}
          >
            Now Showing <span className="movies-tab-count">{nowShowing.length}</span>
          </button>
          <button
            type="button"
            className={`movies-tab${
              activeTab === "coming_soon" ? " is-active" : ""
            }`}
            onClick={() => setActiveTab("coming_soon")}
            aria-pressed={activeTab === "coming_soon"}
          >
            Coming Soon
          </button>
          <p className="movies-showtimes-link">
            Discover films · For times, visit{" "}
            <Link to="/showtimes" state={{ city: selectedCity }}>
              Showtimes →
            </Link>
          </p>
        </nav>

        <section className="movies-results" aria-live="polite">
          {loading && (
            <p className="movies-state-message">Loading movie catalog...</p>
          )}

          {!loading && error && (
            <p className="movies-state-message is-error">{error}</p>
          )}

          {!loading && !error && displayedMovies.length === 0 && (
            <p className="movies-state-message">
              No movies currently scheduled for this category.
            </p>
          )}

          {!loading && !error && displayedMovies.length > 0 && (
            <div className="movies-grid">
              {displayedMovies.map((movie) => (
                <article className="movies-card" key={movie.id}>
                  <div className="movies-card-poster-wrap">
                    <img
                      className="movies-card-poster"
                      src={movie.poster_url}
                      alt={`${movie.title} poster`}
                      loading="lazy"
                    />
                    {hasPremiere(movie.id) && (
                      <span className="movies-premiere-badge">Premiere</span>
                    )}
                  </div>

                  <div className="movies-card-content">
                    <p className="movies-card-genre">{movie.genre}</p>
                    <h2 className="movies-card-title">{movie.title}</h2>
                    <p className="movies-card-meta">
                      <span>{movie.duration_min} min</span>
                      <span className="movies-meta-separator" aria-hidden="true">
                        ·
                      </span>
                      <span>{movie.age_rating}</span>
                    </p>
                    <Link
                      className="movies-card-link"
                      to={`/movie/${movie.id}?city=${encodeURIComponent(
                        selectedCity,
                      )}`}
                    >
                      View Movie Details <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
