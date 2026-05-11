"use client";
import { apiFetch } from "../../lib/api";
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FolderOpen, Film, FileText, Check, X, Edit2, ArrowUp, ArrowDown,
  Upload, Loader2, ChevronRight, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { folderStore } from "../../lib/folder-store";

function naturalSort(a, b) {
  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

const VIDEO_EXTS = ["mp4", "mkv", "webm", "mov", "avi", "m4v", "flv"];
const MATERIAL_EXTS = ["pdf", "doc", "docx", "txt", "jpg", "jpeg", "png", "webp"];

function isVideo(name) {
  return VIDEO_EXTS.includes(name.split(".").pop()?.toLowerCase() || "");
}

function isMaterial(name) {
  return MATERIAL_EXTS.includes(name.split(".").pop()?.toLowerCase() || "");
}

export default function FolderImport({ subjectId, importCategory = "course", onImported, onClose }) {
  const [entries, setEntries] = useState([]);
  const [dirHandle, setDirHandle] = useState(null);
  const [step, setStep] = useState("pick"); // pick | preview | importing | done
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const isSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

  const pickFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      const files = [];
      for await (const entry of handle.values()) {
        if (entry.kind === "file") {
          const isVid = isVideo(entry.name);
          const isMat = isMaterial(entry.name);
          
          if (importCategory === "dpp" && !isMat) continue;
          
          if (isVid || isMat) {
            files.push({
              id: entry.name,
              title: entry.name.replace(/\.[^.]+$/, ""),
              file_name: entry.name,
              type: isVid ? "video" : "material",
              selected: true,
            });
          }
        }
      }
      if (files.length === 0) {
        toast.error("No supported files found in this folder");
        return;
      }
      setDirHandle(handle);
      setEntries(files.sort(naturalSort));
      setStep("preview");
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Could not open folder");
    }
  };

  const toggleSelect = (id) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));

  const commitEdit = (id) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, title: editValue.trim() || e.title } : e));
    setEditingId(null);
  };

  const moveEntry = (id, dir) => {
    setEntries(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(e => e.id === id);
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return arr;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return arr;
    });
  };

  const selectedEntries = entries.filter(e => e.selected);

  const handleImport = async () => {
    if (selectedEntries.length === 0) return toast.error("Select at least one lecture");
    setStep("importing");
    setProgress({ done: 0, total: selectedEntries.length });

    // Clear old items first as requested to prevent duplicates
    try {
      if (importCategory === "dpp") {
        await apiFetch(`/api/courses/${subjectId}/materials?category=dpp`, {
          method: "DELETE",
        });
      } else {
        if (!confirm("This will replace all existing lectures and materials for this course. Proceed?")) {
          setStep("preview");
          return;
        }
        await apiFetch(`/api/courses/${subjectId}/lectures`, { method: "DELETE" });
        await apiFetch(`/api/courses/${subjectId}/materials?category=material`, { method: "DELETE" });
      }
    } catch (err) {
      console.error("Failed to clear old items:", err);
    }
    
    // Load blobs from directory handle with category
    await folderStore.loadFromHandle(dirHandle, subjectId, importCategory);

    let failed = 0;
    for (let i = 0; i < selectedEntries.length; i++) {
      const entry = selectedEntries[i];
      try {
        if (entry.type === "video") {
          let duration = 0;
          try {
            const handle = await dirHandle.getFileHandle(entry.file_name);
            const file = await handle.getFile();
            duration = await new Promise((resolve) => {
              const video = document.createElement("video");
              video.preload = "metadata";
              video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                resolve(Math.round(video.duration) || 0);
              };
              video.onerror = () => {
                URL.revokeObjectURL(video.src);
                resolve(0);
              };
              video.src = URL.createObjectURL(file);
            });
          } catch (e) {
            console.error("Could not fetch duration for", entry.file_name, e);
          }

          await apiFetch(`/api/courses/${subjectId}/lectures`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: entry.title,
              file_path: entry.file_name,
              duration,
              order_index: i,
            }),
          });
        } else {
          await apiFetch(`/api/courses/${subjectId}/materials`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: entry.title,
              file_path: entry.file_name,
              category: importCategory === "dpp" ? "dpp" : "material",
              type: "document",
              order_index: i,
            }),
          });
        }
      } catch { failed++; }
      setProgress({ done: i + 1, total: selectedEntries.length });
    }

    setStep("done");
    if (failed > 0) toast.warning(`Imported ${selectedEntries.length - failed} (${failed} failed)`);
    else toast.success(`Imported ${selectedEntries.length} lectures!`);
    onImported?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card-surface w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-default flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-semibold text-primary">Import Folder</h2>
            <p className="text-xs text-muted">
              {step === "pick" && "Pick a folder — files load directly, no path needed"}
              {step === "preview" && `${entries.length} files found · ${selectedEntries.length} selected`}
              {step === "importing" && `Importing ${progress.done} / ${progress.total}…`}
              {step === "done" && `Done! ${selectedEntries.length} files imported`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Step 1: Pick */}
          {step === "pick" && (
            <div className="p-8 flex flex-col items-center gap-5">
              {!isSupported ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 w-full">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Browser not supported</p>
                    <p className="text-xs text-muted mt-1">Use Chrome or Edge for folder import. Firefox doesn't support this feature yet.</p>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={pickFolder}
                    className="w-full border-2 border-dashed border-default rounded-2xl p-10 flex flex-col items-center gap-4 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                      <FolderOpen className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-display font-semibold text-primary">Click to pick a folder</p>
                      <p className="text-sm text-muted mt-1">Browser will ask for permission — click Allow</p>
                      <p className="text-xs text-muted mt-1">mp4, pdf, jpg, docx and more</p>
                    </div>
                  </button>
                  <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 w-full">
                    <p className="text-xs text-green-400 text-center">
                      ✓ No path setup needed — videos load directly from your folder
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="divide-y divide-default">
              <div className="px-4 py-2.5 flex items-center gap-3 bg-elevated sticky top-0 z-10">
                <input
                  type="checkbox"
                  checked={selectedEntries.length === entries.length}
                  onChange={e => setEntries(prev => prev.map(en => ({ ...en, selected: e.target.checked })))}
                  className="w-4 h-4 accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-muted font-medium">{selectedEntries.length} / {entries.length} selected</span>
                <span className="ml-auto text-xs text-muted">Folder: <span className="text-indigo-400">{dirHandle?.name}</span></span>
              </div>

              {entries.map((entry, idx) => (
                <div key={entry.id} className={cn("flex items-center gap-3 px-4 py-3 transition-colors", !entry.selected && "opacity-50")}>
                  <input type="checkbox" checked={entry.selected} onChange={() => toggleSelect(entry.id)} className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0" />
                  <span className="text-xs font-mono text-muted w-6 text-right flex-shrink-0">{idx + 1}</span>
                  {entry.type === "video" ? (
                    <Film className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {editingId === entry.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(entry.id)}
                        onKeyDown={e => { if (e.key === "Enter") commitEdit(entry.id); if (e.key === "Escape") setEditingId(null); }}
                        className="input-base py-1 text-sm w-full"
                      />
                    ) : (
                      <span className="text-sm text-primary truncate block">{entry.title}</span>
                    )}
                    <p className="text-xs text-muted truncate">{entry.file_name}</p>
                  </div>
                  {editingId !== entry.id && (
                    <button onClick={() => { setEditingId(entry.id); setEditValue(entry.title); }} className="text-muted hover:text-primary transition-colors flex-shrink-0">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => moveEntry(entry.id, -1)} disabled={idx === 0} className="text-muted hover:text-primary disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveEntry(entry.id, 1)} disabled={idx === entries.length - 1} className="text-muted hover:text-primary disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="p-10 flex flex-col items-center gap-6">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <div className="w-full max-w-xs">
                <div className="flex justify-between text-xs text-muted mb-2">
                  <span>Importing…</span><span>{progress.done} / {progress.total}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <p className="font-display font-semibold text-primary text-lg">All done!</p>
              <p className="text-sm text-secondary text-center">{selectedEntries.length} files added.</p>
              <p className="text-xs text-muted text-center">Files load from your folder automatically each session.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-default flex-shrink-0">
          {step === "pick" && <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-secondary hover:text-primary">Cancel</button>}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("pick"); setEntries([]); setDirHandle(null); }} className="px-4 py-2 rounded-xl text-sm text-secondary hover:text-primary">← Back</button>
              <button onClick={handleImport} disabled={selectedEntries.length === 0} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-50">
                <Upload className="w-4 h-4" /> Import {selectedEntries.length} Items
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              Done <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}










// "use client";
// import { useState, useRef, useCallback } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   FolderOpen, Film, Check, X, Edit2, ArrowUp, ArrowDown,
//   Upload, Loader2, AlertCircle, ChevronRight,
// } from "lucide-react";
// import { toast } from "sonner";
// import { cn } from "../../lib/utils";
// import { VIDEO_EXTENSIONS } from "../../lib/constants";

// // Natural sort: "Lecture 2" < "Lecture 10"
// function naturalSort(a, b) {
//   return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
// }

// function isVideoFile(name) {
//   const ext = name.split(".").pop()?.toLowerCase() || "";
//   return VIDEO_EXTENSIONS.includes(ext);
// }

// function fileToEntry(file) {
//   const nameNoExt = file.name.replace(/\.[^.]+$/, "");
//   return {
//     id: `${file.name}-${file.lastModified}`,
//     title: nameNoExt,
//     file_path: file.webkitRelativePath || file.name,
//     file_name: file.name,
//     duration: 0,
//     selected: true,
//     editing: false,
//   };
// }

// export default function FolderImport({ subjectId, onImported, onClose }) {
//   const inputRef = useRef(null);
//   const [entries, setEntries] = useState([]);
//   const [basePath, setBasePath] = useState("");
//   const [step, setStep] = useState("pick"); // pick | preview | importing | done
//   const [importing, setImporting] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [editValue, setEditValue] = useState("");
//   const [progress, setProgress] = useState({ done: 0, total: 0 });
//   const dragRef = useRef(null);

//   const handleFiles = useCallback((files) => {
//     const videoFiles = Array.from(files).filter(f => isVideoFile(f.name));
//     if (videoFiles.length === 0) {
//       toast.error("No video files found in the selected folder");
//       return;
//     }
//     const parsed = videoFiles.map(fileToEntry).sort(naturalSort);
//     setEntries(parsed);
//     setStep("preview");
//   }, []);

//   const onFolderInput = (e) => {
//     handleFiles(e.target.files);
//   };

//   const toggleSelect = (id) => {
//     setEntries(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
//   };

//   const startEdit = (entry) => {
//     setEditingId(entry.id);
//     setEditValue(entry.title);
//   };

//   const commitEdit = (id) => {
//     setEntries(prev => prev.map(e => e.id === id ? { ...e, title: editValue.trim() || e.title } : e));
//     setEditingId(null);
//   };

//   const moveEntry = (id, dir) => {
//     setEntries(prev => {
//       const arr = [...prev];
//       const idx = arr.findIndex(e => e.id === id);
//       const swap = idx + dir;
//       if (swap < 0 || swap >= arr.length) return arr;
//       [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
//       return arr;
//     });
//   };

//   const selectedEntries = entries.filter(e => e.selected);

//   const handleImport = async () => {
//     if (selectedEntries.length === 0) return toast.error("Select at least one lecture");
//     setImporting(true);
//     setStep("importing");
//     setProgress({ done: 0, total: selectedEntries.length });

//     let failed = 0;
//     for (let i = 0; i < selectedEntries.length; i++) {
//       const entry = selectedEntries[i];
//       try {
//         await apiFetch(`/api/courses/${subjectId}/lectures`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             title: entry.title,
//            file_path: basePath
//   ? basePath.replace(/[\\/]$/, "") + "/" + entry.file_path
//   : entry.file_path,
//             duration: 0,
//             order_index: i,
//           }),
//         });
//       } catch {
//         failed++;
//       }
//       setProgress({ done: i + 1, total: selectedEntries.length });
//     }

//     setImporting(false);
//     setStep("done");
//     if (failed > 0) {
//       toast.warning(`Imported ${selectedEntries.length - failed} lectures (${failed} failed)`);
//     } else {
//       toast.success(`Imported ${selectedEntries.length} lectures successfully!`);
//     }
//     onImported?.();
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         exit={{ opacity: 0, scale: 0.95 }}
//         className="card-surface w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
//       >
//         {/* Header */}
//         <div className="flex items-center gap-3 px-6 py-4 border-b border-default flex-shrink-0">
//           <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
//             <FolderOpen className="w-5 h-5 text-indigo-400" />
//           </div>
//           <div className="flex-1">
//             <h2 className="font-display font-semibold text-primary">Import Folder</h2>
//             <p className="text-xs text-muted">
//               {step === "pick" && "Select a folder to scan for video files"}
//               {step === "preview" && `${entries.length} videos found · ${selectedEntries.length} selected`}
//               {step === "importing" && `Importing ${progress.done} / ${progress.total}…`}
//               {step === "done" && `Done! ${selectedEntries.length} lectures imported`}
//             </p>
//           </div>
//           <button onClick={onClose} className="text-muted hover:text-primary transition-colors">
//             <X className="w-5 h-5" />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto">
//           {/* Step 1: Pick folder */}
//           {step === "pick" && (
//             <div className="p-8 flex flex-col items-center gap-6">
//               <div
//                 className="w-full border-2 border-dashed border-default rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all"
//                 onClick={() => inputRef.current?.click()}
//               >
//                 <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
//                   <FolderOpen className="w-8 h-8 text-indigo-400" />
//                 </div>
//                 <div className="text-center">
//                   <p className="font-display font-semibold text-primary">Click to select a folder</p>
//                   <p className="text-sm text-muted mt-1">
//                     All video files will be detected and sorted automatically
//                   </p>
//                   <p className="text-xs text-muted mt-1">
//                     Supports: mp4, mkv, webm, mov, avi, m4v and more
//                   </p>
//                 </div>
//               </div>
//               <input
//                 ref={inputRef}
//                 type="file"
//                 webkitdirectory=""
//                 multiple
//                 className="hidden"
//                 onChange={onFolderInput}
//               />
//             </div>
//           )}

//           {/* Step 2: Preview + edit */}
//           {step === "preview" && ( 
//            <div className="divide-y divide-default">
 
//               {/* Select all bar */}
//               <div className="px-4 py-2.5 flex items-center gap-3 bg-elevated sticky top-0 z-10">
//                 <input
//                   type="checkbox"
//                   checked={selectedEntries.length === entries.length}
//                   onChange={e => setEntries(prev => prev.map(en => ({ ...en, selected: e.target.checked })))}
//                   className="w-4 h-4 accent-indigo-500 cursor-pointer"
//                 />
//                 <span className="text-xs text-muted font-medium">
//                   {selectedEntries.length} / {entries.length} selected
//                 </span>
//                 <span className="ml-auto text-xs text-muted">
//                   Click <Edit2 className="w-3 h-3 inline" /> to rename · drag arrows to reorder
//                 </span>
//               </div>

//               {entries.map((entry, idx) => (
//                 <div
//                   key={entry.id}
//                   className={cn(
//                     "flex items-center gap-3 px-4 py-3 transition-colors",
//                     entry.selected ? "bg-base" : "bg-base opacity-50"
//                   )}
//                 >
//                   {/* Checkbox */}
//                   <input
//                     type="checkbox"
//                     checked={entry.selected}
//                     onChange={() => toggleSelect(entry.id)}
//                     className="w-4 h-4 accent-indigo-500 cursor-pointer flex-shrink-0"
//                   />

//                   {/* Index */}
//                   <span className="text-xs font-mono text-muted w-6 text-right flex-shrink-0">{idx + 1}</span>

//                   {/* Icon */}
//                   <Film className="w-4 h-4 text-indigo-400 flex-shrink-0" />

//                   {/* Title / edit */}
//                   <div className="flex-1 min-w-0">
//                     {editingId === entry.id ? (
//                       <input
//                         autoFocus
//                         value={editValue}
//                         onChange={e => setEditValue(e.target.value)}
//                         onBlur={() => commitEdit(entry.id)}
//                         onKeyDown={e => {
//                           if (e.key === "Enter") commitEdit(entry.id);
//                           if (e.key === "Escape") setEditingId(null);
//                         }}
//                         className="input-base py-1 text-sm w-full"
//                       />
//                     ) : (
//                       <div className="flex items-center gap-2">
//                         <span className="text-sm text-primary truncate">{entry.title}</span>
//                         <button
//                           onClick={() => startEdit(entry)}
//                           className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted hover:text-primary transition-all flex-shrink-0"
//                         >
//                           <Edit2 className="w-3.5 h-3.5" />
//                         </button>
//                       </div>
//                     )}
//                     <p className="text-xs text-muted truncate">{entry.file_name}</p>
//                   </div>

//                   {/* Edit button (always visible) */}
//                   {editingId !== entry.id && (
//                     <button
//                       onClick={() => startEdit(entry)}
//                       className="text-muted hover:text-primary transition-colors flex-shrink-0"
//                       title="Rename"
//                     >
//                       <Edit2 className="w-3.5 h-3.5" />
//                     </button>
//                   )}

//                   {/* Reorder */}
//                   <div className="flex flex-col gap-0.5 flex-shrink-0">
//                     <button
//                       onClick={() => moveEntry(entry.id, -1)}
//                       disabled={idx === 0}
//                       className="text-muted hover:text-primary disabled:opacity-20 transition-colors"
//                     >
//                       <ArrowUp className="w-3.5 h-3.5" />
//                     </button>
//                     <button
//                       onClick={() => moveEntry(entry.id, 1)}
//                       disabled={idx === entries.length - 1}
//                       className="text-muted hover:text-primary disabled:opacity-20 transition-colors"
//                     >
//                       <ArrowDown className="w-3.5 h-3.5" />
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Step 3: Importing */}
//           {step === "importing" && (
//             <div className="p-10 flex flex-col items-center gap-6">
//               <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
//               <div className="w-full max-w-xs">
//                 <div className="flex justify-between text-xs text-muted mb-2">
//                   <span>Importing…</span>
//                   <span>{progress.done} / {progress.total}</span>
//                 </div>
//                 <div className="progress-bar">
//                   <div
//                     className="progress-fill"
//                     style={{ width: `${(progress.done / progress.total) * 100}%` }}
//                   />
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Step 4: Done */}
//           {step === "done" && (
//             <div className="p-10 flex flex-col items-center gap-4">
//               <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
//                 <Check className="w-8 h-8 text-green-400" />
//               </div>
//               <p className="font-display font-semibold text-primary text-lg">All done!</p>
//               <p className="text-sm text-secondary text-center">
//                 {selectedEntries.length} lectures have been added to your course in order.
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-default flex-shrink-0">
//           {step === "pick" && (
//             <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-secondary hover:text-primary transition-colors">
//               Cancel
//             </button>
//           )}
//           {step === "preview" && (
//             <>
//               <button
//                 onClick={() => { setStep("pick"); setEntries([]); }}
//                 className="px-4 py-2 rounded-xl text-sm text-secondary hover:text-primary transition-colors"
//               >
//                 ← Back
//               </button>
//               <button
//                 onClick={handleImport}
//                 disabled={selectedEntries.length === 0}
//                 className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
//               >
//                 <Upload className="w-4 h-4" />
//                 Import {selectedEntries.length} Lectures
//               </button>
//             </>
//           )}
//           {step === "done" && (
//             <button
//               onClick={onClose}
//               className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
//             >
//               Done <ChevronRight className="w-4 h-4" />
//             </button>
//           )}
//         </div>
//       </motion.div>
//     </div>
//   );
// }
