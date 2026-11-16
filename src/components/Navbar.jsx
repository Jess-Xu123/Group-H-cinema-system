import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../api/authApi";
import "../css/Navbar.css";
import { Button } from "./Buttons";
import { ChevronDownIcon, MapPinIcon } from "./Icons";

export default function Navbar({ currentLocation, onLocationChange }) {
  const { pathname } = useLocation();
  const { user, setUser, isLoading } = useAuth();

  const userDestination =
  user?.role === "admin" || user?.role === "staff"
    ? "/admin"
    : "/account/profile";

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
          <img
            className="rio-logo-image"
            src="/assets/rio-marquee-logo.png"
            alt=""
          />
        </Link>

        <div className="rio-nav-links" aria-label="Main navigation">
          <Link
            to="/"
            className={pathname === "/" ? "active" : ""}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Home
          </Link>
          <Link
              to="/movies"
              className={pathname === "/movies" ? "active" : ""}
              aria-current={pathname === "/movies" ? "page" : undefined}
            >
              Movies
            </Link>
          <Link
            to="/showtimes"
            className={pathname === "/showtimes" ? "active" : ""}
            aria-current={pathname === "/showtimes" ? "page" : undefined}
          >
            Showtimes
          </Link>
          <a href="#private">Private Screenings</a>
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
                  <Link to={userDestination} className="navbar-user">
                    Hi, {user.full_name}
                  </Link>
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