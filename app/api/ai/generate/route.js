export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { callAI, buildSystemPrompt, buildInsightsPrompt, buildPlannerPrompt } from "../../../../lib/ai-client.js";
import { analyticsQ, aiReportsQ, profileQ, settingsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const { type = "insights" } = body;

    const settings = await settingsQ.getAll(userId);
    const provider = settings.aiProvider || body.provider;
    const apiKey = settings[`aiKey_${settings.aiProvider}`] || settings.aiApiKey || "";
    const model = settings.aiModel || body.model || "";

    if (!provider || provider === "none") {
      return NextResponse.json({ error: "No AI provider configured. Go to Settings to add your API key." }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured. Go to Settings." }, { status: 400 });
    }

    const snapshot = await analyticsQ.getSnapshot(userId);
    const profile = await profileQ.get(userId);

    const countdown = profile?.exam_date && profile?.start_date
      ? (() => {
          const now = new Date();
          const exam = new Date(profile.exam_date);
          const start = new Date(profile.start_date);
          const total = Math.floor((exam - start) / 86400000);
          const elapsed = Math.floor((now - start) / 86400000);
          const remaining = Math.max(0, Math.floor((exam - now) / 86400000));
          const pct = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;
          return { totalDays: total, daysElapsed: elapsed, daysRemaining: remaining, progressPct: pct };
        })()
      : null;

    const systemPrompt = buildSystemPrompt(profile);
    let userPrompt;
    if (type === "planner") {
      userPrompt = buildPlannerPrompt(snapshot, profile, countdown);
    } else {
      userPrompt = buildInsightsPrompt(snapshot, profile, countdown);
    }

    const OPENROUTER_FALLBACKS = [
      "openrouter/auto",
      "mistralai/mistral-small-3.1-24b-instruct:free",
      "qwen/qwen3-coder:free",
      "deepseek/deepseek-r1-distill-qwen-32b:free",
    ];

    const FALLBACK_MODELS = provider === "openrouter"
      ? [settings.aiModel, ...OPENROUTER_FALLBACKS].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
      : [settings.aiModel || model];

    let content;
    let lastError;
    for (const m of FALLBACK_MODELS) {
      try {
        content = await callAI({ provider, apiKey, model: m, systemPrompt, userPrompt });
        break;
      } catch (e) {
        lastError = e;
        const isRetryable = e?.message?.includes("429") || e?.message?.includes("Provider returned error") || e?.message?.includes("404");
        if (!isRetryable) throw e;
        console.log(`Model ${m} failed (${e.message}), trying next...`);
      }
    }
    if (!content) throw lastError || new Error("All models failed");

    const reportId = await aiReportsQ.create(userId, {
      title: type === "planner" ? `Study Plan — ${new Date().toLocaleDateString()}` : `AI Report — ${new Date().toLocaleDateString()}`,
      type, content, model, provider,
      data_snapshot: JSON.stringify(snapshot),
    });

    const report = await aiReportsQ.getById(reportId, userId);
    return NextResponse.json({ report });
  } catch (e) {
    console.error("AI generation error:", e);
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e?.message || "Unknown error occurred" }, { status: 500 });
  }
}
