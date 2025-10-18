# Analytics System Setup Guide

## Overview

This analytics system provides comprehensive tracking and insights for your virtual try-on platform with:

- **Real-time metrics** - Track try-ons, credits, and user activity
- **Trend analysis** - Daily/weekly/monthly usage patterns
- **User insights** - Top users, engagement metrics
- **Popular items** - Most-used clothing items
- **Peak hours** - Hourly usage patterns for capacity planning
- **Day of week analysis** - Weekly usage distribution
- **Credit flow tracking** - Purchase and usage breakdown

## Database Setup

### 1. Apply the Analytics Schema

Run the analytics schema SQL to create the necessary views and functions:

```bash
# Using Supabase CLI
supabase db push supabase/analytics-schema.sql

# Or apply directly in Supabase SQL Editor
```

Copy the contents of `supabase/analytics-schema.sql` and run in your Supabase SQL Editor.

### 2. What Gets Created

The schema creates:

#### Views
- `analytics_daily_usage` - Daily aggregated metrics per store
- `analytics_user_activity` - User-level activity summary
- `analytics_store_overview` - Comprehensive store metrics

#### Functions
- `get_store_analytics(store_id, start_date, end_date)` - Daily analytics for date range
- `get_top_users(store_id, limit, start_date)` - Top users by usage
- `get_credit_breakdown(store_id, start_date, end_date)` - Credit transaction analysis
- `get_hourly_usage_pattern(store_id, days_back)` - Hourly usage distribution
- `get_popular_clothing(store_id, limit, start_date)` - Most popular clothing items

#### Indexes
Optimized indexes on `tryon_history` and `credit_transactions` for fast analytics queries.

## API Endpoints

### Store Analytics

#### GET `/api/store/analytics`
Quick overview of store analytics using optimized views.

**Response:**
```json
{
  "totalTryOns": 1234,
  "totalCreditsUsed": 1234,
  "currentCredits": 500,
  "totalUsers": 45,
  "personImages": 20,
  "clothingImages": 30,
  "tryonsLast7Days": 123,
  "tryonsLast30Days": 456,
  "clothingStats": [...],
  "userStats": [...],
  "recentActivity": [...]
}
```

#### GET `/api/store/analytics/advanced?period=30d&groupBy=day`
Advanced analytics with time-based filtering.

**Query Parameters:**
- `period` - `today`, `7d`, `30d`, `90d`, `all`
- `groupBy` - `day`, `week`, `month`

**Response:**
```json
{
  "period": "30d",
  "metrics": {
    "totalTryOns": 1234,
    "totalCreditsUsed": 1234,
    "uniqueUsers": 45,
    "avgCreditsPerUser": 27.4,
    "tryOnsChange": 15.5,
    "usersChange": 8.2,
    "avgCreditsChange": 12.3
  },
  "timeseries": [...],
  "topClothingItems": [...],
  "topUsers": [...],
  "peakHours": [...],
  "dayOfWeek": [...],
  "creditBreakdown": [...],
  "recentActivity": [...]
}
```

### Admin Analytics (Super Admin Only)

#### GET `/api/admin/analytics?period=30d&groupBy=day`
System-wide analytics across all stores.

## Dashboard Features

The analytics dashboard (`/store/admin/analytics`) includes:

### 1. Key Metrics Cards
- **Total Try-Ons** - With period-over-period comparison
- **Credits Used** - Total credits consumed
- **Active Users** - Unique users with growth indicator
- **Avg per User** - Average credits per user

### 2. Usage Trend Chart
Area chart showing try-on activity over time with customizable grouping (day/week/month).

### 3. Top Clothing Items
Bar chart displaying the most popular clothing items by usage count.

### 4. Peak Usage Hours
Line chart showing hourly usage patterns to identify peak traffic times.

### 5. Day of Week Analysis
Radar chart visualizing usage distribution across the week.

### 6. Top Users Table
Ranked list of most active users with try-on and credit counts.

### 7. Latest Activity
Real-time feed of recent try-on activities with user details.

## Performance Optimization

### Database Level
1. **Materialized Views** - Pre-aggregated data for common queries
2. **Composite Indexes** - Optimized for store_id + created_at queries
3. **SQL Functions** - Server-side aggregation reduces data transfer

### Application Level
1. **Optimized Queries** - Using RPC calls instead of client-side aggregation
2. **Date Range Filtering** - Only fetch relevant data
3. **Pagination** - Limit results for large datasets

## Usage Examples

### Query Store Analytics for Last 30 Days
```typescript
const { data } = await supabase
  .rpc('get_store_analytics', {
    p_store_id: storeId,
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_end_date: new Date().toISOString()
  });
```

### Get Top 10 Users
```typescript
const { data } = await supabase
  .rpc('get_top_users', {
    p_store_id: storeId,
    p_limit: 10,
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  });
```

### Get Popular Clothing Items
```typescript
const { data } = await supabase
  .rpc('get_popular_clothing', {
    p_store_id: storeId,
    p_limit: 10,
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  });
```

### Get Hourly Usage Pattern
```typescript
const { data } = await supabase
  .rpc('get_hourly_usage_pattern', {
    p_store_id: storeId,
    p_days_back: 7
  });
```

## Maintenance

### Recommended Practices

1. **Regular Cleanup** - Archive old try-on history data after 1 year
2. **Index Maintenance** - Monitor query performance and adjust indexes
3. **View Refresh** - Views auto-update, but consider materialized views for very large datasets

### Monitoring Queries

```sql
-- Check analytics query performance
SELECT * FROM pg_stat_statements
WHERE query LIKE '%get_store_analytics%'
ORDER BY total_exec_time DESC;

-- Check index usage
SELECT * FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexrelname LIKE '%tryon%';
```

## Troubleshooting

### No Data Showing
1. Verify analytics schema was applied successfully
2. Check if try-on history table has data
3. Ensure user has proper permissions to access store data

### Slow Queries
1. Check if indexes are properly created
2. Reduce date range for queries
3. Consider adding more specific indexes based on query patterns

### Missing Metrics
1. Verify all SQL functions were created
2. Check for errors in browser console
3. Ensure API endpoints are accessible

## Future Enhancements

Potential additions:
- Export analytics to CSV/PDF
- Email reports for admins
- Real-time notifications for milestones
- A/B testing insights
- Revenue analytics integration
- Cohort analysis
- Retention metrics
