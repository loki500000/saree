# Fix: "Unexpected token '<', "<html> <h"... is not valid JSON"

## The Problem
The app is trying to read database columns (`main_code` and `sub_variant`) that don't exist yet in your Supabase database.

## The Solution (2 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Copy & Paste This SQL

```sql
-- Add variant columns to store_images table
ALTER TABLE store_images
ADD COLUMN IF NOT EXISTS main_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS sub_variant VARCHAR(10);

-- Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_store_images_main_code ON store_images(main_code);
CREATE INDEX IF NOT EXISTS idx_store_images_main_sub ON store_images(main_code, sub_variant);
```

### Step 3: Click RUN

That's it! Your app will work now. 🎉

## What This Does

- Adds two new columns to your `store_images` table
- `main_code`: The product code (e.g., "100")
- `sub_variant`: The pose variant (e.g., "a", "b", "c")
- Creates indexes for better performance

## What Happens Next

✅ **Old images** (if any): Will have NULL values for these columns, but still display fine

✅ **New uploads**: Will require both main_code and sub_variant fields

✅ **No data loss**: All existing images remain untouched

## Test It

1. Refresh your app
2. Try to upload a new clothing item
3. You'll see fields for "Main Code" and "Sub-Variant"
4. Upload an image with code "100" and variant "a"
5. You'll see a badge "100a" on the image

## Need More Help?

See `supabase/MIGRATION-GUIDE.md` for advanced options like:
- Cleaning up old images
- Making columns required
- Removing person type completely
