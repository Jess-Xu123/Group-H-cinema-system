import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function MoviesPage() {
  const [selectedCity, setSelectedCity] = useState("Oulu");
  const [movies, setMovies] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3000/api/movies")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to connect to local database.");
        }
        return res.json();
      })
      .then((data) => setMovies(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to connect to local database."))
      .finally(() => setLoading(false));

    fetch("http://localhost:3000/api/showtimes")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setShowtimes(Array.isArray(data) ? data : []))
      .catch(() => setShowtimes([]));
  }, []);

  const [activeTab, setActiveTab] = useState("now_showing");
  const nowShowing = movies.filter(
    (movie) =>
      !movie.is_upcoming &&
      showtimes.some((s) => s.movie_id === movie.id && s.city === selectedCity)
  );
  const comingSoon = movies.filter((movie) => movie.is_upcoming);
  const displayedMovies = activeTab === "now_showing" ? nowShowing : comingSoon;

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={selectedCity}
        onLocationChange={setSelectedCity}
      />

      <main className="movies-page rio-container" style={{ minHeight: "60vh", padding: "40px 0" }}>
        {/* Top Header: Title on Left, City Box on Right */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", gap: "24px" }}>
          <div>
            <p style={{ color: "var(--rio-gold)", fontSize: "0.8rem", letterSpacing: "2px", fontWeight: "600", margin: "0 0 10px 0" }}>
              — FIND YOUR NEXT GREAT STORY
            </p>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "3rem", margin: "0 0 12px 0", fontWeight: "normal" }}>
              A world of stories.
            </h1>
            <p style={{ color: "var(--rio-text-muted)", margin: 0, maxWidth: "500px" }}>
              Big ideas, familiar faces, unexpected escapes. What will you watch next?
            </p>
          </div>

          {/* Oulu / Tampere Selector Box */}
          <div style={{ background: "var(--rio-surface-dark)", border: "1px solid var(--rio-border-subtle)", borderRadius: "8px", padding: "12px 16px" }}>
            <span style={{ display: "block", fontSize: "0.7rem", letterSpacing: "1.5px", color: "var(--rio-text-muted)", marginBottom: "8px", fontWeight: "bold" }}>
              YOUR CINEMA
            </span>
            <div style={{ display: "flex", gap: "6px", background: "#000", padding: "4px", borderRadius: "6px" }}>
              {["Oulu", "Tampere"].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCity(city)}
                  style={{
                    border: "none",
                    cursor: "pointer",
                    padding: "6px 14px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                    backgroundColor: selectedCity === city ? "var(--rio-gold)" : "transparent",
                    color: selectedCity === city ? "#000" : "var(--rio-text-muted)",
                  }}
                >
                  {selectedCity === city ? "✓ " : ""}{city}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Interactive Tab Buttons */}
        <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--rio-border-subtle)", marginBottom: "32px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("now_showing")}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "now_showing" ? "2px solid var(--rio-gold)" : "none",
              color: activeTab === "now_showing" ? "var(--rio-gold)" : "var(--rio-text-muted)",
              cursor: "pointer",
              paddingBottom: "8px",
              fontWeight: "bold",
              fontSize: "0.95rem",
            }}
          >
            Now Showing · {nowShowing.length}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("coming_soon")}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "coming_soon" ? "2px solid var(--rio-gold)" : "none",
              color: activeTab === "coming_soon" ? "var(--rio-gold)" : "var(--rio-text-muted)",
              cursor: "pointer",
              paddingBottom: "8px",
              fontWeight: "bold",
              fontSize: "0.95rem",
            }}
          >
            Coming Soon
          </button>
        </div>

        {/* 4-Column Movie Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", margin: "32px 0" }}>
          {displayedMovies.map((movie) => (
            <article key={movie.id} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "2 / 3", background: "var(--rio-surface-dark)", borderRadius: "6px", overflow: "hidden" }}>
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {showtimes.some((s) => s.movie_id === movie.id && s.city === selectedCity && s.is_premiere) && (
                  <span style={{ position: "absolute", top: "10px", left: "10px", backgroundColor: "var(--rio-red)", color: "#fff", fontSize: "0.72rem", fontWeight: "bold", padding: "3px 6px", borderRadius: "3px" }}>
                    [Premiere]
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.72rem", letterSpacing: "1px", color: "var(--rio-text-muted)", marginTop: "14px", marginBottom: "6px", fontWeight: "bold", textTransform: "uppercase" }}>
                {movie.genre}
              </p>
              <h2 style={{ fontSize: "1.2rem", margin: "0 0 6px 0", fontWeight: "600", color: "var(--rio-text-bright)" }}>
                {movie.title}
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--rio-text-muted)", margin: "0 0 16px 0" }}>
                {movie.duration_min} min &nbsp; {movie.age_rating}
              </p>
              <a
                href={`/movie/${movie.id}?city=${encodeURIComponent(selectedCity)}`}
                style={{
                  color: "var(--rio-gold)",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  marginTop: "auto",
                }}
              >
                View Movie Details ↗
              </a>  
            </article>
          ))}
        </div>
          
        {/* Loading Indicator */}
        {loading && (
          <p style={{ textAlign: "center", color: "var(--rio-text-muted)", padding: "48px 0", fontSize: "1rem" }}>
            Loading movie catalog...
          </p>
        )}

        {/* Error Fallback */}
        {error && (
          <p style={{ textAlign: "center", color: "var(--rio-red, #ff4d4f)", padding: "48px 0", fontSize: "1rem" }}>
            {error}
          </p>
        )}

        {/* Empty State Fallback */}
        {!loading && !error && displayedMovies.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--rio-text-muted)", padding: "48px 0", fontSize: "1rem" }}>
            No movies currently scheduled for this category.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
}