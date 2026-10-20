// Quick test script to verify Supabase storage configuration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'images';

console.log('\n🔍 Testing Supabase Storage Configuration...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Bucket Name:', bucketName);
console.log('Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('\n❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testStorage() {
  try {
    // Test 1: List buckets
    console.log('\n📦 Test 1: Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      return false;
    }

    console.log('✅ Available buckets:', buckets.map(b => b.name).join(', '));

    // Check if our bucket exists
    const bucketExists = buckets.some(b => b.name === bucketName);
    if (!bucketExists) {
      console.error(`\n❌ Bucket "${bucketName}" not found!`);
      console.log('\n📝 To create the bucket:');
      console.log('1. Go to: https://supabase.com/dashboard/project/mdywzxpacqwuedrjbhse/storage/buckets');
      console.log('2. Click "New bucket"');
      console.log(`3. Name: "${bucketName}"`);
      console.log('4. Make it PUBLIC');
      console.log('5. Create storage policies (see documentation)');
      return false;
    }

    console.log(`✅ Bucket "${bucketName}" exists!`);

    // Test 2: Try to upload a test file
    console.log('\n📤 Test 2: Testing file upload...');
    const testContent = Buffer.from('Test file from backend');
    const testPath = `test/test-${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError.message);
      console.log('\n💡 This usually means:');
      console.log('   - Storage policies are not set correctly');
      console.log('   - Bucket is not public');
      console.log('   - Service role key does not have permissions');
      return false;
    }

    console.log('✅ Upload successful!');

    // Test 3: Get public URL
    console.log('\n🔗 Test 3: Getting public URL...');
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testPath);

    console.log('✅ Public URL:', urlData.publicUrl);

    // Test 4: Clean up - delete test file
    console.log('\n🗑️  Test 4: Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testPath]);

    if (deleteError) {
      console.warn('⚠️  Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted');
    }

    console.log('\n✅ All tests passed! Supabase storage is configured correctly.\n');
    return true;

  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    return false;
  }
}

testStorage().then(success => {
  process.exit(success ? 0 : 1);
});
