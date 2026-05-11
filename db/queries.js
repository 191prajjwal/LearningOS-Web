import { dbGet, dbQuery, dbRun, hashPin } from "./client.js";
import { format } from "date-fns";

const today = () => format(new Date(), "yyyy-MM-dd");

// ─── USERS / AUTH ─────────────────────────────────────────────────────────────
export const usersQ = {
  getByUsername: (username) => dbGet("SELECT * FROM users WHERE username = ?", [username]),
  getById: (id) => dbGet("SELECT id, username, created_at FROM users WHERE id = ?", [id]),
  create: async (username, pin) => {
    const pin_hash = hashPin(pin);
    const r = await dbRun("INSERT INTO users (username, pin_hash) VALUES (?, ?)", [username.trim(), pin_hash]);
    await dbRun("INSERT INTO profile (user_id, name) VALUES (?, ?)", [r.lastInsertRowid, '']);
    return r.lastInsertRowid;
  },
  verify: async (username, pin) => {
    const user = await dbGet("SELECT * FROM users WHERE username = ?", [username.trim()]);
    if (!user) return null;
    if (user.pin_hash !== hashPin(pin)) return null;
    return user;
  },
};

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export const profileQ = {
  get: (userId) => dbGet("SELECT * FROM profile WHERE user_id = ?", [userId]),
  update: async (userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    const vals = [...Object.values(data), format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"), userId];
    return dbRun(`UPDATE profile SET ${fields}, updated_at = ? WHERE user_id = ?`, vals);
  },
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export const settingsQ = {
  getAll: async (userId) => {
    const rows = await dbQuery("SELECT key, value FROM settings WHERE user_id = ?", [userId]);
    return rows.reduce((acc, r) => {
      try { acc[r.key] = JSON.parse(r.value || "null"); } catch { acc[r.key] = r.value; }
      return acc;
    }, {});
  },
  set: (userId, key, value) => dbRun(
    "INSERT OR REPLACE INTO settings (user_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))",
    [userId, key, JSON.stringify(value)]
  ),
};

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────
export const subjectsQ = {
  getAll: (userId) => dbQuery("SELECT * FROM subjects WHERE user_id = ? ORDER BY name", [userId]),
  getById: (id, userId) => dbGet("SELECT * FROM subjects WHERE id = ? AND user_id = ?", [id, userId]),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO subjects (user_id, name, color, folder_path, description, weightage, syllabus_pdf) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, data.name, data.color, data.folder_path, data.description, data.weightage || 0, data.syllabus_pdf || '']
    );
    return r.lastInsertRowid;
  },
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE subjects SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM subjects WHERE id = ? AND user_id = ?", [id, userId]),
  updateProgress: (id, userId) => dbRun(`
    UPDATE subjects SET
      total_lectures = (SELECT COUNT(*) FROM lectures WHERE subject_id = ? AND user_id = ?),
      completed_lectures = (SELECT COUNT(*) FROM lectures WHERE subject_id = ? AND user_id = ? AND is_completed = 1)
    WHERE id = ? AND user_id = ?
  `, [id, userId, id, userId, id, userId]),
};

// ─── LECTURES ─────────────────────────────────────────────────────────────────
export const lecturesQ = {
  getAll: (userId) => dbQuery(
    "SELECT l.*, s.name as subject_name, s.color as subject_color FROM lectures l LEFT JOIN subjects s ON l.subject_id = s.id WHERE l.user_id = ? ORDER BY l.order_index",
    [userId]
  ),
  getBySubject: (subjectId, userId) => dbQuery(
    "SELECT * FROM lectures WHERE subject_id = ? AND user_id = ? ORDER BY order_index",
    [subjectId, userId]
  ),
  getById: (id, userId) => dbGet(
    "SELECT l.*, s.name as subject_name FROM lectures l LEFT JOIN subjects s ON l.subject_id = s.id WHERE l.id = ? AND l.user_id = ?",
    [id, userId]
  ),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO lectures (user_id, subject_id, title, file_path, duration, order_index, thumbnail) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, data.subject_id, data.title, data.file_path, data.duration || 0, data.order_index || 0, data.thumbnail]
    );
    return r.lastInsertRowid;
  },
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE lectures SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM lectures WHERE id = ? AND user_id = ?", [id, userId]),
  markComplete: (id, userId, val = 1) => dbRun("UPDATE lectures SET is_completed = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", [val, id, userId]),
  updatePosition: (id, userId, pos) => dbRun("UPDATE lectures SET last_position = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?", [pos, id, userId]),
  incrementWatch: (id, userId, duration) => dbRun(
    "UPDATE lectures SET watch_count = watch_count + 1, total_watch_time = total_watch_time + ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    [duration, id, userId]
  ),
  getNextInSubject: (subjectId, orderIndex, userId) => dbGet(
    "SELECT * FROM lectures WHERE subject_id = ? AND order_index > ? AND user_id = ? ORDER BY order_index ASC LIMIT 1",
    [subjectId, orderIndex, userId]
  ),
  getPrevInSubject: (subjectId, orderIndex, userId) => dbGet(
    "SELECT * FROM lectures WHERE subject_id = ? AND order_index < ? AND user_id = ? ORDER BY order_index DESC LIMIT 1",
    [subjectId, orderIndex, userId]
  ),
};

