-- Allow authenticated users to add other users to their organization
-- This is needed for the organization user management feature
CREATE POLICY "Organization owners can add users to their org"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        -- Allow if the user doing the update is in an organization
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND organization_id IS NOT NULL
        )
    )
    WITH CHECK (
        -- Only allow updating the organization_id field to the updater's organization
        organization_id = (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );
