
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
    paid_tickets_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE movies (
    id SERIAL PRIMARY KEY,
    external_api_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, 
    duration_min INT NOT NULL,
    genre VARCHAR(255) NOT NULL,
    age_rating VARCHAR(20) NOT NULL,
    base_price DECIMAL(6, 2), 
    poster_url VARCHAR(255) NOT NULL,
    trailer_url VARCHAR(255) NOT NULL,
    banner_ad_url VARCHAR(255) NOT NULL,
    is_upcoming BOOLEAN NOT NULL DEFAULT FALSE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT check_price_before_publish CHECK (is_published = FALSE OR base_price IS NOT NULL)
);

CREATE TABLE halls (
    id SERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL CHECK (capacity IN (100, 200)),
    total_rows INT NOT NULL CHECK (total_rows IN (10, 20)),
    seats_per_row INT NOT NULL DEFAULT 10,
    wheelchair_limit INT DEFAULT 10
);

CREATE TABLE showtimes (
    id SERIAL PRIMARY KEY,
    movie_id INT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    hall_id INT NOT NULL REFERENCES halls(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    is_premiere BOOLEAN NOT NULL DEFAULT FALSE,
    is_private_company BOOLEAN NOT NULL DEFAULT FALSE,
    company_name VARCHAR(255)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    showtime_id INT NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    customer_email VARCHAR(255) NOT NULL,
    total_amount DECIMAL(8, 2) NOT NULL CHECK (total_amount >= 0),
    stripe_payment_id VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'checkout_locked' 
        CHECK (status IN ('checkout_locked', 'reserved_unpaid', 'paid', 'cancelled')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT registered_only_for_unpaid_reservation 
        CHECK (status != 'reserved_unpaid' OR user_id IS NOT NULL)
);

CREATE TABLE booked_seats (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_id INT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    row_number INT NOT NULL CHECK (row_number >= 0 AND row_number != 13),
    seat_number INT NOT NULL CHECK (seat_number > 0),
    ticket_type VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (ticket_type IN ('normal', 'child_under_12', 'wheelchair', 'loyalty_10th')),
    seat_price DECIMAL(6, 2) NOT NULL CHECK (seat_price >= 0),
    UNIQUE (showtime_id, row_number, seat_number),
    CONSTRAINT protect_owner_throne CHECK (NOT (row_number = 1 AND seat_number = 1)),
    CONSTRAINT wheelchair_row_limit CHECK (row_number != 0 OR (seat_number BETWEEN 1 AND 10))
);

CREATE TABLE premiere_waitlist (
    id SERIAL PRIMARY KEY,
    showtime_id INT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
    customer_email VARCHAR(255) NOT NULL,
    is_notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (showtime_id, customer_email)
);