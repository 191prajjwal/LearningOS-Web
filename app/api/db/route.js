export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import {
  streakQ, watchQ, analyticsQ, testsQ,
  goalsQ, notesQ, linksQ, datesQ, tasksQ,
  subjectsQ, lecturesQ,
} from "../../../db/queries.js";
import { requireUserId } from "../../../lib/auth.js";

function unauth() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

export async function GET(req) {
  let userId; try { userId = requireUserId(req); } catch { return unauth(); }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  try {
    switch (q) {
      case "streak":
        return NextResponse.json({ streak: await streakQ.getCurrentStreak(userId) });
      case "streak-history":
        return NextResponse.json({ history: await streakQ.getLast(userId, 60) });
      case "watch-today":
        return NextResponse.json(await watchQ.getTotalToday(userId));
      case "watch-daily":
        return NextResponse.json({ data: await watchQ.getDailyTotals(userId, 30) });
      case "watch-subjects":
        return NextResponse.json({ data: await watchQ.getSubjectTotals(userId, 30) });
      case "test-analytics":
        return NextResponse.json(await testsQ.getAnalytics(userId));
      case "tests":
        return NextResponse.json({ tests: await testsQ.getAll(userId) });
      case "goals":
        return NextResponse.json({ goals: await goalsQ.getAll(userId) });
      case "notes":
        return NextResponse.json({ notes: await notesQ.getAll(userId) });
      case "links":
        return NextResponse.json({ links: await linksQ.getAll(userId) });
      case "dates":
        return NextResponse.json({ dates: await datesQ.getAll(userId) });
      case "tasks": {
        const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
        return NextResponse.json({ tasks: await tasksQ.getByDate(userId, date) });
      }
      case "analytics-snapshot":
        return NextResponse.json(await analyticsQ.getSnapshot(userId));
      case "dashboard": {
        const today = new Date().toISOString().split("T")[0];
        const [subjects, todayTasks, streak, watchToday, allTests, testAnalytics] = await Promise.all([
          subjectsQ.getAll(userId),
          tasksQ.getByDate(userId, today),
          streakQ.getCurrentStreak(userId),
          watchQ.getTotalToday(userId),
          testsQ.getAll(userId),
          testsQ.getAnalytics(userId),
        ]);
        return NextResponse.json({ subjects, todayTasks, streak, watchToday, recentTests: allTests.slice(0, 5), testAnalytics });
      }
      default:
        return NextResponse.json({ error: "Unknown query" }, { status: 400 });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  let userId; try { userId = requireUserId(req); } catch { return unauth(); }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const body = await req.json();

  try {
    switch (q) {
      case "watch-session": {
        await watchQ.create(userId, body);
        if (body.lecture_id) {
          await lecturesQ.incrementWatch(body.lecture_id, userId, body.duration);
          if (body.position_pct >= 90) {
            await lecturesQ.markComplete(body.lecture_id, userId);
          } else {
            await lecturesQ.updatePosition(body.lecture_id, userId, body.end_pos);
          }
          if (body.subject_id) await subjectsQ.updateProgress(body.subject_id, userId);
        }
        const todayTotal = await watchQ.getTotalToday(userId);
        await streakQ.upsertToday(userId, todayTotal.total || 0);
        return NextResponse.json({ success: true });
      }
      case "goal":
        try {
          await goalsQ.create(userId, body);
          return NextResponse.json({ success: true });
        } catch(err) {
          console.error("GOAL ERROR:", err.message, body);
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
      case "goal-toggle":
        await goalsQ.toggleComplete(body.id, userId);
        return NextResponse.json({ success: true });
      case "note":
        await notesQ.create(userId, body);
        return NextResponse.json({ success: true });
      case "link":
        await linksQ.create(userId, body);
        return NextResponse.json({ success: true });
      case "date":
        await datesQ.create(userId, body);
        return NextResponse.json({ success: true });
      case "task":
        await tasksQ.create(userId, { ...body, subject_id: body.subject_id || null });
        return NextResponse.json({ success: true });
      case "task-toggle":
        await tasksQ.toggleComplete(body.id, userId);
        return NextResponse.json({ success: true });
      case "test":
        await testsQ.create(userId, body);
        return NextResponse.json({ success: true });
      case "test-complete":
        await testsQ.complete(body.id, userId, body.results);
        if (body.subjects) {
          for (const s of body.subjects) await testsQ.addSubject(userId, { ...s, test_id: body.id });
        }
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: "Unknown mutation" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  let userId; try { userId = requireUserId(req); } catch { return unauth(); }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const id = searchParams.get("id");

  try {
    switch (q) {
      case "note": await notesQ.delete(id, userId); break;
      case "link": await linksQ.delete(id, userId); break;
      case "date": await datesQ.delete(id, userId); break;
      case "task": await tasksQ.delete(id, userId); break;
      case "goal": await goalsQ.delete(id, userId); break;
      case "test": await testsQ.delete(id, userId); break;
      default: return NextResponse.json({ error: "Unknown" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


export async function PUT(req) {
  let userId; try { userId = requireUserId(req); } catch { return unauth(); }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const body = await req.json();

  try {
    switch (q) {
      case "task":
        await tasksQ.update(body.id, userId, body);
        return NextResponse.json({ ok: true });
      case "goal":
        await goalsQ.update(body.id, userId, body);
        return NextResponse.json({ ok: true });
      case "date":
        await datesQ.update(body.id, userId, body);
        return NextResponse.json({ ok: true });
      case "link":
        await linksQ.update(body.id, userId, body);
        return NextResponse.json({ ok: true });
      case "note":
        await notesQ.update(body.id, userId, { content: body.content, tags: body.tags });
        return NextResponse.json({ ok: true });  
      default:
        return NextResponse.json({ error: "Unknown query" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}