import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers"; // Changed from requireStoreAdmin
import { createClient } from "@/lib/supabase/server";

// Helper function to get date range
function getDateRange(period: string) {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
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

  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

// Helper to group data by time period
function groupByTimePeriod(data: any[], groupBy: 'day' | 'week' | 'month') {
  const grouped: Record<string, number> = {};

  data.forEach((item) => {
    const date = new Date(item.created_at);
    let key: string;

    if (groupBy === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    grouped[key] = (grouped[key] || 0) + 1;
  });

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// GET - Get advanced analytics for super admin using optimized SQL functions
export async function GET(request: NextRequest) {
  try {
    // Ensure only super_admin can access
    const user = await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const groupBy = (searchParams.get('groupBy') as 'day' | 'week' | 'month') || 'day';

    const { startDate, endDate } = getDateRange(period);
    const supabase = await createClient();

    // Use optimized SQL function for daily analytics - adapted for super admin
    const { data: dailyAnalytics, error: dailyError } = await supabase
      .rpc('get_platform_analytics', {
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (dailyError) {
      console.error("Fetch daily platform analytics error:", dailyError);
      return NextResponse.json(
        { error: dailyError.message || "Failed to fetch daily platform analytics" },
        { status: 500 }
      );
    }

    // Get previous period for comparison
    const periodDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);

    const { data: prevPeriodAnalytics } = await supabase
      .rpc('get_platform_analytics', {
        p_start_date: prevStartDate.toISOString(),
        p_end_date: startDate
      });

    // Calculate aggregate metrics
    const totalTryOns = dailyAnalytics?.reduce((sum: number, day: any) => sum + Number(day.tryons_count || 0), 0) || 0;
    const totalCreditsUsed = dailyAnalytics?.reduce((sum: number, day: any) => sum + Number(day.credits_used || 0), 0) || 0;
    const uniqueUsersSet = new Set(dailyAnalytics?.flatMap((day: any) => day.unique_users) || []);
    const uniqueUsers = uniqueUsersSet.size;

    const prevTotalTryOns = prevPeriodAnalytics?.reduce((sum: number, day: any) => sum + Number(day.tryons_count || 0), 0) || 0;
    const tryOnsChange = prevTotalTryOns > 0
      ? ((totalTryOns - prevTotalTryOns) / prevTotalTryOns) * 100
      : 0;

    const prevUniqueUsersSet = new Set(prevPeriodAnalytics?.flatMap((day: any) => day.unique_users) || []);
    const prevUniqueUsers = prevUniqueUsersSet.size;
    const usersChange = prevUniqueUsers > 0
      ? ((uniqueUsers - prevUniqueUsers) / prevUniqueUsers) * 100
      : 0;

    const avgCreditsPerUser = uniqueUsers > 0 ? totalCreditsUsed / uniqueUsers : 0;
    const prevAvgCreditsPerUser = prevUniqueUsers > 0 ? (prevTotalTryOns / prevUniqueUsers) : 0;
    const avgCreditsChange = prevAvgCreditsPerUser > 0
      ? ((avgCreditsPerUser - prevAvgCreditsPerUser) / prevAvgCreditsPerUser) * 100
      : 0;

    // Get top users using SQL function - adapted for super admin
    const { data: topUsers, error: topUsersError } = await supabase
      .rpc('get_platform_top_users', {
        p_limit: 10,
        p_start_date: startDate
      });

    if (topUsersError) {
      console.error("Fetch platform top users error:", topUsersError);
    }

    // Get popular clothing using SQL function - adapted for super admin
    const { data: topClothingItems, error: clothingError } = await supabase
      .rpc('get_platform_popular_clothing', {
        p_limit: 10,
        p_start_date: startDate
      });

    if (clothingError) {
      console.error("Fetch platform popular clothing error:", clothingError);
    }

    // Enrich clothing items with names from store_images (this might need to be adjusted if store_images are per-store)
    // For now, assuming clothing_image_url contains enough info or we can fetch name from a global table
    if (topClothingItems && topClothingItems.length > 0) {
      const clothingUrls = topClothingItems.map((item: any) => item.clothing_image_url);
      const { data: clothingImages } = await supabase
        .from("store_images") // Assuming store_images can be queried globally or a new table is used
        .select("url, name")
        .in("url", clothingUrls); // No store_id filter here for platform-wide analytics

      topClothingItems.forEach((item: any) => {
        const imageData = clothingImages?.find(img => img.url === item.clothing_image_url);
        if (imageData) {
          item.name = imageData.name;
        }
      });
    }

    // Get hourly usage pattern using SQL function - adapted for super admin
    const { data: hourlyPattern, error: hourlyError } = await supabase
      .rpc('get_platform_hourly_usage_pattern', {
        p_days_back: periodDays > 0 ? periodDays : 7
      });

    if (hourlyError) {
      console.error("Fetch platform hourly pattern error:", hourlyError);
    }

    const peakHoursData = hourlyPattern?.map((item: any) => ({
      hour: `${item.hour_of_day}:00`,
      count: Number(item.total_tryons || 0),
      avg: Number(item.avg_tryons || 0),
    })) || [];

    // Get credit breakdown - adapted for super admin
    const { data: creditBreakdown, error: creditError } = await supabase
      .rpc('get_platform_credit_breakdown', {
        p_start_date: startDate,
        p_end_date: endDate
      });

    if (creditError) {
      console.error("Fetch platform credit breakdown error:", creditError);
    }

    // Group daily analytics by time period
    const timeseriesData = groupByTimePeriod(
      dailyAnalytics?.map((day: any) => ({
        created_at: day.date,
        count: day.tryons_count
      })) || [],
      groupBy
    );

    // Get recent activity - adapted for super admin
    const { data: recentActivity } = await supabase
      .from("tryon_history")
      .select(`
        *,
        user:profiles!tryon_history_user_id_fkey(id, name, email),
        store:stores!tryon_history_store_id_fkey(id, name)
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate day of week from recent activity for better accuracy
    const dayOfWeekUsage = new Array(7).fill(0);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    recentActivity?.forEach((item) => {
      const day = new Date(item.created_at).getDay();
      dayOfWeekUsage[day] += 1;
    });

    const dayOfWeekData = dayOfWeekUsage.map((count, index) => ({
      day: dayNames[index],
      count,
    }));

    return NextResponse.json({
      period,
      metrics: {
        totalTryOns,
        totalCreditsUsed,
        uniqueUsers,
        avgCreditsPerUser: Number(avgCreditsPerUser.toFixed(2)),
        tryOnsChange: Number(tryOnsChange.toFixed(2)),
        usersChange: Number(usersChange.toFixed(2)),
        avgCreditsChange: Number(avgCreditsChange.toFixed(2)),
      },
      timeseries: timeseriesData,
      topClothingItems: topClothingItems || [],
      topUsers: topUsers || [],
      peakHours: peakHoursData,
      dayOfWeek: dayOfWeekData,
      creditBreakdown: creditBreakdown || [],
      recentActivity: recentActivity || [],
    });
  } catch (error: any) {
    console.error("Get advanced platform analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get platform analytics" },
      { status: 500 }
    );
  }
}