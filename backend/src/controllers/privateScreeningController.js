const pool = require("../config/db");

async function createPrivateScreeningEnquiry(req, res) {
  const {
    companyName,
    contactName,
    email,
    phone,
    location,
    roomCapacity,
    preferredDate,
    preferredTime,
    attendees,
    filmPreference,
    accessibilityNeeds,
    extraDetails,
  } = req.body;

  if (
    !companyName?.trim() ||
    !contactName?.trim() ||
    !email?.trim() ||
    !location ||
    !roomCapacity ||
    !preferredDate ||
    !preferredTime ||
    !attendees ||
    !filmPreference?.trim()
  ) {
    return res.status(400).json({
      message: "Please fill in all required fields.",
    });
  }

  //Verify input attendees must be bigger than 0
  const guestCount = Number(attendees);
  if (!Number.isInteger(guestCount) || guestCount <= 0) {
    return res.status(400).json({
      message: "Number of attendees must be a positive number.",
    });
  }

  //Verify location and capacity
  if (!["Oulu", "Tampere"].includes(location)) {
    return res.status(400).json({
      message: "Invalid cinema location.",
    });
  }
  if (!["100", "200"].includes(roomCapacity)) {
    return res.status(400).json({
      message: "Invalid room capacity option.",
    });
  }

  try {
    // Insert into Database
    const insertQuery = `
        INSERT INTO private_screening_enquiries (
        company_name,
        contact_name,
        email,
        phone,
        location,
        room_capacity,
        preferred_date,
        preferred_time,
        attendees,
        film_preference,
        accessibility_needs,
        extra_details
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, company_name, location, preferred_date, preferred_time, status, created_at;
    `;

    const values = [
      companyName.trim(),
      contactName.trim(),
      email.trim(),
      phone?.trim() || null,
      location,
      roomCapacity,
      preferredDate,
      preferredTime,
      guestCount,
      filmPreference.trim(),
      accessibilityNeeds?.trim() || null,
      extraDetails?.trim() || null,
    ];

    const result = await pool.query(insertQuery, values);
    const newEnquiry = result.rows[0];
    const cityCode = newEnquiry.location === "Oulu" ? "OUL" : "TMP";
    const year = new Date(newEnquiry.created_at).getFullYear();
    const paddedId = String(newEnquiry.id).padStart(4, "0");

    const referenceCode = `RIO-${cityCode}-${year}-${paddedId}`;

    return res.status(201).json({
      message: "Your private screening enquiry has been submitted.",
      enquiry: {
        ...newEnquiry,
        reference_code: referenceCode,
      },
    });
  } catch (error) {
    // capture if submit enquiry repeatedly
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "You already have an active enquiry for this cinema and date. Our team will contact you soon.",
      });
    }

    console.error("Error creating private screening enquiry:", error);
    return res.status(500).json({
      message:
        "Server error while submitting your enquiry. Please try again later.",
    });
  }
}

module.exports = {
  createPrivateScreeningEnquiry,
};
