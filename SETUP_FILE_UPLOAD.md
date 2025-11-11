# Quick Setup Guide - File Upload Feature

## ✅ What's Done

All hardcoded data has been removed from the HR Dashboard and replaced with real Supabase integration. The file upload feature is now fully implemented!

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration

Copy and paste this SQL in your Supabase SQL Editor:

```sql
-- Create policy_documents table
CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policy_documents_status ON policy_documents(status);
CREATE INDEX IF NOT EXISTS idx_policy_documents_category ON policy_documents(category);
CREATE INDEX IF NOT EXISTS idx_policy_documents_uploaded_by ON policy_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_policy_documents_created_at ON policy_documents(created_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_policy_documents_updated_at
  BEFORE UPDATE ON policy_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "HR admins can manage all documents"
  ON policy_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'hr_admin'
    )
  );

CREATE POLICY "Users can view published documents"
  ON policy_documents FOR SELECT TO authenticated
  USING (status = 'published');
```

### Step 2: Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Name: `policy-documents`
4. Check ☑ **Public bucket**
5. Click **Create bucket**

### Step 3: Add Storage Policies

Copy and paste these in Supabase SQL Editor:

```sql
-- HR admins can upload
CREATE POLICY "HR admins can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'policy-documents'
  AND (storage.foldername(name))[1] = 'documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'hr_admin'
  )
);

-- HR admins can update
CREATE POLICY "HR admins can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'hr_admin'
  )
);

-- HR admins can delete
CREATE POLICY "HR admins can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'policy-documents'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.role = 'hr_admin'
  )
);

-- All authenticated users can view
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'policy-documents');
```

## 🎉 You're Ready!

Now you can:

1. **Login** as an HR admin
2. Go to **HR Dashboard** → **Policy Documents**
3. Click **Upload Document**
4. Select a PDF or DOCX file (max 10MB)
5. Fill in the details and upload!

## 📱 Features Available

### Document Management
- ✅ Upload PDF/DOCX files
- ✅ Real-time document listing
- ✅ Search by title/description
- ✅ Filter by status (all, published, draft, archived)
- ✅ Download documents
- ✅ Delete documents
- ✅ View file size and upload date
- ✅ Category tagging

### Dashboard Overview
- ✅ Real document count from database
- ✅ Published document count
- ✅ Loading states
- ✅ Empty state messages

## 📄 File Requirements

- **Formats**: PDF (.pdf), Word (.docx, .doc)
- **Max Size**: 10MB
- **Required Fields**: Title
- **Optional Fields**: Description, Category, Status

## 🔒 Security

- Only HR admins can upload/delete documents
- All authenticated users can view published documents
- Row Level Security enabled on all tables
- File names are randomized for security

## 📚 Documentation

More details in:
- `SUPABASE_STORAGE_SETUP.md` - Detailed storage setup guide
- `FILE_UPLOAD_IMPLEMENTATION.md` - Complete implementation details
- `supabase/migrations/20251111_policy_documents_schema.sql` - Database schema

## ⚡ Your App is Running!

Open http://localhost:5173/ and test it out!
