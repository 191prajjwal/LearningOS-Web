"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { Plus, Check, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn, pct } from "../../lib/utils";

export default function SyllabusPanel({ subjectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ chapter: "", topic: "", weightage: "" });

  useEffect(() => { load(); }, [subjectId]);

  const load = async () => {
    const r = await apiFetch(`/api/courses/${subjectId}`);
    const d = await r.json();
    setItems(d.syllabus || []);
    setLoading(false);
  };

  const add = async () => {
    if (!form.chapter.trim()) return;
    await apiFetch(`/api/courses/${subjectId}/syllabus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, subject_id: subjectId }),
    });
    setForm({ chapter: "", topic: "", weightage: "" });
    setShowAdd(false);
    toast.success("Added to syllabus");
    load();
  };

  const toggle = async (id) => {
    await apiFetch(`/api/courses/${subjectId}/syllabus/${id}/toggle`, { method: "POST" });
    load();
  };

  const remove = async (id) => {
    await apiFetch(`/api/courses/${subjectId}/syllabus/${id}`, { method: "DELETE" });
    load();
  };

  const completed = items.filter(i => i.is_completed).length;
  const progress = pct(completed, items.length);

  // Group by chapter
  const grouped = items.reduce((acc, item) => {
    const ch = item.chapter || "Uncategorized";
    if (!acc[ch]) acc[ch] = [];
    acc[ch].push(item);
    return acc;
  }, {});

  if (loading) return <div className="h-40 shimmer rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-primary">Syllabus</h2>
          <p className="text-xs text-muted mt-0.5">{completed}/{items.length} topics completed · {progress}%</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Topic
        </button>
      </div>

      {items.length > 0 && (
        <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {showAdd && (
        <div className="card-surface p-4 border-indigo-500/20">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-muted mb-1">Chapter / Topic *</label>
              <input value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))} placeholder="e.g. Laws of Motion" className="input-base" autoFocus />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Sub-topic</label>
              <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="Optional" className="input-base" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={add} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([chapter, chItems]) => {
          const done = chItems.filter(i => i.is_completed).length;
          return (
            <div key={chapter}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-sm text-secondary">{chapter}</h3>
                <span className="text-xs text-muted">{done}/{chItems.length}</span>
              </div>
              <div className="space-y-1.5 pl-3 border-l-2 border-default">
                {chItems.map(item => (
                  <div key={item.id} className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors group",
                    item.is_completed ? "opacity-60" : "hover:bg-elevated"
                  )}>
                    <button
                      onClick={() => toggle(item.id)}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all",
                        item.is_completed ? "bg-green-500 border-green-500" : "border-default hover:border-indigo-400"
                      )}
                    >
                      {item.is_completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", item.is_completed && "line-through text-muted")}>
                        {item.topic || item.chapter}
                      </p>
                      {item.weightage > 0 && (
                        <span className="text-xs text-muted">{item.weightage}% weightage</span>
                      )}
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-muted hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {items.length === 0 && !showAdd && (
          <div className="flex flex-col items-center py-10 gap-3">
            <p className="text-secondary text-sm">Syllabus is empty</p>
            <button onClick={() => setShowAdd(true)} className="text-indigo-400 text-sm hover:underline">Add your first topic</button>
          </div>
        )}
      </div>
    </div>
  );
}
