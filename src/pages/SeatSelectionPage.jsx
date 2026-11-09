import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BookingProgress from "../components/BookingProgress";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getShowtimeSeats } from "../api/cinemaApi";
import "../css/Showtimes.css";
import "../css/BookingPanels.css";
import "../css/SeatSelection.css";
import "../css/BookingFlow.css";

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
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
  const isLoading = loadedShowtimeId !== showtimeId;
  const currentError = error?.showtimeId === showtimeId ? error.message : "";

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
  const total = screening
    ? Number(screening.base_price) * selectedSeats.length
    : 0;

  function toggleSeat(row, position, number) {
    const key = seatKey(row, position);
    // Keep the reserved accessibility seat unavailable.
    if (occupiedKeys.has(key) || (row === 1 && position === 1)) return;

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

                          return (
                            <button
                              key={key}
                              type="button"
                              className={`seat ${
                                isSelected
                                  ? "is-selected"
                                  : unavailable
                                    ? "is-unavailable"
                                    : ""
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
                <p className="seat-order-count">
                  {selectedSeats.length}{" "}
                  {selectedSeats.length === 1 ? "ticket" : "tickets"}
                </p>
                {selectedSeats.map((seat) => (
                  <p
                    className="seat-order-item"
                    key={seatKey(seat.row, seat.number)}
                  >
                    Row {seat.row} · Seat {seat.number}
                    <span>€{Number(screening.base_price).toFixed(2)}</span>
                  </p>
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
                <button
                  className="movie-select-seats"
                  type="button"
                  disabled={selectedSeats.length === 0}
                  onClick={continueToCheckout}
                >
                  Continue to checkout <span aria-hidden="true">→</span>
                </button>

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
                    Reserve &amp; pay later: login required. Claim by 16:00 for
                    this 18:00 show, or the reservation is released. Unpaid
                    reservations can be cancelled.
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
