export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { usersQ } from "../../../db/queries.js";

export async function POST(req) {
  try {
    const { username, pin, action } = await req.json();
    if (!username?.trim() || !pin) return NextResponse.json({ error: "Username and PIN required" }, { status: 400 });
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    if (action === "signup") {
      const existing = await usersQ.getByUsername(username.trim());
      if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      const userId = await usersQ.create(username.trim(), pin);
      const user = await usersQ.getById(userId);
      return NextResponse.json({ user });
    }
    const user = await usersQ.verify(username.trim(), pin);
    if (!user) return NextResponse.json({ error: "Wrong username or PIN" }, { status: 401 });
    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch (e) {
    console.error("Auth error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
