import { useState } from "react";
import "../../css/admin/AdminSettings.css";

function SettingPage() {
  const [settings, setSettings] = useState({
    cinemaName: "RIO Cinema",
    contactEmail: "",
    contactPhone: "",
    cinemaAddress: "",

    reservationHoldTime: 15,
    allowGuestBooking: true,
    allowUnpaidReservations: true,

    bookingConfirmationEmail: true,
    reservationReminderEmail: true,
  });

  const [saveMessage, setSaveMessage] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((previousSettings) => ({
      ...previousSettings,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSaveMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Backend API will be connected later.
    console.log("Settings to save:", settings);

    setSaveMessage("Settings are ready to be saved.");
  };

  return (
    <div className="admin-settings-page">
      <div className="admin-settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your cinema's system settings.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cinema Information */}
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Cinema Information</h2>
            <p>Manage your cinema's basic contact information.</p>
          </div>

          <div className="settings-form-grid">
            <div className="settings-form-group">
              <label htmlFor="cinemaName">Cinema Name</label>
              <input
                id="cinemaName"
                name="cinemaName"
                value={settings.cinemaName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="contactEmail">Contact Email</label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={settings.contactEmail}
                onChange={handleChange}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="contactPhone">Contact Phone</label>
              <input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={settings.contactPhone}
                onChange={handleChange}
              />
            </div>

            <div className="settings-form-group">
              <label htmlFor="cinemaAddress">Cinema Address</label>
              <input
                id="cinemaAddress"
                name="cinemaAddress"
                value={settings.cinemaAddress}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <div className="settings-footer">
          {saveMessage && (
            <p className="settings-save-message">{saveMessage}</p>
          )}

          <button type="submit" className="settings-save-button">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

export default SettingPage;
