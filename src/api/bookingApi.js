const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export async function getMyBookings(signal) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/my-bookings`, {
      method: "GET",
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }

  return result.bookings || [];
}

export async function holdBookingSeats({ showtime_id, seats, customer_email }) {
  const formattedSeats = seats.map((s) => ({
    row_number: Number(s.row_number ?? s.row),
    seat_number: Number(s.position ?? s.seat_number ?? s.number),
    ticket_type: s.ticket_type || "normal",
  }));

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/hold`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        showtime_id,
        seats: formattedSeats,
        customer_email,
      }),
    });
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to lock seats (${response.status}).`,
    );
  }

  return result;
}

// 2. when user click on back to seat selection, release the seats
export async function releaseBookingHold(bookingId, guestToken) {
  if (!bookingId) return;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/hold`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(guestToken ? { "x-guest-checkout-token": guestToken } : {}),
      },
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || "Failed to release the seat hold.");
  }
}

// Convert an active guest checkout into a logged-in reservation.
export async function reserveBooking(bookingId, guestToken) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/reserve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(guestToken
          ? { "x-guest-checkout-token": guestToken }
          : {}),
      },
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to reserve booking (${response.status}).`,
    );
  }

  return result;
}

// Cancel a logged-in user's unpaid reservation.
export async function cancelReservation(bookingId) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      credentials: "include",
    });
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Failed to cancel reservation (${response.status}).`,
    );
  }

  return result;
}


// Get all bookings for Staff/Admin.
export async function getAdminBookings(signal) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/bookings/admin`, {
      method: "GET",
      credentials: "include",
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result.bookings || [];
}

// Confirm offline payment for an unpaid reservation.
export async function confirmOfflinePayment(bookingId) {
  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/bookings/${bookingId}/offline-payment`,
      {
        method: "POST",
        credentials: "include",
      }
    );
  } catch (error) {
    throw new Error("Unable to connect to the cinema server.", {
      cause: error,
    });
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed (${response.status}).`
    );
  }

  return result;
}
