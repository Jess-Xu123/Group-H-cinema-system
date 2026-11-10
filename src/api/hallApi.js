const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

// Shared request function
async function hallRequest(endpoint) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    throw new Error(
      "Unable to connect to the server. Please try again later."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}

// Get all halls
export async function getHalls() {
  return hallRequest("/api/halls");
}

// Get one hall
export async function getHallById(id) {
  return hallRequest(`/api/halls/${id}`);
}

// Get monthly hall statistics
export async function getHallStatistics(month) {
  return hallRequest(
    `/api/halls/statistics?month=${encodeURIComponent(month)}`
  );
}
