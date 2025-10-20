-- Create system_settings table for configurable platform settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type TEXT NOT NULL DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only super admins can manage settings
CREATE POLICY "Super admins can manage settings"
  ON system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: All authenticated users can read settings
CREATE POLICY "Authenticated users can read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON system_settings TO authenticated;
GRANT ALL ON system_settings TO service_role;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
  ('credit_price', '10', 'number', 'Price per credit in rupees'),
  ('gst_rate', '0.18', 'number', 'GST tax rate (0.18 = 18%)'),
  ('platform_name', 'Virtual Try-On', 'string', 'Platform name for invoices'),
  ('invoice_terms', 'Credits are non-refundable and valid for 12 months', 'string', 'Terms and conditions for invoices')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'Configurable system-wide settings for the platform';

-- Create function to get setting value
CREATE OR REPLACE FUNCTION get_setting(p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT setting_value INTO v_value
  FROM system_settings
  WHERE setting_key = p_key;

  RETURN v_value;
END;
$$;

-- Create function to update setting
CREATE OR REPLACE FUNCTION update_setting(
  p_key TEXT,
  p_value TEXT,
  p_updated_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE system_settings
  SET
    setting_value = p_value,
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE setting_key = p_key;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_setting(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_setting(TEXT, TEXT, UUID) TO authenticated;
