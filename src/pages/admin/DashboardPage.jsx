import { useEffect, useState } from "react";
import {
  getDashboardAlerts,
  getTodayProgramme,
  getRoomOccupancy,
} from "../../api/authApi";
import "../../css/admin/AdminDashboard.css";

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
              Today's overview
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
                      {new Date(screening.start_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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

    </div>
  );
}

export default DashboardPage;