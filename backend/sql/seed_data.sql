TRUNCATE TABLE premiere_waitlist,
booked_seats,
bookings,
showtimes,
movies,
halls,
users
RESTART IDENTITY CASCADE;

INSERT INTO
    users (
        full_name,
        email,
        password_hash,
        role,
        paid_tickets_count
    )
VALUES (
        'User 1 (Admin)',
        'admin@test.com',
        '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu',
        'admin',
        0
    ),
    (
        'User 2 (Staff)',
        'staff@test.com',
        '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu',
        'staff',
        0
    ),
    (
        'User 3 (Customer)',
        'customer@test.com',
        '$2b$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstu',
        'customer',
        9
    );

INSERT INTO
    halls (
        city,
        name,
        capacity,
        total_rows,
        seats_per_row,
        wheelchair_limit
    )
VALUES (
        'Oulu',
        'Hall 1',
        100,
        10,
        10,
        10
    ),
    (
        'Oulu',
        'Hall 2',
        200,
        20,
        10,
        10
    ),
    (
        'Tampere',
        'Hall 1',
        100,
        10,
        10,
        10
    ),
    (
        'Tampere',
        'Hall 2',
        200,
        20,
        10,
        10
    );

INSERT INTO
    movies (
        external_api_id,
        title,
        description,
        duration_min,
        genre,
        age_rating,
        base_price,
        poster_url,
        trailer_url,
        banner_ad_url,
        is_upcoming,
        is_published
    )
VALUES (
        'api_1',
        'Movie 1',
        'Description for Movie 1.',
        120,
        'Action',
        'S',
        12.00,
        'https://placehold.co/300x450?text=Movie+1',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://placehold.co/800x200?text=Ad+1',
        FALSE,
        TRUE
    ),
    (
        'api_2',
        'Movie 2',
        'Description for Movie 2',
        135,
        'Thriller',
        'K-15',
        14.00,
        'https://placehold.co/300x450?text=Movie+2',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://placehold.co/800x200?text=Ad+2',
        FALSE,
        TRUE
    ),
    (
        'api_3',
        'Movie 3',
        'Description for Movie 3',
        110,
        'Horror',
        'K-18',
        15.00,
        'https://placehold.co/300x450?text=Movie+3',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://placehold.co/800x200?text=Ad+3',
        FALSE,
        TRUE
    ),
    (
        'api_4',
        'Movie 4',
        'Description for Movie 4',
        105,
        'Comedy',
        'K-12',
        13.00,
        'https://placehold.co/300x450?text=Movie+4',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://placehold.co/800x200?text=Ad+4',
        FALSE,
        TRUE
    ),
    (
        'api_5',
        'The Odyssey',
        'After the Trojan War, Odysseus faces a dangerous voyage back to Ithaca, meeting creatures like the Cyclops Polyphemus, Sirens, and Calypso along the way.',
        172,
        'ACTION',
        'K-15',
        16.00,
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/The%20Odyssey.jpg',
        'https://www.youtube.com/watch?v=Mzw2ttJD2qQ',
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/The%20Odyssey.jpg',
        FALSE,
        TRUE
    ),
    (
        'api_6',
        'Obsession',
        'After breaking the mysterious "One Wish Willow" to win his crush''s heart, a hopeless romantic finds himself getting exactly what he asked for but soon discovers that some desires come at a dark, sinister price.',
        109,
        'HORROR',
        'R',
        14.00,
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/obsession.jpg',
        'https://www.youtube.com/watch?v=gMC8kkwbIQQ',
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/obsession.jpg',
        FALSE,
        TRUE
    ),
    (
        'api_7',
        'You Can See Everything',
        'Thirty-four days before she''s sent to prison, notorious Theranos founder Elizabeth Holmes invites a skeptical film crew to document her every move. What begins as an intimate portrait becomes a mind-bending three-year journey.',
        174,
        'CRIME',
        'R',
        16.00,
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/you_can_see_everything.jpeg',
        'https://www.youtube.com/watch?v=HvW_N5p1q44',
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/you_can_see_everything.jpeg',
        FALSE,
        TRUE
    ),
    (
        'api_8',
        'Resident Evil',
        'A hapless courier is tasked with delivering a package to a remote hospital. He soon finds himself caught in the middle of an outbreak and must fight through hordes of mutated creatures to survive.',
        94,
        'HORROR',
        'R',
        16.00,
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/residence_eveil.jpeg',
        'https://www.youtube.com/watch?v=mNd1gb19A-c',
        'https://a3s.fi/swift/v1/Rio-media/movie%20poster/residence_eveil.jpeg',
        FALSE,
        TRUE
    );

