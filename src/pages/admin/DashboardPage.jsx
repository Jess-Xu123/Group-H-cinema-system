import { useEffect, useState } from "react";
import {
  getDashboardAlerts,
  getTodayProgramme,
  getRoomOccupancy,
} from "../../api/authApi";
import "../../css/admin/AdminDashboard.css";
import {
  fetchAdminWaitlist,
  notifyAdminWaitlistEntry,
  assignAdminWaitlistSeat,
  removeAdminWaitlistEntry,
} from "../../api/cinemaApi";

const overviewItems = (unpaidReservations, confirmedTickets, ticketSales, roomOccupancy) => [
  {
    title: "Ticket Sales",
    value: `€${Number(ticketSales).toFixed(2)}`,
    description: "Confirmed ticket revenue today",
    icon: "bi bi-currency-euro",
  },
  {
    title: "Confirmed Tickets",
    value: confirmedTickets,
    description: "Across today's confirmed screenings",
    icon: "bi bi-ticket-perforated",
  },
  {
    title: "Room Occupancy",
    value: `${Number(roomOccupancy).toFixed(2)}%`,
    description: "Booked seats / total capacity",
    icon: "bi bi-bar-chart",
  },
  {
    title: "Unpaid Reservations",
    value: unpaidReservations,
    description: "Awaiting payment",
    icon: "bi bi-clock-history",
  },
];

