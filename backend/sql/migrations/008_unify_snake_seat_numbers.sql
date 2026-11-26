-- Ordinary bookings historically stored the seat's visual position within a row.
-- Convert them to the actual seat labels used by the S-shaped seat map.
-- Group bookings already store actual labels and are intentionally excluded.
UPDATE booked_seats bs
SET seat_number = CASE
  WHEN bs.row_number = 1 THEN bs.seat_number
  WHEN bs.row_number = 2 AND bs.seat_number <= 8
    THEN 22 - bs.seat_number
  WHEN bs.row_number = 2
    THEN 21 - bs.seat_number
  ELSE bs.row_number * 10 + 2 - bs.seat_number
END
FROM bookings b
JOIN showtimes s ON s.id = b.showtime_id
JOIN halls h ON h.id = s.hall_id
WHERE bs.booking_id = b.id
  AND NOT EXISTS (
    SELECT 1
    FROM group_booking_requests gbr
    WHERE gbr.booking_id = b.id
  )
  AND bs.row_number BETWEEN 1 AND h.total_rows
  AND bs.row_number <> 13
  AND bs.seat_number BETWEEN 1 AND h.seats_per_row;
