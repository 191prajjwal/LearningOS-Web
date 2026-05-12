export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { syllabusQ, subjectsQ } from "../../../../../db/queries.js";
import { requireUserId } from "../../../../../lib/auth.js";

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const resolvedId = await subjectsQ.resolveId(id, userId);
    await syllabusQ.create(userId, { ...body, subject_id: resolvedId });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}