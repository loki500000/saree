-- ============================================
-- ANALYTICS SCHEMA
-- ============================================

-- Drop old views if they exist
DROP VIEW IF EXISTS analytics_daily_usage CASCADE;
DROP VIEW IF EXISTS analytics_user_activity CASCADE;
DROP VIEW IF EXISTS analytics_store_overview CASCADE;

-- Create analytics views for common queries
CREATE OR REPLACE VIEW analytics_daily_usage AS
SELECT
    store_id,
    DATE(created_at) as date,
    COUNT(*) as tryons_count,
    SUM(credits_used) as credits_used,
    COUNT(DISTINCT user_id) as unique_users
FROM tryon_history
GROUP BY store_id, DATE(created_at);

CREATE OR REPLACE VIEW analytics_user_activity AS
SELECT
    th.user_id,
    th.store_id,
    p.name as user_name,
    p.email as user_email,
    COUNT(*) as total_tryons,
    SUM(th.credits_used) as total_credits_used,
    MIN(th.created_at) as first_tryon,
    MAX(th.created_at) as last_tryon
FROM tryon_history th
LEFT JOIN profiles p ON th.user_id = p.id
GROUP BY th.user_id, th.store_id, p.name, p.email;

CREATE OR REPLACE VIEW analytics_store_overview AS
SELECT
    s.id as store_id,
    s.name as store_name,
    s.credits as current_credits,
    s.active as is_active,
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN p.role = 'store_admin' THEN p.id END) as admin_count,
    COUNT(DISTINCT CASE WHEN p.role = 'store_user' THEN p.id END) as user_count,
    (SELECT COUNT(*) FROM store_images WHERE store_id = s.id AND type = 'person') as person_images,
    (SELECT COUNT(*) FROM store_images WHERE store_id = s.id AND type = 'clothing') as clothing_images,
    (SELECT COUNT(*) FROM tryon_history WHERE store_id = s.id) as total_tryons,
    (SELECT SUM(credits_used) FROM tryon_history WHERE store_id = s.id) as total_credits_used,
    (SELECT COUNT(*) FROM tryon_history WHERE store_id = s.id AND created_at >= NOW() - INTERVAL '7 days') as tryons_last_7_days,
    (SELECT COUNT(*) FROM tryon_history WHERE store_id = s.id AND created_at >= NOW() - INTERVAL '30 days') as tryons_last_30_days
FROM stores s
LEFT JOIN profiles p ON s.id = p.store_id
GROUP BY s.id, s.name, s.credits, s.active;

-- Function to get store analytics for a date range
CREATE OR REPLACE FUNCTION get_store_analytics(
    p_store_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    date DATE,
    tryons_count BIGINT,
    credits_used BIGINT,
    unique_users BIGINT,
    new_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(th.created_at) as date,
        COUNT(*)::BIGINT as tryons_count,
        SUM(th.credits_used)::BIGINT as credits_used,
        COUNT(DISTINCT th.user_id)::BIGINT as unique_users,
        COUNT(DISTINCT CASE
            WHEN DATE(p.created_at) = DATE(th.created_at)
            THEN th.user_id
        END)::BIGINT as new_users
    FROM tryon_history th
    LEFT JOIN profiles p ON th.user_id = p.id
    WHERE th.store_id = p_store_id
        AND th.created_at >= p_start_date
        AND th.created_at <= p_end_date
    GROUP BY DATE(th.created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get top users by usage
CREATE OR REPLACE FUNCTION get_top_users(
    p_store_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
    user_id UUID,
    user_name VARCHAR,
    user_email VARCHAR,
    tryons_count BIGINT,
    credits_used BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        th.user_id,
        p.name as user_name,
        p.email as user_email,
        COUNT(*)::BIGINT as tryons_count,
        SUM(th.credits_used)::BIGINT as credits_used,
        MAX(th.created_at) as last_activity
    FROM tryon_history th
    LEFT JOIN profiles p ON th.user_id = p.id
    WHERE th.store_id = p_store_id
        AND th.created_at >= p_start_date
    GROUP BY th.user_id, p.name, p.email
    ORDER BY tryons_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get credit usage breakdown
CREATE OR REPLACE FUNCTION get_credit_breakdown(
    p_store_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    transaction_type transaction_type,
    total_amount BIGINT,
    transaction_count BIGINT,
    avg_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.type as transaction_type,
        SUM(ct.amount)::BIGINT as total_amount,
        COUNT(*)::BIGINT as transaction_count,
        AVG(ct.amount) as avg_amount
    FROM credit_transactions ct
    WHERE ct.store_id = p_store_id
        AND ct.created_at >= p_start_date
        AND ct.created_at <= p_end_date
    GROUP BY ct.type
    ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get hourly usage patterns
CREATE OR REPLACE FUNCTION get_hourly_usage_pattern(
    p_store_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    hour_of_day INTEGER,
    avg_tryons NUMERIC,
    total_tryons BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM created_at)::INTEGER as hour_of_day,
        (COUNT(*) / p_days_back::NUMERIC) as avg_tryons,
        COUNT(*)::BIGINT as total_tryons
    FROM tryon_history
    WHERE store_id = p_store_id
        AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- Function to get most popular clothing items
CREATE OR REPLACE FUNCTION get_popular_clothing(
    p_store_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
    clothing_image_url TEXT,
    usage_count BIGINT,
    unique_users BIGINT,
    last_used TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        th.clothing_image_url,
        COUNT(*)::BIGINT as usage_count,
        COUNT(DISTINCT th.user_id)::BIGINT as unique_users,
        MAX(th.created_at) as last_used
    FROM tryon_history th
    WHERE th.store_id = p_store_id
        AND th.created_at >= p_start_date
        AND th.clothing_image_url IS NOT NULL
    GROUP BY th.clothing_image_url
    ORDER BY usage_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_tryon_history_store_created ON tryon_history(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tryon_history_user_created ON tryon_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_store_created ON credit_transactions(store_id, created_at DESC);

-- Add comment for documentation
COMMENT ON VIEW analytics_daily_usage IS 'Daily aggregated usage metrics per store';
COMMENT ON VIEW analytics_user_activity IS 'User-level activity metrics';
COMMENT ON VIEW analytics_store_overview IS 'Comprehensive store overview with all key metrics';
COMMENT ON FUNCTION get_store_analytics IS 'Get detailed daily analytics for a store within a date range';
COMMENT ON FUNCTION get_top_users IS 'Get top users by usage for a store';
COMMENT ON FUNCTION get_credit_breakdown IS 'Get credit transaction breakdown by type';
COMMENT ON FUNCTION get_hourly_usage_pattern IS 'Get hourly usage patterns for capacity planning';
COMMENT ON FUNCTION get_popular_clothing IS 'Get most popular clothing items by usage';
