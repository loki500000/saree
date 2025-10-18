import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin, checkStoreAccess } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DELETE - Delete a store user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireStoreAdmin();
    const { id: userId } = await params;

    if (!currentUser.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    // Check if the user belongs to the same store
    const supabase = await createClient();
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.store_id !== currentUser.store_id) {
      return NextResponse.json(
        { error: "User not found or access denied" },
        { status: 404 }
      );
    }

    // Prevent deleting store_admin role
    if (targetUser.role === "store_admin") {
      return NextResponse.json(
        { error: "Cannot delete store admin users" },
        { status: 403 }
      );
    }

    // Delete the user using admin client
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Delete user error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete user" },
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

// PATCH - Update user active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireStoreAdmin();
    const { id: userId } = await params;

    if (!currentUser.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { active } = body;

    if (active === undefined) {
      return NextResponse.json(
        { error: "Active status is required" },
        { status: 400 }
      );
    }

    // Check if the user belongs to the same store
    const supabase = await createClient();
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!targetUser || targetUser.store_id !== currentUser.store_id) {
      return NextResponse.json(
        { error: "User not found or access denied" },
        { status: 404 }
      );
    }

    // Prevent modifying store_admin role
    if (targetUser.role === "store_admin") {
      return NextResponse.json(
        { error: "Cannot modify store admin users" },
        { status: 403 }
      );
    }

    // Update user active status
    const { data: updatedUser, error: updateError } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Update user error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
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
