const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Add a new movie
export async function addMovie(movieData) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/movies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(movieData),
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to add movie (${response.status})`
    );
  }

  return result;
}

// Get movies
export async function getMovies() {
  const response = await fetch(`${API_BASE_URL}/api/movies`);

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to fetch movies (${response.status})`
    );
  }

  return result;
}

// Get all movies for admin and staff management
export async function getAdminMovies() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/movies/manage`, {
      method: "GET",
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Failed to fetch movies (${response.status})`
    );
  }

  return result;
}

// Update an existing movie
export async function updateMovie(movieId, movieData) {
  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/movies/${movieId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(movieData),
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please try again later."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Failed to update movie (${response.status})`
    );
  }

  return result;
}

// Delete an existing movie
export async function deleteMovie(movieId) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/movies/${movieId}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please try again later."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      result?.error ||
      `Failed to delete movie (${response.status})`
    );
  }

  return result;
}

export async function importMovie(externalApiId) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/admin/movies/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ external_api_id: externalApiId }),
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error || result?.message || `Failed to import movie (${response.status})`
    );
  }

  return result;
}