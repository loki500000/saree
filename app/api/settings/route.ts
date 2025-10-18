import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/settings
 * Fetch application settings (public access)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .eq("key", "pose_tolerance")
      .single();

    if (error) {
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Return the pose tolerance value
    const poseToleranceValue = data?.value !== undefined && data.value !== null
      ? (typeof data.value === 'string' ? parseInt(data.value) : data.value)
      : 30; // Default to 30 if not found or null

    return NextResponse.json({
      pose_tolerance: poseToleranceValue,
    });
  } catch (error) {
    console.error("Error in GET /api/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings
 * Update application settings (super admin only)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Super admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { pose_tolerance } = body;

    // Validate pose_tolerance
    if (
      typeof pose_tolerance !== "number" ||
      pose_tolerance < 0 ||
      pose_tolerance > 100
    ) {
      return NextResponse.json(
        { error: "pose_tolerance must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Update setting
    const { error: upsertError } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "pose_tolerance",
          value: pose_tolerance,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (upsertError) {
      console.error("Error upserting settings:", upsertError);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pose_tolerance,
    });
  } catch (error) {
    console.error("Error in POST /api/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
