import "../css/HeroBanner.css";
import { Button } from "./Buttons";

export default function HeroBanner({
  currentLocation = "Oulu",
  onShowtimesClick,
}) {
  return (
    <section className="rio-hero-banner">
      <video className="hero-video-bg" autoPlay loop muted playsInline>
        <source
          src="https://a3s.fi/swift/v1/Rio-media/web-media/herobanner.mp4"
          type="video/mp4"
        />
      </video>
      <div className="hero-overlay"></div>

      <div className="rio-container hero-layout-container">
        <div className="hero-content">
          <div className="hero-tag">
            <span className="hero-tag-dash">—</span>
            <span className="hero-tag-text">
              RIO CINEMA • {currentLocation.toUpperCase()}
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
            <Button variant="hero" onClick={onShowtimesClick}>
              View Showtimes
            </Button>
          </div>
        </div>

        <div className="hero-bottom-bar">
          <div className="hero-slogan">
            <span className="red-dot"></span>
            <span>INDEPENDENT SPIRIT. UNFORGETTABLE STORIES.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
