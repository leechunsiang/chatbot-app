-- Create policy_documents table
CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_policy_documents_status ON policy_documents(status);
CREATE INDEX IF NOT EXISTS idx_policy_documents_category ON policy_documents(category);
CREATE INDEX IF NOT EXISTS idx_policy_documents_uploaded_by ON policy_documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_policy_documents_created_at ON policy_documents(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create it
DROP TRIGGER IF EXISTS update_policy_documents_updated_at ON policy_documents;

CREATE TRIGGER update_policy_documents_updated_at
  BEFORE UPDATE ON policy_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "HR admins can manage all documents" ON policy_documents;
DROP POLICY IF EXISTS "Users can view published documents" ON policy_documents;

-- Policies for policy_documents
-- HR admins can do everything
CREATE POLICY "HR admins can manage all documents"
  ON policy_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'hr_admin'
    )
  );

-- All authenticated users can view published documents
CREATE POLICY "Users can view published documents"
  ON policy_documents
  FOR SELECT
  TO authenticated
  USING (status = 'published');
