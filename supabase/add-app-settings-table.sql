-- Create the app_settings table
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read settings
CREATE POLICY "Allow authenticated users to read app_settings"
ON app_settings FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for super_admins to insert, update, and delete settings
CREATE POLICY "Allow super_admins to manage app_settings"
ON app_settings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'super_admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'super_admin'));

-- Initial data for pose_tolerance
INSERT INTO app_settings (key, value)
VALUES ('pose_tolerance', '30'::jsonb);