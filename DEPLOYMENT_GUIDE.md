# Deployment Guide - Store Comparison Analytics

## Quick Start

Follow these steps to deploy the new Store Comparison Analytics feature to your Virtual Try-On platform.

## Prerequisites

- Access to Supabase dashboard
- Super admin account in the platform
- Node.js and npm installed
- Git (optional, for version control)

## Step-by-Step Deployment

### Step 1: Deploy Database Functions

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com
   - Select your project

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute SQL Migration:**
   - Open the file: `supabase/platform_analytics.sql`
   - Copy the NEW FUNCTIONS section (lines 154-522)
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

4. **Verify Installation:**
   ```sql
   -- Run this query to verify functions exist:
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE 'get_store%';

   -- Should return:
   -- get_store_comparison_metrics
   -- get_store_performance_trends
   -- get_store_rankings
   -- get_store_health_indicators
   ```

### Step 2: Test the API Endpoint

The API endpoint is already deployed with your codebase. No additional steps needed.

**Test it:**
```bash
# From your terminal (replace with your domain)
curl -X GET "http://localhost:3000/api/admin/analytics/store-comparison?period=30d" \
  -H "Cookie: your-auth-cookie"
```

### Step 3: Build and Deploy Frontend

1. **Install Dependencies (if needed):**
   ```bash
   cd virtual-tryon
   npm install lucide-react  # Icon library used
   ```

2. **Build the Application:**
   ```bash
   npm run build
   ```

3. **Test Locally:**
   ```bash
   npm run dev
   ```
   - Navigate to http://localhost:3000
   - Log in as super_admin
   - Go to Admin Dashboard
   - Click "Store Comparison" button

4. **Deploy to Production:**

   **Option A: Vercel (Recommended for Next.js)**
   ```bash
   # If using Vercel CLI
   vercel --prod

   # Or push to GitHub and Vercel will auto-deploy
   git add .
   git commit -m "Add store comparison analytics"
   git push origin main
   ```

   **Option B: Other Platforms**
   ```bash
   # Build for production
   npm run build

   # Deploy the .next folder to your hosting provider
   ```

### Step 4: Verify Deployment

1. **Check Database Functions:**
   - Go to Supabase → SQL Editor
   - Run: `SELECT get_store_comparison_metrics(NOW() - INTERVAL '30 days', NOW());`
   - Should return store metrics

2. **Check API Endpoint:**
   - Open: https://yourdomain.com/api/admin/analytics/store-comparison
   - Should return JSON (or 401 if not authenticated)

3. **Check Frontend:**
   - Log in as super_admin
   - Navigate to: https://yourdomain.com/admin/analytics/store-comparison
   - Should see the Store Comparison dashboard

### Step 5: Grant Permissions (if needed)

If you encounter permission errors:

```sql
-- Run in Supabase SQL Editor
GRANT EXECUTE ON FUNCTION get_store_comparison_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_performance_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_rankings(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_health_indicators(INT) TO authenticated;
```

## Files Changed/Added

### New Files:
- ✅ `supabase/platform_analytics.sql` (updated with new functions)
- ✅ `app/api/admin/analytics/store-comparison/route.ts` (new API endpoint)
- ✅ `app/admin/analytics/store-comparison/page.tsx` (new UI page)
- ✅ `STORE_COMPARISON_ANALYTICS.md` (documentation)
- ✅ `DEPLOYMENT_GUIDE.md` (this file)

### Modified Files:
- ✅ `app/admin/analytics/page.tsx` (added navigation link)
- ✅ `app/admin/page.tsx` (added navigation button)

## Testing Checklist

After deployment, verify these scenarios:

- [ ] Super admin can access `/admin/analytics/store-comparison`
- [ ] Store admin CANNOT access the page (redirected)
- [ ] Regular user CANNOT access the page (redirected)
- [ ] Summary statistics display correctly
- [ ] Top performers section shows data
- [ ] Store health dashboard renders
- [ ] Detailed table shows all stores
- [ ] Period selector works (Today, 7d, 30d, 90d, All)
- [ ] Refresh button updates data
- [ ] Filtering works (All, Active, Inactive)
- [ ] Sorting works (Try-Ons, Users, Credits, Efficiency)
- [ ] Navigation from Admin Dashboard works
- [ ] Navigation from Analytics page works
- [ ] Page is responsive on mobile devices

## Rollback Plan

If you need to rollback:

### Remove Database Functions:
```sql
DROP FUNCTION IF EXISTS get_store_comparison_metrics(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_store_performance_trends(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, UUID);
DROP FUNCTION IF EXISTS get_store_rankings(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, TEXT);
DROP FUNCTION IF EXISTS get_store_health_indicators(INT);
```

### Remove Frontend Changes:
```bash
# Delete new files
rm -rf app/admin/analytics/store-comparison
rm -rf app/api/admin/analytics/store-comparison

# Revert modified files from git
git checkout app/admin/analytics/page.tsx
git checkout app/admin/page.tsx
```

## Performance Optimization (Optional)

For large datasets, consider these optimizations:

### 1. Add Database Indexes:
```sql
-- If not already present
CREATE INDEX IF NOT EXISTS idx_tryon_history_composite
ON tryon_history(store_id, created_at, user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_composite
ON credit_transactions(store_id, type, created_at);
```

### 2. Enable Caching (API Route):
```typescript
// In route.ts, add caching headers
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
  }
});
```

### 3. Add Pagination:
For platforms with 100+ stores, implement pagination in the detailed table.

## Monitoring

### Key Metrics to Monitor:

1. **API Response Times:**
   - Monitor `/api/admin/analytics/store-comparison` endpoint
   - Target: < 2 seconds for 30-day queries

2. **Database Query Performance:**
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   WHERE query LIKE '%get_store%'
   ORDER BY mean_exec_time DESC;
   ```

3. **Error Rates:**
   - Monitor application logs for errors
   - Set up alerts for 500 errors

## Support

### Common Issues:

**Q: SQL functions not found**
A: Re-run the SQL migration in Supabase dashboard

**Q: Permission denied errors**
A: Run the GRANT statements in Step 5

**Q: No data showing**
A: Ensure you have stores with try-on history in the selected period

**Q: Page not accessible**
A: Verify you're logged in as super_admin role

### Getting Help:

1. Check `STORE_COMPARISON_ANALYTICS.md` for detailed documentation
2. Review browser console for JavaScript errors
3. Check Supabase logs for database errors
4. Verify environment variables are set correctly

## Success Criteria

Deployment is successful when:

✅ SQL functions execute without errors
✅ API endpoint returns valid JSON
✅ Super admin can view store comparison dashboard
✅ All metrics display correctly
✅ Performance is acceptable (< 2s load time)
✅ No console errors in browser
✅ Mobile responsive design works

## Next Steps

After successful deployment:

1. **Train Super Admins:**
   - Share `STORE_COMPARISON_ANALYTICS.md`
   - Demonstrate key features
   - Show common use cases

2. **Monitor Usage:**
   - Track how often the feature is used
   - Gather feedback from super admins
   - Identify additional metrics needed

3. **Iterate:**
   - Add export functionality
   - Implement additional visualizations
   - Add automated alerts

---

**Deployment Date:** ___________
**Deployed By:** ___________
**Environment:** Production / Staging
**Status:** ⬜ Success / ⬜ Failed / ⬜ Rolled Back

**Notes:**
_________________________________
_________________________________
_________________________________
