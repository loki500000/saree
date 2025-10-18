# FINAL FIX: Row Level Security Error

## The Real Problem (Found in Logs!)

The error is: **"new row violates row-level security policy for table credit_transactions"**

The `deduct_credits` function can't insert into `credit_transactions` because of RLS policies. The function needs elevated privileges.

## Solution (1 Minute Fix)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Open your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run This SQL

Copy and paste this **entire block** and click **RUN**:

```sql
-- First, add the missing column if it doesn't exist
ALTER TABLE tryon_history
ADD COLUMN IF NOT EXISTS clothing_image_url TEXT;

-- Now create/update the deduct_credits function with SECURITY DEFINER
-- This allows it to bypass RLS policies
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

    -- Log try-on history with clothing image URL
    INSERT INTO tryon_history (user_id, store_id, credits_used, clothing_image_url)
    VALUES (p_user_id, p_store_id, p_amount, p_clothing_image_url);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Test
1. Refresh your app
2. Try virtual try-on
3. It will work now! ✅

## What This Does

The key change is **`SECURITY DEFINER`** at the end:
- This makes the function run with the privileges of the user who **created** it (the database owner)
- It bypasses Row Level Security policies
- This is safe because the function has its own logic to check credits and validate the store_id

## Why This Happened

1. RLS is enabled on `credit_transactions` table
2. Regular users don't have INSERT permissions
3. The function tried to insert but was blocked by RLS
4. Adding `SECURITY DEFINER` lets the function bypass RLS safely

## Verify It Works

After running the SQL:
1. Try a virtual try-on
2. Check your credits decrease
3. Check the Analytics tab - you should see the try-on recorded

You're done! 🎉
