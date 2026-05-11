export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { aiReportsQ } from "../../../../../db/queries.js";
import { requireUserId } from "../../../../../lib/auth.js";

export async function GET(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const report = await aiReportsQ.getById(id, userId);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    await aiReportsQ.delete(id, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}