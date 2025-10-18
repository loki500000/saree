import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

// Get single store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const supabase = await createClient();

    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    console.error("Get store error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get store" },
      { status: 500 }
    );
  }
}

// Update store
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, slug, active } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (active !== undefined) updates.active = active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: store, error } = await supabase
      .from('stores')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Update store error:", error);

      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: "A store with this slug already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to update store" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Store updated successfully",
      store,
    });
  } catch (error: any) {
    console.error("Update store error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update store" },
      { status: 500 }
    );
  }
}

// Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id } = await params;

    const supabase = await createClient();

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Delete store error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete store" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Store deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete store error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete store" },
      { status: 500 }
    );
  }
}
