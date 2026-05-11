export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { callAI } from "../../../../lib/ai-client.js";
import { analyticsQ, profileQ, settingsQ, subjectsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
  
    const userId = requireUserId(req);
    const { question } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: "Question required" }, { status: 400 });

    const settings = await settingsQ.getAll(userId);
    const provider = settings.aiProvider;
    const apiKey = settings[`aiKey_${provider}`] || settings.aiApiKey || "";
    const model = settings.aiModel || "";

    if (!provider || provider === "none" || !apiKey) {
      return NextResponse.json({ error: "AI not configured. Go to Settings." }, { status: 400 });
    }

    const [snapshot, profile, subjects] = await Promise.all([
      analyticsQ.getSnapshot(userId),
      profileQ.get(userId),
      subjectsQ.getAll(userId),
    ]);

    const subjectInfo = subjects.map(s =>
      `- ${s.name}${s.weightage ? ` (${s.weightage}% weightage)` : ""}${s.description ? `: ${s.description}` : ""}`
    ).join("\n");

    const systemPrompt = `You are an expert academic coach for ${profile?.name || "a student"} preparing for ${profile?.exam_type || "an exam"}${profile?.exam_branch ? ` (${profile.exam_branch})` : ""}.
Be direct, specific, and actionable. Base your answer on the student's actual data provided.${profile?.ai_remark ? `\n\nStudent's personal note: ${profile.ai_remark}` : ""}`;

    const userPrompt = `## Student Data
Exam: ${profile?.exam_type || "N/A"} | Branch: ${profile?.exam_branch || "N/A"} | Days remaining: ${
      profile?.exam_date ? Math.max(0, Math.floor((new Date(profile.exam_date) - new Date()) / 86400000)) : "N/A"
    }

## Subjects
${subjectInfo || "No subjects added yet"}

## Study Activity
${snapshot.watchBySubject?.map(s => `- ${s.name}: ${Math.round(s.total_minutes || 0)} mins`).join("\n") || "No data"}

## Test Performance
${snapshot.testStats?.slice(0, 5).map(t => `- ${t.title}: ${t.score_pct}%`).join("\n") || "No tests"}

## Lecture Completion
${snapshot.lectureCompletion?.map(s => `- ${s.name}: ${s.completed}/${s.total}`).join("\n") || "No data"}

## Streak (last 30 days)
${snapshot.streak?.streak_days || 0} days goal met, ${Math.round(snapshot.streak?.total_minutes || 0)} total mins

---
Question: ${question}`;

    const OPENROUTER_FALLBACKS = [
      "openrouter/auto",
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "qwen/qwen3-coder:free",
    ];
    const FALLBACK_MODELS = provider === "openrouter"
      ? [model, ...OPENROUTER_FALLBACKS].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
      : [model];

    let answer, lastError;
    for (const m of FALLBACK_MODELS) {
      try {
        answer = await callAI({ provider, apiKey, model: m, systemPrompt, userPrompt });
        break;
      } catch (e) {
        lastError = e;
        const retry = e?.message?.includes("429") || e?.message?.includes("404");
        if (!retry) throw e;
      }
    }
    if (!answer) throw lastError || new Error("All models failed");

    return NextResponse.json({ answer });
  } catch (e) {
    console.error("Ask error:", e);
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
