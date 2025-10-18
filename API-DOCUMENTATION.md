# Virtual Try-On API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected routes require authentication via Supabase session cookies.

### Auth Endpoints

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "store_user",
    "store_id": "uuid",
    "name": "John Doe"
  }
}
```

#### POST /auth/logout
Logout current user.

**Response:**
```json
{
  "message": "Logout successful"
}
```

#### GET /auth/me
Get current authenticated user.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "store_user",
    "store_id": "uuid",
    "name": "John Doe"
  }
}
```

---

## Virtual Try-On

#### POST /tryon
Process a virtual try-on (requires authentication, deducts 1 credit).

**Request Body:**
```json
{
  "full_body_image": "https://...",
  "clothing_image": "https://...",
  "gender": "female"
}
```

**Response:**
```json
{
  "image": {
    "url": "https://...",
    "width": 1024,
    "height": 1024,
    "content_type": "image/jpeg"
  },
  "credits_remaining": 42
}
```

**Error Codes:**
- 401: Not authenticated
- 402: Insufficient credits
- 403: User not associated with store

---

## Gallery Management

#### POST /gallery/upload
Upload an image to store gallery (requires store admin role).

**Request:** multipart/form-data
- `file`: Image file (JPEG, PNG, WEBP, max 10MB)
- `type`: "person" or "clothing"
- `name`: Optional display name

**Response:**
```json
{
  "message": "Image uploaded successfully",
  "image": {
    "id": "uuid",
    "store_id": "uuid",
    "url": "https://...",
    "type": "person",
    "name": "Model 1",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### GET /gallery/images
Get all gallery images for current user's store.

**Query Parameters:**
- `type` (optional): Filter by "person" or "clothing"

**Response:**
```json
{
  "images": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "url": "https://...",
      "type": "clothing",
      "name": "Dress 1",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### DELETE /gallery/images/[id]
Delete a gallery image (requires store admin role).

**Response:**
```json
{
  "message": "Image deleted successfully"
}
```

---

## Store Management (Super Admin Only)

#### GET /admin/stores
Get all stores.

**Response:**
```json
{
  "stores": [
    {
      "id": "uuid",
      "name": "Store Name",
      "slug": "store-slug",
      "credits": 100,
      "active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /admin/stores
Create a new store.

**Request Body:**
```json
{
  "name": "New Store",
  "slug": "new-store",
  "credits": 100
}
```

**Response:**
```json
{
  "message": "Store created successfully",
  "store": {
    "id": "uuid",
    "name": "New Store",
    "slug": "new-store",
    "credits": 100,
    "active": true
  }
}
```

#### GET /admin/stores/[id]
Get a single store.

**Response:**
```json
{
  "store": {
    "id": "uuid",
    "name": "Store Name",
    "slug": "store-slug",
    "credits": 100,
    "active": true
  }
}
```

#### PATCH /admin/stores/[id]
Update a store.

**Request Body:**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug",
  "active": false
}
```

**Response:**
```json
{
  "message": "Store updated successfully",
  "store": { ... }
}
```

#### DELETE /admin/stores/[id]
Delete a store.

**Response:**
```json
{
  "message": "Store deleted successfully"
}
```

---

## Credit Management (Super Admin Only)

#### POST /admin/stores/[id]/credits
Add credits to a store.

**Request Body:**
```json
{
  "amount": 50,
  "description": "Monthly credit purchase"
}
```

**Response:**
```json
{
  "message": "Successfully added 50 credits",
  "store": {
    "id": "uuid",
    "credits": 150
  }
}
```

#### GET /admin/stores/[id]/credits
Get credit transactions for a store.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50)

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "amount": 50,
      "type": "purchase",
      "description": "Monthly credit purchase",
      "created_by": "uuid",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

## User Management

#### GET /admin/users
Get users (filtered by store for store admins).

**Query Parameters:**
- `store_id` (optional, super admin only): Filter by store

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "store_id": "uuid",
      "role": "store_user",
      "name": "John Doe",
      "email": "john@example.com",
      "active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

#### POST /admin/users
Create a new user.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "store_user",
  "store_id": "uuid"
}
```

**Notes:**
- Store admins can only create users in their own store
- Store admins can only create "store_user" role
- Super admins can create users in any store with any role

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "role": "store_user",
    "store_id": "uuid"
  }
}
```

#### PATCH /admin/users/[id]
Update a user.

**Request Body:**
```json
{
  "name": "Updated Name",
  "role": "store_admin",
  "active": false
}
```

**Notes:**
- Store admins can only update users in their store
- Store admins cannot change role or store_id

**Response:**
```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

#### DELETE /admin/users/[id]
Delete a user.

**Notes:**
- Store admins can only delete store_user role in their store
- Super admins can delete any user

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

---

## User Roles

### super_admin
- Full access to everything
- Can create/manage stores
- Can add credits to stores
- Can create/manage users in any store
- Can view all data

### store_admin
- Can manage users in their store (create, update store_user only)
- Can upload/delete gallery images
- Can view store credits and transactions
- Can view their store's try-on history

### store_user
- Can view gallery images
- Can perform virtual try-ons (uses credits)
- Can view their own try-on history

---

## Error Responses

All endpoints may return these error responses:

**400 Bad Request**
```json
{
  "error": "Validation error message"
}
```

**401 Unauthorized**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

---

## Testing the API

### 1. Create a Super Admin

First, sign up a user, then promote them in Supabase SQL editor:

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'admin@example.com';
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'
```

### 3. Create a Store

```bash
curl -X POST http://localhost:3000/api/admin/stores \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Store","slug":"test-store","credits":100}'
```

### 4. Add Credits

```bash
curl -X POST http://localhost:3000/api/admin/stores/[store-id]/credits \
  -H "Content-Type: application/json" \
  -d '{"amount":50,"description":"Initial credits"}'
```

### 5. Create Store User

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@test-store.com",
    "password":"password123",
    "name":"Store User",
    "role":"store_user",
    "store_id":"[store-id]"
  }'
```
