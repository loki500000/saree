'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

interface StoreMetric {
  store_id: string;
  store_name: string;
  store_slug: string;
  is_active: boolean;
  current_credits: number;
  total_tryons: number;
  unique_users: number;
  total_credits_used: number;
  total_credits_purchased: number;
  total_credits_refunded: number;
  avg_tryons_per_user: number;
  avg_credits_per_tryon: number;
  popular_item_url: string;
  popular_item_count: number;
  first_tryon_date: string;
  last_tryon_date: string;
  active_days: number;
  peak_hour: number;
}

interface HealthIndicator {
  store_id: string;
  store_name: string;
  health_score: number;
  is_active: boolean;
  days_since_last_activity: number;
  trend_direction: 'up' | 'down' | 'stable' | 'inactive';
  current_period_tryons: number;
  previous_period_tryons: number;
  growth_percentage: number;
}

interface StoreComparisonData {
  summary: {
    totalStores: number;
    activeStores: number;
    inactiveStores: number;
    totalTryons: number;
    totalCreditsUsed: number;
    totalUniqueUsers: number;
    totalCreditsPurchased: number;
    avgTryonsPerStore: string;
    avgUsersPerStore: string;
  };
  stores: StoreMetric[];
  healthIndicators: HealthIndicator[];
  topPerformers: {
    byTryons: StoreMetric[];
    byUsers: StoreMetric[];
    byEfficiency: StoreMetric[];
  };
  dateRange: {
    start: string;
    end: string;
  };
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function StoreComparisonPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StoreComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [sortBy, setSortBy] = useState<'tryons' | 'users' | 'credits' | 'efficiency'>('tryons');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [period]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Not authenticated');

