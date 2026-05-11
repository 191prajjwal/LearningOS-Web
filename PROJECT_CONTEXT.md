# LearningOS — Project Context File
> Give this file to an AI assistant when asking for help with features or fixes.
> It explains the full architecture, data flow, and which files to edit for any task.

---

## Tech Stack
- **Framework**: Next.js 14+ (App Router, JavaScript — no TypeScript)
- **Database**: `@libsql/client` (Turso for production, local `file:./learningos.db` for dev)
- **Auth**: Username + 4-digit PIN, stored in localStorage as `los_user: {id, username}`
- **Styling**: Tailwind CSS + custom CSS variables in `styles/globals.css`
- **UI libs**: Framer Motion, Lucide React, Recharts, Sonner (toasts), shadcn/ui (some), React Day Picker
- **State**: React Context (`store/profile-context.js`) for auth/profile/settings

---

## Critical Rules
1. **All DB calls are async** — always `await dbQuery/dbGet/dbRun`
2. **`undefined` crashes libsql** — always use `null` for empty values, never `undefined`
3. **All API routes need** `export const dynamic = "force-dynamic"` at top
4. **Next.js 15 async params** — always `const { id } = await params` in dynamic routes
5. **All fetch calls use `apiFetch`** from `lib/api.js` — it auto-adds `x-user-id` header
6. **All API routes use `requireUserId(req)`** from `lib/auth.js` to get userId
7. **No better-sqlite3** — project uses `@libsql/client` only

---

## Authentication Flow
```
User opens app
  → AppShell checks: if (!user) → show AuthScreen
  → AuthScreen: POST /api/auth {username, pin, action:"login"|"signup"}
  → On success: localStorage.setItem("los_user", {id, username})
  → loadProfile(user) fetches /api/profile with x-user-id header
  → ProfileSetupModal shows if profile.name is empty (new users)
```

**Files involved**: `components/ui/AuthScreen.js`, `store/profile-context.js`, `app/api/auth/route.js`, `components/layout/AppShell.js`

---

## Data Flow: Every API Request
```
Page/Component
  → apiFetch("/api/...", options)     ← lib/api.js (adds x-user-id header from localStorage)
  → API Route receives req
  → const userId = requireUserId(req) ← lib/auth.js (reads x-user-id header)
  → queriesQ.someMethod(userId, ...)  ← db/queries.js (all queries scoped by userId)
  → dbRun/dbGet/dbQuery(sql, params)  ← db/client.js (safeParams: undefined→null)
  → @libsql/client executes SQL
```

---

## File Map

### Database
| File | Purpose |
|------|---------|
| `db/schema.js` | All CREATE TABLE statements. Every table has `user_id`. |
| `db/client.js` | libsql connection, `initDb()`, `dbQuery/dbGet/dbRun`. Converts `undefined→null`. |
| `db/queries.js` | All query functions. Every function takes `userId` as first or second arg. |

### Auth & API Helpers
| File | Purpose |
|------|---------|
| `lib/auth.js` | `requireUserId(req)` — reads x-user-id header, throws "UNAUTHORIZED" if missing |
| `lib/api.js` | `apiFetch(url, options)` — wrapper around fetch that adds x-user-id from localStorage |

### Store / Context
| File | Purpose |
|------|---------|
| `store/profile-context.js` | Auth state (user, login, logout), profile, settings. Provides `updateProfile`, `updateSettings`. |

### Layout
| File | Purpose |
|------|---------|
| `components/layout/AppShell.js` | Sidebar nav + auth gate. Shows AuthScreen if no user. Has logout button. |
| `app/layout.js` | Root layout — wraps everything in ProfileProvider + Toaster |

