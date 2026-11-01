import { useState } from "react";
import Navbar from "../components/Navbar";
import HeroBanner from "../components/HeroBanner.jsx";
import MovieCard from "../components/MovieCard";
import Footer from "../components/Footer";
import { nowShowingMovies, upcomingMovies } from "../api/mockData";
import "../css/Homepage.css";

export default function HomePage() {
  const [currentLocation, setCurrentLocation] = useState("Oulu");

  const handleMovieSelect = (movie) => {
    console.log("Selected movie for booking:", movie);
  };

  return (
    <div className="homepage-wrapper">
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={(newLoc) => setCurrentLocation(newLoc)}
      />

      <HeroBanner
        currentLocation={currentLocation}
        onShowtimesClick={() => {
          const el = document.getElementById("now-showing");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <main className="main-content" id="now-showing">
        {/* 1. Now showing section */}
        <section className="movie-section">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-subtitle">ON THE BIG SCREEN</span>
              <h2 className="section-title">Now showing</h2>
            </div>
            <a href="#all-showtimes" className="link-see-all">
              View all showtimes &rarr;
            </a>
          </div>
          <div className="movie-grid">
            {nowShowingMovies &&
              nowShowingMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelect={handleMovieSelect}
                />
              ))}
          </div>
        </section>

        {/* 2. Upcoming Movies Section */}
        <section className="movie-section">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-subtitle">COMING SOON</span>
              <h2 className="section-title">Upcoming Movies</h2>
            </div>
          </div>

          <div className="movie-grid">
            {upcomingMovies &&
              upcomingMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isUpcoming={true}
                  onSelect={handleMovieSelect}
                />
              ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
