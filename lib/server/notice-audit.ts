import { env } from "cloudflare:workers";
import type { AuthUser, UserRole } from "@/types/auth";
import { createNoticeAuditTable, recordCreatedNotice, removeNoticeAudit } from "./notice-audit-sql.mjs";

export type NoticeAuditAction = "created" | "deactivated" | "reactivated" | "deleted";

export type NoticeAuditActor = {
  id: string;
  username: string;
  name: string;
  role?: UserRole;
};

export type NoticeAudit = {
  createdBy?: NoticeAuditActor;
  createdAt?: string;
  deactivatedBy?: NoticeAuditActor;
  deactivatedAt?: string;
  reactivatedBy?: NoticeAuditActor;
  reactivatedAt?: string;
};

type NoticeAuditRow = {
  notice_id: string;
  created_by_id: string | null;
  created_by_username: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: string | null;
  deactivated_by_id: string | null;
  deactivated_by_username: string | null;
  deactivated_by_name: string | null;
  deactivated_by_role: string | null;
  deactivated_at: string | null;
  reactivated_by_id: string | null;
  reactivated_by_username: string | null;
  reactivated_by_name: string | null;
  reactivated_by_role: string | null;
  reactivated_at: string | null;
};

let schemaReady: Promise<void> | null = null;

export async function readNoticeAudits(): Promise<Map<string, NoticeAudit>> {
  const database = env.DB;
  if (!database) return new Map();

  await ensureSchema(database);
  const query = await database.prepare(`
    SELECT notice_id,
      created_by_id, created_by_username, created_by_name, created_by_role, created_at,
      deactivated_by_id, deactivated_by_username, deactivated_by_name, deactivated_by_role, deactivated_at,
      reactivated_by_id, reactivated_by_username, reactivated_by_name, reactivated_by_role, reactivated_at
    FROM notice_audit
  `).all<NoticeAuditRow>();

  return new Map(query.results.map((row) => [row.notice_id, auditFromRow(row)]));
}

export async function readNoticeOwnerRole(noticeId: string): Promise<UserRole | null> {
  const database = env.DB;
  if (!database) return null;
  await ensureSchema(database);
  const row = await database.prepare(`
    SELECT created_by_role FROM notice_audit WHERE notice_id = ?
  `).bind(noticeId).first<{ created_by_role: string | null }>();
  return isUserRole(row?.created_by_role) ? row.created_by_role : null;
}

export async function recordNoticeAudit(
  noticeId: string,
  action: NoticeAuditAction,
  user: AuthUser,
  occurredAt = new Date().toISOString(),
) {
  const database = env.DB;
  if (!database) return;

  await ensureSchema(database);
  const actor = [user.id, user.username, user.name, user.role, occurredAt];
  let update: D1PreparedStatement;

  if (action === "created") {
    update = database.prepare(recordCreatedNotice).bind(noticeId, ...actor, occurredAt);
  } else if (action === "deactivated") {
    update = database.prepare(`
      INSERT INTO notice_audit (
        notice_id, deactivated_by_id, deactivated_by_username, deactivated_by_name, deactivated_by_role, deactivated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(notice_id) DO UPDATE SET
        deactivated_by_id = excluded.deactivated_by_id,
        deactivated_by_username = excluded.deactivated_by_username,
        deactivated_by_name = excluded.deactivated_by_name,
        deactivated_by_role = excluded.deactivated_by_role,
        deactivated_at = excluded.deactivated_at,
        updated_at = excluded.updated_at
    `).bind(noticeId, ...actor, occurredAt);
  } else if (action === "reactivated") {
    update = database.prepare(`
      INSERT INTO notice_audit (
        notice_id, reactivated_by_id, reactivated_by_username, reactivated_by_name, reactivated_by_role, reactivated_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(notice_id) DO UPDATE SET
        reactivated_by_id = excluded.reactivated_by_id,
        reactivated_by_username = excluded.reactivated_by_username,
        reactivated_by_name = excluded.reactivated_by_name,
        reactivated_by_role = excluded.reactivated_by_role,
        reactivated_at = excluded.reactivated_at,
        updated_at = excluded.updated_at
    `).bind(noticeId, ...actor, occurredAt);
  } else {
    update = database.prepare(removeNoticeAudit).bind(noticeId);
  }

  const event = database.prepare(`
    INSERT INTO notice_audit_event (
      notice_id, action, actor_id, actor_username, actor_name, actor_role, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(noticeId, action, user.id, user.username, user.name, user.role, occurredAt);

  await database.batch([update, event]);
}

function ensureSchema(database: D1Database) {
  if (!schemaReady) {
    schemaReady = initializeSchema(database).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function initializeSchema(database: D1Database) {
  await database.batch([
      database.prepare(createNoticeAuditTable),
      database.prepare(`
        CREATE TABLE IF NOT EXISTS notice_audit_event (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notice_id TEXT NOT NULL,
          action TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_username TEXT NOT NULL,
          actor_name TEXT NOT NULL,
          actor_role TEXT,
          occurred_at TEXT NOT NULL
        )
      `),
      database.prepare(`
        CREATE INDEX IF NOT EXISTS notice_audit_event_notice_id
        ON notice_audit_event (notice_id, occurred_at DESC)
      `),
    ]);

  await addMissingColumns(database, "notice_audit", [
    { name: "created_by_role", definition: "TEXT" },
    { name: "deactivated_by_role", definition: "TEXT" },
    { name: "reactivated_by_role", definition: "TEXT" },
  ]);
  await addMissingColumns(database, "notice_audit_event", [
    { name: "actor_role", definition: "TEXT" },
  ]);
}

async function addMissingColumns(
  database: D1Database,
  table: string,
  columns: { name: string; definition: string }[],
) {
  const existing = await database.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  const names = new Set(existing.results.map((column) => column.name));
  const missing = columns.filter((column) => !names.has(column.name));
  if (!missing.length) return;
  await database.batch(missing.map((column) => (
    database.prepare(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`)
  )));
}

function auditFromRow(row: NoticeAuditRow): NoticeAudit {
  return {
    createdBy: actorFromRow(row.created_by_id, row.created_by_username, row.created_by_name, row.created_by_role),
    createdAt: row.created_at || undefined,
    deactivatedBy: actorFromRow(row.deactivated_by_id, row.deactivated_by_username, row.deactivated_by_name, row.deactivated_by_role),
    deactivatedAt: row.deactivated_at || undefined,
    reactivatedBy: actorFromRow(row.reactivated_by_id, row.reactivated_by_username, row.reactivated_by_name, row.reactivated_by_role),
    reactivatedAt: row.reactivated_at || undefined,
  };
}

function actorFromRow(id: string | null, username: string | null, name: string | null, role: string | null) {
  if (!id || !username || !name) return undefined;
  return { id, username, name, ...(isUserRole(role) ? { role } : {}) };
}

function isUserRole(value: unknown): value is UserRole {
  return value === "nti" || value === "gecom";
}
