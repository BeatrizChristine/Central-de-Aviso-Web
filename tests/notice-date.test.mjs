import assert from "node:assert/strict";
import test from "node:test";
import { withLocalOffset } from "../lib/notice-date.mts";

process.env.TZ = "America/Manaus";

test("acrescenta o fuso local ao horário escolhido", () => {
  const value = withLocalOffset("2026-11-08T08:00");
  assert.equal(value, "2026-11-08T08:00-04:00");
  assert.equal(new Date(value).toISOString(), "2026-11-08T12:00:00.000Z");
});

test("mantém datas vazias como ausentes", () => {
  assert.equal(withLocalOffset(""), null);
});
