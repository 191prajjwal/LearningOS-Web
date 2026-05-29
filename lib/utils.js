import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

// Tailwind class merger
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format seconds to HH:MM:SS or MM:SS
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationText(seconds) {
  if (!seconds || isNaN(seconds)) return "0 mins";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} hrs ${m} mins`;
  if (h > 0) return `${h} hrs`;
  return `${m} mins`;
}

// Format bytes to human-readable
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Calculate days between two dates
export function daysBetween(start, end) {
  return differenceInDays(new Date(end), new Date(start));
}

// Format date nicely
export function formatDate(date, fmt = "MMM d, yyyy") {
  if (!date) return "";
  try {
    const d = typeof date === "string" ? parseISO(date) : new Date(date);
    return format(d, fmt);
  } catch {
    return "";
  }
}

// Relative time (e.g. "2 hours ago")
export function timeAgo(date) {
  if (!date) return "";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "";
  }
}

// Clamp value between min and max
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// Generate a unique ID
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Slugify string
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Parse duration string (e.g. "1:23:45") to seconds
export function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// Calculate percentage
export function pct(val, total) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

// Truncate string
export function truncate(str, len = 50) {
  if (!str) return "";
  return str.length > len ? `${str.slice(0, len)}...` : str;
}

// Group array by key
export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// Sort array by key
export function sortBy(arr, key, dir = "asc") {
  return [...arr].sort((a, b) => {
    const av = typeof key === "function" ? key(a) : a[key];
    const bv = typeof key === "function" ? key(b) : b[key];
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// Debounce
export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Deep merge objects
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Color for subject (deterministic)
const SUBJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6",
];
export function subjectColor(name) {
  if (!name) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

// Exam countdown info
export function examCountdown(examDate, startDate) {
  const now = new Date();
  const exam = new Date(examDate);
  const start = new Date(startDate);
  const totalDays = differenceInDays(exam, start);
  const daysElapsed = differenceInDays(now, start);
  const daysRemaining = differenceInDays(exam, now);
  const progressPct = totalDays > 0 ? clamp(Math.round((daysElapsed / totalDays) * 100), 0, 100) : 0;
  return { totalDays, daysElapsed, daysRemaining: Math.max(0, daysRemaining), progressPct };
}

// Local storage safe get
export function lsGet(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

// Local storage safe set
export function lsSet(key, value) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// File extension
export function fileExt(filename) {
  return filename?.split(".").pop()?.toLowerCase() || "";
}

// Is video file
export function isVideoFile(filename) {
  return ["mp4", "webm", "ogg", "mov", "mkv", "avi"].includes(fileExt(filename));
}

// Week number of year
export function weekOfYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Clean lecture title
export function cleanLectureTitle(title) {
  if (!title) return "";
  const cleaned = title.replace(/^[0-9]+[\s_\-.]*/, '').replace(/_/g, ' ').replace(/\.[^/.]+$/, '').trim();
  return cleaned || title;
}

// Robust lecture progress tracking
export function getLectureProgress(lec) {
  if (!lec) return { status: "notstarted", pct: 0 };
  if (lec.is_completed) return { status: "completed", pct: 100 };
  
  const resumePosition = Number(lec.last_position) || 0;
  const duration = Number(lec.duration) || 0;
  const progressPct = duration > 0 && resumePosition > 0
    ? Math.round((resumePosition / duration) * 100)
    : 0;
  const clampedPct = clamp(progressPct, 0, 99);
    
  if (resumePosition > 0) return { status: "inprogress", pct: clampedPct };
  return { status: "notstarted", pct: 0 };
}

