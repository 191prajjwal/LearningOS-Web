"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { format, isToday, isSameDay } from "date-fns";
import {
  Plus, Trash2, CheckCircle2, Circle, Calendar,
  Clock, Target, Link as LinkIcon, Star, MoreHorizontal, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, subjectColor } from "../../lib/utils";
import { PRIORITIES, PRIORITY_COLORS } from "../../lib/constants";

const TASK_TYPES = ["study", "revision", "test", "break", "other"];

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [importantDates, setImportantDates] = useState([]);
  const [goals, setGoals] = useState([]);
  const [links, setLinks] = useState([]);
  const [tab, setTab] = useState("tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddDate, setShowAddDate] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [editingLink, setEditingLink] = useState(null);

  const startEditTask = (task) => {
    setEditingTask(task.id);
    setTaskForm({ title: task.title, subject_id: task.subject_id || "", start_time: task.start_time || "", duration_minutes: task.duration_minutes || 60, priority: task.priority, type: task.type });
    setShowAddTask(true);
  };
  const startEditGoal = (goal) => {
    setEditingGoal(goal.id);
    setGoalForm({ title: goal.title, subject_id: goal.subject_id || "", target_value: goal.target_value || "", unit: goal.unit || "hours", due_date: goal.due_date || "", priority: goal.priority, type: goal.type || "daily" });
    setShowAddGoal(true);
  };
  const startEditDate = (d) => {
    setEditingDate(d.id);
    setDateForm({ title: d.title, date: d.date, type: d.type, description: d.description || "" });
    setShowAddDate(true);
  };
  const startEditLink = (link) => {
    setEditingLink(link.id);
    setLinkForm({ title: link.title, url: link.url, subject_id: link.subject_id || "", description: link.description || "" });
    setShowAddLink(true);
  };

  const [taskForm, setTaskForm] = useState({
    title: "", subject_id: "", start_time: "", duration_minutes: 60, priority: "medium", type: "study",
  });
  const [dateForm, setDateForm] = useState({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "exam", description: "" });
 const [goalForm, setGoalForm] = useState({ title: "", subject_id: "", target_value: "", unit: "hours", due_date: "", priority: "medium", type: "daily" });
  const [linkForm, setLinkForm] = useState({ title: "", url: "", subject_id: "", description: "" });

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  const loadAll = async () => {
    const [s, d, g, l] = await Promise.all([
      apiFetch("/api/courses").then(r => r.json()),
      apiFetch("/api/db?q=dates").then(r => r.json()),
      apiFetch("/api/db?q=goals").then(r => r.json()),
      apiFetch("/api/db?q=links").then(r => r.json()),
    ]);
    setSubjects(s.subjects || []);
    setImportantDates(d.dates || []);
    setGoals(g.goals || []);
    setLinks(l.links || []);
  };

  const loadTasks = async () => {
    const date = format(selectedDate, "yyyy-MM-dd");
    const r = await apiFetch(`/api/db?q=tasks&date=${date}`);
    const d = await r.json();
    setTasks(d.tasks || []);
  };

  const addTask = async () => {
    if (!taskForm.title.trim()) return;
    if (editingTask) {
      await apiFetch("/api/db?q=task", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingTask, ...taskForm, subject_id: taskForm.subject_id || null }),
      });
      setEditingTask(null);
      toast.success("Task updated");
    } else {
      await apiFetch("/api/db?q=task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskForm, date: format(selectedDate, "yyyy-MM-dd"), subject_id: taskForm.subject_id || null }),
      });
      toast.success("Task added");
    }
    setTaskForm({ title: "", subject_id: "", start_time: "", duration_minutes: 60, priority: "medium", type: "study" });
    setShowAddTask(false);
    loadTasks();
  };

  const toggleTask = async (id) => {
    await apiFetch("/api/db?q=task-toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadTasks();
  };

  const deleteTask = async (id) => {
    await apiFetch(`/api/db?q=task&id=${id}`, { method: "DELETE" });
    loadTasks();
  };

  const addImportantDate = async () => {
    if (!dateForm.title.trim()) return;
    if (editingDate) {
      await apiFetch("/api/db?q=date", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingDate, ...dateForm }),
      });
      setEditingDate(null);
      toast.success("Date updated");
    } else {
      await apiFetch("/api/db?q=date", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dateForm),
      });
      toast.success("Date added");
    }
    setDateForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "exam", description: "" });
    setShowAddDate(false);
    loadAll();
  };

  const addGoal = async () => {
    if (!goalForm.title.trim()) return;
    if (editingGoal) {
      await apiFetch("/api/db?q=goal", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingGoal, ...goalForm, subject_id: goalForm.subject_id || null }),
      });
      setEditingGoal(null);
      toast.success("Goal updated");
    } else {
      await apiFetch("/api/db?q=goal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...goalForm, subject_id: goalForm.subject_id || null }),
      });
      toast.success("Goal added");
    }
    setGoalForm({ title: "", subject_id: "", target_value: "", unit: "hours", due_date: "", priority: "medium" });
    setShowAddGoal(false);
    loadAll();
  };

  const addLink = async () => {
    if (!linkForm.title.trim() || !linkForm.url.trim()) return;
    if (editingLink) {
      await apiFetch("/api/db?q=link", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingLink, ...linkForm, subject_id: linkForm.subject_id || null }),
      });
      setEditingLink(null);
      toast.success("Link updated");
    } else {
      await apiFetch("/api/db?q=link", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...linkForm, subject_id: linkForm.subject_id || null }),
      });
      toast.success("Link saved");
    }
    setLinkForm({ title: "", url: "", subject_id: "", description: "" });
    setShowAddLink(false);
    loadAll();
  };

  const toggleGoal = async (id) => {
    await apiFetch("/api/db?q=goal-toggle", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadAll();
  };

  // Mark days with tasks on calendar
  const taskedDays = [];

  const TABS = [
    { id: "tasks", label: "Daily Plan" },
    { id: "goals", label: "Goals" },
    { id: "dates", label: "Key Dates" },
    { id: "links", label: "Links" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-primary">Planner</h1>
        <p className="text-secondary mt-1">Organize your study sessions, goals, and important dates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="card-surface p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            className="w-full"
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full",
              table: "w-full",
              head_row: "flex w-full",
              head_cell: "text-muted text-xs font-medium flex-1 text-center py-1",
              row: "flex w-full mt-1",
              cell: "flex-1 text-center",
              day: "w-8 h-8 mx-auto rounded-lg text-sm transition-all hover:bg-elevated cursor-pointer flex items-center justify-center",
              day_selected: "!bg-indigo-600 !text-white",
              day_today: "border border-indigo-500/50 text-indigo-400",
              day_outside: "text-muted/40",
              caption: "flex justify-between items-center mb-3",
              caption_label: "font-display font-semibold text-primary",
              nav: "flex gap-1",
              nav_button: "w-7 h-7 rounded-lg bg-elevated hover:bg-overlay text-secondary flex items-center justify-center transition-colors",
            }}
          />

          {/* Quick date info */}
          {isToday(selectedDate) ? (
            <div className="mt-3 pt-3 border-t border-default">
              <p className="text-xs text-indigo-400 font-medium">Today · {formatDate(selectedDate)}</p>
            </div>
          ) : (
            <div className="mt-3 pt-3 border-t border-default">
              <p className="text-xs text-muted">{formatDate(selectedDate)}</p>
            </div>
          )}

          {/* Upcoming important dates */}
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted font-medium uppercase tracking-wider">Upcoming</p>
            {importantDates.slice(0, 3).map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                <span className="text-secondary truncate">{d.title}</span>
                <span className="text-muted ml-auto flex-shrink-0">{formatDate(d.date, "MMM d")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-elevated w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  tab === t.id ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── TASKS ─── */}
          {tab === "tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-primary">
                  {isToday(selectedDate) ? "Today's Tasks" : `Tasks for ${formatDate(selectedDate, "MMM d")}`}
                </h2>
                <button onClick={() => setShowAddTask(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Task
                </button>
              </div>

              {showAddTask && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4 border-indigo-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Task Title *</label>
                      <input autoFocus value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Study Chapter 5" className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Subject</label>
                      <select value={taskForm.subject_id} onChange={e => setTaskForm(f => ({ ...f, subject_id: e.target.value }))} className="input-base">
                        <option value="">No subject</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Start Time</label>
                      <input type="time" value={taskForm.start_time} onChange={e => setTaskForm(f => ({ ...f, start_time: e.target.value }))} className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Duration (min)</label>
                      <input type="number" value={taskForm.duration_minutes} onChange={e => setTaskForm(f => ({ ...f, duration_minutes: e.target.value }))} className="input-base" min={1} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Priority</label>
                      <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))} className="input-base">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Type</label>
                      <select value={taskForm.type} onChange={e => setTaskForm(f => ({ ...f, type: e.target.value }))} className="input-base">
                        {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addTask} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">{editingTask ? "Update Task" : "Add Task"}</button>
                    <button onClick={() => { setShowAddTask(false); setEditingTask(null); setTaskForm({ title: "", subject_id: "", start_time: "", duration_minutes: 60, priority: "medium", type: "study" }); }} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <Calendar className="w-10 h-10 text-muted" />
                    <p className="text-secondary">No tasks for this day</p>
                    <button onClick={() => setShowAddTask(true)} className="text-indigo-400 text-sm hover:underline">Add a task</button>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                        task.is_completed ? "opacity-50 border-default" : "card-surface hover:border-strong"
                      )}
                      style={task.subject_color ? { borderLeftColor: task.subject_color, borderLeftWidth: 3 } : {}}
                    >
                      <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                        {task.is_completed
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <Circle className="w-5 h-5 text-muted hover:text-indigo-400 transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", task.is_completed && "line-through text-muted")}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {task.start_time && <span className="text-xs text-muted">{task.start_time}</span>}
                          {task.duration_minutes && <span className="text-xs text-muted">{task.duration_minutes}m</span>}
                          {task.subject_name && <span className="text-xs" style={{ color: task.subject_color || "#6366f1" }}>{task.subject_name}</span>}
                          <span
                            className="text-xs pill"
                            style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEditTask(task)} className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-muted hover:text-indigo-400 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── GOALS ─── */}
          {tab === "goals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-primary">Goals</h2>
                <button onClick={() => setShowAddGoal(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Goal
                </button>
              </div>

              {showAddGoal && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4 border-indigo-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-muted mb-1">Goal Title *</label>
                      <input autoFocus value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Complete Physics syllabus" className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Target Value</label>
                      <input type="number" value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))} placeholder="e.g. 10" className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Unit</label>
                      <select value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} className="input-base">
                        {["hours", "lectures", "chapters", "tests", "pages"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Due Date</label>
                      <input type="date" value={goalForm.due_date} onChange={e => setGoalForm(f => ({ ...f, due_date: e.target.value }))} className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Priority</label>
                      <select value={goalForm.priority} onChange={e => setGoalForm(f => ({ ...f, priority: e.target.value }))} className="input-base">
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addGoal} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">{editingGoal ? "Update Goal" : "Add Goal"}</button>
                    <button onClick={() => { setShowAddGoal(false); setEditingGoal(null); setGoalForm({ title: "", subject_id: "", target_value: "", unit: "hours", due_date: "", priority: "medium", type: "daily" }); }} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                {goals.map(goal => (
                  <div key={goal.id} className={cn("card-surface p-4 group", goal.is_completed && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => toggleGoal(goal.id)} className="mt-0.5 flex-shrink-0">
                        {goal.is_completed
                          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                          : <Target className="w-5 h-5 text-indigo-400" />
                        }
                      </button>
                      <div className="flex-1">
                        <p className={cn("font-medium text-sm", goal.is_completed && "line-through text-muted")}>{goal.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                          {goal.target_value && <span>{goal.target_value} {goal.unit}</span>}
                          {goal.due_date && <span>Due {formatDate(goal.due_date)}</span>}
                          {goal.subject_name && <span>{goal.subject_name}</span>}
                          <span
                            className="pill"
                            style={{ background: `${PRIORITY_COLORS[goal.priority]}20`, color: PRIORITY_COLORS[goal.priority] }}
                          >
                            {goal.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { startEditGoal(goal); setTab("goals"); }} className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-muted hover:text-indigo-400 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={async () => { await apiFetch(`/api/db?q=goal&id=${goal.id}`, { method: "DELETE" }); loadAll(); }} className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {goals.length === 0 && (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Target className="w-8 h-8 text-muted" />
                    <p className="text-secondary text-sm">No goals set yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── KEY DATES ─── */}
          {tab === "dates" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-primary">Important Dates</h2>
                <button onClick={() => setShowAddDate(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Date
                </button>
              </div>

              {showAddDate && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4 border-indigo-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Title *</label>
                      <input autoFocus value={dateForm.title} onChange={e => setDateForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. JEE Main 2025" className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Date *</label>
                      <input type="date" value={dateForm.date} onChange={e => setDateForm(f => ({ ...f, date: e.target.value }))} className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Type</label>
                      <select value={dateForm.type} onChange={e => setDateForm(f => ({ ...f, type: e.target.value }))} className="input-base">
                        {["exam", "deadline", "revision", "test", "holiday", "other"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Description</label>
                      <input value={dateForm.description} onChange={e => setDateForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional note" className="input-base" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addImportantDate} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">{editingDate ? "Update" : "Add"}</button>
                    <button onClick={() => { setShowAddDate(false); setEditingDate(null); setDateForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "exam", description: "" }); }} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                {importantDates.map(d => (
                  <div key={d.id} className="card-surface p-4 flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-red-400 uppercase font-mono">{formatDate(d.date, "MMM")}</span>
                      <span className="font-display font-bold text-red-300 text-lg leading-none">{formatDate(d.date, "d")}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-primary">{d.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                        <span className="capitalize">{d.type}</span>
                        {d.description && <span>· {d.description}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => startEditDate(d)} className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-muted hover:text-indigo-400 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={async () => { await apiFetch(`/api/db?q=date&id=${d.id}`, { method: "DELETE" }); loadAll(); }} className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {importantDates.length === 0 && (
                  <div className="flex flex-col items-center py-10 gap-2">
                    <Calendar className="w-8 h-8 text-muted" />
                    <p className="text-secondary text-sm">No important dates added</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── LINKS ─── */}
          {tab === "links" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-primary">Important Links</h2>
                <button onClick={() => setShowAddLink(v => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Link
                </button>
              </div>

              {showAddLink && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card-surface p-4 border-indigo-500/20 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted mb-1">Title *</label>
                      <input autoFocus value={linkForm.title} onChange={e => setLinkForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. NCERT Physics" className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">URL *</label>
                      <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="input-base" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Subject</label>
                      <select value={linkForm.subject_id} onChange={e => setLinkForm(f => ({ ...f, subject_id: e.target.value }))} className="input-base">
                        <option value="">General</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Description</label>
                      <input value={linkForm.description} onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" className="input-base" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addLink} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 transition-colors">{editingLink ? "Update Link" : "Save Link"}</button>
                    <button onClick={() => { setShowAddLink(false); setEditingLink(null); setLinkForm({ title: "", url: "", subject_id: "", description: "" }); }} className="px-4 py-2 rounded-lg border border-default text-secondary text-sm">Cancel</button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {links.map(link => (
                  <div key={link.id} className="card-surface p-4 group">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <LinkIcon className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary hover:text-indigo-400 transition-colors truncate block">
                          {link.title}
                        </a>
                        {link.description && <p className="text-xs text-muted mt-0.5 truncate">{link.description}</p>}
                        {link.subject_name && <p className="text-xs text-indigo-400 mt-0.5">{link.subject_name}</p>}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEditLink(link)} className="p-1 rounded hover:bg-indigo-500/15 text-muted hover:text-indigo-400 transition-all">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={async () => { await apiFetch(`/api/db?q=link&id=${link.id}`, { method: "DELETE" }); loadAll(); }} className="p-1 rounded hover:bg-red-500/15 text-muted hover:text-red-400 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {links.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center py-10 gap-2">
                    <LinkIcon className="w-8 h-8 text-muted" />
                    <p className="text-secondary text-sm">No links saved</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
