import "../css/HeroBanner.css";

export default function HeroBanner({
  currentLocation = "Oulu",
  onShowtimesClick,
}) {
  return (
    <section className="rio-hero-banner">
      <video className="hero-video-bg" autoPlay loop muted playsInline>
        <source
          src="https://a3s.fi/swift/v1/week-3-media/herobanner.mp4"
          type="video/mp4"
        />
      </video>
      <div className="hero-overlay"></div>

      <div className="hero-content">
        <div className="hero-tag">
          <span className="hero-tag-dash">—</span>
          <span className="hero-tag-text">
            RIO CINEMA • {currentLocation.toUpperCase()} & TAMPERE
          </span>
        </div>

        <h1 className="hero-title">A Premium Family-Run Movie Experience</h1>

        <p className="hero-description">
          Great stories. A little escape. A place that feels like yours.
          Discover
          <br />
          the magic of cinema, the Rio way.
        </p>

        <div className="hero-actions">
          <button className="btn-hero-gold" onClick={onShowtimesClick}>
            View Showtimes
            <span className="btn-arrow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="17"
                viewBox="0 0 17 17"
                fill="none"
              >
                <path
                  d="M12.0411 12.0411V4.95892H4.95889M12.0411 4.95892L4.95889 12.0411"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  stroke="#0B0B11"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>

      <div className="hero-bottom-bar">
        <div className="hero-slogan">
          <span className="red-dot"></span>
          <span>INDEPENDENT SPIRIT. UNFORGETTABLE STORIES.</span>
        </div>
      </div>
    </section>
  );
}
