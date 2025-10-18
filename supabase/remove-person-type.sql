-- Remove person type from store_images table
-- Since users upload their own photos, we only need to store clothing images

-- Delete any existing person images (if any)
DELETE FROM store_images WHERE type = 'person';

-- Update the type column to only allow 'clothing'
-- First, we need to drop the old check constraint if it exists
ALTER TABLE store_images DROP CONSTRAINT IF EXISTS store_images_type_check;

-- Recreate the check constraint with only 'clothing'
ALTER TABLE store_images
ADD CONSTRAINT store_images_type_check CHECK (type = 'clothing');

-- Add comment to clarify
COMMENT ON COLUMN store_images.type IS 'Image type - always clothing (user photos are not stored)';
