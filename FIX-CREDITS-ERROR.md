# Fix: "Insufficient credits or failed to deduct credits"

## The Problem
The virtual try-on is failing because either:
1. Your store has 0 credits, OR
2. The database schema needs to be updated

## Solution

### Step 1: Check Your Store Credits

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"Table Editor"** in the left sidebar
4. Open the **`stores`** table
5. Check the **`credits`** column for your store

**If credits = 0**, you need to add credits:

```sql
-- Add 100 credits to your store (replace 'your-store-id' with actual ID)
UPDATE stores
SET credits = 100
WHERE id = 'your-store-id';
```

### Step 2: Update Database Schema (If needed)

If your store has credits but still getting the error, run this SQL:

1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"SQL Editor"** in the left sidebar
4. Copy and paste the SQL from `supabase/add-clothing-url-to-history.sql`
5. Click **RUN**

Or run this quick fix:

```sql
-- Add missing column
ALTER TABLE tryon_history
ADD COLUMN IF NOT EXISTS clothing_image_url TEXT;

-- Update the function
CREATE OR REPLACE FUNCTION deduct_credits(
    p_store_id UUID,
    p_user_id UUID,
    p_amount INTEGER DEFAULT 1,
    p_clothing_image_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    -- Get current credits with row lock
    SELECT credits INTO current_credits
    FROM stores
    WHERE id = p_store_id
    FOR UPDATE;

    -- Check if enough credits
    IF current_credits < p_amount THEN
        RETURN FALSE;
    END IF;

    -- Deduct credits
    UPDATE stores
    SET credits = credits - p_amount
    WHERE id = p_store_id;

    -- Log transaction
    INSERT INTO credit_transactions (store_id, amount, type, description, created_by)
    VALUES (p_store_id, -p_amount, 'usage', 'Virtual try-on', p_user_id);

    -- Log try-on history
    INSERT INTO tryon_history (user_id, store_id, credits_used, clothing_image_url)
    VALUES (p_user_id, p_store_id, p_amount, p_clothing_image_url);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### Step 3: Test

1. Refresh your app
2. Try the virtual try-on again
3. Check that credits are deducted properly

## Quick Add Credits (For Testing)

To quickly add credits to your store:

```sql
-- Add 100 credits
SELECT add_credits(
    'your-store-id'::UUID,  -- Replace with your store ID
    100,                     -- Amount of credits
    'Initial credits',       -- Description
    NULL                     -- Created by (optional)
);
```

## Check Credits Via SQL

```sql
-- See all stores and their credits
SELECT id, name, credits, active FROM stores;

-- See credit transactions
SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 10;

-- See try-on history
SELECT * FROM tryon_history ORDER BY created_at DESC LIMIT 10;
```

## Still Having Issues?

1. **Check browser console** for detailed error messages
2. **Check Supabase logs** in the Dashboard → Logs section
3. Make sure your store has `active = true`
4. Ensure the `deduct_credits` function exists in your database
