"use client";
import { apiFetch } from "../../lib/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Clock, Flame, Target, TrendingUp, CheckCircle2,
  Play, Calendar, ClipboardList, Sparkles, ChevronRight, BarChart2,
} from "lucide-react";
import Link from "next/link";
import { useProfile } from "../../store/profile-context";
import { cn, formatDate, pct, formatDuration, subjectColor } from "../../lib/utils";
import StudyHeatmap from "../../components/charts/StudyHeatmap";
import ProgressRing from "../../components/charts/ProgressRing";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: "easeOut" },
});

export default function DashboardPage() {
  const { profile, countdown } = useProfile();
  const [data, setData] = useState(null);
  const [streakHistory, setStreakHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/db?q=dashboard").then(r => r.json()),
      apiFetch("/api/db?q=streak-history").then(r => r.json()),
    ]).then(([d, s]) => {
      setData(d);
      setStreakHistory(s.history || []);
    }).finally(() => setLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) return <DashboardSkeleton />;

  const { subjects = [], todayTasks = [], streak = 0, watchToday, recentTests = [], testAnalytics } = data || {};
  const todayMinutes = Math.round(watchToday?.total || 0);
  const completedTasks = todayTasks.filter(t => t.is_completed).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            {greeting()}, {profile?.name?.split(" ")[0] || "Learner"} 👋
          </h1>
          <p className="text-secondary mt-1">
            {formatDate(new Date())} · Let's make today count
          </p>
        </div>
        {countdown && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Target className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-xs text-indigo-400/70">{profile?.exam_type}</p>
              <p className="font-display font-bold text-indigo-300 text-lg leading-none">
                {countdown.daysRemaining} <span className="text-sm font-normal">days left</span>
              </p>
            </div>
            <div className="w-12">
              <ProgressRing pct={countdown.progressPct} size={40} color="#6366f1" />
            </div>
          </div>
        )}
      </motion.div>

      {/* Key stats */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Study Time Today"
          value={`${todayMinutes}m`}
          sub="of your daily goal"
          color="indigo"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${streak} days`}
          sub="keep it going!"
          color={streak > 0 ? "orange" : "gray"}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Tasks Today"
          value={`${completedTasks}/${todayTasks.length}`}
          sub="completed"
          color="green"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Test Score"
          value={testAnalytics?.avg_score ? `${Math.round(testAnalytics.avg_score)}%` : "—"}
          sub="across all tests"
          color="cyan"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Subjects + Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject progress */}
          <motion.div {...fadeUp(0.1)} className="glass p-6 rounded-[2rem] shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-primary">Subject Progress</h2>
              <Link href="/courses" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {subjects.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="w-8 h-8" />}
                title="No courses yet"
                desc="Add a course to start tracking your progress"
                action={{ label: "Add Course", href: "/courses" }}
              />
            ) : (
              <div className="space-y-3">
                {subjects.slice(0, 6).map(sub => {
                  const progress = sub.total_lectures > 0
                    ? pct(sub.completed_lectures, sub.total_lectures) : 0;
                  return (
                    <Link key={sub.id} href={`/courses/${sub.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-elevated hover:bg-overlay transition-colors cursor-pointer">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ background: sub.color || subjectColor(sub.name) }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-primary truncate">{sub.name}</span>
                            <span className="text-xs text-muted ml-2 flex-shrink-0">
                              {sub.completed_lectures}/{sub.total_lectures} lectures
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${progress}%`, background: sub.color || subjectColor(sub.name) }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-mono text-secondary w-10 text-right">{progress}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Study heatmap */}
          <motion.div {...fadeUp(0.15)} className="glass p-6 rounded-[2rem] shadow-xl shadow-black/20">
            <h2 className="font-display font-semibold text-primary mb-4">Study Activity</h2>
            <StudyHeatmap data={streakHistory} />
          </motion.div>
        </div>

        {/* Right: Today's plan + Recent tests */}
        <div className="space-y-6">
          {/* Today's tasks */}
          <motion.div {...fadeUp(0.2)} className="glass p-6 rounded-[2rem] shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-primary">Today's Plan</h2>
              <Link href="/planner" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                Planner <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {todayTasks.length === 0 ? (
              <EmptyState
                icon={<Calendar className="w-6 h-6" />}
                title="No tasks today"
                desc="Plan your study session"
                action={{ label: "Add Task", href: "/planner" }}
              />
            ) : (
              <div className="space-y-2">
                {todayTasks.slice(0, 6).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                      task.is_completed ? "opacity-50" : "bg-elevated"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border mt-0.5 flex-shrink-0",
                      task.is_completed ? "bg-green-500 border-green-500" : "border-default"
                    )}>
                      {task.is_completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", task.is_completed ? "line-through text-muted" : "text-primary")}>
                        {task.title}
                      </p>
                      {task.start_time && (
                        <p className="text-xs text-muted">{task.start_time} · {task.subject_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent tests */}
          <motion.div {...fadeUp(0.25)} className="glass p-6 rounded-[2rem] shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-primary">Recent Tests</h2>
              <Link href="/tests" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                All tests <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recentTests.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title="No tests yet"
                desc="Log your test results"
                action={{ label: "Add Test", href: "/tests" }}
              />
            ) : (
              <div className="space-y-2">
                {recentTests.filter(t => t.is_completed).map(test => {
                  const score = pct(test.obtained_marks, test.total_marks);
                  return (
                    <div key={test.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-elevated">
                      <div className={cn(
                        "score-badge text-xs",
                        score >= 70 ? "bg-green-500/15 text-green-400" :
                        score >= 50 ? "bg-yellow-500/15 text-yellow-400" :
                        "bg-red-500/15 text-red-400"
                      )}>
                        {score}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary truncate">{test.title}</p>
                        <p className="text-xs text-muted">{formatDate(test.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* AI CTA */}
          <motion.div {...fadeUp(0.3)}>
            <Link href="/ai">
              <div className="ai-card card-surface p-5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-display font-semibold text-primary">AI Insights</h3>
                  <ChevronRight className="w-4 h-4 text-muted ml-auto group-hover:text-indigo-400 transition-colors" />
                </div>
                <p className="text-sm text-secondary">
                  Get personalized study recommendations, weak area analysis, and exam readiness score.
                </p>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const colors = {
    indigo: "text-indigo-400 bg-indigo-500/10 shadow-indigo-500/20",
    orange: "text-orange-400 bg-orange-500/10 shadow-orange-500/20",
    green: "text-green-400 bg-green-500/10 shadow-green-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 shadow-cyan-500/20",
    gray: "text-muted bg-white/5 shadow-white/5",
  };
  const gradientGlows = {
    indigo: "from-indigo-500/10",
    orange: "from-orange-500/10",
    green: "from-green-500/10",
    cyan: "from-cyan-500/10",
    gray: "from-white/5",
  };
  return (
    <div className="glass p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-white/5">
      <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl to-transparent opacity-50 pointer-events-none rounded-full blur-2xl -mr-10 -mt-10", gradientGlows[color])} />
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-inner relative z-10", colors[color])}>
        <span className={colors[color].split(" ")[0]}>{icon}</span>
      </div>
      <p className="font-display text-3xl font-bold text-white tracking-tight relative z-10">{value}</p>
      <p className="text-sm text-indigo-200/70 font-medium relative z-10">{label}</p>
      <p className="text-xs text-muted mt-1 relative z-10">{sub}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
      <div className="text-muted mb-1">{icon}</div>
      <p className="text-sm font-medium text-secondary">{title}</p>
      <p className="text-xs text-muted">{desc}</p>
      {action && (
        <Link href={action.href} className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 text-xs hover:bg-indigo-500/25 transition-colors">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-10 bg-elevated rounded-xl w-72 shimmer" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-elevated rounded-xl shimmer" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-elevated rounded-xl shimmer" />
        <div className="h-64 bg-elevated rounded-xl shimmer" />
      </div>
    </div>
  );
}
