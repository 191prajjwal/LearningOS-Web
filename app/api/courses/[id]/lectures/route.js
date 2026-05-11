export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { lecturesQ, subjectsQ } from "../../../../../db/queries.js";
import { requireUserId } from "../../../../../lib/auth.js";

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const lectures = await lecturesQ.getBySubject(id, userId);
    return NextResponse.json({ lectures });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const lectureId = await lecturesQ.create(userId, { ...body, subject_id: id });
    await subjectsQ.updateProgress(id, userId);
    const lecture = await lecturesQ.getById(lectureId, userId);
    return NextResponse.json({ lecture }, { status: 201 });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    await lecturesQ.deleteBySubject(id, userId);
    await subjectsQ.updateProgress(id, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}