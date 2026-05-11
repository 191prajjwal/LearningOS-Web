export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { profileQ, settingsQ } from "../../../db/queries.js";
import { DEFAULT_SETTINGS } from "../../../lib/constants.js";
import { requireUserId } from "../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const [profile, settingsRaw] = await Promise.all([profileQ.get(userId), settingsQ.getAll(userId)]);
    const settings = { ...DEFAULT_SETTINGS, ...settingsRaw };
    return NextResponse.json({ profile, settings });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    await profileQ.update(userId, body);
    const profile = await profileQ.get(userId);
    return NextResponse.json({ profile });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
