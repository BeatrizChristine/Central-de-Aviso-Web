import { execFile } from "node:child_process";
import http from "node:http";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const host = "127.0.0.1";
const port = Number.parseInt(process.env.HOSTNAME_RESOLVER_PORT || "5190", 10);
const positiveTtlMs = 30 * 60 * 1000;
const negativeTtlMs = 5 * 60 * 1000;
const cache = new Map();

const server = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET" && request.url === "/health") {
    response.end(JSON.stringify({ online: true }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/resolve") {
    response.statusCode = 404;
    response.end(JSON.stringify({ error: "Rota não encontrada." }));
    return;
  }

  try {
    const body = await readJson(request);
    const ips = [...new Set(Array.isArray(body?.ips) ? body.ips.filter(isPrivateIpv4) : [])].slice(0, 256);
    const entries = await mapConcurrent(ips, 24, async (ip) => [ip, await resolveHostname(ip)]);
    response.end(JSON.stringify({ hostnames: Object.fromEntries(entries.filter(([, name]) => name)) }));
  } catch (error) {
    response.statusCode = error instanceof PayloadTooLargeError ? 413 : 400;
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Requisição inválida." }));
  }
});

server.on("error", (error) => {
  if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
    console.log(`Resolvedor de máquinas já está ativo em http://${host}:${port}`);
    process.exit(0);
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Resolvedor de máquinas: http://${host}:${port}`);
});

async function resolveHostname(ip) {
  const current = cache.get(ip);
  if (current && current.expiresAt > Date.now()) return current.hostname;

  let output = "";
  try {
    const result = await execFileAsync("ping.exe", ["-a", "-n", "1", "-w", "250", ip], {
      timeout: 8_000,
      windowsHide: true,
      maxBuffer: 64 * 1024,
    });
    output = result.stdout || "";
  } catch (error) {
    output = error && typeof error === "object" && "stdout" in error ? String(error.stdout || "") : "";
  }

  const escapedIp = ip.replaceAll(".", "\\.");
  const match = output.match(new RegExp(`([A-Za-z0-9][A-Za-z0-9.-]{0,252})\\s+\\[${escapedIp}\\]`, "i"));
  const hostname = match?.[1] && match[1] !== ip ? match[1].replace(/\.$/, "").split(".")[0] : null;
  cache.set(ip, { hostname, expiresAt: Date.now() + (hostname ? positiveTtlMs : negativeTtlMs) });
  return hostname;
}

function isPrivateIpv4(value) {
  if (typeof value !== "string") return false;
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new PayloadTooLargeError("Requisição muito grande.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function mapConcurrent(items, concurrency, operation) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await operation(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

class PayloadTooLargeError extends Error {}
