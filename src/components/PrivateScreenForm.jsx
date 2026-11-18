import { useState } from "react";
import { createPrivateScreeningEnquiry } from "../api/privateScreeningApi";

function getTodayDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function PrivateScreeningForm() {
  const [formNotice, setFormNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState(null);

  async function handleEnquirySubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormNotice("");

    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    payload.attendees = Number(payload.attendees);

    try {
      const result = await createPrivateScreeningEnquiry(payload);

      setSubmittedReceipt({
        referenceCode:
          result.enquiry?.referenceCode || `RIO-ENQ-${result.enquiry?.id}`,
        ...payload,
      });

      event.target.reset();
    } catch (error) {
      setFormNotice(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // if submit succeeds, render receipt
  if (submittedReceipt) {
    const cinemaPhone =
      submittedReceipt.location === "Oulu"
        ? "+358 8 5542 3890"
        : "+358 2 2641 7520";

    return (
      <section
        className="private-screening-form-panel private-screening-receipt"
        aria-live="polite"
      >
        <div className="private-screening-form-heading">
          <h2>Enquiry received</h2>
          <span>Awaiting RIO Confirmation</span>
        </div>

        <div className="private-screening-receipt-banner">
          <p>Reference number</p>
          <strong>{submittedReceipt.referenceCode}</strong>
          <span>
            Please keep this code for your records when contacting our team.
          </span>
        </div>

        <dl className="private-screening-receipt-summary">
          <div>
            <dt>Company &amp; Contact</dt>
            <dd>
              {submittedReceipt.companyName} · {submittedReceipt.contactName}
            </dd>
          </div>
          <div>
            <dt>Confirmation Email</dt>
            <dd>{submittedReceipt.email}</dd>
          </div>
          <div>
            <dt>Cinema &amp; Capacity</dt>
            <dd>
              Rio {submittedReceipt.location} ({submittedReceipt.roomCapacity}{" "}
              places)
            </dd>
          </div>
          <div>
            <dt>Preferred Date &amp; Time</dt>
            <dd>
              {submittedReceipt.preferredDate} at{" "}
              {submittedReceipt.preferredTime}
            </dd>
          </div>
          <div>
            <dt>Estimated Guests</dt>
            <dd>{submittedReceipt.attendees} attendees</dd>
          </div>
          <div>
            <dt>Film / Event</dt>
            <dd>{submittedReceipt.filmPreference}</dd>
          </div>
        </dl>

        <div className="private-screening-receipt-next">
          <p>
            <strong>What happens next?</strong> Our {submittedReceipt.location}{" "}
            team will review availability and reply to{" "}
            <strong>{submittedReceipt.email}</strong> with a quote.
          </p>
          <p>
            Need to update your details? Call us at{" "}
            <a href={`tel:${cinemaPhone.replace(/\s+/g, "")}`}>{cinemaPhone}</a>{" "}
            and quote <strong>{submittedReceipt.referenceCode}</strong>.
          </p>
        </div>

        <button
          type="button"
          className="private-screening-submit"
          onClick={() => setSubmittedReceipt(null)}
        >
          Send another enquiry
        </button>
      </section>
    );
  }

  //When not submitting, render the form
  return (
    <section className="private-screening-form-panel">
      <div className="private-screening-form-heading">
        <h2>Tell us about your screening</h2>
        <span>Required fields</span>
      </div>

      <form className="private-screening-form" onSubmit={handleEnquirySubmit}>
        <label className="private-screening-field">
          <span>Company name *</span>
          <input
            name="companyName"
            type="text"
            placeholder="Company or organisation"
            required
          />
        </label>

        <label className="private-screening-field">
          <span>Contact name *</span>
          <input
            name="contactName"
            type="text"
            autoComplete="name"
            placeholder="First and last name"
            required
          />
        </label>

        <label className="private-screening-field">
          <span>Email *</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Your work email"
            required
          />
        </label>

        <label className="private-screening-field">
          <span>Phone (optional)</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Include country code"
          />
        </label>

        <label className="private-screening-field">
          <span>Location *</span>
          <select name="location" defaultValue="" required>
            <option value="" disabled>
              Choose Oulu or Tampere
            </option>
            <option value="Oulu">Oulu</option>
            <option value="Tampere">Tampere</option>
          </select>
        </label>

        <label className="private-screening-field">
          <span>Room capacity preference *</span>
          <select name="roomCapacity" defaultValue="" required>
            <option value="" disabled>
              100 / 200 total places
            </option>
            <option value="100">100 places</option>
            <option value="200">200 places</option>
          </select>
        </label>

        <label className="private-screening-field">
          <span>Preferred date *</span>
          <input
            name="preferredDate"
            type="date"
            min={getTodayDate()}
            required
          />
        </label>

        <label className="private-screening-field">
          <span>Preferred time *</span>
          <input name="preferredTime" type="time" required />
        </label>

        <label className="private-screening-field">
          <span>Number of attendees *</span>
          <input
            name="attendees"
            type="number"
            min="1"
            placeholder="Estimated number of guests"
            required
          />
        </label>

        <label className="private-screening-field">
          <span>Film / event preference *</span>
          <input
            name="filmPreference"
            type="text"
            placeholder="Film title or type of company event"
            required
          />
        </label>

        <label className="private-screening-field private-screening-field-full">
          <span>Accessibility needs (optional)</span>
          <textarea
            name="accessibilityNeeds"
            placeholder="Tell us about wheelchair places, companion seating or other access requirements."
            rows="3"
          />
        </label>

        <label className="private-screening-field private-screening-field-full">
          <span>Extra details (optional)</span>
          <textarea
            name="extraDetails"
            placeholder="Share your plans, date flexibility or any questions for our team."
            rows="3"
          />
        </label>

        <div className="private-screening-submit-row">
          <p>
            This enquiry is for a private screening. Snacks and refreshments
            cannot be ordered online.
          </p>
          <button
            type="submit"
            className="private-screening-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send screening enquiry"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <span>
            No payment now. Your booking is only confirmed once agreed with the
            cinema.
          </span>
        </div>

        {formNotice && (
          <p
            className="private-screening-form-notice"
            role="status"
            aria-live="polite"
          >
            {formNotice}
          </p>
        )}
      </form>
    </section>
  );
}
