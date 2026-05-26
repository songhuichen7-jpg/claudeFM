import Database from "better-sqlite3"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdirSync } from "node:fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = resolve(__dirname, "..", "state.db")
mkdirSync(dirname(DB_PATH), { recursive: true })

export const db = new Database(DB_PATH)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

// ---- schema bootstrap & migration ----------------------------------------

// Always-create tables first (no profile_id requirement so v1 DBs survive).
db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  corpus_dir TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,
  speaker TEXT,
  text TEXT NOT NULL,
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_messages_ts ON messages(ts);

CREATE TABLE IF NOT EXISTS plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration_s INTEGER,
  skipped INTEGER DEFAULT 0,
  liked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_plays_ts ON plays(ts);
CREATE INDEX IF NOT EXISTS idx_plays_track ON plays(track_id);

CREATE TABLE IF NOT EXISTS plan (
  date TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prefs (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduler_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  job TEXT NOT NULL,
  note TEXT
);
`)

// v1 → v2 migration: add profile_id to all per-user tables.
function hasCol(table: string, col: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.some(r => r.name === col)
}
function tryAddColumn(table: string, col: string, def: string) {
  if (!hasCol(table, col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
  }
}
tryAddColumn("messages", "profile_id", "TEXT NOT NULL DEFAULT 'default'")
tryAddColumn("plays", "profile_id", "TEXT NOT NULL DEFAULT 'default'")
tryAddColumn("plan", "profile_id", "TEXT NOT NULL DEFAULT 'default'")
tryAddColumn("prefs", "profile_id", "TEXT NOT NULL DEFAULT 'default'")

db.exec(`
CREATE INDEX IF NOT EXISTS idx_messages_profile ON messages(profile_id, ts);
CREATE INDEX IF NOT EXISTS idx_plays_profile ON plays(profile_id, ts);
CREATE INDEX IF NOT EXISTS idx_prefs_profile ON prefs(profile_id, k);
CREATE INDEX IF NOT EXISTS idx_plan_profile ON plan(profile_id, date);
`)

// Seed a default profile if none exists yet.
const haveDefault = db.prepare("SELECT 1 FROM profiles WHERE id = 'default'").get()
if (!haveDefault) {
  db.prepare(
    "INSERT INTO profiles (id, name, avatar, corpus_dir, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run("default", "mmguo", "🐱", "user", Date.now())
}

// ---- active profile (process-scoped, persisted via prefs) -----------------

let ACTIVE: string = (() => {
  try {
    const r = db.prepare("SELECT v FROM prefs WHERE profile_id = '__system' AND k = 'active_profile'").get() as
      | { v: string }
      | undefined
    return r?.v ?? "default"
  } catch {
    return "default"
  }
})()

export function activeProfile(): string {
  return ACTIVE
}
export function setActiveProfile(id: string) {
  ACTIVE = id
  db.prepare(
    "INSERT OR REPLACE INTO prefs (profile_id, k, v) VALUES ('__system', 'active_profile', ?)",
  ).run(id)
}

// ---- types ----------------------------------------------------------------

export type Profile = {
  id: string
  name: string
  avatar: string | null
  corpus_dir: string
  created_at: number
}

export type MessageRow = {
  id: string
  ts: number
  profile_id: string
  kind: "dj" | "user" | "system"
  speaker: string | null
  text: string
  meta_json: string | null
}

export type PlayRow = {
  id: number
  ts: number
  profile_id: string
  track_id: string
  title: string
  artist: string
  duration_s: number | null
  skipped: 0 | 1
  liked: 0 | 1
}

// ---- Profiles -------------------------------------------------------------

export const Profiles = {
  list(): Profile[] {
    return db.prepare("SELECT * FROM profiles ORDER BY created_at ASC").all() as Profile[]
  },
  get(id: string): Profile | null {
    return (db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as Profile | undefined) ?? null
  },
  create(p: Omit<Profile, "created_at"> & { created_at?: number }): Profile {
    const row: Profile = { ...p, avatar: p.avatar ?? null, created_at: p.created_at ?? Date.now() }
    db.prepare(
      "INSERT OR REPLACE INTO profiles (id, name, avatar, corpus_dir, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(row.id, row.name, row.avatar, row.corpus_dir, row.created_at)
    return row
  },
  remove(id: string) {
    if (id === "default") return
    db.prepare("DELETE FROM profiles WHERE id = ?").run(id)
    db.prepare("DELETE FROM messages WHERE profile_id = ?").run(id)
    db.prepare("DELETE FROM plays WHERE profile_id = ?").run(id)
    db.prepare("DELETE FROM prefs WHERE profile_id = ?").run(id)
  },
}

// ---- Messages -------------------------------------------------------------

export const Messages = {
  insert(m: Omit<MessageRow, "meta_json" | "profile_id"> & { meta?: unknown; profile_id?: string }) {
    db.prepare(
      "INSERT OR REPLACE INTO messages (id, ts, profile_id, kind, speaker, text, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      m.id,
      m.ts,
      m.profile_id ?? ACTIVE,
      m.kind,
      m.speaker,
      m.text,
      m.meta !== undefined ? JSON.stringify(m.meta) : null,
    )
  },
  recent(limit = 30, profileId = ACTIVE): MessageRow[] {
    return db
      .prepare("SELECT * FROM messages WHERE profile_id = ? ORDER BY ts DESC LIMIT ?")
      .all(profileId, limit) as MessageRow[]
  },
  all(profileId = ACTIVE): MessageRow[] {
    return db
      .prepare("SELECT * FROM messages WHERE profile_id = ? ORDER BY ts ASC")
      .all(profileId) as MessageRow[]
  },
}

// ---- Plays ----------------------------------------------------------------

export const Plays = {
  record(p: Omit<PlayRow, "id" | "skipped" | "liked" | "profile_id"> & {
    skipped?: boolean
    liked?: boolean
    profile_id?: string
  }) {
    db.prepare(
      "INSERT INTO plays (ts, profile_id, track_id, title, artist, duration_s, skipped, liked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      p.ts,
      p.profile_id ?? ACTIVE,
      p.track_id,
      p.title,
      p.artist,
      p.duration_s,
      p.skipped ? 1 : 0,
      p.liked ? 1 : 0,
    )
  },
  recent(limit = 30, profileId = ACTIVE): PlayRow[] {
    return db
      .prepare("SELECT * FROM plays WHERE profile_id = ? ORDER BY ts DESC LIMIT ?")
      .all(profileId, limit) as PlayRow[]
  },
  markSkipped(track_id: string, profileId = ACTIVE) {
    db.prepare(
      `UPDATE plays SET skipped = 1
       WHERE id = (SELECT id FROM plays WHERE track_id = ? AND profile_id = ? ORDER BY ts DESC LIMIT 1)`,
    ).run(track_id, profileId)
  },
  markLiked(track_id: string, liked: boolean, profileId = ACTIVE) {
    db.prepare(
      `UPDATE plays SET liked = ?
       WHERE id = (SELECT id FROM plays WHERE track_id = ? AND profile_id = ? ORDER BY ts DESC LIMIT 1)`,
    ).run(liked ? 1 : 0, track_id, profileId)
  },
  recentTitles(hoursBack = 24, limit = 30, profileId = ACTIVE): { title: string; artist: string }[] {
    const since = Date.now() - hoursBack * 3600_000
    return db
      .prepare(
        `SELECT DISTINCT title, artist FROM plays
         WHERE profile_id = ? AND ts > ? ORDER BY ts DESC LIMIT ?`,
      )
      .all(profileId, since, limit) as { title: string; artist: string }[]
  },
  recentLiked(hoursBack = 168, limit = 10, profileId = ACTIVE): { title: string; artist: string; ts: number }[] {
    const since = Date.now() - hoursBack * 3600_000
    return db
      .prepare(
        `SELECT title, artist, ts FROM plays
         WHERE profile_id = ? AND liked = 1 AND ts > ? ORDER BY ts DESC LIMIT ?`,
      )
      .all(profileId, since, limit) as { title: string; artist: string; ts: number }[]
  },
  recentSkipped(hoursBack = 24, limit = 10, profileId = ACTIVE): { title: string; artist: string; ts: number }[] {
    const since = Date.now() - hoursBack * 3600_000
    return db
      .prepare(
        `SELECT title, artist, ts FROM plays
         WHERE profile_id = ? AND skipped = 1 AND ts > ? ORDER BY ts DESC LIMIT ?`,
      )
      .all(profileId, since, limit) as { title: string; artist: string; ts: number }[]
  },
  // Heuristic mood signals — used by the hourly mood probe.
  signalsLastHour(profileId = ACTIVE): {
    skipsLastHour: number
    likesLastHour: number
    playsLastHour: number
    distinctArtistsLastHour: number
    consecutiveSamePlaylist: boolean
  } {
    const since = Date.now() - 3600_000
    const r1 = db.prepare("SELECT COUNT(*) c FROM plays WHERE profile_id = ? AND ts > ? AND skipped = 1").get(profileId, since) as { c: number }
    const r2 = db.prepare("SELECT COUNT(*) c FROM plays WHERE profile_id = ? AND ts > ? AND liked = 1").get(profileId, since) as { c: number }
    const r3 = db.prepare("SELECT COUNT(*) c FROM plays WHERE profile_id = ? AND ts > ?").get(profileId, since) as { c: number }
    const r4 = db.prepare("SELECT COUNT(DISTINCT artist) c FROM plays WHERE profile_id = ? AND ts > ?").get(profileId, since) as { c: number }
    return {
      skipsLastHour: r1.c,
      likesLastHour: r2.c,
      playsLastHour: r3.c,
      distinctArtistsLastHour: r4.c,
      consecutiveSamePlaylist: false,
    }
  },
}

// ---- Plan -----------------------------------------------------------------

export const Plan = {
  set(date: string, plan: unknown, profileId = ACTIVE) {
    db.prepare(
      "INSERT OR REPLACE INTO plan (date, profile_id, json, created_at) VALUES (?, ?, ?, ?)",
    ).run(date, profileId, JSON.stringify(plan), Date.now())
  },
  get(date: string, profileId = ACTIVE): unknown | null {
    const row = db.prepare("SELECT json FROM plan WHERE date = ? AND profile_id = ?").get(date, profileId) as
      | { json: string }
      | undefined
    return row ? JSON.parse(row.json) : null
  },
}

// ---- Prefs ----------------------------------------------------------------

export const Prefs = {
  get(k: string, profileId = ACTIVE): string | null {
    const r = db.prepare("SELECT v FROM prefs WHERE profile_id = ? AND k = ?").get(profileId, k) as
      | { v: string }
      | undefined
    return r?.v ?? null
  },
  set(k: string, v: string, profileId = ACTIVE) {
    db.prepare("INSERT OR REPLACE INTO prefs (profile_id, k, v) VALUES (?, ?, ?)").run(profileId, k, v)
  },
  all(profileId = ACTIVE): Record<string, string> {
    const out: Record<string, string> = {}
    for (const { k, v } of db
      .prepare("SELECT k, v FROM prefs WHERE profile_id = ?")
      .all(profileId) as { k: string; v: string }[]) {
      out[k] = v
    }
    return out
  },
}

// ---- SchedulerLog ---------------------------------------------------------

export const SchedulerLog = {
  add(job: string, note?: string) {
    db.prepare("INSERT INTO scheduler_log (ts, job, note) VALUES (?, ?, ?)").run(
      Date.now(),
      job,
      note ?? null,
    )
  },
  recent(limit = 10) {
    return db
      .prepare("SELECT * FROM scheduler_log ORDER BY ts DESC LIMIT ?")
      .all(limit)
  },
}
