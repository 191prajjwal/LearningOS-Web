# 🚀 LearningOS — Complete Setup Guide

Follow every step exactly. This covers installation, environment setup, and getting API keys.

---

## ✅ STEP 1 — Prerequisites

Make sure you have these installed:

### Node.js (v18 or higher required)

**Check your version:**
```bash
node --version
# Should print v18.x.x or higher
```

**If not installed:**
- Go to https://nodejs.org
- Download the **LTS** version (the one marked "Recommended for Most Users")
- Install it (next → next → finish)
- Restart your terminal, then run `node --version` again

### npm (comes with Node.js)
```bash
npm --version
# Should print 9.x.x or higher
```

---

## ✅ STEP 2 — Extract and Enter the Project

```bash
# Unzip the file
unzip learningos.zip

# Enter the project folder
cd learningos
```

You should see these files:
```
learningos/
├── app/
├── components/
├── db/
├── lib/
├── store/
├── styles/
├── hooks/
├── scripts/
├── public/
├── .env.local
├── .env.example
├── package.json
├── next.config.js
├── tailwind.config.js
├── jsconfig.json
└── README.md
```

---

## ✅ STEP 3 — Configure Environment Variables

The `.env.local` file is already included with default values.

**Open `.env.local`** in any text editor:

```
DB_PATH=./learningos.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For most users, no changes are needed here.** The app will create `learningos.db` automatically.

> ⚠️ If you want the database in a custom location (e.g. a dedicated folder):
> ```
> DB_PATH=./data/learningos.db
> ```

---

## ✅ STEP 4 — Install Dependencies

```bash
npm install
```

This will install ~200MB of packages into `node_modules/`. Takes 1–3 minutes depending on your internet.

**Expected output:**
```
added 487 packages in 45s
```

> If you see errors about `better-sqlite3`, see **Troubleshooting** at the bottom.

---

## ✅ STEP 5 — Initialize Database (Optional)

The database auto-creates on first run, but you can manually initialize it:

```bash
npm run db:init
```

**Expected output:**
```
✅ Database initialized successfully!
   Tables created: profile, settings, subjects, lectures, ...
