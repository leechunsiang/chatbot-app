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
