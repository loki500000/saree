-- ============================================
-- SIMPLE ANALYTICS SYSTEM
-- ============================================
-- This creates a simple analytics view that aggregates try-on data

-- Drop existing view if it exists
DROP VIEW IF EXISTS analytics_overview CASCADE;
DROP VIEW IF EXISTS analytics_popular_clothing CASCADE;

-- Create a simple analytics overview view
CREATE OR REPLACE VIEW analytics_overview AS
SELECT
    th.store_id,
    COUNT(*) as total_tryons,
    COUNT(DISTINCT th.user_id) as unique_users,
    SUM(th.credits_used) as total_credits_used,
    COUNT(DISTINCT DATE(th.created_at)) as active_days,
    MIN(th.created_at) as first_tryon,
    MAX(th.created_at) as last_tryon
FROM tryon_history th
GROUP BY th.store_id;

-- Create popular clothing view
CREATE OR REPLACE VIEW analytics_popular_clothing AS
SELECT
    th.store_id,
    th.clothing_image_url,
    COUNT(*) as usage_count,
    COUNT(DISTINCT th.user_id) as unique_users,
    MAX(th.created_at) as last_used
FROM tryon_history th
WHERE th.clothing_image_url IS NOT NULL
GROUP BY th.store_id, th.clothing_image_url
ORDER BY usage_count DESC;

-- Grant access to authenticated users
GRANT SELECT ON analytics_overview TO authenticated;
GRANT SELECT ON analytics_popular_clothing TO authenticated;

-- Add comments
COMMENT ON VIEW analytics_overview IS 'Simple analytics overview aggregating try-on history data';
COMMENT ON VIEW analytics_popular_clothing IS 'Most popular clothing items by usage count';
