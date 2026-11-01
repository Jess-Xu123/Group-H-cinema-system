import "../css/Navbar.css";

export default function Navbar({ currentLocation, onLocationChange }) {
  return (
    <nav className="rio-navbar">
      <a className="rio-logo" href="#home" aria-label="RIO Cinema home">
        <span className="rio-logo-main">RIO</span>
        <span className="logo-dot">.</span>
        <span className="rio-logo-name">CINEMA</span>
      </a>

      <div className="rio-nav-links" aria-label="Main navigation">
        <a href="#home" className="active" aria-current="page">
          Home
        </a>
        <a href="#movies">Movies</a>
        <a href="#showtimes">Showtimes</a>
        <a href="#private">Private Screenings</a>
        <a href="#about">About Us</a>
      </div>

      <div className="rio-nav-actions">
        <div className="location-picker">
          <img src="/assets/map-pin.svg" alt="" width="15" height="15" />
          <span>{currentLocation}</span>
          <img src="/assets/chevron-down.svg" alt="" width="13" height="13" />
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
        <button className="btn-login" type="button">
          <img src="/assets/user-round.svg" alt="" width="16" height="16" />
          Login
        </button>
      </div>
    </nav>
  );
}
