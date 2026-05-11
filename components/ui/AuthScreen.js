"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, User, Lock, ArrowRight, Sparkles, Eye, EyeOff, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useProfile } from "../../store/profile-context";

export default function AuthScreen() {
  const { login } = useProfile();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim()) { toast.error("Enter a username"); return; }
    if (pin.length !== 4) { toast.error("PIN must be 4 digits"); return; }
    setLoading(true);
    try {
      await login(username.trim(), pin, mode);
      toast.success(mode === "signup" ? "Account created! Welcome 🎉" : "Welcome back!");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base bg-grid p-4 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mb-6 border border-white/5 backdrop-blur-xl glow-accent">
            <GraduationCap className="w-10 h-10 text-indigo-400 drop-shadow-md" />
          </div>
          <h1 className="font-display text-4xl font-bold text-primary tracking-tight">LearningOS</h1>
          <p className="text-secondary text-sm mt-2 font-medium">Elevate your study experience</p>
        </motion.div>

        <motion.div variants={itemVariants} className="glass p-8 rounded-3xl space-y-6 shadow-2xl shadow-indigo-500/5">
          <div className="flex gap-1 p-1.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5">
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setPin(""); }}
                className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-300 relative",
                  mode === m ? "text-white shadow-lg" : "text-muted hover:text-primary")}>
                {mode === m && (
                  <motion.div layoutId="auth-tab" className="absolute inset-0 bg-indigo-600 rounded-xl" style={{ zIndex: -1 }} />
                )}
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
              {mode === "signup" && (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">Create a local profile to track your progress securely. Your data stays completely private.</p>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-indigo-400 transition-colors" />
                    <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                      placeholder="Username" className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-white placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all" autoFocus autoComplete="username" />
                  </div>
                </div>
                
                <div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-indigo-400 transition-colors" />
                    <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      onKeyDown={e => e.key === "Enter" && handleSubmit()} type={showPin ? "text" : "password"}
                      placeholder="••••" inputMode="numeric" className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-11 pr-12 text-center text-xl tracking-[0.5em] font-mono text-white placeholder-muted/50 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    <button onClick={() => setShowPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors">
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted text-center mt-2 font-medium">{mode === "signup" ? "Set a memorable 4-digit PIN" : "Enter your 4-digit PIN"}</p>
                </div>
              </div>

              <button onClick={handleSubmit} disabled={loading || !username.trim() || pin.length !== 4}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:cursor-not-allowed group relative overflow-hidden">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{mode === "login" ? "Sign In" : "Create Account"}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
