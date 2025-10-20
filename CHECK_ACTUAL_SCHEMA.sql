-- Check the actual data types in your database
-- Run this in Supabase SQL Editor to see what types we're actually dealing with

-- Check stores table schema
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'stores'
ORDER BY ordinal_position;

-- Check tryon_history table schema
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tryon_history'
ORDER BY ordinal_position;

-- Check credit_transactions table schema
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'credit_transactions'
ORDER BY ordinal_position;

-- Test what types the query actually returns
SELECT
    pg_typeof(s.id) as store_id_type,
    pg_typeof(s.name) as store_name_type,
    pg_typeof(s.slug) as store_slug_type,
    pg_typeof(s.active) as is_active_type,
    pg_typeof(s.credits) as current_credits_type,
    pg_typeof(COUNT(th.id)) as total_tryons_type,
    pg_typeof(COUNT(DISTINCT th.user_id)) as unique_users_type,
    pg_typeof(SUM(th.credits_used)) as total_credits_used_type
FROM stores s
LEFT JOIN tryon_history th ON s.id = th.store_id
GROUP BY s.id, s.name, s.slug, s.active, s.credits
LIMIT 1;
