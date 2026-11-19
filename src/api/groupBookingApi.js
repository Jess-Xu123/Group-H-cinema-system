const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}/api/bookings${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function createGroupBookingRequest({ showtime_id, seats }) {
  return request("/group-requests", {
    method: "POST",
    body: JSON.stringify({ showtime_id, seats }),
  });
}

export function getMyGroupBookingRequests(signal) {
  return request("/group-requests/my", {
    method: "GET",
    signal,
  });
}

export function getAdminGroupBookingRequests(signal) {
  return request("/group-requests/admin", {
    method: "GET",
    signal,
  });
}

export function approveGroupBookingRequest(requestId, note = "") {
  return request(`/group-requests/${requestId}/approve`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export function rejectGroupBookingRequest(requestId, note = "") {
  return request(`/group-requests/${requestId}/reject`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}