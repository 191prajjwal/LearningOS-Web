"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, PenTool, FolderOpen, Trash2, Edit2, ChevronRight, Search, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, pct, subjectColor, truncate } from "../../lib/utils";
import { CHART_COLORS } from "../../lib/constants";

export default function DppsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [newSubject, setNewSubject] = useState({ name: "", description: "", color: CHART_COLORS[0] });

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
      toast.success("Subject added!");
      setNewSubject({ name: "", description: "", color: CHART_COLORS[0] });
      setShowAdd(false);
      loadSubjects();
    } catch { toast.error("Failed to add subject"); }
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Daily Practice Problems</h1>
          <p className="text-secondary mt-1">{subjects.length} subjects · manage your practice questions</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors glow-accent"
        >
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects..."
          className="input-base pl-9 w-full max-w-sm"
        />
      </div>

      {/* Add course modal */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface p-5 mb-6 border-indigo-500/20"
        >
          <h3 className="font-display font-semibold text-primary mb-4">New Subject</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">Subject Name *</label>
              <input
                autoFocus
                value={newSubject.name}
                onChange={e => setNewSubject(v => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Physics, Mathematics"
                className="input-base"
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
            <div>
              <label className="block text-xs text-muted mb-1.5">Color</label>
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
          <div className="flex gap-3 mt-4">
            <button onClick={createSubject} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Create Subject
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary hover:text-primary text-sm transition-colors">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Courses grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl shimmer bg-elevated" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <PenTool className="w-12 h-12 text-muted" />
          <h3 className="font-display text-xl font-semibold text-secondary">
            {search ? "No matching subjects" : "No subjects yet"}
          </h3>
          <p className="text-muted text-sm">
            {search ? "Try a different search" : "Add your first subject to start practicing"}
          </p>
          {!search && (
            <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">
              Add Subject
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub, i) => {
            const color = sub.color || subjectColor(sub.name);
            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/dpps/${sub.id}`}>
                  <div className="card-surface p-5 hover:border-strong transition-all cursor-pointer group h-full">
                    {/* Color bar */}
                    <div className="w-full h-1.5 rounded-full mb-4" style={{ background: `${color}30` }}>
                      <div className="h-full rounded-full transition-all w-full" style={{ background: color }} />
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}20` }}
                      >
                        <PenTool className="w-5 h-5" style={{ color }} />
                      </div>
                    </div>

                    <h3 className="font-display font-semibold text-primary mb-1">{sub.name}</h3>
                    {sub.description && (
                      <p className="text-xs text-muted mb-3">{truncate(sub.description, 60)}</p>
                    )}

                    <div className="flex items-center gap-1 mt-auto text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open DPPs <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
