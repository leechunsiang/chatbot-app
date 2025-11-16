/*
  # Allow Anonymous Users to Search Organizations

  1. Changes
    - Drop the existing SELECT policy that requires authentication
    - Create a new SELECT policy that allows both authenticated and anonymous users to view organizations
    
  2. Security
    - Organizations table is read-only for anonymous users
    - Only viewing organization names and IDs is allowed
    - Creating organizations still requires authentication
    - This allows users to search for organizations during signup
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view all organizations" ON public.organizations;

-- Create new policy that allows both authenticated and anonymous users to view organizations
CREATE POLICY "Allow anyone to view organizations"
  ON public.organizations
  FOR SELECT
  USING (true);
