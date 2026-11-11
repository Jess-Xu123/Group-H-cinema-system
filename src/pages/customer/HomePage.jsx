import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMovies, getShowtimes } from "../../api/cinemaApi";
import Navbar from "../../components/Navbar";
import HeroBanner from "../../components/HeroBanner";
import MovieCard from "../../components/MovieCard";
import SpecialEvent from "../../components/SpecialEvent";
import Footer from "../../components/Footer";
import "../../css/Homepage.css";

function mapMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    genre: movie.genre,
    ageRestriction: movie.age_rating,
    poster: movie.poster_url,
    price: movie.base_price == null ? null : Number(movie.base_price),
    description: movie.description,
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function HomePage() {
  const [currentLocation, setCurrentLocation] = useState("Oulu");
  const [nowShowing, setNowShowing] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [loadedShowtimesCity, setLoadedShowtimesCity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showtimesError, setShowtimesError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    getMovies(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) {
          throw new Error("The cinema server returned an invalid movie list.");
        }

        setNowShowing(data.filter((movie) => !movie.is_upcoming).map(mapMovie));
        setError("");
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          console.error("Failed to fetch movies from backend:", requestError);
          setError("Failed to load movies. Please try again later.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    getShowtimes({ city: currentLocation }, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setShowtimes(results);
        setShowtimesError("");
        setLoadedShowtimesCity(currentLocation);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          console.error(
            "Failed to fetch showtimes from backend:",
            requestError,
          );
          setShowtimesError(
            "Screening times are temporarily unavailable. Movie details are still available.",
          );
          setLoadedShowtimesCity(currentLocation);
        }
      });

    return () => controller.abort();
  }, [currentLocation]);

  const handleMovieSelect = (movie) => {
    navigate(`/movie/${movie.id}`);
  };

  const cityShowtimes =
    loadedShowtimesCity === currentLocation ? showtimes : [];
  const cityNowShowing = nowShowing
    .map((movie) => ({
      movie,
      screening: cityShowtimes.find(
        (item) => Number(item.movie_id) === Number(movie.id),
      ),
    }))
    .filter(({ screening }) => screening);
  const showtimesLoading = loadedShowtimesCity !== currentLocation;

  return (
    <div className="homepage-wrapper">
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
      />

      <HeroBanner
        currentLocation={currentLocation}
        onShowtimesClick={() =>
          navigate("/showtimes", { state: { city: currentLocation } })
        }
      />

      <main className="main-content rio-container" id="now-showing">
        {loading ? (
          <div className="loading-state" role="status">
            <p>Loading movies...</p>
          </div>
        ) : error ? (
          <div className="error-state" role="alert">
            <p>{error}</p>
          </div>
        ) : (
          <>
            <section className="movie-section">
              <div className="section-header">
                <div className="section-title-group">
                  <span className="section-subtitle">ON THE BIG SCREEN</span>
                  <h2 className="section-title">Now showing</h2>
                </div>
                <Link
                  to="/showtimes"
                  state={{ city: currentLocation }}
                  className="link-see-all"
                >
                  View all showtimes &rarr;
                </Link>
              </div>

              {showtimesError && (
                <p className="homepage-showtimes-notice" role="status">
                  {showtimesError}
                </p>
              )}
              {showtimesLoading ? (
                <div className="loading-state" role="status">
                  <p>Loading screenings for {currentLocation}...</p>
                </div>
              ) : showtimesError ? (
                <p className="homepage-showtimes-notice" role="alert">
                  {showtimesError}
                </p>
              ) : cityNowShowing.length === 0 ? (
                <p className="homepage-empty-state">
                  There are no now-showing screenings at RIO Cinema{" "}
                  {currentLocation}.
                </p>
              ) : (
                <div className="movie-grid">
                  {cityNowShowing.map(({ movie, screening }) => {
                    return (
                      <MovieCard
                        key={movie.id}
                        movie={{
                          ...movie,
                          isPremiere: screening?.is_premiere ?? false,
                          showtime: screening
                            ? formatTime(screening.start_time)
                            : null,
                          room: screening?.hall_name,
                          price:
                            screening?.base_price == null
                              ? movie.price
                              : Number(screening.base_price),
                        }}
                        onSelect={handleMovieSelect}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <SpecialEvent />
      <Footer />
    </div>
  );
}
