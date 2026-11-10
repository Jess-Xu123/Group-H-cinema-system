const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function userRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
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

export async function getUserStatistics() {
  return userRequest("/api/users/statistics");
}

export async function getUsers({
  search = "",
  role = "",
  cinema = "",
  page = 1,
  limit = 10,
} = {}) {
  const params = new URLSearchParams();

  if (search.trim()) params.set("search", search.trim());
  if (role) params.set("role", role);
  if (cinema) params.set("cinema", cinema);

  params.set("page", String(page));
  params.set("limit", String(limit));

  return userRequest(`/api/users?${params.toString()}`);
}

export async function getUserById(id) {
  return userRequest(`/api/users/${id}`);
}

export async function updateUserRole(id, role) {
  return userRequest(`/api/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