🚀 Run 'npm run dev' to start the app!
```

---

## ✅ STEP 6 — Start the App

```bash
npm run dev
```

**Expected output:**
```
▲ Next.js 14.2.0
- Local:        http://localhost:3000
- Ready in 2.3s
```

Open your browser and go to: **http://localhost:3000**

You'll see the **Profile Setup Modal** — fill in your name, exam type, and dates.

---

## ✅ STEP 7 — Get AI API Keys (Optional but Recommended)

AI features are **optional**. The app works fully without them. But for AI insights and study planning, you need one API key.

---

### 🔵 Option A — OpenAI API Key

**Step 1: Create an account**
1. Go to https://platform.openai.com
2. Click **Sign Up** (top right)
3. Enter your email and create a password
4. Verify your email

**Step 2: Add payment method**
1. Go to https://platform.openai.com/settings/billing
2. Click **Add payment method**
3. Enter your card details
4. Add a minimum $5 credit (recommended: $10)

> GPT-4o costs ~$0.005 per AI report generation (very cheap)

**Step 3: Create API Key**
1. Go to https://platform.openai.com/api-keys
2. Click **+ Create new secret key**
3. Give it a name like `LearningOS`
4. Click **Create secret key**
5. **COPY THE KEY IMMEDIATELY** — it starts with `sk-...` and you can't see it again
6. Save it somewhere safe (like a password manager)

**Step 4: Add to LearningOS**
- Open the app → **Settings** → **AI Config**
- Select **OpenAI**
- Paste your key
- Select model: **gpt-4o** (recommended)
- Click **Save AI Settings**

**Recommended models:**
| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| `gpt-4o` | Fast | Best | ~$0.005/report |
| `gpt-4-turbo` | Fast | Excellent | ~$0.01/report |
| `gpt-3.5-turbo` | Very fast | Good | ~$0.001/report |

---

### 🟠 Option B — Anthropic Claude API Key

**Step 1: Create an account**
1. Go to https://console.anthropic.com
2. Click **Sign Up**
3. Enter your email, verify it
4. Complete phone verification if prompted

**Step 2: Add credits**
1. Go to https://console.anthropic.com/settings/billing
2. Click **Buy credits**
3. Add minimum $5 credit

> Claude Sonnet costs ~$0.003 per report generation

**Step 3: Create API Key**
1. Go to https://console.anthropic.com/settings/api-keys
2. Click **Create Key**
3. Give it a name like `LearningOS`
4. Click **Create Key**
5. **COPY THE KEY** — it starts with `sk-ant-...`

**Step 4: Add to LearningOS**
- Open the app → **Settings** → **AI Config**
- Select **Claude (Anthropic)**
- Paste your key
- Select model: **claude-sonnet-4-5** (recommended)
- Click **Save AI Settings**

**Recommended models:**
| Model | Speed | Quality | Cost |
|-------|-------|---------|------|
| `claude-opus-4-5` | Slower | Best | ~$0.015/report |
| `claude-sonnet-4-5` | Fast | Excellent | ~$0.003/report |
| `claude-haiku-4-5-20251001` | Very fast | Good | ~$0.0003/report |

---

## ✅ STEP 8 — Generate Your First AI Report

1. Add at least one **course** and a few **lectures**
2. Watch some lecture content (even 1–2 minutes counts)
3. Go to **AI Insights** page
4. Click **Full Analysis Report**
5. Wait 10–30 seconds for the AI to analyze your data
6. Your report appears with sections: Strengths, Weak Areas, Exam Readiness, etc.

---

## 📁 Adding Video Lectures

Since LearningOS uses **local video files**, here's how to add them:

### Step 1: Note your video file paths

**macOS/Linux:**
```
/Users/yourname/Videos/Physics/lecture1.mp4
/Users/yourname/Downloads/chemistry_ch1.mp4
```

**Windows:**
```
C:\Users\yourname\Videos\Physics\lecture1.mp4
C:\Users\yourname\Downloads\chemistry_ch1.mp4
```

**Quick way to find path:**
- **Mac:** Right-click file → Get Info → copy the "Where" path + filename
- **Windows:** Hold Shift + Right-click → Copy as path

### Step 2: Add to the app
1. Go to **Courses** → Open a course
2. Click **Add Lecture**
3. Enter a title
4. Paste the full file path
5. Click **Add**

### Supported formats
`mp4` · `webm` · `ogg` · `mov` · `mkv` · `avi`

---

## 🔧 Troubleshooting

### Error: `better-sqlite3` fails to install

This usually means native build tools are missing.

**On macOS:**
```bash
xcode-select --install
npm install
```

**On Windows:**
```bash
npm install --global windows-build-tools
# OR install Visual Studio Build Tools from:
# https://visualstudio.microsoft.com/visual-cpp-build-tools/
npm install
```

**On Ubuntu/Debian Linux:**
```bash
sudo apt-get install build-essential python3
npm install
```

---

### Error: Port 3000 already in use

```bash
# Run on a different port
npm run dev -- --port 3001
# Then open http://localhost:3001
```

---

### Error: Module not found / import errors

```bash
# Clear Next.js cache and reinstall
rm -rf .next node_modules
npm install
npm run dev
```

---

### Database errors / corrupted DB

```bash
# Delete and recreate the database
rm learningos.db
npm run db:init
npm run dev
```

---

### Video won't play / "No source" error

- Make sure the file path is **absolute** (starts with `/` on Mac/Linux or `C:\` on Windows)
- Check the file actually exists at that path
- Try a different video format (MP4 is most compatible)
- Check browser console (F12) for specific errors

---

### AI reports failing

- Verify your API key is correct (no extra spaces when pasting)
- Check you have credits in your OpenAI/Anthropic account
- Try a cheaper model first (gpt-3.5-turbo or claude-haiku)
- Check browser console for the actual error message

---

## 🛑 Stopping the App

Press `Ctrl + C` in the terminal where `npm run dev` is running.

---

## 🔄 Updating / Restarting

```bash
# Stop the app (Ctrl+C), then restart:
npm run dev
```

---

## 📦 Production Build (Optional)

If you want a faster, production-optimized build:

```bash
npm run build
npm run start
```

---

## 💾 Backup Your Data

Your entire data is in one file: `learningos.db`

```bash
# Backup
cp learningos.db learningos_backup_$(date +%Y%m%d).db

# Restore
cp learningos_backup_20250101.db learningos.db
```

---

## 🆘 Need Help?

1. Check the browser console (F12 → Console) for red error messages
2. Check the terminal where `npm run dev` is running for server errors
3. Delete `.next/` folder and restart: `rm -rf .next && npm run dev`

---

## ✅ Quick Start Checklist

- [ ] Node.js v18+ installed
- [ ] Ran `npm install`
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3000
- [ ] Completed profile setup (name, exam, dates)
- [ ] Added at least one course
- [ ] Added lectures with file paths
- [ ] (Optional) Added AI API key in Settings
- [ ] (Optional) Generated first AI report
