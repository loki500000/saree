# Quick Start - Store Comparison Analytics

## 🚀 Get Started in 3 Minutes

### Step 1: Deploy Database Functions (1 minute)

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com
   - Login and select your project

2. **Run Migration:**
   - Click "SQL Editor" in sidebar
   - Click "New Query"
   - Copy ALL contents from: `supabase/migrations/add_store_comparison_analytics.sql`
   - Paste into editor
   - Click "Run" (or Ctrl+Enter)
   - You should see: "Migration completed successfully!"

### Step 2: Restart Your Dev Server (30 seconds)

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Access the Feature (30 seconds)

1. Open http://localhost:3000
2. Login as **super_admin**
3. Click **"Store Comparison"** button in header
4. View your store analytics! 🎉

---

## ✅ Verification

You should see:
- Summary cards with totals
- Top performers leaderboards
- Store health dashboard
- Detailed metrics table

If you see an error, go back to Step 1 and ensure the SQL migration ran successfully.

---

## 📊 What You Can Do Now

### View Platform Overview
- See total stores, try-ons, users, credits
- Compare active vs inactive stores
- Monitor platform health

### Identify Top Performers
- Top 5 stores by try-ons
- Top 5 stores by user count
- Top 5 most efficient stores

### Monitor Store Health
- Visual health scores (0-100)
- Trend indicators (↑ up, ↓ down, → stable)
- Growth percentages
- Days since last activity

### Analyze Detailed Metrics
- Sort by: try-ons, users, credits, efficiency
- Filter: all, active only, inactive only
- View peak hours, active days, averages
- Identify low credit balances

---

## 🔧 Troubleshooting

**Error: "Function does not exist"**
→ Run the SQL migration again (Step 1)

**Error: "Not authenticated"**
→ Login as super_admin

**No data showing**
→ Ensure stores have try-on activity

**Permission denied**
→ Check that you're logged in as super_admin

---

## 📖 Full Documentation

For detailed documentation, see:
- `STORE_COMPARISON_ANALYTICS.md` - Complete feature guide
- `DEPLOYMENT_GUIDE.md` - Production deployment

---

## 🎯 Next Steps

After testing locally:

1. **Deploy to Production:**
   - Run same SQL migration in production Supabase
   - Deploy Next.js app to Vercel/your host
   - Test with production super_admin account

2. **Explore Features:**
   - Try different time periods (Today, 7d, 30d, 90d, All)
   - Test filtering and sorting
   - View store health trends
   - Use insights for decision-making

3. **Share with Team:**
   - Show stakeholders the analytics
   - Train other super admins
   - Gather feedback for improvements

---

**Need Help?**
Check the troubleshooting section in `STORE_COMPARISON_ANALYTICS.md`

Enjoy your enhanced analytics! 📈
