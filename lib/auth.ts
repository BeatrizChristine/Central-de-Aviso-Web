import { Client, Filter, InvalidCredentialsError, type Entry } from "ldapts";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "central_avisos_session";

const DEFAULT_SESSION_SECONDS = 8 * 60 * 60;
const REMEMBER_SESSION_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
};

type SessionPayload = AuthUser & {
  iat: number;
  exp: number;
};

type ActiveDirectoryConfig = {
  url: string;
  domain: string;
  baseDn: string;
  userFilter: string;
  allowedGroups: string[];
  allowInsecureLdap: boolean;
  rejectUnauthorized: boolean;
};

export class AuthConfigurationError extends Error {}
export class InvalidLoginError extends Error {}
export class UnauthorizedGroupError extends Error {}
export class ActiveDirectoryUnavailableError extends Error {}

export async function authenticateWithActiveDirectory(
  rawUsername: string,
  password: string,
): Promise<AuthUser> {
  const username = rawUsername.trim();
  if (!username || !password || username.length > 256 || password.length > 1024) {
    throw new InvalidLoginError("Usuário ou senha inválidos.");
  }

  const config = activeDirectoryConfig();
  const accountName = extractAccountName(username);
  if (!accountName) throw new InvalidLoginError("Usuário ou senha inválidos.");

  const principal = username.includes("@") || username.includes("\\")
    ? username
    : `${username}@${config.domain}`;
  const client = new Client({
    url: config.url,
    connectTimeout: 5_000,
    timeout: 5_000,
    tlsOptions: config.url.startsWith("ldaps://")
      ? { rejectUnauthorized: config.rejectUnauthorized, minVersion: "TLSv1.2" }
      : undefined,
  });

  try {
    await client.bind(principal, password);
    const filter = config.userFilter.replace("{0}", Filter.escape(accountName));
    const { searchEntries } = await client.search(config.baseDn, {
      scope: "sub",
      filter,
      attributes: [
        "objectGUID",
        "sAMAccountName",
        "displayName",
        "mail",
        "memberOf",
      ],
      explicitBufferAttributes: ["objectGUID"],
      sizeLimit: 2,
      timeLimit: 5,
    });

    if (searchEntries.length !== 1) {
      throw new InvalidLoginError("Usuário ou senha inválidos.");
    }

    const entry = searchEntries[0];
    const groups = entryValues(entry, "memberOf");
    if (!belongsToAllowedGroup(groups, config.allowedGroups)) {
      throw new UnauthorizedGroupError("Seu usuário não possui acesso à Central de Avisos.");
    }

    const login = entryValue(entry, "sAMAccountName") || accountName;
    const name = entryValue(entry, "displayName") || login;
    const email = entryValue(entry, "mail") || null;
    const guid = entryBuffer(entry, "objectGUID");

    return {
      id: guid ? objectGuidToUuid(guid) : login.toLocaleLowerCase("pt-BR"),
      username: login,
      name,
      email,
    };
  } catch (error) {
    if (
      error instanceof InvalidLoginError ||
      error instanceof UnauthorizedGroupError ||
      error instanceof AuthConfigurationError
    ) {
      throw error;
    }
    if (error instanceof InvalidCredentialsError) {
      throw new InvalidLoginError("Usuário ou senha inválidos.");
    }
    console.error("Falha ao consultar o Active Directory:", safeErrorName(error));
    throw new ActiveDirectoryUnavailableError(
      "O Active Directory está indisponível no momento. Tente novamente em instantes.",
    );
  } finally {
    await client.unbind().catch(() => undefined);
  }
}

export async function createSessionToken(user: AuthUser, remember: boolean): Promise<{
  token: string;
  maxAge: number | undefined;
}> {
  const lifetime = remember ? REMEMBER_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { ...user, iat: now, exp: now + lifetime };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload);
  return {
    token: `${encodedPayload}.${signature}`,
    maxAge: remember ? lifetime : undefined,
  };
}

