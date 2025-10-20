// Test authentication and analytics endpoint
// Run with: node test-auth-and-analytics.js

const testAuth = async () => {
  console.log('=== Testing Authentication ===\n');

  try {
    const authResponse = await fetch('http://localhost:3000/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    console.log('Auth Status:', authResponse.status);

    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ Authenticated as:', authData.user?.email);
      console.log('Role:', authData.user?.role);
      console.log('Store ID:', authData.user?.store_id);
    } else {
      console.log('❌ Not authenticated');
      const errorData = await authResponse.json();
      console.log('Error:', errorData);
    }
  } catch (error) {
    console.error('❌ Auth Error:', error.message);
  }
};

const testAnalytics = async () => {
  console.log('\n=== Testing Analytics Endpoint ===\n');

  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const url = `http://localhost:3000/api/admin/analytics/store-comparison?startDate=${startDate}&endDate=${endDate}&includeHealth=true`;

    console.log('Endpoint:', url.substring(0, 80) + '...\n');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS! Analytics data received:');
      console.log('─────────────────────────────────────');
      console.log('Total Stores:', data.summary?.totalStores);
      console.log('Active Stores:', data.summary?.activeStores);
      console.log('Total Try-ons:', data.summary?.totalTryons);
      console.log('Total Users:', data.summary?.totalUniqueUsers);
      console.log('Stores Data Length:', data.stores?.length);
      console.log('Health Indicators:', data.healthIndicators?.length);
    } else {
      console.log('\n❌ ERROR Response:');
      console.log('─────────────────────────────────────');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      console.log('Hint:', data.hint);
    }

  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
  }
};

const runTests = async () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Store Analytics Diagnostics Tool     ║');
  console.log('╚════════════════════════════════════════╝\n');

  await testAuth();
  await testAnalytics();

  console.log('\n─────────────────────────────────────');
  console.log('\n💡 Next Steps:');
  console.log('1. If auth failed: Login at http://localhost:3000/login');
  console.log('2. If SQL error: Deploy DEPLOY_STORE_ANALYTICS.sql in Supabase');
  console.log('3. Open browser DevTools and check Console/Network tabs\n');
};

runTests();
