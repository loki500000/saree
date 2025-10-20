'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AnalyticsData {
  period: string;
  metrics: {
    totalTryOns: number;
    totalCreditsUsed: number;
    totalCreditsPurchased?: number;
    uniqueUsers: number;
    avgCreditsPerUser: number;
    tryOnsChange?: number;
    usersChange?: number;
    avgCreditsChange?: number;
  };
  timeseries: Array<{ date: string; count: number }>;
  topClothingItems: Array<{ url: string; count: number; name?: string; clothing_image_url?: string; usage_count?: number }>;
  topUsers?: Array<{ user_name: string; tryons_count: number; credits_used: number }>;
  peakHours?: Array<{ hour: string; count: number; avg?: number }>;
  dayOfWeek?: Array<{ day: string; count: number }>;
  creditBreakdown?: Array<{ transaction_type: string; total_amount: number; transaction_count: number }>;
  recentActivity: Array<{
    id: string;
    created_at: string;
    user_id: string;
    user?: { name: string; email: string };
    clothing_image_url: string;
    credits_used: number;
  }>;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function AdvancedAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'users'>('overview');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
    }
  }, [period]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Not authenticated');

      const data = await res.json();
      if (!['store_admin', 'super_admin'].includes(data.user.role)) {
        router.push('/login');
        return;
      }
      setLoading(false);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/store/analytics/advanced?period=${period}&groupBy=day`, {
        credentials: 'include'
      });
      const data = await res.json();
      console.log('Analytics response:', data); // Debug log
      if (data.error) {
        console.error('Analytics API error:', data.error);
        return;
      }
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const csv = [
      ['Date', 'Try-Ons', 'Credits Used', 'Unique Users'],
      ...analytics.timeseries.map(d => [d.date, d.count, d.count, '-'])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const hasData = analytics?.metrics?.totalTryOns && analytics.metrics.totalTryOns > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-purple-50 rounded-xl transition-all group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-purple-600 group-hover:-translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-gray-600 mt-1 text-sm">Track performance and insights</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Period Selector */}
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

              {/* Export Button */}
              {hasData && (
                <button
                  onClick={exportToCSV}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}

              {/* Refresh Button */}
              <button
                onClick={fetchAnalytics}
                className="p-2.5 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
                title="Refresh data"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          {hasData && (
            <div className="flex gap-2 mt-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === 'overview'
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
                {activeTab === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === 'insights'
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Insights
                {activeTab === 'insights' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 font-semibold transition-all relative ${
                  activeTab === 'users'
                    ? 'text-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Users & Activity
                {activeTab === 'users' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600"></div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        {!hasData ? (
          /* Empty State */
          <div className="bg-white rounded-3xl shadow-xl p-16 text-center border border-gray-100">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-100 via-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">No Data Yet</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
              Start using the virtual try-on feature to see analytics and insights here.
            </p>
            <button
              onClick={() => router.push('/store')}
              className="px-10 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-2xl transform hover:scale-105 transition-all text-lg"
            >
              Start Try-On Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-purple-100 hover:border-purple-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Try-Ons</span>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{analytics?.metrics?.totalTryOns?.toLocaleString() || 0}</p>
                {analytics?.metrics?.tryOnsChange !== undefined && analytics.metrics.tryOnsChange !== 0 && (
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${analytics.metrics.tryOnsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <svg className={`w-4 h-4 ${analytics.metrics.tryOnsChange > 0 ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {Math.abs(analytics.metrics.tryOnsChange).toFixed(1)}% vs prev period
                  </div>
                )}
              </div>

              <div className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-blue-100 hover:border-blue-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Credits Used</span>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{analytics?.metrics?.totalCreditsUsed?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-500 font-medium">
                  {analytics?.metrics?.totalCreditsPurchased ?
                    `${analytics.metrics.totalCreditsPurchased.toLocaleString()} purchased` :
                    'Processing usage'
                  }
                </p>
              </div>

              <div className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-green-100 hover:border-green-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Active Users</span>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{analytics?.metrics?.uniqueUsers?.toLocaleString() || 0}</p>
                {analytics?.metrics?.usersChange !== undefined && analytics.metrics.usersChange !== 0 && (
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${analytics.metrics.usersChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <svg className={`w-4 h-4 ${analytics.metrics.usersChange > 0 ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {Math.abs(analytics.metrics.usersChange).toFixed(1)}% growth
                  </div>
                )}
              </div>

              <div className="group bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all border border-orange-100 hover:border-orange-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Avg per User</span>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">{analytics?.metrics?.avgCreditsPerUser?.toFixed(1) || 0}</p>
                {analytics?.metrics?.avgCreditsChange !== undefined && analytics.metrics.avgCreditsChange !== 0 && (
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${analytics.metrics.avgCreditsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <svg className={`w-4 h-4 ${analytics.metrics.avgCreditsChange > 0 ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {Math.abs(analytics.metrics.avgCreditsChange).toFixed(1)}% change
                  </div>
                )}
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trend Chart */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Usage Trend</h2>
                        <p className="text-sm text-gray-500 mt-1">Daily activity over time</p>
                      </div>
                      <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-semibold shadow-sm">
                        {period === 'today' ? 'Today' : period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : 'All Time'}
                      </span>
                    </div>
                    {analytics?.timeseries && analytics.timeseries.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={analytics.timeseries}>
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[320px] flex items-center justify-center text-gray-400">
                        <p>No trend data available</p>
                      </div>
                    )}
                  </div>

                  {/* Top Clothing */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Top Clothing Items</h2>
                      <p className="text-sm text-gray-500 mt-1">Most popular items</p>
                    </div>
                    {analytics?.topClothingItems && analytics.topClothingItems.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={analytics.topClothingItems.slice(0, 5).map(item => ({
                          ...item,
                          count: item.usage_count || item.count
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            style={{ fontSize: '11px' }}
                            tickFormatter={(value) => value ? (value.length > 12 ? value.substring(0, 12) + '...' : value) : 'Item'}
                          />
                          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="url(#barGradient)"
                            radius={[8, 8, 0, 0]}
                          />
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[320px] flex items-center justify-center text-gray-400">
                        <p>No clothing data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Peak Hours */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Peak Usage Hours</h2>
                      <p className="text-sm text-gray-500 mt-1">Busiest times of the day</p>
                    </div>
                    {analytics?.peakHours && analytics.peakHours.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart data={analytics.peakHours}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="hour"
                            stroke="#9ca3af"
                            style={{ fontSize: '11px' }}
                            interval={2}
                          />
                          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[320px] flex items-center justify-center text-gray-400">
                        <p>No peak hours data available</p>
                      </div>
                    )}
                  </div>

                  {/* Day of Week */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Weekly Pattern</h2>
                      <p className="text-sm text-gray-500 mt-1">Usage distribution by day</p>
                    </div>
                    {analytics?.dayOfWeek && analytics.dayOfWeek.length > 0 ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <RadarChart data={analytics.dayOfWeek}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis
                            dataKey="day"
                            stroke="#6b7280"
                            style={{ fontSize: '12px' }}
                          />
                          <PolarRadiusAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                          <Radar
                            name="Usage"
                            dataKey="count"
                            stroke="#f59e0b"
                            fill="#f59e0b"
                            fillOpacity={0.6}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'white',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[320px] flex items-center justify-center text-gray-400">
                        <p>No weekly pattern data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Credit Breakdown */}
                {analytics?.creditBreakdown && analytics.creditBreakdown.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Credit Flow</h2>
                      <p className="text-sm text-gray-500 mt-1">Transaction breakdown</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {analytics.creditBreakdown.map((item, index) => (
                        <div key={index} className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              item.transaction_type === 'purchase' ? 'bg-green-100' :
                              item.transaction_type === 'usage' ? 'bg-blue-100' : 'bg-red-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                item.transaction_type === 'purchase' ? 'text-green-600' :
                                item.transaction_type === 'usage' ? 'text-blue-600' : 'text-red-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {item.transaction_type === 'purchase' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                ) : item.transaction_type === 'usage' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" />
                                )}
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-600 capitalize">{item.transaction_type}</p>
                              <p className="text-2xl font-bold text-gray-900">{Number(item.total_amount).toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{Number(item.transaction_count)} transactions</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                {/* Top Users Table */}
                {analytics?.topUsers && analytics.topUsers.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Top Users</h2>
                      <p className="text-sm text-gray-500 mt-1">Most active users this period</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-4 px-4 font-bold text-gray-700">Rank</th>
                            <th className="text-left py-4 px-4 font-bold text-gray-700">User</th>
                            <th className="text-right py-4 px-4 font-bold text-gray-700">Try-Ons</th>
                            <th className="text-right py-4 px-4 font-bold text-gray-700">Credits</th>
                            <th className="text-right py-4 px-4 font-bold text-gray-700">Avg/Session</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.topUsers.slice(0, 10).map((user, index) => {
                            const avgPerSession = Number(user.credits_used) / Number(user.tryons_count);
                            return (
                              <tr key={index} className="border-b border-gray-100 hover:bg-purple-50/50 transition-colors group">
                                <td className="py-4 px-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg' :
                                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md' :
                                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md' :
                                    'bg-gradient-to-br from-purple-100 to-blue-100 text-purple-600'
                                  }`}>
                                    #{index + 1}
                                  </div>
                                </td>
                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-md">
                                      {(user.user_name || 'U')[0].toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                      {user.user_name || 'Unknown User'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <span className="font-bold text-purple-600 text-lg">{Number(user.tryons_count)}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <span className="font-bold text-blue-600 text-lg">{Number(user.credits_used)}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                  <span className="font-semibold text-gray-600">{avgPerSession.toFixed(1)}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Latest Activity */}
                <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Latest Activity</h2>
                    <p className="text-sm text-gray-500 mt-1">Recent try-on sessions</p>
                  </div>
                  {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.recentActivity.slice(0, 10).map((activity, index) => (
                        <div
                          key={activity.id || index}
                          className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all border border-gray-100 hover:border-purple-200 group"
                        >
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center font-bold text-purple-600 group-hover:scale-110 transition-transform shadow-sm">
                            #{index + 1}
                          </div>

                          {activity.clothing_image_url && (
                            <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 group-hover:border-purple-300 transition-colors shadow-sm">
                              <img
                                src={activity.clothing_image_url}
                                alt="Clothing"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                              {activity.user?.name || `User ${activity.user_id.substring(0, 8)}...`}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                              {new Date(activity.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>

                          <div className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 rounded-xl text-sm font-bold shadow-sm">
                            {activity.credits_used || 1} credit{(activity.credits_used || 1) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="font-medium">No recent activity</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
