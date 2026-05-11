"use client";
import { apiFetch } from "../../lib/api";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Sparkles,
  Settings,
  Eye,
  EyeOff,
  Save,
  Sun,
  Moon,
  CalculatorIcon,
  ExternalLink,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useProfile } from "../../store/profile-context";
import { AI_MODELS, EXAM_TYPES, PLAYBACK_SPEEDS } from "../../lib/constants";
import Calculator from "../../components/ui/Calculator";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "ai", label: "AI Config", icon: Sparkles },
  { id: "app", label: "App Settings", icon: Settings },
  { id: "calculator", label: "Calculator", icon: CalculatorIcon },
];

const AI_PROVIDERS_LIST = [
  { id: "none", label: "None", placeholder: "" },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    keyLabel: "platform.openai.com/api-keys",
  },
  {
    id: "claude",
    label: "Claude",
    placeholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/keys",
    keyLabel: "console.anthropic.com/keys",
  },
  {
    id: "gemini",
    label: "Gemini",
    placeholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    keyLabel: "aistudio.google.com/apikey",
    badge: "Free tier",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    placeholder: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
    keyLabel: "openrouter.ai/keys",
    badge: "Free",
  },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { profile, settings, updateProfile, updateSettings } = useProfile();
  const [tab, setTab] = useState(searchParams.get("tab") || "profile");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState("dark");
const [aiTab, setAiTab] = useState("free");
  const [profileForm, setProfileForm] = useState({
    name: "",
    exam_type: "",
    exam_branch: "",
    start_date: "",
    exam_date: "",
    ai_remark: "",
  });

  const [aiForm, setAiForm] = useState({
  aiProvider: "none",
  aiKeys: { openai: "", claude: "", gemini: "", openrouter: "" },
  aiModel: "",
});

  const [appForm, setAppForm] = useState({
    autoplay: true,
    resumePlayback: true,
    defaultSpeed: 1,
    streakGoal: 30,
    videosBasePath: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || "",
        exam_type: profile.exam_type || "",
        exam_branch: profile.exam_branch || "", 
        start_date: profile.start_date || "",
        exam_date: profile.exam_date || "",
        ai_remark: profile.ai_remark || "",
      });
    }
    if (settings) {
     setAiForm({
  aiProvider: settings.aiProvider || "none",
 aiKeys: {
  openai: settings?.aiKey_openai || "",
  claude: settings?.aiKey_claude || "",
  gemini: settings?.aiKey_gemini || "",
  openrouter: settings?.aiKey_openrouter || "",
},
  aiModel: settings.aiModel || "",
});
      setAppForm({
        autoplay: settings.autoplay ?? true,
        resumePlayback: settings.resumePlayback ?? true,
        defaultSpeed: settings.defaultSpeed || 1,
        streakGoal: settings.streakGoal || 30,
        videosBasePath: settings.videosBasePath || "",
      });
      setTheme(settings.theme || "dark");
    }
  }, [profile, settings]);

  // Apply theme to document
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

  useEffect(() => {
  if (settings?.aiProvider === "openrouter") setAiTab("free");
  else if (settings?.aiProvider && settings.aiProvider !== "none") setAiTab("paid");
}, [settings?.aiProvider]);

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    await updateSettings({ theme: next });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile(profileForm);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

