-- Shorten unpaid reservations to the two-hour cutoff without extending earlier deadlines.
UPDATE bookings b
SET expires_at = LEAST(
  COALESCE(b.expires_at, s.start_time - INTERVAL '2 hours'),
  s.start_time - INTERVAL '2 hours'
)
FROM showtimes s
WHERE b.showtime_id = s.id
  AND b.status = 'reserved_unpaid';