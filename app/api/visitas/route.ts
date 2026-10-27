import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { isPrivateIpv4 } from "@/lib/network.mjs";
import { createIntranetHeaders, getIntranetBaseUrl } from "@/lib/server/intranet";

export async function GET(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = getIntranetBaseUrl();
  if (!baseUrl) return NextResponse.json({ error: "Configure INTRANET_BASE_URL no arquivo .env.local." }, { status: 503 });
  try {
    const response = await fetch(`${baseUrl}/api/visitas`, {
      headers: createIntranetHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
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
