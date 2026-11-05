import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getShowtimeSeats } from "../api/cinemaApi";
import "../css/Showtimes.css";

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

export default function SeatSelectionPage() {
  const { showtimeId } = useParams();
  const navigate = useNavigate();
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
        setSelectedSeats([]);
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
  }, [showtimeId]);

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
    () => new Set(selectedSeats.map((seat) => seatKey(seat.row, seat.number))),
    [selectedSeats],
  );
  const total = screening
    ? Number(screening.base_price) * selectedSeats.length
    : 0;

  function toggleSeat(row, number) {
    const key = seatKey(row, number);
    // Seat 1 is not selectable
    if (occupiedKeys.has(key) || (row === 1 && number === 1)) return;

    // toddle selection status
    setSelectedSeats((current) =>
      current.some((seat) => seatKey(seat.row, seat.number) === key)
        ? current.filter((seat) => seatKey(seat.row, seat.number) !== key)
        : [...current, { row, number }],
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
        <Link className="showtimes-details-link" to="/showtimes">
          ← Back to showtimes
        </Link>
        <p className="cinema-eyebrow">MAKE YOURSELF COMFORTABLE</p>
        <h1>Find your favourite seats.</h1>

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
          <div className="seat-selection-layout">
            <section className="seat-map-panel" aria-label="Seat selection">
              <p className="seat-screen-label">SCREEN · FRONT</p>
              <div className="seat-screen" aria-hidden="true" />
              <div className="seat-legend">
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
              {/*Rendering a grid for seats */}
              <div className="seat-grid">
                {Array.from(
                  { length: Number(screening.total_rows) },
                  (_, index) => index + 1,
                )
                  .filter((row) => row !== 13)
                  .map((row) => (
                    <div className="seat-row" key={row}>
                      <span className="seat-row-label">{row}</span>
                      {Array.from(
                        { length: Number(screening.seats_per_row) },
                        (_, index) => index + 1,
                      ).map((number) => {
                        const key = seatKey(row, number);
                        const isBooked = occupiedKeys.has(key);
                        const isReservedSeat = row === 1 && number === 1;
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
                              isBooked ? ", unavailable" : ""
                            }${isReservedSeat ? ", reserved" : ""}`}
                            onClick={() => toggleSeat(row, number)}
                          >
                            {number}
                          </button>
                        );
                      })}
                      <span className="seat-row-label">{row}</span>
                    </div>
                  ))}
              </div>
            </section>

            <aside className="seat-order-panel">
              <h2>Your screening</h2>
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

              <div className="seat-order-divider" />
              <p className="seat-order-count">
                {selectedSeats.length}{" "}
                {selectedSeats.length === 1 ? "seat" : "seats"} selected
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
              <div className="seat-order-total">
                <span>Total</span>
                <strong>€{total.toFixed(2)}</strong>
              </div>
              <button
                className="movie-select-seats"
                type="button"
                disabled={selectedSeats.length === 0}
                onClick={continueToCheckout}
              >
                Continue to checkout <span aria-hidden="true">→</span>
              </button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
