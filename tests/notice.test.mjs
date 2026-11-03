import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNotice } from "../types/notice.ts";

test("normaliza estados ativos e inativos enviados pela API", () => {
  assert.equal(normalizeNotice({ ativo: false }, 0).active, false);
  assert.equal(normalizeNotice({ ativo: "false" }, 0).active, false);
  assert.equal(normalizeNotice({ ativo: "0" }, 0).active, false);
  assert.equal(normalizeNotice({ ativo: 0 }, 0).active, false);
  assert.equal(normalizeNotice({ ativo: true }, 0).active, true);
  assert.equal(normalizeNotice({ ativo: "true" }, 0).active, true);
  assert.equal(normalizeNotice({ ativo: "1" }, 0).active, true);
  assert.equal(normalizeNotice({}, 0).active, true);
});

test("normaliza os responsáveis pela auditoria do popup", () => {
  const notice = normalizeNotice({
    id: 42,
    audit: {
      createdBy: { id: "u1", username: "william", name: "William", role: "gecom" },
      createdAt: "2026-11-03T12:00:00.000Z",
      deactivatedBy: { id: "u2", username: "maria", name: "Maria" },
      deactivatedAt: "2026-11-03T13:00:00.000Z",
    },
  }, 0);

  assert.deepEqual(notice.audit, {
    createdBy: { id: "u1", username: "william", name: "William", role: "gecom" },
    createdAt: "2026-11-03T12:00:00.000Z",
    deactivatedBy: { id: "u2", username: "maria", name: "Maria" },
    deactivatedAt: "2026-11-03T13:00:00.000Z",
    reactivatedBy: undefined,
    reactivatedAt: undefined,
  });
});

test("ignora atores de auditoria incompletos", () => {
  const notice = normalizeNotice({ audit: { createdBy: { name: "William" } } }, 0);
  assert.equal(notice.audit, undefined);
});
