import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin, isSuperAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Get users (filtered by store for store admins)
export async function GET(request: NextRequest) {
  try {
    const user = await requireStoreAdmin();

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    const supabase = await createClient();

    let query = supabase.from('profiles').select('*');

    if (isSuperAdmin(user)) {
      // Super admin can filter by store or see all
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
    } else {
      // Store admin can only see their store users
      query = query.eq('store_id', user.store_id);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch users error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Get users error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get users" },
      { status: 500 }
    );
  }
}

// Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireStoreAdmin();

    const body = await request.json();
    const { email, password, name, role = 'store_user', store_id } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Determine which store the user should belong to
    let targetStoreId = store_id;

    if (!isSuperAdmin(currentUser)) {
      // Store admins can only create users in their own store
      targetStoreId = currentUser.store_id;

      // Store admins can only create store_user role
      if (role !== 'store_user') {
        return NextResponse.json(
          { error: "Store admins can only create store_user role" },
          { status: 403 }
        );
      }
    }

    if (!targetStoreId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    // Use admin client to create user
    const adminClient = createAdminClient();

    // Create auth user
    const { data: authData, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
      },
    });

    if (signUpError) {
      console.error("Create user error:", signUpError);
      return NextResponse.json(
        { error: signUpError.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Update profile with store and role
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .update({
        store_id: targetStoreId,
        role: role,
        name,
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (profileError) {
      console.error("Update profile error:", profileError);
      // Try to delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message || "Failed to create user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User created successfully",
      user: profile,
    });
  } catch (error: any) {
    console.error("Create user error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
