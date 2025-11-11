# Project Documentation

## Overview

This is a production-ready ChatGPT-like chatbot application with full backend integration using Supabase.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     Auth     │  │     Chat     │  │  Components  │  │
│  │  Component   │  │  Component   │  │   (shadcn)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                             │
│         └────────┬────────┘                             │
│                  │                                      │
└──────────────────┼──────────────────────────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────┐            ┌───────▼────────┐
│  Supabase  │            │  OpenAI API    │
│  Backend   │            │  (GPT-4.1-nano)│
└────────────┘            └────────────────┘
│
├─ Auth (Email/Password)
├─ PostgreSQL Database
│  ├─ users
│  ├─ conversations
│  └─ messages (with pgvector)
│
└─ Storage
   ├─ avatars (public)
   └─ attachments (private)
```

## Features Implemented

### 1. Authentication System ✅
- Email/password signup and login
- Guest mode (optional)
- Automatic session management
- Secure token handling

### 2. Database Schema ✅
- **users**: User profiles linked to auth
- **conversations**: Chat sessions
- **messages**: Individual messages with role (user/assistant)
- **Row Level Security**: Users can only access their own data

### 3. Chat Functionality ✅
- Real-time messaging with GPT-4.1-nano
- Message history persistence
- Conversation management
- Automatic conversation titles

### 4. Vector Search ✅
- pgvector extension enabled
- Embeddings storage (1536 dimensions)
- Similarity search function
- Ready for semantic search features

### 5. File Storage ✅
- Avatar uploads (public bucket)
- Chat attachments (private bucket)
- Secure file access with RLS

### 6. UI/UX ✅
- Fully responsive design
- Mobile, tablet, desktop support
- Loading states and error handling
- Smooth animations

## File Structure

```
chatbot-app/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── scroll-area.tsx
│   │   ├── Auth.tsx               # Authentication UI
│   │   └── Chat.tsx               # Main chat interface
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client setup
│   │   ├── database.ts            # Database utility functions
│   │   ├── database.types.ts      # TypeScript types for DB
│   │   └── utils.ts               # Helper utilities
│   │
│   ├── App.tsx                    # Main app component
│   ├── App.css                    # App-specific styles
│   ├── index.css                  # Global styles with Tailwind
│   └── main.tsx                   # Entry point
│
├── supabase-schema.sql            # Complete database schema
├── .env                           # Environment variables (NEVER commit!)
├── .env.example                   # Template for .env
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
├── postcss.config.js              # PostCSS configuration
│
├── README.md                      # Main documentation
├── START_HERE.md                  # Quick start guide
├── SUPABASE_SETUP.md              # Detailed Supabase setup
├── QUICKSTART.md                  # 3-step quick start
└── PROJECT_DOCS.md                # This file
```

## Environment Variables

```env
# OpenAI Configuration
VITE_OPENAI_API_KEY=sk-proj-...    # Your OpenAI API key

# Supabase Configuration
VITE_SUPABASE_URL=https://...       # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=eyJ...       # Your Supabase anon key
```

## Database Schema Details

### Tables

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,              -- Links to auth.users
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    embedding VECTOR(1536),           -- For semantic search
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security

All tables have RLS enabled with policies ensuring:
- Users can only see/modify their own data
- Automatic user_id validation
- Secure cascade deletes

### Functions

#### match_messages
```sql
-- Semantic search using vector similarity
SELECT * FROM match_messages(
    query_embedding := '[...]',  -- 1536-dim vector
    match_threshold := 0.7,      -- Min similarity score
    match_count := 10            -- Max results
);
```

## API Integration

### OpenAI API
- **Model**: gpt-4.1-nano
- **Endpoint**: https://api.openai.com/v1/chat/completions
- **Features**:
  - Chat completions
  - Context awareness
  - Low latency (0.29s to first token)
  - Cost-effective ($0.175/1M tokens)

### Supabase API
- **Auth**: Email/password, OAuth ready
- **Database**: Real-time PostgreSQL
- **Storage**: File uploads with signed URLs
- **Edge Functions**: Ready for serverless functions

## Development Workflow

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npm run tsc
```

### Linting
```bash
npm run lint
```

## Security Considerations

### Implemented ✅
- Row Level Security (RLS) on all tables
- Secure session management with Supabase Auth
- Environment variable protection (.env not in Git)
- Storage bucket policies for file access
- Input validation on forms

### For Production 🔒
- [ ] Move OpenAI API calls to backend
- [ ] Implement rate limiting
- [ ] Add CORS configuration
- [ ] Enable email confirmations
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Add request throttling
- [ ] Implement content moderation

## Future Enhancements

### Potential Features
- [ ] Multi-language support
- [ ] Code syntax highlighting
- [ ] Markdown rendering in messages
- [ ] Voice input/output
- [ ] Image generation
- [ ] Export conversations
- [ ] Share conversations
- [ ] Dark/light theme toggle
- [ ] Conversation search
- [ ] Message editing
- [ ] Regenerate responses
- [ ] Custom system prompts
- [ ] Conversation templates

### Advanced Features
- [ ] Multi-model support (GPT-4, Claude, etc.)
- [ ] Plugin system for extensions
- [ ] Vector search UI for finding similar conversations
- [ ] Automatic conversation tagging
- [ ] Analytics dashboard
- [ ] Team collaboration
- [ ] API webhooks
- [ ] Custom integrations

## Troubleshooting

### OpenAI API Errors
- Check API key is correct and active
- Verify you have credits in your OpenAI account
- Check console for specific error messages

### Supabase Connection Errors
- Verify .env has correct URL and key
- Check Supabase project is active
- Ensure RLS policies are set up correctly

### Authentication Issues
- Clear browser cache and cookies
- Check Supabase Auth is enabled
- Verify email confirmation settings

### Database Errors
- Ensure schema was run completely
- Check RLS policies in Supabase dashboard
- Verify foreign key relationships

## Performance Optimization

### Implemented ✅
- Database indexes on frequently queried fields
- HNSW index for vector search
- Optimized SQL queries
- Lazy loading for conversations
- Debounced inputs
- Efficient React component updates

### Recommended 📈
- [ ] Implement pagination for old messages
- [ ] Add caching layer (Redis)
- [ ] Use CDN for static assets
- [ ] Enable gzip compression
- [ ] Optimize bundle size
- [ ] Implement code splitting

## Testing

### Unit Tests (Todo)
```bash
# Install testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Run tests
npm run test
```

### E2E Tests (Todo)
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npm run test:e2e
```

## Deployment Options

### Recommended Platforms
1. **Vercel** (Easiest)
   - Automatic builds from Git
   - Edge functions support
   - Built-in analytics

2. **Netlify**
   - Simple deployment
   - Form handling
   - Split testing

3. **Railway**
   - Full-stack deployment
   - Database included
   - Auto-scaling

### Environment Variables on Deploy
Remember to set these in your hosting platform:
- `VITE_OPENAI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Support & Resources

### Documentation
- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)

### Community
- [Supabase Discord](https://discord.supabase.com)
- [OpenAI Community](https://community.openai.com)
- [React Discord](https://discord.gg/react)

## License

MIT License - Feel free to use for personal or commercial projects!

---

**Built with ❤️ using React, Vite, Supabase, and OpenAI**
