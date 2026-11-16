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
          <div className="footer-brand">
            <img
              className="rio-logo-footer"
              src="/assets/rio-marquee-logo.png"
              alt="RIO Cinema — Oulu and Tampere"
            />
            <p className="footer-tagline">
              Independent cinema. A shared experience.
            </p>
          </div>

          <section
            className="footer-cinemas"
            id="rio-cinema-locations"
            aria-labelledby="footer-cinema-heading"
          >
            <h2 className="footer-section-title" id="footer-cinema-heading">
              FIND YOUR CINEMA
            </h2>
            <div className="footer-location-grid">
              <article className="footer-location">
                <h3>Cinema RIO Oulu</h3>
                <address>
                  <p>Kauppurienkatu 45, 90100 Oulu, Finland</p>
                  <a href="tel:+358855423890">+358 8 5542 3890</a>
                </address>
                <p className="footer-auditorium-count">2 auditoriums</p>
                <p className="footer-capacities">
                  Auditorium 1: 100 seats
                  <br />
                  Auditorium 2: 200 seats
                </p>
              </article>

              <article className="footer-location">
                <h3>Cinema RIO Tampere</h3>
                <address>
                  <p>Hämeenkatu 27, 33100 Tampere, Finland</p>
                  <a href="tel:+358226417520">+358 2 2641 7520</a>
                </address>
                <p className="footer-auditorium-count">4 auditoriums</p>
                <p className="footer-capacities">
                  Auditorium 1: 100 seats
                  <br />
                  Auditorium 2: 200 seats
                </p>
              </article>
            </div>
          </section>
        </div>

        <div className="footer-bottom-row">
          <span>
            © {new Date().getFullYear()} RIO Cinema. All rights reserved.
          </span>
          <span className="footer-slogan">SEE YOU AT THE MOVIES</span>
        </div>
      </div>
    </footer>
  );
}
