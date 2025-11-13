-- Add first_name and last_name columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index for first_name queries
CREATE INDEX IF NOT EXISTS idx_users_first_name ON public.users(first_name);

-- Comment explaining the columns
COMMENT ON COLUMN public.users.first_name IS 'User''s first name';
COMMENT ON COLUMN public.users.last_name IS 'User''s last name';
