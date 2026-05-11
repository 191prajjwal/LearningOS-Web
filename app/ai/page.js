"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Brain, Calendar, FileText, Download,
  Loader2, Trash2, ChevronRight, Clock, Settings,
  AlertCircle, CheckCircle2, Zap, RefreshCw, MessageCircle, Send, X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, formatDate, timeAgo } from "../../lib/utils";
import { useProfile } from "../../store/profile-context";

const SUGGESTED_QUESTIONS = [
  "Give me a preparation strategy starting from now until the day of the exam.",
  "Based on my exam, previous year patterns, and toppers’ strategies, suggest a preparation plan to achieve an AIR under 100.",
  "Based on my exam tell me the order/sequence in which i should complete all of my subjects",
  "What are my biggest weak areas based on test performance?",
  "How can I improve my accuracy in tests?",
  "Give me a 7-day revision plan based on my progress.",
];

function MarkdownContent({ content }) {
  if (!content) return null;
  const renderInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="text-primary font-semibold">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  };
  const lines = content.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) elements.push(<h3 key={i} className="font-display font-semibold text-indigo-400 text-base mt-5 mb-2 border-b border-default pb-1">{line.slice(4)}</h3>);
    else if (line.startsWith("## ")) elements.push(<h2 key={i} className="font-display font-bold text-primary text-lg mt-6 mb-2">{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) elements.push(<h1 key={i} className="font-display font-bold text-primary text-xl mt-6 mb-3">{line.slice(2)}</h1>);
    else if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) elements.push(<div key={i} className="flex gap-2 text-secondary my-0.5 ml-2"><span className="text-indigo-400 mt-1 flex-shrink-0 text-xs">▸</span><span className="leading-relaxed">{renderInline(line.slice(2))}</span></div>);
    else if (line.match(/^\d+\. /)) { const num = line.match(/^\d+/)[0]; elements.push(<div key={i} className="flex gap-2 text-secondary my-0.5 ml-2"><span className="text-indigo-400 font-mono text-xs mt-1 w-5 flex-shrink-0">{num}.</span><span className="leading-relaxed">{renderInline(line.replace(/^\d+\. /, ""))}</span></div>); }
    else if (line.trim() === "---" || line.trim() === "***") elements.push(<hr key={i} className="border-default my-4" />);
    else if (line.trim() === "") elements.push(<div key={i} className="h-2" />);
    else elements.push(<p key={i} className="text-secondary leading-relaxed my-0.5">{renderInline(line)}</p>);
    i++;
  }
  return <div className="space-y-0.5 text-sm">{elements}</div>;
}

