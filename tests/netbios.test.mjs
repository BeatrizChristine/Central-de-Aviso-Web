import assert from "node:assert/strict";
import test from "node:test";
import { createNodeStatusQuery, parseNodeStatusResponse } from "../lib/netbios.mjs";

test("monta uma consulta NBNS de status do dispositivo", () => {
  const query = createNodeStatusQuery(0x1234);
  assert.equal(query.length, 50);
  assert.equal(query.readUInt16BE(0), 0x1234);
  assert.equal(query.readUInt16BE(4), 1);
  assert.equal(query.readUInt16BE(46), 0x0021);
});

test("extrai o nome único da resposta NBNS", () => {
  const response = Buffer.alloc(43);
  response.writeUInt16BE(0x1234, 0);
  response.writeUInt16BE(0x8500, 2);
  response.writeUInt16BE(1, 6);
  response[12] = 0xc0;
  response[13] = 0x0c;
  response.writeUInt16BE(0x0021, 14);
  response.writeUInt16BE(1, 16);
  response.writeUInt16BE(19, 22);
  response[24] = 1;
  response.write("PC-RECEPCAO", 25, "ascii");
  response.fill(0x20, 36, 40);
  response[40] = 0x00;
  response.writeUInt16BE(0, 41);

  assert.equal(parseNodeStatusResponse(response, 0x1234), "PC-RECEPCAO");
});
