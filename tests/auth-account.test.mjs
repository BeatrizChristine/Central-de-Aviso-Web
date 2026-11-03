import assert from "node:assert/strict";
import test from "node:test";
import { belongsToAllowedGroup, extractAccountName, roleForGroups } from "../lib/auth/account.mts";

test("normaliza formatos comuns de usuário do Active Directory", () => {
  assert.equal(extractAccountName("beatriz"), "beatriz");
  assert.equal(extractAccountName("EXEMPLO\\beatriz"), "beatriz");
  assert.equal(extractAccountName("beatriz@exemplo.local"), "beatriz");
});

test("atribui NTI antes de GECOM quando o usuário pertence aos dois grupos", () => {
  const groups = [
    "CN=GTI,OU=Grupos,DC=exemplo,DC=local",
    "CN=GECOM,OU=Grupos,DC=exemplo,DC=local",
  ];
  assert.equal(roleForGroups(groups, ["GTI"], ["GECOM"]), "nti");
  assert.equal(roleForGroups(groups.slice(1), ["GTI"], ["GECOM"]), "gecom");
  assert.equal(roleForGroups(groups, ["OUTRO"], ["OUTRO_2"]), null);
});

test("autoriza grupos pelo CN curto ou DN completo", () => {
  const groups = ["CN=CENTRAL_AVISOS_ADMIN,OU=Grupos,DC=exemplo,DC=local"];
  assert.equal(belongsToAllowedGroup(groups, ["CENTRAL_AVISOS_ADMIN"]), true);
  assert.equal(belongsToAllowedGroup(groups, [groups[0]]), true);
  assert.equal(belongsToAllowedGroup(groups, ["OUTRO_GRUPO"]), false);
});
