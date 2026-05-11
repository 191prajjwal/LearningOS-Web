export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get("key");

  if (!apiKey) return NextResponse.json({ error: "Pass ?key=your-api-key" });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LearningOS",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{ role: "user", content: "Say hello in 5 words." }],
        max_tokens: 20,
      }),
    });

    const raw = await res.json();
    return NextResponse.json({ 
      status: res.status, 
      ok: res.ok,
      raw 
    });
  } catch (e) {
    return NextResponse.json({ error: e.message, type: "NETWORK_ERROR" });
  }
}


// Then visit in your browser:
//http://localhost:3000/api/test-ai?key=YOUR_FULL_API_KEY_HERE
