import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { proxyIntranet } from "@/lib/server/intranet";

async function proxy(request: NextRequest) {
  const unauthorized = await requireApiRole(request, ["nti"]);
  if (unauthorized) return unauthorized;

  return proxyIntranet(request, "/api/daily-message", { forwardSearch: false });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
