import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

// POST - Add credits to a store
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
    const { id: storeId } = await params;
    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Verify store exists
    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Add credits using the database function
    const { error: addError } = await adminClient.rpc("add_credits", {
      p_store_id: storeId,
      p_amount: amount,
      p_description: description || "Credits added by admin",
      p_created_by: null,
    });

    if (addError) {
      console.error("Add credits error:", addError);
      return NextResponse.json(
        { error: addError.message || "Failed to add credits" },
        { status: 500 }
      );
    }

    // Get updated store data
    const { data: updatedStore } = await adminClient
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();

    return NextResponse.json({
      message: "Credits added successfully",
      store: updatedStore,
    });
  } catch (error: any) {
    console.error("Add credits error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to add credits" },
      { status: 500 }
    );
  }
}
