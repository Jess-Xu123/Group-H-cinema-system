import { Link } from "react-router-dom";
import "../css/MovieCard.css";
import { Button } from "./Buttons";
import { ArrowUpRightIcon, ClockIcon } from "./Icons";

export default function MovieCard({ movie, isUpcoming = false, onSelect }) {
  if (!movie) return null;

  const {
    id,
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
  const ageLabel =
    typeof ageRestriction === "number"
      ? ageRestriction === 0
        ? "S"
        : `K-${ageRestriction}`
      : ageRestriction;
  const movieDetailsPath = `/movie/${id}`;

  return (
    <article className="rio-movie-card">
      <Link
        className="poster-wrapper"
        to={movieDetailsPath}
        aria-label={`View details for ${title}`}
      >
        <img src={poster} alt={title} className="poster-img" loading="lazy" />
        <div className="poster-overlay"></div>

        {isPremiere && <span className="badge-premiere">Premiere</span>}

        {ageRestriction !== undefined && (
          <span className="badge-age">{ageLabel}</span>
        )}
      </Link>

      {/* Movie card details */}
      <div className="card-body">
        <div className="card-header-info">
          <span className="movie-genre"> {genre}</span>
          <h3 className="movie-title">
            <Link to={movieDetailsPath}>{title}</Link>
          </h3>
        </div>

        {/* If upcoming movies */}
        {!isUpcoming ? (
          <div className="card-footer-info">
            {/* Showtime and room info */}
            {showtime && room && (
              <div className="showtime-tag">
                <ClockIcon />
                <span>{showtime}</span>
                <span className="dot-divider">•</span>
                <span>{room}</span>
              </div>
            )}

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

              <Button
                variant="ticket"
                onClick={() => onSelect?.(movie)}
              >
                Buy Ticket
              </Button>
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
              <Link className="upcoming-details-link" to={movieDetailsPath}>
                <span className="btn-details-link">Details soon</span>
                <span className="btn-details-arrow">
                  <ArrowUpRightIcon size={18} />
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
