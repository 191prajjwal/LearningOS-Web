export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { lecturesQ, subjectsQ } from "../../../../../../db/queries";
import { requireUserId } from "../../../../../../lib/auth.js";

export async function PATCH(req, { params }) {
  const { id, lectureId } = await params;
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    
    await lecturesQ.update(lectureId, userId, body);
    
    // If completed status changed, update subject progress
    if (body.is_completed !== undefined) {
      await subjectsQ.updateProgress(id, userId);
    }
    
    const lecture = await lecturesQ.getById(lectureId, userId);
    return NextResponse.json({ lecture });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
