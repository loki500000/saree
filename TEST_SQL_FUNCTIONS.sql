-- ============================================
-- VERIFICATION SCRIPT FOR STORE COMPARISON ANALYTICS
-- Run this in Supabase SQL Editor to check if functions exist
-- ============================================

-- 1. Check if functions exist
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name IN (
    'get_store_comparison_metrics',
    'get_store_performance_trends',
    'get_store_rankings',
    'get_store_health_indicators'
)
ORDER BY routine_name;

-- 2. Check function permissions
SELECT
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name IN (
    'get_store_comparison_metrics',
    'get_store_performance_trends',
    'get_store_rankings',
    'get_store_health_indicators'
)
ORDER BY routine_name, grantee;

-- 3. Test basic function call (should return data or empty result, not error)
SELECT * FROM get_store_comparison_metrics(
    NOW() - INTERVAL '30 days',
    NOW()
) LIMIT 1;

-- 4. Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('stores', 'tryon_history', 'credit_transactions', 'profiles')
ORDER BY table_name;

-- 5. Test with simple data
SELECT
    COUNT(*) as total_stores,
    COUNT(*) FILTER (WHERE active = true) as active_stores
FROM stores;

SELECT
    COUNT(*) as total_tryons,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_tryon,
    MAX(created_at) as last_tryon
FROM tryon_history;
