import * as SQLite from "expo-sqlite";

import { nowISO } from "@/src/lib/date";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";

const DB_NAME = "sa_summary.db";

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync(DB_NAME);
    _db.execSync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  }
  return _db;
}

export function runMigrations() {
  const db = getDb();
  const row = db.getFirstSync<{ user_version: number }>("PRAGMA user_version");
  let current = row?.user_version ?? 0;
  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (sql) {
      db.execSync(sql);
      db.execSync(`PRAGMA user_version = ${v}`);
      current = v;
    }
  }
}

// Seed initial team + dues products on a fresh database only.
export function seedIfEmpty() {
  const db = getDb();
  const ts = nowISO();
  const teamCount = db.getFirstSync<{ c: number }>("SELECT COUNT(*) as c FROM team_members");
  if ((teamCount?.c ?? 0) === 0) {
    const team: [string, string, number][] = [
      ["Emily", "Manager", 0],
      ["Cipta", "Assistant Manager", 1],
      ["Matt", "Student Advisor", 1],
      ["Eric", "Student Advisor", 1],
      ["Liam", "Student Advisor", 1],
    ];
    for (const [name, position, hasTarget] of team) {
      db.runSync(
        "INSERT INTO team_members (name, position, has_target, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
        [name, position, hasTarget, ts, ts],
      );
    }
  }

  const prodCount = db.getFirstSync<{ c: number }>("SELECT COUNT(*) as c FROM products");
  if ((prodCount?.c ?? 0) === 0) {
    const dues: [string, number][] = [
      ["VIP Primary", 1488000],
      ["VIP Family", 788000],
      ["VIP Adult Family", 538000],
      ["VIP Adult Primary", 738000],
      ["Premiere Primary", 1298000],
      ["Premiere Family", 788000],
      ["Premiere Adult Family", 558000],
    ];
    for (const [name, price] of dues) {
      db.runSync(
        "INSERT INTO products (type, name, sessions, price, active, created_at, updated_at) VALUES ('DUES', ?, NULL, ?, 1, ?, ?)",
        [name, price, ts, ts],
      );
    }
  }
}

export async function initDatabase() {
  getDb();
  runMigrations();
  seedIfEmpty();
}