const saveAI = async () => {
  setSaving(true);
  const providerToSave = aiTab === "free" ? "openrouter" : aiForm.aiProvider;
  try {
    const activeKey = aiForm.aiKeys[providerToSave] || "";
    await updateSettings({
      aiProvider: providerToSave,
      aiApiKey: activeKey, // keep for backward compat
      aiKey_openai: aiForm.aiKeys.openai,
      aiKey_claude: aiForm.aiKeys.claude,
      aiKey_gemini: aiForm.aiKeys.gemini,
      aiKey_openrouter: aiForm.aiKeys.openrouter,
      aiModel: aiForm.aiModel,
    });
    toast.success("AI settings saved");
  } catch {
    toast.error("Failed to save");
  }
  setSaving(false);
};

  const saveApp = async () => {
    setSaving(true);
    try {
      await updateSettings(appForm);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const availableModels = AI_MODELS[aiForm.aiProvider] || [];
  const activeProvider = AI_PROVIDERS_LIST.find(
    (p) => p.id === aiForm.aiProvider,
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            Settings
          </h1>
          <p className="text-secondary mt-1">
            Manage your profile, AI configuration, and app preferences
          </p>
        </div>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl border font-medium text-sm transition-all",
            theme === "light"
              ? "border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
              : "border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20",
          )}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn("nav-item w-full", tab === id && "active")}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ─── PROFILE ─── */}
          {tab === "profile" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-surface p-6 space-y-5"
            >
              <h2 className="font-display font-semibold text-primary">
                Profile Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Name
                  </label>
                  <input
                    value={profileForm.name}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="input-base max-w-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Target Exam
                  </label>
                  <select
                    value={profileForm.exam_type}
                    onChange={(e) =>
                      setProfileForm((f) => ({
                        ...f,
                        exam_type: e.target.value,
                      }))
                    }
                    className="input-base max-w-sm"
                  >
                    <option value="">Select exam</option>
                    {EXAM_TYPES.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
  <label className="block text-sm font-medium text-secondary mb-1.5">
    Branch / Specialization
  </label>
  <input
    value={profileForm.exam_branch || ""}
    onChange={e => setProfileForm(f => ({ ...f, exam_branch: e.target.value }))}
    className="input-base max-w-sm"
    placeholder="e.g. Computer Science, Electronics, Maths & Computing..."
  />
  <p className="text-xs text-muted mt-1">Optional — helps AI give branch-specific advice</p>
</div>
                <div>
  <label className="block text-sm font-medium text-secondary mb-1.5">
    AI Personal Note
  </label>
  <textarea
    value={profileForm.ai_remark || ""}
    onChange={e => setProfileForm(f => ({ ...f, ai_remark: e.target.value }))}
    className="input-base max-w-sm min-h-[80px] resize-none"
    placeholder="e.g. I am weak in thermodynamics, strong in mechanics. Exam is GATE CS 2026. Focus on algorithms."
    rows={3}
  />
  <p className="text-xs text-muted mt-1">Shared with AI — helps it give you more personalized advice</p>
</div>
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={profileForm.start_date}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                      className="input-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-1.5">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={profileForm.exam_date}
                      onChange={(e) =>
                        setProfileForm((f) => ({
                          ...f,
                          exam_date: e.target.value,
                        }))
                      }
                      className="input-base"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </motion.div>
          )}

          {/* ─── AI ─── */}
         {tab === "ai" && (
  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card-surface p-6 space-y-5">
    <div>
      <h2 className="font-display font-semibold text-primary">AI Configuration</h2>
      <p className="text-secondary text-sm mt-1">Choose a provider to get AI-powered study insights and plans</p>
    </div>

    {/* Provider type toggle */}
    <div className="flex gap-2 p-1 rounded-xl bg-elevated w-fit">
      <button
        onClick={() => setAiTab("free")}
        className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", aiTab === "free" ? "bg-green-600 text-white" : "text-secondary hover:text-primary")}
      >
        Free (OpenRouter)
      </button>
      <button
        onClick={() => setAiTab("paid")}
        className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", aiTab === "paid" ? "bg-indigo-600 text-white" : "text-secondary hover:text-primary")}
      >
        Other APIs
      </button>
    </div>

    {/* ── FREE: OpenRouter ── */}
    {aiTab === "free" && (
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-1">
          <p className="text-sm font-medium text-green-400">✓ 100% Free — no billing needed</p>
          <p className="text-xs text-green-400/70">Uses OpenRouter to access powerful free AI models</p>
        </div>

        {/* How to get key */}
        <div className="p-4 rounded-xl bg-elevated border border-default space-y-3 text-sm max-w-md">
          <p className="font-medium text-primary">How to set up (2 minutes):</p>
          <ol className="space-y-2 text-secondary text-xs list-none">
            <li className="flex gap-2"><span className="text-green-400 font-bold flex-shrink-0">1.</span> Go to <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">openrouter.ai</a> and sign up with Google</li>
            <li className="flex gap-2"><span className="text-green-400 font-bold flex-shrink-0">2.</span> Click your profile → <strong className="text-primary">Keys</strong> → <strong className="text-primary">Create Key</strong> → copy it</li>
            <li className="flex gap-2"><span className="text-green-400 font-bold flex-shrink-0">3.</span> Go to <a href="https://openrouter.ai/settings/privacy" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">openrouter.ai/settings/privacy</a></li>
            <li className="flex gap-2"><span className="text-green-400 font-bold flex-shrink-0">4.</span> Enable <strong className="text-primary">all 3 toggles</strong>: model training, prompt logging, free endpoints — this is required for free models to work</li>
            <li className="flex gap-2"><span className="text-green-400 font-bold flex-shrink-0">5.</span> Paste your key below and save</li>
          </ol>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">API Key</label>
          <div className="relative max-w-md">
            <input
              type={showKey ? "text" : "password"}
            value={aiForm.aiKeys?.openrouter || ""}
onChange={e => setAiForm(f => ({ ...f, aiProvider: "openrouter", aiKeys: { ...f.aiKeys, openrouter: e.target.value } }))}
              placeholder="sk-or-..."
              className="input-base pr-10 font-mono text-xs"
            />
            <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted mt-1">Stored locally in SQLite — never sent to our servers</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary mb-1.5">Free Model</label>
          <select
           value={aiForm.aiModel}
onChange={e => setAiForm(f => ({ ...f, aiModel: e.target.value }))}
            className="input-base max-w-sm"
          >
            <option value="">Auto (best available)</option>
            <option value="mistralai/mistral-small-3.1-24b-instruct:free">Mistral Small 3.1 24B</option>
            <option value="qwen/qwen3-coder:free">Qwen3 Coder</option>
            <option value="deepseek/deepseek-r1-distill-qwen-32b:free">DeepSeek R1 Distill 32B</option>
            <option value="nousresearch/hermes-3-llama-3.1-405b:free">Hermes 3 405B (Powerful)</option>
          </select>
          <p className="text-xs text-muted mt-1">
            All free. Find more at <a href="https://openrouter.ai/models?q=free" target="_blank" rel="noopener noreferrer" className="text-green-400 underline">openrouter.ai/models?q=free</a>
          </p>
        </div>

        <button onClick={saveAI} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save & Use Free AI"}
        </button>
      </div>
    )}

    {/* ── PAID: OpenAI / Claude / Gemini ── */}
    {aiTab === "paid" && (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Provider</label>
          <div className="flex flex-wrap gap-2">
            {AI_PROVIDERS_LIST.filter(p => p.id !== "none" && p.id !== "openrouter").map(p => (
              <button
                key={p.id}
                onClick={() => setAiForm(f => ({ ...f, aiProvider: p.id, aiModel: "" }))}
                className={cn(
                  "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                  aiForm.aiProvider === p.id ? "border-indigo-500 bg-indigo-500/15 text-indigo-300" : "border-default bg-elevated text-secondary hover:border-strong"
                )}
              >
                {p.label}
                {p.badge && <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-md bg-green-500/20 text-green-400 font-semibold">{p.badge}</span>}
              </button>
            ))}
          </div>
        </div>

        {aiForm.aiProvider !== "none" && aiForm.aiProvider !== "openrouter" && (
          <>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">API Key</label>
              <div className="relative max-w-md">
                <input
                  type={showKey ? "text" : "password"}
                value={aiForm.aiKeys?.[aiForm.aiProvider] || ""}
onChange={e => setAiForm(f => ({ ...f, aiKeys: { ...f.aiKeys, [f.aiProvider]: e.target.value } }))}
                  placeholder={AI_PROVIDERS_LIST.find(p => p.id === aiForm.aiProvider)?.placeholder || "API Key..."}
                  className="input-base pr-10 font-mono text-xs"
                />
                <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted mt-1.5">Stored locally in SQLite — never sent to our servers</p>
            </div>

            {/* How to get key per provider */}
            <div className="p-4 rounded-xl bg-elevated border border-default space-y-2 text-sm max-w-md">
              <p className="font-medium text-secondary">Get your API key:</p>
              <a href={AI_PROVIDERS_LIST.find(p => p.id === aiForm.aiProvider)?.keyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:underline text-xs">
                {AI_PROVIDERS_LIST.find(p => p.id === aiForm.aiProvider)?.keyLabel} <ExternalLink className="w-3 h-3" />
              </a>
              {aiForm.aiProvider === "gemini" && (
                <p className="text-xs text-yellow-400">⚠ Free tier may not work in India. Enable billing or use OpenRouter instead.</p>
              )}
              {aiForm.aiProvider === "claude" && (
                <p className="text-xs text-yellow-400">⚠ Requires minimum $5 credit purchase to get API access.</p>
              )}
              {aiForm.aiProvider === "openai" && (
                <p className="text-xs text-muted">New accounts get free trial credits. Paid after trial ends.</p>
              )}
            </div>
          </>
        )}

        <button onClick={saveAI} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-60">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save AI Settings"}
        </button>
      </div>
    )}
  </motion.div>
)}

          {tab === "freeai" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-surface p-6 space-y-5"
            >
              <div>
                <h2 className="font-display font-semibold text-primary">
                  Free AI via OpenRouter
                </h2>
                <p className="text-secondary text-sm mt-1">
                  Access powerful AI models completely free. No credit card
                  required.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 space-y-1">
                <p className="text-sm font-medium text-green-400">
                  ✓ 100% Free — no billing needed
                </p>
                <p className="text-xs text-green-400/70">
                  Free models are marked with :free suffix
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Select Provider
                  </label>
                  <button
                    onClick={() =>
                      setAiForm((f) => ({
                        ...f,
                        aiProvider: "openrouter",
                        aiModel: "",
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                      aiForm.aiProvider === "openrouter"
                        ? "border-green-500 bg-green-500/15 text-green-300"
                        : "border-default bg-elevated text-secondary hover:border-strong",
                    )}
                  >
                    OpenRouter{" "}
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-md bg-green-500/20 text-green-400 font-semibold">
                      Free
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    API Key
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type={showKey ? "text" : "password"}
                      value={
                        aiForm.aiProvider === "openrouter"
                          ? aiForm.aiApiKey
                          : ""
                      }
                      onChange={(e) =>
                        setAiForm((f) => ({
                          ...f,
                          aiProvider: "openrouter",
                          aiApiKey: e.target.value,
                        }))
                      }
                      placeholder="sk-or-..."
                      className="input-base pr-10 font-mono text-xs"
                    />
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 hover:underline mt-1.5 flex items-center gap-1"
                  >
                    Get free key at openrouter.ai/keys{" "}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Free Model
                  </label>
                 <select
  value={aiForm.aiModel}
  onChange={e => setAiForm(f => ({ ...f, aiModel: e.target.value }))}
  className="input-base max-w-sm"
>
  <option value="">Auto</option>
<option value="mistralai/mistral-small-3.1-24b-instruct:free">Mistral Small 3.1 24B</option>
<option value="qwen/qwen3-coder:free">Qwen3 Coder</option>
<option value="deepseek/deepseek-r1-distill-qwen-32b:free">DeepSeek R1 Distill 32B</option>
<option value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash Exp</option>
<option value="microsoft/phi-4-reasoning-plus:free">Phi-4 Reasoning Plus</option>
</select>
<p className="text-xs text-muted mt-1">All models are free — no usage charges</p>
                </div>
              </div>

              <button
                onClick={saveAI}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save & Use Free AI"}
              </button>
            </motion.div>
          )}

          {/* ─── APP ─── */}
          {tab === "app" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-surface p-6 space-y-5"
            >
              <h2 className="font-display font-semibold text-primary">
                App Preferences
              </h2>
              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Videos Base Folder
                  </label>
                  <input
                    type="text"
                    value={appForm.videosBasePath || ""}
                    onChange={(e) =>
                      setAppForm((f) => ({
                        ...f,
                        videosBasePath: e.target.value,
                      }))
                    }
                    placeholder="C:\Users\Name\Videos  or  /home/name/videos"
                    className="input-base font-mono text-xs"
                  />
                  <p className="text-xs text-muted mt-1.5">
                    Root folder where all your video folders are stored. Set
                    once, works for all courses.
                  </p>
                </div>
                <Toggle
                  label="Autoplay next lecture"
                  value={appForm.autoplay}
                  onChange={(v) => setAppForm((f) => ({ ...f, autoplay: v }))}
                />
                <Toggle
                  label="Resume from last position"
                  value={appForm.resumePlayback}
                  onChange={(v) =>
                    setAppForm((f) => ({ ...f, resumePlayback: v }))
                  }
                />
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Default Playback Speed
                  </label>
                  <select
                    value={appForm.defaultSpeed}
                    onChange={(e) =>
                      setAppForm((f) => ({
                        ...f,
                        defaultSpeed: parseFloat(e.target.value),
                      }))
                    }
                    className="input-base"
                  >
                    {PLAYBACK_SPEEDS.map((s) => (
                      <option key={s} value={s}>
                        {s}×
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">
                    Daily Streak Goal (minutes)
                  </label>
                  <input
                    type="number"
                    value={appForm.streakGoal}
                    min={1}
                    onChange={(e) =>
                      setAppForm((f) => ({
                        ...f,
                        streakGoal: parseInt(e.target.value),
                      }))
                    }
                    className="input-base"
                  />
                </div>
              </div>
              <button
                onClick={saveApp}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </motion.div>
          )}

          {/* ─── CALCULATOR ─── */}
          {tab === "calculator" && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Calculator />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-secondary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          value ? "bg-indigo-600" : "bg-elevated border border-default",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
            value && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
