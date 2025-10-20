-- Quick test to see if the functions work
-- Run this in Supabase SQL Editor

-- Test calling the function directly
SELECT
    store_id,
    store_name,
    store_slug,
    total_tryons,
    unique_users
FROM get_store_comparison_metrics(
    NOW() - INTERVAL '30 days',
    NOW()
)
LIMIT 5;

-- If you get an error, it will tell us exactly what's wrong
-- If it works, you'll see store data
