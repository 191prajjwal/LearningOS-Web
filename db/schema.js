// SQLite schema for LearningOS — multi-user
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pin_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    photo TEXT,
    exam_type TEXT,
    exam_branch TEXT DEFAULT '',
    start_date TEXT,
    exam_date TEXT,
    ai_remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    teacher_name TEXT DEFAULT '',
    color TEXT,
    folder_path TEXT,
    videos_path TEXT DEFAULT '',
    description TEXT,
    weightage REAL DEFAULT 0,
    syllabus_pdf TEXT DEFAULT '',
    cover_image TEXT DEFAULT '',
    default_lecture_thumbnail TEXT DEFAULT '',
    total_lectures INTEGER DEFAULT 0,
    completed_lectures INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lectures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    duration REAL DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    last_position REAL DEFAULT 0,
    watch_count INTEGER DEFAULT 0,
    total_watch_time REAL DEFAULT 0,
    thumbnail TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watch_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id INTEGER REFERENCES lectures(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    duration REAL DEFAULT 0,
    start_pos REAL DEFAULT 0,
    end_pos REAL DEFAULT 0,
    speed REAL DEFAULT 1,
    pauses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id INTEGER REFERENCES lectures(id) ON DELETE SET NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp REAL,
    tags TEXT DEFAULT '[]',
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT DEFAULT 'material',
    type TEXT DEFAULT 'document',
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    color TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'daily',
    target_value REAL,
    current_value REAL DEFAULT 0,
    unit TEXT DEFAULT 'hours',
    due_date TEXT,
    is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER DEFAULT 60,
    is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium',
    type TEXT DEFAULT 'study',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'Full Mock',
    date TEXT NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    subject_name TEXT DEFAULT '',
    total_marks REAL NOT NULL,
    obtained_marks REAL,
    total_questions INTEGER,
    attempted INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    incorrect INTEGER DEFAULT 0,
    unattempted INTEGER DEFAULT 0,
    time_taken INTEGER,
    notes TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    total_marks REAL,
    obtained_marks REAL,
    correct INTEGER DEFAULT 0,
    incorrect INTEGER DEFAULT 0,
    silly_mistakes INTEGER DEFAULT 0,
    conceptual_mistakes INTEGER DEFAULT 0,
    time_pressure_mistakes INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    description TEXT,
    tags TEXT DEFAULT '[]',
    is_pinned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS important_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'exam',
    description TEXT,
    color TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS study_streak (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    minutes REAL DEFAULT 0,
    goal_met INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS ai_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    type TEXT DEFAULT 'general',
    content TEXT,
    model TEXT,
    provider TEXT,
    data_snapshot TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS syllabus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    chapter TEXT NOT NULL,
    topic TEXT,
    is_completed INTEGER DEFAULT 0,
    weightage REAL DEFAULT 0,
    notes TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

CREATE TABLE IF NOT EXISTS exam_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    weightage REAL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS syllabus_pdf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pdf_data TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );

`;

export const INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_lectures_subject ON lectures(subject_id);
  CREATE INDEX IF NOT EXISTS idx_lectures_user ON lectures(user_id);
  CREATE INDEX IF NOT EXISTS idx_watch_sessions_user ON watch_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_watch_sessions_date ON watch_sessions(date);
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
  CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id);
  CREATE INDEX IF NOT EXISTS idx_streak_user_date ON study_streak(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_syllabus_subject ON syllabus(subject_id);
  CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
  CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject_id);





`;
