export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { settingsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const settings = await settingsQ.getAll(userId);
    return NextResponse.json({ settings });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    await Promise.all(Object.entries(body).map(([key, value]) => settingsQ.set(userId, key, value)));
    const settings = await settingsQ.getAll(userId);
    return NextResponse.json({ settings });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
