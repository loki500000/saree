import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

// GET - Get current store data for store admin
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

    // Get the store data
    const { data: store, error } = await supabase
      .from("stores")
      .select("*")
      .eq("id", user.store_id)
      .single();

    if (error || !store) {
      console.error("Fetch store error:", error);
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    console.error("Get store data error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get store data" },
      { status: 500 }
    );
  }
}
