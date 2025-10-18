import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST - Generate sample analytics data for testing
 * This endpoint creates fake try-on history data for testing analytics
 * Only accessible by super admin
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { days = 30, recordsPerDay = 5 } = body;

    const adminClient = createAdminClient();

    // Get all stores
    const { data: stores, error: storesError } = await adminClient
      .from("stores")
      .select("id");

    if (storesError || !stores || stores.length === 0) {
      return NextResponse.json(
        { error: "No stores found. Create a store first." },
        { status: 400 }
      );
    }

    // Get all users
    const { data: users, error: usersError } = await adminClient
      .from("profiles")
      .select("id, store_id")
      .not("store_id", "is", null);

    if (usersError || !users || users.length === 0) {
      return NextResponse.json(
        { error: "No users found. Create users first." },
        { status: 400 }
      );
    }

    // Get clothing images for each store
    const storeClothingMap: Record<string, string[]> = {};

    for (const store of stores) {
      const { data: clothingImages } = await adminClient
        .from("store_images")
        .select("url")
        .eq("store_id", store.id)
        .eq("type", "clothing");

      if (clothingImages && clothingImages.length > 0) {
        storeClothingMap[store.id] = clothingImages.map(img => img.url);
      }
    }

    // Generate sample data
    const sampleData = [];
    const now = new Date();

    for (let day = 0; day < days; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);

      // Generate records for this day
      const recordsForDay = Math.floor(Math.random() * recordsPerDay) + 1;

      for (let i = 0; i < recordsForDay; i++) {
        // Random time during the day
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        date.setHours(hour, minute, 0, 0);

        // Pick random user from available users
        const randomUser = users[Math.floor(Math.random() * users.length)];

        // Get clothing images for this user's store
        const storeClothingUrls = storeClothingMap[randomUser.store_id];
        const clothing_image_url = storeClothingUrls && storeClothingUrls.length > 0
          ? storeClothingUrls[Math.floor(Math.random() * storeClothingUrls.length)]
          : null;

        sampleData.push({
          user_id: randomUser.id,
          store_id: randomUser.store_id,
          clothing_image_url,
          credits_used: 1,
          created_at: date.toISOString(),
        });
      }
    }

    // Insert sample data
    const { error: insertError, data: insertedData } = await adminClient
      .from("tryon_history")
      .insert(sampleData)
      .select();

    if (insertError) {
      console.error("Insert sample data error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to insert sample data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Sample analytics data generated successfully",
      recordsCreated: insertedData?.length || 0,
      summary: {
        days,
        stores: stores.length,
        users: users.length,
        recordsGenerated: sampleData.length,
      },
    });
  } catch (error: any) {
    console.error("Seed analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate sample data" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all analytics data
 * Useful for resetting during testing
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const adminClient = createAdminClient();

    // Delete all try-on history
    const { error } = await adminClient
      .from("tryon_history")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all records

    if (error) {
      console.error("Delete analytics data error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to delete analytics data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "All analytics data cleared successfully",
    });
  } catch (error: any) {
    console.error("Clear analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to clear analytics data" },
      { status: 500 }
    );
  }
}
