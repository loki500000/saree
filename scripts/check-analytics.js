// Script to check analytics database setup
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAnalytics() {
  console.log('🔍 Checking Analytics Database Setup...\n');

  // Check 1: Check tryon_history table
  console.log('1️⃣ Checking tryon_history table...');
  const { data: historyData, error: historyError, count } = await supabase
    .from('tryon_history')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  if (historyError) {
    console.log('❌ Error accessing tryon_history:', historyError.message);
  } else {
    console.log(`✅ Found ${count} records in tryon_history`);
    if (historyData && historyData.length > 0) {
      console.log('   Sample record:', JSON.stringify(historyData[0], null, 2));
    }
  }

  // Check 2: Check analytics views
  console.log('\n2️⃣ Checking analytics_store_overview view...');
  const { data: viewData, error: viewError } = await supabase
    .from('analytics_store_overview')
    .select('*')
    .limit(1);

  if (viewError) {
    console.log('❌ Error accessing analytics_store_overview:', viewError.message);
    console.log('   ⚠️  Analytics schema may not be applied yet!');
  } else {
    console.log('✅ analytics_store_overview view exists');
    if (viewData && viewData.length > 0) {
      console.log('   Sample data:', JSON.stringify(viewData[0], null, 2));
    }
  }

  // Check 3: Test analytics function
  console.log('\n3️⃣ Testing get_store_analytics function...');
  const { data: funcData, error: funcError } = await supabase.rpc('get_store_analytics', {
    p_store_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
    p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    p_end_date: new Date().toISOString()
  });

  if (funcError) {
    console.log('❌ Error calling get_store_analytics:', funcError.message);
    console.log('   ⚠️  Analytics functions may not be created yet!');
  } else {
    console.log('✅ get_store_analytics function exists and working');
  }

  // Check 4: Get current user's store
  console.log('\n4️⃣ Checking current user authentication...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('⚠️  No authenticated user (this is expected when running as script)');
  } else {
    console.log('✅ User authenticated:', user.email);

    // Check user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*, store:stores(*)')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.log('❌ Error fetching profile:', profileError.message);
    } else {
      console.log('✅ User profile found');
      console.log('   Store ID:', profile.store_id);
      console.log('   Role:', profile.role);

      if (profile.store_id) {
        // Check this store's analytics
        const { data: storeAnalytics, error: storeError } = await supabase
          .from('analytics_store_overview')
          .select('*')
          .eq('store_id', profile.store_id)
          .single();

        if (storeError) {
          console.log('❌ Error fetching store analytics:', storeError.message);
        } else {
          console.log('✅ Store analytics found:');
          console.log(JSON.stringify(storeAnalytics, null, 2));
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));

  if (viewError || funcError) {
    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('Run the analytics schema SQL in your Supabase SQL Editor:');
    console.log('File: supabase/analytics-schema.sql\n');
    console.log('Steps:');
    console.log('1. Open your Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy contents of supabase/analytics-schema.sql');
    console.log('4. Paste and run the SQL');
  } else if (count === 0) {
    console.log('\n✅ Database schema is set up correctly');
    console.log('⚠️  No try-on data yet. Use the virtual try-on feature to generate data.');
  } else {
    console.log('\n✅ Everything looks good!');
  }
}

checkAnalytics()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
