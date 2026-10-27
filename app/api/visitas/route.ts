import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";

export async function GET(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ error: "Configure INTRANET_BASE_URL no arquivo .env.local." }, { status: 503 });
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}/api/visitas`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    if (!response.ok) return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });

    return new NextResponse(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os acessos da Intranet." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as { ips?: unknown[] };
    const ips = [...new Set((Array.isArray(body.ips) ? body.ips : [])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(isPrivateIpv4))].slice(0, 256);
    return NextResponse.json({ hostnames: await resolveHostnames(ips) });
  } catch {
    return NextResponse.json({ error: "Não foi possível identificar os nomes das máquinas." }, { status: 400 });
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
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return {} as Record<string, string>;
    const payload = await response.json() as { hostnames?: Record<string, string> };
    return payload.hostnames || {};
  } catch {
    return {} as Record<string, string>;
  }
}

function isPrivateIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
