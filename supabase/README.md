# Supabase Database Setup Guide

This guide will help you set up your Supabase database for the multi-tenant virtual try-on application.

## Step-by-Step Setup

### 1. Run Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rndlzoogkqpbczifafkj
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `schema.sql` and paste it into the editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for success message

### 2. Set Up Row Level Security

1. In the same **SQL Editor**, create a **New Query**
2. Copy the contents of `rls-policies.sql` and paste it
3. Click **Run**
4. Wait for success message

### 3. Create Storage Bucket

1. In the same **SQL Editor**, create a **New Query**
2. Copy the contents of `storage-setup.sql` and paste it
3. Click **Run**
4. Wait for success message

### 4. Verify Setup

#### Check Tables
1. Go to **Table Editor** in the left sidebar
2. You should see these tables:
   - `stores`
   - `profiles`
   - `store_images`
   - `tryon_history`
   - `credit_transactions`

#### Check Storage
1. Go to **Storage** in the left sidebar
2. You should see the `store-gallery` bucket

### 5. Create First Super Admin

Run this SQL to create your first super admin user:

```sql
-- First, you need to sign up a user through your app or manually create one
-- Then update their profile to be super admin:

UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

**OR** Create a super admin directly:

```sql
-- Insert into auth.users (this is just for testing)
-- In production, users should sign up through your app

-- 1. Create a test super admin (you'll set password via Supabase Auth later)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin@example.com',
    crypt('your-password-here', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);

-- 2. Update their profile to super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@example.com';
```

**RECOMMENDED**: Use Supabase Authentication UI to create the first user, then promote them to super_admin.

### 6. Test Database

Run these queries to verify everything works:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Test deduct_credits function
SELECT deduct_credits(
    (SELECT id FROM stores LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    1
);

-- Check credit transactions
SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 5;
```

## Database Schema Overview

### Tables

1. **stores**: Store information and credit balance
2. **profiles**: User profiles with roles and store association
3. **store_images**: Gallery images for each store
4. **tryon_history**: Metadata about virtual try-on usage
5. **credit_transactions**: Audit log of all credit changes

### User Roles

- `super_admin`: Full access to everything
- `store_admin`: Can manage their store, users, and images
- `store_user`: Can only use virtual try-on in their store

### Key Functions

- `deduct_credits(store_id, user_id, amount)`: Safely deduct credits with transaction logging
- `add_credits(store_id, amount, description, created_by)`: Add credits to a store
- `is_super_admin()`: Check if current user is super admin
- `get_user_store_id()`: Get current user's store ID

## Next Steps

After setting up the database:

1. Run your Next.js app: `npm run dev`
2. Test authentication
3. Create your first store (as super admin)
4. Add users to stores
5. Upload gallery images
6. Test virtual try-on with credits

## Troubleshooting

### "permission denied for table" error
- Make sure RLS policies are created
- Check if user has the correct role
- Verify user is authenticated

### "function does not exist" error
- Make sure you ran `schema.sql` before `rls-policies.sql`
- Check for any SQL errors in the execution log

### Storage upload fails
- Verify storage bucket exists
- Check storage policies are created
- Ensure file size is under 10MB
- Check file type is allowed (jpeg, png, webp)
