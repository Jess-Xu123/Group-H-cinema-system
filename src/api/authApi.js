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

export async function getCurrentUser() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export function logoutUser() {
  return authRequest("/api/auth/logout");
}

export async function updateUserProfile(profileData) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(profileData),
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export async function changeUserPassword(passwordData) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(passwordData),
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export async function deleteUserAccount(passwordData) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(passwordData),
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export async function getDashboardAlerts() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/alerts`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status})`
    );
  }

  return result;
}

export async function getTodayProgramme() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/today-programme`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status})`);
  }

  return result;
}

export async function getRoomOccupancy() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard/room-occupancy`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    throw new Error("Unable to connect to the server.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status})`);
  }

  return result;
}