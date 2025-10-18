-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'store-gallery',
    'store-gallery',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow authenticated users to upload to their store folder
CREATE POLICY "Store admins can upload to their store folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'store-gallery' AND
    (storage.foldername(name))[1] = (
        SELECT store_id::text
        FROM profiles
        WHERE id = auth.uid()
        AND role IN ('store_admin', 'super_admin')
        AND active = true
    )
);

-- Allow public read access to all images
CREATE POLICY "Public can view all gallery images"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-gallery');

-- Allow store admins to delete their store images
CREATE POLICY "Store admins can delete their store images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'store-gallery' AND
    (storage.foldername(name))[1] = (
        SELECT store_id::text
        FROM profiles
        WHERE id = auth.uid()
        AND role IN ('store_admin', 'super_admin')
        AND active = true
    )
);

-- Allow super admins full access
CREATE POLICY "Super admins have full access"
ON storage.objects FOR ALL
USING (
    bucket_id = 'store-gallery' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
        AND active = true
    )
);
