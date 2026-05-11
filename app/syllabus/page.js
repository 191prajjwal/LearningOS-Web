"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit2, Check, X, FileText,
  Upload, Eye, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn, subjectColor } from "../../lib/utils";

const COLOR_OPTIONS = [
  "#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316",
  "#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6",
];

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState([]);
  const [pdfData, setPdfData] = useState("");
  const [showPdf, setShowPdf] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", color: COLOR_OPTIONS[0], description: "", weightage: "" });
  const [editForm, setEditForm] = useState({});
  const pdfInputRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [sr, pr] = await Promise.all([
      apiFetch("/api/exam-subjects").then(r => r.json()),
      apiFetch("/api/syllabus-pdf").then(r => r.json()),
    ]);
    setSubjects(sr.subjects || []);
    setPdfData(pr.pdf_data || "");
  };

  const add = async () => {
    if (!form.name.trim()) { toast.error("Subject name required"); return; }
    const res = await apiFetch("/api/exam-subjects", {
      method: "POST",
      body: JSON.stringify({ ...form, weightage: parseFloat(form.weightage) || 0 }),
    });
    if (!res.ok) { toast.error("Failed to add"); return; }
    toast.success("Subject added");
    setForm({ name: "", color: COLOR_OPTIONS[0], description: "", weightage: "" });
    setShowAdd(false);
    loadAll();
  };

  const saveEdit = async (id) => {
    const res = await apiFetch(`/api/exam-subjects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...editForm, weightage: parseFloat(editForm.weightage) || 0 }),
    });
    if (!res.ok) { toast.error("Failed to save"); return; }
    toast.success("Saved");
    setEditId(null);
    loadAll();
  };

  const del = async (id, name) => {
    if (!confirm(`Remove "${name}"? This only removes it from the syllabus list.`)) return;
    const res = await apiFetch(`/api/exam-subjects/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    toast.success("Removed");
    loadAll();
  };

  const handlePdfUpload = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files supported"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const res = await apiFetch("/api/syllabus-pdf", {
        method: "PUT",
        body: JSON.stringify({ pdf_data: e.target.result }),
      });
      if (!res.ok) { toast.error("Failed to save PDF"); return; }
      toast.success("Syllabus PDF saved");
      loadAll();
    };
    reader.readAsDataURL(file);
  };

  const removePdf = async () => {
    if (!confirm("Remove syllabus PDF?")) return;
    await apiFetch("/api/syllabus-pdf", { method: "PUT", body: JSON.stringify({ pdf_data: "" }) });
    toast.success("PDF removed");
    loadAll();
  };

  const totalWeight = subjects.reduce((s, x) => s + (parseFloat(x.weightage) || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Syllabus</h1>
          <p className="text-secondary mt-1">Manage exam subjects and syllabus PDF · separate from Courses</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </div>

      {/* Syllabus PDF section */}
      <div className="card-surface p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h3 className="font-display font-semibold text-primary">Syllabus PDF</h3>
        </div>
        {pdfData ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setShowPdf(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm transition-colors">
              <Eye className="w-4 h-4" /> View PDF
            </button>
            <button onClick={() => pdfInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-elevated text-muted hover:text-primary text-sm transition-colors">
              <Upload className="w-4 h-4" /> Replace
            </button>
            <button onClick={removePdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-500/10 text-muted hover:text-red-400 text-sm transition-colors">
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </div>
        ) : (
          <button onClick={() => pdfInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-default hover:border-indigo-500/40 hover:bg-indigo-500/5 text-muted hover:text-indigo-400 text-sm transition-all w-full justify-center">
            <Upload className="w-4 h-4" /> Upload syllabus PDF
          </button>
        )}
        <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden"
          onChange={e => { handlePdfUpload(e.target.files[0]); e.target.value = ""; }} />
        <p className="text-xs text-muted mt-2">Stored locally · sent to AI for analysis · max 10MB</p>
      </div>

      {/* Add subject form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="card-surface p-5 mb-6">
            <h3 className="font-display font-semibold text-primary mb-4">New Subject</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs text-muted mb-1">Name *</label>
                <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && add()} placeholder="e.g. Mathematics" className="input-base" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Weightage (%)</label>
                <input type="number" value={form.weightage} onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))}
                  placeholder="e.g. 25" className="input-base" min="0" max="100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-1">Description (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description" className="input-base" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-muted mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn("w-7 h-7 rounded-full transition-all border-2",
                        form.color === c ? "border-white scale-110" : "border-transparent")}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={add} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm">Add Subject</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weightage bar */}
      {totalWeight > 0 && (
        <div className="card-surface p-4 mb-4">
          <p className="text-xs text-muted mb-2">Weightage distribution</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {subjects.filter(s => parseFloat(s.weightage) > 0).map(s => (
              <div key={s.id} style={{ width: `${(parseFloat(s.weightage) / Math.max(totalWeight, 100)) * 100}%`, backgroundColor: s.color || subjectColor(s.name) }}
                title={`${s.name}: ${s.weightage}%`} className="rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {subjects.filter(s => parseFloat(s.weightage) > 0).map(s => (
              <span key={s.id} className="text-xs text-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color || subjectColor(s.name) }} />
                {s.name} {s.weightage}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {subjects.length === 0 && !showAdd && (
        <div className="flex flex-col items-center py-12 gap-4">
          <BookOpen className="w-12 h-12 text-muted" />
          <p className="text-secondary font-medium">No subjects yet</p>
          <p className="text-muted text-sm text-center max-w-sm">Add your exam subjects. They appear in dropdowns across Planner, Tests, and AI — completely separate from Courses.</p>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500">Add first subject</button>
        </div>
      )}

      {/* Subject list */}
      <div className="space-y-3">
        {subjects.map(subject => (
          <motion.div key={subject.id} layout className="card-surface p-4">
            {editId === subject.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted mb-1">Name</label>
                    <input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input-base" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Weightage (%)</label>
                    <input type="number" value={editForm.weightage || ""} onChange={e => setEditForm(f => ({ ...f, weightage: e.target.value }))} className="input-base" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-1">Description</label>
                    <input value={editForm.description || ""} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="input-base" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-muted mb-2">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} onClick={() => setEditForm(f => ({ ...f, color: c }))}
                          className={cn("w-6 h-6 rounded-full border-2 transition-all", editForm.color === c ? "border-white scale-110" : "border-transparent")}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(subject.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => setEditId(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-default text-secondary text-xs">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-white text-sm"
                  style={{ backgroundColor: subject.color || subjectColor(subject.name) }}>
                  {subject.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-semibold text-primary">{subject.name}</p>
                    {parseFloat(subject.weightage) > 0 && (
                      <span className="pill bg-indigo-500/10 text-indigo-400">{subject.weightage}%</span>
                    )}
                  </div>
                  {subject.description && <p className="text-xs text-muted mt-0.5 truncate">{subject.description}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => { setEditId(subject.id); setEditForm({ name: subject.name, color: subject.color || COLOR_OPTIONS[0], description: subject.description || "", weightage: subject.weightage || "" }); }}
                    className="p-1.5 rounded-lg hover:bg-elevated text-muted hover:text-primary transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => del(subject.id, subject.name)}
                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* PDF Viewer Modal */}
      <AnimatePresence>
        {showPdf && pdfData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl h-[85vh] card-surface flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-default flex-shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <p className="font-display font-semibold text-primary">Syllabus PDF</p>
                </div>
                <button onClick={() => setShowPdf(false)} className="text-muted hover:text-primary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe src={pdfData} className="w-full h-full" title="Syllabus PDF" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}