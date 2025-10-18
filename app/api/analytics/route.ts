import { NextRequest, NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const user = await requireStoreAdmin();
    const supabase = await createClient();

    if (!user.store_id) {
      return NextResponse.json(
        { error: "User is not associated with any store" },
        { status: 403 }
      );
    }

    // Get period from query params (default: 30d)
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date(now);

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get try-ons for the selected period
    const { data: periodTryons, error: tryonsError } = await supabase
      .from("tryon_history")
      .select("created_at, credits_used, user_id, clothing_image_url")
      .eq("store_id", user.store_id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (tryonsError) {
      console.error("Period tryons error:", tryonsError);
    }

    // Calculate period-specific metrics
    const totalTryons = periodTryons?.length || 0;
    const uniqueUsers = new Set(periodTryons?.map(t => t.user_id) || []).size;
    const totalCredits = periodTryons?.reduce((sum, t) => sum + (t.credits_used || 0), 0) || 0;
    const activeDays = new Set(periodTryons?.map(t => new Date(t.created_at).toISOString().split('T')[0]) || []).size;

    // Get overall stats from view (for comparison)
    const { data: overview, error: overviewError } = await supabase
      .from("analytics_overview")
      .select("*")
      .eq("store_id", user.store_id)
      .single();

    if (overviewError && overviewError.code !== 'PGRST116') {
      console.error("Analytics overview error:", overviewError);
    }

    // Group by date for the chart
    const dailyData: Record<string, number> = {};
    periodTryons?.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    const chartData = Object.entries(dailyData).map(([date, count]) => ({
      date,
      tryons: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Get popular clothing items for the period
    const { data: popularClothing, error: clothingError } = await supabase
      .from("analytics_popular_clothing")
      .select("*")
      .eq("store_id", user.store_id)
      .limit(10);

    if (clothingError) {
      console.error("Popular clothing error:", clothingError);
    }

    // Enrich clothing items with names from store_images
    let enrichedClothing = popularClothing || [];
    if (popularClothing && popularClothing.length > 0) {
      const clothingUrls = popularClothing.map(item => item.clothing_image_url);
      const { data: clothingImages } = await supabase
        .from("store_images")
        .select("url, name, main_code, sub_variant")
        .eq("store_id", user.store_id)
        .in("url", clothingUrls);

      enrichedClothing = popularClothing.map(item => {
        const imageData = clothingImages?.find(img => img.url === item.clothing_image_url);
        return {
          ...item,
          name: imageData?.name || `${imageData?.main_code || ''}${imageData?.sub_variant || ''}` || 'Unknown',
          main_code: imageData?.main_code,
          sub_variant: imageData?.sub_variant
        };
      });
    }

    return NextResponse.json({
      period,
      overview: {
        total_tryons: totalTryons,
        unique_users: uniqueUsers,
        total_credits_used: totalCredits,
        active_days: activeDays,
        first_tryon: periodTryons?.[0]?.created_at || null,
        last_tryon: periodTryons?.[periodTryons.length - 1]?.created_at || null
      },
      allTimeStats: overview || {
        total_tryons: 0,
        unique_users: 0,
        total_credits_used: 0
      },
      chartData,
      popularClothing: enrichedClothing
    });
  } catch (error: any) {
    console.error("Analytics error:", error);

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
