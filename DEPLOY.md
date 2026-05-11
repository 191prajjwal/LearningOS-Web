# Deploy LearningOS to Vercel (free)

## 1. Set up Turso database (free)
1. Sign up at https://turso.tech
2. Create database: "Create Database" → name it `learningos`  
3. Copy the URL (starts with `libsql://`)
4. Click "Generate Token" → copy it

## 2. Deploy to Vercel
1. Push code to GitHub
2. Go to vercel.com → New Project → Import repo
3. Add Environment Variables:
   - `TURSO_DATABASE_URL` = your Turso URL
   - `TURSO_AUTH_TOKEN` = your token
4. Deploy and share the link!

## Each friend
- Opens your Vercel link
- Clicks "Create Account", enters username + 4-digit PIN
- Their data is 100% private and separate

## Local development (no Turso needed)
```bash
npm install
npm run dev
```
Uses `./learningos.db` automatically.
