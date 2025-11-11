# Supabase Setup Guide

This guide will walk you through setting up Supabase for your chatbot application.

## Prerequisites

- Supabase account (free tier is sufficient)
- OpenAI API key

## Step-by-Step Setup

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: `chatbot-app` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup (~2 minutes)

### 2. Run the Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste into the SQL editor
5. Click "Run" or press `Ctrl+Enter`
6. You should see "Success. No rows returned" - this is normal!

**What this does:**
- ✅ Enables pgvector extension for embeddings
- ✅ Creates users, conversations, and messages tables
- ✅ Sets up proper relationships with foreign keys
- ✅ Configures Row Level Security (RLS) policies
- ✅ Creates indexes for performance
- ✅ Sets up automatic triggers for timestamps
- ✅ Creates storage buckets for avatars and attachments
- ✅ Adds vector similarity search function

### 3. Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. **Email** should be enabled by default
3. Configure email settings:
   - **Enable Email Confirmations**: ✅ (recommended for production)
   - **Enable Email OTP**: Optional
   - **Secure Email Change**: ✅ (recommended)

### 4. Get Your API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 5. Configure Environment Variables

1. Open the `.env` file in your project root
2. Add your credentials:

```env
# OpenAI API Key
VITE_OPENAI_API_KEY=sk-proj-your-openai-key-here

# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file

### 6. Verify Database Setup

1. In Supabase Dashboard, go to **Table Editor**
2. You should see these tables:
   - `users`
   - `conversations`
   - `messages`
3. Click on each table to verify the structure

### 7. Test Authentication (Optional)

You can test authentication in the Supabase Dashboard:

1. Go to **Authentication** → **Users**
2. Click "Add user" to manually create a test user
3. Or use the app's signup feature

## Database Schema Overview

### Tables Structure

```
users
├── id (UUID, Primary Key, links to auth.users)
├── email (TEXT, Unique)
├── full_name (TEXT, Nullable)
├── avatar_url (TEXT, Nullable)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

conversations
├── id (UUID, Primary Key)
├── user_id (UUID, Foreign Key → users.id)
├── title (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

messages
├── id (UUID, Primary Key)
├── conversation_id (UUID, Foreign Key → conversations.id)
├── role (TEXT: 'user' | 'assistant' | 'system')
├── content (TEXT)
├── embedding (VECTOR(1536), Nullable)
└── created_at (TIMESTAMPTZ)
```

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure:
- Users can only access their own data
- Users can CRUD their own conversations
- Users can CRUD messages in their own conversations
- Proper cascade deletes maintain data integrity

### Indexes

Performance indexes are created for:
- User email lookups
- Conversation queries by user and date
- Message queries by conversation and date
- Vector similarity search (HNSW index)

## Storage Buckets

Two storage buckets are configured:

### 1. **avatars** (Public)
- For user profile pictures
- Publicly readable
- Users can upload/update/delete their own avatar

### 2. **attachments** (Private)
- For chat file attachments
- Private - only accessible by owner
- Users can upload/delete their own files

## Vector Search Setup

The `match_messages` function enables semantic search:

```sql
SELECT * FROM match_messages(
  query_embedding := '[0.1, 0.2, ...]', -- 1536-dim vector
  match_threshold := 0.7,                -- Similarity threshold
  match_count := 10                      -- Max results
);
```

To use this:
1. Generate embeddings using OpenAI's API
2. Store in `messages.embedding` column
3. Query using the `match_messages` function

## Troubleshooting

### "relation does not exist" error
- Make sure you ran the entire `supabase-schema.sql` file
- Check SQL Editor for any errors during execution

### RLS policy errors
- Verify user is authenticated: `supabase.auth.getSession()`
- Check that policies were created: Go to Table Editor → Click table → Policies tab

### Can't insert data
- Confirm RLS policies are set correctly
- Make sure `auth.uid()` matches the `user_id` being inserted

### Vector search not working
- Verify pgvector extension is enabled: Run `CREATE EXTENSION IF NOT EXISTS vector;`
- Check that embeddings are 1536 dimensions (OpenAI standard)

### Storage upload fails
- Verify storage buckets exist: **Storage** tab in dashboard
- Check storage policies were created
- Ensure file path follows pattern: `{user_id}/{filename}`

## Next Steps

After completing this setup:

1. ✅ Run `npm install` in your project
2. ✅ Configure `.env` with your credentials
3. ✅ Start the dev server: `npm run dev`
4. ✅ Test signup/login functionality
5. ✅ Start chatting and verify messages are saved

## Security Best Practices

### For Development
- ✅ Use the `anon` key (public)
- ✅ RLS policies protect your data
- ✅ Never commit `.env` file to Git

### For Production
- ✅ Enable email confirmations
- ✅ Set up custom email templates
- ✅ Configure proper CORS settings
- ✅ Use environment variables on your hosting platform
- ✅ Consider enabling MFA for users
- ✅ Set up database backups
- ✅ Monitor usage in Supabase Dashboard

## Advanced Features (Optional)

### Enable OAuth Providers

1. Go to **Authentication** → **Providers**
2. Enable providers (Google, GitHub, etc.)
3. Configure OAuth credentials
4. Add provider buttons to your Auth component

### Set Up Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize:
   - Confirmation emails
   - Password reset emails
   - Magic link emails

### Database Backups

1. Go to **Database** → **Backups**
2. Configure automatic backup schedule
3. Download backups as needed

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

---

**Setup Complete!** 🎉

Your chatbot now has:
- ✅ User authentication
- ✅ Persistent chat history
- ✅ Conversation management
- ✅ Vector search capabilities
- ✅ Secure data access
- ✅ File storage support
