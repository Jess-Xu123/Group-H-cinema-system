import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../../css/BookingSuccessPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const CHECKOUT_DRAFT_KEY = "rio-checkout-draft";

function readGuestCheckoutToken() {
  try {
    const saved = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);

    if (!saved) return null;

    const draft = JSON.parse(saved);

    return draft?.holdInfo?.guestToken || null;
  } catch (error) {
    console.warn("Unable to retrieve guest checkout token:", error);
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("en-FI", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function formatPrice(amount) {
  return `€${Number(amount || 0).toFixed(2)}`;
}

function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [paymentStatus, setPaymentStatus] = useState("checking");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setPaymentStatus("error");
      setError("Payment session information is missing.");
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function checkPaymentStatus() {
      try {
        // Check the payment status every 2 seconds,
        // for up to approximately 60 seconds.
        for (let attempt = 0; attempt < 30; attempt++) {
          if (cancelled) return;

    const guestToken = readGuestCheckoutToken();

    const headers = {};

    if (guestToken) {
      headers["x-guest-checkout-token"] = guestToken;
    }

    const response = await fetch(
    `${API_BASE_URL}/api/payment/checkout-session/${encodeURIComponent(
        sessionId
    )}`,
    {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
    }
    );
          
    const result = await response.json().catch(() => null);

          if (!response.ok) {
            throw new Error(
              result?.message ||
                "Unable to retrieve your payment information."
            );
          }

          if (cancelled) return;

          if (result?.booking) {
            setBooking(result.booking);
          }

          if (result?.payment_status === "paid") {
            setPaymentStatus("paid");
            return;
          }

          if (result?.payment_status === "unavailable") {
            setPaymentStatus("unavailable");
            return;
          }

          // Payment is still being processed.
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        if (!cancelled) {
          setPaymentStatus("timeout");
        }
      } catch (error) {
        if (error.name === "AbortError" || cancelled) return;

        console.error("Payment status error:", error);

        setError(error.message);
        setPaymentStatus("error");
      }
    }

    checkPaymentStatus();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId]);

  return (
    <main className="booking-success-page">
      <div className="booking-success-container">
        {paymentStatus === "checking" && (
          <section className="payment-status-card">
            <div className="payment-loading-spinner" />

            <h1>Verifying your payment</h1>

            <p>
              Please wait while we confirm your payment.
              This usually takes a few seconds.
            </p>
          </section>
        )}

        {paymentStatus === "paid" && (
          <section className="payment-status-card payment-success-card">
            <div className="payment-status-icon success-icon">
              ✓
            </div>

            <span className="payment-status-label">
              PAYMENT CONFIRMED
            </span>

            <h1>Thank you for your booking!</h1>

            <p className="payment-status-description">
              Your payment was successful and your booking is confirmed.
              Enjoy your movie!
            </p>

            {booking && (
              <div className="success-booking-details">
                <h2>Booking Details</h2>

                <div className="success-detail-row">
                  <span>Booking ID</span>
                  <strong>#{booking.booking_id}</strong>
                </div>

                <div className="success-detail-row">
                  <span>Movie</span>
                  <strong>{booking.movie_title}</strong>
                </div>

                <div className="success-detail-row">
                  <span>Cinema</span>
                  <strong>{booking.city}</strong>
                </div>

                <div className="success-detail-row">
                  <span>Hall</span>
                  <strong>{booking.hall_name}</strong>
                </div>

                <div className="success-detail-row">
                  <span>Showtime</span>
                  <strong>{formatDate(booking.start_time)}</strong>
                </div>

                <div className="success-detail-row">
                  <span>Seats</span>
                  <strong>
                    {booking.seats?.length
                      ? booking.seats
                          .map(
                            (seat) =>
                              `${seat.row_number}-${seat.seat_number}`
                          )
                          .join(", ")
                      : "—"}
                  </strong>
                </div>

                <div className="success-detail-row">
                  <span>Payment Status</span>
                  <strong className="success-paid-text">
                    Paid
                  </strong>
                </div>

                <div className="success-detail-total">
                  <span>Total Paid</span>
                  <strong>{formatPrice(booking.total_amount)}</strong>
                </div>
              </div>
            )}

            <Link to="/" className="success-home-button">
              Back to Home
            </Link>
          </section>
        )}

        {paymentStatus === "unavailable" && (
          <section className="payment-status-card">
            <div className="payment-status-icon unavailable-icon">
              !
            </div>

            <h1>Booking Unavailable</h1>

            <p>
              This booking is no longer available. Please check
              your bookings or contact our staff if you need help.
            </p>

            <Link to="/" className="success-home-button">
              Back to Home
            </Link>
          </section>
        )}

        {paymentStatus === "timeout" && (
          <section className="payment-status-card">
            <div className="payment-status-icon pending-icon">
              !
            </div>

            <h1>Payment Still Processing</h1>

            <p>
              We haven't received the final payment confirmation yet.
              Please check My Bookings again in a moment.
              If you were charged, avoid making another payment
              until you have checked your booking status.
            </p>

            <Link to="/" className="success-home-button">
              Back to Home
            </Link>
          </section>
        )}

        {paymentStatus === "error" && (
          <section className="payment-status-card">
            <div className="payment-status-icon unavailable-icon">
              !
            </div>

            <h1>Unable to Verify Payment</h1>

            <p>
              {error ||
                "Something went wrong while checking your payment."}
            </p>

            <p className="payment-error-note">
              If your payment was charged, please check My Bookings
              before attempting another payment.
            </p>

            <Link to="/" className="success-home-button">
              Back to Home
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

export default BookingSuccessPage;
