import { useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import PrivateScreeningForm from "../../components/PrivateScreenForm";
import "../../css/PrivateScreening.css";

const PRIVATE_SCREENING_IMAGE =
  "https://a3s.fi/swift/v1/Rio-media/web-media/private screen.jpg";

const screeningSteps = [
  {
    number: "01",
    title: "Send your enquiry",
    description:
      "Share your company details, preferred cinema, date and group size.",
  },
  {
    number: "02",
    title: "Make a plan with us",
    description:
      "Agree the film, date and quote with our team, including any accessibility needs.",
  },
  {
    number: "03",
    title: "Cinema confirms your booking",
    description:
      "Your private screening is confirmed once the cinema has agreed the details with you.",
  },
];

const screeningFaqs = [
  {
    question: "Is my preferred date guaranteed?",
    answer:
      "No. An enquiry does not hold a room or confirm a booking. Our staff will confirm film and room availability, the final price and booking details with you.",
  },
  {
    question: "How are accessible places arranged?",
    answer:
      "Each room has a separate front accessibility area for 10 wheelchair spaces, outside the numbered seating grid. Regular seat 1 is owner-only. Tell us about your needs so the cinema can confirm the arrangement.",
  },
  {
    question: "Does the six-ticket limit apply to our company?",
    answer:
      "No. Regular online purchases are limited to six tickets per booking. Larger groups and private screenings are handled separately by our staff through this enquiry.",
  },
];

export default function PrivateScreeningPage() {
  const [currentLocation, setCurrentLocation] = useState("Oulu");

  return (
    <div className="cinema-page">
      <Navbar
        currentLocation={currentLocation}
        onLocationChange={setCurrentLocation}
      />

      <main className="private-screening-page">
        <section className="private-screening-hero">
          <img
            className="private-screening-hero-image"
            src={PRIVATE_SCREENING_IMAGE}
            alt=""
            aria-hidden="true"
          />
          <div className="rio-container private-screening-hero-content">
            <p className="private-screening-eyebrow">
              PRIVATE SCREENINGS · OULU &amp; TAMPERE
            </p>
            <h1>Your company. Your own cinema.</h1>
            <p className="private-screening-hero-copy">
              Bring your team together for a story worth sharing. Our family-run
              cinema welcomes company private events in Oulu and Tampere, with a
              room just for you.
            </p>
            <a className="private-screening-cta" href="#screening-enquiry">
              Enquire about a screening <span aria-hidden="true">→</span>
            </a>
            <p className="private-screening-hero-slogan">
              INDEPENDENT SPIRIT. A SHARED EXPERIENCE.
            </p>
          </div>
        </section>

        <section className="private-screening-cities rio-container">
          <div className="private-screening-section-heading">
            <h2>Two cities. The same Rio welcome.</h2>
            <p>Company gatherings, shared on the big screen.</p>
          </div>

          <div className="private-screening-city-grid">
            <article className="private-screening-city-card">
              <div className="private-screening-city-title">
                <h3>Oulu</h3>
                <span>RIO CINEMA</span>
              </div>
              <p className="private-screening-capacity">
                2 auditoriums · Auditorium 1: 100 seats · Auditorium 2: 200
                seats
              </p>
              <p className="private-screening-city-note">
                10 separate front wheelchair spaces per room, outside the
                numbered seat map. Regular seat 1 is owner-only.
              </p>
              <address>
                <span>Kauppurienkatu 45, 90100 Oulu, Finland</span>
                <a href="tel:+358855423890">+358 8 5542 3890</a>
              </address>
            </article>

            <article className="private-screening-city-card">
              <div className="private-screening-city-title">
                <h3>Tampere</h3>
                <span>RIO CINEMA</span>
              </div>
              <p className="private-screening-capacity">
                4 auditoriums · Auditorium 1: 100 seats · Auditorium 2: 200
                seats
              </p>
              <p className="private-screening-city-note">
                Capacities for auditoriums 3–4 have not yet been supplied.
                Wheelchair spaces are separate from regular seats.
              </p>
              <address>
                <span>Hämeenkatu 27, 33100 Tampere, Finland</span>
                <a href="tel:+358226417520">+358 2 2641 7520</a>
              </address>
            </article>
          </div>

          <p className="private-screening-capacity-note">
            Room preference is not a reservation. The cinema confirms final
            bookable capacity and accessibility arrangements with you.
          </p>
        </section>

        <section className="private-screening-enquiry" id="screening-enquiry">
          <div className="rio-container private-screening-enquiry-layout">
            <aside className="private-screening-enquiry-intro">
              <p className="private-screening-eyebrow">LET’S PLAN YOUR EVENT</p>
              <h2>A little escape. Just for your team.</h2>
              <p>
                Tell us what you have in mind. Our team will help agree the
                film, date and details for your company’s private screening.
              </p>

              <div className="private-screening-enquiry-note">
                <h3>An enquiry, not a confirmed booking.</h3>
                <p>
                  Price and availability are confirmed by the cinema. No payment
                  is required to send an enquiry.
                </p>
              </div>

              <p className="private-screening-large-group-note">
                Planning for more than six? Company enquiries and larger groups
                are handled separately by our staff.
              </p>
            </aside>

            <PrivateScreeningForm />
          </div>
        </section>

        <section className="private-screening-process rio-container">
          <h2>From first idea to opening scene.</h2>
          <div className="private-screening-steps">
            {screeningSteps.map((step) => (
              <article className="private-screening-step" key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="private-screening-faq rio-container">
          <div className="private-screening-faq-heading">
            <h2>Before the lights dim.</h2>
            <p>A few things to know about your company screening.</p>
          </div>
          <div className="private-screening-faq-list">
            {screeningFaqs.map((faq) => (
              <article
                className="private-screening-faq-item"
                key={faq.question}
              >
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