export default function AIPage() {
  const { settings } = useProfile();
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState(null);
  const [tab, setTab] = useState("reports");

  // Ask feature
  const [askQuestion, setAskQuestion] = useState("");
  const [askAnswer, setAskAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [showAsk, setShowAsk] = useState(false);

  const activeKey = settings?.[`aiKey_${settings?.aiProvider}`] || settings?.aiApiKey || "";
  const hasProvider = settings?.aiProvider && settings.aiProvider !== "none" && activeKey;

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    const r = await apiFetch("/api/ai/reports");
    const d = await r.json();
    setReports(d.reports || []);
  };

  const loadReport = async (id) => {
    const r = await apiFetch(`/api/ai/reports/${id}`);
    const d = await r.json();
    setActiveReport(d.report);
    setTab("view");
  };

  const generate = async (type) => {
    if (!hasProvider) { toast.error("Configure AI provider in Settings first"); return; }
    setGenerating(true); setGenType(type);
    try {
      const r = await apiFetch("/api/ai/generate", { method: "POST", body: JSON.stringify({ type }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      toast.success("Report generated!");
      setActiveReport(d.report); setTab("view"); loadReports();
    } catch (e) { toast.error(e.message || "Generation failed"); }
    finally { setGenerating(false); setGenType(null); }
  };

  const askAI = async (question) => {
    const q = question || askQuestion.trim();
    if (!q) return;
    if (!hasProvider) { toast.error("Configure AI provider in Settings first"); return; }
    setAsking(true); setAskAnswer(null); setAskQuestion(q);
    try {
      const r = await apiFetch("/api/ai/ask", { method: "POST", body: JSON.stringify({ question: q }) });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAskAnswer(d.answer);
      setShowAsk(true);
    } catch (e) { toast.error(e.message || "Failed"); }
    finally { setAsking(false); }
  };

  const deleteReport = async (id, e) => {
    e.stopPropagation();
    await apiFetch(`/api/ai/reports/${id}`, { method: "DELETE" });
    toast.success("Report deleted");
    if (activeReport?.id === id) { setActiveReport(null); setTab("reports"); }
    loadReports();
  };

  const exportReport = (fmt) => {
    if (!activeReport) return;
    const content = activeReport.content;
    const filename = `learningos-${activeReport.type}-${Date.now()}`;
    if (fmt === "txt") downloadBlob(new Blob([content], { type: "text/plain" }), `${filename}.txt`);
    else if (fmt === "md") downloadBlob(new Blob([content], { type: "text/markdown" }), `${filename}.md`);
    else if (fmt === "pdf") exportPDF(activeReport);
    toast.success(`Exported as ${fmt.toUpperCase()}`);
  };

  const exportPDF = async (report) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(60, 60, 100);
    doc.text("LearningOS — AI Report", 20, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(80, 80, 120);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Type: ${report.type} | Model: ${report.model}`, 20, 30);
    doc.setDrawColor(200, 200, 230); doc.line(20, 34, 190, 34);
    doc.setFontSize(10); doc.setTextColor(40, 40, 60);
    const lines = doc.splitTextToSize(report.content.replace(/[#*`]/g, ""), 170);
    let y = 42;
    for (const line of lines) { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, 20, y); y += 5; }
    doc.save(`learningos-report-${Date.now()}.pdf`);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { id: "reports", label: "Reports" },
    ...(activeReport ? [{ id: "view", label: "Current Report" }] : []),
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <h1 className="font-display text-3xl font-bold text-primary">AI Insights</h1>
          </div>
          <p className="text-secondary">AI-powered analysis of your study patterns, weaknesses, and exam readiness</p>
        </div>
        {!hasProvider && (
          <Link href="/settings?tab=ai" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm hover:bg-yellow-500/15 transition-colors">
            <AlertCircle className="w-4 h-4" /> Configure AI
          </Link>
        )}
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ActionCard icon={<Brain className="w-6 h-6" />} title="Full Analysis Report" desc="Strengths, weaknesses, accuracy patterns, and exam readiness score" color="indigo" loading={generating && genType === "insights"} disabled={!hasProvider || generating} onClick={() => generate("insights")} />
        <ActionCard icon={<Calendar className="w-6 h-6" />} title="AI Study Planner" desc="Personalized daily schedule, revision plan, and mock test frequency" color="violet" loading={generating && genType === "planner"} disabled={!hasProvider || generating} onClick={() => generate("planner")} />
      </div>

      {/* Ask AI section */}
      <div className="card-surface p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-indigo-400" />
          <h3 className="font-display font-semibold text-primary">Ask AI</h3>
          <span className="pill bg-green-500/10 text-green-400 text-xs">Based on your data</span>
        </div>
        <p className="text-secondary text-xs mb-4">Ask anything about your preparation — the AI uses your actual study data, test scores, and progress.</p>

        {/* Suggested questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map(q => (
            <button key={q} onClick={() => askAI(q)} disabled={!hasProvider || asking}
              className="px-3 py-1.5 rounded-lg bg-elevated hover:bg-indigo-500/10 hover:border-indigo-500/30 border border-default text-xs text-secondary hover:text-indigo-300 transition-all disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>

        {/* Custom question input */}
        <div className="flex gap-2">
          <input
            value={askQuestion}
            onChange={e => setAskQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && askAI()}
            placeholder="Or type your own question..."
            className="input-base flex-1"
            disabled={!hasProvider || asking}
          />
          <button onClick={() => askAI()} disabled={!hasProvider || asking || !askQuestion.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 flex items-center gap-2">
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        {!hasProvider && (
          <p className="text-xs text-yellow-400 mt-2">⚠ Configure AI in <Link href="/settings?tab=ai" className="underline">Settings</Link> to use this feature.</p>
        )}

        {/* Answer */}
        <AnimatePresence>
          {showAsk && askAnswer && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 relative">
              <button onClick={() => { setShowAsk(false); setAskAnswer(null); setAskQuestion(""); }}
                className="absolute top-3 right-3 p-1 rounded-lg text-muted hover:text-primary transition-colors">
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-indigo-400 mb-2 font-medium">Q: {askQuestion}</p>
              <MarkdownContent content={askAnswer} />
            </motion.div>
          )}
          {asking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-elevated">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <p className="text-secondary text-sm">Analyzing your data...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* No provider warning */}
      {!hasProvider && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-5 border-yellow-500/20 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-primary text-sm">AI provider not configured</p>
              <p className="text-secondary text-sm mt-1">Add your API key in <Link href="/settings?tab=ai" className="text-indigo-400 underline">Settings → AI Configuration</Link> to generate reports.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      {(reports.length > 0 || activeReport) && (
        <>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated w-fit mb-6">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", tab === t.id ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary")}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "reports" && (
            <div className="space-y-3">
              {reports.map(report => (
                <motion.div key={report.id} layout onClick={() => loadReport(report.id)}
                  className="card-surface p-4 cursor-pointer hover:border-strong transition-all ai-card group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                      {report.type === "planner" ? <Calendar className="w-5 h-5 text-indigo-400" /> : <Brain className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-primary">{report.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted">
                        <span className="capitalize">{report.type}</span>
                        <span>{report.provider} · {report.model}</span>
                        <span>{timeAgo(report.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => deleteReport(report.id, e)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {tab === "view" && activeReport && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 card-surface">
                <div>
                  <h2 className="font-display font-semibold text-primary">{activeReport.title}</h2>
                  <p className="text-xs text-muted mt-0.5">{activeReport.provider} · {activeReport.model} · {formatDate(activeReport.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted mr-2">Export:</span>
                  {["txt", "md", "pdf"].map(fmt => (
                    <button key={fmt} onClick={() => exportReport(fmt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated hover:bg-overlay text-secondary hover:text-primary text-xs font-medium transition-colors border border-default">
                      <Download className="w-3 h-3" />{fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card-surface p-6 ai-card"><MarkdownContent content={activeReport.content} /></div>
              <div className="flex justify-center">
                <button onClick={() => generate(activeReport.type)} disabled={!hasProvider || generating}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-default text-secondary hover:text-primary hover:border-strong text-sm transition-colors disabled:opacity-40">
                  <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} /> Regenerate Report
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {reports.length === 0 && hasProvider && !generating && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="font-display text-xl font-semibold text-secondary">Ready to analyze</h3>
          <p className="text-muted text-sm text-center max-w-sm">Generate a full report above, or ask a quick question using the Ask AI box.</p>
        </div>
      )}

      <AnimatePresence>
        {generating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="card-surface p-8 flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin absolute -top-1 -right-1" />
              </div>
              <div>
                <p className="font-display font-semibold text-primary">Analyzing your data...</p>
                <p className="text-secondary text-sm mt-1">{genType === "planner" ? "Building your personalized study plan" : "Generating insights and recommendations"}</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-slow" style={{ animationDelay: `${i * 200}ms` }} />)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionCard({ icon, title, desc, color, loading, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("ai-card card-surface p-5 text-left transition-all group w-full", !disabled && "hover:border-indigo-500/30 hover:shadow-accent cursor-pointer", disabled && !loading && "opacity-60 cursor-not-allowed")}>
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all", color === "indigo" ? "bg-indigo-500/15 text-indigo-400 group-hover:bg-indigo-500/25" : "bg-violet-500/15 text-violet-400 group-hover:bg-violet-500/25")}>
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-primary mb-1">{title}</h3>
          <p className="text-secondary text-sm leading-relaxed">{desc}</p>
        </div>
        {!loading && !disabled && <ChevronRight className="w-5 h-5 text-muted mt-1 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />}
      </div>
      {loading && <div className="mt-3 progress-bar"><div className="h-full bg-indigo-500 rounded-full animate-pulse-slow" style={{ width: "60%" }} /></div>}
    </button>
  );
}


