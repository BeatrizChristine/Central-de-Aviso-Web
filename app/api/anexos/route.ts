import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createIntranetHeaders, getIntranetBaseUrl } from "@/lib/server/intranet";

export async function GET(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = getIntranetBaseUrl();
  const path = request.nextUrl.searchParams.get("path")?.trim() || "";
  if (!baseUrl) return NextResponse.json({ error: "Servidor da Intranet não configurado." }, { status: 503 });
  if (!/^\/uploads\/[A-Za-z0-9._~!$&'()+,;=:@%/-]+$/.test(path) || path.includes("..")) {
    return NextResponse.json({ error: "Caminho de anexo inválido." }, { status: 400 });
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: createIntranetHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ error: "Anexo não encontrado." }, { status: response.status });
    return new NextResponse(await response.arrayBuffer(), {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o anexo da Intranet." }, { status: 502 });
  }
}
