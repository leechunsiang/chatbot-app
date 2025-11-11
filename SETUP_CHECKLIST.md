# Setup Checklist

Use this checklist to ensure everything is configured correctly.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] Git installed (optional)
- [ ] Code editor (VS Code recommended)

## ✅ OpenAI Setup

- [ ] Created OpenAI account at https://platform.openai.com
- [ ] Generated API key
- [ ] Copied API key (starts with `sk-proj-...`)
- [ ] Have credits/billing set up (check at https://platform.openai.com/account/billing)

## ✅ Supabase Setup

### Create Project
- [ ] Created Supabase account at https://app.supabase.com
- [ ] Created new project
- [ ] Saved database password
- [ ] Waited for project setup to complete (~2 minutes)

### Run Database Schema
- [ ] Opened SQL Editor in Supabase dashboard
- [ ] Created new query
- [ ] Copied contents from `supabase-schema.sql`
- [ ] Pasted into SQL editor
- [ ] Clicked "Run" (or Ctrl+Enter)
- [ ] Saw "Success. No rows returned" message

### Verify Tables
- [ ] Opened Table Editor in Supabase
- [ ] Confirmed `users` table exists
- [ ] Confirmed `conversations` table exists
- [ ] Confirmed `messages` table exists
- [ ] Checked that RLS is enabled on all tables

### Get Credentials
- [ ] Went to Project Settings → API
- [ ] Copied Project URL
- [ ] Copied anon public key

## ✅ Project Configuration

### Environment Variables
- [ ] Opened `.env` file in project root
- [ ] Added `VITE_OPENAI_API_KEY=...`
- [ ] Added `VITE_SUPABASE_URL=...`
- [ ] Added `VITE_SUPABASE_ANON_KEY=...`
- [ ] Saved the file
- [ ] Verified no extra spaces around values

### Dependencies
- [ ] Ran `npm install` in project directory
- [ ] Installation completed without errors
- [ ] All packages installed successfully

## ✅ Testing

### Start App
- [ ] Ran `npm run dev`
- [ ] Dev server started successfully
- [ ] Browser opened to http://localhost:5173
- [ ] No console errors

### Test Authentication
- [ ] Signup form is visible
- [ ] Can create a new account
- [ ] Received confirmation email (if enabled)
- [ ] Can sign in with credentials
- [ ] Can use "Continue as Guest" button

### Test Chat
- [ ] Chat interface loads
- [ ] Can type a message
- [ ] Can send message (click or Enter)
- [ ] AI responds correctly
- [ ] Messages appear in chat
- [ ] Loading indicator shows during AI response

### Test Persistence (if logged in)
- [ ] Sent a few messages
- [ ] Refreshed the page
- [ ] Messages are still there
- [ ] Conversation continues correctly

### Test Responsive Design
- [ ] Opened DevTools (F12)
- [ ] Toggled device toolbar (Ctrl+Shift+M)
- [ ] Tested mobile view (320px)
- [ ] Tested tablet view (768px)
- [ ] Tested desktop view (1920px)
- [ ] UI looks good on all sizes

## ✅ Troubleshooting

If something isn't working:

### API Key Issues
- [ ] Check .env file has correct values
- [ ] Verify no quotes around values in .env
- [ ] Restart dev server after changing .env
- [ ] Check OpenAI API key is active
- [ ] Verify you have OpenAI credits

### Supabase Issues
- [ ] Verify Supabase project is active
- [ ] Check all SQL from schema file ran successfully
- [ ] Confirm RLS policies exist (Table Editor → Policies tab)
- [ ] Try signing out and back in

### Build Issues
- [ ] Delete `node_modules` folder
- [ ] Delete `package-lock.json`
- [ ] Run `npm install` again
- [ ] Restart dev server

### Browser Issues
- [ ] Clear browser cache
- [ ] Try incognito/private window
- [ ] Check browser console for errors (F12)
- [ ] Try different browser

## ✅ Production Deployment (Optional)

### Pre-deployment
- [ ] Tested app thoroughly
- [ ] Built successfully with `npm run build`
- [ ] Previewed build with `npm run preview`
- [ ] No console errors in production build

### Choose Platform
- [ ] Selected hosting platform (Vercel, Netlify, etc.)
- [ ] Connected GitHub repository (optional)
- [ ] Configured build settings

### Configure Environment
- [ ] Added `VITE_OPENAI_API_KEY` to platform
- [ ] Added `VITE_SUPABASE_URL` to platform
- [ ] Added `VITE_SUPABASE_ANON_KEY` to platform

### Post-deployment
- [ ] App deployed successfully
- [ ] Tested on deployment URL
- [ ] Authentication works
- [ ] Chat functionality works
- [ ] Mobile responsiveness works

## 🎉 Success!

If all items are checked, your chatbot is fully set up and working!

### What's Next?

1. **Customize** - Change colors, add features
2. **Monitor** - Check Supabase dashboard for usage
3. **Secure** - Enable email confirmations in production
4. **Scale** - Add more features from PROJECT_DOCS.md
5. **Share** - Show it off!

### Need Help?

- Read `README.md` for detailed documentation
- Check `SUPABASE_SETUP.md` for database help
- Review `PROJECT_DOCS.md` for architecture details
- Check console for error messages
- Verify all environment variables are correct

---

**Happy Chatting! 🤖💬**
