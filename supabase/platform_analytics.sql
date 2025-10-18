-- ============================================
-- PLATFORM-WIDE ANALYTICS FUNCTIONS (SUPER ADMIN)
-- ============================================

-- Function to get platform-wide daily analytics
CREATE OR REPLACE FUNCTION get_platform_analytics(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    date DATE,
    tryons_count BIGINT,
    credits_used NUMERIC,
    unique_users UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(th.created_at) AS date,
        COUNT(th.id) AS tryons_count,
        SUM(th.credits_used) AS credits_used,
        ARRAY_AGG(DISTINCT th.user_id) AS unique_users
    FROM
        tryon_history th
    WHERE
        th.created_at >= p_start_date AND th.created_at <= p_end_date
    GROUP BY
        DATE(th.created_at)
    ORDER BY
        DATE(th.created_at);
END;
$$;

-- Function to get platform-wide top users
CREATE OR REPLACE FUNCTION get_platform_top_users(
    p_limit INT DEFAULT 10,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01 00:00:00+00'
)
RETURNS TABLE (
    user_name TEXT,
    tryons_count BIGINT,
    credits_used NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(p.name, p.email) AS user_name,
        COUNT(th.id) AS tryons_count,
        SUM(th.credits_used) AS credits_used
    FROM
        tryon_history th
    JOIN
        profiles p ON th.user_id = p.id
    WHERE
        th.created_at >= p_start_date
    GROUP BY
        COALESCE(p.name, p.email)
    ORDER BY
        COUNT(th.id) DESC
    LIMIT p_limit;
END;
$$;

-- Function to get platform-wide popular clothing
CREATE OR REPLACE FUNCTION get_platform_popular_clothing(
    p_limit INT DEFAULT 10,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01 00:00:00+00'
)
RETURNS TABLE (
    clothing_image_url TEXT,
    usage_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        th.clothing_image_url,
        COUNT(th.id) AS usage_count
    FROM
        tryon_history th
    WHERE
        th.clothing_image_url IS NOT NULL
        AND th.created_at >= p_start_date
    GROUP BY
        th.clothing_image_url
    ORDER BY
        COUNT(th.id) DESC
    LIMIT p_limit;
END;
$$;

-- Function to get platform-wide hourly usage pattern
CREATE OR REPLACE FUNCTION get_platform_hourly_usage_pattern(
    p_days_back INT DEFAULT 7
)
RETURNS TABLE (
    hour_of_day INT,
    total_tryons BIGINT,
    avg_tryons NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        EXTRACT(HOUR FROM th.created_at)::INT AS hour_of_day,
        COUNT(th.id) AS total_tryons,
        COUNT(th.id)::NUMERIC / COUNT(DISTINCT DATE(th.created_at)) AS avg_tryons
    FROM
        tryon_history th
    WHERE
        th.created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY
        EXTRACT(HOUR FROM th.created_at)
    ORDER BY
        hour_of_day;
END;
$$;

-- Function to get platform-wide credit breakdown
CREATE OR REPLACE FUNCTION get_platform_credit_breakdown(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    transaction_type TEXT,
    total_amount NUMERIC,
    transaction_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.type AS transaction_type,
        SUM(ct.amount) AS total_amount,
        COUNT(ct.id) AS transaction_count
    FROM
        credit_transactions ct
    WHERE
        ct.created_at >= p_start_date AND ct.created_at <= p_end_date
    GROUP BY
        ct.type
    ORDER BY
        transaction_type;
END;
$$;

-- Grant usage to authenticated users for RPC functions (adjust as necessary)
GRANT EXECUTE ON FUNCTION get_platform_analytics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_top_users(INT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_popular_clothing(INT, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_hourly_usage_pattern(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_credit_breakdown(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
