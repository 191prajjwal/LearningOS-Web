"use client";
import { apiFetch } from "../../../lib/api";
import { folderStore } from "../../../lib/folder-store";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Plus, CheckCircle2, Clock, Film, BookOpen,
  ArrowLeft, FolderOpen, FileText, ExternalLink
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, formatDuration, pct, subjectColor } from "../../../lib/utils";
import SyllabusPanel from "../../../components/study/SyllabusPanel";
import NotesPanel from "../../../components/study/NotesPanel";
import FolderImport from "../../../components/ui/FolderImport";

const TABS = ["Lectures", "Materials", "Syllabus", "Notes"];

export default function CoursePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Lectures");
  const [showAdd, setShowAdd] = useState(false);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [folderLoaded, setFolderLoaded] = useState(false);
  const [newLecture, setNewLecture] = useState({ title: "", file_path: "", duration: 0 });

  useEffect(() => { loadData(); }, [id]);

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

  useEffect(() => {
  setFolderLoaded(folderStore.hasSubject(id, "course"));
}, [id]);

  if (loading) return <div className="p-6 shimmer h-96 rounded-xl m-6" />;
  if (!data?.subject) return <div className="p-6 text-muted">Course not found</div>;

  const { subject, lectures = [], materials = [] } = data;
  const color = subject.color || subjectColor(subject.name);
  const progress = subject.total_lectures > 0 ? pct(subject.completed_lectures, subject.total_lectures) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Folder Import Modal */}
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

      {/* Header */}
      <div className="card-surface p-6 mb-6" style={{ borderColor: `${color}30` }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <BookOpen className="w-7 h-7" style={{ color }} />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-primary">{subject.name}</h1>
            {subject.description && <p className="text-secondary text-sm mt-1">{subject.description}</p>}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Film className="w-4 h-4" />
                {subject.completed_lectures}/{subject.total_lectures} completed
              </div>
              <div className="flex items-center gap-1.5 text-sm font-mono" style={{ color }}>
                {progress}%
              </div>
            </div>
            <div className="w-full max-w-sm mt-3 progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
            </div>
            {!folderLoaded && lectures.length > 0 && (
  <button
    onClick={reconnectFolder}
    className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/15 transition-colors w-fit"
  >
    <FolderOpen className="w-3.5 h-3.5" />
    Reconnect folder to play videos
  </button>
)}
{folderLoaded && (
  <p className="mt-2 text-xs text-green-400 flex items-center gap-1">
    <CheckCircle2 className="w-3 h-3" /> Folder connected
  </p>
)}
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

      {/* Tab content */}
      {tab === "Lectures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-primary">{lectures.length} Lectures</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFolderImport(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-default bg-elevated hover:bg-overlay text-secondary hover:text-primary text-sm transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" /> Import Folder
              </button>
              <button
                onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Lecture
              </button>
            </div>
          </div>

          {showAdd && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-surface p-4 border-indigo-500/20"
            >
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
                <button onClick={addLecture} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">
                  Add
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
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
            ) : (
              lectures.map((lec, i) => (
                <motion.div
                  key={lec.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/courses/${id}/watch/${lec.id}`}>
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                      lec.is_completed
                        ? "bg-green-500/5 border-green-500/15 hover:border-green-500/25"
                        : "card-surface hover:border-strong"
                    )}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-mono font-semibold text-muted bg-elevated">
                        {lec.is_completed
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <span>{i + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", lec.is_completed ? "text-secondary" : "text-primary")}>
                          {lec.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {lec.duration > 0 && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatDuration(lec.duration)}
                            </span>
                          )}
                          {lec.watch_count > 0 && (
                            <span className="text-xs text-muted">{lec.watch_count}× watched</span>
                          )}
                          {lec.last_position > 0 && !lec.is_completed && (
                            <span className="text-xs text-indigo-400">
                              Resume at {formatDuration(lec.last_position)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-indigo-400 text-sm transition-opacity">
                        <Play className="w-4 h-4" /> Watch
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "Materials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-primary">Course Materials</h2>
          </div>
          
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

              return files.map((m, i) => (
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
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-primary truncate">{m.title}</p>
                    <p className="text-xs text-muted truncate mt-0.5">{m.file_path}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted group-hover:text-indigo-400 transition-colors" />
                </motion.a>
              ));
            })()}
          </div>
        </div>
      )}

      {tab === "Syllabus" && <SyllabusPanel subjectId={id} />}
      {tab === "Notes" && <NotesPanel subjectId={id} />}
    </div>
  );
}
