export async function createCheckoutSession(bookingData) {
  const response = await fetch(
    "http://localhost:3000/api/payment/create-checkout-session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  return response.json();
}
