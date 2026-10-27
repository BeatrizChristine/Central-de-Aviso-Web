import { NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { proxyIntranet } from "@/lib/server/intranet";

async function proxy(request: NextRequest) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  return proxyIntranet(request, "/api/daily-message", { forwardSearch: false });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
