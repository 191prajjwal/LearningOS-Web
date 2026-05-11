"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pin, Search, StickyNote, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, formatDuration } from "../../lib/utils";

export default function NotesPanel({ subjectId, lectureId = null }) {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => { load(); }, [subjectId, lectureId]);

  const load = async () => {
    const r = await apiFetch("/api/db?q=notes");
    const d = await r.json();
    let filtered = (d.notes || []).filter(n => String(n.subject_id) === String(subjectId));
    if (lectureId) filtered = filtered.filter(n => String(n.lecture_id) === String(lectureId));
    setNotes(filtered);
  };

  const add = async () => {
    if (!content.trim()) return;
    await apiFetch("/api/db?q=note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_id: subjectId,
        lecture_id: lectureId,
        content: content.trim(),
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      }),
    });
    setContent("");
    setTags("");
    toast.success("Note saved");
    load();
  };

  const remove = async (id) => {
    await apiFetch(`/api/db?q=note&id=${id}`, { method: "DELETE" });
    load();
  };

  const filtered = notes.filter(n =>
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.tags && n.tags.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-primary">Notes</h2>
        <span className="text-xs text-muted">{notes.length} notes</span>
      </div>

      {/* Add note */}
      <div className="card-surface p-4 space-y-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className="input-base resize-none"
        />
        <div className="flex gap-2">
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="input-base flex-1"
          />
          <button
            onClick={add}
            disabled={!content.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="input-base pl-9"
        />
      </div>

      {/* Notes */}
      <div className="space-y-3">
        {filtered.map(note => (
          <div key={note.id} className="card-surface p-4 group relative">
            <p className="text-sm text-secondary leading-relaxed">{note.content}</p>
            {note.timestamp !== null && (
              <div className="flex items-center gap-1 mt-2 text-xs text-indigo-400">
                <Clock className="w-3 h-3" /> {formatDuration(note.timestamp)} · {note.lecture_title}
              </div>
            )}
            {note.tags && note.tags !== "[]" && (
              <div className="flex flex-wrap gap-1 mt-2">
                {JSON.parse(note.tags).map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted mt-2">{formatDate(note.created_at)}</p>
            <button
              onClick={() => remove(note.id)}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-muted hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-8 gap-2">
            <StickyNote className="w-8 h-8 text-muted" />
            <p className="text-sm text-muted">{search ? "No matching notes" : "No notes yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
