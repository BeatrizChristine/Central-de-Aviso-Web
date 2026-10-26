import { NextRequest, NextResponse } from "next/server";

async function proxy(request: NextRequest) {
  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ error: "Configure INTRANET_BASE_URL no arquivo .env.local." }, { status: 503 });
  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}/api/daily-message`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "application/json" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível conectar ao servidor da Intranet." }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
