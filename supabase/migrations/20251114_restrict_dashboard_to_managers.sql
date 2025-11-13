-- Ensure only managers and HR admins can update user roles
-- This prevents employees from accessing dashboard functionality

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Organization owners can add users to their org" ON public.users;

-- Policy to allow managers and HR admins to add and update users in their organization
CREATE POLICY "Managers and admins can manage org users"
    ON public.users FOR UPDATE
    TO authenticated
    USING (
        -- Allow if the user doing the update is a manager or hr_admin in an organization
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND organization_id IS NOT NULL
            AND role IN ('manager', 'hr_admin')
        )
    )
    WITH CHECK (
        -- Only allow updating to the updater's organization
        organization_id = (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
        OR 
        -- Or removing from organization (setting to null)
        organization_id IS NULL
    );
