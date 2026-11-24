import { useCallback, useEffect, useState } from "react";
import {
  getAdminGroupBookingRequests,
  approveGroupBookingRequest,
  rejectGroupBookingRequest,
} from "../../api/groupBookingApi";

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const TICKET_TYPE_LABELS = {
  normal: "Normal",
  child_under_12: "Child",
  wheelchair: "Wheelchair",
  loyalty_10th: "Loyalty 10th",
};

function summarizeTickets(seats) {
  const counts = seats.reduce((acc, seat) => {
    const label = TICKET_TYPE_LABELS[seat.ticket_type] || seat.ticket_type;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const breakdown = Object.entries(counts)
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");

  return `${seats.length} tickets (${breakdown})`;
}

function groupSeatsByRow(seats) {
  const map = new Map();
  seats.forEach((seat) => {
    if (!map.has(seat.row_number)) {
      map.set(seat.row_number, []);
    }
    map.get(seat.row_number).push({
      number: seat.seat_number,
      type: seat.ticket_type,
    });
  });

  return Array.from(map.entries()).map(([row, rowSeats]) => ({
    row,
    seats: rowSeats,
  }));
}

export default function AdminGroupBookingRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  const loadRequests = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const result = await getAdminGroupBookingRequests(signal);
      setRequests(result);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Unable to load Group Booking requests.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadRequests(controller.signal);

    return () => controller.abort();
  }, [loadRequests]);

  async function handleApprove(request) {
    const confirmed = window.confirm(
      `Approve Group Booking request #${request.id} for ${request.seats.length} tickets?\n\nThe system will recheck seat availability, ticket prices and Loyalty eligibility.`
    );

    if (!confirmed) return;

    const note = window.prompt("Optional approval note:", "") || "";

    setProcessingId(request.id);
    setError("");
    setMessage("");

    try {
      const result = await approveGroupBookingRequest(
        request.id,
        note
      );

      setMessage(
        `Request #${request.id} approved. Booking #${result.booking.id} has been created.`
      );

      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to approve this request.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(request) {
    const confirmed = window.confirm(
      `Reject Group Booking request #${request.id}?`
    );

    if (!confirmed) return;

    const note = window.prompt("Reason for rejection:", "") || "";

    setProcessingId(request.id);
    setError("");
    setMessage("");

    try {
      await rejectGroupBookingRequest(request.id, note);

      setMessage(`Request #${request.id} rejected.`);

      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to reject this request.");
    } finally {
      setProcessingId(null);
    }
  }

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  function toggleExpand(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <section className="booking-list-section">
      <div className="booking-list-header">
        <div>
          <h2>Group Booking Requests</h2>
          <p>
            {pendingCount} pending request(s) · {requests.length} total
          </p>
        </div>

        <button
          type="button"
          className="booking-refresh-button"
          onClick={() => loadRequests()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="booking-alert booking-alert-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="booking-alert booking-alert-success" role="status">
          {message}
        </div>
      )}

      {loading && requests.length === 0 ? (
        <p className="booking-state-message">
          Loading Group Booking requests...
        </p>
      ) : requests.length === 0 ? (
        <p className="booking-state-message">
          No Group Booking requests found.
        </p>
      ) : (
        <div className="booking-table-wrapper">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Customer</th>
                <th>Movie / Showtime</th>
                <th>Seats / Ticket Types</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => {
                const isProcessing = processingId === request.id;

                return (
                  <tr key={request.id}>
                    <td>
                      <strong>#{request.id}</strong>
                      <span className="booking-secondary-text">
                        {formatDate(request.created_at)}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {request.customer_name || "Customer"}
                      </strong>
                      <span className="booking-secondary-text">
                        {request.customer_email}
                      </span>
                    </td>

                    <td>
                      <strong>{request.movie_title}</strong>
                      <span className="booking-secondary-text">
                        {formatDate(request.start_time)}
                      </span>
                      <span className="booking-secondary-text">
                        {request.city} · {request.hall_name}
                      </span>
                    </td>

                    <td>
                      <strong>{summarizeTickets(request.seats)}</strong>

                      <div className="seat-row-groups">
                        {(() => {
                          const grouped = groupSeatsByRow(request.seats);
                          const isExpanded = expandedIds.has(request.id);
                          const visibleGroups = isExpanded ? grouped : grouped.slice(0, 2);

                          return (
                            <>
                              {visibleGroups.map((group) => (
                                <div className="seat-group-line" key={`${request.id}-row-${group.row}`}>
                                  <span className="seat-group-row-label">Row {group.row}:</span>
                                  <div className="seat-pill-list">
                                    {group.seats.map((s) => (
                                      <span
                                        key={s.number}
                                        className={`seat-pill ${s.type !== "normal" ? "seat-pill-special" : ""}`}
                                        title={TICKET_TYPE_LABELS[s.type] || s.type}
                                      >
                                        #{s.number}
                                        {s.type !== "normal" && (
                                          <small> · {TICKET_TYPE_LABELS[s.type]}</small>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {grouped.length > 2 && (
                                <button
                                  type="button"
                                  className="seat-expand-btn"
                                  onClick={() => toggleExpand(request.id)}
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : `+${grouped.length - 2} more rows (${request.seats.length} total)`}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`booking-status-badge booking-status-${request.status}`}
                      >
                        {request.status}
                      </span>

                      {request.booking_id && (
                        <span className="booking-secondary-text">
                          Booking #{request.booking_id}
                        </span>
                      )}
                    </td>

                    <td>
                      {request.status === "pending" ? (
                        <div className="booking-row-actions">
                          <button
                            type="button"
                            className="booking-payment-button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(request)}
                          >
                            {isProcessing ? "Processing..." : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="booking-details-button"
                            disabled={isProcessing}
                            onClick={() => handleReject(request)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="booking-secondary-text">
                          Reviewed: {formatDate(request.reviewed_at)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}