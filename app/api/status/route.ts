import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";

export async function GET(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const baseUrl = process.env.INTRANET_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return NextResponse.json({ configured: false, online: false });
  const headers = new Headers({ Accept: "application/json" });
  if (process.env.INTRANET_AVISOS_TOKEN) headers.set("x-intranet-token", process.env.INTRANET_AVISOS_TOKEN);
  try {
    const response = await fetch(`${baseUrl}/api/avisos`, { headers, cache: "no-store", signal: AbortSignal.timeout(3000) });
    return NextResponse.json({ configured: true, online: response.ok });
  } catch {
    return NextResponse.json({ configured: true, online: false });
  }
}
