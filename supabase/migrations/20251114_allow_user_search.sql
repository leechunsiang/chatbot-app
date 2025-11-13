-- Allow authenticated users to view other users for search purposes
-- This is needed for the organization user management feature
CREATE POLICY "Authenticated users can search for users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);
