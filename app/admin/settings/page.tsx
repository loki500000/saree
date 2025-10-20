'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [poseTolerance, setPositTolerance] = useState(30);
  const [creditPrice, setCreditPrice] = useState(10);
  const [gstRate, setGstRate] = useState(18);
  const [platformName, setPlatformName] = useState('Virtual Try-On');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch current settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Fetch pose settings
        const poseResponse = await fetch('/api/settings');
        const poseData = await poseResponse.json();

        if (poseResponse.ok) {
          setPositTolerance(poseData.pose_tolerance || 30);
        }

        // Fetch admin settings
        const adminResponse = await fetch('/api/admin/settings');
        const adminData = await adminResponse.json();

        if (adminResponse.ok && adminData.settings) {
          setCreditPrice(adminData.settings.credit_price?.value || 10);
          setGstRate((adminData.settings.gst_rate?.value || 0.18) * 100); // Convert to percentage
          setPlatformName(adminData.settings.platform_name?.value || 'Virtual Try-On');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      // Save pose settings
      const poseResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pose_tolerance: poseTolerance }),
      });

      // Save admin settings
      const adminResponse = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            credit_price: creditPrice,
            gst_rate: gstRate / 100, // Convert percentage back to decimal
            platform_name: platformName,
          }
        }),
      });

      const poseData = await poseResponse.json();
      const adminData = await adminResponse.json();

      if (poseResponse.ok && adminResponse.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(poseData.error || adminData.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pose Matching Settings</h2>
            <p className="text-sm text-gray-600 mt-1">
              Control how strictly poses must match between user photos and clothing images
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Pose Tolerance Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Allowed Pose Difference
              </label>

              <div className="space-y-4">
                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={poseTolerance}
                    onChange={(e) => setPositTolerance(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                    style={{
                      background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${poseTolerance}%, #e5e7eb ${poseTolerance}%, #e5e7eb 100%)`
                    }}
                  />

                  {/* Value display */}
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>0%</span>
                    <span className="font-semibold text-violet-600 text-lg">{poseTolerance}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">What this means:</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {poseTolerance === 0 && "Poses must match perfectly (very strict - not recommended)"}
                        {poseTolerance > 0 && poseTolerance <= 20 && "Very strict matching - poses must be nearly identical"}
                        {poseTolerance > 20 && poseTolerance <= 40 && "Moderate matching - small pose differences allowed"}
                        {poseTolerance > 40 && poseTolerance <= 70 && "Relaxed matching - medium pose differences allowed"}
                        {poseTolerance > 70 && "Very relaxed - most poses will be accepted"}
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        <strong>Recommendation:</strong> 20-40% for best results. Lower values reduce the "4 hands problem" but may be too restrictive.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Examples */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <button
                    onClick={() => setPositTolerance(20)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      poseTolerance === 20
                        ? 'bg-violet-100 border-violet-500 text-violet-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Strict (20%)
                  </button>
                  <button
                    onClick={() => setPositTolerance(30)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      poseTolerance === 30
                        ? 'bg-violet-100 border-violet-500 text-violet-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Default (30%)
                  </button>
                  <button
                    onClick={() => setPositTolerance(50)}
                    className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      poseTolerance === 50
                        ? 'bg-violet-100 border-violet-500 text-violet-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Relaxed (50%)
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Billing Configuration Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Billing Configuration</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure pricing and billing settings for credit purchases
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Credit Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Credit (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-semibold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={creditPrice}
                  onChange={(e) => setCreditPrice(parseFloat(e.target.value) || 0)}
                  className="pl-8 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="10.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This is the price charged for each credit purchased
              </p>
            </div>

            {/* GST Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="18"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 font-semibold">
                  %
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                GST tax rate applied to invoices (e.g., 18 for 18% GST)
              </p>
            </div>

            {/* Platform Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Virtual Try-On"
              />
              <p className="text-xs text-gray-500 mt-1">
                Company name displayed on invoices
              </p>
            </div>

            {/* Billing Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Billing Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">100 Credits @ ₹{creditPrice.toFixed(2)}</span>
                  <span className="font-medium">₹{(100 * creditPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">GST ({gstRate}%)</span>
                  <span className="font-medium">₹{(100 * creditPrice * (gstRate / 100)).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-violet-600">₹{(100 * creditPrice * (1 + gstRate / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg ${
            message.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save All Settings'
            )}
          </button>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-yellow-800">How Pose Matching Works</h3>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                <li>System compares arm positions (shoulders, elbows, wrists) between photos</li>
                <li>If difference exceeds your tolerance, users see "Image not matched" warning</li>
                <li>Try-On button is blocked until they select a better-matching clothing pose</li>
                <li>This prevents the "4 hands problem" where AI generates extra hands</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
