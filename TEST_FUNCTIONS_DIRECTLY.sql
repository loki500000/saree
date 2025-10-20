-- Run this in Supabase SQL Editor to test the functions directly
-- This will help us see if there's a table structure or data issue

-- Test 1: Check if stores table exists and has data
SELECT 'Test 1: Stores table' as test;
SELECT COUNT(*) as store_count FROM stores;
SELECT * FROM stores LIMIT 3;

-- Test 2: Check if tryon_history table exists and has data
SELECT 'Test 2: Tryon History table' as test;
SELECT COUNT(*) as tryon_count FROM tryon_history;
SELECT * FROM tryon_history LIMIT 3;

-- Test 3: Check if credit_transactions table exists
SELECT 'Test 3: Credit Transactions table' as test;
SELECT COUNT(*) as transaction_count FROM credit_transactions;
SELECT * FROM credit_transactions LIMIT 3;

-- Test 4: Try calling the function directly
SELECT 'Test 4: Calling get_store_comparison_metrics' as test;
SELECT * FROM get_store_comparison_metrics(
    NOW() - INTERVAL '30 days',
    NOW()
) LIMIT 3;

-- Test 5: Try calling get_store_health_indicators
SELECT 'Test 5: Calling get_store_health_indicators' as test;
SELECT * FROM get_store_health_indicators(30) LIMIT 3;
