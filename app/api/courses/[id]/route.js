export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { subjectsQ, lecturesQ, syllabusQ, materialsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const resolvedId = await subjectsQ.resolveId(id, userId);
    const [subject, lectures, syllabus, materials] = await Promise.all([
      subjectsQ.getById(resolvedId, userId),
      lecturesQ.getBySubject(resolvedId, userId),
      syllabusQ.getBySubject(resolvedId, userId),
      materialsQ.getBySubject(resolvedId, userId),
    ]);
    if (!subject) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ subject, lectures, syllabus, materials });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const resolvedId = await subjectsQ.resolveId(id, userId);
    const body = await req.json();
    delete body.folder_path;
    await subjectsQ.update(resolvedId, userId, body);
    const subject = await subjectsQ.getById(resolvedId, userId);
    return NextResponse.json({ subject });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const resolvedId = await subjectsQ.resolveId(id, userId);
    const body = await req.json();
    delete body.folder_path;
    await subjectsQ.update(resolvedId, userId, body);
    const subject = await subjectsQ.getById(resolvedId, userId);
    return NextResponse.json({ subject });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const resolvedId = await subjectsQ.resolveId(id, userId);
    await subjectsQ.delete(resolvedId, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
