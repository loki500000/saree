import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

// Get all stores
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const supabase = await createClient();

    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch stores error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch stores" },
        { status: 500 }
      );
    }

    return NextResponse.json({ stores });
  } catch (error: any) {
    console.error("Get stores error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get stores" },
      { status: 500 }
    );
  }
}

// Create new store
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { name, slug, credits = 0 } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        name,
        slug,
        credits,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Create store error:", error);

      if (error.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: "A store with this slug already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message || "Failed to create store" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Store created successfully",
      store,
    });
  } catch (error: any) {
    console.error("Create store error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create store" },
      { status: 500 }
    );
  }
}
