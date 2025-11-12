# Organization Support Implementation

## Overview
Added support for users to create and join organizations during the signup process.

## Changes Made

### 1. Database Migration (`supabase/migrations/20251112_add_organizations.sql`)
- Created new `organizations` table with fields:
  - `id` (UUID, primary key)
  - `name` (TEXT, required)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- Added `organization_id` column to `users` table
- Enabled Row Level Security (RLS) on organizations table
- Added policies for users to view, create, and update their organization
- Added trigger to auto-update `updated_at` timestamp

### 2. Database Types (`src/lib/database.types.ts`)
- Added TypeScript type definitions for the `organizations` table
- Updated `users` table types to include `organization_id` field

### 3. Auth Component (`src/components/Auth.tsx`)
- Added `organizationName` state variable
- Added "Organization Name" input field that appears only during signup
- Modified signup flow to:
  1. Create the organization first
  2. Sign up the user
  3. Link the user to the organization by updating the `organization_id`
- Organization name field is cleared when switching between sign in/sign up modes

## How It Works

When a user signs up:
1. User enters email, password, and organization name
2. System creates a new organization with the provided name
3. User account is created
4. User is automatically linked to the newly created organization

## Next Steps

To apply the database changes:
1. Run the migration using Supabase CLI or dashboard
2. The changes will take effect immediately

## Security

- RLS policies ensure users can only view and manage their own organization
- All users can create organizations (for signup purposes)
- Users can only update organizations they belong to
