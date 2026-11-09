import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BookingProgress from "../components/BookingProgress";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import "../css/Showtimes.css";
import "../css/BookingPanels.css";
import "../css/BookingFlow.css";

export default function CheckoutPage() {
  const { state } = useLocation();
  const screening = state?.screening;
  const navigate = useNavigate();
  const [city, setCity] = useState(screening?.city || "Oulu");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const selectedSeats = state?.selectedSeats || [];
  const total = Number(state?.total || 0);

  function handlePayment() {
    // TODO: Add the payment provider/API integration here.
  }

  function submitCheckout(event) {
    event.preventDefault();
    handlePayment();
  }

  function continueToLogin() {
    navigate("/login");
  }

  return (
    <div className="cinema-page">
      <Navbar currentLocation={city} onLocationChange={setCity} />
      <main className="checkout-page rio-container">
        <div className="booking-flow-topbar">
          {screening ? (
            <Link
              className="booking-back-link"
              to={`/seats/${screening.showtime_id}`}
              state={{ screening, selectedSeats, total }}
            >
              ← Back to seat selection
            </Link>
          ) : (
            <Link className="booking-back-link" to="/showtimes">
              ← Back to screenings
            </Link>
          )}
          <BookingProgress activeStep={3} />
        </div>

        {!screening || selectedSeats.length === 0 ? (
          <section className="movie-not-found">
            <p>
              Your checkout session is missing its screening or seats. Select a
              screening and seats to continue.
            </p>
            <Link className="showtimes-details-link" to="/showtimes">
              Choose a screening
            </Link>
          </section>
        ) : (
          <>
            <header className="booking-flow-heading checkout-heading">
              <div>
                <p className="cinema-eyebrow">
                  ONE LAST THING BEFORE THE LIGHTS DIM
                </p>
                <h1>Your evening is almost booked.</h1>
              </div>
              <p className="booking-flow-screening-meta">
                {screening.city} · {formatScreening(screening.start_time)} ·{" "}
                {screening.hall_name}
              </p>
            </header>

            <form
              className="checkout-layout booking-checkout-layout"
              onSubmit={submitCheckout}
            >
              <div className="booking-checkout-fields">
                <section className="checkout-form-panel booking-form-panel">
                  <div className="booking-panel-title">
                    <h2>Your details</h2>
                    <span>Guest checkout</span>
                  </div>
                  <p>
                    No account needed. We’ll send your tickets to your email.
                  </p>
                  <div className="booking-name-fields">
                    <label>
                      First name
                      <input
                        name="firstName"
                        autoComplete="given-name"
                        placeholder="Enter first name"
                        required
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        name="lastName"
                        autoComplete="family-name"
                        placeholder="Enter last name"
                        required
                      />
                    </label>
                  </div>
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
                  <p className="booking-field-note">
                    Please check your email carefully — this is where your
                    tickets will arrive.
                  </p>
                </section>

                <section className="checkout-form-panel booking-form-panel">
                  <h2>How would you like to pay?</h2>
                  <div className="booking-payment-options">
                    <label
                      className={paymentMethod === "card" ? "is-selected" : ""}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                      />
                      <span>
                        <strong>Payment card</strong>
                        <small>Visa · Mastercard</small>
                      </span>
                    </label>
                    <label
                      className={
                        paymentMethod === "reserve" ? "is-selected" : ""
                      }
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="reserve"
                        checked={paymentMethod === "reserve"}
                        onChange={() => setPaymentMethod("reserve")}
                      />
                      <span>
                        <strong>Reserve ticket</strong>
                        <small>Login required</small>
                      </span>
                    </label>
                  </div>
                  <p className="booking-demo-note">
                    Payment options are for this concept only. No card details
                    are collected and no payment will be processed.
                  </p>
                </section>

                <label className="booking-terms">
                  <input type="checkbox" name="terms" required />
                  <span>
                    I agree to the booking terms and have read the privacy
                    notice.
                  </span>
                </label>
                <div className="booking-submit-row">
                  <button
                    className={`movie-select-seats ${
                      paymentMethod === "card" ? "is-payment-active" : ""
                    }`}
                    type={paymentMethod === "card" ? "submit" : "button"}
                    onClick={
                      paymentMethod === "reserve" ? continueToLogin : undefined
                    }
                  >
                    {paymentMethod === "card"
                      ? `Pay €${total.toFixed(2)}`
                      : "Login"}
                    <span aria-hidden="true">→</span>
                  </button>
                  <p>
                    Review your order on the right. Your total is €
                    {total.toFixed(2)}, with no added fees.
                  </p>
                </div>
              </div>

              <aside className="checkout-order-panel booking-order-panel">
                <h2>Your order</h2>
                <div className="booking-order-movie">
                  {screening.poster_url && (
                    <img src={screening.poster_url} alt="" />
                  )}
                  <div>
                    <h3>{screening.movie_title}</h3>
                    <p>
                      {screening.city} · {screening.hall_name}
                    </p>
                    <p>{formatScreening(screening.start_time)}</p>
                  </div>
                </div>
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
                <p className="booking-order-guidance">
                  {selectedSeats.length} × €
                  {Number(screening.base_price).toFixed(2)} · No additional
                  fees.
                </p>
              </aside>
            </form>
          </>
        )}
      </main>
      <Footer compact />
    </div>
  );
}

function formatScreening(value) {
  const date = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
  const time = new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
  return `${date} · ${time}`;
}
