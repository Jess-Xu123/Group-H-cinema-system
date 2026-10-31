DROP TABLE IF EXISTS showtimes CASCADE;
DROP TABLE IF EXISTS movies CASCADE;
DROP TABLE IF EXISTS halls CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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