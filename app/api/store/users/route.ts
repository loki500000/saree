import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET - List users in the store
export async function GET(request: NextRequest) {
  try {
    const user = await requireStoreAdmin();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Get all users in this store
    const { data: users, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("store_id", user.store_id)
      .order("created_at", { ascending: false });

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

// POST - Create a new store user
export async function POST(request: NextRequest) {
  try {
    const user = await requireStoreAdmin();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // Update profile with store_id and name
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        store_id: user.store_id,
        name,
        role: "store_user",
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Try to delete the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: profileError.message || "Failed to create user profile" },
        { status: 500 }
      );
    }

    // Fetch the complete profile
    const { data: newUser } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    return NextResponse.json({
      message: "User created successfully",
      user: newUser,
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
