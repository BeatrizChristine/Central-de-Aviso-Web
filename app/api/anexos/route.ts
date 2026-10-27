import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  const path = request.nextUrl.searchParams.get("path")?.trim() || "";
  if (!baseUrl) return NextResponse.json({ error: "Servidor da Intranet não configurado." }, { status: 503 });
  if (!/^\/uploads\/[A-Za-z0-9._~!$&'()+,;=:@%/-]+$/.test(path) || path.includes("..")) {
    return NextResponse.json({ error: "Caminho de anexo inválido." }, { status: 400 });
  }

  const headers = new Headers();
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}${path}`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
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
