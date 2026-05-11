export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { syllabusPdfQ } from "../../../db/queries.js";
import { requireUserId } from "../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const row = await syllabusPdfQ.get(userId);
    return NextResponse.json({ pdf_data: row?.pdf_data || "" });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const userId = requireUserId(req);
    const { pdf_data } = await req.json();
    await syllabusPdfQ.set(userId, pdf_data || "");
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}