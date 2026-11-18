ALTER TABLE private_screening_enquiries
ADD COLUMN IF NOT EXISTS reviewed_by INT
REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE private_screening_enquiries
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;