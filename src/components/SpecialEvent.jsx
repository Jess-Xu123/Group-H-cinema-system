import { useNavigate } from "react-router-dom";
import { Button } from "./Buttons";
import { GroupSeatingIcon, ViewFeatureIcon } from "./Icons";
import "../css/SpecialEvent.css";

export default function SpecialEvent() {
  const navigate = useNavigate();

  const handleReserveClick = () => {
    navigate("/private-screenings");
  };

  return (
    <section className="rio-special-events-section">
      <div className="rio-container special-event-content">
        <div className="section-tag-row">
          <span className="section-tag-text">RESERVE PRIVATE SCREENING</span>
        </div>

        <div className="special-event-card">
          {/* 1.Picture on the left */}
          <div className="card-media">
            <img
              src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800"
              alt="Private Screening Room"
              className="media-img"
            />
          </div>

          {/* 2. text in the middle */}
          <div className="card-main-content">
            <h2 className="event-title">Reserve Private Screening</h2>
            <span className="event-subtitle">Book your own room.</span>
            <p className="event-description">
              Host birthdays, premieres, and private gathering with a dedicated
              room, premium sound, and a tailored cinema experience.
            </p>
            <Button variant="reserve" onClick={handleReserveClick}>
              Reserve Private Screening
            </Button>
          </div>

          {/* 3. Cinema feature on the right */}
          <div className="card-features">
            <div className="feature-item">
              <div className="feature-icon">
                <ViewFeatureIcon />
              </div>
              <div className="feature-text">
                <h4>A great view for everyone</h4>
                <p>Enjoy accessible front-row wheelchair spaces.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <GroupSeatingIcon />
              </div>
              <div className="feature-text">
                <h4>Better together</h4>
                <p>
                  Enjoy automatic group seating booking - your group, seated
                  together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
