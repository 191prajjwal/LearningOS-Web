export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { syllabusQ } from "../../../../../../db/queries.js";
import { requireUserId } from "../../../../../../lib/auth.js";

export async function DELETE(req, { params }) {
  const { syllabusId } = await params;
  try {
    const userId = requireUserId(req);
    await syllabusQ.delete(syllabusId, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}