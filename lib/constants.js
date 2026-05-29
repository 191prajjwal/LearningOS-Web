// App metadata
export const APP_NAME = "LearningOS";
export const APP_VERSION = "1.0.0";

// Database
export const DB_PATH = process.env.DB_PATH || "./learningos.db";

// Playback speeds
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

// Skip seconds
export const SKIP_SECONDS = 10;

// Study streak
export const STREAK_GOAL_MINUTES = 30;

// AI providers
export const AI_PROVIDERS = {
  OPENAI: "openai",
  CLAUDE: "claude",
  GEMINI: "gemini",
  OPENROUTER: "openrouter",
  NONE: "none",
};

// AI models
export const AI_MODELS = {
  openai: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  claude: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5-20251001"],
gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"],
openrouter: [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-coder:free",
],
};

// Exam types
export const EXAM_TYPES = [
  "JEE Main",
  "JEE Advanced",
  "NEET",
  "UPSC CSE",
  "UPSC IFoS",
  "CAT",
  "GMAT",
  "GRE",
  "IELTS",
  "TOEFL",
  "SAT",
  "ACT",
  "GATE",
  "SSC CGL",
  "SSC CHSL",
  "RRB NTPC",
  "IBPS PO",
  "SBI PO",
  "CA Foundation",
  "CA Intermediate",
  "CA Final",
  "CFA Level 1",
  "CFA Level 2",
  "CFA Level 3",
  "Bar Exam",
  "USMLE Step 1",
  "USMLE Step 2",
  "AWS Certification",
  "Google Cloud Certification",
  "Custom",
];

// Priority levels
export const PRIORITIES = ["low", "medium", "high", "urgent"];

// Priority colors
export const PRIORITY_COLORS = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  urgent: "#ef4444",
};

// Test types
export const TEST_TYPES = ["Full Mock", "Subject Test", "Chapter Test", "Previous Year", "Custom"];

// Mistake types
export const MISTAKE_TYPES = ["silly", "conceptual", "time_pressure", "unattempted"];

// Days of week
export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Chart colors
export const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

// Heatmap intensity thresholds (minutes)
export const HEATMAP_LEVELS = [0, 30, 60, 120, 180, 240];

// Local storage keys
export const LS_KEYS = {
  PROFILE: "los_profile",
  SETTINGS: "los_settings",
  VIDEO_PROGRESS: "los_video_progress",
  THEME: "los_theme",
};

// Navigation items
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/courses", label: "Courses", icon: "BookOpen" },
  { href: "/planner", label: "Planner", icon: "Calendar" },
  { href: "/tests", label: "Tests", icon: "ClipboardList" },
  { href: "/analytics", label: "Analytics", icon: "BarChart2" },
  { href: "/ai", label: "AI Insights", icon: "Sparkles" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

// Default settings
export const DEFAULT_SETTINGS = {
  theme: "dark",
  aiProvider: "none",
  aiApiKey: "",
  aiKey_openai: "",
  aiKey_claude: "",
  aiKey_gemini: "",
  aiKey_openrouter: "",
  aiModel: "",
  ai_remark: "",
  autoplay: true,
  resumePlayback: true,
  defaultSpeed: 1,
  streakGoal: STREAK_GOAL_MINUTES,
  notifications: true,
};

// Video file extensions
export const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "ogv", "mov", "mkv", "avi", "m4v", "flv", "wmv", "ts", "mts", "m2ts", "3gp"];
