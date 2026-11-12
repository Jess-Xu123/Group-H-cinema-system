import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminBookings,
  confirmOfflinePayment,
} from "../../api/bookingApi";
import "../../css/admin/AdminBookings.css";

const STATUS_OPTIONS = [
  { value: "all", label: "All bookings" },
  { value: "checkout_locked", label: "Checkout Locked" },
  { value: "reserved_unpaid", label: "Reserved Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
];

const STATUS_LABELS = {
  checkout_locked: "Checkout Locked",
  reserved_unpaid: "Reserved Unpaid",
  paid: "Paid",
  cancelled: "Cancelled",
  expired: "Expired",
};

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatSeat(seat) {
  return `Row ${seat.row_number}, Seat ${seat.seat_number}`;
}

function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [expandedBookingId, setExpandedBookingId] = useState(null);
  const [processingBookingId, setProcessingBookingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadBookings = useCallback(async (signal) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getAdminBookings(signal);
      setBookings(result);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to load bookings.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadBookings(controller.signal);

    return () => controller.abort();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;

      const searchableText = [
        booking.booking_id,
        booking.customer_name,
        booking.customer_email,
        booking.movie_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !keyword || searchableText.includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, searchTerm, statusFilter]);

  const bookingCounts = useMemo(() => {
    return {
      all: bookings.length,
      checkout_locked: bookings.filter(
        (booking) => booking.status === "checkout_locked"
      ).length,
      reserved_unpaid: bookings.filter(
        (booking) => booking.status === "reserved_unpaid"
      ).length,
      paid: bookings.filter(
        (booking) => booking.status === "paid"
      ).length,
      cancelled: bookings.filter(
        (booking) => booking.status === "cancelled"
      ).length,
      expired: bookings.filter(
        (booking) => booking.status === "expired"
      ).length,
    };
  }, [bookings]);

  function toggleBookingDetails(bookingId) {
    setExpandedBookingId((currentId) =>
      currentId === bookingId ? null : bookingId
    );
  }

  async function handleConfirmPayment(booking) {
    const confirmed = window.confirm(
      `Confirm offline payment for booking #${booking.booking_id}?`
    );

    if (!confirmed) return;

    setProcessingBookingId(booking.booking_id);
    setActionError("");
    setSuccessMessage("");

    try {
      await confirmOfflinePayment(booking.booking_id);

      setBookings((previousBookings) =>
        previousBookings.map((item) =>
          item.booking_id === booking.booking_id
            ? { ...item, status: "paid" }
            : item
        )
      );

      setSuccessMessage(
        `Offline payment for booking #${booking.booking_id} confirmed successfully.`
      );
    } catch (err) {
      setActionError(
        err.message || "Unable to confirm offline payment."
      );
    } finally {
      setProcessingBookingId(null);
    }
  }

  function handleRefresh() {
    setActionError("");
    setSuccessMessage("");
    loadBookings();
  }

  return (
    <div className="admin-bookings-page">
      <div className="admin-page-header">
        <div>
          <h1>Booking Management</h1>
          <p>View and manage all cinema bookings.</p>
        </div>

        <button
          type="button"
          className="booking-refresh-button"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <i className="bi bi-arrow-clockwise"></i>
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Booking summary */}
      <section className="booking-stats-grid">
        <div className="booking-stat-card">
          <span className="booking-stat-label">Total Bookings</span>
          <strong>{bookingCounts.all}</strong>
        </div>

        <div className="booking-stat-card">
          <span className="booking-stat-label">Awaiting Payment</span>
          <strong>{bookingCounts.reserved_unpaid}</strong>
        </div>

        <div className="booking-stat-card">
          <span className="booking-stat-label">Paid</span>
          <strong>{bookingCounts.paid}</strong>
        </div>

        <div className="booking-stat-card">
          <span className="booking-stat-label">Cancelled / Expired</span>
          <strong>
            {bookingCounts.cancelled + bookingCounts.expired}
          </strong>
        </div>
      </section>

      {/* Search and filters */}
      <section className="booking-filter-section">
        <div className="booking-search-wrapper">
          <i className="bi bi-search"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search booking ID, customer, email or movie..."
            aria-label="Search bookings"
          />
        </div>

        <select
          className="booking-status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter bookings by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
              {option.value !== "all"
                ? ` (${bookingCounts[option.value]})`
                : ` (${bookingCounts.all})`}
            </option>
          ))}
        </select>
      </section>

      {actionError && (
        <div className="booking-alert booking-alert-error" role="alert">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="booking-alert booking-alert-success" role="status">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="booking-alert booking-alert-error" role="alert">
          {error}
          <button type="button" onClick={handleRefresh}>
            Try again
          </button>
        </div>
      )}

      {/* Booking list */}
      <section className="booking-list-section">
        <div className="booking-list-header">
          <div>
            <h2>Bookings</h2>
            <p>
              Showing {filteredBookings.length} of {bookings.length} bookings
            </p>
          </div>
        </div>

        {isLoading && bookings.length === 0 && (
          <div className="booking-state-message">
            <i className="bi bi-arrow-repeat"></i>
            <p>Loading bookings...</p>
          </div>
        )}

        {!isLoading && !error && filteredBookings.length === 0 && (
          <div className="booking-state-message">
            <i className="bi bi-ticket-perforated"></i>
            <p>
              {bookings.length === 0
                ? "No bookings found."
                : "No bookings match your search or filter."}
            </p>
          </div>
        )}

        {filteredBookings.length > 0 && (
          <div className="booking-table-wrapper">
            <table className="booking-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Movie</th>
                  <th>Showtime</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map((booking) => {
                  const isExpanded =
                    expandedBookingId === booking.booking_id;

                  const isProcessing =
                    processingBookingId === booking.booking_id;

                  return (
                    <Fragment key={booking.booking_id}>
                      <tr key={booking.booking_id}>
                        <td>
                          <strong>#{booking.booking_id}</strong>
                          <span className="booking-secondary-text">
                            {formatDate(booking.created_at)}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {booking.customer_name || "Guest"}
                          </strong>
                          <span className="booking-secondary-text">
                            {booking.customer_email || "—"}
                          </span>
                        </td>

                        <td>
                          <div className="booking-movie-cell">
                            {booking.poster_url && (
                              <img
                                src={booking.poster_url}
                                alt=""
                                className="booking-movie-poster"
                              />
                            )}
                            <span>{booking.movie_title || "—"}</span>
                          </div>
                        </td>

                        <td>
                          <span>{formatDate(booking.start_time)}</span>
                          <span className="booking-secondary-text">
                            {booking.city
                              ? `${booking.city} · `
                              : ""}
                            {booking.hall_name || "—"}
                          </span>
                        </td>

                        <td>
                          <strong>{formatPrice(booking.total_amount)}</strong>
                        </td>

                        <td>
                          <span
                            className={`booking-status-badge booking-status-${booking.status}`}
                          >
                            {STATUS_LABELS[booking.status] || booking.status}
                          </span>
                        </td>

                        <td>
                          <div className="booking-row-actions">
                            <button
                              type="button"
                              className="booking-details-button"
                              onClick={() =>
                                toggleBookingDetails(booking.booking_id)
                              }
                            >
                              {isExpanded ? "Hide" : "Details"}
                            </button>

                            {booking.status === "reserved_unpaid" && (
                              <button
                                type="button"
                                className="booking-payment-button"
                                onClick={() =>
                                  handleConfirmPayment(booking)
                                }
                                disabled={isProcessing}
                              >
                                {isProcessing
                                  ? "Processing..."
                                  : "Confirm Payment"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr
                          key={`${booking.booking_id}-details`}
                          className="booking-expanded-row"
                        >
                          <td colSpan="7">
                            <div className="booking-details-panel">
                              <div className="booking-details-grid">
                                <div>
                                  <span className="booking-detail-label">
                                    Booking ID
                                  </span>
                                  <strong>#{booking.booking_id}</strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Customer
                                  </span>
                                  <strong>
                                    {booking.customer_name || "Guest"}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Email
                                  </span>
                                  <strong>
                                    {booking.customer_email || "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Movie
                                  </span>
                                  <strong>
                                    {booking.movie_title || "—"}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Showtime
                                  </span>
                                  <strong>
                                    {formatDate(booking.start_time)}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Hall
                                  </span>
                                  <strong>
                                    {booking.hall_name || "—"}
                                    {booking.city
                                      ? ` · ${booking.city}`
                                      : ""}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Created At
                                  </span>
                                  <strong>
                                    {formatDate(booking.created_at)}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Reservation Expires
                                  </span>
                                  <strong>
                                    {formatDate(booking.expires_at)}
                                  </strong>
                                </div>

                                <div>
                                  <span className="booking-detail-label">
                                    Premiere
                                  </span>
                                  <strong>
                                    {booking.is_premiere ? "Yes" : "No"}
                                  </strong>
                                </div>
                              </div>

                              <div className="booking-seats-section">
                                <h3>
                                  Seats ({booking.seats?.length || 0})
                                </h3>

                                {booking.seats?.length > 0 ? (
                                  <div className="booking-seat-list">
                                    {booking.seats.map((seat, index) => (
                                      <div
                                        className="booking-seat-item"
                                        key={`${booking.booking_id}-${seat.row_number}-${seat.seat_number}-${index}`}
                                      >
                                        <div>
                                          <strong>{formatSeat(seat)}</strong>
                                          <span>
                                            {seat.ticket_type || "normal"}
                                          </span>
                                        </div>

                                        <div className="booking-seat-price">
                                          <strong>
                                            {formatPrice(seat.seat_price)}
                                          </strong>
                                          {seat.released_at && (
                                            <span className="booking-released-label">
                                              Released
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p>No seat information available.</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BookingsPage;
