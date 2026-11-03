import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  createNoticeAuditTable,
  recordCreatedNotice,
  removeNoticeAudit,
} from "../lib/server/notice-audit-sql.mts";

function auditDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(createNoticeAuditTable);
  return database;
}

function recordCreation(database, noticeId, username, role) {
  database.prepare(recordCreatedNotice).run(noticeId, username, username, username, role, "2026-11-03T12:00:00Z", "2026-11-03T12:00:00Z");
}

function auditRow(database, noticeId) {
  return database.prepare("SELECT * FROM notice_audit WHERE notice_id = ?").get(noticeId);
}

test("aviso com ID reutilizado não herda o autor nem as ações do anterior", () => {
  const database = auditDatabase();
  recordCreation(database, "7", "pessoa.nti", "nti");
  database.prepare("UPDATE notice_audit SET deactivated_by_id = 'pessoa.nti', deactivated_at = 'ontem' WHERE notice_id = '7'").run();

  recordCreation(database, "7", "pessoa.gecom", "gecom");

  const row = auditRow(database, "7");
  assert.equal(row.created_by_username, "pessoa.gecom");
  assert.equal(row.created_by_role, "gecom");
  assert.equal(row.deactivated_by_id, null);
  assert.equal(row.deactivated_at, null);
});

test("excluir um aviso remove o responsável atual", () => {
  const database = auditDatabase();
  recordCreation(database, "7", "pessoa.gecom", "gecom");

  database.prepare(removeNoticeAudit).run("7");

  assert.equal(auditRow(database, "7"), undefined);
});