function formatScreeningStart(value) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (isSameDay(date, now)) {
    return `Today · ${timeStr}`;
  }
  if (isSameDay(date, tomorrow)) {
    return `Tomorrow · ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return `${dateStr} · ${timeStr}`;
}


function DashboardPage() {
  const [alerts, setAlerts] = useState({
    unpaidReservations: "—",
    upcomingScreenings: "—",
    confirmedTickets: "—",
    ticketSales: "—",
    roomOccupancy: "—",
  });

  const [alertsError, setAlertsError] = useState("");

  const [programme, setProgramme] = useState([]);
  const [programmeError, setProgrammeError] = useState("");
  const [programmeLoading, setProgrammeLoading] = useState(true);

  const [rooms, setRooms] = useState([]);
  const [roomsError, setRoomsError] = useState("");
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [waitlist, setWaitlist] = useState([]);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [waitlistActionId, setWaitlistActionId] = useState(null);
  const [waitlistMessage, setWaitlistMessage] = useState("");

    useEffect(() => {
      async function fetchAlerts() {
        try {
          const data = await getDashboardAlerts();

        setAlerts({
          unpaidReservations: data.unpaidReservations,
          upcomingScreenings: data.upcomingScreenings,
          confirmedTickets: data.confirmedTickets,
          ticketSales: data.ticketSales,
          roomOccupancy: data.roomOccupancy,
        });
        } catch (error) {
          setAlertsError(error.message);
        }
      }

      fetchAlerts();
    }, []);

    useEffect(() => {
      async function fetchProgramme() {
        try {
          const data = await getTodayProgramme();
          setProgramme(data.screenings);
        } catch (error) {
          setProgrammeError(error.message);
        } finally {
          setProgrammeLoading(false);
        }
      }

      fetchProgramme();
    }, []);

    useEffect(() => {
      async function fetchRooms() {
        try {
          const data = await getRoomOccupancy();
          setRooms(data.rooms);
        } catch (error) {
          setRoomsError(error.message);
        } finally {
          setRoomsLoading(false);
        }
      }

      fetchRooms();
    }, []);

    useEffect(() => {
      async function loadWaitlist() {
        try {
          const data = await fetchAdminWaitlist();
          setWaitlist(Array.isArray(data) ? data : data?.waitlist || []);
        } catch (error) {
          setWaitlistMessage(error.message);
        } finally {
          setWaitlistLoading(false);
        }
      }

      loadWaitlist();
    }, []);


    async function handleNotifyWaitlist(waitlistId) {
      setWaitlistActionId(waitlistId);
      setWaitlistMessage("");
      try {
        const result = await notifyAdminWaitlistEntry(waitlistId);
        setWaitlist((prev) =>
          prev.map((item) =>
            item.id === waitlistId ? { ...item, is_notified: true } : item
          )
        );
        setWaitlistMessage(result?.message || "Customer notified.");
      } catch (error) {
        setWaitlistMessage(error.message);
      } finally {
        setWaitlistActionId(null);
      }
    }

    async function handleAssignWaitlistSeat(waitlistId) {
      setWaitlistActionId(waitlistId);
      setWaitlistMessage("");
      try {
        const result = await assignAdminWaitlistSeat(waitlistId);
        setWaitlist((prev) => prev.filter((item) => item.id !== waitlistId));
        setWaitlistMessage(
          result?.message || "Seat assigned and customer notified."
        );
      } catch (error) {
        setWaitlistMessage(error.message);
      } finally {
        setWaitlistActionId(null);
      }
    }

    async function handleRemoveWaitlist(waitlistId) {
      setWaitlistActionId(waitlistId);
      setWaitlistMessage("");
      try {
        const result = await removeAdminWaitlistEntry(waitlistId);
        setWaitlist((prev) => prev.filter((item) => item.id !== waitlistId));
        setWaitlistMessage(result?.message || "Removed from waiting list.");
      } catch (error) {
        setWaitlistMessage(error.message);
      } finally {
        setWaitlistActionId(null);
      }
    }

  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <h1>A good day for great stories.</h1>
          <p>Your cinemas at a glance.</p>
        </div>
      </div>

      <section className="dashboard-overview">
        {overviewItems(
          alerts.unpaidReservations, 
          alerts.confirmedTickets,
          alerts.ticketSales,
          alerts.roomOccupancy
        ).map((item) => (
          <div className="dashboard-stat-card" key={item.title}>
            <div className="dashboard-stat-info">
              <span>{item.title}</span>
              <h2>{item.value}</h2>
              <p>{item.description}</p>
            </div>

            <div className="dashboard-stat-icon">
              <i className={item.icon}></i>
            </div>
          </div>
        ))}
      </section>
      
      <section className="dashboard-programme">
        <div className="dashboard-section-header">
            <div>
            <h2>Upcoming Movies</h2>
            <p>Published screenings and ticket sales</p>
            </div>

            <span className="dashboard-date-label">
              Next 7 days
            </span>
        </div>

        <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
            <thead>
                <tr>
                <th>Start</th>
                <th>Film</th>
                <th>Cinema / Room</th>
                <th>Sold</th>
                <th>Sales</th>
                </tr>
            </thead>

            <tbody>
              {programmeLoading ? (
                <tr>
                  <td colSpan="5" className="dashboard-empty">
                    Loading today's screenings...
                  </td>
                </tr>
              ) : programmeError ? (
                <tr>
                  <td colSpan="5" className="dashboard-empty">
                    {programmeError}
                  </td>
                </tr>
              ) : programme.length === 0 ? (
                <tr>
                  <td colSpan="5" className="dashboard-empty">
                    No screening data available yet.
                  </td>
                </tr>
              ) : (
                  programme.map((screening) => (
                  <tr key={screening.showtime_id}>
                    <td>
                      <strong>{formatScreeningStart(screening.start_time)}</strong>
                    </td>
                    <td>{screening.movie_title}</td>
                    <td>
                      {screening.cinema_city} / {screening.room_name}
                    </td>
                    <td>{screening.sold}</td>
                    <td>€{Number(screening.revenue).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
        </div>

        <div className="dashboard-programme-footer">
            <span>Screening information will be updated automatically.</span>

            <button
            type="button"
            className="dashboard-manage-button"
            onClick={() => window.location.href = "/admin/showtimes"}
            >
            Manage showtimes
            <i className="bi bi-arrow-right"></i>
            </button>
        </div>
      </section>

      <section className="dashboard-rooms">
        <div className="dashboard-section-header">
            <div>
            <h2>Room by Room</h2>
            <p>Occupancy across your cinemas</p>
            </div>

            <span className="dashboard-date-label">
            Today's overview
            </span>
        </div>

        <div className="dashboard-rooms-grid">
          {roomsLoading ? (
            <div className="dashboard-room-empty">
              <p>Loading room occupancy...</p>
            </div>
          ) : roomsError ? (
            <div className="dashboard-room-empty">
              <p>{roomsError}</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="dashboard-room-empty">
              <i className="bi bi-building"></i>
              <p>No room data available yet.</p>
            </div>
          ) : (
            rooms.map((room) => (
              <div className="dashboard-room-card" key={room.hall_id}>
                <div className="dashboard-room-card-header">
                  <div>
                    <h3>{room.room_name}</h3>
                    <p>{room.cinema_city}</p>
                  </div>
                  <i className="bi bi-building"></i>
                </div>

                <div className="dashboard-room-occupancy">
                  <span>Occupancy</span>
                  <strong>{Number(room.occupancy).toFixed(2)}%</strong>
                </div>

                <div className="dashboard-room-progress">
                  <div
                    className="dashboard-room-progress-fill"
                    style={{
                      width: `${Math.min(Number(room.occupancy), 100)}%`,
                    }}
                  ></div>
                </div>

                <div className="dashboard-room-details">
                  <span>Today's Screenings</span>
                  <strong>{room.screenings}</strong>
                </div>

                <div className="dashboard-room-details">
                  <span>Seats Sold</span>
                  <strong>{room.seats_sold} / {room.capacity}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dashboard-rooms-footer">
            <span>Occupancy is calculated from confirmed bookings.</span>
        </div>
      </section>

      <section className="dashboard-attention">
        <div className="dashboard-section-header">
            <div>
            <h2>Needs a Little Attention</h2>
            <p>Important updates for your cinemas</p>
            </div>
        </div>

        <div className="dashboard-alert-list">
          {alertsError && (
            <p className="dashboard-error">{alertsError}</p>
          )}
            <div className="dashboard-alert-item">
            <div className="dashboard-alert-icon">
                <i className="bi bi-clock-history"></i>
            </div>

            <div className="dashboard-alert-info">
                <h3>Unpaid Reservations</h3>
                <p>Reservations waiting for payment.</p>
            </div>

            <span className="dashboard-alert-count">
              {alerts.unpaidReservations}
            </span>
            </div>

            <div className="dashboard-alert-item">
            <div className="dashboard-alert-icon">
                <i className="bi bi-calendar-event"></i>
            </div>

            <div className="dashboard-alert-info">
                <h3>Upcoming Screenings</h3>
                <p>Screenings starting within 30 minutes.</p>
            </div>

            <span className="dashboard-alert-count">
              {alerts.upcomingScreenings}
            </span>
            </div>
        </div>
      </section>


      <section className="dashboard-programme">
        <div className="dashboard-section-header">
          <div>
            <h2>Waiting List Management</h2>
            <p>Notify waitlisted customers, assign open seats, or remove entries</p>
          </div>
          <span className="dashboard-date-label">
            {waitlist.length} waiting
          </span>
        </div>

        {waitlistMessage && (
          <p className="dashboard-error">{waitlistMessage}</p>
        )}

        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Customer Email</th>
                <th>Screening</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitlistLoading ? (
                <tr>
                  <td colSpan="5" className="dashboard-empty">
                    Loading waiting list...
                  </td>
                </tr>
              ) : waitlist.length === 0 ? (
                <tr>
                  <td colSpan="5" className="dashboard-empty">
                    No customers currently on the waiting list.
                  </td>
                </tr>
              ) : (
                waitlist.map((entry) => {
                  const isBusy = waitlistActionId === entry.id;
                  return (
                    <tr key={entry.id}>
                      <td>{entry.customer_email}</td>
                      <td>
                        {entry.movie_title || `Showtime #${entry.showtime_id}`}
                        {entry.start_time &&
                          ` (${new Date(entry.start_time).toLocaleString([], {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })})`}
                      </td>
                      <td>{entry.is_notified ? "Notified" : "Waiting"}</td>
                      <td>
                        {entry.created_at
                          ? new Date(entry.created_at).toLocaleString([], {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="dashboard-manage-button"
                            disabled={isBusy || entry.is_notified}
                            onClick={() => handleNotifyWaitlist(entry.id)}
                          >
                            {entry.is_notified ? "Notified" : "Notify"}
                          </button>
                          <button
                            type="button"
                            className="dashboard-manage-button"
                            disabled={isBusy}
                            onClick={() => handleAssignWaitlistSeat(entry.id)}
                          >
                            Assign Seat
                          </button>
                          <button
                            type="button"
                            className="dashboard-manage-button"
                            disabled={isBusy}
                            onClick={() => handleRemoveWaitlist(entry.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

export default DashboardPage;