# Fix Document Upload Errors

## Problem
Document uploads are failing with "new row violates row-level security policy" errors on both:
1. Storage bucket (`storage.objects`)
2. Policy documents table (`policy_documents`)

## Root Cause
BOTH the storage policies AND the `policy_documents` table policies were checking for `users.role = 'hr_admin'`, but your application uses the `organization_users` table to store user roles, not a `role` column in the `users` table.

## Solution

### **COMPLETE FIX - Run This SQL** ✅

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the entire contents of: **`COMPLETE_RLS_FIX.sql`**
4. Paste and click **Run**

This single script fixes BOTH issues:
- ✅ Fixes `policy_documents` table RLS policies
- ✅ Fixes `storage.objects` bucket policies

### Alternative: Copy SQL Directly

```sql
-- Copy the contents of COMPLETE_RLS_FIX.sql here
-- (See the file for the complete script)
```

```sql
-- Fix storage policies to work with organization_users table
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can delete policy documents" ON storage.objects;

-- Policy: Authenticated users can view/download policy documents
CREATE POLICY "Authenticated users can view policy documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'policy-documents');

-- Policy: Users with hr_admin or manager role can upload policy documents
CREATE POLICY "Admins can upload policy documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- Policy: Users with hr_admin or manager role can update policy documents
CREATE POLICY "Admins can update policy documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

-- Policy: Users with hr_admin or manager role can delete policy documents
CREATE POLICY "Admins can delete policy documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );
```

## What Changed

### Before:
- Policies checked `users.role = 'hr_admin'`
- This column doesn't exist in your schema

### After:
- Policies check `organization_users.role IN ('hr_admin', 'manager')`
- Works with your actual database schema
- Both HR admins and managers can upload documents

## Verification

After running the migration:

1. **Test Upload**:
   - Log in as a user with `hr_admin` or `manager` role
   - Try uploading a document
   - Should succeed without errors

2. **Check Policies**:
   - Go to Supabase Dashboard → Storage → policy-documents
   - Click "Policies" tab
   - Should see 4 policies listed

## Troubleshooting

### If upload still fails:

1. **Verify your role**:
   ```sql
   SELECT role FROM organization_users WHERE user_id = auth.uid();
   ```
   Should return `hr_admin` or `manager`

2. **Check bucket exists**:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'policy-documents';
   ```
   Should return one row

3. **Verify policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```
   Should show the 4 new policies

## Quick Test

After applying the fix, try this quick test:

1. Go to Dashboard → Quick Actions
2. Click "📄 Upload Document"
3. Select a small test file (e.g., a TXT file)
4. Fill in title: "Test Document"
5. Status: "Published"
6. Click Upload

If successful, you'll see:
- Progress bar completes
- Success toast message
- Document appears in library

## Need Help?

If issues persist, please share:
1. Your current user role (from `organization_users` table)
2. Any new error messages
3. Browser console logs