      const userData = await res.json();
      if (userData.user.role !== 'super_admin') {
        router.push('/login');
        return;
      }
      setLoading(false);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case 'all':
          startDate.setFullYear(2020, 0, 1);
          break;
      }

      const res = await fetch(
        `/api/admin/analytics/store-comparison?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&includeHealth=true`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.hint || errorData.error || 'Failed to fetch data');
      }
      const result = await res.json();
      setData(result);
    } catch (error: any) {
      console.error('Failed to fetch store comparison data:', error);
      setError(error.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStores = () => {
    if (!data?.stores) return [];
    let filtered = [...data.stores];

    // Apply active/inactive filter
    if (filterActive === 'active') {
      filtered = filtered.filter(s => s.is_active);
    } else if (filterActive === 'inactive') {
      filtered = filtered.filter(s => !s.is_active);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'tryons':
          return Number(b.total_tryons) - Number(a.total_tryons);
        case 'users':
          return Number(b.unique_users) - Number(a.unique_users);
        case 'credits':
          return Number(b.total_credits_used) - Number(a.total_credits_used);
        case 'efficiency':
          return Number(b.avg_tryons_per_user) - Number(a.avg_tryons_per_user);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <ArrowUpIcon className="w-4 h-4 text-green-600" />;
      case 'down':
        return <ArrowDownIcon className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <MinusIcon className="w-4 h-4 text-gray-600" />;
      default:
        return <TrendingDownIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading store comparison...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
        <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-purple-50 rounded-xl transition-all group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-purple-600 group-hover:-translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Store Performance Comparison
              </h1>
            </div>
          </div>
        </div>
        <main className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Data</h2>
                <p className="text-red-700 mb-4">{error}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={fetchData}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push('/admin')}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const filteredStores = getFilteredStores();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 hover:bg-purple-50 rounded-xl transition-all group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-purple-600 group-hover:-translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Store Performance Comparison
                </h1>
                <p className="text-gray-600 mt-1 text-sm">Compare metrics across all stores</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-5 py-2.5 bg-white border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium text-gray-700 hover:border-purple-300 transition-colors cursor-pointer shadow-sm"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>

              <button
                onClick={fetchData}
                className="p-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                title="Refresh data"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-purple-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Stores</span>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{data?.summary.totalStores || 0}</p>
            <p className="text-sm text-gray-500">
              <span className="text-green-600 font-semibold">{data?.summary.activeStores || 0}</span> active,
              <span className="text-red-600 font-semibold ml-1">{data?.summary.inactiveStores || 0}</span> inactive
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Try-Ons</span>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{data?.summary.totalTryons?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">Avg: {data?.summary.avgTryonsPerStore || 0} per store</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-green-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Users</span>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{data?.summary.totalUniqueUsers?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">Avg: {data?.summary.avgUsersPerStore || 0} per store</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-orange-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Credits Used</span>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-1">{data?.summary.totalCreditsUsed?.toLocaleString() || 0}</p>
            <p className="text-sm text-gray-500">Revenue: {data?.summary.totalCreditsPurchased?.toLocaleString() || 0} purchased</p>
          </div>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top by Try-Ons */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
              Top by Try-Ons
            </h2>
            <div className="space-y-3">
              {data?.topPerformers.byTryons.slice(0, 5).map((store, idx) => (
                <div key={store.store_id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-500 text-white' :
                      idx === 1 ? 'bg-gray-400 text-white' :
                      idx === 2 ? 'bg-orange-500 text-white' :
                      'bg-purple-200 text-purple-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{store.store_name}</p>
                      <p className="text-xs text-gray-500">{Number(store.unique_users)} users</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{Number(store.total_tryons)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top by Users */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Top by Users
            </h2>
            <div className="space-y-3">
              {data?.topPerformers.byUsers.slice(0, 5).map((store, idx) => (
                <div key={store.store_id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-500 text-white' :
                      idx === 1 ? 'bg-gray-400 text-white' :
                      idx === 2 ? 'bg-orange-500 text-white' :
                      'bg-blue-200 text-blue-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{store.store_name}</p>
                      <p className="text-xs text-gray-500">{Number(store.total_tryons)} try-ons</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{Number(store.unique_users)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top by Efficiency */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Most Efficient
            </h2>
            <div className="space-y-3">
              {data?.topPerformers.byEfficiency.slice(0, 5).map((store, idx) => (
                <div key={store.store_id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      idx === 0 ? 'bg-yellow-500 text-white' :
                      idx === 1 ? 'bg-gray-400 text-white' :
                      idx === 2 ? 'bg-orange-500 text-white' :
                      'bg-green-200 text-green-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{store.store_name}</p>
                      <p className="text-xs text-gray-500">{Number(store.unique_users)} users</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">{Number(store.avg_tryons_per_user).toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Store Health Dashboard */}
        {data?.healthIndicators && data.healthIndicators.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Store Health Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.healthIndicators.slice(0, 8).map((health) => (
                <div
                  key={health.store_id}
                  className={`p-4 rounded-xl border-2 ${getHealthColor(health.health_score)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{health.store_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {health.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(health.trend_direction)}
                      <span className="text-xs font-semibold">{health.growth_percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Health Score</span>
                      <span className="text-lg font-bold">{health.health_score}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          health.health_score >= 90 ? 'bg-green-500' :
                          health.health_score >= 70 ? 'bg-blue-500' :
                          health.health_score >= 40 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${health.health_score}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="font-bold">{health.current_period_tryons}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Previous</p>
                      <p className="font-bold">{health.previous_period_tryons}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Store Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">All Stores Detailed Metrics</h2>
            <div className="flex items-center gap-3">
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value as any)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="all">All Stores</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="tryons">Sort by Try-Ons</option>
                <option value="users">Sort by Users</option>
                <option value="credits">Sort by Credits</option>
                <option value="efficiency">Sort by Efficiency</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-700 text-sm">Store</th>
                  <th className="text-center py-4 px-4 font-bold text-gray-700 text-sm">Status</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Try-Ons</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Users</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Credits Used</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Credits Balance</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Avg/User</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Active Days</th>
                  <th className="text-right py-4 px-4 font-bold text-gray-700 text-sm">Peak Hour</th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.map((store, idx) => (
                  <tr
                    key={store.store_id}
                    className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{store.store_name}</p>
                        <p className="text-xs text-gray-500">/{store.store_slug}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        store.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {store.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-purple-600">{Number(store.total_tryons).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-blue-600">{Number(store.unique_users).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-orange-600">{Number(store.total_credits_used).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-bold ${store.current_credits < 100 ? 'text-red-600' : 'text-green-600'}`}>
                        {store.current_credits.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-semibold text-gray-700">{Number(store.avg_tryons_per_user).toFixed(1)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-gray-600">{Number(store.active_days)}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-gray-600">{store.peak_hour}:00</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStores.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No stores found matching the current filters.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
