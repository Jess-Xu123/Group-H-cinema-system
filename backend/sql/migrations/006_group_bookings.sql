BEGIN;

CREATE TABLE IF NOT EXISTS group_booking_requests (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    showtime_id INT NOT NULL
        REFERENCES showtimes(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    booking_id INT UNIQUE
        REFERENCES bookings(id) ON DELETE SET NULL,
    reviewed_by INT
        REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    approval_note TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_booking_request_seats (
    id SERIAL PRIMARY KEY,
    request_id INT NOT NULL
        REFERENCES group_booking_requests(id) ON DELETE CASCADE,
    row_number INT NOT NULL
        CHECK (row_number >= 0 AND row_number != 13),
    seat_number INT NOT NULL
        CHECK (seat_number > 0),
    ticket_type VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (
            ticket_type IN (
                'normal',
                'child_under_12',
                'wheelchair',
                'loyalty_10th'
            )
        ),

    CONSTRAINT group_request_unique_seat
        UNIQUE (request_id, row_number, seat_number),

    CONSTRAINT group_request_protect_owner_throne
        CHECK (NOT (row_number = 1 AND seat_number = 1)),

    CONSTRAINT group_request_wheelchair_row_limit
        CHECK (row_number != 0 OR seat_number BETWEEN 1 AND 10)
);

CREATE INDEX IF NOT EXISTS idx_group_requests_customer
ON group_booking_requests(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_requests_status
ON group_booking_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_request_seats_request
ON group_booking_request_seats(request_id);

COMMIT;