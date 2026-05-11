/**
 * Unified AI client supporting OpenAI, Anthropic Claude, and Google Gemini.
 * All calls are server-side only (API routes).
 */

const DEFAULT_MODELS = {
  openai: "gpt-3.5-turbo",
  claude: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.0-flash-lite",
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
};

export async function callAI({ provider, apiKey, model, systemPrompt, userPrompt }) {
  if (!apiKey) throw new Error("API key is required");
  const resolvedModel = model || DEFAULT_MODELS[provider];
  if (!resolvedModel) throw new Error("Unknown provider");

  if (provider === "openai") return callOpenAI({ apiKey, model:resolvedModel, systemPrompt, userPrompt });
  if (provider === "claude") return callClaude({ apiKey, model:resolvedModel, systemPrompt, userPrompt });
  if (provider === "gemini") return callGemini({ apiKey, model:resolvedModel, systemPrompt, userPrompt });

  if (provider === "openrouter") return callOpenRouter({ apiKey, model: resolvedModel, systemPrompt, userPrompt });

  throw new Error(`Unknown provider: ${provider}`);
}

async function callOpenAI({ apiKey, model, systemPrompt, userPrompt }) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callClaude({ apiKey, model, systemPrompt, userPrompt }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude error: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

async function callGemini({ apiKey, model, systemPrompt, userPrompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 2500, temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}


async function callOpenRouter({ apiKey, model, systemPrompt, userPrompt }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "LearningOS",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 3000,
    }),
  });

 if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || err?.message || JSON.stringify(err);
    throw new Error(`OpenRouter ${res.status}: ${msg}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

export function buildSystemPrompt(profile) {
  const examInfo = profile?.exam_branch
    ? `${profile.exam_type} (${profile.exam_branch})`
    : profile?.exam_type || "an exam";
  return `You are an expert academic coach for ${profile?.name || "a student"} preparing for ${examInfo}.
Provide advice specific to the ${examInfo} syllabus, weightage, and exam pattern.
Be professional, direct, and motivating. Structure responses with clear sections and bullet points.
Base all insights strictly on the data provided — do not invent statistics.${profile?.ai_remark ? "\n\nStudent's personal note: " + profile.ai_remark : ""}`;
}

export function buildInsightsPrompt(snapshot, profile, countdown) {
  const { watchBySubject = [], testStats = [], lectureCompletion = [] } = snapshot;

 return `Student: ${profile?.name}, Exam: ${profile?.exam_type}${profile?.exam_branch ? ` (${profile.exam_branch})` : ""}, Days left: ${countdown?.daysRemaining ?? "unknown"}

Watch time: ${watchBySubject.slice(0,5).map(s => `${s.name}:${Math.round(s.total_minutes||0)}min`).join(", ") || "none"}
Lectures: ${lectureCompletion.slice(0,5).map(s => `${s.name}:${s.completed}/${s.total}`).join(", ") || "none"}
Tests: ${testStats.slice(0,5).map(t => `${t.title}:${t.score_pct}%`).join(", ") || "none"}

Give a detailed study analysis with these sections:
1. STRENGTHS - 3 specific points
2. WEAK AREAS - 3 subjects/topics needing attention
3. EXAM READINESS - score out of 100 with justification
4. PRIORITY TOPICS - top 5 topics to focus on immediately
5. DAILY SCHEDULE - recommended study schedule
6. ACTION STEPS - 5 specific steps for this week

Be specific to the exam and branch. Complete ALL sections. Never cut off mid-sentence.`;
}

export function buildPlannerPrompt(snapshot, profile, countdown) {
  const totalDays = countdown?.daysRemaining ?? 30;

  return `
## Student: ${profile?.name} | Exam: ${profile?.exam_type}${profile?.exam_branch ? ` — ${profile.exam_branch}` : ""} | Days left: ${totalDays}

## Current Progress:
${(snapshot.lectureCompletion || []).map(s => `- ${s.name}: ${s.completed}/${s.total} lectures`).join("\n")}

## Syllabus:
${(snapshot.syllabusProgress || []).map(s => `- ${s.name}: ${s.completed}/${s.total} topics`).join("\n")}

## Test Scores:
${(snapshot.testStats || []).slice(-5).map(t => `- ${t.title}: ${t.score_pct}%`).join("\n")}

Generate a detailed ${totalDays <= 30 ? totalDays + "-day" : "4-week"} study plan with:

### WEEK-BY-WEEK PLAN
Break down each week's focus areas.

### DAILY SCHEDULE TEMPLATE
A typical study day schedule (hours, subjects, breaks).

### REVISION STRATEGY
When and how to revise completed topics.

### MOCK TEST SCHEDULE
How often to take mocks and which type.

### TOPIC PRIORITY LIST
Ordered list of topics by urgency and importance.

### LAST WEEK STRATEGY
Specific plan for the final 7 days before the exam.

IMPORTANT: Complete ALL sections above. Be concise but never cut off mid-sentence. Finish every section completely within the token limit.
`;
}

export function buildSubjectReportPrompt(subject, lectureData, testData, watchData) {
  return `
Analyze performance for subject: ${subject.name}

Lectures: ${lectureData.completed}/${lectureData.total} completed
Watch time: ${Math.round(watchData || 0)} minutes
Test scores in this subject: ${testData.map(t => t.score_pct + "%").join(", ") || "none"}

Give a 200-word focused analysis with:
1. Performance assessment
2. Improvement strategies  
3. Time allocation recommendation
`;
}
