-- ============================================
-- FINAL FIXED STORE COMPARISON ANALYTICS FUNCTIONS
-- This version properly casts ALL types to match the function return signature
-- Copy this entire file and run it in Supabase SQL Editor
-- ============================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_store_comparison_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_store_performance_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_store_rankings(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS get_store_health_indicators(INT);

-- Function to get comprehensive store comparison metrics
CREATE OR REPLACE FUNCTION get_store_comparison_metrics(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    store_slug TEXT,
    is_active BOOLEAN,
    current_credits INTEGER,
    total_tryons BIGINT,
    unique_users BIGINT,
    total_credits_used NUMERIC,
    total_credits_purchased NUMERIC,
    total_credits_refunded NUMERIC,
    avg_tryons_per_user NUMERIC,
    avg_credits_per_tryon NUMERIC,
    popular_item_url TEXT,
    popular_item_count BIGINT,
    first_tryon_date TIMESTAMP WITH TIME ZONE,
    last_tryon_date TIMESTAMP WITH TIME ZONE,
    active_days BIGINT,
    peak_hour INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH store_tryons AS (
        SELECT
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.slug::TEXT AS store_slug,
            s.active AS is_active,
            s.credits AS current_credits,
            COUNT(th.id) AS total_tryons,
            COUNT(DISTINCT th.user_id) AS unique_users,
            COALESCE(SUM(th.credits_used), 0)::NUMERIC AS total_credits_used,
            MIN(th.created_at) AS first_tryon_date,
            MAX(th.created_at) AS last_tryon_date,
            COUNT(DISTINCT DATE(th.created_at)) AS active_days,
            COALESCE(MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM th.created_at)), 0) AS peak_hour
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= p_start_date
            AND th.created_at <= p_end_date
        GROUP BY
            s.id, s.name, s.slug, s.active, s.credits
    ),
    store_credits AS (
        SELECT
            s.id AS store_id,
            COALESCE(SUM(CASE WHEN ct.type = 'purchase' THEN ct.amount ELSE 0 END), 0)::NUMERIC AS total_credits_purchased,
            COALESCE(SUM(CASE WHEN ct.type = 'refund' THEN ct.amount ELSE 0 END), 0)::NUMERIC AS total_credits_refunded
        FROM
            stores s
        LEFT JOIN
            credit_transactions ct ON s.id = ct.store_id
            AND ct.created_at >= p_start_date
            AND ct.created_at <= p_end_date
        GROUP BY
            s.id
    ),
    store_popular_items AS (
        SELECT DISTINCT ON (th.store_id)
            th.store_id,
            th.clothing_image_url::TEXT AS popular_item_url,
            COUNT(th.id) AS popular_item_count
        FROM
            tryon_history th
        WHERE
            th.created_at >= p_start_date
            AND th.created_at <= p_end_date
            AND th.clothing_image_url IS NOT NULL
        GROUP BY
            th.store_id, th.clothing_image_url
        ORDER BY
            th.store_id, COUNT(th.id) DESC
    )
    SELECT
        st.store_id,
        st.store_name,
        st.store_slug,
        st.is_active,
        st.current_credits,
        COALESCE(st.total_tryons, 0) AS total_tryons,
        COALESCE(st.unique_users, 0) AS unique_users,
        COALESCE(st.total_credits_used, 0)::NUMERIC AS total_credits_used,
        COALESCE(sc.total_credits_purchased, 0)::NUMERIC AS total_credits_purchased,
        COALESCE(sc.total_credits_refunded, 0)::NUMERIC AS total_credits_refunded,
        CASE
            WHEN st.unique_users > 0 THEN ROUND(st.total_tryons::NUMERIC / st.unique_users, 2)
            ELSE 0
        END::NUMERIC AS avg_tryons_per_user,
        CASE
            WHEN st.total_tryons > 0 THEN ROUND(st.total_credits_used / st.total_tryons, 2)
            ELSE 0
        END::NUMERIC AS avg_credits_per_tryon,
        spi.popular_item_url,
        COALESCE(spi.popular_item_count, 0) AS popular_item_count,
        st.first_tryon_date,
        st.last_tryon_date,
        COALESCE(st.active_days, 0) AS active_days,
        st.peak_hour::INT
    FROM
        store_tryons st
    LEFT JOIN
        store_credits sc ON st.store_id = sc.store_id
    LEFT JOIN
        store_popular_items spi ON st.store_id = spi.store_id
    ORDER BY
        st.total_tryons DESC NULLS LAST;
END;
$$;

