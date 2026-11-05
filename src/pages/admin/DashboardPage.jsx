import "../../css/admin/AdminDashboard.css";

const overviewItems = [
  {
    title: "Ticket Sales",
    value: "—",
    description: "Confirmed ticket revenue",
    icon: "bi bi-currency-euro",
  },
  {
    title: "Confirmed Tickets",
    value: "—",
    description: "Across all published screenings",
    icon: "bi bi-ticket-perforated",
  },
  {
    title: "Room Occupancy",
    value: "—",
    description: "Booked seats / total capacity",
    icon: "bi bi-bar-chart",
  },
  {
    title: "Unpaid Reservations",
    value: "—",
    description: "Awaiting payment",
    icon: "bi bi-clock-history",
  },
];

function DashboardPage() {
  return (
    <div className="admin-dashboard">
      <div className="admin-page-header">
        <div>
          <h1>A good day for great stories.</h1>
          <p>Your cinemas at a glance.</p>
        </div>
      </div>

      <section className="dashboard-overview">
        {overviewItems.map((item) => (
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
            <h2>Today's Programme</h2>
            <p>Published screenings and ticket sales</p>
            </div>

            <span className="dashboard-date-label">
            Today's screenings
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
                <th>Price</th>
                </tr>
            </thead>

            <tbody>
                <tr>
                <td colSpan="5" className="dashboard-empty">
                    No screening data available yet.
                </td>
                </tr>
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
            <div className="dashboard-room-empty">
            <i className="bi bi-building"></i>
            <p>No occupancy data available yet.</p>
            </div>
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
            <div className="dashboard-alert-item">
            <div className="dashboard-alert-icon">
                <i className="bi bi-clock-history"></i>
            </div>

            <div className="dashboard-alert-info">
                <h3>Unpaid Reservations</h3>
                <p>Reservations waiting for payment.</p>
            </div>

            <span className="dashboard-alert-count">—</span>
            </div>

            <div className="dashboard-alert-item">
            <div className="dashboard-alert-icon">
                <i className="bi bi-calendar-event"></i>
            </div>

            <div className="dashboard-alert-info">
                <h3>Upcoming Screenings</h3>
                <p>Screenings starting within 30 minutes.</p>
            </div>

            <span className="dashboard-alert-count">—</span>
            </div>
        </div>
      </section>

    </div>
  );
}

export default DashboardPage;

