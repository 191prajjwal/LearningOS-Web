"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { Plus, Trash2, Clock, StickyNote, Tag, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDuration } from "../../lib/utils";

export default function VideoNotes({ lectureId, subjectId, currentTime, onSeek }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [withTimestamp, setWithTimestamp] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");

  useEffect(() => { loadNotes(); }, [lectureId]);

  const loadNotes = async () => {
    const r = await apiFetch(`/api/db?q=notes`);
    const d = await r.json();
    const filtered = (d.notes || []).filter(n => String(n.lecture_id) === String(lectureId));
    setNotes(filtered);
  };

  const addNote = async () => {
    if (!content.trim()) return;
    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
    await apiFetch("/api/db?q=note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lecture_id: lectureId,
        subject_id: subjectId,
        content: content.trim(),
        timestamp: withTimestamp ? Math.round(currentTime) : null,
        tags: tagList,
      }),
    });
    toast.success("Note saved");
    setContent("");
    setTags("");
    loadNotes();
  };

  const deleteNote = async (id) => {
    await apiFetch(`/api/db?q=note&id=${id}`, { method: "DELETE" });
    loadNotes();
  };

  const startEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditTags(note.tags && note.tags !== "[]" ? JSON.parse(note.tags).join(", ") : "");
  };

  const saveEdit = async (id) => {
    if (!editContent.trim()) return;
    const tagList = editTags.split(",").map(t => t.trim()).filter(Boolean);
    await apiFetch("/api/db?q=note", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editContent.trim(), tags: JSON.stringify(tagList) }),
    });
    toast.success("Note updated");
    setEditingId(null);
    loadNotes();
  };

  return (
    <div className="flex flex-col h-full bg-surface w-[340px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-default flex-shrink-0">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-indigo-400" />
          <h3 className="font-display font-semibold text-sm text-primary">Lecture Notes</h3>
          <span className="ml-auto text-xs text-muted">{notes.length} notes</span>
        </div>
      </div>

      {/* Add note */}
      <div className="p-3 border-b border-default flex-shrink-0 space-y-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === "Enter" && e.ctrlKey && addNote()}
          placeholder="Take a note... (Ctrl+Enter to save)"
          rows={3}
          className="input-base resize-none text-xs leading-relaxed"
        />
        <div className="flex items-center gap-2">
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="tags, comma-separated"
            className="input-base text-xs flex-1"
          />
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted flex-shrink-0">
            <input
              type="checkbox"
              checked={withTimestamp}
              onChange={e => setWithTimestamp(e.target.checked)}
              className="w-3 h-3"
            />
            <Clock className="w-3 h-3" />
          </label>
          <button
            onClick={addNote}
            disabled={!content.trim()}
            className="flex-shrink-0 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {withTimestamp && (
          <p className="text-xs text-muted">Will be tagged at {formatDuration(currentTime)}</p>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-center">
            <StickyNote className="w-8 h-8 text-muted" />
            <p className="text-xs text-muted">No notes yet.<br />Take your first note above.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="relative group card-surface p-3 space-y-1.5">
              {note.timestamp !== null && (
                <button
                  onClick={() => onSeek(note.timestamp)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  {formatDuration(note.timestamp)}
                </button>
              )}

              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    autoFocus
                    className="input-base resize-none text-xs leading-relaxed w-full"
                  />
                  <input
                    value={editTags}
                    onChange={e => setEditTags(e.target.value)}
                    placeholder="tags, comma-separated"
                    className="input-base text-xs w-full"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => saveEdit(note.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-default text-muted text-xs"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-secondary leading-relaxed pr-12">{note.content}</p>
                  {note.tags && note.tags !== "[]" && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {JSON.parse(note.tags).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 rounded hover:bg-indigo-500/15 text-muted hover:text-indigo-400 transition-all"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 rounded hover:bg-red-500/15 text-muted hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
