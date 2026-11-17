const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function getTicketDiscounts(signal) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/ticket-discounts`, {
      method: "GET",
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Unable to connect to the cinema server.", { cause: error });
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }
  return result;
}

export async function updateTicketDiscounts(settings) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/ticket-discounts`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", { cause: error });
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }
  return result;
}
