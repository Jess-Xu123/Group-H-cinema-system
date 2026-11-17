import { useEffect, useState } from "react";
import {
  getTicketDiscounts,
  updateTicketDiscounts,
} from "../../api/ticketDiscountApi";
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

  const [ticketDiscounts, setTicketDiscounts] = useState({
    child_ticket_discount_percent: 50,
    loyalty_ticket_discount_percent: 50,
  });

  const [discountLoading, setDiscountLoading] = useState(true);
  const [discountSaving, setDiscountSaving] = useState(false);
  const [discountError, setDiscountError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTicketDiscounts() {
      try {
        const result = await getTicketDiscounts(controller.signal);

        setTicketDiscounts({
          child_ticket_discount_percent:
            result.child_ticket_discount_percent,
          loyalty_ticket_discount_percent:
            result.loyalty_ticket_discount_percent,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setDiscountError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDiscountLoading(false);
        }
      }
    }

    loadTicketDiscounts();

    return () => controller.abort();
  }, []);

  const handleDiscountChange = (event) => {
    const { name, value } = event.target;

    setTicketDiscounts((previous) => ({
      ...previous,
      [name]: value === "" ? "" : Number(value),
    }));

    setDiscountError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((previousSettings) => ({
      ...previousSettings,
      [name]: type === "checkbox" ? checked : value,
    }));

    setSaveMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const child = ticketDiscounts.child_ticket_discount_percent;
    const loyalty = ticketDiscounts.loyalty_ticket_discount_percent;

    if (
      !Number.isInteger(child) ||
      child < 0 ||
      child > 100 ||
      !Number.isInteger(loyalty) ||
      loyalty < 0 ||
      loyalty > 100
    ) {
      setDiscountError("Discounts must be whole numbers between 0 and 100.");
      return;
    }

    setDiscountSaving(true);
    setDiscountError("");
    setSaveMessage("");

    try {
      const result = await updateTicketDiscounts({
        child_ticket_discount_percent: child,
        loyalty_ticket_discount_percent: loyalty,
      });

      setSaveMessage(result.message);
    } catch (error) {
      setDiscountError(error.message);
    } finally {
      setDiscountSaving(false);
    }
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

        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Ticket Discounts</h2>
            <p>
              Manage the discount percentages for child tickets
              and loyalty rewards.
            </p>
          </div>

          {discountLoading ? (
            <p>Loading ticket discount settings...</p>
          ) : (
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label htmlFor="child_ticket_discount_percent">
                  Child Ticket Discount
                </label>

                <input
                  id="child_ticket_discount_percent"
                  name="child_ticket_discount_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={ticketDiscounts.child_ticket_discount_percent}
                  onChange={handleDiscountChange}
                  required
                />

                <small>
                  Discount for children under 12 years old.
                </small>
              </div>

              <div className="settings-form-group">
                <label htmlFor="loyalty_ticket_discount_percent">
                  Loyalty Reward Discount
                </label>

                <input
                  id="loyalty_ticket_discount_percent"
                  name="loyalty_ticket_discount_percent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={ticketDiscounts.loyalty_ticket_discount_percent}
                  onChange={handleDiscountChange}
                  required
                />

                <small>
                  Discount for every 10 eligible paid tickets.
                </small>
              </div>
            </div>
          )}

          {discountError && (
            <p className="settings-error-message">
              {discountError}
            </p>
          )}
        </section>

        <div className="settings-footer">
          {saveMessage && (
            <p className="settings-save-message">{saveMessage}</p>
          )}

        <button
          type="submit"
          className="settings-save-button"
          disabled={discountLoading || discountSaving}
        >
          {discountSaving ? "Saving..." : "Save Changes"}
        </button>
        </div>
      </form>
    </div>
  );
}

export default SettingPage;