### API Routes
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth` | POST | Login / Signup |
| `/api/profile` | GET, PUT | Get/update profile + settings |
| `/api/profile/settings` | GET, PUT | Get/update settings only |
| `/api/courses` | GET, POST | List subjects / Create subject |
| `/api/courses/[id]` | GET, PUT, DELETE | Get course detail / Update / Delete subject |
| `/api/courses/[id]/lectures` | GET, POST | List lectures / Add lecture |
| `/api/courses/[id]/syllabus` | POST | Add syllabus item |
| `/api/courses/[id]/syllabus/[syllabusId]` | DELETE | Delete syllabus item |
| `/api/courses/[id]/syllabus/[syllabusId]/toggle` | POST | Toggle syllabus item complete |
| `/api/syllabus/subject/[id]` | DELETE | **Safe delete** — nullifies refs, does NOT cascade to courses |
| `/api/db` | GET, POST, DELETE | Unified endpoint for streak, tasks, goals, links, dates, tests, notes, watch |
| `/api/ai/generate` | POST | Generate full AI report (insights or planner) |
| `/api/ai/ask` | POST | Ask a custom question to AI |
| `/api/ai/reports` | GET | List AI reports |
| `/api/ai/reports/[id]` | GET, DELETE | Get / delete AI report |
| `/api/video` | GET | Stream local video file (fallback for non-blob-url videos) |

### Pages
| Page | Route | Files |
|------|-------|-------|
| Dashboard | `/dashboard` | `app/dashboard/page.js` |
| Courses | `/courses` | `app/courses/page.js` |
| Course detail | `/courses/[id]` | `app/courses/[id]/page.js` |
| Watch lecture | `/courses/[id]/watch/[lectureId]` | `app/courses/[id]/watch/[lectureId]/page.js` |
| Planner | `/planner` | `app/planner/page.js` |
| Tests | `/tests` | `app/tests/page.js` |
| Analytics | `/analytics` | `app/analytics/page.js` |
| AI Insights | `/ai` | `app/ai/page.js` |
| Syllabus | `/syllabus` | `app/syllabus/page.js` |
| Settings | `/settings` | `app/settings/page.js` |

### Key Components
| Component | Purpose |
|-----------|---------|
| `components/layout/AppShell.js` | Sidebar + auth gate |
| `components/ui/AuthScreen.js` | Login/signup UI |
| `components/ui/ProfileSetupModal.js` | First-time profile setup |
| `components/ui/FolderImport.js` | Import video folder (File System Access API) |
| `components/video/VideoPlayer.js` | Video player with blob URL + API fallback |
| `components/study/NotesPanel.js` | Notes panel for course/lecture |
| `components/study/SyllabusPanel.js` | Syllabus checklist inside course |

---

## Database Schema Summary

Every table (except `users`) has `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`.

| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | id, username, pin_hash | Auth |
| `profile` | user_id, name, exam_type, exam_branch, exam_date, ai_remark | One per user |
| `settings` | user_id, key, value | Key-value store per user |
| `subjects` | user_id, name, color, weightage, syllabus_pdf, description | Syllabus subjects |
| `lectures` | user_id, subject_id, title, file_path, order_index, is_completed | Videos in courses |
| `watch_sessions` | user_id, lecture_id, subject_id, date, duration | Study time tracking |
| `tasks` | user_id, subject_id, date, title, priority, type | Planner tasks |
| `goals` | user_id, subject_id, title, type, target_value, unit, due_date | Planner goals |
| `links` | user_id, subject_id, title, url, is_pinned | Planner links |
| `important_dates` | user_id, title, date, type, description | Planner dates |
| `tests` | user_id, subject_name, total_marks, obtained_marks, is_completed | Mock tests |
| `test_subjects` | user_id, test_id, subject_id, marks breakdown | Per-subject test data |
| `notes` | user_id, subject_id, lecture_id, content, is_pinned | Notes |
| `study_streak` | user_id, date, minutes, goal_met | UNIQUE(user_id, date) |
| `ai_reports` | user_id, title, type, content, model, provider | Saved AI reports |
| `syllabus` | user_id, subject_id, chapter, topic, is_completed | Course syllabus topics |

---

## Settings System
Settings are stored as key-value in the `settings` table.

Key settings:
- `aiProvider`: `"openrouter" | "openai" | "claude" | "gemini" | "none"`
- `aiKey_openrouter`, `aiKey_openai`, `aiKey_claude`, `aiKey_gemini`: per-provider API keys
- `aiModel`: selected model string
- `theme`: `"dark" | "light"`
- `videosBasePath`: base path for video files
- `streakGoal`: daily study goal in minutes
- `autoplay`, `resumePlayback`, `defaultSpeed`: video settings

Accessed in context via `settings.someKey`. Updated via `updateSettings({key: value})`.

---

## AI System
- **AI Config**: Settings → AI tab → Free (OpenRouter) or Other APIs
- **Per-provider keys**: `aiKey_openrouter`, `aiKey_openai` etc. (not a single `aiApiKey`)
- **Generate report**: POST `/api/ai/generate` with `{type: "insights"|"planner"}`
- **Ask question**: POST `/api/ai/ask` with `{question: "..."}`
- **OpenRouter fallbacks**: If selected model fails, tries `openrouter/auto`, then free models
- **ai_remark**: Profile field — personal note sent to every AI query as system prompt context
- **Data sent to AI**: watch time, test scores, lecture completion, syllabus progress, subject weightage

---

## Video System
- **Primary**: File System Access API (`window.showDirectoryPicker`) → blob URLs in `lib/folder-store.js`
- **Fallback**: `/api/video?path=...` for absolute file paths
- **Import**: `components/ui/FolderImport.js` — picks folder, shows preview, saves filenames to DB
- **Per-session**: User must "Reconnect folder" after page reload (browser security)

---

## Common Tasks → Files to Edit

**Add a new page:**
1. Create `app/yourpage/layout.js` (wraps in AppShell)
2. Create `app/yourpage/page.js`
3. Add to NAV array in `components/layout/AppShell.js`

**Add a new DB table:**
1. Add CREATE TABLE to `db/schema.js`
2. Add query functions to `db/queries.js` (all take userId)
3. Add API route in `app/api/`
4. Use `apiFetch` in frontend

**Add a new API endpoint:**
1. Create file in `app/api/your-route/route.js`
2. Add `export const dynamic = "force-dynamic"` at top
3. Use `const userId = requireUserId(req)` for auth
4. Use `const { id } = await params` for dynamic routes
5. Pass `userId` to all query functions

**Fix a 500 error:**
- Check terminal for actual error (not browser console)
- Common causes: `undefined` passed to DB (use `null`), missing `await params`, missing `userId`

**Add field to profile:**
1. Add column to `profile` table in `db/schema.js`
2. Add to `DEFAULT_SETTINGS` or profile form in `app/settings/page.js`
3. Update `profileForm` state and `useEffect` in settings page

**Change AI prompts:**
- Edit `lib/ai-client.js` — `buildSystemPrompt`, `buildInsightsPrompt`, `buildPlannerPrompt`

---

## Deployment
- **Local dev**: `npm install && npm run dev` — uses `file:./learningos.db`
- **Vercel**: Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` env vars (see DEPLOY.md)
- **Test suite**: `node test.js` — checks all files, features, config

---

## Known Gotchas
1. `@libsql/client` returns `BigInt` for `lastInsertRowid` — wrapped with `Number()` in `db/client.js`
2. `@libsql/client` rejects `undefined` params — converted to `null` in `dbQuery/dbGet/dbRun`
3. Next.js 15 made `params` async — always `const { id } = await params` in API routes
4. `apiFetch` reads userId from localStorage on every call — no stale closure issues
5. Profile context `loadProfile` takes `currentUser` arg — avoids stale state after login
6. `showSetup` (ProfileSetupModal) only triggers after login, not on API errors
7. PDF stored as base64 data URL in `subjects.syllabus_pdf` — max 10MB