// ─── MATERIALS ────────────────────────────────────────────────────────────────
export const materialsQ = {
  getBySubject: (subjectId, userId, category = null) => {
    let sql = "SELECT * FROM materials WHERE subject_id = ? AND user_id = ?";
    const params = [subjectId, userId];
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    sql += " ORDER BY order_index";
    return dbQuery(sql, params);
  },
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO materials (user_id, subject_id, title, file_path, category, type, order_index) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, data.subject_id, data.title, data.file_path, data.category || 'material', data.type || 'document', data.order_index || 0]
    );
    return r.lastInsertRowid;
  },
  delete: (id, userId) => dbRun("DELETE FROM materials WHERE id = ? AND user_id = ?", [id, userId]),
  deleteByCategory: (subjectId, userId, category) => dbRun(
    "DELETE FROM materials WHERE subject_id = ? AND user_id = ? AND category = ?",
    [subjectId, userId, category]
  ),
};

// ─── WATCH SESSIONS ───────────────────────────────────────────────────────────
export const watchQ = {
  create: (userId, data) => dbRun(
    "INSERT INTO watch_sessions (user_id, lecture_id, subject_id, date, duration, start_pos, end_pos, speed, pauses) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, data.lecture_id, data.subject_id, data.date || today(), data.duration, data.start_pos, data.end_pos, data.speed || 1, data.pauses || 0]
  ),
  getByDate: (userId, date) => dbQuery(
    "SELECT ws.*, l.title as lecture_title, s.name as subject_name FROM watch_sessions ws LEFT JOIN lectures l ON ws.lecture_id = l.id LEFT JOIN subjects s ON ws.subject_id = s.id WHERE ws.user_id = ? AND ws.date = ?",
    [userId, date]
  ),
  getDailyTotals: (userId, days = 30) => dbQuery(`
    SELECT date, SUM(duration) as total_minutes, COUNT(*) as sessions
    FROM watch_sessions WHERE user_id = ? AND date >= date('now', '-${days} days')
    GROUP BY date ORDER BY date
  `, [userId]),
  getSubjectTotals: (userId, days = 30) => dbQuery(`
    SELECT ws.subject_id, s.name, s.color, SUM(ws.duration) as total_minutes
    FROM watch_sessions ws LEFT JOIN subjects s ON ws.subject_id = s.id
    WHERE ws.user_id = ? AND ws.date >= date('now', '-${days} days')
    GROUP BY ws.subject_id ORDER BY total_minutes DESC
  `, [userId]),
  getTotalToday: (userId) => dbGet(
    "SELECT COALESCE(SUM(duration), 0) as total FROM watch_sessions WHERE user_id = ? AND date = ?",
    [userId, today()]
  ),
};

