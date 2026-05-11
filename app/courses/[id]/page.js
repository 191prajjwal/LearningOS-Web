"use client";
import { apiFetch } from "../../../lib/api";
import { folderStore } from "../../../lib/folder-store";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Plus, CheckCircle2, Clock, Film, BookOpen,
  ArrowLeft, FolderOpen, FileText, ExternalLink,
  MoreVertical, ImagePlus, X, Loader2, History,
  PlayCircle, Lock, ChevronRight, Trash2,
  Image as ImageIcon, File as FileIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, formatDuration, pct, subjectColor } from "../../../lib/utils";
import SyllabusPanel from "../../../components/study/SyllabusPanel";
import NotesPanel from "../../../components/study/NotesPanel";
import FolderImport from "../../../components/ui/FolderImport";

const TABS = ["Lectures", "Materials", "Syllabus", "Notes"];

// ─── helpers ────────────────────────────────────────────────────────────────
function lectureStat(lec) {
  if (lec.is_completed) return "completed";
  if (lec.last_position > 0) return "inprogress";
  return "notstarted";
}

// ─── Lecture thumbnail card ──────────────────────────────────────────────────
function LectureCard({ lec, i, subjectId, color, subjectCoverImage, subjectLectureThumbnail, onToggleComplete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const menuRef = useRef(null);
  const stat = lectureStat(lec);
  
  const imgSrc = lec.thumbnail || subjectLectureThumbnail || subjectCoverImage;
  const hasBg = !!imgSrc;

  // Duration total and watched pct
  const watchedPct = lec.duration > 0 && lec.last_position > 0
    ? Math.min(Math.round((lec.last_position / lec.duration) * 100), 99)
    : 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await onImageChange(lec.id, ev.target.result);
      setImgLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setMenuOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="group relative"
    >
      <Link href={`/courses/${subjectId}/watch/${lec.id}`}>
        <div className={cn(
          "rounded-xl border border-2 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5",
          stat === "completed"
            ? "border-emerald-500/20 bg-emerald-500/4"
            : stat === "inprogress"
            ? "border-indigo-500/20 bg-indigo-500/3"
            : "border-white/6 bg-surface"
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

            {/* Number badge */}
            <div className={cn(
              "absolute top-2 left-2 w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-medium shadow-md bg-white text-black"
            )}>
              { i + 1}
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
                <span className="flex items-center gap-1 text-emerald-400 bg-white/10 backdrop-blur-md p-1 rounded-md">
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
            <div className="h-[3] bg-white/10 overflow-hidden relative w-full">
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
                "text-sm font-semibold   leading-snug line-clamp-1 truncate mb-1.5 text-white/95"
              )}
              title={lec.title.replace(/^[0-9]+[\s_\-]*/, '').replace(/_/g, ' ').replace(/\.[^/.]+$/, '')}
            >
              {lec.title.replace(/^[0-9]+[\s_\-]*/, '').replace(/_/g, ' ').replace(/\.[^/.]+$/, '')}
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
    .slice(0, 4);
  if (recent.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-primary">Continue Watching</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recent.map(lec => {
          const watchedPct = lec.duration > 0 ? Math.min(Math.round((lec.last_position / lec.duration) * 100), 99) : 0;
          const imgSrc = lec.thumbnail || subject.default_lecture_thumbnail || subject.cover_image;
          const cleanTitle = lec.title.replace(/^[0-9]+[\s_\-]*/, '').replace(/_/g, ' ').replace(/\.[^/.]+$/, '');
          return (
            <Link key={lec.id} href={`/courses/${subject.id}/watch/${lec.id}`}>
              <div className="flex-shrink-0 w-52 rounded-xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden hover:border-indigo-500/40 transition-all group cursor-pointer">
                <div className="relative h-20 bg-black/30">
                  {imgSrc
                    ? <img src={imgSrc} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-indigo-400/40" /></div>
                  }
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="w-8 h-8 text-white/80" />
                  </div>
                </div>
                <div className="h-0.5 bg-black/20">
                  <div className="h-full bg-indigo-400" style={{ width: `${watchedPct}%` }} />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-medium text-primary line-clamp-1" title={cleanTitle}>{cleanTitle}</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5 flex items-center gap-1">
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
  const [tab, setTab] = useState("Lectures");
  const [showAdd, setShowAdd] = useState(false);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [folderLoaded, setFolderLoaded] = useState(false);
  const [newLecture, setNewLecture] = useState({ title: "", file_path: "", duration: 0 });
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => { setFolderLoaded(folderStore.hasSubject(id, "course")); }, [id]);

  const loadData = async () => {
    const r = await apiFetch(`/api/courses/${id}`);
    const d = await r.json();
    setData(d);
    setLoading(false);
  };

  const reconnectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      await folderStore.loadFromHandle(handle, id, "course");
      setFolderLoaded(true);
      toast.success("Folder connected — videos ready");
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Could not open folder");
    }
  };

  const addLecture = async () => {
    if (!newLecture.title.trim()) return;
    await apiFetch(`/api/courses/${id}/lectures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newLecture, order_index: data?.lectures?.length || 0 }),
    });
    toast.success("Lecture added");
    setNewLecture({ title: "", file_path: "", duration: 0 });
    setShowAdd(false);
    loadData();
  };

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

  if (loading) return <div className="p-6 shimmer h-96 rounded-xl m-6" />;
  if (!data?.subject) return <div className="p-6 text-muted">Course not found</div>;

  const { subject, lectures = [], materials = [] } = data;
  const color = subject.color || subjectColor(subject.name);
  const progress = subject.total_lectures > 0 ? pct(subject.completed_lectures, subject.total_lectures) : 0;

  const completedCount = lectures.filter(l => l.is_completed).length;
  const inProgressCount = lectures.filter(l => !l.is_completed && l.last_position > 0).length;
  const notStartedCount = lectures.filter(l => !l.is_completed && !l.last_position).length;
  const totalDuration = lectures.reduce((acc, l) => acc + (l.duration || 0), 0);

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
        {showFolderImport && (
          <FolderImport
            subjectId={id}
            onImported={() => { loadData(); }}
            onClose={() => setShowFolderImport(false)}
          />
        )}
      </AnimatePresence>

      {/* Back */}
      <Link href="/courses" className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border overflow-hidden mb-6 relative group" style={{ borderColor: `${color}25` }}>
        {/* Course Cover & Thumbnail Buttons */}
        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
           <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90 hover:text-white hover:bg-black/70 cursor-pointer transition-all shadow-lg">
             <Film className="w-3.5 h-3.5 text-indigo-400" />
             {subject.default_lecture_thumbnail ? "Change lectures thumbnail" : "Set lectures thumbnail"}
             <input type="file" accept="image/*" className="hidden" onChange={updateLecturesThumbnail} />
           </label>
           <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-xs font-medium text-white/90 hover:text-white hover:bg-black/70 cursor-pointer transition-all shadow-lg">
             <ImagePlus className="w-3.5 h-3.5" />
             {subject.cover_image ? "Change cover" : "Add cover"}
             <input type="file" accept="image/*" className="hidden" onChange={updateCourseCover} />
           </label>
        </div>

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
              <h1 className="font-display text-2xl font-bold text-white drop-shadow-md">{subject.name}</h1>
              {subject.description && <p className="text-white/80 text-sm mt-1 drop-shadow-md">{subject.description}</p>}

              {/* Stats row */}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-semibold">{completedCount}</span>
                  <span className="text-white/70">completed</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <PlayCircle className="w-4 h-4 text-indigo-400" />
                  <span className="text-white font-semibold">{inProgressCount}</span>
                  <span className="text-white/70">in progress</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                  <Film className="w-4 h-4 text-white/50" />
                  <span className="text-white font-semibold">{notStartedCount}</span>
                  <span className="text-white/70">not started</span>
                </div>
                {totalDuration > 0 && (
                  <div className="flex items-center gap-1.5 text-sm drop-shadow-md">
                    <Clock className="w-4 h-4 text-white/50" />
                    <span className="text-white font-semibold">{formatDuration(totalDuration)}</span>
                    <span className="text-white/70">total</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm font-mono ml-auto bg-indigo-600/10 backdrop-blur-md  px-4 py-2  rounded-md font-medium " style={{color}}>
                 Progress: {progress}%
                </div>
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

              {/* Folder status */}
              {!folderLoaded && lectures.length > 0 && (
                <button
                  onClick={reconnectFolder}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/15 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Reconnect folder to play videos
                </button>
              )}
              {folderLoaded && (
                <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Folder connected
                </p>
              )}
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
                  className={cn("px-2.5 py-1 rounded text-xs font-medium transition-all",
                    viewMode === "grid" ? "bg-indigo-600 text-white" : "text-muted hover:text-primary"
                  )}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("px-2.5 py-1 rounded text-xs font-medium transition-all",
                    viewMode === "list" ? "bg-indigo-600 text-white" : "text-muted hover:text-primary"
                  )}
                >
                  List
                </button>
              </div>
              <button
                onClick={() => setShowFolderImport(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-default bg-elevated hover:bg-overlay text-secondary hover:text-primary text-sm transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Import
              </button>
              <button
                onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showAdd && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="card-surface p-4 border-indigo-500/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Title *</label>
                      <input
                        autoFocus
                        value={newLecture.title}
                        onChange={e => setNewLecture(v => ({ ...v, title: e.target.value }))}
                        placeholder="Lecture title"
                        className="input-base"
                        onKeyDown={e => e.key === "Enter" && addLecture()}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">File Path (local)</label>
                      <input
                        value={newLecture.file_path}
                        onChange={e => setNewLecture(v => ({ ...v, file_path: e.target.value }))}
                        placeholder="/path/to/video.mp4"
                        className="input-base font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={addLecture} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">Add</button>
                    <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lecture list / grid */}
          {lectures.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <Film className="w-12 h-12 text-muted" />
              <div className="text-center">
                <p className="text-secondary font-medium">No lectures yet</p>
                <p className="text-sm text-muted mt-1">Add individually or import an entire folder at once</p>
              </div>
              <button
                onClick={() => setShowFolderImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm hover:bg-indigo-500/25 transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Import Folder
              </button>
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
                  subjectCoverImage={subject.cover_image}
                  subjectLectureThumbnail={subject.default_lecture_thumbnail}
                  onToggleComplete={toggleLectureComplete}
                />
              ))}
            </div>
          ) : (
            /* List view (Grid of 3 items per row) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lectures.map((lec, i) => {
                const stat = lectureStat(lec);
                const watchedPct = lec.duration > 0 && lec.last_position > 0
                  ? Math.min(Math.round((lec.last_position / lec.duration) * 100), 99)
                  : 0;
                const cleanTitle = lec.title.replace(/^[0-9]+[\s_\-]*/, '').replace(/_/g, ' ').replace(/\.[^/.]+$/, '');
                return (
                  <motion.div
                    key={lec.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="group relative"
                  >
                    <Link href={`/courses/${id}/watch/${lec.id}`}>
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
                          {(lec.thumbnail || subject.default_lecture_thumbnail || subject.cover_image)
                            ? <img src={lec.thumbnail || subject.default_lecture_thumbnail || subject.cover_image} alt="" className="w-full h-full object-cover" />
                            : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-mono font-bold text-muted" style={{ background: `${color}15` }}>
                                {stat === "completed" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : i + 1}
                              </div>
                            )
                          }
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
          <h2 className="font-display font-semibold text-primary">Course Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(() => {
              const MATERIAL_EXTS = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "webp"];
              const files = folderStore.getFilesForSubject(id, "course")
                .filter(fname => MATERIAL_EXTS.includes(fname.split('.').pop()?.toLowerCase()))
                .map((fname, i) => ({
                  id: `folder-${i}`,
                  title: fname.replace(/\.[^.]+$/, ""),
                  file_path: fname,
                  url: folderStore.get(fname)
                }));

              if (files.length === 0) {
                return (
                  <div className="col-span-full flex flex-col items-center py-16 gap-4">
                    <FileText className="w-12 h-12 text-muted" />
                    <div className="text-center">
                      <p className="text-secondary font-medium">No materials found in folder</p>
                      <p className="text-sm text-muted mt-1">Connect the course folder containing PDFs or images</p>
                    </div>
                  </div>
                );
              }

              return files.map((m, i) => {
                const ext = m.file_path.split('.').pop()?.toLowerCase();
                const isImg = ["jpg", "jpeg", "png", "webp"].includes(ext);
                const isDoc = ["doc", "docx", "txt"].includes(ext);
                
                let Icon = FileIcon;
                let iconStyle = "bg-indigo-500/10 text-indigo-400";
                
                if (ext === "pdf") {
                  Icon = FileText;
                  iconStyle = "bg-rose-500/10 text-rose-400";
                } else if (isImg) {
                  Icon = ImageIcon;
                  iconStyle = "bg-emerald-500/10 text-emerald-400";
                } else if (isDoc) {
                  Icon = FileText;
                  iconStyle = "bg-blue-500/10 text-blue-400";
                }

                const cleanTitle = m.title.replace(/^[0-9]+[\s_\-]*/, '').replace(/_/g, ' ');

                return (
                  <motion.a
                    key={m.id}
                    href={m.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-xl border card-surface hover:border-indigo-500/50 cursor-pointer group"
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", iconStyle)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-primary truncate" title={cleanTitle}>{cleanTitle}</p>
                      <p className="text-xs text-muted truncate mt-0.5 uppercase font-mono">{ext} Document</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted group-hover:text-indigo-400 transition-colors" />
                  </motion.a>
                );
              });
            })()}
          </div>
        </div>
      )}

      {tab === "Syllabus" && <SyllabusPanel subjectId={id} />}
      {tab === "Notes" && <NotesPanel subjectId={id} />}
    </div>
  );
}