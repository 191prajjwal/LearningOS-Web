"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart2, Clock, Flame, TrendingUp, BookOpen,
  Target, Calendar, ChevronRight, Award,Download 
} from "lucide-react";
import { useProfile } from "../../store/profile-context";
import { cn, formatDate, pct, subjectColor } from "../../lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import StudyHeatmap from "../../components/charts/StudyHeatmap";
import { CHART_COLORS } from "../../lib/constants";

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgb(20,20,30)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "rgb(240,240,255)",
    fontSize: 12,
  },
};

export default function AnalyticsPage() {
  const { profile, countdown } = useProfile();
  const [data, setData] = useState(null);
  const [streakHistory, setStreakHistory] = useState([]);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, [range]);

  const loadAll = async () => {
  setLoading(true);
  const [snap, sh, wd, ws, tests, tasks] = await Promise.all([
    apiFetch("/api/db?q=analytics-snapshot").then(r => r.json()),
    apiFetch("/api/db?q=streak-history").then(r => r.json()),
    apiFetch("/api/db?q=watch-daily").then(r => r.json()),
    apiFetch("/api/db?q=watch-subjects").then(r => r.json()),
    apiFetch("/api/db?q=tests").then(r => r.json()),
    apiFetch("/api/db?q=tasks").then(r => r.json()),
  ]);
  setData({ 
    ...snap, 
    watchDaily: wd.data || [], 
    watchSubjects: ws.data || [],
    tests: tests.tests || [],
    tasks: tasks.tasks || [],
  });
  setStreakHistory(sh.history || []);
  setLoading(false);
};

  if (loading) return <AnalyticsSkeleton />;

  const {
    watchBySubject = [],
    testStats = [],
    testSubjectBreakdown = [],
    lectureCompletion = [],
    streak,
    syllabusProgress = [],
    watchDaily = [],
    watchSubjects = [],
  } = data || {};

  // Study time per day chart
  const dailyChartData = watchDaily.map(d => ({
    date: formatDate(d.date, "MMM d"),
    minutes: Math.round((d.total_minutes || 0)),
  }));

  // Subject pie data
  const subjectPieData = watchSubjects.map(s => ({
    name: s.name || "Unknown",
    value: Math.round(s.total_minutes || 0),
    color: s.color || subjectColor(s.name),
  }));

  // Lecture completion bar data
  const completionData = lectureCompletion.map(s => ({
    name: s.name,
    completed: parseInt(s.completed) || 0,
    remaining: (parseInt(s.total) || 0) - (parseInt(s.completed) || 0),
  }));

  // Test score radar (by subject)
  const radarData = testSubjectBreakdown.map(s => ({
    subject: s.name?.length > 8 ? s.name.slice(0, 8) + "…" : s.name,
    score: Math.round(s.avg_score || 0),
  }));

  // Syllabus progress
  const syllabusData = syllabusProgress.map(s => ({
    name: s.name,
    done: pct(parseInt(s.completed), parseInt(s.total)),
    total: parseInt(s.total),
    completed: parseInt(s.completed),
  }));

  const totalStudyMinutes = watchBySubject.reduce((sum, s) => sum + (s.total_minutes || 0), 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  const exportForAI = () => {
  if (!data) return;

  const lines = [];
  lines.push("# MY STUDY DATA EXPORT");
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push("");

  lines.push("## SUBJECTS & PROGRESS");
  (data.subjects || []).forEach(s => {
    const pct = s.total_lectures > 0 ? Math.round((s.completed_lectures / s.total_lectures) * 100) : 0;
    lines.push(`- ${s.name}: ${s.completed_lectures}/${s.total_lectures} lectures (${pct}%)`);
  });

  lines.push("");
  lines.push("## STUDY TIME BY SUBJECT (last 30 days)");
  (data.watchBySubject || []).forEach(s => {
    lines.push(`- ${s.name}: ${Math.round(s.total_minutes || 0)} minutes`);
  });

  lines.push("");
  lines.push("## TEST RESULTS");
  (data.tests || []).filter(t => t.is_completed).forEach(t => {
    const score = t.total_marks > 0 ? Math.round((t.obtained_marks / t.total_marks) * 100) : 0;
    lines.push(`- ${t.title} (${t.date}): ${score}% | Correct: ${t.correct} | Wrong: ${t.incorrect} | Skipped: ${t.unattempted}`);
  });

  lines.push("");
  lines.push("## TASKS COMPLETION");
  const completed = (data.tasks || []).filter(t => t.is_completed).length;
  lines.push(`- Completed: ${completed} / ${(data.tasks || []).length} tasks`);

  lines.push("");
  lines.push("---");
  lines.push("Paste this into ChatGPT/Claude/Gemini and ask:");
  lines.push("'Analyze my study data and give me: 1) weak areas 2) study schedule 3) exam strategy'");

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-data-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Analytics</h1>
         
          <p className="text-secondary mt-1">Deep insight into your study patterns and performance</p>

           <button
  onClick={exportForAI}
  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-default bg-elevated hover:bg-overlay text-secondary hover:text-primary text-sm transition-colors mt-4"
>
  <Download className="w-4 h-4" /> Export for AI
</button>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all", range === d ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary")}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Study Time", value: `${totalStudyHours}h`, sub: "all time", icon: <Clock className="w-5 h-5" />, color: "indigo" },
          { label: "Current Streak", value: `${streak?.streak_days || 0} days`, sub: `${Math.round(streak?.total_minutes || 0)}m total`, icon: <Flame className="w-5 h-5" />, color: "orange" },
          { label: "Lectures Done", value: lectureCompletion.reduce((s, c) => s + parseInt(c.completed || 0), 0), sub: `of ${lectureCompletion.reduce((s, c) => s + parseInt(c.total || 0), 0)} total`, icon: <BookOpen className="w-5 h-5" />, color: "green" },
          { label: "Tests Taken", value: testStats.length, sub: testStats.length > 0 ? `avg ${Math.round(testStats.reduce((s, t) => s + (t.score_pct || 0), 0) / testStats.length)}%` : "no tests yet", icon: <Target className="w-5 h-5" />, color: "cyan" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="stat-card"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", {
              "bg-indigo-500/10 text-indigo-400": s.color === "indigo",
              "bg-orange-500/10 text-orange-400": s.color === "orange",
              "bg-green-500/10 text-green-400": s.color === "green",
              "bg-cyan-500/10 text-cyan-400": s.color === "cyan",
            })}>
              {s.icon}
            </div>
            <p className="font-display text-2xl font-bold text-primary mt-2">{s.value}</p>
            <p className="text-xs text-muted font-medium">{s.label}</p>
            <p className="text-xs text-muted/70">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Exam readiness */}
      {countdown && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-surface p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display font-semibold text-primary">Exam Countdown — {profile?.exam_type}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 rounded-xl bg-elevated">
              <p className="font-display font-bold text-4xl text-primary">{countdown.daysRemaining}</p>
              <p className="text-xs text-muted mt-1">Days Remaining</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-elevated">
              <p className="font-display font-bold text-4xl text-primary">{countdown.daysElapsed}</p>
              <p className="text-xs text-muted mt-1">Days Elapsed</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-elevated">
              <p className="font-display font-bold text-4xl text-indigo-400">{countdown.progressPct}%</p>
              <p className="text-xs text-muted mt-1">Prep Progress</p>
            </div>
          </div>
          <div className="mt-4 progress-bar h-2">
            <div className="progress-fill h-full" style={{ width: `${countdown.progressPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted mt-1.5">
            <span>{formatDate(profile?.start_date)}</span>
            <span>{formatDate(profile?.exam_date)}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily study time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Daily Study Time</h2>
          {dailyChartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">No watch data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} min`, "Study Time"]} />
                <Area type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={2} fill="url(#studyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Subject distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Study Distribution by Subject</h2>
          {subjectPieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">No subject data yet</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie
                    data={subjectPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {subjectPieData.map((s, i) => (
                      <Cell key={i} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} min`, "Time"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {subjectPieData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-secondary truncate flex-1">{s.name}</span>
                    <span className="text-muted font-mono">{s.value}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Lecture completion by subject */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Lecture Completion</h2>
          {completionData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">No lectures added</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={completionData} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="completed" stackId="a" fill="#6366f1" radius={[0,0,0,0]} name="Done" />
                <Bar dataKey="remaining" stackId="a" fill="rgba(99,102,241,0.15)" radius={[0,4,4,0]} name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Test performance radar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Subject Performance Radar</h2>
          {radarData.length < 3 ? (
            <div className="flex items-center justify-center h-48 text-muted text-sm">Need 3+ subjects with test data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(155,155,185,0.8)", fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Avg Score"]} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Syllabus progress */}
      {syllabusData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Syllabus Completion</h2>
          <div className="space-y-3">
            {syllabusData.map(s => (
              <div key={s.name} className="flex items-center gap-4">
                <p className="text-sm text-secondary w-32 truncate flex-shrink-0">{s.name}</p>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: `${s.done}%` }} />
                </div>
                <span className="text-xs font-mono text-secondary w-24 text-right flex-shrink-0">
                  {s.completed}/{s.total} ({s.done}%)
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Study heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card-surface p-5"
      >
        <h2 className="font-display font-semibold text-primary mb-4">Study Activity Heatmap</h2>
        <StudyHeatmap data={streakHistory} />
      </motion.div>

      {/* Test history table */}
      {testStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="card-surface p-5"
        >
          <h2 className="font-display font-semibold text-primary mb-4">Test History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-default">
                  {["Test", "Date", "Type", "Score", "Correct", "Wrong", "Skipped"].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testStats.map((t, i) => (
                  <tr key={i} className="border-b border-subtle hover:bg-elevated transition-colors">
                    <td className="py-2.5 px-3 font-medium text-primary">{t.title}</td>
                    <td className="py-2.5 px-3 text-muted">{formatDate(t.date)}</td>
                    <td className="py-2.5 px-3 text-muted">{t.type}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        "score-badge text-xs",
                        t.score_pct >= 70 ? "bg-green-500/15 text-green-400"
                        : t.score_pct >= 50 ? "bg-yellow-500/15 text-yellow-400"
                        : "bg-red-500/15 text-red-400"
                      )}>
                        {t.score_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-green-400">{t.correct}</td>
                    <td className="py-2.5 px-3 text-red-400">{t.incorrect}</td>
                    <td className="py-2.5 px-3 text-yellow-400">{t.unattempted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="h-10 w-48 shimmer rounded-xl bg-elevated" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 shimmer rounded-xl bg-elevated" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 shimmer rounded-xl bg-elevated" />)}
      </div>
    </div>
  );
}
