"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, User, Calendar, Target, ArrowRight, Check, Sparkles } from "lucide-react";
import { EXAM_TYPES } from "../../lib/constants";
import { useProfile } from "../../store/profile-context";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

const STEPS = [
  { id: "name", label: "Your Name", icon: User },
  { id: "exam", label: "Target Exam", icon: Target },
  { id: "dates", label: "Study Dates", icon: Calendar },
];

export default function ProfileSetupModal() {
  const { updateProfile, setShowSetup } = useProfile();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    exam_type: "",
    start_date: new Date().toISOString().split("T")[0],
    exam_date: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.exam_type.length > 0;
    if (step === 2) return form.exam_date.length > 0 && form.start_date.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile setup complete! Welcome to LearningOS 🚀");
      // Explicitly ensure the modal closes
      setShowSetup(false);
    } catch (e) {
      toast.error(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-md relative"
      >
        {/* Glow behind modal */}
        <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] -z-10 rounded-full pointer-events-none" />

        <div className="glass rounded-[2rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
          {/* Header */}
          <div className="relative p-8 pb-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-violet-600/10 z-0" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500 mx-auto flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-bold text-white tracking-tight">Complete Profile</h1>
              <p className="text-indigo-200/70 text-sm mt-1.5 font-medium">Personalize your learning experience</p>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 px-8 pt-6 pb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  i < step ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30" :
                  i === step ? "bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400" :
                  "bg-black/20 border border-white/10 text-muted"
                )}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-10 h-1 rounded-full bg-black/20 overflow-hidden relative">
                    <div className={cn("absolute inset-y-0 left-0 bg-indigo-500 transition-all duration-500", i < step ? "w-full" : "w-0")} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="px-8 py-6 min-h-[220px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-2">What should we call you?</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-indigo-400 transition-colors" />
                        <input
                          autoFocus
                          value={form.name}
                          onChange={e => set("name", e.target.value)}
                          onKeyDown={e => e.key === "Enter" && canNext() && handleNext()}
                          placeholder="e.g. Arjun Sharma"
                          className="w-full bg-black/20 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-base font-medium text-white placeholder-muted focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-3">Which exam are you preparing for?</label>
                      <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {EXAM_TYPES.map(exam => (
                          <button
                            key={exam}
                            onClick={() => set("exam_type", exam)}
                            className={cn(
                              "px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200 border",
                              form.exam_type === exam
                                ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-inner shadow-indigo-500/10"
                                : "bg-black/20 border-white/5 text-muted hover:border-white/20 hover:text-white/90"
                            )}
                          >
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[13px] font-semibold text-white/80 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={form.start_date}
                          onChange={e => set("start_date", e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-white/80 mb-2">Target Date</label>
                        <input
                          type="date"
                          value={form.exam_date}
                          min={form.start_date}
                          onChange={e => set("exam_date", e.target.value)}
                          className="w-full bg-black/20 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    {form.exam_date && form.start_date && (
                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mt-4">
                        <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <p className="text-sm text-indigo-200/90 font-medium">
                          <span className="text-white font-bold">{Math.max(0, Math.round((new Date(form.exam_date) - new Date()) / 86400000))} days</span> remaining to conquer your goal!
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 pt-2 flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-3 rounded-2xl border border-white/10 bg-black/20 text-muted hover:text-white hover:border-white/20 transition-all text-sm font-semibold"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canNext() || saving}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 relative overflow-hidden group",
                canNext() && !saving
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-white/5 text-muted cursor-not-allowed border border-white/5"
              )}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {step === STEPS.length - 1 ? "Complete Setup" : "Continue"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