-- Function to get store performance trends (daily breakdown per store)
CREATE OR REPLACE FUNCTION get_store_performance_trends(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_store_id UUID DEFAULT NULL
)
RETURNS TABLE (
    date DATE,
    store_id UUID,
    store_name TEXT,
    tryons_count BIGINT,
    credits_used NUMERIC,
    unique_users BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        DATE(th.created_at) AS date,
        s.id AS store_id,
        s.name::TEXT AS store_name,
        COUNT(th.id) AS tryons_count,
        COALESCE(SUM(th.credits_used), 0)::NUMERIC AS credits_used,
        COUNT(DISTINCT th.user_id) AS unique_users
    FROM
        tryon_history th
    JOIN
        stores s ON th.store_id = s.id
    WHERE
        th.created_at >= p_start_date
        AND th.created_at <= p_end_date
        AND (p_store_id IS NULL OR th.store_id = p_store_id)
    GROUP BY
        DATE(th.created_at), s.id, s.name
    ORDER BY
        DATE(th.created_at), store_name;
END;
$$;

-- Function to get store rankings by various metrics
CREATE OR REPLACE FUNCTION get_store_rankings(
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_metric TEXT DEFAULT 'tryons'
)
RETURNS TABLE (
    rank BIGINT,
    store_id UUID,
    store_name TEXT,
    store_slug TEXT,
    metric_value NUMERIC,
    metric_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_metric = 'tryons' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY COUNT(th.id) DESC) AS rank,
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.slug::TEXT AS store_slug,
            COUNT(th.id)::NUMERIC AS metric_value,
            'Total Try-Ons'::TEXT AS metric_name
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= p_start_date
            AND th.created_at <= p_end_date
        GROUP BY
            s.id, s.name, s.slug
        ORDER BY
            COUNT(th.id) DESC;

    ELSIF p_metric = 'users' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT th.user_id) DESC) AS rank,
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.slug::TEXT AS store_slug,
            COUNT(DISTINCT th.user_id)::NUMERIC AS metric_value,
            'Unique Users'::TEXT AS metric_name
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= p_start_date
            AND th.created_at <= p_end_date
        GROUP BY
            s.id, s.name, s.slug
        ORDER BY
            COUNT(DISTINCT th.user_id) DESC;

    ELSIF p_metric = 'credits' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(th.credits_used), 0) DESC) AS rank,
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.slug::TEXT AS store_slug,
            COALESCE(SUM(th.credits_used), 0)::NUMERIC AS metric_value,
            'Credits Used'::TEXT AS metric_name
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= p_start_date
            AND th.created_at <= p_end_date
        GROUP BY
            s.id, s.name, s.slug
        ORDER BY
            COALESCE(SUM(th.credits_used), 0) DESC;

    ELSIF p_metric = 'efficiency' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY
                CASE
                    WHEN COUNT(DISTINCT th.user_id) > 0
                    THEN COUNT(th.id)::NUMERIC / COUNT(DISTINCT th.user_id)
                    ELSE 0
                END DESC
            ) AS rank,
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.slug::TEXT AS store_slug,
            CASE
                WHEN COUNT(DISTINCT th.user_id) > 0
                THEN ROUND(COUNT(th.id)::NUMERIC / COUNT(DISTINCT th.user_id), 2)
                ELSE 0
            END::NUMERIC AS metric_value,
            'Avg Try-Ons per User'::TEXT AS metric_name
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= p_start_date
            AND th.created_at <= p_end_date
        GROUP BY
            s.id, s.name, s.slug
        ORDER BY
            metric_value DESC;

    ELSE
        RAISE EXCEPTION 'Invalid metric: %. Valid options are: tryons, users, credits, efficiency', p_metric;
    END IF;
END;
$$;

-- Function to get store health indicators
CREATE OR REPLACE FUNCTION get_store_health_indicators(
    p_days_back INT DEFAULT 30
)
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    health_score NUMERIC,
    is_active BOOLEAN,
    days_since_last_activity INT,
    trend_direction TEXT,
    current_period_tryons BIGINT,
    previous_period_tryons BIGINT,
    growth_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '1 day' * p_days_back;
    v_mid_date TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '1 day' * (p_days_back / 2);
BEGIN
    RETURN QUERY
    WITH current_period AS (
        SELECT
            s.id AS store_id,
            s.name::TEXT AS store_name,
            s.active AS is_active,
            COUNT(th.id) AS tryons,
            MAX(th.created_at) AS last_activity
        FROM
            stores s
        LEFT JOIN
            tryon_history th ON s.id = th.store_id
            AND th.created_at >= v_mid_date
        GROUP BY
            s.id, s.name, s.active
    ),
    previous_period AS (
        SELECT
            th.store_id,
            COUNT(th.id) AS tryons
        FROM
            tryon_history th
        WHERE
            th.created_at >= v_start_date
            AND th.created_at < v_mid_date
        GROUP BY
            th.store_id
    )
    SELECT
        cp.store_id,
        cp.store_name,
        CASE
            WHEN NOT cp.is_active THEN 0
            WHEN cp.tryons = 0 THEN 25
            WHEN cp.tryons > COALESCE(pp.tryons, 0) THEN 100
            WHEN cp.tryons = pp.tryons THEN 75
            ELSE 50
        END::NUMERIC AS health_score,
        cp.is_active,
        COALESCE(EXTRACT(DAY FROM NOW() - cp.last_activity)::INT, 999) AS days_since_last_activity,
        CASE
            WHEN cp.tryons = 0 THEN 'inactive'::TEXT
            WHEN COALESCE(pp.tryons, 0) = 0 AND cp.tryons > 0 THEN 'up'::TEXT
            WHEN cp.tryons > COALESCE(pp.tryons, 0) * 1.1 THEN 'up'::TEXT
            WHEN cp.tryons < COALESCE(pp.tryons, 1) * 0.9 THEN 'down'::TEXT
            ELSE 'stable'::TEXT
        END AS trend_direction,
        cp.tryons AS current_period_tryons,
        COALESCE(pp.tryons, 0) AS previous_period_tryons,
        CASE
            WHEN COALESCE(pp.tryons, 0) = 0 AND cp.tryons > 0 THEN 100
            WHEN COALESCE(pp.tryons, 0) = 0 THEN 0
            ELSE ROUND(((cp.tryons - pp.tryons)::NUMERIC / pp.tryons * 100), 2)
        END::NUMERIC AS growth_percentage
    FROM
        current_period cp
    LEFT JOIN
        previous_period pp ON cp.store_id = pp.store_id
    ORDER BY
        health_score DESC, cp.tryons DESC;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_store_comparison_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_performance_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_rankings(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_health_indicators(INT) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ✅ ✅ FINAL FIX: Store analytics functions deployed successfully!';
    RAISE NOTICE 'All type casting issues have been resolved';
    RAISE NOTICE 'Refresh your browser at /admin/analytics/store-comparison';
END $$;
