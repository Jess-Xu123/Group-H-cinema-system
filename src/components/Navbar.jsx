import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../api/authApi";
import "../css/Navbar.css";

export default function Navbar({ currentLocation, onLocationChange }) {
  const { user, setUser, isLoading } = useAuth();

  async function handleLogout() {
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <nav className="rio-navbar">
      {/* RIO Cinema Logo */}
      <Link
        className="rio-logo"
        to="/"
        aria-label="RIO Cinema home"
      >
        <span className="rio-logo-main">RIO</span>
        <span className="logo-dot">.</span>
        <span className="rio-logo-name">CINEMA</span>
      </Link>

      {/* Main Navigation */}
      <div className="rio-nav-links" aria-label="Main navigation">
        <Link to="/" className="active" aria-current="page">
          Home
        </Link>
        <a href="#movies">Movies</a>
        <a href="#showtimes">Showtimes</a>
        <a href="#private">Private Screenings</a>
        <a href="#about">About Us</a>
      </div>

      {/* Location and Authentication */}
      <div className="rio-nav-actions">
        <div className="location-picker">
          <img
            src="/assets/map-pin.svg"
            alt=""
            width="15"
            height="15"
          />

          <span>{currentLocation}</span>

          <img
            src="/assets/chevron-down.svg"
            alt=""
            width="13"
            height="13"
          />

          <select
            className="location-picker-select"
            aria-label="Cinema location"
            value={currentLocation}
            onChange={(e) => onLocationChange(e.target.value)}
          >
            <option value="Oulu">Oulu</option>
            <option value="Tampere">Tampere</option>
          </select>
        </div>

        <span className="location-divider" aria-hidden="true" />


      {!isLoading && (
        <>
          {!user ? (
            <>
              <Link to="/login" className="btn-login">
                <img
                  src="/assets/user-round.svg"
                  alt=""
                  width="16"
                  height="16"
                />
                Login
              </Link>

              <Link to="/register" className="btn-register">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <span className="navbar-user">
                Hi, {user.full_name}
              </span>

              <button
                type="button"
                className="btn-login"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}
        </>
      )}
      
      </div>
    </nav>
  );
}