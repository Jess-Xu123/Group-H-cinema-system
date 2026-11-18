import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPrivateScreeningEnquiries,
  getPrivateScreeningEnquiryById,
  approvePrivateScreeningEnquiry,
  rejectPrivateScreeningEnquiry,
  confirmPrivateScreeningEnquiry,
} from "../../api/privateScreeningApi";
import { getAdminShowtimes } from "../../api/showtimeApi";
import "../../css/admin/AdminPrivateScreenings.css";

const STATUS_OPTIONS = [
  "pending",
  "contacted",
  "confirmed",
  "rejected",
];

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not specified";

  // PostgreSQL TIME may be returned as HH:mm:ss
  return String(value).slice(0, 5);
}

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getCompanyName(enquiry) {
  return enquiry?.company_name || "Unknown company";
}

function getEnquiryCapacity(enquiry) {
  return enquiry?.room_capacity || "Not specified";
}

function getShowtimeCapacity(showtime) {
  return Number(
    showtime?.capacity ??
    showtime?.hall_capacity ??
    showtime?.hall?.capacity ??
    0
  );
}

function AdminPrivateScreeningsPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [showtimes, setShowtimes] = useState([]);

  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    location: "",
  });

  const [selectedShowtimeId, setSelectedShowtimeId] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [modalMode, setModalMode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [enquiryData, showtimeData] = await Promise.all([
        getPrivateScreeningEnquiries(),
        getAdminShowtimes(),
      ]);

      setEnquiries(enquiryData);
      setShowtimes(showtimeData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const locations = useMemo(
    () =>
      [...new Set(enquiries.map((item) => item.location).filter(Boolean))]
        .sort(),
    [enquiries]
  );

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enquiry) => {
      if (
        filters.status &&
        enquiry.status !== filters.status
      ) {
        return false;
      }

      if (
        filters.location &&
        enquiry.location !== filters.location
      ) {
        return false;
      }

      return true;
    });
  }, [enquiries, filters]);

  const statusCounts = useMemo(() => {
    return STATUS_OPTIONS.reduce((counts, status) => {
      counts[status] = enquiries.filter(
        (item) => item.status === status
      ).length;

      return counts;
    }, {});
  }, [enquiries]);

  // Only show private company showtimes that match the enquiry.
  const availableShowtimes = useMemo(() => {
    if (!selectedEnquiry) return [];

    const enquiryCompany = getCompanyName(selectedEnquiry)
      .trim()
      .toLowerCase();

    const attendees = Number(selectedEnquiry.attendees || 0);

    return showtimes.filter((showtime) => {
      if (!showtime.is_private_company) return false;

      if (showtime.city !== selectedEnquiry.location) return false;

      const showtimeCompany = String(showtime.company_name || "")
        .trim()
        .toLowerCase();

      if (showtimeCompany !== enquiryCompany) return false;

      const capacity = getShowtimeCapacity(showtime);

      // If capacity is available, make sure it can accommodate the group.
      if (capacity > 0 && attendees > capacity) return false;

      // Do not offer past showtimes.
      if (new Date(showtime.start_time).getTime() <= Date.now()) {
        return false;
      }

      return true;
    });
  }, [showtimes, selectedEnquiry]);

  async function openDetails(enquiry) {
    setSelectedEnquiry(enquiry);
    setModalMode("details");
    setStaffNotes("");
    setRejectReason("");
    setSelectedShowtimeId("");
    setError("");
    setSuccess("");

    setIsDetailLoading(true);

    try {
      const detail = await getPrivateScreeningEnquiryById(enquiry.id);
      setSelectedEnquiry(detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  function closeModal() {
    if (isSubmitting) return;

    setSelectedEnquiry(null);
    setModalMode("");
    setSelectedShowtimeId("");
    setStaffNotes("");
    setRejectReason("");
    setError("");
  }

  async function refreshAfterAction(message) {
    setSuccess(message);
    setModalMode("");
    setSelectedEnquiry(null);
    setSelectedShowtimeId("");
    setStaffNotes("");
    setRejectReason("");

    await loadData();
  }

  async function handleApprove() {
    if (!selectedEnquiry) return;

    setIsSubmitting(true);
    setError("");

    try {
      await approvePrivateScreeningEnquiry(
        selectedEnquiry.id,
        staffNotes.trim()
      );

      await refreshAfterAction("Enquiry approved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!selectedEnquiry) return;

    if (!rejectReason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await rejectPrivateScreeningEnquiry(
        selectedEnquiry.id,
        rejectReason.trim()
      );

      await refreshAfterAction("Enquiry rejected successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!selectedEnquiry) return;

    if (!selectedShowtimeId) {
      setError("Please select a private screening showtime.");
      return;
    }

    const selectedShowtime = availableShowtimes.find(
      (item) => String(item.id) === String(selectedShowtimeId)
    );

    if (!selectedShowtime) {
      setError("The selected showtime is no longer available.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm this enquiry with ${selectedShowtime.movie_title} at ${selectedShowtime.city} - ${selectedShowtime.hall_name} on ${formatDateTime(selectedShowtime.start_time)}?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setError("");

    try {
      await confirmPrivateScreeningEnquiry(
        selectedEnquiry.id,
        selectedShowtimeId,
        staffNotes.trim()
      );

      await refreshAfterAction("Private screening confirmed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStatus(status) {
    return (
      <span className={`private-status private-status-${status}`}>
        {status?.replace("_", " ") || "Unknown"}
      </span>
    );
  }

  return (
    <div className="admin-private-screenings-page">
      <div className="admin-page-header">
        <h1>Private Screening Management</h1>
        <p>
          Review company enquiries and manage private screening arrangements.
        </p>
      </div>

      {/* Status overview */}
      <section className="private-screening-stats">
        {STATUS_OPTIONS.map((status) => (
          <div className="private-stat-card" key={status}>
            <span className="private-stat-number">
              {statusCounts[status] || 0}
            </span>
            <span className="private-stat-label">
              {status.replace("_", " ")}
            </span>
          </div>
        ))}
      </section>

      {/* Enquiry list */}
      <section className="private-screening-list-section">
        <div className="private-screening-list-header">
          <h2>Enquiries</h2>

          <button
            type="button"
            className="private-refresh-button"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="private-screening-filters">
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label>
            City
            <select
              value={filters.location}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  location: event.target.value,
                }))
              }
            >
              <option value="">All cities</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="private-clear-filters"
            onClick={() => setFilters({ status: "", location: "" })}
          >
            Clear Filters
          </button>
        </div>

        {error && !selectedEnquiry && (
          <p className="private-error">{error}</p>
        )}

        {success && (
          <p className="private-success">{success}</p>
        )}

        {isLoading && <p>Loading enquiries...</p>}

        {!isLoading && filteredEnquiries.length === 0 && (
          <p className="private-empty">
            No private screening enquiries found.
          </p>
        )}

        <div className="private-enquiry-list">
          {filteredEnquiries.map((enquiry) => (
            <article className="private-enquiry-card" key={enquiry.id}>
              <div className="private-enquiry-main">
                <div className="private-enquiry-heading">
                  <h3>{getCompanyName(enquiry)}</h3>
                  {renderStatus(enquiry.status)}
                </div>

                <div className="private-enquiry-meta">
                  <span>
                    <strong>Location:</strong> {enquiry.location}
                  </span>

                  <span>
                    <strong>Date:</strong> {formatDate(enquiry.preferred_date)}
                  </span>

                  <span>
                    <strong>Time:</strong> {formatTime(enquiry.preferred_time)}
                  </span>

                  <span>
                    <strong>Attendees:</strong> {enquiry.attendees}
                  </span>
                </div>

                <p className="private-enquiry-contact">
                  Contact: {enquiry.contact_name} · {enquiry.email}
                </p>
              </div>

              <div className="private-enquiry-actions">
                <button
                  type="button"
                  className="private-view-button"
                  onClick={() => openDetails(enquiry)}
                >
                  View Details
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Details and action modal */}
      {selectedEnquiry && (
        <div
          className="private-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className="private-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="private-modal-title"
          >
            <div className="private-modal-header">
              <div>
                <h2 id="private-modal-title">Private Screening Enquiry</h2>
                <p>
                  Enquiry #{selectedEnquiry.id} ·{" "}
                  {renderStatus(selectedEnquiry.status)}
                </p>
              </div>

              <button
                type="button"
                className="private-modal-close"
                onClick={closeModal}
                disabled={isSubmitting}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {isDetailLoading ? (
              <p>Loading enquiry details...</p>
            ) : (
              <>
                <div className="private-detail-grid">
                  <div>
                    <span>Company</span>
                    <strong>{getCompanyName(selectedEnquiry)}</strong>
                  </div>

                  <div>
                    <span>Contact person</span>
                    <strong>{selectedEnquiry.contact_name}</strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>{selectedEnquiry.email}</strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>{selectedEnquiry.phone || "Not provided"}</strong>
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>{selectedEnquiry.location}</strong>
                  </div>

                  <div>
                    <span>Room capacity preference</span>
                    <strong>{getEnquiryCapacity(selectedEnquiry)}</strong>
                  </div>

                  <div>
                    <span>Preferred date</span>
                    <strong>{formatDate(selectedEnquiry.preferred_date)}</strong>
                  </div>

                  <div>
                    <span>Preferred time</span>
                    <strong>{formatTime(selectedEnquiry.preferred_time)}</strong>
                  </div>

                  <div>
                    <span>Attendees</span>
                    <strong>{selectedEnquiry.attendees}</strong>
                  </div>

                  <div>
                    <span>Film preference</span>
                    <strong>{selectedEnquiry.film_preference}</strong>
                  </div>

                  <div>
                    <span>Submitted</span>
                    <strong>{formatDateTime(selectedEnquiry.created_at)}</strong>
                  </div>

                  <div>
                    <span>Confirmed Showtime ID</span>
                    <strong>
                      {selectedEnquiry.confirmed_showtime_id || "Not confirmed"}
                    </strong>
                  </div>
                </div>

                <div className="private-detail-text">
                  <h3>Accessibility needs</h3>
                  <p>
                    {selectedEnquiry.accessibility_needs || "None specified"}
                  </p>
                </div>

                <div className="private-detail-text">
                  <h3>Additional details</h3>
                  <p>
                    {selectedEnquiry.extra_details || "None provided"}
                  </p>
                </div>

                {selectedEnquiry.staff_notes && (
                  <div className="private-detail-text private-internal-notes">
                    <h3>Internal staff notes</h3>
                    <p>{selectedEnquiry.staff_notes}</p>
                  </div>
                )}

                {error && <p className="private-error">{error}</p>}

                {/* Pending: approve or reject */}
                {selectedEnquiry.status === "pending" && modalMode !== "reject" && (
                  <div className="private-action-panel">
                    <h3>Review Enquiry</h3>

                    <label>
                      Internal notes (optional)
                      <textarea
                        value={staffNotes}
                        onChange={(event) => setStaffNotes(event.target.value)}
                        rows={3}
                        placeholder="Add internal notes..."
                      />
                    </label>

                    <div className="private-modal-actions">
                      <button
                        type="button"
                        className="private-approve-button"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Processing..." : "Approve Enquiry"}
                      </button>

                      <button
                        type="button"
                        className="private-reject-button"
                        onClick={() => {
                          setError("");
                          setModalMode("reject");
                        }}
                        disabled={isSubmitting}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Contacted: confirm or reject */}
                {selectedEnquiry.status === "contacted" && modalMode !== "reject" && (
                  <div className="private-action-panel">
                    <h3>Confirm Private Screening</h3>

                    <p className="private-action-description">
                      Select an existing private company showtime matching
                      this enquiry's city and company.
                    </p>

                    <label>
                      Available private showtimes
                      <select
                        value={selectedShowtimeId}
                        onChange={(event) =>
                          setSelectedShowtimeId(event.target.value)
                        }
                      >
                        <option value="">Select a showtime</option>

                        {availableShowtimes.map((showtime) => (
                          <option key={showtime.id} value={showtime.id}>
                            #{showtime.id} · {showtime.movie_title} ·{" "}
                            {showtime.city} · {showtime.hall_name} ·{" "}
                            {formatDateTime(showtime.start_time)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {availableShowtimes.length === 0 && (
                      <p className="private-warning">
                        No matching future private showtimes were found.
                        Please create one in Showtime Management first.
                      </p>
                    )}

                    <label>
                      Internal notes (optional)
                      <textarea
                        value={staffNotes}
                        onChange={(event) => setStaffNotes(event.target.value)}
                        rows={3}
                        placeholder="Add confirmation notes..."
                      />
                    </label>

                    <div className="private-modal-actions">
                      <button
                        type="button"
                        className="private-approve-button"
                        onClick={handleConfirm}
                        disabled={isSubmitting || availableShowtimes.length === 0}
                      >
                        {isSubmitting ? "Confirming..." : "Confirm Screening"}
                      </button>

                      <button
                        type="button"
                        className="private-reject-button"
                        onClick={() => {
                          setError("");
                          setModalMode("reject");
                        }}
                        disabled={isSubmitting}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject form */}
                {modalMode === "reject" && (
                  <div className="private-action-panel">
                    <h3>Reject Enquiry</h3>

                    <label>
                      Rejection reason (required)
                      <textarea
                        value={rejectReason}
                        onChange={(event) =>
                          setRejectReason(event.target.value)
                        }
                        rows={3}
                        placeholder="Explain why this enquiry is rejected..."
                      />
                    </label>

                    <div className="private-modal-actions">
                      <button
                        type="button"
                        className="private-reject-button"
                        onClick={handleReject}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                      </button>

                      <button
                        type="button"
                        className="private-secondary-button"
                        onClick={() => {
                          setModalMode("details");
                          setRejectReason("");
                          setError("");
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {selectedEnquiry.status === "confirmed" && (
                  <p className="private-success">
                    This enquiry has been confirmed.
                  </p>
                )}

                {selectedEnquiry.status === "rejected" && (
                  <p className="private-warning">
                    This enquiry has been rejected.
                  </p>
                )}
              </>
            )}

            <div className="private-modal-footer">
              <button
                type="button"
                className="private-secondary-button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPrivateScreeningsPage;
