-- Enable RLS on activity_logs table
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activities from their organization
CREATE POLICY "Users can view their organization's activities"
ON activity_logs
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can insert activities for their organization
CREATE POLICY "Users can create activities for their organization"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id 
    FROM organization_users 
    WHERE user_id = auth.uid()
  )
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_created 
ON activity_logs(organization_id, created_at DESC);
