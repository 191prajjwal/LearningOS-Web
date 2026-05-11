import { createClient } from "@libsql/client";
import { SCHEMA, INDEXES } from "./schema.js";

// BigInt serialization fix
if (typeof BigInt !== 'undefined') {
  BigInt.prototype.toJSON = function() { return Number(this); };
}

let _client = null;

export function getDb() {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || "file:./learningos.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  _client = createClient({ url, authToken });
  return _client;
}

let _initialized = false;
export async function initDb() {
  if (_initialized) return;
  const db = getDb();
  try {
    const statements = SCHEMA
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    for (const sql of statements) {
      await db.execute(sql);
    }
    const idxStatements = INDEXES
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));
    for (const sql of idxStatements) {
      await db.execute(sql);
    }
    _initialized = true;
  } catch (e) {
    console.error("initDb failed:", e.message);
    throw e;
  }
}

export async function dbQuery(sql, params = []) {
  await initDb();
  const safeParams = params.map(p => p === undefined ? null : p);
  const result = await getDb().execute({ sql, args: safeParams });
  return result.rows;
}

export async function dbGet(sql, params = []) {
  await initDb();
  const safeParams = params.map(p => p === undefined ? null : p);
  const result = await getDb().execute({ sql, args: safeParams });
  return result.rows[0] || null;
}

export async function dbRun(sql, params = []) {
  await initDb();
  const safeParams = params.map(p => p === undefined ? null : p);
  const result = await getDb().execute({ sql, args: safeParams });
  return {
    lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : null,
    changes: result.rowsAffected,
  };
}

// Simple PIN hash — intentionally lightweight for personal app
export function hashPin(pin) {
  let hash = 0;
  const str = `los_${pin}_secret`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}