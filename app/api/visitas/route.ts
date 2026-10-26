import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ error: "Configure INTRANET_BASE_URL no arquivo .env.local." }, { status: 503 });
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}/api/visitas`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    if (!response.ok) return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });

    const payload = JSON.parse(body) as { visitantes?: Array<Record<string, unknown>> };
    if (Array.isArray(payload.visitantes)) {
      const pendingIps = [...new Set(payload.visitantes
        .filter((visitor) => missingHostname(visitor.maquina))
        .map((visitor) => typeof visitor.ip === "string" ? visitor.ip.trim() : "")
        .filter(isPrivateIpv4))];
      const hostnames = await resolveHostnames(pendingIps);
      payload.visitantes = payload.visitantes.map((visitor) => {
        const ip = typeof visitor.ip === "string" ? visitor.ip.trim() : "";
        return hostnames[ip] ? { ...visitor, maquina: hostnames[ip] } : visitor;
      });
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os acessos da Intranet." }, { status: 502 });
  }
}

async function resolveHostnames(ips: string[]) {
  if (ips.length === 0) return {} as Record<string, string>;
  const resolverUrl = process.env.HOSTNAME_RESOLVER_URL || "http://127.0.0.1:5190/resolve";
  try {
    const response = await fetch(resolverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ips }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return {} as Record<string, string>;
    const payload = await response.json() as { hostnames?: Record<string, string> };
    return payload.hostnames || {};
  } catch {
    return {} as Record<string, string>;
  }
}

function missingHostname(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return true;
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  return normalized === "null" || normalized.includes("não informado") || normalized.includes("nao informado");
}

function isPrivateIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
