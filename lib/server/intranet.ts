import { NextRequest, NextResponse } from "next/server";

type ProxyOptions = {
  forwardSearch?: boolean;
  timeoutMs?: number;
  unconfiguredMessage?: string;
  unavailableMessage?: string;
};

export function getIntranetBaseUrl() {
  return process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "") || null;
}

export function createIntranetHeaders(contentType?: string | null) {
  const headers = new Headers({ Accept: "application/json" });
  if (contentType) headers.set("Content-Type", contentType);
  if (process.env.INTRANET_AVISOS_TOKEN) {
    headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  }
  return headers;
}

export async function proxyIntranet(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
) {
  const baseUrl = getIntranetBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: options.unconfiguredMessage || "Configure INTRANET_BASE_URL no arquivo .env.local." },
      { status: 503 },
    );
  }

  const target = new URL(`${baseUrl}${path}`);
  if (options.forwardSearch !== false) {
    request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  }

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: createIntranetHeaders(request.headers.get("content-type")),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: options.unavailableMessage || "Não foi possível conectar ao servidor da Intranet." },
      { status: 502 },
    );
  }
}
