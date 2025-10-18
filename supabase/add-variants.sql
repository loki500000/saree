-- Add variant columns to store_images table

-- Add new columns
ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS main_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_variant VARCHAR(10);

-- Create index for faster searching by main_code
CREATE INDEX IF NOT EXISTS idx_store_images_main_code ON store_images(main_code);
CREATE INDEX IF NOT EXISTS idx_store_images_main_sub ON store_images(main_code, sub_variant);

-- Migrate existing data: use current name as main_code and set sub_variant to 'a'
UPDATE store_images
SET
  main_code = COALESCE(name, 'item-' || id::text),
  sub_variant = 'a'
WHERE main_code IS NULL;

-- Make columns NOT NULL after migration
ALTER TABLE store_images
ALTER COLUMN main_code SET NOT NULL,
ALTER COLUMN sub_variant SET NOT NULL;

-- Add unique constraint to prevent duplicate main_code + sub_variant + store_id combinations
ALTER TABLE store_images
ADD CONSTRAINT unique_store_image_variant
UNIQUE (store_id, main_code, sub_variant);

-- Update the name column to reflect the variant (optional, for display)
UPDATE store_images
SET name = main_code || sub_variant
WHERE name != main_code || sub_variant;

-- Add comment to explain the columns
COMMENT ON COLUMN store_images.main_code IS 'Main product code (e.g., "100")';
COMMENT ON COLUMN store_images.sub_variant IS 'Sub-variant code for different poses (e.g., "a", "b", "c")';
