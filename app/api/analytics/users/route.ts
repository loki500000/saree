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
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || '30d';

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

    if (userId) {
      // Get analytics for specific user
      const { data: tryons, error: tryonsError } = await supabase
        .from("tryon_history")
        .select("created_at, clothing_image_url, credits_used")
        .eq("store_id", user.store_id)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (tryonsError) {
        console.error("User tryons error:", tryonsError);
        return NextResponse.json(
          { error: "Failed to fetch user analytics" },
          { status: 500 }
        );
      }

      // Get user details
      const { data: userDetails } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("id", userId)
        .single();

      // Calculate metrics
      const totalTryons = tryons?.length || 0;
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

      return NextResponse.json({
        user: {
          id: userId,
          name: userDetails?.name || 'Unknown User',
          email: userDetails?.email || ''
        },
        overview: {
          total_tryons: totalTryons,
          total_credits_used: totalCredits,
          first_tryon: tryons?.[0]?.created_at || null,
          last_tryon: tryons?.[tryons.length - 1]?.created_at || null
        },
        chartData
      });
    } else {
      // Get list of all users with their stats
      const { data: tryons, error: tryonsError } = await supabase
        .from("tryon_history")
        .select("user_id, created_at, credits_used")
        .eq("store_id", user.store_id)
        .gte("created_at", startDate.toISOString());

      if (tryonsError) {
        console.error("Users tryons error:", tryonsError);
        return NextResponse.json(
          { error: "Failed to fetch users analytics" },
          { status: 500 }
        );
      }

      // Aggregate by user
      const userStats: Record<string, { tryons: number; credits: number; lastActivity: string }> = {};
      tryons?.forEach(item => {
        if (!userStats[item.user_id]) {
          userStats[item.user_id] = { tryons: 0, credits: 0, lastActivity: item.created_at };
        }
        userStats[item.user_id].tryons += 1;
        userStats[item.user_id].credits += item.credits_used || 0;
        if (new Date(item.created_at) > new Date(userStats[item.user_id].lastActivity)) {
          userStats[item.user_id].lastActivity = item.created_at;
        }
      });

      // Get user details
      const userIds = Object.keys(userStats);
      const { data: userDetails } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const users = userIds.map(userId => {
        const details = userDetails?.find(u => u.id === userId);
        return {
          id: userId,
          name: details?.name || 'Unknown User',
          email: details?.email || '',
          tryons: userStats[userId].tryons,
          credits_used: userStats[userId].credits,
          last_activity: userStats[userId].lastActivity
        };
      }).sort((a, b) => b.tryons - a.tryons);

      return NextResponse.json({
        users
      });
    }
  } catch (error: any) {
    console.error("Users analytics error:", error);

    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to get users analytics" },
      { status: 500 }
    );
  }
}
