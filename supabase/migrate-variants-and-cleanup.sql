-- Combined Migration: Add variant columns and remove person type
-- This migration adds main_code and sub_variant columns and removes the person type

-- Step 1: Delete any existing person images (if any)
DELETE FROM store_images WHERE type = 'person';

-- Step 2: Add variant columns
ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS main_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_variant VARCHAR(10);

-- Step 3: Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_store_images_main_code ON store_images(main_code);
CREATE INDEX IF NOT EXISTS idx_store_images_main_sub ON store_images(main_code, sub_variant);

-- Step 4: Migrate existing clothing data (set default values)
-- This allows existing images to work without breaking
UPDATE store_images
SET
  main_code = COALESCE(name, 'item-' || id::text),
  sub_variant = 'a'
WHERE main_code IS NULL;

-- Step 5: Make columns NOT NULL after migration
ALTER TABLE store_images
ALTER COLUMN main_code SET NOT NULL,
ALTER COLUMN sub_variant SET NOT NULL;

-- Step 6: Add unique constraint to prevent duplicate combinations
ALTER TABLE store_images
ADD CONSTRAINT unique_store_image_variant
UNIQUE (store_id, main_code, sub_variant);

-- Step 7: Update the type column to only allow 'clothing'
ALTER TABLE store_images DROP CONSTRAINT IF EXISTS store_images_type_check;
ALTER TABLE store_images
ADD CONSTRAINT store_images_type_check CHECK (type = 'clothing');

-- Step 8: Update the name column to reflect the variant (optional)
UPDATE store_images
SET name = main_code || sub_variant
WHERE name != main_code || sub_variant;

-- Step 9: Add comments to document the schema
COMMENT ON COLUMN store_images.main_code IS 'Main product code (e.g., "100")';
COMMENT ON COLUMN store_images.sub_variant IS 'Sub-variant code for different poses (e.g., "a", "b", "c", "d")';
COMMENT ON COLUMN store_images.type IS 'Image type - always clothing (user photos are not stored)';
