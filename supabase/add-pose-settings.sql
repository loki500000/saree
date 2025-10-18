-- ============================================
-- ADD POSE MATCHING SETTINGS TABLE
-- ============================================
-- Run this in Supabase SQL Editor

-- Create app_settings table for global application settings
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(255) PRIMARY KEY,
    value INTEGER NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default pose tolerance setting (30% difference allowed)
INSERT INTO app_settings (key, value, description)
VALUES ('pose_tolerance', 30, 'Maximum allowed pose difference percentage (0-100)')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verification query
SELECT * FROM app_settings WHERE key = 'pose_tolerance';
