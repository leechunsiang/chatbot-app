# 🔧 URGENT FIX: Document Upload Errors

## ⚠️ The Problem
You're getting "new row violates row-level security policy" errors because the database policies are checking for a `role` column in the `users` table that doesn't exist. Your app uses `organization_users` table instead.

---

## ✅ THE FIX (3 Simple Steps)

### Step 1: Open Supabase Dashboard
Go to: https://supabase.com/dashboard

### Step 2: Open SQL Editor
Click on **"SQL Editor"** in the left sidebar

### Step 3: Run This SQL
Copy **ALL** of this SQL, paste into the SQL Editor, and click **"Run"**:

```sql
-- =====================================================
-- COMPLETE FIX FOR DOCUMENT UPLOAD RLS POLICIES
-- =====================================================

-- Fix policy_documents table
DROP POLICY IF EXISTS "HR admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Users can view published documents" ON policy_documents;

CREATE POLICY "Admins can manage all documents"
  ON policy_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users
      WHERE organization_users.user_id = auth.uid()
      AND organization_users.role IN ('hr_admin', 'manager')
    )
  );

CREATE POLICY "Users can view published documents"
  ON policy_documents FOR SELECT TO authenticated
  USING (status = 'published');

-- Fix storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Drop old storage policies
DROP POLICY IF EXISTS "Authenticated users can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Authenticated users can view documents"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'policy-documents');

CREATE POLICY "Admins can upload documents"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

CREATE POLICY "Admins can update documents"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete documents"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM organization_users
            WHERE organization_users.user_id = auth.uid()
            AND organization_users.role IN ('hr_admin', 'manager')
        )
    );
```

---

## ✅ After Running the SQL

1. **Refresh your browser** (F5)
2. **Try uploading again**
3. Should work! ✨

---

## 🧪 Quick Test

To verify your role is correct, run this in SQL Editor:

```sql
SELECT role FROM organization_users WHERE user_id = auth.uid();
```

Should return: `hr_admin` or `manager`

---

## 🆘 Still Not Working?

If you still get errors:

1. **Check you're logged in** as hr_admin or manager
2. **Clear browser cache** and try again
3. **Check browser console** for new error messages
4. Share the new error message with me

---

## 📝 What This Does

**Before:**
- Policies checked: `users.role = 'hr_admin'` ❌ (doesn't exist)

**After:**
- Policies check: `organization_users.role IN ('hr_admin', 'manager')` ✅ (exists!)

**Result:**
- Both storage uploads AND database inserts will work
- HR admins and managers can upload documents
- All users can view published documents

---

## 🎯 Next Steps After Fix

Once the SQL runs successfully:

1. Go to your app: http://localhost:5174/
2. Login as hr_admin or manager
3. Click "📄 Upload Document"
4. Upload a test file
5. Watch it succeed! 🎉

---

**File with complete SQL:** `COMPLETE_RLS_FIX.sql`
