'use client';

import * as React from "react";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AnalyticsOverview {
  total_tryons: number;
  unique_users: number;
  total_credits_used: number;
  active_days: number;
  first_tryon: string | null;
  last_tryon: string | null;
}

interface ChartDataPoint {
  date: string;
  tryons: number;
}

interface PopularClothing {
  clothing_image_url: string;
  usage_count: number;
  unique_users: number;
  name: string;
  main_code?: string;
  sub_variant?: string;
}

interface AnalyticsData {
  period: string;
  overview: AnalyticsOverview;
  allTimeStats: {
    total_tryons: number;
    unique_users: number;
    total_credits_used: number;
  };
  chartData: ChartDataPoint[];
  popularClothing: PopularClothing[];
}

interface User {
  id: string;
  name: string;
  email: string;
  tryons: number;
  credits_used: number;
  last_activity: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');
  const [activeView, setActiveView] = useState<'overview' | 'clothing' | 'user'>('overview');

  // Clothing pagination and search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected item analytics
  const [selectedClothing, setSelectedClothing] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnalytics();
      fetchUsers();
    }
  }, [period, loading]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when search changes
  }, [searchQuery]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (!res.ok) {
        router.push('/login');
        return;
      }

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
      const res = await fetch(`/api/analytics?period=${period}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await res.json();
      setData(result);
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/analytics/users?period=${period}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        setUsers(result.users || []);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    }
  };

  const handleClothingClick = async (item: PopularClothing) => {
    setSelectedClothing(item);
    setSelectedUser(null);
    setActiveView('clothing');

    try {
      const res = await fetch(`/api/analytics/clothing?url=${encodeURIComponent(item.clothing_image_url)}&period=${period}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        setDetailData(result);
      }
    } catch (err) {
      console.error('Clothing detail fetch error:', err);
    }
  };

  const handleUserClick = async (user: User) => {
    setSelectedUser(user);
    setSelectedClothing(null);
    setActiveView('user');

    try {
      const res = await fetch(`/api/analytics/users?userId=${user.id}&period=${period}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        setDetailData(result);
      }
    } catch (err) {
      console.error('User detail fetch error:', err);
    }
  };

  const handleBackToOverview = () => {
    setActiveView('overview');
    setSelectedClothing(null);
    setSelectedUser(null);
    setDetailData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold text-lg mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const hasData = data && data.overview.total_tryons > 0;

  const getPeriodLabel = () => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case 'all': return 'All Time';
      default: return 'Last 30 Days';
    }
  };

  // Filter and paginate clothing
  const filteredClothing = data?.popularClothing.filter(item => {
    const variantCode = `${item.main_code || ''}${item.sub_variant || ''}`.toLowerCase();
    const name = item.name.toLowerCase();
    const query = searchQuery.toLowerCase();
    return variantCode.includes(query) || name.includes(query);
  }) || [];

  const totalPages = Math.ceil(filteredClothing.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClothing = filteredClothing.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => activeView === 'overview' ? router.back() : handleBackToOverview()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeView === 'overview' && 'Analytics Dashboard'}
                  {activeView === 'clothing' && `Clothing: ${
                    selectedClothing?.main_code && selectedClothing?.sub_variant
                      ? `${selectedClothing.main_code}${selectedClothing.sub_variant}`
                      : selectedClothing?.name || ''
                  }`}
                  {activeView === 'user' && `User: ${selectedUser?.name || ''}`}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {activeView === 'overview' && 'Virtual Try-On Statistics'}
                  {activeView === 'clothing' && 'Individual Item Analytics'}
                  {activeView === 'user' && 'Individual User Analytics'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700 hover:border-blue-400 transition-colors cursor-pointer"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
              <button
                onClick={() => {
                  fetchAnalytics();
                  fetchUsers();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasData ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Data Yet</h2>
            <p className="text-gray-600 mb-6">Start using the virtual try-on feature to see analytics here.</p>
            <button
              onClick={() => router.push('/store')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go to Virtual Try-On
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Section */}
            {activeView === 'overview' && (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-700">
                    Showing: <span className="text-blue-600">{getPeriodLabel()}</span>
                  </h2>
                  {period !== 'all' && data.allTimeStats && (
                    <p className="text-sm text-gray-500">
                      All-time total: <span className="font-semibold text-gray-700">{data.allTimeStats.total_tryons}</span> try-ons
                    </p>
                  )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Total Try-Ons"
                    value={data.overview.total_tryons}
                    icon="eye"
                    color="blue"
                  />
                  <StatsCard
                    title="Unique Users"
                    value={data.overview.unique_users}
                    icon="users"
                    color="green"
                  />
                  <StatsCard
                    title="Credits Used"
                    value={data.overview.total_credits_used}
                    icon="credit"
                    color="purple"
                  />
                  <StatsCard
                    title="Active Days"
                    value={data.overview.active_days}
                    icon="calendar"
                    color="orange"
                  />
                </div>

                {/* Chart */}
                {data.chartData.length > 0 && (
                  <ShadcnLineChart data={data.chartData} period={getPeriodLabel()} />
                )}

                {/* Popular Clothing with Search and Pagination */}
                {data.popularClothing && data.popularClothing.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold text-gray-900">Most Popular Clothing Items</h2>
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by code (e.g., 1a)..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                        />
                        <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>

                    {filteredClothing.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        No clothing items match your search.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                          {paginatedClothing.map((item, index) => (
                            <div
                              key={startIndex + index}
                              className="relative group cursor-pointer bg-white rounded-xl overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all hover:shadow-xl"
                              onClick={() => handleClothingClick(item)}
                            >
                              <div className="aspect-square bg-gray-100 relative">
                                <img
                                  src={item.clothing_image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                                {/* Rank Badge */}
                                <div className="absolute top-3 left-3 w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-base shadow-lg">
                                  #{startIndex + index + 1}
                                </div>
                              </div>
                              <div className="p-4 bg-white">
                                <p className="text-lg font-bold text-gray-900 mb-3">
                                  {item.main_code && item.sub_variant
                                    ? `${item.main_code}${item.sub_variant}`
                                    : item.name}
                                </p>
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-4 text-gray-700 flex-1">
                                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <p className="text-base font-bold text-gray-900">{item.usage_count.toLocaleString()}</p>
                                  </div>
                                  <div className="flex items-center gap-4 text-gray-700 flex-1">
                                    <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                      </svg>
                                    </div>
                                    <p className="text-base font-bold text-gray-900">{item.unique_users.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                            <div className="text-sm text-gray-600">
                              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClothing.length)} of {filteredClothing.length} items
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Previous
                              </button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                                      currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Users List */}
                {users && users.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-6">Top Users</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Try-Ons</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.slice(0, 10).map((user, index) => (
                            <tr
                              key={user.id}
                              className="hover:bg-blue-50 cursor-pointer transition-colors"
                              onClick={() => handleUserClick(user)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0 ? 'bg-yellow-400 text-white' :
                                  index === 1 ? 'bg-gray-400 text-white' :
                                  index === 2 ? 'bg-orange-400 text-white' :
                                  'bg-blue-100 text-blue-600'
                                }`}>
                                  #{index + 1}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                    {user.name[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-blue-600">{user.tryons}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="text-sm font-bold text-purple-600">{user.credits_used}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                {new Date(user.last_activity).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Detail View for Clothing or User */}
            {(activeView === 'clothing' || activeView === 'user') && detailData && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <StatsCard
                    title="Total Try-Ons"
                    value={detailData.overview.total_tryons}
                    icon="eye"
                    color="blue"
                  />
                  {activeView === 'clothing' && (
                    <StatsCard
                      title="Unique Users"
                      value={detailData.overview.unique_users}
                      icon="users"
                      color="green"
                    />
                  )}
                  <StatsCard
                    title="Credits Used"
                    value={detailData.overview.total_credits_used}
                    icon="credit"
                    color="purple"
                  />
                </div>

                {/* Chart */}
                {detailData.chartData && detailData.chartData.length > 0 && (
                  <ShadcnLineChart data={detailData.chartData} period={getPeriodLabel()} />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  const colorClasses = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' }
  };

  const icons = {
    eye: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </>
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    credit: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    )
  };

  const colors = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 uppercase">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center`}>
          <svg className={`w-6 h-6 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icons[icon as keyof typeof icons]}
          </svg>
        </div>
      </div>
    </div>
  );
}

// Shadcn Line Chart component
function ShadcnLineChart({ data, period }: { data: ChartDataPoint[]; period: string }) {
  if (!data || data.length === 0) return null;

  const chartConfig = {
    tryons: {
      label: "Try-Ons",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  const total = React.useMemo(
    () => data.reduce((acc, curr) => acc + curr.tryons, 0),
    [data]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>
            Showing total try-ons for {period.toLowerCase()}
          </CardDescription>
        </div>
        <div className="flex">
          <button
            data-active={true}
            className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
          >
            <span className="text-xs text-muted-foreground">
              Total Try-Ons
            </span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {total.toLocaleString()}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="tryons"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Line
              dataKey="tryons"
              type="monotone"
              stroke="var(--color-tryons)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
