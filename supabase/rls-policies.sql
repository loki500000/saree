-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE tryon_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'super_admin'
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's store_id
CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT store_id FROM profiles
        WHERE id = auth.uid()
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is store admin
CREATE OR REPLACE FUNCTION is_store_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('store_admin', 'super_admin')
        AND active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORES TABLE POLICIES
-- ============================================

-- Super admins can do everything
CREATE POLICY "Super admins can view all stores"
    ON stores FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Super admins can insert stores"
    ON stores FOR INSERT
    WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update stores"
    ON stores FOR UPDATE
    USING (is_super_admin());

CREATE POLICY "Super admins can delete stores"
    ON stores FOR DELETE
    USING (is_super_admin());

-- Store users can view their own store
CREATE POLICY "Users can view their own store"
    ON stores FOR SELECT
    USING (id = get_user_store_id());

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_super_admin());

-- Super admins can create any profile
CREATE POLICY "Super admins can create profiles"
    ON profiles FOR INSERT
    WITH CHECK (is_super_admin());

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile"
    ON profiles FOR UPDATE
    USING (is_super_admin());

-- Store admins can view profiles in their store
CREATE POLICY "Store admins can view store profiles"
    ON profiles FOR SELECT
    USING (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- Store admins can create users in their store
CREATE POLICY "Store admins can create store users"
    ON profiles FOR INSERT
    WITH CHECK (
        is_store_admin() AND
        store_id = get_user_store_id() AND
        role = 'store_user'
    );

-- Store admins can update users in their store (except role)
CREATE POLICY "Store admins can update store users"
    ON profiles FOR UPDATE
    USING (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- ============================================
-- STORE IMAGES TABLE POLICIES
-- ============================================

-- Users can view images from their store
CREATE POLICY "Users can view their store images"
    ON store_images FOR SELECT
    USING (store_id = get_user_store_id());

-- Store admins can upload images to their store
CREATE POLICY "Store admins can upload images"
    ON store_images FOR INSERT
    WITH CHECK (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- Store admins can delete images from their store
CREATE POLICY "Store admins can delete images"
    ON store_images FOR DELETE
    USING (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- Super admins can do everything with images
CREATE POLICY "Super admins can manage all images"
    ON store_images FOR ALL
    USING (is_super_admin());

-- ============================================
-- TRYON HISTORY TABLE POLICIES
-- ============================================

-- Users can view their own tryon history
CREATE POLICY "Users can view own history"
    ON tryon_history FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own tryon history
CREATE POLICY "Users can create own history"
    ON tryon_history FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        store_id = get_user_store_id()
    );

-- Store admins can view all history in their store
CREATE POLICY "Store admins can view store history"
    ON tryon_history FOR SELECT
    USING (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- Super admins can view all history
CREATE POLICY "Super admins can view all history"
    ON tryon_history FOR SELECT
    USING (is_super_admin());

-- ============================================
-- CREDIT TRANSACTIONS TABLE POLICIES
-- ============================================

-- Store admins can view transactions for their store
CREATE POLICY "Store admins can view store transactions"
    ON credit_transactions FOR SELECT
    USING (
        is_store_admin() AND
        store_id = get_user_store_id()
    );

-- Super admins can view all transactions
CREATE POLICY "Super admins can view all transactions"
    ON credit_transactions FOR SELECT
    USING (is_super_admin());

-- Transactions are created via functions, not directly
-- So we don't need INSERT policies for regular users
