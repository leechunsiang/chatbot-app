# Complete Database Setup Guide

This guide will help you set up all the required database tables and configurations for the HR Policy & Benefits Q&A Chatbot.

## Prerequisites

1. You must have a Supabase account and project
2. You need your Supabase credentials in `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

## Step 1: Run Database Migrations

You need to run 3 SQL migration files in the Supabase SQL Editor in this order:

### 1.1 Run Initial Schema (Chat Tables)

Go to Supabase Dashboard → SQL Editor → New Query

Copy and paste the contents of:
```
supabase/migrations/20251111132619_create_initial_schema.sql
```

Click "Run" to execute.

**This creates:**
- `users` table (user profiles)
- `conversations` table (chat conversations)
- `messages` table (chat messages with embeddings)
- All indexes and RLS policies
- Triggers for auto-updating timestamps

### 1.2 Add User Roles

In Supabase SQL Editor, create a new query.

Copy and paste the contents of:
```
supabase/migrations/20251112_add_user_roles.sql
```

Click "Run" to execute.

**This adds:**
- `role` column to `users` table (employee, manager, hr_admin)
- Index for role queries
- RLS policy for users to read their own role

### 1.3 Create Policy Documents Table

In Supabase SQL Editor, create a new query.

Copy and paste the contents of:
```
supabase/migrations/20251111_policy_documents_schema.sql
```

Click "Run" to execute.

**This creates:**
- `policy_documents` table (for HR document management)
- Indexes for performance
- RLS policies for document access control
- Triggers for auto-updating timestamps

## Step 2: Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Enter bucket name: `policy-documents`
4. Set as **Private** (not public)
5. Click "Create bucket"

### Configure Storage Policies

After creating the bucket, click on it and go to "Policies" tab.

Add these policies:

**Policy 1: HR Admins can upload documents**
```sql
CREATE POLICY "HR admins can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

**Policy 2: HR Admins can view all documents**
```sql
CREATE POLICY "HR admins can view all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

**Policy 3: HR Admins can delete documents**
```sql
CREATE POLICY "HR admins can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

**Policy 4: Authenticated users can read published documents**
```sql
CREATE POLICY "Users can read published documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'policy-documents' AND
  EXISTS (
    SELECT 1 FROM policy_documents
    WHERE policy_documents.file_path = name
    AND policy_documents.status = 'published'
  )
);
```

## Step 3: Set Your User as HR Admin

After signing up and logging in, you need to grant yourself HR admin access.

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Run this query (replace YOUR_EMAIL with your actual email):

```sql
UPDATE users 
SET role = 'hr_admin' 
WHERE email = 'YOUR_EMAIL';
```

Or if you want to find your user ID first:
```sql
-- First, check your user ID
SELECT id, email, role FROM users WHERE email = 'YOUR_EMAIL';

-- Then update the role
UPDATE users 
SET role = 'hr_admin' 
WHERE id = 'your-user-id-here';
```

## Step 4: Verify Setup

Run these queries to verify everything is set up correctly:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'conversations', 'messages', 'policy_documents');

-- Check if role column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'policy-documents';

-- Check your user role
SELECT id, email, role FROM users WHERE email = 'YOUR_EMAIL';
```

## Step 5: Test the Application

1. Refresh your browser at http://localhost:5174
2. Sign in with your account
3. You should see the chat interface load without errors
4. Click the Dashboard button (top right) to access the HR Dashboard
5. Try uploading a document in the Document Management section

## Troubleshooting

### Error: "relation does not exist"
- You haven't run the migrations yet. Go back to Step 1.

### Error: "permission denied for table"
- RLS policies are not set up correctly. Re-run the migration files.

### Error: "Database table not found"
- Run all 3 migration files in order.

### Chat loads but can't create conversations
- The `conversations` table is missing. Run migration 1.1.

### Dashboard button doesn't appear
- Your user role is not set to `hr_admin`. Go to Step 3.

### Can't upload documents
- Storage bucket is not created or policies are missing. Go to Step 2.

### Auth initialization timeout
- Check your `.env` file has correct Supabase credentials
- Make sure your Supabase project is active and not paused

## What Each Component Requires

| Feature | Required Tables | Required Storage |
|---------|----------------|------------------|
| Chat | users, conversations, messages | - |
| HR Dashboard Access | users (with role column) | - |
| Document Management | policy_documents, users | policy-documents bucket |
| FAQ Management | Coming soon | - |
| Analytics | Coming soon | - |

## Next Steps After Setup

Once everything is set up:

1. ✅ Upload some HR policy documents (PDF or DOCX)
2. ✅ Test the chat functionality
3. ✅ Explore the dashboard features
4. 🔜 Implement document embeddings for semantic search
5. 🔜 Add FAQ management
6. 🔜 Set up analytics tracking

## Need Help?

If you encounter any issues:
1. Check the browser console (F12) for error messages
2. Check the Supabase logs in Dashboard → Logs
3. Verify all migrations ran successfully
4. Ensure your `.env` file has the correct credentials
