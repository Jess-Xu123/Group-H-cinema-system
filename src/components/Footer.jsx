import "../css/Footer.css";

export default function Footer({ compact = false }) {
  if (compact) {
    return (
      <footer className="rio-footer booking-footer">
        <div className="rio-container booking-footer-content">
          <span>© RIO Cinema · Independent cinema. A shared experience.</span>
          <span className="footer-slogan">SEE YOU AT THE MOVIES.</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="rio-footer">
      <div className="rio-container rio-footer-content">
        <div className="footer-top-row">
          {/* Brand Left */}
          <div className="footer-brand">
            <div className="rio-logo-footer">
              <span className="logo-rio">RIO</span>
              <span className="logo-dot">.</span>
              <span className="logo-cinema">CINEMA</span>
            </div>
            <p className="footer-tagline">
              Independent cinema. A shared experience.
            </p>
          </div>

          {/* Info Columns Right */}
          <div className="footer-links-group">
            <div className="footer-col">
              <h5>FAMILY-RUN QUALITY</h5>
              <a href="#contact">Contact Us</a>
              <a href="#hours">Opening Hours</a>
            </div>

            <div className="footer-col">
              <h5>OULU & TAMPERE LOCATIONS</h5>
              <a href="#locations">Address &rarr;</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span>© 2026 Rio Cinema. All rights reserved.</span>
          <span className="footer-slogan">SEE YOU AT THE MOVIES</span>
        </div>
      </div>
    </footer>
  );
}
