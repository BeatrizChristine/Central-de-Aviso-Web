import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateIpv4 } from "../lib/network.mts";

test("aceita somente faixas IPv4 privadas", () => {
  assert.equal(isPrivateIpv4("10.0.0.1"), true);
  assert.equal(isPrivateIpv4("172.16.0.1"), true);
  assert.equal(isPrivateIpv4("172.31.255.255"), true);
  assert.equal(isPrivateIpv4("192.168.1.10"), true);
  assert.equal(isPrivateIpv4("172.32.0.1"), false);
  assert.equal(isPrivateIpv4("8.8.8.8"), false);
  assert.equal(isPrivateIpv4("999.1.1.1"), false);
});
