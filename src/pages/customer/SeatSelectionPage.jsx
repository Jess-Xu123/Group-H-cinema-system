import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BookingProgress from "../../components/BookingProgress";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import { getShowtimeSeats, joinShowtimeWaitlist } from "../../api/cinemaApi";
import { useAuth } from "../../context/AuthContext";
import { createGroupBookingRequest } from "../../api/groupBookingApi";
import "../../css/Showtimes.css";
import "../../css/BookingPanels.css";
import "../../css/SeatSelection.css";
import "../../css/BookingFlow.css";

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

// time for opening door and ad info
function formatOffsetTime(value, offsetMinutes) {
  const date = new Date(new Date(value).getTime() + offsetMinutes * 60 * 1000);
  return formatTime(date);
}

// Unique seat key
function seatKey(row, seat) {
  return `${row}-${seat}`;
}

function getSeatNumbers(row, seatsPerRow) {
  const firstSeat = row === 1 ? 1 : row === 2 ? 11 : (row - 1) * 10 + 2;
  const lastSeat = row === 1 ? seatsPerRow : row * 10 + 1;
  const numbers = Array.from(
    { length: lastSeat - firstSeat + 1 },
    (_, index) => firstSeat + index,
  ).filter((number) => number !== 13);

  return row % 2 === 0 ? numbers.reverse() : numbers;
}

