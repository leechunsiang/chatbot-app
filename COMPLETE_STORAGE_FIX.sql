-- Complete Storage Setup and Fix Script
-- Run this entire script in Supabase SQL Editor

-- Step 1: Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Step 2: Drop ALL existing policies for this bucket
DROP POLICY IF EXISTS "Authenticated users can view policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "HR admins can delete policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update policy documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete policy documents" ON storage.objects;

-- Step 3: Create new policies that work with organization_users table

-- Allow authenticated users to view/download documents
CREATE POLICY "Allow authenticated users to view documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'policy-documents');

-- Allow hr_admin and manager to upload documents
CREATE POLICY "Allow admins to upload documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'policy-documents'
        AND (
            EXISTS (
                SELECT 1 FROM public.organization_users
                WHERE organization_users.user_id = auth.uid()
                AND organization_users.role IN ('hr_admin', 'manager')
            )
        )
    );

-- Allow hr_admin and manager to update documents
CREATE POLICY "Allow admins to update documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND (
            EXISTS (
                SELECT 1 FROM public.organization_users
                WHERE organization_users.user_id = auth.uid()
                AND organization_users.role IN ('hr_admin', 'manager')
            )
        )
    );

-- Allow hr_admin and manager to delete documents
CREATE POLICY "Allow admins to delete documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND (
            EXISTS (
                SELECT 1 FROM public.organization_users
                WHERE organization_users.user_id = auth.uid()
                AND organization_users.role IN ('hr_admin', 'manager')
            )
        )
    );

-- Step 4: Verify setup (optional - run these queries to check)
-- SELECT * FROM storage.buckets WHERE id = 'policy-documents';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%documents%';
