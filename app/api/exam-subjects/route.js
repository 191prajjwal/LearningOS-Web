export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { examSubjectsQ } from "../../../db/queries.js";
import { requireUserId } from "../../../lib/auth.js";

export async function GET(req) {
  try {
    const userId = requireUserId(req);
    const subjects = await examSubjectsQ.getAll(userId);
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
    const id = await examSubjectsQ.create(userId, body);
    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}