# Database Migration Guide

## Problem
You're seeing the error: `Unexpected token '<', "<html> <h"... is not valid JSON`

This happens because the database doesn't have the `main_code` and `sub_variant` columns yet, but the code is trying to query them.

## Solution: Run Migration in Two Steps

### Step 1: Run the Database Migration First

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the SQL below:

```sql
-- STEP 1: Add variant columns (nullable initially)
ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS main_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_variant VARCHAR(10);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_store_images_main_code ON store_images(main_code);
CREATE INDEX IF NOT EXISTS idx_store_images_main_sub ON store_images(main_code, sub_variant);

-- Add comments
COMMENT ON COLUMN store_images.main_code IS 'Main product code (e.g., "100")';
COMMENT ON COLUMN store_images.sub_variant IS 'Sub-variant code for different poses (e.g., "a", "b", "c", "d")';
```

4. Click **RUN**

### Step 2: After Migration Succeeds

The app will now work! New uploads will require main_code and sub_variant.

### Optional Step 3: Clean Up Old Data (Only if you have existing images)

If you have existing images without variants, you can either:

**Option A: Delete them**
```sql
DELETE FROM store_images WHERE main_code IS NULL;
```

**Option B: Set default values**
```sql
UPDATE store_images
SET
  main_code = COALESCE(name, 'item-' || id::text),
  sub_variant = 'a'
WHERE main_code IS NULL;
```

### Optional Step 4: Make Columns Required (After cleanup)

```sql
-- Make columns NOT NULL
ALTER TABLE store_images
ALTER COLUMN main_code SET NOT NULL,
ALTER COLUMN sub_variant SET NOT NULL;

-- Add unique constraint
ALTER TABLE store_images
ADD CONSTRAINT unique_store_image_variant
UNIQUE (store_id, main_code, sub_variant);
```

### Optional Step 5: Remove Person Type (If you want)

```sql
-- Delete person images and restrict to clothing only
DELETE FROM store_images WHERE type = 'person';

ALTER TABLE store_images DROP CONSTRAINT IF EXISTS store_images_type_check;
ALTER TABLE store_images
ADD CONSTRAINT store_images_type_check CHECK (type = 'clothing');
```

## Quick Start (Minimal Migration)

If you just want to get started quickly, run ONLY this:

```sql
ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS main_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_variant VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_store_images_main_code ON store_images(main_code);
CREATE INDEX IF NOT EXISTS idx_store_images_main_sub ON store_images(main_code, sub_variant);
```

That's it! Your app will work now. The columns will be nullable for existing images, and required for new uploads.
