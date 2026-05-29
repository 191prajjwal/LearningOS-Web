"use client";
import { apiFetch } from "../../../lib/api";
import { folderStore } from "../../../lib/folder-store";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, CheckCircle2, Clock, Film, BookOpen,
  ArrowLeft, FileText, ExternalLink, Folder,
  MoreVertical, X, Loader2, History,
  PlayCircle, Grid2X2, List, RefreshCw, UserRound,
  Image as ImageIcon, File as FileIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, formatDuration, formatDurationText, pct, subjectColor, getLectureProgress, cleanLectureTitle, slugify } from "../../../lib/utils";
import SyllabusPanel from "../../../components/study/SyllabusPanel";
import NotesPanel from "../../../components/study/NotesPanel";
import { getVideoMetadata, getVideoMetadataFromUrl } from "../../../lib/video-metadata";

const TABS = ["Lectures", "Materials", "Syllabus", "Notes"];
const VIDEO_EXTS = ["mp4", "mkv", "webm", "mov", "avi", "m4v", "flv", "wmv", "ogg", "ogv", "ts", "mts", "m2ts", "3gp"];
const MATERIAL_EXTS = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "webp"];
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"];
const DOC_EXTS = ["doc", "docx", "txt"];

function isSupportedCourseFile(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return VIDEO_EXTS.includes(ext) || MATERIAL_EXTS.includes(ext);
}

function isVideoFile(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return VIDEO_EXTS.includes(ext);
}

function cleanFileTitle(name) {
  return name.replace(/\.[^.]+$/, "").replace(/^[0-9]+[\s_.-]*/, "").replace(/_/g, " ").trim();
}

async function collectBrowserFolderEntries(dirHandle, path = "", found = []) {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "directory") {
      await collectBrowserFolderEntries(entry, `${path}${entry.name}/`, found);
    } else if (entry.kind === "file" && isSupportedCourseFile(entry.name)) {
      const fileName = `${path}${entry.name}`;
      found.push({
        id: fileName,
        title: cleanFileTitle(entry.name) || entry.name,
        file_path: fileName,
        fileHandle: entry,
        type: isVideoFile(entry.name) ? "video" : "material",
      });
    }
  }
  return found.sort((a, b) => a.file_path.localeCompare(b.file_path, undefined, { numeric: true, sensitivity: "base" }));
}