// ─── NOTES ────────────────────────────────────────────────────────────────────
export const notesQ = {
  getAll: (userId) => dbQuery(
    "SELECT n.*, s.name as subject_name, l.title as lecture_title FROM notes n LEFT JOIN subjects s ON n.subject_id = s.id LEFT JOIN lectures l ON n.lecture_id = l.id WHERE n.user_id = ? ORDER BY n.is_pinned DESC, n.created_at DESC",
    [userId]
  ),
  getBySubject: (subjectId, userId) => dbQuery("SELECT * FROM notes WHERE subject_id = ? AND user_id = ? ORDER BY created_at DESC", [subjectId, userId]),
  getByLecture: (lectureId, userId) => dbQuery("SELECT * FROM notes WHERE lecture_id = ? AND user_id = ? ORDER BY timestamp ASC", [lectureId, userId]),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO notes (user_id, lecture_id, subject_id, content, timestamp, tags, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, data.lecture_id, data.subject_id, data.content, data.timestamp, JSON.stringify(data.tags || []), data.is_pinned || 0]
    );
    return r.lastInsertRowid;
  },
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE notes SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM notes WHERE id = ? AND user_id = ?", [id, userId]),
  togglePin: (id, userId) => dbRun("UPDATE notes SET is_pinned = 1 - is_pinned WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── TASKS ────────────────────────────────────────────────────────────────────
export const tasksQ = {
  getByDate: (userId, date) => dbQuery(
    "SELECT t.*, s.name as subject_name, s.color as subject_color FROM tasks t LEFT JOIN subjects s ON t.subject_id = s.id WHERE t.user_id = ? AND t.date = ? ORDER BY t.start_time",
    [userId, date]
  ),
  getByDateRange: (userId, from, to) => dbQuery(
    "SELECT t.*, s.name as subject_name FROM tasks t LEFT JOIN subjects s ON t.subject_id = s.id WHERE t.user_id = ? AND t.date BETWEEN ? AND ? ORDER BY t.date, t.start_time",
    [userId, from, to]
  ),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO tasks (user_id, title, description, subject_id, date, start_time, end_time, duration_minutes, priority, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, data.title, data.description, data.subject_id || null, data.date, data.start_time, data.end_time, data.duration_minutes || 60, data.priority || "medium", data.type || "study"]
    );
    return r.lastInsertRowid;
  },
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE tasks SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM tasks WHERE id = ? AND user_id = ?", [id, userId]),
  toggleComplete: (id, userId) => dbRun("UPDATE tasks SET is_completed = 1 - is_completed WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── TESTS ────────────────────────────────────────────────────────────────────
export const testsQ = {
  getAll: (userId) => dbQuery(
    "SELECT t.*, s.name as subject_name FROM tests t LEFT JOIN subjects s ON t.subject_id = s.id WHERE t.user_id = ? ORDER BY t.date DESC",
    [userId]
  ),
  getById: (id, userId) => dbGet("SELECT * FROM tests WHERE id = ? AND user_id = ?", [id, userId]),
  getSubjects: (testId, userId) => dbQuery(
    "SELECT ts.*, s.name, s.color FROM test_subjects ts LEFT JOIN subjects s ON ts.subject_id = s.id WHERE ts.test_id = ? AND ts.user_id = ?",
    [testId, userId]
  ),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO tests (user_id, title, type, date, subject_id, subject_name, total_marks, total_questions, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, data.title, data.type || "Full Mock", data.date, null, data.subject, data.total_marks, data.total_questions, data.notes]
    );
    return r.lastInsertRowid;
  },
  complete: (id, userId, results) => dbRun(
    "UPDATE tests SET obtained_marks=?, attempted=?, correct=?, incorrect=?, unattempted=?, time_taken=?, is_completed=1, updated_at=datetime('now') WHERE id=? AND user_id=?",
    [results.obtained_marks, results.attempted, results.correct, results.incorrect, results.unattempted, results.time_taken, id, userId]
  ),
  delete: (id, userId) => dbRun("DELETE FROM tests WHERE id = ? AND user_id = ?", [id, userId]),
  addSubject: (userId, data) => dbRun(
    "INSERT INTO test_subjects (user_id, test_id, subject_id, total_marks, obtained_marks, correct, incorrect, silly_mistakes, conceptual_mistakes, time_pressure_mistakes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, data.test_id, data.subject_id, data.total_marks, data.obtained_marks, data.correct, data.incorrect, data.silly_mistakes || 0, data.conceptual_mistakes || 0, data.time_pressure_mistakes || 0]
  ),
  getAnalytics: (userId) => dbGet(`
    SELECT COUNT(*) as total_tests,
      AVG(CASE WHEN is_completed = 1 THEN (obtained_marks * 100.0 / total_marks) END) as avg_score,
      MAX(CASE WHEN is_completed = 1 THEN (obtained_marks * 100.0 / total_marks) END) as best_score,
      MIN(CASE WHEN is_completed = 1 THEN (obtained_marks * 100.0 / total_marks) END) as worst_score,
      SUM(correct) as total_correct, SUM(incorrect) as total_incorrect, SUM(unattempted) as total_unattempted
    FROM tests WHERE user_id = ? AND is_completed = 1
  `, [userId]),
};

