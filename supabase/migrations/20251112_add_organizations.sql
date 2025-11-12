-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add organization_id to users table
ALTER TABLE public.users 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all organizations
CREATE POLICY "Authenticated users can view all organizations"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert organizations (for signup after authentication)
CREATE POLICY "Authenticated users can create organization"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to update their organization
CREATE POLICY "Users can update their organization"
    ON public.organizations
    FOR UPDATE
    USING (
        id IN (
            SELECT organization_id 
            FROM public.users 
            WHERE id = auth.uid()
        )
    );

-- Add trigger to auto-update updated_at on organizations
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_organizations_updated_at();
