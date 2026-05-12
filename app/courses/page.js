"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, BookOpen, Trash2, ChevronRight, Search, Film,
  CheckCircle2, Clock, PlayCircle, MoreVertical, ImagePlus,
  X, Palette, AlignLeft, Loader2, Edit2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, pct, subjectColor, truncate, formatDuration } from "../../lib/utils";
import { CHART_COLORS } from "../../lib/constants";

// ─── helpers ─────────────────────────────────────────────────────────────────
function statusBadge(progress) {
  if (progress === 100) return { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" };
  if (progress > 0)     return { label: "In Progress", color: "text-indigo-400",  bg: "bg-indigo-500/15  border-indigo-500/25" };
  return                       { label: "Not Started", color: "text-zinc-400",    bg: "bg-zinc-500/10   border-zinc-500/20"  };
}

// ─── Image picker ─────────────────────────────────────────────────────────────
function ImagePickerButton({ value, onChange, label = "Cover image" }) {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-xs text-muted mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <div
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-16 h-10 rounded-lg border border-dashed border-default flex items-center justify-center cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all overflow-hidden flex-shrink-0",
          )}
        >
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover rounded-lg" />
            : <ImagePlus className="w-4 h-4 text-muted" />
          }
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-indigo-400 hover:text-indigo-300 text-left"
          >
            {value ? "Change image" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs text-muted hover:text-red-400 text-left"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => onChange(ev.target.result);
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Course card ─────────────────────────────────────────────────────────────
function CourseCard({ sub, onDelete, onEdit, onImageChange, onThumbnailChange, i }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const menuRef = useRef(null);
  const imgInputRef = useRef(null);
  const thumbInputRef = useRef(null);

  const progress = sub.total_lectures > 0 ? pct(sub.completed_lectures, sub.total_lectures) : 0;
  const color = sub.color || subjectColor(sub.name);
  const status = statusBadge(progress);
  const hasBg = !!sub.cover_image;

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await onImageChange(sub.id, ev.target.result);
      setImgLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setMenuOpen(false);
  };

  const handleThumbUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await onThumbnailChange(sub.id, ev.target.result);
      setThumbLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setMenuOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="group relative h-auto"
    >
      <Link href={`/courses/${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
        <div className={cn(
          "relative w-full rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300 flex flex-col",
          "hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-500/30",
          "border-default bg-surface"
        )}>
          {/* Top Image Layer */}
          <div className="relative w-full h-32 bg-black/20">
            {hasBg ? (
              <img
                src={sub.cover_image}
                alt={sub.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-700 group-hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)` }}
              >
                <BookOpen className="w-16 h-16 opacity-10" style={{ color }} />
              </div>
            )}
            {/* Gradient Overlay for Top Badges */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Top Row: Badges & Menus (Inside image area) */}
            <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-start z-10">
              {/* Status pill */}
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-sm transition-colors",
                progress === 100 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-300 dark:bg-emerald-500/20" :
                progress > 0 ? "bg-indigo-500/15 text-indigo-600 border-indigo-500/25 dark:text-indigo-300 dark:bg-indigo-500/20" :
                "bg-black/40 text-white/70 border-white/10"
              )}>
                {progress === 100
                  ? <CheckCircle2 className="w-3.5 h-3.5" />
                  : progress > 0
                  ? <PlayCircle className="w-3.5 h-3.5" />
                  : <Clock className="w-3.5 h-3.5" />
                }
                {status.label}
              </div>

              {/* Three-dot menu */}
              <div ref={menuRef} onClick={e => e.stopPropagation()} className="relative">
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); setMenuOpen(v => !v); }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-10 z-30 bg-elevated border border-default rounded-xl shadow-2xl min-w-[160px] overflow-hidden py-1"
                    >
                      <button
                        onClick={(e) => { e.preventDefault(); onEdit(sub); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-secondary hover:bg-overlay hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit course
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); onDelete(sub.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete course
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Bottom Info Strip */}
          <div className="w-full p-3 bg-surface z-10 relative">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-primary text-[15px] leading-tight line-clamp-1">{sub.name}</h3>
                {sub.description ? (
                  <p className="text-[11px] text-muted truncate mt-1">{sub.description}</p>
                ) : (
                  <p className="text-[11px] text-muted opacity-50 mt-1">Course materials</p>
                )}
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-[13px] font-mono font-bold" style={{ color: progress === 100 ? "#34d399" : color }}>
                  {progress}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-muted mb-3 overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: i * 0.04 + 0.3, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                style={{ background: progress === 100 ? "#34d399" : color }}
              />
            </div>

            {/* Meta Stats */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-secondary">
              <span className="flex items-center gap-1">
                <Film className="w-3 h-3 opacity-60" />
                {sub.completed_lectures}/{sub.total_lectures}
              </span>
              {sub.total_duration > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-default" />
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 opacity-60" />
                    {formatDuration(sub.total_duration)}
                  </span>
                </>
              )}
              <span className="ml-auto flex items-center gap-0.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300">
                Start <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Image loading */}
          {(imgLoading || thumbLoading) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all | inprogress | completed | notstarted
  const [editingSubject, setEditingSubject] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: "", description: "", color: CHART_COLORS[0], cover_image: null
  });

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    const r = await apiFetch("/api/courses");
    const d = await r.json();
    setSubjects(d.subjects || []);
    setLoading(false);
  };

  const createSubject = async () => {
    if (!newSubject.name.trim()) return;
    try {
      await apiFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubject),
      });
      toast.success("Course added!");
      setNewSubject({ name: "", description: "", color: CHART_COLORS[0], cover_image: null });
      setShowAdd(false);
      loadSubjects();
    } catch { toast.error("Failed to add course"); }
  };

  const deleteSubject = async (id) => {
    if (!confirm("Delete this course and all its lectures?")) return;
    await apiFetch(`/api/courses/${id}`, { method: "DELETE" });
    toast.success("Course deleted");
    loadSubjects();
  };

  const saveEditedSubject = async () => {
    if (!editingSubject.name.trim()) return;
    try {
      await apiFetch(`/api/courses/${editingSubject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingSubject.name,
          description: editingSubject.description,
          color: editingSubject.color,
          cover_image: editingSubject.cover_image,
        }),
      });
      toast.success("Course updated!");
      setEditingSubject(null);
      loadSubjects();
    } catch { toast.error("Failed to update course"); }
  };

  const updateCoverImage = async (id, imageData) => {
    try {
      await apiFetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_image: imageData }),
      });
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, cover_image: imageData } : s));
      toast.success(imageData ? "Course cover updated" : "Course cover removed");
    } catch { toast.error("Failed to update course cover"); }
  };

  const updateThumbnailImage = async (id, imageData) => {
    try {
      await apiFetch(`/api/courses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_lecture_thumbnail: imageData }),
      });
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, default_lecture_thumbnail: imageData } : s));
      toast.success(imageData ? "Lectures thumbnail updated" : "Lectures thumbnail removed");
    } catch { toast.error("Failed to update lectures thumbnail"); }
  };

  // Filtering
  const filtered = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const progress = s.total_lectures > 0 ? pct(s.completed_lectures, s.total_lectures) : 0;
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "completed" ? progress === 100 :
      filterStatus === "inprogress" ? progress > 0 && progress < 100 :
      filterStatus === "notstarted" ? progress === 0 :
      true;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: subjects.length,
    inprogress: subjects.filter(s => { const p = pct(s.completed_lectures, s.total_lectures); return p > 0 && p < 100; }).length,
    completed: subjects.filter(s => pct(s.completed_lectures, s.total_lectures) === 100).length,
    notstarted: subjects.filter(s => pct(s.completed_lectures, s.total_lectures) === 0).length,
  };

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "inprogress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "notstarted", label: "Not Started" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Courses</h1>
          <p className="text-secondary mt-1">{subjects.length} subjects · manage your learning materials</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors glow-accent"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* Search + filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="input-base pl-9 w-56"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                filterStatus === f.key ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary"
              )}
            >
              {f.label}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                filterStatus === f.key ? "bg-white/20 text-white" : "bg-elevated text-muted"
              )}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Add course panel */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="card-surface p-5 border-indigo-500/20">
              <h3 className="font-display font-semibold text-primary mb-4">New Course</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Subject Name *</label>
                  <input
                    autoFocus
                    value={newSubject.name}
                    onChange={e => setNewSubject(v => ({ ...v, name: e.target.value }))}
                    placeholder="e.g. Physics, Mathematics"
                    className="input-base"
                    onKeyDown={e => e.key === "Enter" && createSubject()}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Description</label>
                  <input
                    value={newSubject.description}
                    onChange={e => setNewSubject(v => ({ ...v, description: e.target.value }))}
                    placeholder="Optional description"
                    className="input-base"
                  />
                </div>

                {/* Cover image */}
                <ImagePickerButton
                  value={newSubject.cover_image}
                  onChange={img => setNewSubject(v => ({ ...v, cover_image: img }))}
                />

                <div>
                  <label className="block text-xs text-muted mb-1.5">Accent Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {CHART_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewSubject(v => ({ ...v, color: c }))}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-transform",
                          newSubject.color === c ? "border-white scale-125" : "border-transparent"
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview mini card */}
              {newSubject.name && (
                <div className="mt-4">
                  <p className="text-xs text-muted mb-2">Preview</p>
                  <div className="w-48 rounded-xl border border-white/8 overflow-hidden bg-surface">
                    <div className="h-16 relative overflow-hidden">
                      {newSubject.cover_image
                        ? <img src={newSubject.cover_image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center" style={{ background: `${newSubject.color}20` }}>
                            <BookOpen className="w-6 h-6 opacity-20" style={{ color: newSubject.color }} />
                          </div>
                      }
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold text-primary truncate">{newSubject.name}</p>
                      <div className="w-full h-1 rounded-full bg-white/8 mt-1.5">
                        <div className="h-full w-0 rounded-full" style={{ background: newSubject.color }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={createSubject}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                  Create Course
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-lg border border-default text-secondary hover:text-primary text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit course modal */}
      <AnimatePresence>
        {editingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-surface p-6 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setEditingSubject(null)}
                className="absolute top-4 right-4 text-muted hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-display font-semibold text-primary mb-4 text-lg">Edit Course</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1.5">Subject Name *</label>
                  <input
                    autoFocus
                    value={editingSubject.name}
                    onChange={e => setEditingSubject(v => ({ ...v, name: e.target.value }))}
                    className="input-base"
                    onKeyDown={e => e.key === "Enter" && saveEditedSubject()}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Description</label>
                  <input
                    value={editingSubject.description || ""}
                    onChange={e => setEditingSubject(v => ({ ...v, description: e.target.value }))}
                    className="input-base"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Accent Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {CHART_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditingSubject(v => ({ ...v, color: c }))}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-transform",
                          editingSubject.color === c ? "border-white scale-125" : "border-transparent"
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1.5">Course Cover Image (Optional)</label>
                  <ImagePickerButton value={editingSubject.cover_image} onChange={v => setEditingSubject(prev => ({ ...prev, cover_image: v }))} label="" />
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-default">
                  <button
                    onClick={saveEditedSubject}
                    className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditingSubject(null)}
                    className="flex-1 py-2 rounded-xl border border-default text-secondary hover:text-primary text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl shimmer bg-elevated" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <BookOpen className="w-12 h-12 text-muted" />
          <h3 className="font-display text-xl font-semibold text-secondary">
            {search ? "No matching courses" : "No courses yet"}
          </h3>
          <p className="text-muted text-sm">
            {search ? "Try a different search" : "Add your first course to start learning"}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">
              Add Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((sub, i) => (
            <CourseCard
              key={sub.id}
              sub={sub}
              i={i}
              onDelete={deleteSubject}
              onEdit={setEditingSubject}
              onImageChange={updateCoverImage}
              onThumbnailChange={updateThumbnailImage}
            />
          ))}
        </div>
      )}
    </div>
  );
}