const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function adminShowtimeRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/admin/showtimes${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || result.message || `Request failed (${response.status})`);
  }

  return result;
}

export function getAdminShowtimes() {
  return adminShowtimeRequest("");
}

export function getShowtimeOptions() {
  return adminShowtimeRequest("/options");
}

export function createShowtime(data) {
  return adminShowtimeRequest("", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateShowtime(id, data) {
  return adminShowtimeRequest(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteShowtime(id) {
  return adminShowtimeRequest(`/${id}`, {
    method: "DELETE",
  });
}
