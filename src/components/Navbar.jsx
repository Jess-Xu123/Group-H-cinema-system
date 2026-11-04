import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../api/authApi";
import "../css/Navbar.css";
import { Button } from "./Buttons";
import { ChevronDownIcon, MapPinIcon } from "./Icons";

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
      <div className="rio-container rio-navbar-content">
        <Link className="rio-logo" to="/" aria-label="RIO Cinema home">
          <span className="rio-logo-main">RIO</span>
          <span className="logo-dot">.</span>
          <span className="rio-logo-name">CINEMA</span>
        </Link>

        <div className="rio-nav-links" aria-label="Main navigation">
          <Link to="/" className="active" aria-current="page">
            Home
          </Link>
          <a href="#movies">Movies</a>
          <a href="#showtimes">Showtimes</a>
          <a href="#private">Private Screenings</a>
          <a href="#about">About Us</a>
        </div>

        <div className="rio-nav-actions">
          <div className="location-picker">
            <MapPinIcon />
            <span>{currentLocation}</span>
            <ChevronDownIcon />
            <select
              className="location-picker-select"
              aria-label="Cinema location"
              value={currentLocation}
              onChange={(event) => onLocationChange(event.target.value)}
            >
              <option value="Oulu">Oulu</option>
              <option value="Tampere">Tampere</option>
            </select>
          </div>
          {!isLoading && (
            <>
              <span className="location-divider" aria-hidden="true" />
              {!user ? (
                <>
                  <Button variant="login" to="/login">
                    Login
                  </Button>
                  <Button variant="register" to="/register">
                    Sign Up
                  </Button>
                </>
              ) : (
                <>
                  <span className="navbar-user">Hi, {user.full_name}</span>
                  <Button
                    variant="login"
                    icon={false}
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}