export default function SeatSelectionPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
  const { state: navigationState } = useLocation();
  const [currentLocation, setCurrentLocation] = useState("Oulu");
  const [screening, setScreening] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadedShowtimeId, setLoadedShowtimeId] = useState(null);
  const [error, setError] = useState(null);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false); 
  const [waitlistStatus, setWaitlistStatus] = useState(null); 
  const [seatLimitNotice, setSeatLimitNotice] = useState("");
  const isLoading = loadedShowtimeId !== showtimeId;
  const currentError = error?.showtimeId === showtimeId ? error.message : "";

  const { user } = useAuth();

  const [groupRequestLoading, setGroupRequestLoading] = useState(false);
  const [groupRequestMessage, setGroupRequestMessage] = useState("");
  const [groupRequestError, setGroupRequestError] = useState("");

  //Call getShowtimeSeats to get screenings, booked seats, selected seats
  useEffect(() => {
    const controller = new AbortController();

    getShowtimeSeats(showtimeId, controller.signal)
      .then(({ screening: result, bookedSeats: unavailable }) => {
        if (controller.signal.aborted) return;
        setScreening(result);
        setCurrentLocation(result.city);
        setBookedSeats(unavailable);
        setSelectedSeats(
          String(navigationState?.screening?.showtime_id) === showtimeId
            ? navigationState.selectedSeats || []
            : [],
        );
        setError(null);
        setLoadedShowtimeId(showtimeId);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError({ showtimeId, message: requestError.message });
          setLoadedShowtimeId(showtimeId);
        }
      });

    return () => controller.abort();
  }, [navigationState, showtimeId]);

  //useMemo indexing booked seats and selected seats
  const occupiedKeys = useMemo(
    () =>
      new Set(
        bookedSeats.map((seat) =>
          seatKey(Number(seat.row_number), Number(seat.seat_number)),
        ),
      ),
    [bookedSeats],
  );
  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedSeats.map((seat) =>
          seatKey(seat.row, seat.position ?? seat.number),
        ),
      ),
    [selectedSeats],
  );

  const strandedGapKeys = useMemo(() => {
  const gaps = new Set();
  if (!screening || selectedSeats.length === 0 ) return gaps;

  const seatsPerRow = Number(screening.seats_per_row) || 10;
  const isTaken = (row, pos) =>
    pos < 1 ||
    pos > seatsPerRow ||
    occupiedKeys.has(seatKey(row, pos)) ||
    selectedKeys.has(seatKey(row, pos)) ||
    (row === 1 && pos === 1);

    const activeRows = new Set(selectedSeats.map((seat) => seat.row));

  activeRows.forEach((row) => {
    for (let pos = 1; pos <= seatsPerRow; pos++) {
      if (isTaken(row, pos)) continue;

      const leftBlocked = isTaken(row, pos - 1)
      const rightBlocked = isTaken(row, pos + 1)
      const touchesSelection =
        selectedKeys.has(seatKey(row, pos - 1)) ||
        selectedKeys.has(seatKey(row, pos + 1))

      if (leftBlocked && rightBlocked && touchesSelection) {
        gaps.add(seatKey(row, pos));
      }
    }
  });

  return gaps;
}, [screening, selectedSeats, occupiedKeys, selectedKeys]);

  const total = screening
    ? Number(screening.base_price) * selectedSeats.length
    : 0;

  function toggleSeat(row, position, number) {
    const key = seatKey(row, position);
    // Keep the reserved accessibility seat unavailable.
    if (occupiedKeys.has(key) || (row === 1 && position === 1)) return;

    const alreadySelected = selectedKeys.has(key);
    if (!alreadySelected && selectedSeats.length >= 50) {
      setSeatLimitNotice("Maximum 50 tickets per group request.");
      return;
    }
    setSeatLimitNotice("");

    setSelectedSeats((current) =>
      current.some(
        (seat) => seatKey(seat.row, seat.position ?? seat.number) === key,
      )
        ? current.filter(
            (seat) => seatKey(seat.row, seat.position ?? seat.number) !== key,
          )
        : [...current, { row, number, position }],
    );
  }

  function continueToCheckout() {
    navigate("/checkout", {
      state: {
        screening,
        selectedSeats,
        total,
      },
    });
  }

  async function handleGroupBookingRequest() {
    if (!user) {
      setGroupRequestError(
        "Please log in before submitting a Group Booking request."
      );
      return;
    }

    if (selectedSeats.length <= 6) {
      setGroupRequestError(
        "A Group Booking request requires more than 6 tickets."
      );
      return;
    }

    setGroupRequestLoading(true);
    setGroupRequestError("");
    setGroupRequestMessage("");

    try {
      const result = await createGroupBookingRequest({
        showtime_id: screening.showtime_id,
        seats: selectedSeats.map((seat) => ({
          row_number: seat.row,
          seat_number: seat.number,
          ticket_type: seat.ticket_type || "normal",
        })),
      });

      setGroupRequestMessage(
        `${result.message} Your request reference is #${result.request.id}.`
      );
    } catch (requestError) {
      setGroupRequestError(
        requestError.message || "Unable to submit your request."
      );
    } finally {
      setGroupRequestLoading(false);
    }
  }

  const hasOpenSeat = screening
    ? Array.from({ length: Number(screening.total_rows) }, (_, i) => i + 1)
        .filter((row) => row !== 13)
        .some((row) =>
          getSeatNumbers(row, Number(screening.seats_per_row)).some((_, idx) => {
            const pos = idx + 1;
            return !occupiedKeys.has(seatKey(row, pos)) && !(row === 1 && pos === 1);
          }),
        )
    : true;
  const isSoldOut = Boolean(screening && !hasOpenSeat);

  async function handleJoinWaitlist(event) {
    event.preventDefault();
    setWaitlistLoading(true);
    setWaitlistStatus(null);
    try {
      const result = await joinShowtimeWaitlist(showtimeId, waitlistEmail); 
      setWaitlistStatus({ type: "success", text: result.message });
      setWaitlistEmail("");
    } catch (err) {
      setWaitlistStatus({ type: "error", text: err.message });
    } finally {
      setWaitlistLoading(false); 
    }
  }

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
      />
      <main className="seat-selection-page rio-container">
        <div className="booking-flow-topbar">
          <Link className="booking-back-link" to="/showtimes">
            ← Back to screening
          </Link>
          <BookingProgress activeStep={2} />
        </div>

        {isLoading && (
          <p className="showtimes-feedback" role="status">
            Loading seat map…
          </p>
        )}
        {currentError && (
          <p className="showtimes-feedback showtimes-error" role="alert">
            {currentError}
          </p>
        )}

        {screening && !isLoading && !currentError && (
          <>
            <header className="booking-flow-heading">
              <div>
                <p className="cinema-eyebrow">MAKE YOURSELF COMFORTABLE</p>
                <h1>Find your favourite seats.</h1>
                <p className="booking-flow-movie-title">
                  {screening.movie_title}
                </p>
              </div>
              <p className="booking-flow-screening-meta">
                {screening.city} ·{" "}
                {screening.start_time &&
                  new Intl.DateTimeFormat("en", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(screening.start_time))}
                {" · "}
                {formatTime(screening.start_time)} · {screening.hall_name}
                <br />
                Door opens at {formatOffsetTime(screening.start_time, -35)} ·
                Ads {formatOffsetTime(screening.start_time, -20)}
              </p>
            </header>

            <div className="seat-selection-layout">
              <section
                className="seat-map-panel booking-seat-panel"
                aria-label="Seat selection"
              >
                <div className="booking-seat-heading">
                  <span>Choose your seats</span>
                  <span className="booking-seat-hint">
                    Select available seats below
                  </span>
                </div>
                <p className="seat-screen-label">SCREEN · FRONT</p>
                <div className="seat-screen" aria-hidden="true" />
                {Number(screening.wheelchair_limit) > 0 && (
                  <div className="booking-accessibility">
                    Accessibility area · {screening.wheelchair_limit} wheelchair
                    spaces
                  </div>
                )}
                <div className="seat-legend" aria-label="Seat status legend">
                  <span>
                    <i className="seat-legend-available" /> Available
                  </span>
                  <span>
                    <i className="seat-legend-selected" /> Selected
                  </span>
                  <span>
                    <i className="seat-legend-occupied" /> Unavailable
                  </span>
                </div>
                <div className="seat-grid">
                  {Array.from(
                    { length: Number(screening.total_rows) },
                    (_, index) => index + 1,
                  )
                    .filter((row) => row !== 13)
                    .map((row) => (
                      <div className="seat-row" key={row}>
                        <span className="seat-row-label">{row}</span>
                        {getSeatNumbers(
                          row,
                          Number(screening.seats_per_row),
                        ).map((number, index) => {
                          const position = index + 1;
                          const key = seatKey(row, position);
                          const isBooked = occupiedKeys.has(key);
                          const isReservedSeat = row === 1 && position === 1;
                          const isSelected = selectedKeys.has(key);
                          const unavailable = isBooked || isReservedSeat;
                          const isStrandedGap = strandedGapKeys.has(key)
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`seat ${
                                isSelected
                                  ? "is-selected"
                                  : unavailable
                                    ? "is-unavailable"
                                    : isStrandedGap ? "seat-gap-warning" : ""
                              }`}
                              disabled={unavailable}
                              aria-pressed={isSelected}
                              aria-label={`Row ${row}, seat ${number}${
                                isBooked
                                  ? ", booked"
                                  : isReservedSeat
                                    ? ", reserved"
                                    : isSelected
                                      ? ", selected"
                                      : ", available"
                              }`}
                              onClick={() => toggleSeat(row, position, number)}
                            >
                              {number}
                            </button>
                          );
                        })}
                        <span className="seat-row-label">{row}</span>
                      </div>
                    ))}
                </div>
                <div className="booking-seat-entrances">
                  <span>← Rear entrance</span>
                  <span>Rear entrance →</span>
                </div>
              </section>

              {/* Movie summary section */}
              <aside className="seat-order-panel booking-order-panel">
                <h2>Your evening at Rio</h2>
                <div className="booking-order-movie">
                  {screening.poster_url && (
                    <img src={screening.poster_url} alt="" />
                  )}
                  <div>
                    <h3>{screening.movie_title}</h3>
                    <p>
                      {screening.city} · {screening.hall_name}
                    </p>
                    <p>
                      {new Intl.DateTimeFormat("en", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(screening.start_time))}{" "}
                      · {formatTime(screening.start_time)}
                    </p>
                  </div>
                </div>
                <div className="seat-order-divider" />
                {seatLimitNotice && (
                <p className="showtimes-feedback showtimes-error" role="alert">
                    {seatLimitNotice}
                  </p>
                )}
                <p className="seat-order-count">
                  {selectedSeats.length}{" "}
                  {selectedSeats.length === 1 ? "ticket" : "tickets"}
                </p>
                {selectedSeats.map((seat) => (
                  <div
                    className="checkout-ticket-item"
                    key={seatKey(seat.row, seat.number)}
                  >
                    <div className="checkout-ticket-heading">
                      <strong>
                        Row {seat.row} · Seat {seat.number}
                      </strong>

                      {selectedSeats.length <= 6 && (
                        <span>€{Number(screening.base_price).toFixed(2)}</span>
                      )}
                    </div>

                    {selectedSeats.length > 6 && (
                      <label className="checkout-ticket-label">
                        Ticket type

                        <select
                          value={seat.ticket_type || "normal"}
                          onChange={(event) => {
                            const ticketType = event.target.value;

                            setSelectedSeats((current) =>
                              current.map((item) =>
                                seatKey(item.row, item.number) ===
                                seatKey(seat.row, seat.number)
                                  ? { ...item, ticket_type: ticketType }
                                  : item
                              )
                            );
                          }}
                        >
                          <option value="normal">Standard — full price</option>
                          <option value="child_under_12">Child under 12 — discounted</option>
                          <option value="wheelchair">Wheelchair — full price</option>

                          {user && (
                            <option value="loyalty_10th">
                              10th ticket reward — subject to approval
                            </option>
                          )}
                        </select>
                      </label>
                    )}
                  </div>
                ))}
                {selectedSeats.length === 0 && (
                  <p className="booking-order-empty">
                    Choose a seat to see it in your order.
                  </p>
                )}
                <div className="seat-order-total">
                  <span>Total</span>
                  <strong>€ {total.toFixed(2)}</strong>
                </div>
                {selectedSeats.length > 0 && selectedSeats.length <= 6 && (
                  <button
                    className="movie-select-seats"
                    type="button"
                    onClick={continueToCheckout}
                  >
                    Continue to checkout <span aria-hidden="true">→</span>
                  </button>
                )}

                {selectedSeats.length > 6 && (
                  <>
                    <p className="booking-order-guidance">
                      Group bookings require Staff/Admin approval. Your seats will not
                      be held until your request is approved.
                    </p>

                    {!user && (
                      <p className="showtimes-feedback">
                        Please log in before submitting a Group Booking request.
                      </p>
                    )}

                    <button
                      className="movie-select-seats"
                      type="button"
                      disabled={!user || groupRequestLoading}
                      onClick={handleGroupBookingRequest}
                    >
                      {groupRequestLoading
                        ? "Submitting request..."
                        : "Submit Group Booking Request"}
                    </button>
                  </>
                )}

                {groupRequestError && (
                  <p className="showtimes-feedback showtimes-error" role="alert">
                    {groupRequestError}
                  </p>
                )}

                {groupRequestMessage && (
                  <p className="booking-success-message" role="status">
                    {groupRequestMessage}
                  </p>
                )}

                {isSoldOut && (
                  <div className="waitlist-box" style={{ marginTop: "1rem" }}>
                    <h3>Screening Full — Join Waitlist</h3>
                    <p>Enter your email to get an alert if a seat opens up.</p>
                    <form onSubmit={handleJoinWaitlist}>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                      />
                      <button
                        className="movie-select-seats"
                        type="submit"
                        disabled={waitlistLoading}
                      >
                        {waitlistLoading ? "Joining..." : "Join Waitlist"}
                      </button>
                    </form>
                    {waitlistStatus && (
                      <p role="status">{waitlistStatus.text}</p>
                    )}
                  </div>
                )}
                

                {/* Reminder in the summary section */}
                <div className="booking-order-guidance">
                  {selectedSeats.length > 0 ? (
                    <p>
                      Two seats together: Row {selectedSeats[0]?.row} seats{" "}
                      {selectedSeats.map((s) => s.number).join(" & ")}. You can
                      review your tickets before payment. {selectedSeats.length}
                      /6 tickets selected for this booking.
                    </p>
                  ) : (
                    <p>
                      Select seats in the map. Your ticket count and total
                      update here before checkout.
                    </p>
                  )}

                  <p className="booking-order-terms">
                    No account needed to purchase. Seats are held for up to 15
                    minutes during payment.
                    <br />
                    Reserve &amp; pay later: login required. Claim your tickets
                    2 hours before the movie starts, or the reservation is
                    released. Unpaid reservations can be cancelled.
                    <br />
                    If a show is full, join the waiting list for availability
                    alerts.
                  </p>
                </div>
              </aside>
            </div>
            <p className="booking-seat-instructions">
              Click any available seat to select or deselect it. Booked seats
              are unavailable.
            </p>
          </>
        )}
      </main>
      <Footer compact />
    </div>
  );
}
