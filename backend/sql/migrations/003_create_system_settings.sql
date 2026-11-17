-- Run this migration once in the database
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value INTEGER NOT NULL CHECK (setting_value BETWEEN 0 AND 100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (setting_key, setting_value)
VALUES
    ('child_ticket_discount_percent', 50),
    ('loyalty_ticket_discount_percent', 50)
ON CONFLICT (setting_key) DO NOTHING;
