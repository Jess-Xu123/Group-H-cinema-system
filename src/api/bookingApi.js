const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function getMyBookings(signal) {
  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/bookings/my-bookings`,
      {
        method: "GET",
        credentials: "include",
        signal,
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result.bookings || [];
}
