import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { proxyIntranet } from "@/lib/server/intranet";

async function proxy(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  return proxyIntranet(request, "/api/avisos", {
    unconfiguredMessage: "Configure INTRANET_BASE_URL no arquivo .env.local antes de publicar.",
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
