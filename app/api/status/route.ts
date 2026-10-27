import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createIntranetHeaders, getIntranetBaseUrl } from "@/lib/server/intranet";

export async function GET(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = getIntranetBaseUrl();
  if (!baseUrl) return NextResponse.json({ configured: false, online: false });
  try {
    const response = await fetch(`${baseUrl}/api/avisos`, {
      headers: createIntranetHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    return NextResponse.json({ configured: true, online: response.ok });
  } catch {
    return NextResponse.json({ configured: true, online: false });
  }
}
