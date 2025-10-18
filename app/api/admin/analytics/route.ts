import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      startDate = new Date(0);
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
      key = date.toISOString().split('T')[0];
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

// GET - Get system-wide analytics (super admin only)
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const groupBy = (searchParams.get('groupBy') as 'day' | 'week' | 'month') || 'day';

    const { startDate, endDate } = getDateRange(period);
    const adminClient = createAdminClient();

    // Get all stores
    const { data: stores, error: storesError } = await adminClient
      .from("stores")
      .select("*");

    if (storesError) {
      console.error("Fetch stores error:", storesError);
      return NextResponse.json(
        { error: storesError.message || "Failed to fetch stores" },
        { status: 500 }
      );
    }

    // Get all try-on history with enriched data
    const { data: tryOnHistory, error } = await adminClient
      .from("tryon_history")
      .select(`
        *,
        store:stores!tryon_history_store_id_fkey(id, name),
        user:profiles!tryon_history_user_id_fkey(id, name, email)
      `)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch analytics error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch analytics" },
        { status: 500 }
      );
    }

    // Get credit transactions for revenue tracking
    const { data: creditTransactions } = await adminClient
      .from("credit_transactions")
      .select("*")
      .eq("type", "purchase")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Calculate system-wide metrics
    const totalTryOns = tryOnHistory?.length || 0;
    const totalCreditsUsed = totalTryOns;
    const totalCreditsPurchased = creditTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const totalStores = stores?.length || 0;
    const activeStores = stores?.filter(s => s.active).length || 0;

    // Get unique users across all stores
    const uniqueUsers = new Set(tryOnHistory?.map(t => t.user_id) || []).size;

    // Timeseries data
    const timeseriesData = groupByTimePeriod(tryOnHistory || [], groupBy);

    // Store performance comparison
    const storePerformance: Record<string, {
      store_id: string;
      store_name: string;
      tryOns: number;
      creditsUsed: number;
      uniqueUsers: number;
    }> = {};

    stores?.forEach(store => {
      storePerformance[store.id] = {
        store_id: store.id,
        store_name: store.name,
        tryOns: 0,
        creditsUsed: 0,
        uniqueUsers: 0,
      };
    });

    tryOnHistory?.forEach((item) => {
      if (storePerformance[item.store_id]) {
        storePerformance[item.store_id].tryOns += 1;
        storePerformance[item.store_id].creditsUsed += 1;
      }
    });

    // Count unique users per store
    const storeUsers: Record<string, Set<string>> = {};
    tryOnHistory?.forEach((item) => {
      if (!storeUsers[item.store_id]) {
        storeUsers[item.store_id] = new Set();
      }
      storeUsers[item.store_id].add(item.user_id);
    });

    Object.keys(storeUsers).forEach((storeId) => {
      if (storePerformance[storeId]) {
        storePerformance[storeId].uniqueUsers = storeUsers[storeId].size;
      }
    });

    const topStores = Object.values(storePerformance)
      .sort((a, b) => b.tryOns - a.tryOns)
      .slice(0, 10);

    // Credit flow analysis
    const creditFlowTimeseries = groupByTimePeriod(creditTransactions || [], groupBy).map(item => ({
      date: item.date,
      purchased: item.count,
    }));

    const creditsUsedTimeseries = timeseriesData.map(item => ({
      date: item.date,
      used: item.count,
    }));

    // Merge credit flow data
    const creditFlow = creditFlowTimeseries.map(purchase => {
      const usage = creditsUsedTimeseries.find(u => u.date === purchase.date);
      return {
        date: purchase.date,
        purchased: purchase.purchased,
        used: usage?.used || 0,
        net: purchase.purchased - (usage?.used || 0),
      };
    });

    // Peak hours analysis (system-wide)
    const hourlyUsage = new Array(24).fill(0);
    tryOnHistory?.forEach((item) => {
      const hour = new Date(item.created_at).getHours();
      hourlyUsage[hour] += 1;
    });

    const peakHoursData = hourlyUsage.map((count, hour) => ({
      hour: `${hour}:00`,
      count,
    }));

    // Store distribution by status
    const storeDistribution = {
      active: activeStores,
      inactive: totalStores - activeStores,
    };

    // Average metrics
    const avgTryOnsPerStore = totalStores > 0 ? totalTryOns / totalStores : 0;
    const avgUsersPerStore = totalStores > 0 ? uniqueUsers / totalStores : 0;
    const avgCreditsPerStore = totalStores > 0 ? totalCreditsUsed / totalStores : 0;

    return NextResponse.json({
      period,
      systemMetrics: {
        totalTryOns,
        totalCreditsUsed,
        totalCreditsPurchased,
        netCredits: totalCreditsPurchased - totalCreditsUsed,
        totalStores,
        activeStores,
        uniqueUsers,
        avgTryOnsPerStore: Number(avgTryOnsPerStore.toFixed(2)),
        avgUsersPerStore: Number(avgUsersPerStore.toFixed(2)),
        avgCreditsPerStore: Number(avgCreditsPerStore.toFixed(2)),
      },
      timeseries: timeseriesData,
      creditFlow,
      storePerformance: topStores,
      peakHours: peakHoursData,
      storeDistribution,
      recentActivity: tryOnHistory?.slice(0, 20) || [],
    });
  } catch (error: any) {
    console.error("Get admin analytics error:", error);

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
