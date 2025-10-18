# 🔧 Fix the "Setup Required" Error

You're seeing this error because the SQL functions haven't been deployed to your Supabase database yet.

## ✅ Solution (3 Steps - Takes 2 Minutes)

### Step 1: Test the Functions

Open your terminal in the project folder and run:

```bash
node test-supabase-functions.js
```

**What you'll see:**
- ✅ If all pass → Functions are deployed, skip to Step 3
- ❌ If all fail → Functions are NOT deployed, continue to Step 2

### Step 2: Deploy the Functions to Supabase

1. **Open the SQL file:**
   - Open this file: `COPY_THIS_TO_SUPABASE.sql`
   - Press `Ctrl+A` to select all
   - Press `Ctrl+C` to copy

2. **Go to Supabase:**
   - Open https://supabase.com
   - Log in
   - Select your project
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

3. **Paste and Run:**
   - Press `Ctrl+V` to paste
   - Click **"Run"** button (or press `Ctrl+Enter`)
   - Wait 5-10 seconds

4. **Verify Success:**
   You should see at the bottom:
   ```
   SUCCESS! Function created: get_store_comparison_metrics
   SUCCESS! Function created: get_store_health_indicators
   SUCCESS! Function created: get_store_performance_trends
   SUCCESS! Function created: get_store_rankings
   Total functions created: 4
   ```

### Step 3: Refresh Your App

1. Go back to your browser
2. Navigate to: http://localhost:3000/admin
3. Click the "Analytics" button
4. The error should be gone! 🎉

**Note:** Your dev server is running on http://localhost:3000

---

## 🧪 Test Using the Terminal

If you want to see the exact error, run:

```bash
node test-supabase-functions.js
```

This will test if the SQL functions are deployed correctly.

---

## ❓ Still Not Working?

### Check #1: Are you using the correct Supabase project?

In Supabase dashboard, verify the project name matches your app.

### Check #2: Do your tables exist?

Run this in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('stores', 'tryon_history', 'credit_transactions');
```

You should see all 3 tables. If not, your database schema isn't set up yet.

### Check #3: Are you logged in as super_admin?

The store comparison page requires super_admin role. Regular users and store_admin cannot access it.

### Check #4: Environment variables

Make sure your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📞 Need More Help?

Run this diagnostic command:
```bash
node test-supabase-functions.js
```

Copy the output and share it - that will help diagnose the exact issue!

---

## 🎯 Summary

**The Issue:** SQL functions don't exist in your Supabase database

**The Fix:**
1. Open `COPY_THIS_TO_SUPABASE.sql`
2. Copy everything
3. Paste into Supabase SQL Editor
4. Click Run
5. Refresh your app

That's it! ✅
