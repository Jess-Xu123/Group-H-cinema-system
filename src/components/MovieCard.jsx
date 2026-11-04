import "../css/MovieCard.css";
import { Button } from "./Buttons";
import { ArrowUpRightIcon, ClockIcon } from "./Icons";

export default function MovieCard({ movie, isUpcoming = false, OnSelect }) {
  if (!movie) return null;

  const {
    title,
    genre,
    ageRestriction,
    isPremiere,
    poster,
    showtime,
    room,
    price,
    discountNote,
    releaseDate,
  } = movie;

  return (
    <div className="rio-movie-card" onClick={() => OnSelect && OnSelect(movie)}>
      <div className="poster-wrapper">
        <img src={poster} alt={title} className="poster-img" loading="lazy" />
        <div className="poster-overlay"></div>

        {isPremiere && <span className="badge-premiere">Premiere</span>}

        {ageRestriction !== undefined && (
          <span className="badge-age">
            {ageRestriction === 0 ? "S" : `K-${ageRestriction}`}
          </span>
        )}
      </div>

      {/* Movie card details */}
      <div className="card-body">
        <div className="card-header-info">
          <span className="movie-genre"> {genre}</span>
          <h3 className="movie-title"> {title}</h3>
        </div>

        {/* If upcoming movies */}
        {!isUpcoming ? (
          <div className="card-footer-info">
            {/* Showtime and room info */}
            <div className="showtime-tag">
              <ClockIcon />
              <span>{showtime}</span>
              <span className="dot-divider">•</span>
              <span>{room}</span>
            </div>

            {/* Price and buy button */}
            <div className="action-row">
              <div className="price-block">
                <span className="price-amount">
                  €{price ? price.toFixed(2) : "15.00"}
                </span>
                {discountNote && (
                  <span className="discount-tag">{discountNote}</span>
                )}
              </div>

              <Button variant="ticket">Buy Ticket</Button>
            </div>
          </div>
        ) : (
          <div className="card-footer-info upcoming">
            <div className="upcoming-sub-info">
              <span className="clock-icon">
                <ClockIcon width={18} height={18} />
              </span>
              <span>{releaseDate || "Coming Soon"}</span>
            </div>
            <div className="upcoming-details-row">
              <span className="btn-details-link">Details soon</span>
              <span className="btn-details-arrow">
                <ArrowUpRightIcon size={18} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
