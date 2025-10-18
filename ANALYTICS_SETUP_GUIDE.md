# Analytics Setup Guide

## Simple Analytics System

This is a brand new, simplified analytics system built from scratch.

## Setup Steps

### 1. Apply SQL Schema to Supabase

Go to your Supabase project → SQL Editor and run the file:
```
supabase/analytics.sql
```

This will create the `analytics_overview` view that aggregates try-on data.

### 2. Test the Analytics

1. Navigate to `http://localhost:3000/analytics`
2. You should see analytics for your store's try-on history
3. If no data exists yet, you'll see an empty state prompting you to do some try-ons

## How It Works

### Database
- **analytics_overview** view - Aggregates all try-on data per store

### API
- `GET /api/analytics` - Fetches analytics data for the logged-in store admin

### Frontend
- `/analytics` page - Simple, clean dashboard showing:
  - Total try-ons
  - Unique users
  - Credits used
  - Active days
  - Chart of try-ons over last 30 days

## Features

✅ Simple and clean UI
✅ Real-time data from tryon_history table
✅ Bar chart showing activity over time
✅ Responsive design
✅ Proper authentication with credentials
✅ Error handling
✅ Empty state for new stores

## Navigation

The Analytics button is available in:
- Store Admin page (`/store/admin`) → Top navigation tabs

## No External Dependencies

This analytics system uses:
- Simple SQL view (no complex functions)
- Clean TypeScript/React code
- No chart libraries (custom SVG-based bar chart)
- Minimal API surface

## Troubleshooting

If you see "No Data Yet":
1. Make sure you've applied the SQL schema
2. Make sure you have some try-on history in the database
3. Check browser console for any errors
4. Click the Refresh button

If you get authentication errors:
1. Make sure you're logged in as store_admin or super_admin
2. Clear browser cache and cookies
3. Log out and log back in
