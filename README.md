# 🎓 LearningOS — AI-Powered Personal Learning Platform

A full-featured, local-first personal learning OS built with Next.js 14 App Router.  
Watch lectures, track progress, plan studies, analyze tests, and receive AI-powered insights — all from your local machine.

---

## ✨ Features

### 🎬 Video Player
- Play/Pause with spacebar toggle
- 10-second skip forward/backward (arrow keys)
- Playback speed control (0.5× – 2.5×)
- Volume control with keyboard
- Fullscreen & Picture-in-Picture
- Timeline scrubbing with seek preview
- Next/Previous lecture navigation
- Autoplay next lecture on completion
- Resume from last position
- Watch session tracking (time, pauses, speed)

### 📚 Course Management
- Create subjects/courses with custom colors
- Add lectures with local file paths
- Track lecture completion automatically (90%+ watched = complete)
- Syllabus manager with chapter/topic tracking and weightage
- Per-lecture and per-subject notes with timestamps
- Concept tagging

### 📅 Study Planner
- Daily task planner with priorities and time slots
- Goal tracker (daily, weekly, custom)
- Important dates calendar (exams, deadlines, revisions)
- Important links library organized by subject
- react-day-picker calendar integration

### 🧪 Test System
- Log full mocks, chapter tests, previous year papers
- Enter detailed results: marks, correct/incorrect/unattempted
- Subject-wise breakdown with mistake categorization (silly, conceptual, time pressure)
- Test analytics with score trends, accuracy charts, radar charts

### 📊 Analytics
- Daily study time area chart
- Subject distribution pie chart
- Lecture completion bar chart
- Subject performance radar chart
- Syllabus progress bars
- Study activity heatmap (GitHub-style)
- Exam countdown with progress ring
- Full test history table

### 🤖 AI Insights (Optional)
- Full analysis report: strengths, weaknesses, exam readiness score
- AI Study Planner: daily schedule, revision strategy, mock test frequency
- Supports OpenAI (GPT-4o, GPT-3.5) and Anthropic Claude
- Export reports as TXT, Markdown, or PDF
- All reports stored locally in SQLite

### 🔥 Study Streak
- Automatic streak tracking from watch sessions
- Daily goal (configurable, default 30 min)
- Activity heatmap visualization

### 🧮 Calculator
- Embedded scientific calculator
- sin, cos, tan, log, ln, √, powers
- DEG/RAD toggle
- Keyboard input support
- Calculation history

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# 1. Clone or copy files into a new Next.js project
npx create-next-app@latest learningos --js --app --no-tailwind --no-eslint
cd learningos

# 2. Copy all project files into the directory

# 3. Install dependencies
npm install

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the Profile Setup modal on first launch.

---

## 🗂️ Project Structure

```
learningos/
├── app/                        # Next.js App Router
│   ├── layout.js               # Root layout with providers
│   ├── page.js                 # Redirects to /dashboard
│   ├── dashboard/              # Main dashboard
│   ├── courses/                # Course browser + subject pages
│   │   └── [id]/
│   │       └── watch/[lectureId]/  # Video player
│   ├── planner/                # Daily planner, goals, dates, links
│   ├── tests/                  # Test logging and analytics
│   ├── analytics/              # Full analytics dashboard
│   ├── ai/                     # AI insights and reports
│   ├── settings/               # Profile, AI config, app preferences
│   └── api/                    # API routes
│       ├── profile/            # Profile CRUD
│       ├── courses/            # Subject + lecture CRUD
│       ├── db/                 # Generic DB query endpoint
│       └── ai/                 # AI generation + report storage
│
├── components/
│   ├── layout/
│   │   └── AppShell.js         # Sidebar + main layout
│   ├── video/
│   │   ├── VideoPlayer.js      # Full video player
│   │   └── VideoNotes.js       # Timestamped notes panel
│   ├── study/
│   │   ├── SyllabusPanel.js    # Syllabus manager
│   │   └── NotesPanel.js       # General notes
│   ├── charts/
│   │   ├── StudyHeatmap.js     # GitHub-style heatmap
│   │   └── ProgressRing.js     # SVG progress ring
│   └── ui/
│       ├── ProfileSetupModal.js # First-launch modal
│       └── Calculator.js        # Scientific calculator
│
├── db/
│   ├── schema.js               # SQLite table definitions
│   ├── client.js               # Database connection singleton
│   └── queries.js              # All query functions
│
├── lib/
│   ├── utils.js                # Shared utilities
│   ├── constants.js            # App constants
│   └── ai-client.js            # OpenAI + Claude API wrapper
│
├── store/
│   └── profile-context.js      # React Context for profile + settings
│
├── styles/
│   └── globals.css             # Tailwind + custom theme variables
│
├── next.config.js
├── postcss.config.js
├── package.json
├── README.md
└── project-context.md
```

---

## 🤖 AI Setup

1. Go to **Settings → AI Config**
2. Select your provider: **OpenAI** or **Claude (Anthropic)**
3. Paste your API key
4. Select a model (GPT-4o recommended for best results)
5. Save, then go to **AI Insights** to generate reports

**Supported Models:**
- OpenAI: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Claude: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5-20251001`

> Your API key is stored **only in your local SQLite database** and is never transmitted to any server other than the AI provider's official API.

---

## 🎬 Adding Lectures

Since this is a local app, video files are referenced by **absolute file path**:

1. Open a course → click **Add Lecture**
2. Enter the lecture title
3. Enter the **full path** to your video file, e.g.:
   - macOS/Linux: `/Users/yourname/Videos/Physics/lecture1.mp4`
   - Windows: `C:\Users\yourname\Videos\Physics\lecture1.mp4`
4. The video player uses `file://` protocol to load local files

**Supported formats:** MP4, WebM, OGG, MOV, MKV, AVI

---

## ⌨️ Keyboard Shortcuts (Video Player)

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `→` | Skip forward 10s |
| `←` | Skip backward 10s |
| `↑` | Volume up |
| `↓` | Volume down |
| `M` | Toggle mute |
| `F` | Toggle fullscreen |
| `N` | Toggle notes panel |

---

## 🗄️ Database

LearningOS uses **SQLite** via `better-sqlite3` for zero-config local storage.

- Database file: `learningos.db` (created in project root on first run)
- All data is local — no cloud sync, no accounts
- To reset: delete `learningos.db` and restart

---

## 🔧 Environment Variables (Optional)

Create a `.env.local` file:

```env
# Custom database path (default: ./learningos.db)
DB_PATH=./data/learningos.db
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `next@14` | App Router framework |
| `better-sqlite3` | Local SQLite database |
| `framer-motion` | Animations |
| `recharts` | Analytics charts |
| `react-day-picker` | Calendar |
| `sonner` | Toast notifications |
| `zustand` | State management |
| `date-fns` | Date utilities |
| `jspdf` | PDF export |
| `openai` | OpenAI API client |
| `@anthropic-ai/sdk` | Claude API client |

---

## 🛠️ Development

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
```

---

## 📝 License

MIT — use freely for personal learning.
