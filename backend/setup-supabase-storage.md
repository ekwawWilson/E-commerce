# Supabase Storage Setup Guide

## Current Issue
Your frontend is trying to load:
`https://mdywzxpacqwuedrjbhse.supabase.co/storage/v1/object/public/images/products/1d76df6725bb677e.png`

But getting **400 Bad Request** because:
- The bucket may not exist
- The bucket is not public
- Storage policies are not configured

## Step-by-Step Fix

### 1. Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/mdywzxpacqwuedrjbhse/settings/api
2. Scroll to **"Project API keys"** section
3. Find the **"service_role"** key (long JWT token)
4. Copy it (NOT the anon/public key)

### 2. Create the Storage Bucket

1. Go to: https://supabase.com/dashboard/project/mdywzxpacqwuedrjbhse/storage/buckets
2. Click **"New bucket"**
3. Settings:
   - **Name**: `images`
   - **Public bucket**: ✅ **ENABLE THIS** (very important!)
   - **Allowed MIME types**: Leave empty (allow all image types)
   - **File size limit**: 50MB
4. Click **"Create bucket"**

### 3. Set Storage Policies (CRITICAL!)

After creating the bucket:

1. Click on the `images` bucket
2. Click **"Policies"** tab at the top
3. You should see "No policies yet" - click **"New Policy"**

#### Policy 1: Public Read Access (Allow anyone to view images)

Click **"Create a policy from scratch"** and enter:

```
Policy Name: Public Access
Allowed operation: SELECT
Target roles: public

Policy definition (SQL):
true
```

Or use this SQL directly:
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

#### Policy 2: Authenticated Upload (Allow uploads)

Click **"New Policy"** again:

```
Policy Name: Allow Uploads
Allowed operation: INSERT
Target roles: authenticated, service_role

Policy definition (SQL):
(bucket_id = 'images')
```

Or use this SQL:
```sql
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'images');
```

#### Policy 3: Service Role All Access (For backend operations)

```sql
CREATE POLICY "Service Role All Access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'images');
```

### 4. Update Your .env File

Replace `YOUR_SERVICE_ROLE_KEY_HERE` in backend/.env with the actual service role key from step 1.

```bash
SUPABASE_URL=https://mdywzxpacqwuedrjbhse.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJz...your-actual-key
SUPABASE_STORAGE_BUCKET=images
```

### 5. Test the Setup

Run the test script:
```bash
cd backend
node test-supabase.js
```

You should see:
```
✅ Available buckets: images
✅ Bucket "images" exists!
✅ Upload successful!
✅ Public URL: https://...
✅ Test file deleted
✅ All tests passed!
```

### 6. Verify in Browser

After setup, test the image URL directly in your browser:
```
https://mdywzxpacqwuedrjbhse.supabase.co/storage/v1/object/public/images/products/1d76df6725bb677e.png
```

If configured correctly, you should either:
- See the image (if it exists)
- Get 404 (if file doesn't exist, which is fine - at least storage is working)

If you still get 400, the bucket policies are not correct.

## Quick Verification Checklist

- [ ] Bucket named `images` exists
- [ ] Bucket is marked as **PUBLIC**
- [ ] At least one storage policy is created (Public Access for SELECT)
- [ ] Service role key is from the correct project (mdywzxpacqwuedrjbhse)
- [ ] Test script runs successfully

## Common Issues

### Issue: "signature verification failed"
**Cause**: Service role key is from wrong project
**Fix**: Get the key from the mdywzxpacqwuedrjbhse project

### Issue: "Bucket not found"
**Cause**: Bucket doesn't exist
**Fix**: Create bucket named `images` (step 2)

### Issue: 400 Bad Request in browser
**Cause**: Bucket is not public or policies not set
**Fix**: Make bucket public and add policies (step 3)

### Issue: "Unauthorized" or "Forbidden"
**Cause**: Missing storage policies
**Fix**: Add the policies from step 3

## Next Steps

After storage is working:

1. Upload new product images through your admin panel
2. Old placeholder URLs will still show placeholder.com
3. New uploads will use Supabase storage
4. Optionally: Re-upload product images to replace placeholders

## Support

If you still have issues, check the Supabase logs:
https://supabase.com/dashboard/project/mdywzxpacqwuedrjbhse/logs/explorer
