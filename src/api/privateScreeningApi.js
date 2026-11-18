const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function privateScreeningRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/private-screenings${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error("Unable to connect to the server. Please try again later.");
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || "Private screening request failed."
    );
  }

  return result;
}

// Public: submit an enquiry
export async function createPrivateScreeningEnquiry(enquiryData) {
  return privateScreeningRequest("", {
    method: "POST",
    body: JSON.stringify(enquiryData),
  });
}

// Admin/Staff: get all enquiries
export async function getPrivateScreeningEnquiries() {
  const result = await privateScreeningRequest("/admin");

  if (Array.isArray(result)) return result;
  return result?.enquiries || result?.data || [];
}

// Admin/Staff: get one enquiry
export async function getPrivateScreeningEnquiryById(id) {
  const result = await privateScreeningRequest(`/admin/${id}`);

  return result?.enquiry || result?.data || result;
}

// Admin/Staff: approve an enquiry
export async function approvePrivateScreeningEnquiry(id, staffNotes = "") {
  return privateScreeningRequest(`/admin/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({
      staff_notes: staffNotes,
    }),
  });
}

// Admin/Staff: reject an enquiry
export async function rejectPrivateScreeningEnquiry(id, reason) {
  return privateScreeningRequest(`/admin/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({
      reason,
    }),
  });
}

// Admin/Staff: confirm an enquiry
export async function confirmPrivateScreeningEnquiry(
  id,
  showtimeId,
  staffNotes = ""
) {
  return privateScreeningRequest(`/admin/${id}/confirm`, {
    method: "PATCH",
    body: JSON.stringify({
      showtime_id: Number(showtimeId),
      staff_notes: staffNotes,
    }),
  });
}

