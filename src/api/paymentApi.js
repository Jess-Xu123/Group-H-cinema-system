const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function createCheckoutSession(
  bookingData,
  guestToken = null
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (guestToken) {
    headers["x-guest-checkout-token"] = guestToken;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/payment/create-checkout-session`,
    {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(bookingData),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message ||
        `Failed to create checkout session (${response.status}).`
    );
  }

  return result;
}