export async function readSession(request: Request): Promise<AuthUser | null> {
  const token = readCookie(request.headers.get("cookie"), AUTH_COOKIE_NAME);
  if (!token) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;

  try {
    const key = await signingKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature) as BufferSource,
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload, true)) as Partial<SessionPayload>;
    if (
      typeof payload.id !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.name !== "string" ||
      (payload.email !== null && typeof payload.email !== "string") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
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
    console.error("Falha ao validar a sessão:", safeErrorName(error));
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

function activeDirectoryConfig(): ActiveDirectoryConfig {
  const url = process.env.CENTRAL_AD_URL?.trim() || "";
  const domain = process.env.CENTRAL_AD_DOMAIN?.trim() || "";
  const baseDn = process.env.CENTRAL_AD_BASE_DN?.trim() || "";
  const userFilter = process.env.CENTRAL_AD_USER_FILTER?.trim()
    || "(&(objectCategory=person)(objectClass=user)(sAMAccountName={0}))";
  const allowedGroups = (process.env.CENTRAL_AD_ALLOWED_GROUPS || "")
    .split(",")
    .map((group) => group.trim())
    .filter(Boolean);
  const allowInsecureLdap = parseBoolean(process.env.CENTRAL_AD_ALLOW_INSECURE_LDAP);
  const rejectUnauthorized = process.env.CENTRAL_AD_TLS_REJECT_UNAUTHORIZED?.trim().toLowerCase() !== "false";

  if (!url || !domain || !baseDn || !userFilter.includes("{0}") || allowedGroups.length === 0) {
    throw new AuthConfigurationError("Configuração do Active Directory incompleta.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new AuthConfigurationError("CENTRAL_AD_URL é inválida.");
  }
  if (!new Set(["ldap:", "ldaps:"]).has(parsedUrl.protocol)) {
    throw new AuthConfigurationError("CENTRAL_AD_URL deve usar ldap:// ou ldaps://.");
  }
  if (parsedUrl.protocol === "ldap:" && !allowInsecureLdap) {
    throw new AuthConfigurationError(
      "LDAP sem criptografia está bloqueado. Use LDAPS ou habilite-o apenas temporariamente.",
    );
  }

  return {
    url,
    domain,
    baseDn,
    userFilter,
    allowedGroups,
    allowInsecureLdap,
    rejectUnauthorized,
  };
}

async function sign(value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function signingKey() {
  const secret = process.env.CENTRAL_AUTH_SECRET?.trim() || "";
  if (secret.length < 32) {
    throw new AuthConfigurationError(
      "Configure CENTRAL_AUTH_SECRET com pelo menos 32 caracteres.",
    );
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function belongsToAllowedGroup(userGroups: string[], allowedGroups: string[]) {
  return userGroups.some((userGroup) => allowedGroups.some((allowedGroup) => {
    if (allowedGroup.toLocaleLowerCase("pt-BR").startsWith("cn=")) {
      return userGroup.localeCompare(allowedGroup, undefined, { sensitivity: "accent" }) === 0;
    }
    return userGroup.toLocaleLowerCase("pt-BR").startsWith(
      `cn=${allowedGroup},`.toLocaleLowerCase("pt-BR"),
    );
  }));
}

function extractAccountName(username: string) {
  const withoutDomain = username.includes("\\") ? username.slice(username.lastIndexOf("\\") + 1) : username;
  return (withoutDomain.includes("@") ? withoutDomain.slice(0, withoutDomain.indexOf("@")) : withoutDomain).trim();
}

function entryValue(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function entryValues(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function entryBuffer(entry: Entry, attribute: string) {
  const value = entryAttribute(entry, attribute);
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value) && value[0] instanceof Uint8Array) return value[0];
  return null;
}

function entryAttribute(entry: Entry, attribute: string) {
  const key = Object.keys(entry).find((candidate) => candidate.toLowerCase() === attribute.toLowerCase());
  return key ? entry[key] : undefined;
}

function objectGuidToUuid(bytes: Uint8Array) {
  if (bytes.length !== 16) throw new ActiveDirectoryUnavailableError("O AD retornou um identificador inválido.");
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `${hex[3]}${hex[2]}${hex[1]}${hex[0]}-${hex[5]}${hex[4]}-${hex[7]}${hex[6]}-${hex[8]}${hex[9]}-${hex.slice(10).join("")}`;
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

function parseBoolean(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function safeErrorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}
