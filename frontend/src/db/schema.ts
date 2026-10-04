// SQLite schema & migrations with versioning.

export const SCHEMA_VERSION = 1;

// Each migration is keyed by target version. Run in order.
export const MIGRATIONS: Record<number, string> = {
  1: `
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    has_target INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'DUES',
    name TEXT NOT NULL,
    sessions INTEGER,
    price INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS monthly_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    academy_target INTEGER NOT NULL DEFAULT 0,
    dues_target INTEGER NOT NULL DEFAULT 0,
    private_target INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(year, month)
  );

  CREATE TABLE IF NOT EXISTS legacy_personal_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advisor_name TEXT NOT NULL,
    advisor_id INTEGER,
    revenue_target INTEGER NOT NULL DEFAULT 0,
    unit_target INTEGER NOT NULL DEFAULT 0,
    private_target INTEGER NOT NULL DEFAULT 0,
    month INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS closing_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT,
    timestamp TEXT NOT NULL,
    advisor_id INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT 'DUES',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY(advisor_id) REFERENCES team_members(id)
  );
  CREATE INDEX IF NOT EXISTS idx_closing_date ON closing_transactions(date);
  CREATE INDEX IF NOT EXISTS idx_closing_advisor ON closing_transactions(advisor_id);

  CREATE TABLE IF NOT EXISTS closing_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    closing_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'DUES',
    product_id INTEGER,
    product_name TEXT NOT NULL,
    sessions INTEGER,
    unit_price INTEGER NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Actual',
    status_pct REAL NOT NULL DEFAULT 1,
    gross_revenue INTEGER NOT NULL DEFAULT 0,
    achievement_revenue INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(closing_id) REFERENCES closing_transactions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_item_closing ON closing_items(closing_id);

  CREATE TABLE IF NOT EXISTS daily_production (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    advisor_id INTEGER NOT NULL,
    leads INTEGER NOT NULL DEFAULT 0,
    appointment INTEGER NOT NULL DEFAULT 0,
    show INTEGER NOT NULL DEFAULT 0,
    interview INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    UNIQUE(date, advisor_id),
    FOREIGN KEY(advisor_id) REFERENCES team_members(id)
  );
  CREATE INDEX IF NOT EXISTS idx_prod_date ON daily_production(date);

  CREATE TABLE IF NOT EXISTS coed_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_coed_date ON coed_entries(date);

  CREATE TABLE IF NOT EXISTS cancellation_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    advisor_id INTEGER NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY(advisor_id) REFERENCES team_members(id)
  );
  CREATE INDEX IF NOT EXISTS idx_cancel_date ON cancellation_entries(date);

  CREATE TABLE IF NOT EXISTS whatsapp_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    free_trial INTEGER NOT NULL DEFAULT 0,
    appt_tomorrow INTEGER NOT NULL DEFAULT 0,
    appt_day_after INTEGER NOT NULL DEFAULT 0,
    collection_appt INTEGER NOT NULL DEFAULT 0,
    collection_show INTEGER NOT NULL DEFAULT 0,
    report_time TEXT NOT NULL DEFAULT '9PM',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    source TEXT,
    mode TEXT,
    summary TEXT
  );
  `,
};
