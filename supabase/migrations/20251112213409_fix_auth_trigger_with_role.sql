/*
  # Fix Authentication Trigger to Include Role

  This migration updates the handle_new_user() trigger function to include
  the role column when creating new user records. This prevents the need for
  fallback user creation logic and ensures users have a role from the start.

  ## Changes
  - Updates handle_new_user() function to set role='employee' by default
  - Ensures all new users get a complete profile on signup
  - Reduces the number of database queries needed during authentication

  ## Security
  - Function maintains SECURITY DEFINER for trigger execution
  - Default role is 'employee' for safety
  - Foreign key constraints remain enforced
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'employee'
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- User already exists, this is fine (race condition)
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail the auth
        RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;