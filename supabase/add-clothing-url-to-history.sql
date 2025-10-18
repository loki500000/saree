-- Add clothing_image_url column to tryon_history table
ALTER TABLE tryon_history
ADD COLUMN IF NOT EXISTS clothing_image_url TEXT;

-- Update the deduct_credits function to accept clothing_image_url parameter
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
