BEGIN;

ALTER TABLE booked_seats
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_token_hash TEXT NULL;

-- Replace the old status CHECK with one that includes system expiration.
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'checkout_locked',
    'reserved_unpaid',
    'paid',
    'cancelled',
    'expired'
  ));

-- Backfill expiry timestamps for older active bookings before enforcing the rule.
UPDATE bookings b
SET expires_at = CASE
  WHEN b.status = 'checkout_locked'
    THEN b.created_at + INTERVAL '15 minutes'
  WHEN b.status = 'reserved_unpaid'
    THEN s.start_time - INTERVAL '15 minutes'
  ELSE b.expires_at
END
FROM showtimes s
WHERE b.showtime_id = s.id
  AND b.status IN ('checkout_locked', 'reserved_unpaid')
  AND b.expires_at IS NULL;

-- Convert already-expired active records into historical expired records.
UPDATE bookings
SET status = 'expired'
WHERE status IN ('checkout_locked', 'reserved_unpaid')
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();

-- Existing cancelled/expired seats are historical, not active occupancy.
UPDATE booked_seats bs
SET released_at = COALESCE(b.expires_at, NOW())
FROM bookings b
WHERE b.id = bs.booking_id
  AND b.status IN ('cancelled', 'expired')
  AND bs.released_at IS NULL;

-- The old UNIQUE constraint blocks reuse even after a seat is released.
-- Find and remove only the unique constraint on these exact three columns.
DO $$
DECLARE
  constraint_name TEXT;
  target_columns SMALLINT[];
BEGIN
  SELECT ARRAY[
    (SELECT attnum FROM pg_attribute
     WHERE attrelid = 'booked_seats'::regclass AND attname = 'showtime_id'),
    (SELECT attnum FROM pg_attribute
     WHERE attrelid = 'booked_seats'::regclass AND attname = 'row_number'),
    (SELECT attnum FROM pg_attribute
     WHERE attrelid = 'booked_seats'::regclass AND attname = 'seat_number')
  ]::SMALLINT[]
  INTO target_columns;

  SELECT conname
  INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'booked_seats'::regclass
    AND contype = 'u'
    AND conkey = target_columns
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE booked_seats DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_booked_seat
ON booked_seats (showtime_id, row_number, seat_number)
WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_expiration
ON bookings (expires_at)
WHERE status IN ('checkout_locked', 'reserved_unpaid');

CREATE INDEX IF NOT EXISTS idx_booked_seats_booking_id
ON booked_seats (booking_id);

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS unpaid_booking_requires_expiry;

ALTER TABLE bookings
  ADD CONSTRAINT unpaid_booking_requires_expiry
  CHECK (
    status NOT IN ('checkout_locked', 'reserved_unpaid')
    OR expires_at IS NOT NULL
  );

COMMIT;
