/*
  # Add Organization Context to Conversations

  1. Purpose
    - Add organization_id to conversations table for multi-organization support
    - Ensure conversation history is isolated by organization
    - Allow users to see different conversations when switching organizations
    - Maintain data integrity with proper foreign keys and indexes

  2. Changes
    - Add organization_id column to conversations table
    - Create foreign key relationship to organizations table
    - Add index for efficient organization-based queries
    - Update RLS policies to filter by organization
    - Migrate existing conversations to their user's primary organization

  3. Security
    - Users can only see conversations within their current organization context
    - RLS policies enforce organization-based access control
*/

-- Add organization_id column to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.conversations
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for efficient organization-based queries
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id
ON public.conversations(organization_id);

-- Create composite index for user + organization queries
CREATE INDEX IF NOT EXISTS idx_conversations_user_organization
ON public.conversations(user_id, organization_id);

-- Migrate existing conversations to their user's primary organization
-- This sets organization_id for all existing conversations where it's NULL
UPDATE public.conversations c
SET organization_id = (
  SELECT ou.organization_id
  FROM public.organization_users ou
  WHERE ou.user_id = c.user_id
  ORDER BY ou.created_at ASC
  LIMIT 1
)
WHERE organization_id IS NULL
AND EXISTS (
  SELECT 1
  FROM public.organization_users ou
  WHERE ou.user_id = c.user_id
);

-- Update RLS policies to include organization context
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations in their organizations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations in their organizations" ON public.conversations;

-- Create new policies with organization context
CREATE POLICY "Users can view conversations in their organizations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE organization_users.user_id = auth.uid()
        AND organization_users.organization_id = conversations.organization_id
      )
    )
  );

CREATE POLICY "Users can create conversations in their organizations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.organization_users
        WHERE organization_users.user_id = auth.uid()
        AND organization_users.organization_id = conversations.organization_id
      )
    )
  );

CREATE POLICY "Users can update their own conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON COLUMN public.conversations.organization_id IS
  'References the organization this conversation belongs to. Allows for organization-based conversation isolation.';

COMMENT ON INDEX idx_conversations_organization_id IS
  'Index for efficient organization-based conversation queries';

COMMENT ON INDEX idx_conversations_user_organization IS
  'Composite index for user + organization conversation lookups';
