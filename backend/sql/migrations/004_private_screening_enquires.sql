BEGIN;

CREATE TABLE IF NOT EXISTS private_screening_enquiries (
    -- This is the Inquiry ID
    id SERIAL PRIMARY KEY,

    -- Company and contact info
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),

    -- Booking Information
    location VARCHAR(50) NOT NULL CHECK (location IN ('Oulu', 'Tampere')),
    room_capacity VARCHAR(20) NOT NULL CHECK (room_capacity IN ('100', '200', 'unsure')),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    attendees INT NOT NULL CHECK (attendees > 0),
    film_preference VARCHAR(255) NOT NULL,

    -- Optional Information
    accessibility_needs TEXT,
    extra_details TEXT,

    -- Enquires status
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'contacted', 'confirmed', 'rejected')),
    
    -- Confirmed showtime for the private booking
    confirmed_showtime_id INT REFERENCES showtimes(id) ON DELETE SET NULL,
    staff_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Forbid to submit the same email, same city, same day reservation
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_enquiry_per_email_date
ON private_screening_enquiries (LOWER(email), location, preferred_date)
WHERE status IN ('pending', 'contacted');

-- For ADMIN 
-- 1. Admin can filter inquiry status and date
CREATE INDEX IF NOT EXISTS idx_private_enquiries_status_date
ON private_screening_enquiries (status, preferred_date);

-- 2. Admin can filter with email (Case insensetive)
CREATE INDEX IF NOT EXISTS idx_private_enquiries_email
ON private_screening_enquiries (LOWER(email));

-- 3. Admin can filter with company name（Case insensetive）
CREATE INDEX IF NOT EXISTS idx_private_enquiries_company_name
ON private_screening_enquiries (LOWER(company_name));

COMMIT;