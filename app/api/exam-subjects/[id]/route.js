export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { examSubjectsQ } from "../../../../db/queries.js";
import { requireUserId } from "../../../../lib/auth.js";

export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    await examSubjectsQ.update(id, userId, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    await examSubjectsQ.delete(id, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}