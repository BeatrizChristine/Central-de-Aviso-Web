import { NextResponse } from "next/server";
import type { AuthUser } from "@/types/auth";
import { AuthConfigurationError } from "./errors";

export const AUTH_COOKIE_NAME = "central_avisos_session";

const DEFAULT_SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SESSION_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

type SessionPayload = AuthUser & { iat: number; exp: number };

export async function createSessionToken(user: AuthUser, remember: boolean): Promise<{
  token: string;
  maxAge: number | undefined;
}> {
  const lifetime = remember ? REMEMBER_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const encodedPayload = base64UrlEncode(JSON.stringify({
    ...user,
    iat: now,
    exp: now + lifetime,
  } satisfies SessionPayload));
  return {
    token: `${encodedPayload}.${await sign(encodedPayload)}`,
    maxAge: remember ? lifetime : undefined,
  };
}

export async function readSession(request: Request): Promise<AuthUser | null> {
  const token = readCookie(request.headers.get("cookie"), AUTH_COOKIE_NAME);
  if (!token) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64UrlDecode(signature) as BufferSource,
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload, true)) as Partial<SessionPayload>;
    if (
      typeof payload.id !== "string"
      || typeof payload.username !== "string"
      || typeof payload.name !== "string"
      || (payload.email !== null && typeof payload.email !== "string")
      || typeof payload.exp !== "number"
      || payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return {
      id: payload.id,
      username: payload.username,
      name: payload.name,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function requireApiSession(request: Request): Promise<NextResponse | null> {
  try {
    if (await readSession(request)) return null;
  } catch (error) {
    console.error("Falha ao validar a sessão:", error instanceof Error ? error.name : "UnknownError");
  }
  return NextResponse.json(
    { error: "Sessão expirada ou inexistente." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function sessionCookieOptions(maxAge: number | undefined) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

async function sign(value: string) {
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function signingKey() {
  const secret = process.env.CENTRAL_AUTH_SECRET?.trim() || "";
  if (secret.length < 32) {
    throw new AuthConfigurationError("Configure CENTRAL_AUTH_SECRET com pelo menos 32 caracteres.");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function readCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

function base64UrlEncode(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string, asText: true): string;
function base64UrlDecode(value: string, asText?: false): Uint8Array;
function base64UrlDecode(value: string, asText?: boolean): string | Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return asText ? new TextDecoder().decode(bytes) : bytes;
}
