// Test script to check if store analytics functions exist in Supabase
// Run with: node test-store-analytics.js

const testEndpoint = async () => {
  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const url = `http://localhost:3000/api/admin/analytics/store-comparison?startDate=${startDate}&endDate=${endDate}&includeHealth=true`;

    console.log('Testing endpoint:', url);
    console.log('\nMaking request...\n');

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
      console.log('\n✅ SUCCESS! Data received:');
      console.log('Total Stores:', data.summary?.totalStores);
      console.log('Active Stores:', data.summary?.activeStores);
      console.log('Total Try-ons:', data.summary?.totalTryons);
    } else {
      console.log('\n❌ ERROR:');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      console.log('Hint:', data.hint);
    }

  } catch (error) {
    console.error('\n❌ FETCH ERROR:', error.message);
  }
};

testEndpoint();
