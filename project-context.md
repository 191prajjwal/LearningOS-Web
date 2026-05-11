# LearningOS — Project Context & Architecture

This document explains component relationships, data flow, and the AI analytics pipeline for developers working on this codebase.

---

## 🏗️ Architecture Overview

```
Browser (React Client)
    │
    ├── store/profile-context.js     ← Global state: profile + settings
    │       │
    │       └── Fetches from /api/profile on mount
    │
    ├── components/layout/AppShell   ← Persistent sidebar layout
    │       │
    │       └── Reads from profile-context, fetches streak
    │
    └── Pages (app/*)
            │
            └── Call /api/* routes (Next.js API handlers)
                        │
                        └── db/queries.js (SQLite via better-sqlite3)
                                    │
                                    └── learningos.db (local file)
```

---

## 🔗 Component Relationships

### Layout Hierarchy
```
app/layout.js
  └── ProfileProvider (store/profile-context.js)
      └── AppShell (components/layout/AppShell.js)
          ├── Sidebar (nav + streak + profile)
          └── {children} — page content
              │
              ├── ProfileSetupModal  ← only when profile.name is empty
              └── Toaster (sonner)
```

### Course/Lecture Flow
```
/courses                     → CoursesPage
  └── /courses/[id]          → CoursePage
      ├── SyllabusPanel      → fetches /api/courses/[id]
      ├── NotesPanel         → fetches /api/db?q=notes
      └── /courses/[id]/watch/[lectureId]
          └── VideoPlayer
              ├── VideoNotes     → fetches /api/db?q=notes
              └── POSTs watch sessions → /api/db?q=watch-session
```

### Data Write Paths
```
VideoPlayer → onEnded / interval → POST /api/db?q=watch-session
    → watchQ.create()
    → lecturesQ.incrementWatch()
    → lecturesQ.markComplete() (if ≥90%)
    → subjectsQ.updateProgress()
    → streakQ.upsertToday()
```

---

## 📊 Data Flow

### Profile Context
`ProfileProvider` fetches `/api/profile` on mount and exposes:
- `profile` — name, exam_type, start_date, exam_date
- `settings` — AI provider, API key, model, playback prefs
- `countdown` — computed: daysRemaining, progressPct
- `showSetup` — triggers ProfileSetupModal
- `updateProfile(data)` — PUT /api/profile
- `updateSettings(data)` — PUT /api/profile/settings

### Watch Session Lifecycle
1. User opens VideoPlayer → loads lecture from `/api/courses/[id]`
2. Video plays → `sessionStartRef` is set, position tracked
3. Every 60 seconds → `saveWatchSession()` called (background)
4. On video end / page unload → final session saved
5. Session includes: duration (minutes), start/end position, speed, pause count
6. API route computes `position_pct` and marks lecture complete if ≥90%

### Streak Tracking
- `streakQ.upsertToday(minutes, goalMinutes)` — called after every watch session save
- `streakQ.getCurrentStreak()` — walks backward from today, counting consecutive goal-met days
- Dashboard sidebar reads streak from `/api/db?q=streak`

### Test Data Flow
```
TestsPage → Create test (POST /api/db?q=test)
         → Enter results (POST /api/db?q=test-complete)
             → testsQ.complete()       — sets scores
             → testsQ.addSubject()     — per-subject breakdown (optional)
         → Analytics tab reads /api/db?q=test-analytics
             → testsQ.getAnalytics()   — aggregate stats
```

---

## 🤖 AI Analytics Pipeline

### Architecture
```
AI Page
  └── Clicks "Generate Report"
      │
      ├── POST /api/ai/generate  { type: "insights" | "planner" }
      │
      └── Server-side (api/ai/generate/route.js):
          │
          ├── 1. Load settings (provider, apiKey, model)
          ├── 2. analyticsQ.getSnapshot()     ← aggregates all study data
          ├── 3. profileQ.get()               ← name, exam, dates
          ├── 4. buildSystemPrompt(profile)   ← persona + tone
          ├── 5. buildInsightsPrompt() or buildPlannerPrompt()
          ├── 6. callAI({ provider, apiKey, model, ... })
          │       ├── callOpenAI() → OpenAI Chat Completions API
          │       └── callClaude() → Anthropic Messages API
          ├── 7. aiReportsQ.create()          ← store in SQLite
          └── 8. Return report to client
```

### Analytics Snapshot (`analyticsQ.getSnapshot()`)
The snapshot passed to AI contains:

| Field | Source | Description |
|-------|--------|-------------|
| `watchBySubject` | watch_sessions JOIN subjects | Total minutes per subject |
| `testStats` | tests (last 20) | Score%, correct/wrong/skipped per test |
| `testSubjectBreakdown` | test_subjects JOIN subjects | Avg score + mistake types per subject |
| `lectureCompletion` | lectures JOIN subjects | Completed vs total per subject |
| `streak` | study_streak | Days with goal met + total minutes (30d) |
| `syllabusProgress` | syllabus JOIN subjects | Completed vs total topics per subject |

### Prompt Engineering
- **System prompt** — sets AI persona as academic coach for the specific exam
- **Insights prompt** — structured data dump + 8 required output sections
- **Planner prompt** — includes days remaining, current progress + 6 required sections
- Both prompts enforce structured output with `###` headers for reliable parsing

