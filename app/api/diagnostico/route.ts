import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";

const paths = [
  { key: "avisos", path: "/api/avisos" },
  { key: "mensagens", path: "/api/daily-message" },
  { key: "visitas", path: "/api/visitas" },
] as const;

export async function GET(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ configured: false, server: null, tokenConfigured: false, endpoints: [] });
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);

  const endpoints = await Promise.all(paths.map(async ({ key, path }) => {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${baseUrl}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
      return { key, path, online: response.ok, status: response.status, latencyMs: Date.now() - startedAt };
    } catch {
      return { key, path, online: false, status: null, latencyMs: Date.now() - startedAt };
    }
  }));

  let server = baseUrl;
  try { server = new URL(baseUrl).host; } catch { /* URL já é validada na configuração. */ }
  return NextResponse.json({ configured: true, server, tokenConfigured: Boolean(process.env.INTRANET_AVISOS_TOKEN), checkedAt: new Date().toISOString(), endpoints });
}
