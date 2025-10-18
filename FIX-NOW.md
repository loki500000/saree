# 🔧 FIX CREDITS ERROR NOW

## Problem
Virtual try-on fails with: **"Insufficient credits or failed to deduct credits"**

**Root Cause:** Row Level Security (RLS) blocking the credit deduction function.

## ✅ SOLUTION (30 Seconds)

### Step 1: Open Supabase
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** (left sidebar)

### Step 2: Run The Fix
1. Open the file: `supabase/FIX-RLS-CREDITS.sql`
2. **Copy ALL the SQL** (the entire file)
3. **Paste** into Supabase SQL Editor
4. Click **RUN** ▶️

### Step 3: Done!
- Refresh your app
- Try virtual try-on
- It will work! ✅

## What This Does

The SQL file:
1. ✅ Adds missing `clothing_image_url` column
2. ✅ Drops old function versions
3. ✅ Creates `deduct_credits` with `SECURITY DEFINER` (bypasses RLS)
4. ✅ Creates `add_credits` with `SECURITY DEFINER`
5. ✅ Shows success message

## Why This Works

**`SECURITY DEFINER`** makes functions run with database owner privileges:
- Bypasses Row Level Security policies
- Still secure (function validates store_id and credits)
- Allows inserting into protected tables

## Verify It Works

After running the SQL:
1. Try virtual try-on in your app
2. Credits should deduct properly
3. Check Analytics tab - try-ons are tracked
4. Check browser console - no errors!

---

## Quick Commands

**Check if function exists:**
```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_name = 'deduct_credits';
```

**Check your credits:**
```sql
SELECT id, name, credits FROM stores;
```

**Add more credits:**
```sql
UPDATE stores SET credits = credits + 100 WHERE name = 'your-store-name';
```

---

## That's It! 🎉

The fix is simple - just run the SQL file and you're done.
