import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ error: "Configure INTRANET_BASE_URL no arquivo .env.local." }, { status: 503 });
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}/api/visitas`, { headers, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os acessos da Intranet." }, { status: 502 });
  }
}
