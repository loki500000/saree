# Multi-Tenant Virtual Try-On Setup Guide

## Quick Start

### Step 1: Install Dependencies ✅
Already completed! You have:
- Supabase client packages
- FAL AI client
- Next.js 15

### Step 2: Database Setup ✅
Already completed! You've run:
- `schema.sql` - Created all tables
- `rls-policies.sql` - Set up security
- `storage-setup.sql` - Created image storage

### Step 3: Create First Super Admin

You need to create your first super admin user to manage the system.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your app: http://localhost:3000
2. Sign up with your email (this will be your super admin account)
3. Go to Supabase Dashboard: https://supabase.com/dashboard/project/rndlzoogkqpbczifafkj/editor
4. Go to SQL Editor
5. Run this query (replace with your email):

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

**Option B: Direct SQL Insert**

Run this in Supabase SQL Editor:

```sql
-- Insert a user with encrypted password
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@example.com',
    crypt('your-password-here', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Super Admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- Update the profile to super_admin
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@example.com';
```

### Step 4: Start the Development Server

```bash
cd virtual-tryon
npm run dev
```

Visit http://localhost:3000

### Step 5: Initial Setup Workflow

Now that you have a super admin account, follow this workflow:

#### 1. Login as Super Admin
```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

#### 2. Create Your First Store
```bash
POST /api/admin/stores
{
  "name": "Main Store",
  "slug": "main-store",
  "credits": 100
}
```

Save the returned `store_id`.

#### 3. Add Credits to the Store
```bash
POST /api/admin/stores/{store_id}/credits
{
  "amount": 100,
  "description": "Initial credits"
}
```

#### 4. Create a Store Admin
```bash
POST /api/admin/users
{
  "email": "storeadmin@mainstore.com",
  "password": "password123",
  "name": "Store Admin",
  "role": "store_admin",
  "store_id": "{store_id}"
}
```

#### 5. Create Store Users
```bash
POST /api/admin/users
{
  "email": "user@mainstore.com",
  "password": "password123",
  "name": "John Doe",
  "role": "store_user",
  "store_id": "{store_id}"
}
```

---

## System Architecture

### User Hierarchy
```
Super Admin (you)
  └─ Store Admin (manages one store)
      └─ Store User (uses virtual try-on)
```

### Data Isolation
- Each store is completely isolated
- Store users can only see their store's data
- Store admins can only manage their store
- Super admin can manage everything

### Credit System
- 1 Virtual Try-On = 1 Credit
- Credits are managed at the store level
- Super admin adds credits to stores
- Credits are automatically deducted on try-on

---

## Testing the System

### Test 1: Super Admin Flow
1. Login as super admin
2. Create a store
3. Add credits to store
4. View all stores
5. Create users for the store

### Test 2: Store Admin Flow
1. Login as store admin
2. Upload gallery images (person & clothing)
3. View store users
4. Create a store user
5. Check credit balance

### Test 3: Store User Flow
1. Login as store user
2. View gallery images
3. Upload a personal photo (temp)
4. Select a clothing item from gallery
5. Perform virtual try-on
6. Download result
7. Check remaining credits

---

## API Endpoints Summary

### Authentication
- POST `/api/auth/signup` - Sign up
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout
- GET `/api/auth/me` - Get current user

### Virtual Try-On
- POST `/api/tryon` - Process try-on (deducts 1 credit)

### Gallery (Store Admin+)
- POST `/api/gallery/upload` - Upload gallery image
- GET `/api/gallery/images` - Get gallery images
- DELETE `/api/gallery/images/[id]` - Delete image

### Stores (Super Admin)
- GET `/api/admin/stores` - List stores
- POST `/api/admin/stores` - Create store
- GET `/api/admin/stores/[id]` - Get store
- PATCH `/api/admin/stores/[id]` - Update store
- DELETE `/api/admin/stores/[id]` - Delete store

### Credits (Super Admin)
- POST `/api/admin/stores/[id]/credits` - Add credits
- GET `/api/admin/stores/[id]/credits` - Get transactions

### Users (Store Admin+)
- GET `/api/admin/users` - List users
- POST `/api/admin/users` - Create user
- PATCH `/api/admin/users/[id]` - Update user
- DELETE `/api/admin/users/[id]` - Delete user

---

## Environment Variables

Make sure your `.env.local` has:

```env
# FAL AI
FAL_KEY=your_fal_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rndlzoogkqpbczifafkj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Troubleshooting

### "Unauthorized" error
- Check if you're logged in
- Verify your session cookie is present
- Try logging out and back in

### "Insufficient permissions" error
- Check your user role in the database
- Verify you're accessing the correct store's data

### "Insufficient credits" error
- Check store credit balance
- Add more credits as super admin

### Image upload fails
- Check file size (max 10MB)
- Check file type (JPEG, PNG, WEBP only)
- Verify Supabase storage bucket exists

### Credits not deducting
- Check if `deduct_credits` function exists in database
- Verify RLS policies are enabled
- Check Supabase logs for errors

---

## Next Steps

After setup, you can:

1. **Build Frontend UI** - Create dashboards for each user role
2. **Add Analytics** - Track usage, popular items, etc.
3. **Add Notifications** - Email alerts for low credits
4. **Add Billing** - Integrate payment system for credits
5. **Add Webhooks** - Notify stores of events
6. **Add API Rate Limiting** - Prevent abuse
7. **Add Image Optimization** - Compress uploaded images
8. **Add Caching** - Cache gallery images
9. **Add Search** - Search gallery images
10. **Deploy to Production** - Vercel, Netlify, etc.

---

## Support

For detailed API documentation, see `API-DOCUMENTATION.md`

For database schema details, see `supabase/README.md`
