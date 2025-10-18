import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin, isSuperAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireStoreAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, role, active, store_id } = body;

    const supabase = await createClient();

    // Get user to check permissions
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!isSuperAdmin(currentUser)) {
      // Store admin can only update users in their store
      if (targetUser.store_id !== currentUser.store_id) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      // Store admin cannot change role or store_id
      if (role !== undefined || store_id !== undefined) {
        return NextResponse.json(
          { error: "Store admins cannot change user role or store" },
          { status: 403 }
        );
      }
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (store_id !== undefined) updates.store_id = store_id;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Update user error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User updated successfully",
      user,
    });
  } catch (error: any) {
    console.error("Update user error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireStoreAdmin();
    const { id } = await params;

    const supabase = await createClient();

    // Get user to check permissions
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!isSuperAdmin(currentUser)) {
      // Store admin can only delete users in their store
      if (targetUser.store_id !== currentUser.store_id) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      // Store admin cannot delete other admins
      if (targetUser.role !== 'store_user') {
        return NextResponse.json(
          { error: "Store admins can only delete store users" },
          { status: 403 }
        );
      }
    }

    // Use admin client to delete auth user
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Delete auth user error:", authError);
      return NextResponse.json(
        { error: authError.message || "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
