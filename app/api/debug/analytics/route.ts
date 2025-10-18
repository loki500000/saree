import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // Check 1: Count tryon_history records
  try {
    const { count, error } = await supabase
      .from("tryon_history")
      .select("*", { count: "exact", head: true });

    results.checks.tryon_history = {
      success: !error,
      count: count || 0,
      error: error?.message
    };
  } catch (err: any) {
    results.checks.tryon_history = {
      success: false,
      error: err.message
    };
  }

  // Check 2: Check if analytics_store_overview view exists
  try {
    const { data, error } = await supabase
      .from("analytics_store_overview")
      .select("*")
      .limit(1);

    results.checks.analytics_store_overview = {
      success: !error,
      exists: !error,
      error: error?.message,
      sample: data?.[0] || null
    };
  } catch (err: any) {
    results.checks.analytics_store_overview = {
      success: false,
      exists: false,
      error: err.message
    };
  }

  // Check 3: Check if analytics_daily_usage view exists
  try {
    const { data, error } = await supabase
      .from("analytics_daily_usage")
      .select("*")
      .limit(1);

    results.checks.analytics_daily_usage = {
      success: !error,
      exists: !error,
      error: error?.message
    };
  } catch (err: any) {
    results.checks.analytics_daily_usage = {
      success: false,
      exists: false,
      error: err.message
    };
  }

  // Check 4: Test get_store_analytics function
  try {
    const { data, error } = await supabase.rpc("get_store_analytics", {
      p_store_id: "00000000-0000-0000-0000-000000000000",
      p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: new Date().toISOString()
    });

    results.checks.get_store_analytics = {
      success: !error,
      exists: !error,
      error: error?.message
    };
  } catch (err: any) {
    results.checks.get_store_analytics = {
      success: false,
      exists: false,
      error: err.message
    };
  }

  // Check 5: Get current user and store
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*, store:stores(*)")
        .eq("id", user.id)
        .single();

      results.checks.current_user = {
        success: !error,
        user_id: user.id,
        email: user.email,
        store_id: profile?.store_id,
        role: profile?.role,
        error: error?.message
      };

      // If user has a store, get their analytics
      if (profile?.store_id) {
        const { data: storeAnalytics, error: analyticsError } = await supabase
          .from("analytics_store_overview")
          .select("*")
          .eq("store_id", profile.store_id)
          .single();

        results.checks.user_store_analytics = {
          success: !analyticsError,
          data: storeAnalytics,
          error: analyticsError?.message
        };
      }
    } else {
      results.checks.current_user = {
        success: false,
        error: "No authenticated user"
      };
    }
  } catch (err: any) {
    results.checks.current_user = {
      success: false,
      error: err.message
    };
  }

  // Summary
  const viewsExist = results.checks.analytics_store_overview?.exists &&
                     results.checks.analytics_daily_usage?.exists;
  const functionsExist = results.checks.get_store_analytics?.exists;
  const hasData = (results.checks.tryon_history?.count || 0) > 0;

  results.summary = {
    schema_applied: viewsExist && functionsExist,
    has_data: hasData,
    recommendations: []
  };

  if (!viewsExist || !functionsExist) {
    results.summary.recommendations.push(
      "⚠️ Analytics schema not applied. Run supabase/analytics-schema.sql in Supabase SQL Editor"
    );
  }

  if (!hasData) {
    results.summary.recommendations.push(
      "ℹ️ No try-on data exists yet. Use the virtual try-on feature to generate analytics data."
    );
  }

  if (viewsExist && functionsExist && hasData) {
    results.summary.recommendations.push(
      "✅ Everything looks good! Analytics should be working."
    );
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