INSERT INTO
    showtimes (
        movie_id,
        hall_id,
        start_time,
        is_premiere,
        is_private_company,
        company_name
    )
VALUES (
        1,
        1,
        '2026-11-15 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 1 (Oulu Hall 1)
    (
        2,
        2,
        '2026-11-16 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 2 (Oulu Hall 2)
    (
        3,
        1,
        '2026-11-17 17:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 3 (Oulu Hall 1)
    (
        4,
        2,
        '2026-11-20 18:00:00+02',
        TRUE,
        FALSE,
        NULL
    ), -- Movie 4 (Oulu Hall 2)
    (
        5,
        1,
        '2026-11-19 15:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- The Odyssey (Oulu Hall 1)
    (
        6,
        2,
        '2026-11-22 19:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Obsession (Oulu Hall 2)
    (
        7,
        1,
        '2026-11-25 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- You Can See Everything (Oulu Hall 1)
    (
        8,
        2,
        '2026-11-23 20:00:00+02',
        TRUE,
        FALSE,
        NULL
    ),
    (
        1,
        3,
        '2026-11-16 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 1 (Tampere Hall 1)
    (
        2,
        4,
        '2026-11-19 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 2 (Tampere Hall 2)
    (
        3,
        3,
        '2026-11-18 17:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Movie 3 (Tampere Hall 1)
    (
        4,
        4,
        '2026-11-17 18:00:00+02',
        TRUE,
        FALSE,
        NULL
    ), -- Movie 4 (Tampere Hall 2)
    (
        5,
        3,
        '2026-11-19 15:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- The Odyssey (Tampere Hall 1)
    (
        6,
        4,
        '2026-11-26 19:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- Obsession (Tampere Hall 2)
    (
        7,
        3,
        '2026-11-16 18:00:00+02',
        FALSE,
        FALSE,
        NULL
    ), -- You Can See Everything (Tampere Hall 1)
    (
        8,
        4,
        '2026-11-27 20:00:00+02',
        TRUE,
        FALSE,
        NULL
    );
-- Resident Evil (Tampere Hall 2);

INSERT INTO
    bookings (
        user_id,
        showtime_id,
        customer_email,
        total_amount,
        stripe_payment_id,
        status,
        expires_at
    )
VALUES (
        3,
        1,
        'customer@test.com',
        18.00,
        'pi_test_123456',
        'paid',
        NULL
    ),
    (
        3,
        3,
        'customer@test.com',
        28.00,
        NULL,
        'reserved_unpaid',
        '2026-11-11 16:00:00+02'
    ),
    (
        NULL,
        4,
        'guest@test.com',
        17.25,
        NULL,
        'checkout_locked',
        '2026-11-12 17:15:00+02'
    );

INSERT INTO
    booked_seats (
        booking_id,
        showtime_id,
        row_number,
        seat_number,
        ticket_type,
        seat_price
    )
VALUES (1, 1, 1, 2, 'normal', 12.00),
    (
        1,
        1,
        1,
        3,
        'child_under_12',
        6.00
    ),
    (2, 3, 2, 1, 'normal', 14.00),
    (2, 3, 2, 2, 'normal', 14.00),
    (
        3,
        4,
        0,
        1,
        'wheelchair',
        17.25
    );

INSERT INTO
    premiere_waitlist (
        showtime_id,
        customer_email,
        is_notified
    )
VALUES (
        4,
        'waitlist1@test.com',
        FALSE
    ),
    (
        4,
        'waitlist2@test.com',
        FALSE
    );

/*Update Seed data Now shown movie title, genre, poster URLs */
UPDATE movies
SET
    title = 'Dune: Part Two',
    genre = 'SCI-FI / ADVENTURE',
    description = 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Faced with a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.',
    poster_url = 'https://a3s.fi/swift/v1/Rio-media/movie%20poster/dune.jpg'
WHERE
    external_api_id = 'api_1';

UPDATE movies
SET
    title = 'Oppenheimer',
    genre = 'DRAMA / HISTORY',
    description = 'The story of J. Robert Oppenheimer, the physics professor who led the Manhattan Project to develop the first nuclear weapons during World War II, exploring his triumph and the political fallout that followed.',
    poster_url = 'https://a3s.fi/swift/v1/Rio-media/movie%20poster/oppenheimer.jpg'
WHERE
    external_api_id = 'api_2';

UPDATE movies
SET
    title = 'Inside Out 2',
    genre = 'ANIMATION / FAMILY',
    description = 'Disney and Pixar''s Inside Out 2 returns to the mind of newly minted teenager Riley. Joy, Sadness, Anger, Fear and Disgust face sudden demolition as new Emotions like Anxiety arrive to shake up Headquarters.',
    poster_url = 'https://a3s.fi/swift/v1/Rio-media/movie%20poster/insideout.png'
WHERE
    external_api_id = 'api_3';

UPDATE movies
SET
    title = 'Joker 2',
    genre = 'THRILLER / DRAMA',
    description = 'Arthur Fleck is institutionalized at Arkham awaiting trial for his crimes as Joker. While struggling with his dual identity, Arthur not only stumbles upon true love, but also finds the music that''s always been inside him.',
    poster_url = 'https://a3s.fi/swift/v1/Rio-media/movie%20poster/Joker2.jpg',
    is_upcoming = FALSE
WHERE
    external_api_id = 'api_4';

/*Insert Upcoming Movies data*/
INSERT INTO
    movies (
        external_api_id,
        title,
        description,
        duration_min,
        genre,
        age_rating,
        base_price,
        poster_url,
        trailer_url,
        banner_ad_url,
        is_upcoming,
        is_published
    )
VALUES (
        'api_dune3',
        'Dune: Part Three',
        'The story continues with Paul Atreides as Messiah of Dune.',
        150,
        'SCI-FI / ADVENTURE',
        'K-12',
        NULL,
        'https://a3s.fi/swift/v1/Rio-media/movie poster/dune3.jpg',
        'https://www.youtube.com/watch?v=uJqaGLmZpGo',
        'https://a3s.fi/swift/v1/Rio-media/movie poster/dune3.jpg',
        TRUE,
        FALSE
    ),
    (
        'api_lotr_gollum',
        'The Lord of the Rings: The Hunt for Gollum',
        'An upcoming Middle-earth adventure focusing on the untold story of Gollum.',
        140,
        'DRAMA / FICTION',
        'K-12',
        NULL,
        'https://a3s.fi/swift/v1/Rio-media/movie poster/The Lord of the Rings_ The Hunt for Gollum.jpg',
        'https://www.youtube.com/watch?v=WF2RtLKHU_U',
        'https://a3s.fi/swift/v1/Rio-media/movie poster/The Lord of the Rings_ The Hunt for Gollum.jpg',
        TRUE,
        FALSE
    ),
    (
        'api_thomas_crown',
        'The Thomas Crown Affair',
        'A thrill-seeking billionaire plays a game of cat-and-mouse.',
        120,
        'THRILLER / ACTION',
        'K-16',
        NULL,
        'https://a3s.fi/swift/v1/Rio-media/movie poster/The Thomas Crown Affair.jpg',
        'https://www.youtube.com/watch?v=gnm4HgIAVmU',
        'https://a3s.fi/swift/v1/Rio-media/movie poster/The Thomas Crown Affair.jpg',
        TRUE,
        FALSE
    ),
    (
        'api_iceage6',
        'Ice Age: Boiling Point',
        'Manny, Sid, and Diego face global warming in their wildest adventure yet.',
        100,
        'ANIMATION / ADVENTURE',
        'S',
        NULL,
        'https://a3s.fi/swift/v1/Rio-media/movie poster/Ice Age_ Boiling Point.jpg',
        'https://www.youtube.com/watch?v=9Lh6uwe6WY0',
        'https://a3s.fi/swift/v1/Rio-media/movie poster/Ice Age_ Boiling Point.jpg',
        TRUE,
        FALSE
    ) ON CONFLICT (external_api_id) DO NOTHING;