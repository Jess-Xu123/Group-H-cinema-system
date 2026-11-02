const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function authRequest(endpoint, data) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error(
      "Unable to connect to the server. Please try again later."
    );
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export function registerUser(userData) {
  return authRequest("/api/auth/register", userData);
}

export function loginUser(credentials) {
  return authRequest("/api/auth/login", credentials);
}