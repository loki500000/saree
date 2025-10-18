// Quick test script to check if Supabase functions exist
// Run this with: node test-supabase-functions.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase environment variables');
  console.log('Make sure .env.local has:');
  console.log('  NEXT_PUBLIC_SUPABASE_URL=your-url');
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunctions() {
  console.log('🔍 Testing Supabase SQL Functions...\n');

  const endDate = new Date();
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Test 1: get_store_comparison_metrics
  console.log('1️⃣  Testing get_store_comparison_metrics...');
  const { data: metrics, error: metricsError } = await supabase.rpc(
    'get_store_comparison_metrics',
    {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    }
  );

  if (metricsError) {
    console.log('   ❌ FAILED');
    console.log('   Error:', metricsError.message);
    console.log('   Code:', metricsError.code);
    console.log('   Details:', metricsError.details);
    console.log('   Hint:', metricsError.hint);
  } else {
    console.log('   ✅ SUCCESS');
    console.log('   Returned', metrics?.length || 0, 'stores');
  }

  // Test 2: get_store_rankings
  console.log('\n2️⃣  Testing get_store_rankings...');
  const { data: rankings, error: rankingsError } = await supabase.rpc(
    'get_store_rankings',
    {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_metric: 'tryons',
    }
  );

  if (rankingsError) {
    console.log('   ❌ FAILED');
    console.log('   Error:', rankingsError.message);
  } else {
    console.log('   ✅ SUCCESS');
    console.log('   Returned', rankings?.length || 0, 'rankings');
  }

  // Test 3: get_store_health_indicators
  console.log('\n3️⃣  Testing get_store_health_indicators...');
  const { data: health, error: healthError } = await supabase.rpc(
    'get_store_health_indicators',
    {
      p_days_back: 30,
    }
  );

  if (healthError) {
    console.log('   ❌ FAILED');
    console.log('   Error:', healthError.message);
  } else {
    console.log('   ✅ SUCCESS');
    console.log('   Returned', health?.length || 0, 'health indicators');
  }

  // Test 4: get_store_performance_trends
  console.log('\n4️⃣  Testing get_store_performance_trends...');
  const { data: trends, error: trendsError } = await supabase.rpc(
    'get_store_performance_trends',
    {
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
      p_store_id: null,
    }
  );

  if (trendsError) {
    console.log('   ❌ FAILED');
    console.log('   Error:', trendsError.message);
  } else {
    console.log('   ✅ SUCCESS');
    console.log('   Returned', trends?.length || 0, 'trend records');
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  const failedTests = [metricsError, rankingsError, healthError, trendsError].filter(Boolean);

  if (failedTests.length === 0) {
    console.log('✅ ALL TESTS PASSED!');
    console.log('The SQL functions are deployed correctly.');
  } else if (failedTests.length === 4) {
    console.log('❌ ALL TESTS FAILED!');
    console.log('\n📋 ACTION REQUIRED:');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy the ENTIRE contents of this file:');
    console.log('   supabase/migrations/add_store_comparison_analytics.sql');
    console.log('4. Paste into SQL Editor and click Run');
    console.log('5. Wait for "Migration completed successfully!" message');
    console.log('6. Run this test again');
  } else {
    console.log(`⚠️  ${failedTests.length} out of 4 tests failed`);
    console.log('Some functions are missing. Please run the SQL migration.');
  }
}

testFunctions().catch(console.error);
