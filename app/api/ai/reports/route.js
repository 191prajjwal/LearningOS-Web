export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { aiReportsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const reports = await aiReportsQ.getAll(userId);
    return NextResponse.json({ reports });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
