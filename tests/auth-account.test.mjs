import assert from "node:assert/strict";
import test from "node:test";
import { belongsToAllowedGroup, extractAccountName } from "../lib/auth/account.mts";

test("normaliza formatos comuns de usuário do Active Directory", () => {
  assert.equal(extractAccountName("beatriz"), "beatriz");
  assert.equal(extractAccountName("EXEMPLO\\beatriz"), "beatriz");
  assert.equal(extractAccountName("beatriz@exemplo.local"), "beatriz");
});

test("autoriza grupos pelo CN curto ou DN completo", () => {
  const groups = ["CN=CENTRAL_AVISOS_ADMIN,OU=Grupos,DC=exemplo,DC=local"];
  assert.equal(belongsToAllowedGroup(groups, ["CENTRAL_AVISOS_ADMIN"]), true);
  assert.equal(belongsToAllowedGroup(groups, [groups[0]]), true);
  assert.equal(belongsToAllowedGroup(groups, ["OUTRO_GRUPO"]), false);
});
