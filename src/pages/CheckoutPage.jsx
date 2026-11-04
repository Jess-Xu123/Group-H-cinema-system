import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import "../css/Showtimes.css";

export default function CheckoutPage() {
  const { state } = useLocation();
  const [city, setCity] = useState(state?.screening?.city || "Oulu");
  const screening = state?.screening;
  const selectedSeats = state?.selectedSeats || [];
  const total = Number(state?.total || 0);

  return (
    <div className="cinema-page">
      <Navbar currentLocation={city} onLocationChange={setCity} />
      <main className="checkout-page rio-container">
        <p className="cinema-eyebrow">ONE LAST THING BEFORE THE LIGHTS DIM</p>
        <h1>Your evening is almost booked.</h1>

        {!screening || selectedSeats.length === 0 ? (
          <section className="movie-not-found">
            <p>Your checkout session is missing its screening or seats.</p>
            <Link className="showtimes-details-link" to="/showtimes">
              Choose a screening
            </Link>
          </section>
        ) : (
          <div className="checkout-layout">
            <section className="checkout-form-panel">
              <h2>Your details</h2>
              <p>
                Enter the email address where you would like the booking
                information sent.
              </p>
              <form>
                <label>
                  Email address
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    required
                  />
                </label>
                <p className="checkout-demo-note">
                  Checkout preview only. Payment is not processed yet.
                </p>
              </form>
            </section>

            <aside className="checkout-order-panel">
              <h2>Your order</h2>
              <h3>{screening.movie_title}</h3>
              <p>
                {screening.city} · {screening.hall_name}
              </p>
              <p>
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(screening.start_time))}{" "}
                ·{" "}
                {new Intl.DateTimeFormat("en", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(new Date(screening.start_time))}
              </p>
              <div className="seat-order-divider" />
              <p className="seat-order-count">
                {selectedSeats.length}{" "}
                {selectedSeats.length === 1 ? "ticket" : "tickets"}
              </p>
              {selectedSeats.map((seat) => (
                <p
                  className="seat-order-item"
                  key={`${seat.row}-${seat.number}`}
                >
                  Row {seat.row} · Seat {seat.number}
                  <span>€{Number(screening.base_price).toFixed(2)}</span>
                </p>
              ))}
              <div className="seat-order-total">
                <span>Total</span>
                <strong>€{total.toFixed(2)}</strong>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