function titleCaseSegment(value) {
  const upperWords = new Set(["cpu", "dpp", "os", "pdf", "dbms", "sql"]);
  return value
    .split(" ")
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase();
      if (upperWords.has(lower)) return lower.toUpperCase();
      if (/^[ivx]+$/i.test(word)) return word.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function cleanMaterialSegment(segment) {
  return titleCaseSegment(
    segment
      .replace(/\.[^.]+$/, "")
      .replace(/[a-f0-9]{24}/gi, "")
      .replace(/[a-f0-9]{12,}$/gi, "")
      .replace(/^[0-9]+[\s_.-]+/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function formatMaterialPath(filePath = "") {
  const normalized = String(filePath).replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const fileName = parts.pop() || normalized;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const folders = parts.map(cleanMaterialSegment).filter(Boolean);
  let name = cleanMaterialSegment(fileName) || fileName.replace(/\.[^.]+$/, "");
  for (const folder of [...folders].reverse()) {
    const pattern = new RegExp(`^${folder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
    name = name.replace(pattern, "").trim();
  }
  const display = [...folders, name].join(" / ");
  return {
    display,
    folder: folders.join(" / "),
    name,
    ext,
  };
}

function materialIconForExt(ext) {
  const isImg = IMAGE_EXTS.includes(ext);
  const isDoc = DOC_EXTS.includes(ext);
  if (ext === "pdf") return { Icon: FileText, iconStyle: "bg-rose-500/10 text-rose-400" };
  if (isImg) return { Icon: ImageIcon, iconStyle: "bg-emerald-500/10 text-emerald-400" };
  if (isDoc) return { Icon: FileText, iconStyle: "bg-blue-500/10 text-blue-400" };
  return { Icon: FileIcon, iconStyle: "bg-indigo-500/10 text-indigo-400" };
}

function groupMaterials(files) {
  return files.reduce((groups, file) => {
    const meta = formatMaterialPath(file.file_path || file.title);
    const folder = meta.folder || "Course files";
    if (!groups[folder]) groups[folder] = [];
    groups[folder].push({ ...file, meta });
    return groups;
  }, {});
}

// ─── Lecture thumbnail card ──────────────────────────────────────────────────
function LectureCard({ lec, i, subjectId, color, subjectLectureThumbnail, onToggleComplete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const menuRef = useRef(null);
  
  const { status: stat, pct: watchedPct } = getLectureProgress(lec);
  
  const imgSrc = lec.thumbnail || subjectLectureThumbnail;
  const hasBg = !!imgSrc;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="group relative"
    >
      <Link href={`/courses/${subjectId}/watch/${slugify(cleanLectureTitle(lec.title))}`}>
        <div className={cn(
          "rounded-xl border border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
          stat === "completed"
            ? "border-emerald-500/20 bg-emerald-500/4"
            : stat === "inprogress"
            ? "border-indigo-500/20 bg-indigo-500/3"
            : "border-default bg-surface"
        )}>
          {/* Thumbnail area */}
          <div className="relative h-28 overflow-hidden bg-black/30 rounded-xl">
            {hasBg ? (
              <>
                <img
                  src={imgSrc}
                  alt={lec.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70" />
              </>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color}18, ${color}06)` }}
              >
                <Film className="w-8 h-8 opacity-15" style={{ color }} />
              </div>
            )}

            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-indigo-600/80 backdrop-blur-sm border border-white/25 flex items-center justify-center">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>

            {/* Status Badge */}
            <div className={cn(
              "absolute top-2 left-2 px-2 py-1  text-[10px] font-bold border backdrop-blur-md shadow-sm transition-all z-10 bg-white/90 text-black border-white/20 w-7 h-7 flex justify-center items-center rounded-xl"
            )}>
              {i + 1}
            </div>






            {/* In-progress dot
            {stat === "inprogress" && (
              <div className="absolute top-2.5 right-8 w-2 h-2 rounded-full bg-indigo-400 shadow-lg shadow-indigo-500/50 animate-pulse" />
            )} */}

            {/* Duration badge */}


     {/* Meta */}
            <div className="absolute bottom-2 left-2  text-[10px] ">
              {stat === "inprogress" && lec.last_position > 0 && (
                <span className="flex items-center gap-1 text-indigo-400">
                  <History className="w-2.5 h-2.5" />
                  Resume {formatDuration(lec.last_position)}
                </span>
              )}
              {stat === "completed" ? (
                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-md p-1 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              ):" "}
             
            </div>


        
            {lec.duration > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 p-[0.6] rounded-md rounded bg-white/80 backdrop-blur-md text-[11px] text-black/80 font-mono font-medium ">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(lec.duration)}
              </div>
            )}

            {/* Image loading */}
            {imgLoading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>

          {/* Progress bar — full width, thin */}
          {(stat === "inprogress" || stat === "completed") && (
            <div className="h-[3px] bg-muted overflow-hidden relative w-full">
              <div
                className={cn(
                  "h-full transition-all rounded-r-full shadow-[0_0_8px_rgba(0,0,0,0.5)]",
                  stat === "completed" ? "bg-emerald-400" : "bg-indigo-400"
                )}
                style={{ width: stat === "completed" ? "100%" : `${Math.max(watchedPct, 2)}%` }}
              />
            </div>
          )}

          {/* Info strip */}
          <div className="px-3 py-3  ">
            <p 
              className={cn(
                "text-sm font-semibold leading-snug line-clamp-1 truncate mb-1.5 text-primary"
              )}
              title={cleanLectureTitle(lec.title)}
            >
              {cleanLectureTitle(lec.title)}
            </p>

           
          </div>
        </div>
      </Link>

      {/* Three-dot menu — outside Link to avoid nav */}
      <div
        ref={menuRef}
        className="absolute top-2 right-2 z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 z-30 bg-elevated border border-default rounded-xl shadow-2xl min-w-[160px] overflow-hidden py-1"
            >
              <button
                onClick={() => { onToggleComplete(lec.id, !lec.is_completed); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-overlay"
              >
                {lec.is_completed
                  ? <><X className="w-3.5 h-3.5 text-amber-400" /> <span className="text-amber-400">Mark incomplete</span></>
                  : <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Mark complete</span></>
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Recently Watched row ───────────────────────────────────────────────────
function RecentlyWatched({ lectures, subject }) {
  const recent = lectures
    .filter(l => l.last_position > 0 && !l.is_completed)
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 1);
  if (recent.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-primary">Continue Watching</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recent.map(lec => {
          const { pct: watchedPct } = getLectureProgress(lec);
          const imgSrc = lec.thumbnail || subject.default_lecture_thumbnail;
          const cleanTitle = cleanLectureTitle(lec.title);
          return (
            <Link key={lec.id} href={`/courses/${subject.id}/watch/${slugify(cleanTitle)}`}>
              <div className="flex-shrink-0 w-52 rounded-xl border border-default bg-surface overflow-hidden hover:border-indigo-500/40 transition-all group cursor-pointer shadow-sm">
                <div className="relative h-20 bg-black/20">
                  {imgSrc
                    ? <img src={imgSrc} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-indigo-400/40" /></div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-8 h-8 text-white/80" />
                  </div>
                </div>
                <div className="h-0.5 bg-muted">
                  <div className="h-full bg-indigo-500" style={{ width: `${watchedPct}%` }} />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-medium text-primary line-clamp-1" title={cleanTitle}>{cleanTitle}</p>
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                    <History className="w-2.5 h-2.5" /> Resume {formatDuration(lec.last_position)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main CoursePage ─────────────────────────────────────────────────────────
export default function CoursePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const metadataQueueRef = useRef(new Set());
  const [tab, setTab] = useState("Lectures");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  const loadData = useCallback(async () => {
    const r = await apiFetch(`/api/courses/${id}`);
    const d = await r.json();
    setData(d);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") loadData();
    };
    window.addEventListener("focus", loadData);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", loadData);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [loadData]);

  useEffect(() => {
    if (!data?.subject || !data?.lectures?.length) return;
    let cancelled = false;

    const sourceForLecture = (lecture) => {
      const storedUrl = folderStore.get(lecture.file_path);
      if (storedUrl) return storedUrl;
      return null;
    };

    const missing = data.lectures
      .filter(lecture => (!lecture.duration || !lecture.thumbnail) && sourceForLecture(lecture))
      .slice(0, 8);

    if (missing.length === 0) return;

    (async () => {
      for (const lecture of missing) {
        const key = `${data.subject.id}:${lecture.id}`;
        if (metadataQueueRef.current.has(key)) continue;
        metadataQueueRef.current.add(key);
        try {
          const source = sourceForLecture(lecture);
          const metadata = await getVideoMetadataFromUrl(source, cleanLectureTitle(lecture.title), 4500, false);
          if (cancelled || (!metadata.duration && !metadata.thumbnail)) continue;
          const body = {
            ...(metadata.duration ? { duration: metadata.duration } : {}),
            ...(metadata.thumbnail ? { thumbnail: metadata.thumbnail } : {}),
          };
          const response = await apiFetch(`/api/courses/${id}/lectures/${lecture.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!response.ok || cancelled) continue;
          setData(prev => {
            if (!prev?.lectures) return prev;
            return {
              ...prev,
              lectures: prev.lectures.map(item =>
                item.id === lecture.id ? { ...item, ...body } : item
              ),
            };
          });
        } catch {
          // Some codecs cannot expose frames in the browser; the import flow already has a fallback.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [data?.subject, data?.lectures, id]);

  const updateLectureThumbnail = async (lectureId, imageData) => {
    try {
      await apiFetch(`/api/courses/${id}/lectures/${lectureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnail: imageData }),
      });
      setData(prev => ({
        ...prev,
        lectures: prev.lectures.map(l => l.id === lectureId ? { ...l, thumbnail: imageData } : l)
      }));
      toast.success(imageData ? "Thumbnail updated" : "Thumbnail removed");
    } catch { toast.error("Failed to update thumbnail"); }
  };

  const toggleLectureComplete = async (lectureId, completed) => {
    try {
      await apiFetch(`/api/courses/${id}/lectures/${lectureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: completed }),
      });
      setData(prev => ({
        ...prev,
        lectures: prev.lectures.map(l =>
          l.id === lectureId ? { ...l, is_completed: completed } : l
        ),
        subject: {
          ...prev.subject,
          completed_lectures: prev.lectures.filter(l =>
            l.id === lectureId ? completed : l.is_completed
          ).length
        }
      }));
      toast.success(completed ? "Marked complete ✓" : "Marked incomplete");
    } catch { toast.error("Failed to update"); }
  };

  const syncCurrentCourse = async () => {
    if (syncing || !data?.subject) return;
    const subjectId = data.subject.id;
    setSyncing(true);
    setSyncProgress({ done: 0, total: 1, label: "Opening course folder", current: data.subject.name });
    try {
      let restored = await folderStore.reconnect(subjectId, "course");
      let handle = folderStore.getHandle(subjectId, "course");

      if (!restored.ok || !handle) {
        if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
          throw new Error("Folder sync needs Chrome or Edge");
        }
        toast.info("Pick this course folder once to reconnect sync");
        handle = await window.showDirectoryPicker({ mode: "read" });
        await folderStore.setHandle(subjectId, handle, "course");
      }

      const entries = await collectBrowserFolderEntries(handle);
      if (entries.length === 0) throw new Error("No supported videos or materials found");
      await folderStore.loadFromHandle(handle, subjectId, "course");

      const previousLectures = new Map();
      for (const lecture of data.lectures || []) {
        previousLectures.set(lecture.file_path, lecture);
        previousLectures.set(cleanFileTitle(lecture.title).toLowerCase(), lecture);
      }

      setSyncProgress({ done: 0, total: entries.length, label: "Clearing old folder index", current: "" });
      await apiFetch(`/api/courses/${subjectId}/lectures`, { method: "DELETE" });
      await apiFetch(`/api/courses/${subjectId}/materials?category=material`, { method: "DELETE" });

      let lecturesImported = 0;
      let materialsImported = 0;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setSyncProgress({
          done: i,
          total: entries.length,
          label: entry.type === "video" ? "Reading video duration and thumbnail" : "Importing material",
          current: entry.title,
        });

        if (entry.type === "video") {
          const metadata = await getVideoMetadata(entry.fileHandle, entry.title);
          const response = await apiFetch(`/api/courses/${subjectId}/lectures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: entry.title,
              file_path: entry.file_path,
              duration: metadata.duration,
              thumbnail: metadata.thumbnail,
              order_index: lecturesImported++,
            }),
          });
          const created = await response.json().catch(() => ({}));
          const previous = previousLectures.get(entry.file_path) || previousLectures.get(entry.title.toLowerCase());
          if (response.ok && previous && created.lecture?.id) {
            await apiFetch(`/api/courses/${subjectId}/lectures/${created.lecture.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                last_position: previous.last_position || 0,
                is_completed: previous.is_completed || 0,
                watch_count: previous.watch_count || 0,
                total_watch_time: previous.total_watch_time || 0,
              }),
            }).catch(() => {});
          }
        } else {
          await apiFetch(`/api/courses/${subjectId}/materials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: entry.title,
              file_path: entry.file_path,
              category: "material",
              type: "document",
              order_index: materialsImported++,
            }),
          });
        }

        setSyncProgress({
          done: i + 1,
          total: entries.length,
          label: "Syncing course folder",
          current: entry.title,
        });
      }

      await loadData();
      toast.success(`Synced ${lecturesImported} lectures and ${materialsImported} materials`);
    } catch (e) {
      if (e.name !== "AbortError") toast.error(e.message || "Could not sync course folder");
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  if (loading) return <div className="p-6 shimmer h-96 rounded-xl m-6" />;
  if (!data?.subject) return <div className="p-6 text-muted">Course not found</div>;

  const { subject, lectures = [], materials = [] } = data;
  const color = subject.color || subjectColor(subject.name);
  const progress = subject.total_lectures > 0 ? pct(subject.completed_lectures, subject.total_lectures) : 0;

  const completedCount = lectures.filter(l => l.is_completed).length;
  const inProgressCount = lectures.filter(l => !l.is_completed && l.last_position > 0).length;
  const notStartedCount = lectures.filter(l => !l.is_completed && !l.last_position).length;
  const totalDuration = lectures.reduce((acc, l) => acc + (l.duration || 0), 0);
  const syncPercent = syncProgress
    ? Math.round((syncProgress.done / Math.max(syncProgress.total, 1)) * 100)
    : 0;

  const updateCourseCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await apiFetch(`/api/courses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_image: ev.target.result }),
        });
        loadData();
      } catch (err) {
        toast.error("Failed to update course cover");
      }
    };
    reader.readAsDataURL(file);
  };

  const updateLecturesThumbnail = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await apiFetch(`/api/courses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ default_lecture_thumbnail: ev.target.result }),
        });
        loadData();
      } catch (err) {
        toast.error("Failed to update lectures thumbnail");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AnimatePresence>
        {syncing && syncProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm rounded-2xl border border-indigo-500/20 bg-elevated p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-primary">Syncing Folder</h2>
                  <p className="text-xs text-muted mt-0.5">Matching this course with the latest folder changes.</p>
                </div>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs text-secondary">Progress</span>
                <span className="text-2xl font-mono font-bold text-indigo-400">{syncPercent}%</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${syncPercent}%` }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Back */}
      <Link href="/courses" className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden mb-6 relative group" style={{ borderColor: `${color}25` }}>


        {/* Full bleed background */}
        {subject.cover_image ? (
          <div className="absolute inset-0 z-0">
            <img src={subject.cover_image} alt="" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0" style={{ background: `${color}06` }} />
        )}

        <div className="relative z-10 p-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl border border-white/10 backdrop-blur-md" style={{ background: `${color}30` }}>
              <BookOpen className="w-7 h-7" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0 pr-24">
              <h1 className={cn("font-display text-2xl font-bold drop-shadow-md", subject.cover_image ? "text-white" : "text-primary")}>{subject.name}</h1>
              {subject.teacher_name && (
                <p className={cn("text-sm mt-1 drop-shadow-md flex items-center gap-1.5", subject.cover_image ? "text-white/85" : "text-indigo-400")}>
                  <UserRound className="w-3.5 h-3.5" />
                  {subject.teacher_name}
                </p>
              )}
              {subject.description && <p className={cn("text-sm mt-1 drop-shadow-md", subject.cover_image ? "text-white/80" : "text-secondary")}>{subject.description}</p>}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className={cn("font-semibold", subject.cover_image ? "text-white" : "text-primary")}>{completedCount}</span>
                  <span className={cn(subject.cover_image ? "text-white/70" : "text-muted")}>completed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <PlayCircle className="w-4 h-4 text-indigo-400" />
                  <span className={cn("font-semibold", subject.cover_image ? "text-white" : "text-primary")}>{inProgressCount}</span>
                  <span className={cn(subject.cover_image ? "text-white/70" : "text-muted")}>in progress</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <Film className="w-4 h-4 opacity-50" style={{ color: subject.cover_image ? 'white' : 'currentColor' }} />
                  <span className={cn("font-semibold", subject.cover_image ? "text-white" : "text-primary")}>{notStartedCount}</span>
                  <span className={cn(subject.cover_image ? "text-white/70" : "text-muted")}>not started</span>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                    <Clock className="w-4 h-4 opacity-50" style={{ color: subject.cover_image ? 'white' : 'currentColor' }} />
                    <span className={cn("font-semibold", subject.cover_image ? "text-white" : "text-primary")}>{formatDurationText(totalDuration)}</span>
                    <span className={cn(subject.cover_image ? "text-white/70" : "text-muted")}>total</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm font-mono ml-auto bg-indigo-600/10 backdrop-blur-md  px-4 py-2  rounded-md font-medium " style={{color}}>
                 Progress: {progress}%
                </div>
                <button
                  onClick={syncCurrentCourse}
                  disabled={syncing}
                  className={cn(
                    "flex items-center gap-2 text-sm px-4 py-2 rounded-md border backdrop-blur-md transition-colors",
                    subject.cover_image
                      ? "bg-black/25 border-white/15 text-white/85 hover:bg-black/35"
                      : "bg-elevated border-default text-secondary hover:text-primary hover:bg-overlay"
                  )}
                >
                  {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm mt-3 h-2 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: progress === 100 ? "#22c55e" : color }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-elevated w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Lectures tab */}
      {tab === "Lectures" && (
        <div className="space-y-4">
          {/* Recently watched */}
          <RecentlyWatched lectures={lectures} subject={subject} />

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-primary">{lectures.length} Lectures</h2>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-elevated">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                  className={cn("w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-all",
                    viewMode === "grid" ? "bg-indigo-600 text-white" : "text-muted hover:text-primary"
                  )}
                >
                  <Grid2X2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List view"
                  aria-label="List view"
                  className={cn("w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-all",
                    viewMode === "list" ? "bg-indigo-600 text-white" : "text-muted hover:text-primary"
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Lecture list / grid */}
          {lectures.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <Film className="w-12 h-12 text-muted" />
              <div className="text-center">
                <p className="text-secondary font-medium">No lectures yet</p>
                <p className="text-sm text-muted mt-1">Create the course from a folder, then use Sync here when files change</p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lectures.map((lec, i) => (
                <LectureCard
                  key={lec.id}
                  lec={lec}
                  i={i}
                  subjectId={id}
                  color={color}
                  subjectLectureThumbnail={subject.default_lecture_thumbnail}
                  onToggleComplete={toggleLectureComplete}
                />
              ))}
            </div>
          ) : (
            /* List view (Grid of 3 items per row) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lectures.map((lec, i) => {
                const { status: stat, pct: watchedPct } = getLectureProgress(lec);
                const cleanTitle = cleanLectureTitle(lec.title);
                return (
                  <motion.div
                    key={lec.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group relative"
                  >
                    <Link href={`/courses/${id}/watch/${slugify(cleanTitle)}`}>
                      <div className={cn(
                        "flex items-center gap-3 p-3 pr-10 rounded-xl border transition-all cursor-pointer h-full",
                        stat === "completed"
                          ? "bg-emerald-500/4 border-emerald-500/15 hover:border-emerald-500/25"
                          : stat === "inprogress"
                          ? "bg-indigo-500/4 border-indigo-500/15 hover:border-indigo-500/25"
                          : "card-surface hover:border-strong"
                      )}>
                        {/* Thumbnail or number */}
                        <div className="w-14 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-black/20 relative">
                          {(lec.thumbnail || subject.default_lecture_thumbnail) ? (
                            <>
                              <img src={lec.thumbnail || subject.default_lecture_thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-xs font-mono font-bold text-white drop-shadow-md">
                                {stat === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : i + 1}
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-mono font-bold text-muted" style={{ background: `${color}15` }}>
                              {stat === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : i + 1}
                            </div>
                          )}
                          {/* Thin progress bar on thumbnail */}
                          {stat === "inprogress" && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
                              <div className="h-full bg-indigo-400" style={{ width: `${Math.max(watchedPct, 2)}%` }} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={cn("font-semibold text-sm truncate", stat === "completed" ? "text-secondary" : "text-primary")} title={cleanTitle}>
                            {cleanTitle}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {lec.duration > 0 && (
                              <span className="text-[10px] text-muted flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 opacity-70" /> {formatDuration(lec.duration)}
                              </span>
                            )}
                            {stat === "inprogress" && (
                              <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                                <History className="w-2.5 h-2.5" /> {formatDuration(lec.last_position)}
                              </span>
                            )}
                            {stat === "completed" && (
                              <span className="text-[10px] text-emerald-400 font-medium">✓ Completed</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 text-xs">
                          <Play className="w-3.5 h-3.5" /> Watch
                        </div>
                      </div>
                    </Link>

                    {/* Three-dot in list view */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          await toggleLectureComplete(lec.id, !lec.is_completed);
                        }}
                        title={lec.is_completed ? "Mark incomplete" : "Mark complete"}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100",
                          lec.is_completed
                            ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25"
                            : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                        )}
                      >
                        {lec.is_completed ? <X className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Materials tab */}
      {tab === "Materials" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-display font-semibold text-primary">Course Materials</h2>
            <p className="text-xs text-muted mt-1">A clean folder view for notes, DPPs, PDFs, and images.</p>
          </div>
          {(() => {
            const folderFiles = folderStore.getFilesForSubject(id, "course")
              .filter(fname => MATERIAL_EXTS.includes(fname.split('.').pop()?.toLowerCase()))
              .map((fname, i) => ({
                id: `folder-${i}`,
                title: fname.replace(/\.[^.]+$/, ""),
                file_path: fname,
                url: folderStore.get(fname)
              }));
            const dbFiles = materials.map((m) => ({
              ...m,
              url: folderStore.get(m.file_path),
            }));
            const files = dbFiles.length > 0 ? dbFiles : folderFiles;
            const groups = groupMaterials(files);
            const groupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

            if (files.length === 0) {
              return (
                <div className="flex flex-col items-center py-16 gap-4">
                  <FileText className="w-12 h-12 text-muted" />
                  <div className="text-center">
                    <p className="text-secondary font-medium">No materials found in folder</p>
                    <p className="text-sm text-muted mt-1">Sync this course after adding PDFs, notes, DPPs, or images.</p>
                  </div>
                </div>
              );
            }

            return (
              <div className="columns-1 xl:columns-2 gap-4 space-y-4">
                {groupEntries.map(([folder, items], groupIndex) => (
                  <motion.section
                    key={folder}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.03 }}
                    className="break-inside-avoid rounded-xl border border-default bg-surface overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between gap-3 px-4 py-3 border-b border-indigo-500/15"
                      style={{
                        background: `linear-gradient(135deg, ${color}18 0%, rgba(99,102,241,0.08) 55%, rgba(255,255,255,0.03) 100%)`,
                      }}
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-black/20 border border-white/8 flex items-center justify-center flex-shrink-0">
                          <Folder className="w-4 h-4" style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-primary truncate">{folder}</h3>
                          <p className="text-[11px] text-muted">Folder</p>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 rounded-full bg-black/20 border border-white/8 text-[11px] font-mono text-secondary flex-shrink-0">
                        {items.length} files
                      </div>
                    </div>
                    <div className="divide-y divide-default">
                      {items
                        .sort((a, b) => a.meta.name.localeCompare(b.meta.name, undefined, { numeric: true, sensitivity: "base" }))
                        .map((m) => {
                          const ext = m.meta.ext;
                          const { Icon, iconStyle } = materialIconForExt(ext);
                          const kind = ext ? ext.toUpperCase() : "FILE";
                          return (
                            <a
                              key={m.id}
                              href={m.url || undefined}
                              target={m.url ? "_blank" : undefined}
                              rel={m.url ? "noreferrer" : undefined}
                              title={m.meta.display}
                              onClick={(e) => {
                                if (!m.url) {
                                  e.preventDefault();
                                  toast.info("Sync this course folder to open the latest local file.");
                                }
                              }}
                              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 hover:bg-overlay transition-colors"
                            >
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconStyle)}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-primary truncate">{m.meta.name}</p>
                                <p className="text-[10px] text-muted uppercase font-mono">{kind}</p>
                              </div>
                              <ExternalLink className={cn("w-3.5 h-3.5 flex-shrink-0", m.url ? "text-muted group-hover:text-indigo-400" : "text-muted/40")} />
                            </a>
                          );
                        })}
                    </div>
                  </motion.section>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {tab === "Syllabus" && <SyllabusPanel subjectId={id} />}
      {tab === "Notes" && <NotesPanel subjectId={id} />}
    </div>
  );
}
