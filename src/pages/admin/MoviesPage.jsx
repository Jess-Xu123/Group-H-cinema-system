import { useCallback, useEffect, useRef, useState } from "react";
import MovieForm from "../../components/admin/MovieForm";
import {
  getAdminMovies,
  deleteMovie
} from "../../api/movieApi";
import "../../css/admin/AdminMovies.css";

function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingMovie, setEditingMovie] = useState(null);

  const [deletingMovieId, setDeletingMovieId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const movieFormRef = useRef(null);

  const loadMovies = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await getAdminMovies();
      setMovies(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  function handleMovieAdded(newMovie) {
    setMovies((prevMovies) => [...prevMovies, newMovie]);

    setEditingMovie(null);

    setTimeout(() => {
      movieFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      });
    }, 100);
  }

  function handleMovieUpdated(updatedMovie) {
    setMovies((prevMovies) =>
      prevMovies.map((movie) =>
        movie.id === updatedMovie.id ? updatedMovie : movie
      )
  );

  setEditingMovie(null);

  setTimeout(() => {
      movieFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      });
    }, 100);
  }

  function handleCancelEdit() {
    setEditingMovie(null);
  }

  async function handleDeleteMovie(movie) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${movie.title}"? This action cannot be undone.`
    );

      if (!confirmed) {
          return;
      }

      setDeletingMovieId(movie.id);
      setDeleteError("");

      try {
          await deleteMovie(movie.id);

          setMovies((prevMovies) =>
          prevMovies.filter((item) => item.id !== movie.id)
          );

          if (editingMovie?.id === movie.id) {
          setEditingMovie(null);
          }
      } catch (err) {
          setDeleteError(err.message);
      } finally {
          setDeletingMovieId(null);
      }
    }

    function handleEditMovie(movie) {
        setEditingMovie(movie);

        setTimeout(() => {
            movieFormRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
            });
        }, 100);
    }

  return (
    <div className="admin-movies-page">
      <div className="admin-page-header">
        <h1>Movie Management</h1>
        <p>Manage movies in RIO Cinema.</p>
      </div>

    <div ref={movieFormRef} className="movie-form-section">
    <MovieForm
        onMovieAdded={handleMovieAdded}
        editingMovie={editingMovie}
        onMovieUpdated={handleMovieUpdated}
        onCancelEdit={handleCancelEdit}
    />
    </div>

      <section className="movie-list-section">
        <h2>Movies</h2>

        {isLoading && <p>Loading movies...</p>}

        {error && <p className="form-error">{error}</p>}

        {!isLoading && !error && movies.length === 0 && (
          <p>No movies found.</p>
        )}

        {deleteError && (
          <p className="form-error">{deleteError}</p>
        )}

        {!isLoading && movies.length > 0 && (
          <div className="movie-list">
            {movies.map((movie) => (
              <div className="movie-list-item" key={movie.id}>
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="movie-poster"
                />

                <div className="movie-info">
                  <h3>{movie.title}</h3>
                  <p>{movie.genre}</p>
                  <p>{movie.duration_min} minutes</p>
                  <p>Age Rating: {movie.age_rating}</p>

                  <span>
                    {movie.is_published ? "Published" : "Unpublished"}
                  </span>
                    {movie.is_upcoming && <span> Upcoming</span>}
                </div>

                <button type="button" className="movie-edit-button" onClick={() => handleEditMovie(movie)}>
                    Edit
                </button>

                <button
                type="button"
                className="movie-delete-button"
                onClick={() => handleDeleteMovie(movie)}
                disabled={deletingMovieId === movie.id}
                >
                {deletingMovieId === movie.id ? "Deleting..." : "Delete"}
                </button>
                
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default MoviesPage;