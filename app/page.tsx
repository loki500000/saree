'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileVirtualTryOn from "@/components/MobileVirtualTryOn";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        throw new Error('Not logged in');
      })
      .then(data => {
        // Redirect admins to their dashboards
        if (data.user.role === 'super_admin') {
          router.push('/admin');
        } else if (data.user.role === 'store_admin') {
          router.push('/store/admin');
        } else {
          // Store users stay here
          setIsAuthenticated(true);
          setLoading(false);
        }
      })
      .catch(() => {
        // Not logged in, redirect to login
        router.push('/login');
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
      <MobileVirtualTryOn />
    </main>
  );
}
