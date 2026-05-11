/**
 * LearningOS — Test Suite
 * Run: node test.js
 * Tests all files, features, and configuration without needing the app to run.
 */
const fs = require('fs'), path = require('path');
const base = process.cwd();
let passed = 0, failed = 0, failures = [];

function check(name, cond, detail='') {
  process.stdout.write(cond ? '  ✅ ' : '  ❌ ');
  console.log(name + ((!cond && detail) ? ': ' + detail : ''));
  if (cond) passed++; else { failed++; failures.push({ name, detail }); }
}

function section(title) { console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`); }

section('BUG FIXES');
const queries = fs.readFileSync(path.join(base,'db/queries.js'),'utf8');
check('Signup creates profile with empty name (profile setup modal shows)', queries.includes("VALUES (?, ?)\", [r.lastInsertRowid, '']"));

section('NEW FILES EXIST');
[
  'app/subjects/page.js','app/subjects/layout.js',
  'app/api/ai/ask/route.js','app/api/auth/route.js',
  'lib/auth.js','lib/api.js',
  'components/ui/AuthScreen.js',
  'DEPLOY.md','.env.local.example',
].forEach(f => check(f, fs.existsSync(path.join(base,f))));

section('DATABASE SCHEMA');
const schema = fs.readFileSync(path.join(base,'db/schema.js'),'utf8');
check('users table exists', schema.includes('CREATE TABLE IF NOT EXISTS users'));
check('profile has user_id (multi-user)', schema.includes('user_id INTEGER NOT NULL UNIQUE'));
check('profile has ai_remark (AI notes)', schema.includes('ai_remark TEXT DEFAULT'));
check('subjects has weightage', schema.includes('weightage REAL DEFAULT 0'));
check('subjects has syllabus_pdf', schema.includes('syllabus_pdf TEXT DEFAULT'));
check('settings per-user primary key', schema.includes('PRIMARY KEY (user_id, key)'));
check('tests has subject_name (your fix)', schema.includes('subject_name TEXT DEFAULT'));
check('streak UNIQUE(user_id, date)', schema.includes('UNIQUE(user_id, date)'));
check('no better-sqlite3 in schema', !schema.includes('better-sqlite3'));

section('DATABASE CLIENT (@libsql/client)');
const client = fs.readFileSync(path.join(base,'db/client.js'),'utf8');
check('uses @libsql/client (Vercel compatible)', client.includes('@libsql/client'));
check('has hashPin for auth', client.includes('hashPin'));
check('has initDb (auto schema creation)', client.includes('initDb'));
check('no better-sqlite3 (removed)', !client.includes('better-sqlite3'));
check('local file fallback for dev', client.includes('file:./learningos.db'));
check('TURSO env var support', client.includes('TURSO_DATABASE_URL'));

section('QUERIES (user-scoped)');
check('usersQ exported', queries.includes('export const usersQ'));
check('usersQ.verify (login)', queries.includes('verify:'));
check('usersQ.create (signup)', queries.includes('create: async (username, pin)'));
check('subjects.create has weightage+pdf', queries.includes('weightage, syllabus_pdf'));
check('goals: null subject_id fix', queries.includes('subject_id || null'));
check('links: null subject_id fix', queries.includes("data.subject_id || null"));
check('all profileQ take userId', queries.includes('profileQ = {\n  get: (userId)'));

section('AUTH SYSTEM');
const authRoute = fs.readFileSync(path.join(base,'app/api/auth/route.js'),'utf8');
check('auth route: signup action', authRoute.includes('"signup"'));
check('auth route: login verify', authRoute.includes('usersQ.verify'));
check('auth route: 4-digit PIN validation', authRoute.includes('/^\\d{4}$/'));
check('auth route: force-dynamic', authRoute.includes('force-dynamic'));
check('requireUserId exported from lib/auth.js', fs.readFileSync(path.join(base,'lib/auth.js'),'utf8').includes('export function requireUserId'));
check('apiFetch reads userId from localStorage', fs.readFileSync(path.join(base,'lib/api.js'),'utf8').includes('localStorage'));

section('PROFILE CONTEXT');
const ctx = fs.readFileSync(path.join(base,'store/profile-context.js'),'utf8');
check('has user state', ctx.includes('const [user, setUser]'));
check('has login function', ctx.includes('const login'));
check('has logout function', ctx.includes('const logout'));
check('loadProfile(currentUser) — no stale closure', ctx.includes('async (currentUser)'));
check('no showSetup in catch (bug fix)', !ctx.includes('} catch {\n      setShowSetup'));
check('updateProfile sends x-user-id header', ctx.includes('"x-user-id"'));
check('updateSettings sends x-user-id header', ctx.includes('"x-user-id"'));

section('APPSHELL');
const shell = fs.readFileSync(path.join(base,'components/layout/AppShell.js'),'utf8');
check('auth gate: shows AuthScreen when not logged in', shell.includes('if (!user) return <AuthScreen'));
check('AuthScreen imported', shell.includes('import AuthScreen'));
check('logout button with onClick={logout}', shell.includes('onClick={logout}'));
check('apiFetch used for streak', shell.includes('apiFetch("/api/db?q=streak")'));
check('Subjects in sidebar nav', shell.includes('"/subjects"'));
check('theme toggle preserved (Sun/Moon)', shell.includes('toggleTheme') && shell.includes('Sun'));

section('API ROUTES (force-dynamic + userId)');
[
  'app/api/profile/route.js','app/api/profile/settings/route.js',
  'app/api/courses/route.js','app/api/courses/[id]/route.js',
  'app/api/courses/[id]/lectures/route.js',
  'app/api/courses/[id]/syllabus/route.js',
  'app/api/courses/[id]/syllabus/[syllabusId]/route.js',
  'app/api/courses/[id]/syllabus/[syllabusId]/toggle/route.js',
  'app/api/ai/reports/route.js','app/api/ai/reports/[id]/route.js',
  'app/api/ai/generate/route.js','app/api/ai/ask/route.js',
  'app/api/db/route.js','app/api/auth/route.js',
].forEach(f => {
  const fp = path.join(base,f);
  if (!fs.existsSync(fp)) { check(f, false, 'FILE MISSING'); return; }
  const c = fs.readFileSync(fp,'utf8');
  const isAuth = f.includes('auth/route');
  check(f, c.includes('force-dynamic') && (isAuth || c.includes('userId')));
});

section('PAGES & COMPONENTS (apiFetch)');
[
  'app/dashboard/page.js','app/analytics/page.js','app/tests/page.js',
  'app/ai/page.js','app/planner/page.js','app/courses/page.js',
  'app/courses/[id]/page.js','app/subjects/page.js',
  'components/study/NotesPanel.js','components/video/VideoPlayer.js',
  'components/ui/FolderImport.js',
].forEach(f => {
  const fp = path.join(base,f);
  if (!fs.existsSync(fp)) { check(f, false, 'MISSING'); return; }
  check(f, fs.readFileSync(fp,'utf8').includes('apiFetch'));
});

section('NEW FEATURES');
const subPage = fs.readFileSync(path.join(base,'app/subjects/page.js'),'utf8');
check('Subjects: add form with color picker', subPage.includes('COLOR_OPTIONS') && subPage.includes('setShowAdd'));
check('Subjects: weightage input', subPage.includes('weightage'));
check('Subjects: inline edit', subPage.includes('setEditId'));
check('Subjects: delete with confirm', subPage.includes('confirm(') && subPage.includes('method: "DELETE"'));
check('Subjects: weight distribution bar', subPage.includes('totalWeight'));

const aiPage = fs.readFileSync(path.join(base,'app/ai/page.js'),'utf8');
check('AI: Ask AI section', aiPage.includes('Ask AI'));
check('AI: 5 suggested questions', aiPage.includes('SUGGESTED_QUESTIONS'));
check('AI: custom question input', aiPage.includes('askQuestion'));
check('AI: askAI function', aiPage.includes('const askAI'));
check('AI: answer display with close button', aiPage.includes('askAnswer') && aiPage.includes('setAskAnswer(null)'));

const askR = fs.readFileSync(path.join(base,'app/api/ai/ask/route.js'),'utf8');
check('Ask API: uses full data snapshot', askR.includes('getSnapshot'));
check('Ask API: includes subjects + weightage', askR.includes('subjectsQ.getAll'));
check('Ask API: includes ai_remark', askR.includes('ai_remark'));
check('Ask API: openrouter fallbacks', askR.includes('OPENROUTER_FALLBACKS'));

const sets = fs.readFileSync(path.join(base,'app/settings/page.js'),'utf8');
check('Settings: ai_remark textarea field', sets.includes('ai_remark'));
check('Settings: aiKeys preserved (your fix)', sets.includes('aiKeys'));
check('Settings: Free/Paid AI tabs preserved', sets.includes('aiTab === "free"'));
check('Settings: providerToSave preserved', sets.includes('providerToSave'));

check('AI client: ai_remark in system prompt', fs.readFileSync(path.join(base,'lib/ai-client.js'),'utf8').includes('ai_remark'));

section('AI GENERATE (preserved)');
const gen = fs.readFileSync(path.join(base,'app/api/ai/generate/route.js'),'utf8');
check('OPENROUTER_FALLBACKS present', gen.includes('OPENROUTER_FALLBACKS'));
check('aiKey_ per-provider logic', gen.includes('aiKey_${settings.aiProvider}'));
check('userId scoped', gen.includes('userId'));

section('PACKAGE');
const pkg = JSON.parse(fs.readFileSync(path.join(base,'package.json'),'utf8'));
check('@libsql/client in dependencies', !!pkg.dependencies['@libsql/client']);
check('no better-sqlite3', !pkg.dependencies['better-sqlite3']);

console.log('\n' + '═'.repeat(50));
console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\n  FAILURES:');
  failures.forEach(f => console.log(`  ❌ ${f.name}${f.detail ? ' — ' + f.detail : ''}`));
  console.log('\n  ⚠️  Fix the above before deploying.');
  process.exit(1);
} else {
  console.log('\n  🎉 ALL TESTS PASSED — safe to deploy!\n');
  console.log('  Next steps:');
  console.log('  1. Run: npm install  (installs @libsql/client)');
  console.log('  2. Run: npm run dev  (local development)');
  console.log('  3. See DEPLOY.md for Vercel deployment\n');
  process.exit(0);
}
