import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMyBookings } from "../../api/bookingApi";
import "../../css/user/ProfilePage.css";

export default function ProfilePage() {
  const { user } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookings() {
      try {
        setBookingsLoading(true);
        setBookingsError("");

        const data = await getMyBookings(controller.signal);
        setBookings(data);
      } catch (error) {
        if (error.name !== "AbortError") {
          setBookingsError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBookingsLoading(false);
        }
      }
    }

    loadBookings();

    return () => controller.abort();
  }, []);

  const eTicketBookings = bookings.filter(
    (booking) =>
      booking.status === "paid" &&
      new Date(booking.start_time) > new Date()
  );

  const paidTickets = user?.paid_tickets_count || 0;
  const ticketsProgress = paidTickets % 10;
  const ticketsRemaining = 10 - ticketsProgress;
  const progressPercentage = (ticketsProgress / 10) * 100;

  return (
    <div className="profile-page">
      <div className="profile-page-header">
        <div>
          <p className="profile-eyebrow">MY RIO ACCOUNT</p>
          <h1>My Profile</h1>
          <p className="profile-subtitle">
            Manage your personal information and cinema membership.
          </p>
        </div>
      </div>

      <section className="profile-section">
        <div className="profile-section-heading">
          <div>
            <h2>Personal Information</h2>
            <p>Your account details</p>
          </div>
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span>Full Name</span>
            <strong>{user?.full_name || "Not provided"}</strong>
          </div>

          <div className="profile-info-item">
            <span>Email Address</span>
            <strong>{user?.email || "Not provided"}</strong>
          </div>

          {/* <div className="profile-info-item">
            <span>Phone Number</span>
            <strong>Not provided</strong>
          </div> */}

          <div className="profile-info-item">
            <span>Preferred Cinema</span>
            <strong>{user?.preferred_cinema || "Not provided"}</strong>
          </div>
        </div>
      </section>
      
      <section className="profile-section upcoming-booking-section">
        <div className="profile-section-heading">
          <div>
            <h2>Upcoming Booking</h2>
            <p>Your next cinema experience</p>
          </div>
        </div>

        {bookingsLoading ? (
          <p className="booking-state">Loading your bookings...</p>
        ) : bookingsError ? (
          <p className="booking-error">{bookingsError}</p>
        ) : (
          (() => {
            const upcomingBookings = bookings.filter(
              (booking) =>
                booking.status === "paid" &&
                new Date(booking.start_time) > new Date()
            );

            if (upcomingBookings.length === 0) {
              return (
                <div className="booking-empty">
                  <p>You don't have any upcoming bookings yet.</p>
                  <a href="/showtimes">Explore movies and showtimes</a>
                </div>
              );
            }

            return upcomingBookings.slice(0, 1).map((booking) => (
              <div className="upcoming-booking-card" key={booking.booking_id}>
                <img
                  className="upcoming-booking-poster"
                  src={booking.poster_url}
                  alt={booking.movie_title}
                />

                <div className="upcoming-booking-details">
                  <span className="booking-label">CONFIRMED BOOKING</span>
                  <h3>{booking.movie_title}</h3>

                  <p>
                    {new Intl.DateTimeFormat("en", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(new Date(booking.start_time))}
                  </p>

                  <p>
                    {new Intl.DateTimeFormat("en", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }).format(new Date(booking.start_time))}
                    {" · "}
                    {booking.city} · {booking.hall_name}
                  </p>

                  <p>
                    Seats:{" "}
                    {booking.seats
                      .map(
                        (seat) =>
                          `Row ${seat.row_number}, Seat ${seat.seat_number}`
                      )
                      .join(" · ")}
                  </p>

                  <strong>
                    €{Number(booking.total_amount).toFixed(2)}
                  </strong>
                </div>
              </div>
            ));
          })()
        )}
      </section>

      <section className="profile-section membership-section">
        <div className="profile-section-heading">
          <div>
            <h2>My Membership</h2>
            <p>Your RIO Cinema rewards</p>
          </div>
        </div>

        <div className="membership-card">
          <div className="membership-card-top">
            <div>
              <span className="membership-label">RIO REWARDS</span>
              <h3>Movie Lover</h3>
            </div>
            <span className="membership-ticket-icon">✦</span>
          </div>

          <div className="membership-progress-info">
            <span>Ticket Progress</span>
            <strong>{ticketsProgress} / 10 tickets</strong>
          </div>

          <div className="membership-progress-bar">
            <div
              className="membership-progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="membership-message">
            {ticketsRemaining === 10
              ? "Purchase your first ticket to start earning rewards!"
              : `Only ${ticketsRemaining} more ${
                  ticketsRemaining === 1 ? "ticket" : "tickets"
                } until your half-price reward!`}
          </p>
        </div>
      </section>

      <section className="profile-section etickets-section">
        <div className="profile-section-heading">
          <div>
            <h2>My E-Tickets</h2>
            <p>Your confirmed cinema tickets</p>
          </div>
          <span className="eticket-count">
            {eTicketBookings.reduce(
              (total, booking) => total + booking.seats.length,
              0
            )} tickets
          </span>
        </div>

        {bookingsLoading ? (
          <p className="booking-state">Loading your tickets...</p>
        ) : bookingsError ? (
          <p className="booking-error">{bookingsError}</p>
        ) : eTicketBookings.length === 0 ? (
          <div className="booking-empty">
            <p>You don't have any upcoming e-tickets.</p>
            <a href="/showtimes">Book your next movie</a>
          </div>
        ) : (
          <div className="eticket-list">
            {eTicketBookings.map((booking) => (
              <div className="eticket-card" key={booking.booking_id}>
                <div className="eticket-card-header">
                  <span>RIO CINEMA · E-TICKET</span>
                  <strong>#{booking.booking_id}</strong>
                </div>

                <div className="eticket-card-body">
                  <div>
                    <h3>{booking.movie_title}</h3>
                    <p>
                      {new Date(booking.start_time).toLocaleString("en-FI", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p>
                      {booking.city} · {booking.hall_name}
                    </p>
                  </div>

                  <div className="eticket-seats">
                    <span>YOUR SEATS</span>
                    <strong>
                      {booking.seats
                        .map(
                          (seat) =>
                            `${seat.row_number}-${seat.seat_number}`
                        )
                        .join(", ")}
                    </strong>
                  </div>
                </div>

                <div className="eticket-card-footer">
                  <span>PAID</span>
                  <strong>
                    €{Number(booking.total_amount).toFixed(2)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


    </div>
  );
}
