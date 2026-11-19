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

          <p>
            {request.seats.length} tickets ·{" "}
            {request.seats
              .map(
                (seat) =>
                  `Row ${seat.row_number}, Seat ${seat.seat_number} (${seat.ticket_type})`
              )
              .join("; ")}
          </p>

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