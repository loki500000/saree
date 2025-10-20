-- Run this in Supabase SQL Editor to verify functions exist
-- This will show you which functions are deployed

SELECT
    routine_name as function_name,
    routine_type as type,
    data_type as return_type
FROM
    information_schema.routines
WHERE
    routine_schema = 'public'
    AND routine_name IN (
        'get_store_comparison_metrics',
        'get_store_health_indicators',
        'get_store_rankings',
        'get_store_performance_trends'
    )
ORDER BY
    routine_name;

-- Expected result: Should show 4 functions
-- If you see fewer than 4, the SQL wasn't fully deployed
