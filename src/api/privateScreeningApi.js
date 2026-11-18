const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function createPrivateScreeningEnquiry(enquiryData) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/private-screenings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enquiryData),
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || "Failed to submit screening enquiry.");
  }

  return result;
}
