# Multi-Organization Support Implementation

## Overview
The chatbot app now supports users belonging to multiple organizations simultaneously. Users can switch between organizations using a dropdown in the header.

## Database Changes

### New Table: `organization_users`
A junction table that creates a many-to-many relationship between users and organizations.

**Schema:**
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- organization_id: UUID (references organizations)
- role: TEXT (employee, manager, hr_admin)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- UNIQUE constraint on (user_id, organization_id)
```

### Migration Required
Run the migration file: `supabase/migrations/20251114_add_organization_users.sql`

This migration will:
1. Create the `organization_users` table
2. Set up Row Level Security (RLS) policies
3. Migrate existing data from `users` table to `organization_users`
4. Add appropriate indexes for performance

**Important:** The `users` table still keeps `organization_id` and `role` for backward compatibility, but the source of truth is now the `organization_users` table.

## UI Changes

### Organization Display
- **Single Organization:** Displays as simple green text in the header
- **Multiple Organizations:** Displays as a dropdown button with down arrow
  - Click to see list of all organizations
  - Shows organization name and user's role in that org
  - Currently selected org is highlighted in green
  - Click outside to close dropdown

### How It Works
1. On dashboard load, fetch all organizations the user belongs to from `organization_users`
2. Set the first organization as selected by default
3. Display organization name in header (dropdown if multiple orgs)
4. User can click dropdown to switch between organizations
5. When switching, the dashboard updates to show data for the selected organization

## Features
- ✅ Users can belong to multiple organizations
- ✅ Each membership has its own role (employee in one org, manager in another)
- ✅ Seamless switching between organizations
- ✅ Role-based access control per organization
- ✅ Backward compatible with existing users table

## Testing Steps
1. Apply the migration in Supabase Dashboard
2. Create a user and add them to multiple organizations
3. Login and verify dropdown appears in header
4. Click dropdown to switch between organizations
5. Verify management features respect the role for selected organization

## Notes
- Employees in one organization can be managers in another
- When adding users to an organization, they're added to `organization_users` table
- The `users` table is kept updated for users with a "primary" organization
- All queries for organization members now use the `organization_users` table
