-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('policy-documents', 'policy-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
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

-- Policy: HR admins can upload policy documents
CREATE POLICY "HR admins can upload policy documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'hr_admin'
        )
    );

-- Policy: HR admins can update policy documents
CREATE POLICY "HR admins can update policy documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'hr_admin'
        )
    );

-- Policy: HR admins can delete policy documents
CREATE POLICY "HR admins can delete policy documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'policy-documents'
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'hr_admin'
        )
    );
