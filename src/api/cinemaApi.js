const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function getJson(endpoint, signal) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Unable to connect to the cinema server.", { cause: error });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.error || `Cinema server request failed (${response.status}).`,
    );
  }

  return result;
}

export function getMovies(signal) {
  return getJson("/api/movies", signal);
}

export function getShowtimes({ city, date } = {}, signal) {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (date) params.set("date", date);

  const query = params.toString();
  return getJson(`/api/showtimes${query ? `?${query}` : ""}`, signal);
}

export function getShowtimeSeats(showtimeId, signal) {
  return getJson(`/api/showtimes/${showtimeId}/seats`, signal);
}
