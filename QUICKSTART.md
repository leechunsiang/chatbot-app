# Quick Start Guide

## Get Started in 3 Steps!

### Step 1: Get Your GitHub Token
1. Visit https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it (e.g., "Chatbot App")
4. Click "Generate token"
5. Copy the token immediately (you won't see it again!)

### Step 2: Add Your Token
1. Open the `.env` file in this folder
2. Replace the empty value with your token:
   ```
   VITE_GITHUB_TOKEN=ghp_your_token_here
   ```
3. Save the file

### Step 3: Run the App
```bash
npm run dev
```

That's it! Open http://localhost:5173 and start chatting! 🎉

## Need Help?

### The app won't start
- Make sure you ran `npm install` first
- Check that Node.js 18+ is installed: `node --version`

### API errors
- Verify your GitHub token is correct in `.env`
- Restart the dev server after changing `.env`
- Make sure there are no extra spaces around your token

### Still stuck?
Check the full README.md for detailed troubleshooting.
