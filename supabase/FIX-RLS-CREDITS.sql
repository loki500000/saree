-- ============================================
-- COMPLETE FIX FOR CREDITS & RLS ISSUES
-- ============================================
-- Run this entire file in Supabase SQL Editor

-- Step 1: Add missing column to tryon_history
ALTER TABLE tryon_history
ADD COLUMN IF NOT EXISTS clothing_image_url TEXT;

-- Step 2: Drop old function versions (if they exist)
DROP FUNCTION IF EXISTS deduct_credits(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS deduct_credits(UUID, UUID, INTEGER, TEXT);

-- Step 3: Create deduct_credits function with SECURITY DEFINER
-- This allows it to bypass RLS policies safely
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

-- Step 4: Update add_credits function to also use SECURITY DEFINER
DROP FUNCTION IF EXISTS add_credits(UUID, INTEGER, TEXT, UUID);

CREATE OR REPLACE FUNCTION add_credits(
    p_store_id UUID,
    p_amount INTEGER,
    p_description TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Add credits
    UPDATE stores
    SET credits = credits + p_amount
    WHERE id = p_store_id;

    -- Log transaction
    INSERT INTO credit_transactions (store_id, amount, type, description, created_by)
    VALUES (p_store_id, p_amount, 'purchase', p_description, p_created_by);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Functions created successfully!';
    RAISE NOTICE 'deduct_credits and add_credits are now SECURITY DEFINER';
END $$;