// ─── LINKS ────────────────────────────────────────────────────────────────────
export const linksQ = {
  getAll: (userId) => dbQuery(
    "SELECT l.*, s.name as subject_name FROM links l LEFT JOIN subjects s ON l.subject_id = s.id WHERE l.user_id = ? ORDER BY l.is_pinned DESC, l.created_at DESC",
    [userId]
  ),
  create: (userId, data) => dbRun(
    "INSERT INTO links (user_id, title, url, subject_id, description, tags, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, data.title, data.url, data.subject_id || null, data.description, JSON.stringify(data.tags || []), data.is_pinned || 0]
  ),
  update: (id, userId, data) => dbRun(
    "UPDATE links SET title=?, url=?, subject_id=?, description=? WHERE id=? AND user_id=?",
    [data.title, data.url, data.subject_id || null, data.description || null, id, userId]
  ),
  delete: (id, userId) => dbRun("DELETE FROM links WHERE id = ? AND user_id = ?", [id, userId]),
  togglePin: (id, userId) => dbRun("UPDATE links SET is_pinned = 1 - is_pinned WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── IMPORTANT DATES ──────────────────────────────────────────────────────────
export const datesQ = {
  getAll: (userId) => dbQuery("SELECT * FROM important_dates WHERE user_id = ? ORDER BY date", [userId]),
  getByMonth: (userId, year, month) => dbQuery(
    "SELECT * FROM important_dates WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?",
    [userId, String(year), String(month).padStart(2, "0")]
  ),
  create: (userId, data) => dbRun(
    "INSERT INTO important_dates (user_id, title, date, type, description, color) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, data.title, data.date, data.type || "exam", data.description, data.color]
  ),
  update: (id, userId, data) => dbRun(
    "UPDATE important_dates SET title=?, date=?, type=?, description=? WHERE id=? AND user_id=?",
    [data.title, data.date, data.type, data.description || null, id, userId]
  ),
  delete: (id, userId) => dbRun("DELETE FROM important_dates WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── GOALS ────────────────────────────────────────────────────────────────────
export const goalsQ = {
  getAll: (userId) => dbQuery(
    "SELECT g.*, s.name as subject_name FROM goals g LEFT JOIN subjects s ON g.subject_id = s.id WHERE g.user_id = ? ORDER BY g.priority DESC, g.due_date",
    [userId]
  ),
  create: (userId, data) => dbRun(
    "INSERT INTO goals (user_id, title, description, subject_id, type, target_value, unit, due_date, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, data.title, data.description, data.subject_id || null, data.type || "daily", data.target_value, data.unit || "hours", data.due_date, data.priority || "medium"]
  ),
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE goals SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM goals WHERE id = ? AND user_id = ?", [id, userId]),
  toggleComplete: (id, userId) => dbRun("UPDATE goals SET is_completed = 1 - is_completed WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── STREAK ───────────────────────────────────────────────────────────────────
export const streakQ = {
  getToday: (userId) => dbGet("SELECT * FROM study_streak WHERE user_id = ? AND date = ?", [userId, today()]),
  upsertToday: (userId, minutes, goalMinutes = 30) => {
    const goalMet = minutes >= goalMinutes ? 1 : 0;
    return dbRun(
      "INSERT INTO study_streak (user_id, date, minutes, goal_met) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, date) DO UPDATE SET minutes = ?, goal_met = ?",
      [userId, today(), minutes, goalMet, minutes, goalMet]
    );
  },
  getLast: (userId, days = 30) => dbQuery(
    "SELECT * FROM study_streak WHERE user_id = ? AND date >= date('now', ?) ORDER BY date",
    [userId, `-${days} days`]
  ),
  getCurrentStreak: async (userId) => {
    const rows = await dbQuery(
      "SELECT date, goal_met FROM study_streak WHERE user_id = ? AND goal_met = 1 ORDER BY date DESC LIMIT 365",
      [userId]
    );
    if (!rows.length) return 0;
    let streak = 0, prev = null;
    for (const row of rows) {
      const d = new Date(row.date);
      if (!prev) {
        const diff = Math.floor((new Date() - d) / 86400000);
        if (diff > 1) break;
        streak = 1; prev = d;
      } else {
        const diff = Math.floor((prev - d) / 86400000);
        if (diff === 1) { streak++; prev = d; } else break;
      }
    }
    return streak;
  },
};

// ─── SYLLABUS ─────────────────────────────────────────────────────────────────
export const syllabusQ = {
  getBySubject: (subjectId, userId) => dbQuery(
    "SELECT * FROM syllabus WHERE subject_id = ? AND user_id = ? ORDER BY order_index",
    [subjectId, userId]
  ),
  create: (userId, data) => dbRun(
    "INSERT INTO syllabus (user_id, subject_id, chapter, topic, weightage, order_index) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, data.subject_id, data.chapter, data.topic, data.weightage || 0, data.order_index || 0]
  ),
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE syllabus SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM syllabus WHERE id = ? AND user_id = ?", [id, userId]),
  toggleComplete: (id, userId) => dbRun("UPDATE syllabus SET is_completed = 1 - is_completed WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── AI REPORTS ───────────────────────────────────────────────────────────────
export const aiReportsQ = {
  getAll: (userId) => dbQuery(
    "SELECT id, title, type, provider, model, created_at FROM ai_reports WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  ),
  getById: (id, userId) => dbGet("SELECT * FROM ai_reports WHERE id = ? AND user_id = ?", [id, userId]),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO ai_reports (user_id, title, type, content, model, provider, data_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userId, data.title, data.type, data.content, data.model, data.provider, data.data_snapshot]
    );
    return r.lastInsertRowid;
  },
  delete: (id, userId) => dbRun("DELETE FROM ai_reports WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
export const analyticsQ = {
  getSnapshot: async (userId) => {
    const [watchBySubject, testStats, testSubjectBreakdown, lectureCompletion, streak, syllabusProgress] = await Promise.all([
      dbQuery(`SELECT s.name, SUM(ws.duration) as total_minutes, COUNT(DISTINCT ws.lecture_id) as lectures_watched FROM watch_sessions ws JOIN subjects s ON ws.subject_id = s.id WHERE ws.user_id = ? GROUP BY ws.subject_id`, [userId]),
      dbQuery(`SELECT t.title, t.date, t.type, ROUND(t.obtained_marks * 100.0 / t.total_marks, 1) as score_pct, t.correct, t.incorrect, t.unattempted, t.total_questions FROM tests t WHERE t.user_id = ? AND t.is_completed = 1 ORDER BY t.date DESC LIMIT 20`, [userId]),
      dbQuery(`SELECT s.name, AVG(ts.obtained_marks * 100.0 / NULLIF(ts.total_marks,0)) as avg_score, SUM(ts.silly_mistakes) as silly, SUM(ts.conceptual_mistakes) as conceptual FROM test_subjects ts JOIN subjects s ON ts.subject_id = s.id WHERE ts.user_id = ? GROUP BY ts.subject_id`, [userId]),
      dbQuery(`SELECT s.name, COUNT(*) as total, SUM(l.is_completed) as completed FROM lectures l JOIN subjects s ON l.subject_id = s.id WHERE l.user_id = ? GROUP BY l.subject_id`, [userId]),
      dbGet(`SELECT COUNT(*) as streak_days, SUM(minutes) as total_minutes FROM study_streak WHERE user_id = ? AND goal_met = 1 AND date >= date('now', '-30 days')`, [userId]),
      dbQuery(`SELECT s.name, COUNT(*) as total, SUM(sy.is_completed) as completed FROM syllabus sy JOIN subjects s ON sy.subject_id = s.id WHERE sy.user_id = ? GROUP BY sy.subject_id`, [userId]),
    ]);
    return { watchBySubject, testStats, testSubjectBreakdown, lectureCompletion, streak, syllabusProgress };
  },
};



// ─── EXAM SUBJECTS (Syllabus page — separate from Courses) ───────────────────
export const examSubjectsQ = {
  getAll: (userId) => dbQuery("SELECT * FROM exam_subjects WHERE user_id = ? ORDER BY name", [userId]),
  create: async (userId, data) => {
    const r = await dbRun(
      "INSERT INTO exam_subjects (user_id, name, color, weightage, description) VALUES (?, ?, ?, ?, ?)",
      [userId, data.name, data.color || null, data.weightage || 0, data.description || null]
    );
    return r.lastInsertRowid;
  },
  update: (id, userId, data) => {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
    return dbRun(`UPDATE exam_subjects SET ${fields}, updated_at = datetime('now') WHERE id = ? AND user_id = ?`, [...Object.values(data), id, userId]);
  },
  delete: (id, userId) => dbRun("DELETE FROM exam_subjects WHERE id = ? AND user_id = ?", [id, userId]),
};

// ─── SYLLABUS PDF ─────────────────────────────────────────────────────────────
export const syllabusPdfQ = {
  get: (userId) => dbGet("SELECT pdf_data FROM syllabus_pdf WHERE user_id = ?", [userId]),
  set: (userId, pdfData) => dbRun(
    "INSERT OR REPLACE INTO syllabus_pdf (user_id, pdf_data, updated_at) VALUES (?, ?, datetime('now'))",
    [userId, pdfData]
  ),
};
