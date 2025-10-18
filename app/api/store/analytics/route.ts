import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

// GET - Get analytics overview for store using optimized SQL views
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

    // Use the optimized analytics_store_overview view
    const { data: storeOverview, error: overviewError } = await supabase
      .from("analytics_store_overview")
      .select("*")
      .eq("store_id", user.store_id)
      .single();

    if (overviewError) {
      console.error("Fetch store overview error:", overviewError);
      return NextResponse.json(
        { error: overviewError.message || "Failed to fetch store overview" },
        { status: 500 }
      );
    }

    // Get top users for the last 30 days
    const { data: topUsers, error: usersError } = await supabase
      .rpc('get_top_users', {
        p_store_id: user.store_id,
        p_limit: 10,
        p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (usersError) {
      console.error("Fetch top users error:", usersError);
    }

    // Get popular clothing for the last 30 days
    const { data: topClothing, error: clothingError } = await supabase
      .rpc('get_popular_clothing', {
        p_store_id: user.store_id,
        p_limit: 10,
        p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (clothingError) {
      console.error("Fetch popular clothing error:", clothingError);
    }

    // Get recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from("tryon_history")
      .select(`
        *,
        user:profiles!tryon_history_user_id_fkey(id, name, email)
      `)
      .eq("store_id", user.store_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (activityError) {
      console.error("Fetch recent activity error:", activityError);
    }

    return NextResponse.json({
      totalTryOns: storeOverview?.total_tryons || 0,
      totalCreditsUsed: storeOverview?.total_credits_used || 0,
      currentCredits: storeOverview?.current_credits || 0,
      totalUsers: storeOverview?.total_users || 0,
      personImages: storeOverview?.person_images || 0,
      clothingImages: storeOverview?.clothing_images || 0,
      tryonsLast7Days: storeOverview?.tryons_last_7_days || 0,
      tryonsLast30Days: storeOverview?.tryons_last_30_days || 0,
      clothingStats: topClothing || [],
      userStats: topUsers || [],
      recentActivity: recentActivity || [],
    });
  } catch (error: any) {
    console.error("Get analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get analytics" },
      { status: 500 }
    );
  }
}
