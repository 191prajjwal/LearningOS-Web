"use client";
import { apiFetch } from "../../../lib/api";
import { folderStore } from "../../../lib/folder-store";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FolderOpen, FileText, ExternalLink, PenTool, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, subjectColor } from "../../../lib/utils";
import FolderImport from "../../../components/ui/FolderImport";

export default function DppSubjectPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFolderImport, setShowFolderImport] = useState(false);
  const [folderLoaded, setFolderLoaded] = useState(false);

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
      await folderStore.loadFromHandle(handle, id, "dpp");
      setFolderLoaded(true);
      toast.success("Folder connected — materials ready");
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Could not open folder");
    }
  };

  useEffect(() => {
    setFolderLoaded(folderStore.hasSubject(id, "dpp"));
  }, [id]);

  if (loading) return <div className="p-6 shimmer h-96 rounded-xl m-6" />;
  if (!data?.subject) return <div className="p-6 text-muted">Subject not found</div>;

  const { subject, materials = [] } = data;
  const dpps = materials.filter(m => m.category === 'dpp');
  const color = subject.color || subjectColor(subject.name);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Folder Import Modal */}
      <AnimatePresence>
        {showFolderImport && (
          <FolderImport
            subjectId={id}
            importCategory="dpp"
            onImported={() => { loadData(); }}
            onClose={() => setShowFolderImport(false)}
          />
        )}
      </AnimatePresence>

      {/* Back */}
      <Link href="/dpps" className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to DPPs
      </Link>

      {/* Header */}
      <div className="card-surface p-6 mb-6" style={{ borderColor: `${color}30` }}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <PenTool className="w-7 h-7" style={{ color }} />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-primary">{subject.name} DPPs</h1>
            {subject.description && <p className="text-secondary text-sm mt-1">{subject.description}</p>}
            
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <FileText className="w-4 h-4" />
                {dpps.length} practice files
              </div>
            </div>
            
            {!folderLoaded && dpps.length > 0 && (
              <button
                onClick={reconnectFolder}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs hover:bg-yellow-500/15 transition-colors w-fit"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Reconnect folder to open files
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-primary">Practice Materials</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFolderImport(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-default bg-elevated hover:bg-overlay text-secondary hover:text-primary text-sm transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Import DPPs
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dpps.map((m, i) => {
             const url = folderStore.getForLecture(m.file_path);
             return (
               <motion.a
                 key={m.id}
                 href={url || '#'}
                 target={url ? "_blank" : undefined}
                 rel="noreferrer"
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: i * 0.03 }}
                 className={cn(
                   "flex items-center gap-4 p-4 rounded-xl border transition-all group",
                   url ? "card-surface hover:border-indigo-500/50 cursor-pointer" : "bg-base border-default opacity-60"
                 )}
                 onClick={(e) => {
                   if (!url) {
                     e.preventDefault();
                     toast.error("Reconnect folder to view this material");
                   }
                 }}
               >
                 <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-500">
                   <PenTool className="w-5 h-5" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-medium text-sm text-primary truncate">{m.title}</p>
                   <p className="text-xs text-muted truncate mt-0.5">{m.file_path}</p>
                 </div>
                 {url && <ExternalLink className="w-4 h-4 text-muted group-hover:text-indigo-400 transition-colors" />}
               </motion.a>
             );
          })}
          {dpps.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-16 gap-4">
              <FileText className="w-12 h-12 text-muted" />
              <div className="text-center">
                <p className="text-secondary font-medium">No DPPs imported yet</p>
                <p className="text-sm text-muted mt-1">Import a folder containing your practice PDFs or images</p>
              </div>
              <button
                onClick={() => setShowFolderImport(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/15 text-indigo-400 text-sm hover:bg-indigo-500/25 transition-colors"
              >
                <FolderOpen className="w-4 h-4" /> Import Folder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
