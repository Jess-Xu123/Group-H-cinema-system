INSERT INTO users (full_name, email, password_hash, role, paid_tickets_count)
VALUES
    ('User 1 (Admin)', 'admin@test.com', '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu', 'admin', 0),
    ('User 2 (Staff)', 'staff@test.com', '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu', 'staff', 0),
    ('User 3 (Customer)', 'customer@test.com', '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu', 'customer', 9);

INSERT INTO halls (city, name, capacity, total_rows, seats_per_row, wheelchair_limit)
VALUES
    ('Oulu', 'Hall 1', 100, 10, 10, 10),
    ('Oulu', 'Hall 2', 200, 20, 10, 10),
    ('Tampere', 'Hall 1', 100, 10, 10, 10),
    ('Tampere', 'Hall 2', 200, 20, 10, 10);

INSERT INTO movies (
    external_api_id, title, description, duration_min, genre, 
    age_rating, base_price, poster_url, trailer_url, banner_ad_url, 
    is_upcoming, is_published
)
VALUES
    (
        'api_1', 'Movie 1', 'Description for Movie 1.', 120, 'Action', 
        'S', 12.00, 'https://placehold.co/300x450?text=Movie+1', 
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://placehold.co/800x200?text=Ad+1', 
        FALSE, TRUE
    ),
    (
        'api_2', 'Movie 2', 'Description for Movie 2', 135, 'Thriller', 
        'K-15', 14.00, 'https://placehold.co/300x450?text=Movie+2', 
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://placehold.co/800x200?text=Ad+2', 
        FALSE, TRUE
    ),
    (
        'api_3', 'Movie 3', 'Description for Movie 3', 110, 'Horror', 
        'K-18', 15.00, 'https://placehold.co/300x450?text=Movie+3', 
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://placehold.co/800x200?text=Ad+3', 
        FALSE, TRUE
    ),
    (
        'api_4', 'Movie 4', 'Description for Movie 4', 105, 'Comedy', 
        'K-12', 13.00, 'https://placehold.co/300x450?text=Movie+4', 
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://placehold.co/800x200?text=Ad+4', 
        TRUE, TRUE
    );

INSERT INTO showtimes (movie_id, hall_id, start_time, is_premiere, is_private_company, company_name)
VALUES
    (1, 1, '2026-11-10 18:00:00+02', FALSE, FALSE, NULL),
    (1, 3, '2026-11-10 18:00:00+02', FALSE, FALSE, NULL),
    (2, 2, '2026-11-11 18:00:00+02', FALSE, FALSE, NULL),
    (3, 4, '2026-11-12 18:00:00+02', TRUE, FALSE, NULL),
    (1, 1, '2026-11-13 18:00:00+02', FALSE, TRUE, 'Company 1');