### Report Storage
Reports saved to `ai_reports` table with:
- Full markdown content
- Provider + model used
- Data snapshot (JSON) for reference
- Timestamp

### Export Pipeline
```
User clicks Export
  ├── TXT  → Blob("text/plain") → download link
  ├── MD   → Blob("text/markdown") → download link
  └── PDF  → Dynamic import jsPDF
              → Parse markdown content (strip # * ` chars)
              → Paginate with y-position tracking
              → Save as .pdf
```

---

## 🗄️ Database Schema Relationships

```
subjects (1)──(many) lectures
subjects (1)──(many) watch_sessions
subjects (1)──(many) notes
subjects (1)──(many) syllabus
subjects (1)──(many) tasks
subjects (1)──(many) goals

lectures (1)──(many) watch_sessions
lectures (1)──(many) notes

tests (1)──(many) test_subjects
test_subjects (many)──(1) subjects
```

### Key Design Decisions
- `watch_sessions` stores **minutes** (not seconds) for easier aggregation
- `study_streak` has one row per day (`UNIQUE` on date) — upserted after every session
- `lectures.last_position` updated on every watch session for resume support
- `lectures.is_completed` set automatically when `position_pct >= 90`
- `subjects.completed_lectures` and `total_lectures` are denormalized counters updated by `subjectsQ.updateProgress()`

---

## 🔌 API Route Map

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/profile` | GET, PUT | Profile CRUD |
| `/api/profile/settings` | GET, PUT | Settings CRUD |
| `/api/courses` | GET, POST | List/create subjects |
| `/api/courses/[id]` | GET, PUT, DELETE | Subject detail/edit/delete |
| `/api/courses/[id]/lectures` | GET, POST | Lecture list/add |
| `/api/courses/[id]/syllabus` | POST | Add syllabus item |
| `/api/courses/[id]/syllabus/[sid]` | DELETE | Remove syllabus item |
| `/api/courses/[id]/syllabus/[sid]/toggle` | POST | Toggle complete |
| `/api/db?q=*` | GET | Read-only queries (streak, tests, tasks, etc.) |
| `/api/db?q=*` | POST | Mutations (watch-session, task, test, note, etc.) |
| `/api/db?q=*` | DELETE | Deletions (note, link, date, task, goal, test) |
| `/api/ai/generate` | POST | Generate AI report |
| `/api/ai/reports` | GET | List all AI reports |
| `/api/ai/reports/[id]` | GET, DELETE | Get/delete specific report |

### `/api/db` Query Keys

**GET queries:**
- `streak` — current streak count
- `streak-history` — last 60 days of streak data
- `watch-today` — total minutes today
- `watch-daily` — last 30 days daily totals
- `watch-subjects` — last 30 days by subject
- `test-analytics` — aggregate test stats
- `tests` — all tests
- `goals` — all goals
- `notes` — all notes
- `links` — all links
- `dates` — all important dates
- `tasks?date=YYYY-MM-DD` — tasks for a day
- `analytics-snapshot` — full AI data snapshot
- `dashboard` — combined dashboard data

**POST mutations:**
- `watch-session` — log a watch session
- `goal`, `goal-toggle` — goal operations
- `note` — create note
- `link` — create link
- `date` — create important date
- `task`, `task-toggle` — task operations
- `test`, `test-complete` — test operations

---

## 🎨 Design System

All theming done via CSS variables in `styles/globals.css`:

```
--bg-base         → #08080c  (page background)
--bg-surface      → #0e0e14  (sidebar)
--bg-elevated     → #14141e  (cards, hover states)
--bg-card         → #12121a  (stat cards)

--text-primary    → rgb(240,240,255)
--text-secondary  → rgb(155,155,185)
--text-muted      → rgb(90,90,120)

--accent          → rgb(99,102,241)   (indigo-500)
--accent-light    → rgb(129,140,248)  (indigo-400)
```

**Fonts:**
- Display/headings: `Syne` (Google Fonts)
- Body text: `DM Sans` (Google Fonts)
- Monospace/numbers: `JetBrains Mono` (Google Fonts)

---

## 🔒 Security Notes

1. **API keys** are stored in the local SQLite database under `settings` table (key: `aiApiKey`). They are only transmitted to the respective AI provider API, never to any other server.
2. **Video files** are loaded via `file://` protocol directly in the browser. No files are uploaded.
3. **No authentication** — this is a local-only app. Don't expose port 3000 publicly.
4. The `callAI` function runs **server-side only** (API route), so API keys are never exposed to the client bundle.

---

## 🧪 Extending the App

### Adding a new subject
```js
POST /api/courses
{ name: "Chemistry", color: "#22c55e", description: "..." }
```

### Adding a custom AI prompt type
1. Add new `case` in `app/api/ai/generate/route.js`
2. Create new prompt builder in `lib/ai-client.js`
3. Add UI button in `app/ai/page.js`

### Adding a new chart
1. Import from `recharts`
2. Fetch data via `/api/db?q=analytics-snapshot`
3. Add to `app/analytics/page.js`

### Customizing streak goal
Settings → App Settings → "Daily Streak Goal (minutes)"
Or programmatically: `PUT /api/profile/settings { streakGoal: 60 }`
