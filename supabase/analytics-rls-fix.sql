-- ============================================
-- ANALYTICS RLS POLICIES FIX
-- ============================================
-- This file adds RLS policies so analytics views work properly

-- Add RLS policies for analytics views to work
-- Store admins and super admins can use analytics functions

-- Grant access to analytics views for authenticated users
GRANT SELECT ON analytics_daily_usage TO authenticated;
GRANT SELECT ON analytics_user_activity TO authenticated;
GRANT SELECT ON analytics_store_overview TO authenticated;

-- Grant execute permissions on analytics functions
GRANT EXECUTE ON FUNCTION get_store_analytics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_users(UUID, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_breakdown(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_usage_pattern(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_clothing(UUID, INTEGER, TIMESTAMP WITH TIME ZONE) TO authenticated;
