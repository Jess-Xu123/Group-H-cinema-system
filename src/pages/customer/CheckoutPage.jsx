import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createCheckoutSession } from "../../api/paymentApi";
import {
  getLoyaltyRewards,
  holdBookingSeats,
  releaseBookingHold,
  reserveBooking,
} from "../../api/bookingApi";
import { getTicketDiscounts } from "../../api/ticketDiscountApi";
import BookingProgress from "../../components/BookingProgress";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import "../../css/Showtimes.css";
import "../../css/BookingPanels.css";
import "../../css/BookingFlow.css";
import "../../css/user/TicketTypeSelector.css";

const CHECKOUT_DRAFT_KEY = "rio-checkout-draft";

function readCheckoutDraft() {
  try {
    const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!saved) return null;

    const draft = JSON.parse(saved);
    return draft?.screening && Array.isArray(draft.selectedSeats)
      ? draft
      : null;
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

  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  const paymentSucceeded =
    new URLSearchParams(location.search).get("payment") === "success";
  const [savedDraft] = useState(readCheckoutDraft);
  const checkout = location.state?.screening
    ? location.state
    : savedDraft || {};
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
  const [reservationMessage, setReservationMessage] = useState("");
  const reservationAttemptRef = useRef(null);
  const checkoutFormRef = useRef(null);
  const [selectedSeats, setSelectedSeats] = useState(() =>
    (checkout.selectedSeats || []).map((seat) => ({
      ...seat,
      ticket_type: seat.ticket_type || "normal",
    }))
  );

  const basePriceCents = Math.round(
    Number(screening?.base_price || 0) * 100
  );

  const [ticketDiscounts, setTicketDiscounts] = useState(null);
  const [discountsLoading, setDiscountsLoading] = useState(true);
  const [discountsError, setDiscountsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTicketDiscounts() {
      setDiscountsLoading(true);
      setDiscountsError("");

      try {
        const result = await getTicketDiscounts(controller.signal);

        setTicketDiscounts({
          child_ticket_discount_percent: Number(
            result.child_ticket_discount_percent
          ),
          loyalty_ticket_discount_percent: Number(
            result.loyalty_ticket_discount_percent
          ),
        });
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          console.error("Unable to load ticket discounts:", requestError);
          setDiscountsError(
            requestError.message || "Unable to load ticket prices."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDiscountsLoading(false);
        }
      }
    }

    loadTicketDiscounts();

    return () => controller.abort();
  }, []);

  function getSeatDiscountPercent(seat) {
    if (!ticketDiscounts) return 0;

    if (seat.ticket_type === "child_under_12") {
      return ticketDiscounts.child_ticket_discount_percent;
    }

    if (seat.ticket_type === "loyalty_10th") {
      return ticketDiscounts.loyalty_ticket_discount_percent;
    }

    return 0;
  }

  function getSeatPriceCents(seat) {
    const discountPercent = getSeatDiscountPercent(seat);

    return Math.round(
      basePriceCents * (100 - discountPercent) / 100
    );
  }

  const total = selectedSeats.reduce(
    (sum, seat) => sum + getSeatPriceCents(seat),
    0
  ) / 100;

  const [loyaltyRewards, setLoyaltyRewards] = useState(null);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  useEffect(() => {
    if (!screening || selectedSeats.length === 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [screening, selectedSeats.length]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  const isExpired = secondsLeft === 0;

  const [customerDetails, setCustomerDetails] = useState({
    firstName: checkout.customerDetails?.firstName || "",
    lastName: checkout.customerDetails?.lastName || "",
    email: checkout.customerDetails?.email || "",
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setLoyaltyRewards(null);
      return;
    }

    const controller = new AbortController();
    setLoadingRewards(true);

    getLoyaltyRewards(controller.signal)
      .then(setLoyaltyRewards)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          console.error("Unable to load loyalty rewards:", requestError);
          setLoyaltyRewards(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRewards(false);
      });

    return () => controller.abort();
  }, [isLoggedIn]);

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

  useEffect(() => {
    if (!location.state?.completeReservation || !screening) return;

    if (reservationAttemptRef.current === "processing") return;

    reservationAttemptRef.current = "processing";

    async function completeReservation() {
      setError("");
      setLoading(true);

      try {
        // Create the seat hold after the user has logged in.
        // The backend will obtain the user's email from their account.
        const holdResponse = await holdBookingSeats({
          showtime_id: screening.showtime_id,
          seats: selectedSeats,
        });

        const booking = holdResponse.booking;

        if (!booking?.id) {
          throw new Error("The server did not return a valid seat hold.");
        }

        const activeHold = {
          bookingId: booking.id,
          guestToken: null,
          expiresAt: booking.expires_at,
          totalAmount: booking.total_amount,
          status: booking.status || "checkout_locked",
        };

        setHoldInfo(activeHold);

        // Convert the authenticated checkout hold into a reservation.
        const result = await reserveBooking(booking.id);

        const updatedHoldInfo = {
          ...activeHold,
          expiresAt: result.booking.expires_at,
          totalAmount: result.booking.total_amount,
          status: result.booking.status || "reserved_unpaid",
        };

        setHoldInfo(updatedHoldInfo);

        saveCheckoutDraft({
          screening,
          selectedSeats,
          total,
          holdInfo: updatedHoldInfo,
          customerDetails,
        });

        setReservationMessage(
          result.message || "Your reservation has been created successfully."
        );

        navigate("/checkout", {
          replace: true,
          state: null,
        });
      } catch (requestError) {
        console.error("Reservation creation failed:", requestError);

        setError(
          requestError.message || "Unable to complete your reservation."
        );

        // Allow retry if the request failed.
        reservationAttemptRef.current = null;

        navigate("/checkout", {
          replace: true,
          state: null,
        });
      } finally {
        setLoading(false);
      }
    }

    completeReservation();
  }, [location.state, screening]);

  async function handleTicketTypeChange(seat, ticketType) {
    setError("");

    // A hold stores immutable ticket types and prices. Release an active
    // checkout hold before allowing the selection to change.
    if (holdInfo?.bookingId) {
      if (holdInfo.status !== "checkout_locked") {
        setError(
          "This reservation has already been created. Cancel it from your orders before changing ticket types."
        );
        return;
      }

      try {
        await releaseBookingHold(holdInfo.bookingId, holdInfo.guestToken);
        setHoldInfo(null);
      } catch (requestError) {
        setError(
          requestError.message || "Unable to update your ticket selection."
        );
        return;
      }
    }

    const seatRow = seat.row_number ?? seat.row;
    const seatNumber =
      seat.seat_number ?? seat.number ?? seat.position;

    setSelectedSeats((currentSeats) =>
      currentSeats.map((currentSeat) => {
        const currentRow = currentSeat.row_number ?? currentSeat.row;
        const currentNumber =
          currentSeat.seat_number ?? currentSeat.number ?? currentSeat.position;

        return currentRow === seatRow && currentNumber === seatNumber
          ? { ...currentSeat, ticket_type: ticketType }
          : currentSeat;
      })
    );
  }

  function handleInputChange(e) {
    setCustomerDetails({
      ...customerDetails,
      [e.target.name]: e.target.value,
    });
  }

  async function getOrCreateActiveHold() {
    let activeHold = holdInfo;

    if (
      !activeHold?.bookingId ||
      (activeHold.expiresAt &&
        new Date(activeHold.expiresAt) <= new Date())
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
        status: booking.status || "checkout_locked",
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

    return activeHold;
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

  if (loading) return;

  if (discountsLoading || !ticketDiscounts || discountsError) {
    setError("Ticket prices are not available yet. Please try again.");
    return;
  }

  if (paymentMethod === "reserve") {
      if (!isLoggedIn) {
        continueToLogin();
        return;
      }

      await createReservationDirectly();
      return;
    }

    if (paymentMethod !== "card") return;

    setError("");
    setLoading(true);

    try {
      const activeHold = await getOrCreateActiveHold();

      const paymentData = await createCheckoutSession(
        {
          booking_id: activeHold.bookingId,
        },
        activeHold.guestToken
      );

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
    if (loading) return;

    setError("");

    saveCheckoutDraft({
      screening,
      selectedSeats,
      total,
      holdInfo: null,
      customerDetails,
    });

    navigate("/login", {
      state: { from: "checkout" },
    });
  }

  async function createReservationDirectly() {
    if (loading || !isLoggedIn) return;

    if (discountsLoading || !ticketDiscounts || discountsError) {
      setError("Ticket prices are not available yet. Please try again.");
      return;
    }

    setError("");
    setLoading(true);
    setReservationMessage("");

    try {
      const holdResponse = await holdBookingSeats({
        showtime_id: screening.showtime_id,
        seats: selectedSeats,
      });

      const booking = holdResponse.booking;

      if (!booking?.id) {
        throw new Error("The server did not return a valid seat hold.");
      }

      const result = await reserveBooking(booking.id);

      const updatedHoldInfo = {
        bookingId: booking.id,
        guestToken: null,
        expiresAt: result.booking.expires_at,
        totalAmount: result.booking.total_amount,
        status: result.booking.status || "reserved_unpaid",
      };

      setHoldInfo(updatedHoldInfo);

      saveCheckoutDraft({
        screening,
        selectedSeats,
        total,
        holdInfo: updatedHoldInfo,
        customerDetails,
      });

      setReservationMessage(
        result.message || "Your reservation has been created successfully."
      );
    } catch (requestError) {
      console.error("Reservation failed:", requestError);
      setError(requestError.message || "Unable to create your reservation.");
    } finally {
      setLoading(false);
    }
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
              <div className="checkout-heading-meta">
                <p className="booking-flow-screening-meta">
                  {screening.city} · {formatScreening(screening.start_time)} ·{" "}
                  {screening.hall_name}
                </p>

                <div
                  className={`booking-countdown ${
                    secondsLeft <= 120 ? "is-urgent" : ""
                  }`}
                >
                  {isExpired ? (
                    <span>
                      Session expired. Please select your seats again.
                    </span>
                  ) : (
                    <span>
                      Your seats are held for{" "}
                      <strong>
                        {minutes}:{seconds}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </header>

            {error && (
              <p className="showtimes-feedback showtimes-error" role="alert">
                {error}
              </p>
            )}{discountsError && (
              <p className="showtimes-feedback showtimes-error" role="alert">
                {discountsError}
              </p>
            )}
            {reservationMessage && (
              <p className="booking-success-message" role="status">
                {reservationMessage}
                {holdInfo?.expiresAt && (
                  <>
                    {" "}Your reservation expires at{" "}
                    {formatScreening(holdInfo.expiresAt)}.
                  </>
                )}
              </p>
            )}
            {paymentSucceeded && (
              <p className="showtimes-feedback" role="status">
                Payment received. Your booking is being confirmed; keep this
                page open if you need to check your order details.
              </p>
            )}

            <form
              ref={checkoutFormRef}
              className="checkout-layout booking-checkout-layout"
              onSubmit={submitCheckout}
            >
              {!isLoggedIn && (
                <section className="checkout-form-panel booking-form-panel">
                  <div className="booking-panel-title">
                    <h2>Your details</h2>
                    <span>Guest checkout</span>
                  </div>

                  <p>
                    No account needed. We will send your tickets to your email.
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
                        required={paymentMethod === "card"}
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
                        required={paymentMethod === "card"}
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
                      required={paymentMethod === "card"}
                    />
                  </label>

                  <p className="booking-field-note">
                    Please check your email carefully — this is where your tickets will arrive.
                  </p>
                </section>
              )}

              <div className="booking-checkout-fields">
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
                      className={paymentMethod === "reserve" ? "is-selected" : ""}
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
                    disabled={
                      loading ||
                      paymentSucceeded ||
                      discountsLoading ||
                      !ticketDiscounts ||
                      Boolean(discountsError)
                    }
                    onClick={
                      paymentMethod === "reserve"
                        ? () => {
                            if (isLoggedIn) {
                              createReservationDirectly();
                            } else {
                              continueToLogin();
                            }
                          }
                        : undefined
                    }
                  >
                    {paymentMethod === "card"
                      ? paymentSucceeded
                        ? "Payment received"
                        : loading
                          ? "Redirecting..."
                          : `Pay €${total.toFixed(2)}`
                      : isLoggedIn
                        ? "Reserve ticket"
                        : "Login"}
                    <span aria-hidden="true">→</span>
                  </button>

                  <p>
                    Review your order on the page. Your total is €
                    {total.toFixed(2)}.
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
                {selectedSeats.map((seat) => {
                  const row = seat.row_number ?? seat.row;
                  const number =
                    seat.seat_number ?? seat.number ?? seat.position;
                  const ticketType = seat.ticket_type || "normal";
                  const seatPrice = getSeatPriceCents(seat) / 100;
                  const canEditTicketType =
                    !holdInfo?.bookingId ||
                    holdInfo.status === "checkout_locked";

                  return (
                    <div
                      className="checkout-ticket-item"
                      key={`${row}-${number}`}
                    >
                      <div className="checkout-ticket-heading">
                        <strong>Row {row} · Seat {number}</strong>
                        <span>€{seatPrice.toFixed(2)}</span>
                      </div>

                      <label className="checkout-ticket-label">
                        Ticket type
                        <select
                          value={ticketType}
                          disabled={
                            loading ||
                            paymentSucceeded ||
                            !canEditTicketType ||
                            isExpired
                          }
                          onChange={(event) =>
                            handleTicketTypeChange(seat, event.target.value)
                          }
                        >
                          <option value="normal">
                            Standard — full price
                          </option>
                          <option value="child_under_12">
                            Child under 12 — {" "}
                            {ticketDiscounts?.child_ticket_discount_percent ?? 50}% off
                          </option>
                          <option value="wheelchair">
                            Wheelchair — full price
                          </option>
                          {isLoggedIn && (
                          <option
                            value="loyalty_10th"
                            disabled={
                              loadingRewards ||
                              !loyaltyRewards ||
                              Number(loyaltyRewards.available_rewards) <=
                                selectedSeats.filter(
                                  (item) => item.ticket_type === "loyalty_10th"
                                ).length -
                                  (ticketType === "loyalty_10th" ? 1 : 0)
                            }
                          >
                            10th ticket reward —{" "}
                            {ticketDiscounts?.loyalty_ticket_discount_percent ?? 50}% off
                          </option>
                          )}
                        </select>
                      </label>
                    </div>
                  );
                })}
                {isLoggedIn && (
                  <p className="checkout-loyalty-note">
                    {loadingRewards
                      ? "Checking your loyalty rewards..."
                      : loyaltyRewards
                        ? `Loyalty rewards available: ${loyaltyRewards.available_rewards}. Every 10 paid tickets earns one reward with ${ticketDiscounts?.loyalty_ticket_discount_percent ?? loyaltyRewards.loyalty_ticket_discount_percent ?? 50}% off.`
                        : "Loyalty reward balance is currently unavailable."}
                  </p>
                )}
                <div className="seat-order-total">
                  <span>Total</span>
                  <strong>€{total.toFixed(2)}</strong>
                </div>
                <p className="booking-order-guidance">
                  Prices are calculated from the selected ticket types. No
                  additional fees.
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
