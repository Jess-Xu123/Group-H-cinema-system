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
  if (!["100", "200", "unsure"].includes(roomCapacity)) {
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

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/private-screenings/admin
// Staff/Admin: get all enquiries, with optional filters.
async function getPrivateScreeningEnquiries(req, res) {
  try {
    const { status, location, date } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      if (!["pending", "contacted", "confirmed", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }

      params.push(status);
      conditions.push(`e.status = $${params.length}`);
    }

    if (location) {
      if (!["Oulu", "Tampere"].includes(location)) {
        return res.status(400).json({ message: "Invalid location." });
      }

      params.push(location);
      conditions.push(`e.location = $${params.length}`);
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          message: "Date must use YYYY-MM-DD format.",
        });
      }

      params.push(date);
      conditions.push(`e.preferred_date = $${params.length}::date`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
        SELECT
          e.*,
          u.full_name AS reviewer_name,
          s.start_time AS confirmed_start_time,
          m.title AS confirmed_movie_title,
          h.name AS confirmed_hall_name,
          h.city AS confirmed_city
        FROM private_screening_enquiries e
        LEFT JOIN users u ON u.id = e.reviewed_by
        LEFT JOIN showtimes s ON s.id = e.confirmed_showtime_id
        LEFT JOIN movies m ON m.id = s.movie_id
        LEFT JOIN halls h ON h.id = s.hall_id
        ${whereClause}
        ORDER BY
          CASE e.status
            WHEN 'pending' THEN 1
            WHEN 'contacted' THEN 2
            WHEN 'confirmed' THEN 3
            WHEN 'rejected' THEN 4
          END,
          e.created_at DESC
      `,
      params
    );

    return res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch private screening enquiries:", error);

    return res.status(500).json({
      message: "Failed to fetch private screening enquiries.",
    });
  }
}

// GET /api/private-screenings/admin/:id
async function getPrivateScreeningEnquiryById(req, res) {
  const enquiryId = parseId(req.params.id);

  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry ID." });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          e.*,
          u.full_name AS reviewer_name,
          s.start_time AS confirmed_start_time,
          m.title AS confirmed_movie_title,
          h.name AS confirmed_hall_name,
          h.city AS confirmed_city
        FROM private_screening_enquiries e
        LEFT JOIN users u ON u.id = e.reviewed_by
        LEFT JOIN showtimes s ON s.id = e.confirmed_showtime_id
        LEFT JOIN movies m ON m.id = s.movie_id
        LEFT JOIN halls h ON h.id = s.hall_id
        WHERE e.id = $1
      `,
      [enquiryId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Enquiry not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch private screening enquiry:", error);

    return res.status(500).json({
      message: "Failed to fetch private screening enquiry.",
    });
  }
}

// PATCH /api/private-screenings/admin/:id/approve
// Approve means accepting the enquiry and starting arrangements.
// It does NOT mean the screening is finally confirmed.
async function approvePrivateScreeningEnquiry(req, res) {
  const enquiryId = parseId(req.params.id);
  const staffNotes = String(req.body.staff_notes || "").trim();

  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry ID." });
  }

  try {
    const result = await pool.query(
      `
        UPDATE private_screening_enquiries
        SET
          status = 'contacted',
          staff_notes = COALESCE(NULLIF($1, ''), staff_notes),
          reviewed_by = $2,
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
          AND status = 'pending'
        RETURNING *
      `,
      [staffNotes, req.user.userId, enquiryId]
    );

    if (result.rowCount === 0) {
      const exists = await pool.query(
        "SELECT id, status FROM private_screening_enquiries WHERE id = $1",
        [enquiryId]
      );

      if (exists.rowCount === 0) {
        return res.status(404).json({ message: "Enquiry not found." });
      }

      return res.status(409).json({
        message: `This enquiry cannot be approved because its current status is '${exists.rows[0].status}'.`,
      });
    }

    return res.json({
      message: "Enquiry approved. Please contact the customer to arrange the screening.",
      enquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to approve private screening enquiry:", error);

    return res.status(500).json({
      message: "Failed to approve enquiry.",
    });
  }
}

// PATCH /api/private-screenings/admin/:id/reject
async function rejectPrivateScreeningEnquiry(req, res) {
  const enquiryId = parseId(req.params.id);
  const reason = String(req.body.reason || "").trim();

  if (!enquiryId) {
    return res.status(400).json({ message: "Invalid enquiry ID." });
  }

  if (!reason) {
    return res.status(400).json({
      message: "A rejection reason is required.",
    });
  }

  try {
    const result = await pool.query(
      `
        UPDATE private_screening_enquiries
        SET
          status = 'rejected',
          staff_notes = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
          AND status IN ('pending', 'contacted')
        RETURNING *
      `,
      [reason, req.user.userId, enquiryId]
    );

    if (result.rowCount === 0) {
      const exists = await pool.query(
        "SELECT id, status FROM private_screening_enquiries WHERE id = $1",
        [enquiryId]
      );

      if (exists.rowCount === 0) {
        return res.status(404).json({ message: "Enquiry not found." });
      }

      return res.status(409).json({
        message: `This enquiry cannot be rejected because its current status is '${exists.rows[0].status}'.`,
      });
    }

    return res.json({
      message: "Enquiry rejected.",
      enquiry: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to reject private screening enquiry:", error);

    return res.status(500).json({
      message: "Failed to reject enquiry.",
    });
  }
}

// PATCH /api/private-screenings/admin/:id/confirm
// Link an already-created private-company showtime to the enquiry.
async function confirmPrivateScreeningEnquiry(req, res) {
  const enquiryId = parseId(req.params.id);
  const showtimeId = parseId(req.body.showtime_id);
  const staffNotes = String(req.body.staff_notes || "").trim();

  if (!enquiryId || !showtimeId) {
    return res.status(400).json({
      message: "Valid enquiry ID and showtime ID are required.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const enquiryResult = await client.query(
      `
        SELECT *
        FROM private_screening_enquiries
        WHERE id = $1
        FOR UPDATE
      `,
      [enquiryId]
    );

    if (enquiryResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Enquiry not found." });
    }

    const enquiry = enquiryResult.rows[0];

    if (enquiry.status !== "contacted") {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Only contacted enquiries can be confirmed.",
      });
    }

    const showtimeResult = await client.query(
      `
        SELECT
          s.id,
          s.is_private_company,
          s.company_name,
          s.start_time,
          h.city,
          h.capacity
        FROM showtimes s
        JOIN halls h ON h.id = s.hall_id
        WHERE s.id = $1
        FOR UPDATE OF s
      `,
      [showtimeId]
    );

    if (showtimeResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Showtime not found." });
    }

    const showtime = showtimeResult.rows[0];

    if (!showtime.is_private_company) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "The selected showtime is not a private-company screening.",
      });
    }

    if (showtime.city !== enquiry.location) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "The showtime location does not match the enquiry location.",
      });
    }

    if (Number(showtime.capacity) < Number(enquiry.attendees)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "The selected hall does not have enough capacity.",
      });
    }

    if (
      showtime.company_name?.trim().toLowerCase() !==
      enquiry.company_name.trim().toLowerCase()
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "The showtime company name does not match the enquiry.",
      });
    }

    const alreadyLinked = await client.query(
      `
        SELECT id
        FROM private_screening_enquiries
        WHERE confirmed_showtime_id = $1
          AND id <> $2
        LIMIT 1
      `,
      [showtimeId, enquiryId]
    );

    if (alreadyLinked.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "This showtime is already linked to another enquiry.",
      });
    }

    const updated = await client.query(
      `
        UPDATE private_screening_enquiries
        SET
          status = 'confirmed',
          confirmed_showtime_id = $1,
          staff_notes = COALESCE(NULLIF($2, ''), staff_notes),
          reviewed_by = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
      [showtimeId, staffNotes, req.user.userId, enquiryId]
    );

    await client.query("COMMIT");

    return res.json({
      message: "Private screening confirmed successfully.",
      enquiry: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Failed to confirm private screening enquiry:", error);

    return res.status(500).json({
      message: "Failed to confirm private screening enquiry.",
    });
  } finally {
    client.release();
  }
}

module.exports = {
  createPrivateScreeningEnquiry,
  getPrivateScreeningEnquiries,
  getPrivateScreeningEnquiryById,
  approvePrivateScreeningEnquiry,
  rejectPrivateScreeningEnquiry,
  confirmPrivateScreeningEnquiry,
};
