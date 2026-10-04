# SA Summary — PRD

## Original Problem Statement
Native Expo React Native (TypeScript, Expo Router) app, **100% offline**, using **expo-sqlite** as the primary local DB, to record/monitor/analyze a Student Advisor team's sales performance. Must handle daily production, closings (Dues/Private/combined), monthly targets, achievement vs target, funnel conversion, projection, MTD & monthly reports, auto WhatsApp daily report, COED, cancellation, product & team management, and JSON import (old "Rockstar" backup + SA Summary export) / export, plus PDF & Excel export. Indonesian UI, Rupiah formatting. No internet required for any feature.

## Architecture
- **Frontend:** Expo Router, Plus Jakarta Sans fonts, Forest-Green theme (light + dark toggle) from `src/theme.ts`.
- **DB:** `expo-sqlite` on native; `sql.js` (pure-ASM) adapter on web preview (`src/db/database.web.ts`) persisting to localStorage — keeps the app fully functional & testable on web. Schema + versioned migrations in `src/db/schema.ts`; repositories in `src/db/repo.ts`.
- **Central calc service** (`src/services/calc.ts`) powers dashboard, summary, report, projection & WhatsApp report so numbers never diverge.
- **Services:** whatsapp report builder, JSON exporter, importer (old+new formats, merge/replace, dedupe, rollback), reportExport (PDF via expo-print, Excel via xlsx).
- **No backend business logic** (FastAPI template left as-is); all data is client-side.

## User Personas
- Sales Manager / Assistant Manager tracking the academy team on a phone, often offline.

## Core Requirements (static)
- Offline SQLite, soft-delete + audit timestamps, snapshot prices on closings.
- Status: Actual=100%, Delay=50%, Decom=0%. Gross (pre-status) vs Achievement (post-status) tracked explicitly.
- Projection based on GROSS; achievement weighted by status shown separately.
- Personal target = Academy target ÷ active members with target (Manager excluded).
- Funnel denominators of 0 render "-". WhatsApp report uses only "Dues$" / "Dues$ Projo".

## Implemented (2026-06)
- Dashboard: KPI cards, month filter, Target 80/100, projection, funnel analytics, per-member achievement cards (Manager = contribution only).
- Daily Production entry (per-member) + history.
- Closing add/edit/delete with multiple Dues/Private items, status editing, live gross/achievement.
- Target management per month + legacy imported targets review.
- Products & Team management (add/edit/activate-deactivate, soft delete, history preserved).
- COED (category entries, daily/monthly totals), Cancellation (totals, filters).
- Reports (MTD, per-member sales, target gap) + PDF & Excel export (native share).
- WhatsApp daily report with manual inputs + Copy to clipboard.
- Import (old Rockstar + SA Summary JSON) with preview, duplicate detection, Merge/Replace (backup before replace), transaction rollback; Export full DB to JSON.
- Settings: light/dark/system theme.
- Verified end-to-end via testing agent (iteration_1 & iteration_2): calculations, import 104 closings, dedupe, month-scoped KPIs.

## Backlog / Remaining
- P1: Logo upload for report header (image picker).
- P2: Swipe actions on closing list; charts/trend over months.
- P2: Cleanup RN-web `shadow*`/`pointerEvents` deprecation warnings.

## Notes
- PDF/Excel/JSON share and clipboard are native features; on the web preview the share dialog is unavailable (data still computes correctly).
