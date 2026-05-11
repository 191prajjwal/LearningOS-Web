"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ClipboardList, TrendingUp, TrendingDown, Target,
  CheckCircle2, XCircle, MinusCircle, Clock, ChevronRight,
  Trash2, BarChart2, Edit2, AlertTriangle, Brain,
} from "lucide-react";
import { toast } from "sonner";
import { cn, pct, formatDate, subjectColor } from "../../lib/utils";
import { TEST_TYPES, PRIORITY_COLORS } from "../../lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

export default function TestsPage() {
  const [tests, setTests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [tab, setTab] = useState("list");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null); // test being entered/viewed

 const [form, setForm] = useState({
  title: "", type: "Full Mock", date: new Date().toISOString().split("T")[0],
  subject: "", total_marks: 100, total_questions: 65, notes: "",
});

  const [results, setResults] = useState({
    obtained_marks: "", attempted: "", correct: "", incorrect: "",
    unattempted: "", time_taken: "",
  });

  const [subjectBreakdown, setSubjectBreakdown] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [t, s, a] = await Promise.all([
      apiFetch("/api/db?q=tests").then(r => r.json()),
      apiFetch("/api/courses").then(r => r.json()),
      apiFetch("/api/db?q=test-analytics").then(r => r.json()),
    ]);
    setTests(t.tests || []);
    setSubjects(s.subjects || []);
    setAnalytics(a);
  };

  const createTest = async () => {
   if (!form.title.trim() || !form.subject.trim()) { toast.error("Title and subject are required"); return; }
    await apiFetch("/api/db?q=test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ ...form, subject_id: null }),
    });
    setForm({ title: "", type: "Full Mock", date: new Date().toISOString().split("T")[0], subject_id: "", total_marks: 360, total_questions: 90, notes: "" });
    setShowAdd(false);
    toast.success("Test created");
    loadAll();
  };

  const submitResults = async (testId) => {
    const r = results;
    if (!r.obtained_marks) { toast.error("Enter obtained marks"); return; }
    const unattempted = parseInt(r.unattempted || 0) || (parseInt(form.total_questions || 0) - parseInt(r.attempted || 0));

    await apiFetch("/api/db?q=test-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: testId,
        results: {
          obtained_marks: parseFloat(r.obtained_marks),
          attempted: parseInt(r.attempted) || 0,
          correct: parseInt(r.correct) || 0,
          incorrect: parseInt(r.incorrect) || 0,
          unattempted: unattempted,
          time_taken: parseInt(r.time_taken) || null,
        },
        subjects: subjectBreakdown.filter(s => s.subject_id),
      }),
    });
    toast.success("Results saved!");
    setSelected(null);
    setResults({ obtained_marks: "", attempted: "", correct: "", incorrect: "", unattempted: "", time_taken: "" });
    setSubjectBreakdown([]);
    loadAll();
  };

  const deleteTest = async (id) => {
    if (!confirm("Delete this test?")) return;
    await apiFetch(`/api/db?q=test&id=${id}`, { method: "DELETE" });
    toast.success("Test deleted");
    loadAll();
  };

  const addSubjectBreakdown = () => {
    setSubjectBreakdown(v => [...v, { subject_id: "", total_marks: "", obtained_marks: "", correct: "", incorrect: "", silly_mistakes: 0, conceptual_mistakes: 0, time_pressure_mistakes: 0 }]);
  };

  const updateBreakdown = (i, k, v) => {
    setSubjectBreakdown(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  };

  const completedTests = tests.filter(t => t.is_completed);
  const scoreData = completedTests.slice(-10).map(t => ({
    name: t.title.length > 12 ? t.title.slice(0, 12) + "…" : t.title,
    score: pct(t.obtained_marks, t.total_marks),
    date: formatDate(t.date, "MMM d"),
  }));

  const TABS = ["list", "analytics"];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Tests</h1>
          <p className="text-secondary mt-1">{tests.length} tests · track your mock performance</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Test
        </button>
      </div>

      {/* Add test form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card-surface p-5 mb-6 border-indigo-500/20"
          >
            <h3 className="font-display font-semibold text-primary mb-4">Create Test</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-xs text-muted mb-1">Test Title *</label>
                <input autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. JEE Mock 1" className="input-base" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-base">
                  {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Total Marks</label>
                <input type="number" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} className="input-base" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Total Questions</label>
                <input type="number" value={form.total_questions} onChange={e => setForm(f => ({ ...f, total_questions: e.target.value }))} className="input-base" />
              </div>
             <div>
  <label className="block text-xs text-muted mb-1">Subject *</label>
  <input
    value={form.subject}
    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
    placeholder="e.g. Physics, Full Mock, Math..."
    className="input-base"
  />
</div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={createTest} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">Create Test</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated w-fit mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all", tab === t ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─── LIST TAB ─── */}
      {tab === "list" && (
        <div className="space-y-3">
          {tests.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-4">
              <ClipboardList className="w-12 h-12 text-muted" />
              <p className="text-secondary font-medium">No tests logged yet</p>
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">
                Create your first test
              </button>
            </div>
          ) : (
            tests.map(test => (
              <motion.div
                key={test.id}
                layout
                className="card-surface p-4 hover:border-strong transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Score circle */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 font-display font-bold",
                    test.is_completed
                      ? pct(test.obtained_marks, test.total_marks) >= 70 ? "bg-green-500/15 text-green-400"
                        : pct(test.obtained_marks, test.total_marks) >= 50 ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-red-500/15 text-red-400"
                      : "bg-elevated text-muted"
                  )}>
                    {test.is_completed
                      ? <>
                          <span className="text-lg leading-none">{pct(test.obtained_marks, test.total_marks)}</span>
                          <span className="text-xs font-normal">%</span>
                        </>
                      : <ClipboardList className="w-6 h-6" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-primary">{test.title}</h3>
                      <span className="pill bg-elevated text-secondary">{test.type}</span>
                      {!test.is_completed && (
                        <span className="pill bg-yellow-500/10 text-yellow-400">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>{formatDate(test.date)}</span>
                      {test.is_completed && (
                        <>
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> {test.correct} correct</span>
                          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> {test.incorrect} wrong</span>
                          <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-yellow-400" /> {test.unattempted} skipped</span>
                          <span>{test.obtained_marks}/{test.total_marks} marks</span>
                        </>
                      )}
                      {test.subject_name && <span>{test.subject_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!test.is_completed && (
                      <button
                        onClick={() => setSelected(test)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Enter Results
                      </button>
                    )}
                    <button
                      onClick={() => deleteTest(test.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Tests", value: analytics?.total_tests || 0, icon: <ClipboardList className="w-5 h-5" />, color: "indigo" },
              { label: "Average Score", value: analytics?.avg_score ? `${Math.round(analytics.avg_score)}%` : "—", icon: <Target className="w-5 h-5" />, color: "cyan" },
              { label: "Best Score", value: analytics?.best_score ? `${Math.round(analytics.best_score)}%` : "—", icon: <TrendingUp className="w-5 h-5" />, color: "green" },
              { label: "Worst Score", value: analytics?.worst_score ? `${Math.round(analytics.worst_score)}%` : "—", icon: <TrendingDown className="w-5 h-5" />, color: "red" },
            ].map(card => (
              <div key={card.label} className="stat-card">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  `bg-${card.color}-500/10 text-${card.color}-400`
                )}>
                  {card.icon}
                </div>
                <p className="font-display text-2xl font-bold text-primary mt-2">{card.value}</p>
                <p className="text-xs text-muted">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Score trend chart */}
          {scoreData.length > 0 && (
            <div className="card-surface p-5">
              <h3 className="font-display font-semibold text-primary mb-4">Score Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgb(240,240,255)" }}
                    formatter={(v) => [`${v}%`, "Score"]}
                  />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Question breakdown */}
          {completedTests.length > 0 && (
            <div className="card-surface p-5">
              <h3 className="font-display font-semibold text-primary mb-4">Question Accuracy (Last 5 Tests)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={completedTests.slice(-5).map(t => ({
                  name: t.title.length > 10 ? t.title.slice(0, 10) + "…" : t.title,
                  Correct: t.correct || 0,
                  Incorrect: t.incorrect || 0,
                  Unattempted: t.unattempted || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgb(20,20,30)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgb(240,240,255)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Correct" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="Incorrect" fill="#ef4444" radius={[4,4,0,0]} />
                  <Bar dataKey="Unattempted" fill="#eab308" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Mistake analysis */}
          <div className="card-surface p-5">
            <h3 className="font-display font-semibold text-primary mb-4">Overall Accuracy</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Correct", value: analytics?.total_correct || 0, color: "#22c55e", icon: <CheckCircle2 className="w-4 h-4" /> },
                { label: "Total Incorrect", value: analytics?.total_incorrect || 0, color: "#ef4444", icon: <XCircle className="w-4 h-4" /> },
                { label: "Unattempted", value: analytics?.total_unattempted || 0, color: "#eab308", icon: <MinusCircle className="w-4 h-4" /> },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-elevated">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <div>
                    <p className="font-display font-bold text-xl text-primary">{item.value}</p>
                    <p className="text-xs text-muted">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── ENTER RESULTS MODAL ─── */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="card-surface">
                <div className="p-5 border-b border-default">
                  <h2 className="font-display font-bold text-primary">Enter Results: {selected.title}</h2>
                  <p className="text-sm text-muted mt-1">Total marks: {selected.total_marks} · Questions: {selected.total_questions}</p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Main results */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: "obtained_marks", label: "Marks Obtained *", placeholder: "e.g. 248" },
                      { key: "correct", label: "Correct", placeholder: "e.g. 62" },
                      { key: "incorrect", label: "Incorrect", placeholder: "e.g. 18" },
                      { key: "unattempted", label: "Unattempted", placeholder: "e.g. 10" },
                      { key: "attempted", label: "Attempted", placeholder: "e.g. 80" },
                      { key: "time_taken", label: "Time Taken (min)", placeholder: "e.g. 180" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-muted mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={results[f.key]}
                          onChange={e => setResults(r => ({ ...r, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="input-base"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Auto-computed score */}
                  {results.obtained_marks && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <Target className="w-5 h-5 text-indigo-400" />
                      <div>
                        <p className="font-display font-bold text-2xl text-indigo-300">
                          {pct(parseFloat(results.obtained_marks), parseFloat(selected.total_marks))}%
                        </p>
                        <p className="text-xs text-indigo-400/70">Score · {results.obtained_marks}/{selected.total_marks}</p>
                      </div>
                    </div>
                  )}

                  {/* Subject-wise breakdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-secondary">Subject-wise Breakdown (optional)</p>
                      <button onClick={addSubjectBreakdown} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                        <Plus className="w-3 h-3" /> Add Subject
                      </button>
                    </div>
                    {subjectBreakdown.map((row, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-3 rounded-lg bg-elevated">
                        <div className="col-span-3">
                          <select
                            value={row.subject_id}
                            onChange={e => updateBreakdown(i, "subject_id", e.target.value)}
                            className="input-base text-xs"
                          >
                            <option value="">Select subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        {[
                          { k: "obtained_marks", p: "Marks" },
                          { k: "correct", p: "Correct" },
                          { k: "incorrect", p: "Wrong" },
                          { k: "silly_mistakes", p: "Silly" },
                          { k: "conceptual_mistakes", p: "Conceptual" },
                          { k: "time_pressure_mistakes", p: "Time" },
                        ].map(f => (
                          <div key={f.k}>
                            <input
                              type="number"
                              value={row[f.k]}
                              onChange={e => updateBreakdown(i, f.k, e.target.value)}
                              placeholder={f.p}
                              className="input-base text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 border-t border-default flex gap-3">
                  <button
                    onClick={() => submitResults(selected.id)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
                  >
                    Save Results
                  </button>
                  <button
                    onClick={() => { setSelected(null); setResults({ obtained_marks: "", attempted: "", correct: "", incorrect: "", unattempted: "", time_taken: "" }); setSubjectBreakdown([]); }}
                    className="px-4 py-2.5 rounded-xl border border-default text-secondary hover:text-primary text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
