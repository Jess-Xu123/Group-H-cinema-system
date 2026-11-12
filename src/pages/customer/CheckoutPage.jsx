import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createCheckoutSession } from "../../api/paymentApi";
import { holdBookingSeats, releaseBookingHold } from "../../api/bookingApi";
import BookingProgress from "../../components/BookingProgress";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import "../../css/Showtimes.css";
import "../../css/BookingPanels.css";
import "../../css/BookingFlow.css";

const CHECKOUT_DRAFT_KEY = "rio-checkout-draft";

function readCheckoutDraft() {
  try {
    const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!saved) return null;

    const draft = JSON.parse(saved);
    return draft?.screening && Array.isArray(draft.selectedSeats) ? draft : null;
  } catch (error) {
    console.warn("Unable to restore the checkout draft:", error);
    return null;
  }
}

function saveCheckoutDraft(draft) {
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentSucceeded =
    new URLSearchParams(location.search).get("payment") === "success";
  const [savedDraft] = useState(readCheckoutDraft);
  const checkout = location.state?.screening ? location.state : savedDraft || {};
  const screening = checkout.screening;
  const [city, setCity] = useState(screening?.city || "Oulu");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(location.search).get("payment") === "cancelled"
      ? "Payment was cancelled. Your selected seats are still held temporarily; you can try again here."
      : "",
  );
  const [holdInfo, setHoldInfo] = useState(checkout.holdInfo || null);
  const selectedSeats = checkout.selectedSeats || [];
  const total = Number(checkout.total || 0);

  const [customerDetails, setCustomerDetails] = useState({
    firstName: checkout.customerDetails?.firstName || "",
    lastName: checkout.customerDetails?.lastName || "",
    email: checkout.customerDetails?.email || "",
  });

  useEffect(() => {
    if (!screening) return;

    saveCheckoutDraft({
      screening,
      selectedSeats,
      total,
      holdInfo,
      customerDetails,
    });
  }, [screening, selectedSeats, total, holdInfo, customerDetails]);

  function handleInputChange(e) {
    setCustomerDetails({
      ...customerDetails,
      [e.target.name]: e.target.value,
    });
  }

  async function handleBackToSeats(e) {
    e.preventDefault();
    setError("");
    try {
      if (holdInfo?.bookingId) {
        await releaseBookingHold(holdInfo.bookingId, holdInfo.guestToken);
      }
      sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
      navigate(`/seats/${screening.showtime_id}`, {
        state: { screening, selectedSeats, total },
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to release your seat hold.");
    }
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (paymentMethod !== "card" || loading) return;

    setError("");
    setLoading(true);
    try {
      let activeHold = holdInfo;
      if (
        !activeHold?.bookingId ||
        (activeHold.expiresAt && new Date(activeHold.expiresAt) <= new Date())
      ) {
        const holdResponse = await holdBookingSeats({
          showtime_id: screening.showtime_id,
          seats: selectedSeats,
          customer_email: customerDetails.email,
        });

        const booking = holdResponse.booking;
        if (!booking?.id) {
          throw new Error("The server did not return a valid seat hold.");
        }
        activeHold = {
          bookingId: booking.id,
          guestToken: holdResponse.guest_checkout_token,
          expiresAt: booking.expires_at,
          totalAmount: booking.total_amount,
        };
        setHoldInfo(activeHold);
        saveCheckoutDraft({
          screening,
          selectedSeats,
          total,
          holdInfo: activeHold,
          customerDetails,
        });
      }

      const paymentData = await createCheckoutSession({
        bookingId: activeHold.bookingId,
        screening,
        selectedSeats,
        total: Number(activeHold.totalAmount ?? total),
        customerDetails,
      });

      if (!paymentData?.url) {
        throw new Error("The payment provider did not return a checkout URL.");
      }
      window.location.assign(paymentData.url);
    } catch (requestError) {
      console.error("Payment initialization failed:", requestError);
      setError(requestError.message || "Payment initialization failed.");
      setLoading(false);
    }
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
              onClick={handleBackToSeats}
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

            {error && (
              <p className="showtimes-feedback showtimes-error" role="alert">
                {error}
              </p>
            )}
            {paymentSucceeded && (
              <p className="showtimes-feedback" role="status">
                Payment received. Your booking is being confirmed; keep this
                page open if you need to check your order details.
              </p>
            )}

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
                        value={customerDetails.firstName}
                        onChange={handleInputChange}
                        autoComplete="given-name"
                        placeholder="Enter first name"
                        required
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        name="lastName"
                        value={customerDetails.lastName}
                        onChange={handleInputChange}
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
                      value={customerDetails.email}
                      onChange={handleInputChange}
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
                    disabled={loading || paymentSucceeded}
                    onClick={
                      paymentMethod === "reserve" ? continueToLogin : undefined
                    }
                  >
                    {paymentMethod === "card"
                      ? paymentSucceeded
                        ? "Payment received"
                        : loading
                          ? "Redirecting..."
                          : `Pay €${total.toFixed(2)}`
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
