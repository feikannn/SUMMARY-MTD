// Web-only database adapter backed by sql.js (pure ASM build, no WASM /
// SharedArrayBuffer needed). The NATIVE app uses expo-sqlite (see
// database.ts); Metro auto-picks this file on web. Data persists to
// localStorage so the web preview keeps state across reloads.
//
// This mirrors the subset of the expo-sqlite SQLiteDatabase API used by the
// repositories: execSync, runSync, getAllSync, getFirstSync, withTransactionSync.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require("sql.js/dist/sql-asm.js");

import { nowISO } from "@/src/lib/date";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";

const STORAGE_KEY = "sa_summary_db_v1";

type Params = any[];

class WebDb {
  private db: any;
  private inTx = false;
  constructor(db: any) { this.db = db; }

  execSync(sql: string) {
    this.db.exec(sql);
    if (!this.inTx) this.persist();
  }

  runSync(sql: string, params: Params = []) {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params);
      stmt.step();
    } finally {
      stmt.free();
    }
    const idRow = this.db.exec("SELECT last_insert_rowid() AS id, changes() AS c");
    const vals = idRow?.[0]?.values?.[0] ?? [0, 0];
    if (!this.inTx) this.persist();
    return { lastInsertRowId: vals[0] as number, changes: vals[1] as number };
  }

  getAllSync<T = any>(sql: string, params: Params = []): T[] {
    const stmt = this.db.prepare(sql);
    const out: T[] = [];
    try {
      stmt.bind(params);
      while (stmt.step()) out.push(stmt.getAsObject() as T);
    } finally {
      stmt.free();
    }
    return out;
  }

  getFirstSync<T = any>(sql: string, params: Params = []): T | null {
    const rows = this.getAllSync<T>(sql, params);
    return rows.length ? rows[0] : null;
  }

  withTransactionSync(fn: () => void) {
    this.db.run("BEGIN");
    this.inTx = true;
    try {
      fn();
      this.db.run("COMMIT");
      this.inTx = false;
      this.persist();
    } catch (e) {
      this.inTx = false;
      try { this.db.run("ROLLBACK"); } catch { /* ignore */ }
      throw e;
    }
  }

  persist() {
    try {
      const data: Uint8Array = this.db.export();
      let binary = "";
      for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
      // eslint-disable-next-line no-undef
      window.localStorage.setItem(STORAGE_KEY, btoa(binary));
    } catch { /* ignore persistence errors */ }
  }
}

let _db: WebDb | null = null;

export function getDb(): WebDb {
  if (!_db) throw new Error("Web database not initialised");
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
      db.runSync("INSERT INTO team_members (name, position, has_target, active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)", [name, position, hasTarget, ts, ts]);
    }
  }
  const prodCount = db.getFirstSync<{ c: number }>("SELECT COUNT(*) as c FROM products");
  if ((prodCount?.c ?? 0) === 0) {
    const dues: [string, number][] = [
      ["VIP Primary", 1488000], ["VIP Family", 788000], ["VIP Adult Family", 538000],
      ["VIP Adult Primary", 738000], ["Premiere Primary", 1298000], ["Premiere Family", 788000],
      ["Premiere Adult Family", 558000],
    ];
    for (const [name, price] of dues) {
      db.runSync("INSERT INTO products (type, name, sessions, price, active, created_at, updated_at) VALUES ('DUES', ?, NULL, ?, 1, ?, ?)", [name, price, ts, ts]);
    }
  }
}

export async function initDatabase() {
  if (_db) return;
  const SQL = await initSqlJs();
  let database: any;
  try {
    // eslint-disable-next-line no-undef
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const binary = atob(saved);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      database = new SQL.Database(bytes);
    } else {
      database = new SQL.Database();
    }
  } catch {
    database = new SQL.Database();
  }
  database.run("PRAGMA foreign_keys = ON;");
  _db = new WebDb(database);
  runMigrations();
  seedIfEmpty();
}
