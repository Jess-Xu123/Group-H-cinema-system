import { useCallback, useEffect, useState } from "react";

import {
  getHalls,
  getHallStatistics
} from "../../api/hallApi";

import "../../css/admin/AdminHalls.css";

// Get current month using local date
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

// Format currency
function formatCurrency(value) {
  return new Intl.NumberFormat("en-FI", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

// Format numbers
function formatNumber(value) {
  return new Intl.NumberFormat("en-FI").format(
    Number(value || 0)
  );
}

function HallsPage() {
  const [halls, setHalls] = useState([]);
  const [statistics, setStatistics] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(
    getCurrentMonth()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch hall information and monthly statistics
  const fetchHallData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [hallData, statisticsData] = await Promise.all([
        getHalls(),
        getHallStatistics(selectedMonth)
      ]);

      setHalls(hallData);
      setStatistics(statisticsData);
    } catch (err) {
      setError(err.message || "Failed to load hall information.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchHallData();
  }, [fetchHallData]);

  // Handle month selection
  function handleMonthChange(event) {
    setSelectedMonth(event.target.value);
  }

  // Format month label
  function formatMonthLabel(month) {
    if (!month) return "";

    const [year, monthNumber] = month.split("-");

    return new Date(
      Number(year),
      Number(monthNumber) - 1,
      1
    ).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    });
  }

  if (isLoading) {
    return (
      <div className="admin-halls-page">
        <div className="halls-loading">
          <div className="halls-spinner"></div>
          <p>Loading rooms and halls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-halls-page">
        <div className="halls-page-header">
          <div>
            <span className="halls-eyebrow">CINEMA MANAGEMENT</span>
            <h1>Rooms & Halls</h1>
            <p>View hall information and monthly performance.</p>
          </div>
        </div>

        <div className="halls-error">
          <h3>Unable to load hall information</h3>
          <p>{error}</p>

          <button
            className="halls-retry-btn"
            onClick={fetchHallData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const overall = statistics?.overall || {};

  const monthlyHalls = statistics?.halls || [];

  return (
    <div className="admin-halls-page">

      {/* Page Header */}
      <div className="halls-page-header">
        <div>
          <span className="halls-eyebrow">
            CINEMA MANAGEMENT
          </span>

          <h1>Rooms & Halls</h1>

          <p>
            Monitor cinema hall information and monthly
            performance.
          </p>
        </div>

        <div className="halls-month-selector">
          <label htmlFor="halls-month">
            Reporting Month
          </label>

          <input
            id="halls-month"
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
          />
        </div>
      </div>

      {/* Monthly Overview */}
      <section className="halls-overview-section">
        <div className="halls-section-heading">
          <div>
            <h2>Monthly Overview</h2>
            <p>
              Overall cinema performance for{" "}
              {formatMonthLabel(selectedMonth)}
            </p>
          </div>
        </div>

        <div className="halls-overview-grid">

          <div className="halls-stat-card">
            <div className="halls-stat-icon">▦</div>
            <div className="halls-stat-label">
              Total Halls
            </div>
            <div className="halls-stat-value">
              {formatNumber(overall.total_halls)}
            </div>
            <div className="halls-stat-description">
              Fixed cinema halls
            </div>
          </div>

          <div className="halls-stat-card">
            <div className="halls-stat-icon">▣</div>
            <div className="halls-stat-label">
              Total Capacity
            </div>
            <div className="halls-stat-value">
              {formatNumber(overall.total_capacity)}
            </div>
            <div className="halls-stat-description">
              Seats across all halls
            </div>
          </div>

          <div className="halls-stat-card">
            <div className="halls-stat-icon">◉</div>
            <div className="halls-stat-label">
              Occupancy Rate
            </div>
            <div className="halls-stat-value">
              {Number(overall.occupancy_rate || 0).toFixed(2)}%
            </div>
            <div className="halls-stat-description">
              Confirmed paid tickets
            </div>
          </div>

          <div className="halls-stat-card">
            <div className="halls-stat-icon">▤</div>
            <div className="halls-stat-label">
              Tickets Sold
            </div>
            <div className="halls-stat-value">
              {formatNumber(overall.tickets_sold)}
            </div>
            <div className="halls-stat-description">
              Paid tickets this month
            </div>
          </div>

          <div className="halls-stat-card">
            <div className="halls-stat-icon">€</div>
            <div className="halls-stat-label">
              Total Revenue
            </div>
            <div className="halls-stat-value halls-revenue-value">
              {formatCurrency(overall.revenue)}
            </div>
            <div className="halls-stat-description">
              Revenue from paid bookings
            </div>
          </div>

          <div className="halls-stat-card">
            <div className="halls-stat-icon">◷</div>
            <div className="halls-stat-label">
              Showtimes
            </div>
            <div className="halls-stat-value">
              {formatNumber(overall.showtime_count)}
            </div>
            <div className="halls-stat-description">
              Scheduled this month
            </div>
          </div>

        </div>
      </section>

      {/* Hall Performance */}
      <section className="halls-performance-section">
        <div className="halls-section-heading">
          <div>
            <h2>Hall Performance</h2>
            <p>
              Monthly statistics for each cinema hall.
            </p>
          </div>
        </div>

        {monthlyHalls.length === 0 ? (
          <div className="halls-empty">
            No hall statistics available.
          </div>
        ) : (
          <div className="halls-performance-grid">

            {monthlyHalls.map((hall) => {
              const occupancy = Math.min(
                Math.max(Number(hall.occupancy_rate || 0), 0),
                100
              );

              return (
                <div
                  className="halls-performance-card"
                  key={hall.hall_id}
                >

                  <div className="halls-card-header">
                    <div>
                      <span className="halls-card-eyebrow">
                        {hall.city}
                      </span>

                      <h3>{hall.name}</h3>
                    </div>

                    <span className="halls-fixed-badge">
                      Fixed
                    </span>
                  </div>

                  <div className="halls-capacity-display">
                    <span className="halls-capacity-number">
                      {formatNumber(hall.capacity)}
                    </span>

                    <span className="halls-capacity-label">
                      Total Seats
                    </span>
                  </div>

                  <div className="halls-occupancy">
                    <div className="halls-occupancy-heading">
                      <span>Monthly Occupancy</span>

                      <strong>
                        {Number(hall.occupancy_rate || 0).toFixed(2)}%
                      </strong>
                    </div>

                    <div className="halls-progress-track">
                      <div
                        className="halls-progress-fill"
                        style={{ width: `${occupancy}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="halls-performance-details">

                    <div>
                      <span>Tickets Sold</span>
                      <strong>
                        {formatNumber(hall.tickets_sold)}
                      </strong>
                    </div>

                    <div>
                      <span>Showtimes</span>
                      <strong>
                        {formatNumber(hall.showtime_count)}
                      </strong>
                    </div>

                    <div>
                      <span>Available Seats</span>
                      <strong>
                        {formatNumber(hall.available_seats)}
                      </strong>
                    </div>

                    <div>
                      <span>Revenue</span>
                      <strong>
                        {formatCurrency(hall.revenue)}
                      </strong>
                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}
      </section>

      {/* Hall Information */}
      <section className="halls-information-section">

        <div className="halls-section-heading">
          <div>
            <h2>Hall Information</h2>
            <p>
              Fixed seating configuration for each hall.
            </p>
          </div>

          <span className="halls-readonly-label">
            READ ONLY
          </span>
        </div>

        <div className="halls-table-wrapper">
          <table className="halls-table">
            <thead>
              <tr>
                <th>Hall</th>
                <th>City</th>
                <th>Capacity</th>
                <th>Total Rows</th>
                <th>Seats / Row</th>
                <th>Wheelchair Limit</th>
                <th>Configuration</th>
              </tr>
            </thead>

            <tbody>
              {halls.map((hall) => (
                <tr key={hall.id}>
                  <td className="halls-table-name">
                    {hall.name}
                  </td>

                  <td>{hall.city}</td>

                  <td>{formatNumber(hall.capacity)}</td>

                  <td>{formatNumber(hall.total_rows)}</td>

                  <td>{formatNumber(hall.seats_per_row)}</td>

                  <td>
                    {hall.wheelchair_limit ?? "—"}
                  </td>

                  <td>
                    <span className="halls-table-fixed">
                      Fixed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </section>

    </div>
  );
}

export default HallsPage;
