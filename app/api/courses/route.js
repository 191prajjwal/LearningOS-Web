export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { subjectsQ, lecturesQ } from "../../../db/queries.js";
import { requireUserId } from "../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const subjects = await subjectsQ.getAll(userId);
    return NextResponse.json({ subjects });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const id = await subjectsQ.create(userId, body);
    const subject = await subjectsQ.getById(id, userId);
    return NextResponse.json({ subject }, { status: 201 });
 } catch (e) {
    console.error("COURSES POST ERROR:", e.message, e.stack);
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
