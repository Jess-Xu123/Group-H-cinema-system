import { useEffect, useMemo, useState } from "react";
import { createCheckoutSession } from "../../api/paymentApi";
import { Link } from "react-router-dom";
import {
  getMyBookings,
  cancelReservation,
} from "../../api/bookingApi";
import "../../css/user/OrdersPage.css";

const filters = [
  { label: "All orders", value: "all" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Reserved", value: "reserved" },
  { label: "History", value: "history" },
];

function formatDate(date) {
  return new Intl.DateTimeFormat("en-FI", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-FI", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export default function OrdersPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  const [payingBookingId, setPayingBookingId] = useState(null);
  const [paymentError, setPaymentError] = useState("");

  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancellationError, setCancellationError] = useState("");
  const [cancellationSuccess, setCancellationSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookings() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyBookings(controller.signal);
        setBookings(data);

        if (data.length > 0) {
          setSelectedBookingId(data[0].booking_id);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBookings();

    return () => controller.abort();
  }, []);

  const categorizedBookings = useMemo(() => {
    const now = new Date();

    return {
      all: bookings,
      confirmed: bookings.filter(
        (booking) =>
          booking.status === "paid" &&
          new Date(booking.start_time) >= now
      ),
      reserved: bookings.filter(
        (booking) => booking.status === "reserved_unpaid"
      ),
      history: bookings.filter(
        (booking) =>
          booking.status === "cancelled" ||
          (booking.status === "paid" &&
            new Date(booking.start_time) < now)
      ),
    };
  }, [bookings]);

  const visibleBookings = categorizedBookings[activeFilter];

  const selectedBooking = bookings.find(
    (booking) => booking.booking_id === selectedBookingId
  );

  function getStatusLabel(status) {
    const labels = {
      paid: "Confirmed · Paid",
      reserved_unpaid: "Reserved · Unpaid",
      checkout_locked: "Checkout locked",
      cancelled: "Cancelled",
    };

    return labels[status] || status;
  }

  async function handlePayNow(booking) {
    try {
      setPayingBookingId(booking.booking_id);
      setPaymentError("");

      const result = await createCheckoutSession({
        booking_id: booking.booking_id,
      });

      if (!result?.url) {
        throw new Error("Unable to start the payment process.");
      }

      // Redirect to Stripe Checkout
      window.location.assign(result.url);

    } catch (error) {
      setPaymentError(error.message);
      setPayingBookingId(null);
    }
  }

  async function handleCancelReservation(booking) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel your reservation for ${booking.movie_title}?`
    );

    if (!confirmed) return;

    try {
      setCancellingBookingId(booking.booking_id);
      setCancellationError("");
      setCancellationSuccess("");
      setPaymentError("");

      const result = await cancelReservation(booking.booking_id);

      // Update the booking status without reloading the page.
      setBookings((previousBookings) =>
        previousBookings.map((item) =>
          item.booking_id === booking.booking_id
            ? { ...item, status: result.status }
            : item
        )
      );

      setCancellationSuccess(
        result.status === "cancelled"
          ? "Your reservation has been cancelled successfully."
          : "Your reservation has expired. The seats have been released."
      );
    } catch (error) {
      setCancellationError(error.message);
    } finally {
      setCancellingBookingId(null);
    }
  }

  return (
    <div className="orders-page">
      <div className="orders-page-header">
        <div>
          <p className="profile-eyebrow">MY RIO</p>
          <h1>Your evenings at Rio.</h1>
          <p className="profile-subtitle">
            Tickets, reservations and memories, all in one place.
          </p>
        </div>

        <Link to="/showtimes" className="orders-browse-button">
          Browse showtimes ↗
        </Link>
      </div>

      <div className="orders-filter-bar">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={
              activeFilter === filter.value ? "active" : ""
            }
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
            <span>
              {categorizedBookings[filter.value].length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="booking-state">Loading your orders...</p>
      ) : error ? (
        <p className="booking-error">{error}</p>
      ) : (
        <div className="orders-content">
          <div className="orders-list">
            {visibleBookings.length === 0 ? (
              <div className="booking-empty">
                <p>No orders found in this category.</p>
                <Link to="/showtimes">
                  Browse movies and showtimes
                </Link>
              </div>
            ) : (
              visibleBookings.map((booking) => (
                <article
                  className={`order-card ${
                    selectedBookingId === booking.booking_id
                      ? "selected"
                      : ""
                  }`}
                  key={booking.booking_id}
                  onClick={() =>
                    setSelectedBookingId(booking.booking_id)
                  }
                >
                  <div className="order-card-top">
                    <span
                      className={`order-status status-${booking.status}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>
                    <span className="order-reference">
                      RIO-{booking.booking_id}
                    </span>
                  </div>

                  <div className="order-card-main">
                    <img
                      src={booking.poster_url}
                      alt={booking.movie_title}
                      className="order-poster"
                    />

                    <div className="order-information">
                      <h2>{booking.movie_title}</h2>

                      <p>
                        {booking.city} · {booking.hall_name}
                      </p>

                      <p>
                        {formatDate(booking.start_time)} ·{" "}
                        {formatTime(booking.start_time)}
                      </p>

                      <p>
                        {booking.seats.length}{" "}
                        {booking.seats.length === 1
                          ? "ticket"
                          : "tickets"}
                        {" · "}
                        {booking.seats
                          .map(
                            (seat) =>
                              `Row ${seat.row_number} · Seat ${seat.seat_number}`
                          )
                          .join(", ")}
                      </p>

                      <strong>
                        Total €{Number(booking.total_amount).toFixed(2)}
                        {booking.status === "reserved_unpaid"
                          ? " due"
                          : ""}
                      </strong>

                      {booking.status === "reserved_unpaid" &&
                        booking.expires_at && (
                          <p className="order-expiry">
                            Payment deadline:{" "}
                            {formatDate(booking.expires_at)} ·{" "}
                            {formatTime(booking.expires_at)}
                          </p>
                        )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="order-view-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedBookingId(booking.booking_id);
                    }}
                  >
                    View details ↗
                  </button>
                </article>
              ))
            )}
          </div>

        <aside className="orders-summary-panel">
        {selectedBooking ? (
            <>
            <div className="summary-heading">
                <h2>Ready when you are.</h2>
                <p>Your confirmed e-ticket summary</p>
            </div>

            <span className="summary-reference">
                RIO-{selectedBooking.booking_id} ·{" "}
                {selectedBooking.seats.length} TICKETS
            </span>

            <h3>{selectedBooking.movie_title}</h3>

            {selectedBooking.age_rating && (
                <span className="summary-age-rating">
                Age restriction: {selectedBooking.age_rating}
                </span>
            )}

            <div className="summary-details">
                <div>
                <span>Date</span>
                <strong>
                    {formatDate(selectedBooking.start_time)}
                </strong>
                </div>

                <div>
                <span>Movie starts</span>
                <strong>
                    {formatTime(selectedBooking.start_time)}
                </strong>
                </div>

                <div>
                <span>Cinema / room</span>
                <strong>
                    {selectedBooking.city} / {selectedBooking.hall_name}
                </strong>
                </div>

                <div>
                <span>Your seats</span>
                <strong>
                    {selectedBooking.seats
                    .map(
                        (seat) =>
                        `Row ${seat.row_number} · Seat ${seat.seat_number}`
                    )
                    .join(", ")}
                </strong>
                </div>

                <div>
                <span>Booking status</span>
                <strong>
                    {getStatusLabel(selectedBooking.status)}
                </strong>
                </div>

                <div>
                <span>
                    {selectedBooking.status === "paid" ? "Paid" : "Total"}
                </span>
                <strong className="summary-price">
                    €{Number(selectedBooking.total_amount).toFixed(2)}
                </strong>
                </div>
            </div>

            <p className="summary-note">
                Please keep your booking details available when arriving
                at RIO Cinema.
            </p>

            {paymentError && (
              <p className="booking-error">
                {paymentError}
              </p>
            )}

            {cancellationError && (
              <p className="booking-error">
                {cancellationError}
              </p>
            )}

            {cancellationSuccess && (
              <p className="booking-success">
                {cancellationSuccess}
              </p>
            )}

            {selectedBooking.status === "reserved_unpaid" ? (
              <>
                <button
                  type="button"
                  className="summary-ticket-button"
                  onClick={() => handlePayNow(selectedBooking)}
                  disabled={
                    payingBookingId === selectedBooking.booking_id ||
                    cancellingBookingId === selectedBooking.booking_id
                  }
                >
                  {payingBookingId === selectedBooking.booking_id
                    ? "Redirecting to payment..."
                    : `Pay Now · €${Number(selectedBooking.total_amount).toFixed(2)}`}
                </button>

                {selectedBooking.expires_at &&
                  new Date(selectedBooking.expires_at) > new Date() && (
                    <button
                      type="button"
                      className="summary-cancel-button"
                      onClick={() => handleCancelReservation(selectedBooking)}
                      disabled={
                        cancellingBookingId === selectedBooking.booking_id ||
                        payingBookingId === selectedBooking.booking_id
                      }
                    >
                      {cancellingBookingId === selectedBooking.booking_id
                        ? "Cancelling..."
                        : "Cancel Reservation"}
                    </button>
                  )}
              </>
            ) : (
              <button
                type="button"
                className="summary-ticket-button"
                disabled
              >
                {selectedBooking.status === "paid"
                  ? "E-tickets coming soon ↗"
                  : "Tickets unavailable"}
              </button>
            )}
            </>
        ) : (
            <div className="summary-empty">
            <span className="summary-empty-icon">✦</span>
            <h2>Ready when you are.</h2>
            <p>
                Your next cinema experience is waiting for you.
                Once you make a booking, your ticket details will appear here.
            </p>
            <Link to="/showtimes" className="summary-browse-button">
                Browse showtimes ↗
            </Link>
            </div>
        )}
        </aside>

        </div>
      )}
    </div>
  );
}
