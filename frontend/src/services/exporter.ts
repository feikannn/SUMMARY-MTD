import { getDb } from "@/src/db/database";
import { addImportLog } from "@/src/db/repo";
import { SCHEMA_VERSION } from "@/src/db/schema";
import { nowISO } from "@/src/lib/date";
import { writeTextFile, shareFile } from "./fs";

const TABLES = [
  "team_members",
  "products",
  "monthly_targets",
  "legacy_personal_targets",
  "closing_transactions",
  "closing_items",
  "daily_production",
  "coed_entries",
  "cancellation_entries",
  "whatsapp_reports",
  "app_settings",
  "import_logs",
];

export function buildSnapshot() {
  const db = getDb();
  const data: Record<string, any[]> = {};
  for (const t of TABLES) {
    data[t] = db.getAllSync<any>(`SELECT * FROM ${t}`);
  }
  return {
    app: "SA Summary",
    schema_version: SCHEMA_VERSION,
    exported_at: nowISO(),
    data,
  };
}

export async function exportDatabaseToJson(): Promise<string> {
  const snapshot = buildSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  const file = writeTextFile(`sa_summary_backup_${stamp}.json`, json);
  await shareFile(file.uri, "application/json", "Export SA Summary Database");
  addImportLog("export", "export", `Exported ${Object.values(snapshot.data).reduce((a, b) => a + b.length, 0)} records`);
  return file.uri;
}
