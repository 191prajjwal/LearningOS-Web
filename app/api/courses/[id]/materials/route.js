export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { materialsQ } from "../../../../../db/queries.js";
import { requireUserId } from "../../../../../lib/auth.js";

export async function POST(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const body = await req.json();
    const data = { ...body, subject_id: id };
    
    if (!data.title || !data.file_path) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newId = await materialsQ.create(userId, data);
    return NextResponse.json({ success: true, id: newId });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = await params;
  try {
    const userId = requireUserId(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    await materialsQ.deleteByCategory(id, userId, category);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
