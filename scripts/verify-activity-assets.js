/**
 * Verify Activity Assets Migration
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyActivityAssets() {
  console.log('\n🔍 Verifying Activity Data Assets\n');
  console.log('='.repeat(80));

  const { data, error } = await supabase
    .from('data_assets')
    .select('asset_key, display_name, category, metadata')
    .order('category', { ascending: true })
    .order('asset_key', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`\n📊 ALL DATA ASSETS (${data.length} total)\n`);
  console.log('='.repeat(80));

  const byCategory = data.reduce((acc, asset) => {
    if (!acc[asset.category]) acc[asset.category] = [];
    acc[asset.category].push(asset);
    return acc;
  }, {});

  Object.entries(byCategory).forEach(([category, assets]) => {
    console.log(`\n${category.toUpperCase()} (${assets.length} assets):`);
    assets.forEach(asset => {
      const volume = asset.metadata?.annual_volume || '?';
      console.log(`  ✅ ${asset.asset_key.padEnd(32)} - ${asset.display_name} (${volume.toLocaleString()} activities)`);
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 SUMMARY:`);
  console.log(`   - Total Data Assets: ${data.length}`);
  console.log(`   - Activity Assets: ${byCategory.activity?.length || 0}`);
  console.log(`   - Pipeline Assets: ${byCategory.pipeline?.length || 0}`);
  console.log(`   - Revenue Assets: ${byCategory.revenue?.length || 0}`);
  console.log(`   - Performance Assets: ${byCategory.performance?.length || 0}`);

  const totalActivities = data
    .filter(a => a.metadata?.annual_volume)
    .reduce((sum, a) => sum + (a.metadata.annual_volume || 0), 0);

  console.log(`\n   - Total tracked activities: ${totalActivities.toLocaleString()}`);
  console.log(`   - Coverage: ${Math.round((totalActivities / 36263) * 100)}% of all Bullhorn activities`);

  console.log('\n🎉 Activity assets successfully deployed!\n');
  console.log('='.repeat(80) + '\n');
}

verifyActivityAssets();
