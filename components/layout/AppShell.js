"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, BookOpen, Calendar, ClipboardList,
  BarChart2, Sparkles, Settings, Menu, X, ChevronRight,
  Flame, Target, Clock, GraduationCap, Sun, Moon, LogOut, Library, PenTool,
} from "lucide-react";
import { cn, formatDate } from "../../lib/utils";
import { useProfile } from "../../store/profile-context";
import ProfileSetupModal from "../ui/ProfileSetupModal";
import AuthScreen from "../ui/AuthScreen";
import { apiFetch } from "../../lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/planner", label: "Planner", icon: Calendar },
  { href: "/tests", label: "Tests", icon: ClipboardList },
  { href: "/dpps", label: "DPPs", icon: PenTool },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/ai", label: "AI Insights", icon: Sparkles },
  { href: "/syllabus", label: "Syllabus", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, profile, showSetup, settings, countdown, loading, updateSettings, logout } = useProfile();
  const [collapsed, setCollapsed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (user) {
      apiFetch("/api/db?q=streak").then(r => r.json()).then(d => setStreak(d.streak || 0)).catch(() => {});
    }
  }, [user]);

  // Sync theme state from settings
  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme);
  }, [settings?.theme]);

  // Apply theme to document — single source of truth
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }, [theme]);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await updateSettings({ theme: next });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl accent-bg flex items-center justify-center glow-accent">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <p className="text-muted text-sm">Loading LearningOS...</p>
        </div>
      </div>
    );
  }

  // ── AUTH GATE — show login screen if not logged in ──
  if (!user) return <AuthScreen />;

  return (
    <>
      {showSetup && <ProfileSetupModal />}

      <div className="flex h-screen overflow-hidden bg-base bg-grid relative">
        {/* Sidebar */}
        <aside className={cn(
          "flex-shrink-0 flex flex-col border-r transition-all duration-300 relative z-20",
          collapsed ? "w-16" : "w-64",
          "bg-black/20 backdrop-blur-2xl border-white/10"
        )}>
          {/* Logo */}
          <div className={cn(
            "flex items-center gap-3 px-5 h-20 border-b border-white/5 flex-shrink-0 relative overflow-hidden",
            collapsed && "justify-center px-0"
          )}>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50" />
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0 relative z-10">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-lg tracking-tight text-white relative z-10">
                LearningOS
              </span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    active ? "text-white bg-indigo-500/15" : "text-muted hover:text-white hover:bg-white/5",
                    collapsed && "justify-center px-0 w-full"
                  )}
                  title={collapsed ? label : undefined}
                >
                  {active && (
                    <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 rounded-r-full" />
                  )}
                  <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", active ? "text-indigo-400" : "text-muted group-hover:text-white")} />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          {1 && (
            <div className="p-4 border-t border-white/5">
              <button
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={cn(
                  "flex items-center justify-center w-full h-10 rounded-xl transition-all duration-300 font-medium",
                  theme === "light"
                    ? "bg-amber-400/10 hover:bg-amber-400/20 text-amber-500 border border-amber-400/20"
                    : "bg-black/20 hover:bg-indigo-500/20 text-indigo-300 border border-white/5 hover:border-indigo-500/30"
                )}
              >
                {!collapsed && <span className="text-sm mr-2">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Bottom stats */}
          {!collapsed && (
            <div className="p-4 pt-0 space-y-3">
              {/* Stats container */}
              <div className="bg-black/20 border border-white/5 rounded-2xl p-3 space-y-3">
                {/* Streak */}
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", streak > 0 ? "bg-orange-500/20" : "bg-white/5")}>
                    <Flame className={cn("w-4 h-4", streak > 0 ? "text-orange-500" : "text-muted")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted font-medium uppercase tracking-wider">Streak</p>
                    <p className="text-sm font-bold text-white">{streak} days</p>
                  </div>
                </div>

                {/* Exam countdown */}
                {countdown && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted font-medium uppercase tracking-wider truncate">{profile?.exam_type || "Exam"}</p>
                      <p className="text-sm font-bold text-white">
                        {countdown.daysRemaining}d left
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile + logout button */}
              <div className="flex items-center gap-2 p-2 rounded-2xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5 cursor-pointer" onClick={() => window.location.href = '/settings'}>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-inner shadow-white/20">
                  {profile?.name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">{profile?.name || user?.username}</p>
                  <p className="text-xs text-muted truncate">{profile?.exam_type || "No exam set"}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); logout(); }} title="Sign out"
                  className="p-2 rounded-xl text-muted hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="flex items-center justify-center h-10 border-t border-default text-muted hover:text-primary transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </>
  );
}
