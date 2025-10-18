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

    const { searchParams } = new URL(request.url);
    const clothingUrl = searchParams.get('url');
    const period = searchParams.get('period') || '30d';

    if (!clothingUrl) {
      return NextResponse.json(
        { error: "Clothing URL is required" },
        { status: 400 }
      );
    }

    // Calculate date range
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
        startDate = new Date(0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get try-ons for this specific clothing item
    const { data: tryons, error: tryonsError } = await supabase
      .from("tryon_history")
      .select("created_at, user_id, credits_used")
      .eq("store_id", user.store_id)
      .eq("clothing_image_url", clothingUrl)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (tryonsError) {
      console.error("Clothing tryons error:", tryonsError);
      return NextResponse.json(
        { error: "Failed to fetch clothing analytics" },
        { status: 500 }
      );
    }

    // Calculate metrics
    const totalTryons = tryons?.length || 0;
    const uniqueUsers = new Set(tryons?.map(t => t.user_id) || []).size;
    const totalCredits = tryons?.reduce((sum, t) => sum + (t.credits_used || 0), 0) || 0;

    // Group by date for chart
    const dailyData: Record<string, number> = {};
    tryons?.forEach(item => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    const chartData = Object.entries(dailyData).map(([date, count]) => ({
      date,
      tryons: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Get clothing details
    const { data: clothingDetails } = await supabase
      .from("store_images")
      .select("url, name, main_code, sub_variant")
      .eq("store_id", user.store_id)
      .eq("url", clothingUrl)
      .single();

    return NextResponse.json({
      clothing: {
        url: clothingUrl,
        name: clothingDetails?.name || `${clothingDetails?.main_code || ''}${clothingDetails?.sub_variant || ''}` || 'Unknown',
        main_code: clothingDetails?.main_code,
        sub_variant: clothingDetails?.sub_variant
      },
      overview: {
        total_tryons: totalTryons,
        unique_users: uniqueUsers,
        total_credits_used: totalCredits,
        first_tryon: tryons?.[0]?.created_at || null,
        last_tryon: tryons?.[tryons.length - 1]?.created_at || null
      },
      chartData
    });
  } catch (error: any) {
    console.error("Clothing analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get clothing analytics" },
      { status: 500 }
    );
  }
}
