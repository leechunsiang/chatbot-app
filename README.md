# ChatGPT-like Chatbot with Supabase

A modern, responsive chatbot web application built with React, Vite, shadcn/ui, Supabase, and powered by OpenAI's GPT-4.1-nano model.

## Features

- 🎨 Modern UI with shadcn/ui components
- 📱 Fully responsive design that works on all device screen sizes
- 💬 Real-time chat interface with GPT-4.1-nano
- 🔐 User authentication with Supabase Auth
- 💾 Persistent chat history in Supabase database
- 🗂️ Conversation management
- 🔍 Vector search capabilities with pgvector
- 📁 File storage support
- 🎯 Clean and intuitive user experience
- ⚡ Fast and efficient with Vite
- 🔒 Row Level Security for data protection

## Tech Stack

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **OpenAI SDK** - API integration (GPT-4.1-nano)
- **Supabase** - Backend (Auth, Database, Storage)
- **pgvector** - Vector embeddings for semantic search

## Prerequisites

- Node.js 18+ 
- OpenAI API key
- Supabase account (free tier works)

## Setup Instructions

### 1. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Give it a name and copy the key immediately
4. Keep it secure - you won't see it again!

### 2. Set Up Supabase

**Detailed instructions in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**

Quick steps:
1. Create a project at [app.supabase.com](https://app.supabase.com)
2. Run the SQL schema from `supabase-schema.sql` in SQL Editor
3. Get your Project URL and anon key from Project Settings → API

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your credentials:
   ```env
   VITE_OPENAI_API_KEY=sk-proj-your-openai-key
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
chatbot-app/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── scroll-area.tsx
│   │   └── Chat.tsx      # Main chat component
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx           # Root component
│   ├── index.css         # Global styles with Tailwind
│   └── main.tsx          # App entry point
├── .env                  # Environment variables (create this)
├── .env.example          # Example environment file
├── tailwind.config.js    # Tailwind configuration
├── vite.config.ts        # Vite configuration
└── package.json
```

## Key Features

### Responsive Design
- Mobile-first approach
- Fluid layouts that adapt to any screen size
- Touch-friendly interface
- Optimized typography and spacing for all devices

### Chat Interface
- Real-time message streaming
- Message history
- Loading indicators
- Error handling
- Smooth scrolling

### Model Integration
- Uses GPT-4.1-nano for fast, cost-effective responses
- GitHub Models endpoint for free-tier access
- Proper error handling and user feedback

## GitHub Models Benefits

- **Free to start**: No charge until hitting rate limits
- **Easy setup**: Just need a GitHub Personal Access Token
- **Model switching**: Single endpoint for all models
- **No billing setup required**: Perfect for development and testing

## Model Information

**GPT-4.1-nano**
- Publisher: OpenAI
- Context: 1M input / 33K output tokens
- Cost: $0.175 per 1M tokens (GitHub Models offers free tier)
- Quality Index: 0.6978
- Throughput: 115.82 tokens/second
- Latency: 0.29 seconds to first token
- Best for: Fast responses, coding, instruction following, long-context handling

## Security Notes

⚠️ **Important**: This demo uses `dangerouslyAllowBrowser: true` to call the OpenAI API directly from the browser. For production applications:

1. Create a backend API endpoint to proxy requests
2. Store API keys securely on the server
3. Never expose API keys in client-side code
4. Implement rate limiting and user authentication

## Customization

### Change Theme
Edit the CSS variables in `src/index.css` to customize colors:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... more variables ... */
}
```

### Use a Different Model
In `src/components/Chat.tsx`, change the model:

```typescript
model: 'openai/gpt-4.1-nano', // Change to any supported model
```

Supported models include:
- `openai/gpt-4.1-nano`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1`
- `openai/gpt-4o-mini`
- And many more!

## Troubleshooting

### "API key not found" error
- Make sure you've created the `.env` file
- Verify your GitHub token is correct
- Restart the dev server after adding environment variables

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Clear the cache: `rm -rf node_modules .vite && npm install`

### TypeScript errors
- Make sure all dependencies are installed
- Check that `@/*` path aliases are configured in `tsconfig.app.json` and `vite.config.ts`

## License

MIT

## Contributing

Feel free to submit issues and pull requests!


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
