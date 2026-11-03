import { randomInt } from "node:crypto";
import { createSocket } from "node:dgram";

const netbiosNameLength = 16;
const nodeStatusType = 0x0021;

export function createNodeStatusQuery(transactionId) {
  const query = Buffer.alloc(50);
  query.writeUInt16BE(transactionId, 0);
  query.writeUInt16BE(1, 4);
  query[12] = 32;

  const wildcard = Buffer.alloc(netbiosNameLength);
  wildcard[0] = "*".charCodeAt(0);
  for (let index = 0; index < wildcard.length; index += 1) {
    query[13 + index * 2] = 0x41 + (wildcard[index] >> 4);
    query[14 + index * 2] = 0x41 + (wildcard[index] & 0x0f);
  }

  query[45] = 0;
  query.writeUInt16BE(nodeStatusType, 46);
  query.writeUInt16BE(1, 48);
  return query;
}

export function parseNodeStatusResponse(message, transactionId) {
  if (!Buffer.isBuffer(message) || message.length < 12) return null;
  if (message.readUInt16BE(0) !== transactionId) return null;

  const questionCount = message.readUInt16BE(4);
  const answerCount = message.readUInt16BE(6);
  let offset = 12;

  try {
    for (let index = 0; index < questionCount; index += 1) {
      offset = skipDnsName(message, offset) + 4;
    }

    const candidates = [];
    for (let index = 0; index < answerCount; index += 1) {
      offset = skipDnsName(message, offset);
      if (offset + 10 > message.length) return null;
      const type = message.readUInt16BE(offset);
      const dataLength = message.readUInt16BE(offset + 8);
      const dataOffset = offset + 10;
      offset = dataOffset + dataLength;
      if (offset > message.length || type !== nodeStatusType || dataLength < 19) continue;

      const nameCount = message[dataOffset];
      for (let nameIndex = 0; nameIndex < nameCount; nameIndex += 1) {
        const recordOffset = dataOffset + 1 + nameIndex * 18;
        if (recordOffset + 18 > dataOffset + dataLength) break;
        const name = message.subarray(recordOffset, recordOffset + 15).toString("ascii").trim();
        const suffix = message[recordOffset + 15];
        const flags = message.readUInt16BE(recordOffset + 16);
        const groupName = (flags & 0x8000) !== 0;
        if (name && !groupName && !name.startsWith("__MSBROWSE__")) {
          candidates.push({ name, suffix });
        }
      }
    }

    return candidates.find((candidate) => candidate.suffix === 0x00)?.name
      || candidates.find((candidate) => candidate.suffix === 0x20)?.name
      || candidates[0]?.name
      || null;
  } catch {
    return null;
  }
}

export function queryNetbiosName(ip, timeoutMs = 900) {
  return new Promise((resolve) => {
    const socket = createSocket("udp4");
    const transactionId = randomInt(0, 0x10000);
    const query = createNodeStatusQuery(transactionId);
    let settled = false;

    function finish(hostname) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.close(); } catch { /* O socket pode falhar antes de ser aberto. */ }
      resolve(hostname);
    }

    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.once("error", () => finish(null));
    socket.on("message", (message, remote) => {
      if (remote.address !== ip) return;
      const hostname = parseNodeStatusResponse(message, transactionId);
      if (hostname) finish(hostname);
    });
    socket.send(query, 137, ip, (error) => {
      if (error) finish(null);
    });
  });
}

function skipDnsName(message, start) {
  let offset = start;
  while (offset < message.length) {
    const length = message[offset];
    if ((length & 0xc0) === 0xc0) return offset + 2;
    offset += 1;
    if (length === 0) return offset;
    offset += length;
  }
  throw new Error("Nome DNS inválido.");
}
