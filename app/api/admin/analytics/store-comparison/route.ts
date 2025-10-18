import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth/helpers'

// GET /api/admin/analytics/store-comparison
export async function GET(request: Request) {
  try {
    // Require super admin role
    const user = await requireSuperAdmin()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const metric = searchParams.get('metric') || 'tryons'
    const includeHealth = searchParams.get('includeHealth') === 'true'
    const includeTrends = searchParams.get('includeTrends') === 'true'
    const storeId = searchParams.get('storeId') // Optional: filter to specific store

    // Default to last 30 days if not specified
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const supabase = await createClient()

    // Fetch comprehensive store comparison metrics
    const { data: storeMetrics, error: metricsError } = await supabase
      .rpc('get_store_comparison_metrics', {
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString()
      })

    if (metricsError) {
      console.error('Error fetching store metrics:', metricsError)
      return NextResponse.json(
        {
          error: 'Failed to fetch store comparison metrics',
          details: metricsError.message,
          hint: 'Please ensure the SQL functions are deployed. Run the SQL migration in supabase/platform_analytics.sql'
        },
        { status: 500 }
      )
    }

    // Fetch store rankings
    const { data: rankings, error: rankingsError } = await supabase
      .rpc('get_store_rankings', {
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
        p_metric: metric
      })

    if (rankingsError) {
      console.error('Error fetching store rankings:', rankingsError)
    }

    // Optional: Fetch store health indicators
    let healthIndicators = null
    if (includeHealth) {
      const daysBack = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const { data: health, error: healthError } = await supabase
        .rpc('get_store_health_indicators', {
          p_days_back: daysBack > 0 ? daysBack : 30
        })

      if (healthError) {
        console.error('Error fetching health indicators:', healthError)
      } else {
        healthIndicators = health
      }
    }

    // Optional: Fetch performance trends
    let performanceTrends = null
    if (includeTrends) {
      const { data: trends, error: trendsError } = await supabase
        .rpc('get_store_performance_trends', {
          p_start_date: start.toISOString(),
          p_end_date: end.toISOString(),
          p_store_id: storeId || null
        })

      if (trendsError) {
        console.error('Error fetching performance trends:', trendsError)
      } else {
        performanceTrends = trends
      }
    }

    // Calculate summary statistics
    const totalStores = storeMetrics?.length || 0
    const activeStores = storeMetrics?.filter((s: any) => s.is_active).length || 0
    const totalTryons = storeMetrics?.reduce((sum: number, s: any) => sum + Number(s.total_tryons), 0) || 0
    const totalCreditsUsed = storeMetrics?.reduce((sum: number, s: any) => sum + Number(s.total_credits_used), 0) || 0
    const totalUniqueUsers = storeMetrics?.reduce((sum: number, s: any) => sum + Number(s.unique_users), 0) || 0
    const totalCreditsPurchased = storeMetrics?.reduce((sum: number, s: any) => sum + Number(s.total_credits_purchased), 0) || 0

    // Identify top performers
    const topByTryons = storeMetrics?.length > 0
      ? [...storeMetrics].sort((a: any, b: any) => Number(b.total_tryons) - Number(a.total_tryons)).slice(0, 5)
      : []

    const topByUsers = storeMetrics?.length > 0
      ? [...storeMetrics].sort((a: any, b: any) => Number(b.unique_users) - Number(a.unique_users)).slice(0, 5)
      : []

    const topByEfficiency = storeMetrics?.length > 0
      ? [...storeMetrics]
          .filter((s: any) => Number(s.unique_users) > 0)
          .sort((a: any, b: any) => Number(b.avg_tryons_per_user) - Number(a.avg_tryons_per_user))
          .slice(0, 5)
      : []

    return NextResponse.json({
      summary: {
        totalStores,
        activeStores,
        inactiveStores: totalStores - activeStores,
        totalTryons,
        totalCreditsUsed,
        totalUniqueUsers,
        totalCreditsPurchased,
        avgTryonsPerStore: totalStores > 0 ? (totalTryons / totalStores).toFixed(2) : 0,
        avgUsersPerStore: totalStores > 0 ? (totalUniqueUsers / totalStores).toFixed(2) : 0,
      },
      stores: storeMetrics || [],
      rankings: rankings || [],
      healthIndicators: healthIndicators || null,
      performanceTrends: performanceTrends || null,
      topPerformers: {
        byTryons: topByTryons,
        byUsers: topByUsers,
        byEfficiency: topByEfficiency,
      },
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Store comparison analytics error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    )
  }
}
