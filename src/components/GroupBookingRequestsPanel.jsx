import { useEffect, useState } from "react";
import { getMyGroupBookingRequests } from "../api/groupBookingApi";
import "../css/user/GroupBookingRequests.css";

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-FI", {
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

export default function GroupBookingRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    getMyGroupBookingRequests(controller.signal)
      .then(setRequests)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return <p className="booking-state">Loading group requests...</p>;
  }

  return (
    <section className="group-requests-panel">
      <div className="group-requests-heading">
        <div>
          <p className="profile-eyebrow">SPECIAL BOOKINGS</p>
          <h2>Group Booking Requests</h2>
          <p>
            Requests for more than 6 tickets require Staff/Admin approval.
          </p>
        </div>
      </div>

      {error && <p className="booking-error">{error}</p>}

      {!error && requests.length === 0 && (
        <p className="booking-empty">
          You have not submitted any Group Booking requests.
        </p>
      )}

      {requests.map((request) => (
        <article className="group-request-card" key={request.id}>
          <div className="group-request-card-header">
            <strong>Request #{request.id}</strong>

            <span className={`group-request-status status-${request.status}`}>
              {request.status.toUpperCase()}
            </span>
          </div>

          <h3>{request.movie_title}</h3>

          <p>
            {request.city} · {request.hall_name}
          </p>

          <p>{formatDate(request.start_time)}</p>

          <div className="group-request-seats-box">
            <p className="group-request-seats-summary">
              <strong>{summarizeTickets(request.seats)}</strong>
            </p>

            <div className="seat-row-groups">
              {groupSeatsByRow(request.seats).map((group) => (
                <div className="seat-group-line" key={group.row}>
                  <span className="seat-group-row-label">Row {group.row}</span>
                  <div className="seat-pill-list">
                    {group.seats.map((s) => (
                      <span
                        key={s.number}
                        className={`seat-pill ${s.type !== "normal" ? "seat-pill-special" : ""}`}
                      >
                        Seat {s.number}
                        {s.type !== "normal" && (
                          <small> ({TICKET_TYPE_LABELS[s.type]})</small>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p>
            Submitted: {formatDate(request.created_at)}
          </p>

          {request.status === "pending" && (
            <p>
              Your request is waiting for Staff/Admin review. Seats are not
              reserved yet.
            </p>
          )}

          {request.status === "approved" && (
            <p>
              Your request was approved.{" "}
              {request.booking_id
                ? `Your booking reference is RIO-${request.booking_id}.`
                : ""}
              {" "}You can find the booking in your orders and pay before its
              payment deadline.
            </p>
          )}

          {request.status === "rejected" && (
            <p>
              This request was not approved.
              {request.approval_note
                ? ` Staff note: ${request.approval_note}`
                : ""}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}