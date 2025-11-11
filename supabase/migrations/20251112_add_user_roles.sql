-- Add role column to users table for HR dashboard access control
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee' 
CHECK (role IN ('employee', 'manager', 'hr_admin'));

-- Create index for role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update RLS policies to allow users to read their own role
-- Drop the policy if it exists, then create it
DROP POLICY IF EXISTS "Users can read their own role" ON public.users;

CREATE POLICY "Users can read their own role"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Comment explaining the roles
COMMENT ON COLUMN public.users.role IS 'User role: employee (default), manager, or hr_admin (for dashboard access)';
