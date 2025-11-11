# Supabase Storage Setup Guide

## Create Storage Bucket

You need to create a storage bucket in Supabase for document uploads.

### 1. Go to Supabase Dashboard

Navigate to your project at https://supabase.com/dashboard

### 2. Create the Storage Bucket

1. Click on **Storage** in the left sidebar
2. Click **New bucket**
3. Enter the following details:
   - **Name**: `policy-documents`
   - **Public bucket**: ✅ Check this box (we'll use RLS for security)
   - **File size limit**: 10MB (or adjust as needed)
   - **Allowed MIME types**: Leave empty or specify:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/msword`

4. Click **Create bucket**

### 3. Set Up Storage Policies

After creating the bucket, you need to add Row Level Security policies:

#### Policy 1: HR Admins can upload

```sql
CREATE POLICY "HR admins can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents'
  AND (storage.foldername(name))[1] = 'documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

#### Policy 2: HR Admins can update

```sql
CREATE POLICY "HR admins can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

#### Policy 3: HR Admins can delete

```sql
CREATE POLICY "HR admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'hr_admin'
  )
);
```

#### Policy 4: All authenticated users can view

```sql
CREATE POLICY "Authenticated users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'policy-documents');
```

### 4. Apply the Database Migration

Run the SQL migration file to create the `policy_documents` table:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20251111_policy_documents_schema.sql
```

Or copy and paste the contents of that file into the SQL Editor.

### 5. Verify Setup

To test that everything is working:

1. Make sure your user has `role = 'hr_admin'` in the `users` table
2. Go to the HR Dashboard → Policy Documents
3. Click **Upload Document**
4. Select a PDF or DOCX file
5. Fill in the details and click Upload

### Troubleshooting

#### "Failed to upload document"
- Check that the bucket name is exactly `policy-documents`
- Verify storage policies are applied
- Check browser console for specific errors
- Ensure your user has `hr_admin` role

#### "Access denied"
- Verify RLS policies are enabled on the bucket
- Check that your user has the correct role in the database
- Make sure you're authenticated

#### "File type not allowed"
- Only PDF (.pdf) and Word (.docx, .doc) files are accepted
- Check the file extension matches the MIME type
- Maximum file size is 10MB

### Storage Structure

Files will be stored with this structure:
```
policy-documents/
  └── documents/
      ├── 1699876543210-abc123.pdf
      ├── 1699876544321-def456.docx
      └── ...
```

Each file is renamed with a timestamp and random ID to prevent conflicts.

## Next Steps

After setting up storage, you can:

1. **Upload Policy Documents**: Use the HR Dashboard to upload PDF/DOCX files
2. **Implement Document Processing**: Extract text from uploaded documents
3. **Generate Embeddings**: Use OpenAI to create vector embeddings for semantic search
4. **Build Search**: Enable employees to search across all policy documents
