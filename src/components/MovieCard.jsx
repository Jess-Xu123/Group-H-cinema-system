import "../css/MovieCard.css";

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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <g clipPath="url(#clip0_2_1000)">
                  <path
                    d="M7 3.49972V7H9.33352M12.8338 7C12.8338 10.2219 10.2219 12.8338 7 12.8338C3.77808 12.8338 1.1662 10.2219 1.1662 7C1.1662 3.77808 3.77808 1.1662 7 1.1662C10.2219 1.1662 12.8338 3.77808 12.8338 7Z"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    stroke="#9CA3AF"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2_1000">
                    <rect width="14" height="14" fill="white" />
                  </clipPath>
                </defs>
              </svg>
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

              <button className="btn-buy-ticket">
                Buy Ticket
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M9.9162 9.9162V4.0838H4.0838M9.9162 4.0838L4.0838 9.9162"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    stroke="#E3B757"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="card-footer-info upcoming">
            <div className="upcoming-sub-info">
              <span className="clock-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <g clipPath="url(#clip0_9_28)">
                    <path
                      d="M7 3.49978V7.00006H9.33352M12.8338 7.00006C12.8338 10.222 10.2219 12.8339 7 12.8339C3.77808 12.8339 1.1662 10.222 1.1662 7.00006C1.1662 3.77814 3.77808 1.16626 7 1.16626C10.2219 1.16626 12.8338 3.77814 12.8338 7.00006Z"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      stroke="#9CA3AF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_9_28">
                      <rect width="14" height="14" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </span>
              <span>{releaseDate || "Coming Soon"}</span>
            </div>
            <div className="upcoming-details-row">
              <span className="btn-details-link">Details soon</span>
              <span className="btn-details-arrow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M9.9162 9.9162V4.0838H4.0838M9.9162 4.0838L4.0838 9.9162"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    stroke="#E3B757"
                  />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
