import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
