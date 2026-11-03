import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createIntranetHeaders, getIntranetBaseUrl } from "@/lib/server/intranet";
import {
  readNoticeAudits,
  readNoticeOwnerRole,
  recordNoticeAudit,
  type NoticeAudit,
  type NoticeAuditAction,
} from "@/lib/server/notice-audit";
import type { AuthUser } from "@/types/auth";

type JsonRecord = Record<string, unknown>;

async function notices(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "Sessão expirada ou inexistente." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const baseUrl = getIntranetBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: "Configure INTRANET_BASE_URL no arquivo .env.local antes de publicar." },
      { status: 503 },
    );
  }

  const bodyText = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.text();
  const body = parseJson(bodyText);
  const authorizationError = await authorizeMutation(request.method, request.nextUrl.searchParams.get("id"), user);
  if (authorizationError) return authorizationError;
  const beforeIds = request.method === "POST"
    ? await currentNoticeIds(baseUrl).catch(() => new Set<string>())
    : new Set<string>();

  try {
    const target = new URL(`${baseUrl}/api/avisos`);
    request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
    const upstream = await fetch(target, {
      method: request.method,
      headers: createIntranetHeaders(request.headers.get("content-type")),
      body: bodyText,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const responseText = await upstream.text();
    const responseBody = parseJson(responseText);

    if (!upstream.ok) return upstreamResponse(upstream, responseText);

    if (request.method === "GET") {
      return enrichedGetResponse(upstream, responseBody, responseText, user);
    }

    const noticeId = request.nextUrl.searchParams.get("id")
      || extractNoticeId(responseBody)
      || (request.method === "POST" ? await findCreatedNoticeId(baseUrl, beforeIds, body) : null);
    const action = auditAction(request.method, body);
    if (noticeId && action) await safelyRecordAudit(noticeId, action, user);

    return upstreamResponse(upstream, responseText);
  } catch (error) {
    console.error("Falha ao acessar a API de avisos:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Não foi possível conectar ao servidor da Intranet." },
      { status: 502 },
    );
  }
}

async function authenticatedUser(request: Request) {
  try {
    return await readSession(request);
  } catch (error) {
    console.error("Falha ao validar a sessão:", error instanceof Error ? error.name : "UnknownError");
    return null;
  }
}

async function authorizeMutation(method: string, noticeId: string | null, user: AuthUser) {
  if (user.role !== "gecom" || (method !== "PATCH" && method !== "DELETE")) return null;
  if (!noticeId) {
    return NextResponse.json({ error: "Informe o popup que será alterado." }, { status: 400 });
  }
  try {
    const ownerRole = await readNoticeOwnerRole(noticeId);
    if (ownerRole === "gecom") return null;
    return NextResponse.json(
      { error: "A GECOM só pode alterar popups publicados pela própria GECOM." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Falha ao verificar o responsável pelo aviso:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Não foi possível validar a permissão para alterar este popup." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

async function enrichedGetResponse(
  upstream: Response,
  payload: unknown,
  fallbackText: string,
  user: AuthUser,
) {
  try {
    const audits = await readNoticeAudits();
    const enriched = enrichPayload(payload, audits, user.role);
    if (enriched) {
      return NextResponse.json(enriched, {
        status: upstream.status,
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch (error) {
    console.error("Falha ao consultar a auditoria dos avisos:", error instanceof Error ? error.name : "UnknownError");
  }
  return upstreamResponse(upstream, fallbackText);
}

async function safelyRecordAudit(
  noticeId: string,
  action: NoticeAuditAction,
  user: AuthUser,
) {
  try {
    await recordNoticeAudit(noticeId, action, user);
  } catch (error) {
    console.error("Falha ao registrar a auditoria do aviso:", error instanceof Error ? error.name : "UnknownError");
  }
}

async function currentNoticeIds(baseUrl: string) {
  const payload = await fetchNoticePayload(baseUrl);
  return new Set(noticeList(payload).map((item) => noticeId(item)).filter((id): id is string => Boolean(id)));
}

async function findCreatedNoticeId(baseUrl: string, beforeIds: Set<string>, requestBody: unknown) {
  try {
    const candidates = noticeList(await fetchNoticePayload(baseUrl))
      .filter((item) => {
        const id = noticeId(item);
        return id && !beforeIds.has(id);
      });
    if (candidates.length === 1) return noticeId(candidates[0]);

    if (isRecord(requestBody)) {
      const matching = candidates.filter((item) => (
        String(item.title ?? item.titulo ?? "") === String(requestBody.title ?? requestBody.titulo ?? "")
        && String(item.message ?? item.mensagem ?? "") === String(requestBody.message ?? requestBody.mensagem ?? "")
      ));
      if (matching.length) return noticeId(newestNotice(matching));
    }
    return candidates.length ? noticeId(newestNotice(candidates)) : null;
  } catch {
    return null;
  }
}

async function fetchNoticePayload(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/avisos`, {
    headers: createIntranetHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Avisos API ${response.status}`);
  return response.json() as Promise<unknown>;
}

function enrichPayload(
  payload: unknown,
  audits: ReadonlyMap<string, NoticeAudit>,
  role: AuthUser["role"],
) {
  if (Array.isArray(payload)) return visibleNotices(payload, audits, role);
  if (!isRecord(payload)) return null;
  for (const key of ["avisos", "popups"]) {
    if (Array.isArray(payload[key])) {
      return { ...payload, [key]: visibleNotices(payload[key], audits, role) };
    }
  }
  return null;
}

function visibleNotices(
  values: unknown[],
  audits: ReadonlyMap<string, NoticeAudit>,
  role: AuthUser["role"],
) {
  return values.flatMap((value) => {
    if (!isRecord(value)) return role === "nti" ? [value] : [];
    const id = noticeId(value);
    const audit = id ? audits.get(id) : undefined;
    const active = noticeIsActive(value);
    const gecomOwned = audit?.createdBy?.role === "gecom";
    if (role === "gecom" && !active && !gecomOwned) return [];

    const visibleAudit = role === "gecom" && active && !gecomOwned && audit
      ? { createdBy: audit.createdBy, createdAt: audit.createdAt }
      : audit;
    return [{ ...value, ...(visibleAudit ? { audit: visibleAudit } : {}) }];
  });
}

function noticeIsActive(value: JsonRecord) {
  const active = value.active ?? value.ativo;
  if (typeof active === "boolean") return active;
  if (typeof active === "number") return active !== 0;
  if (typeof active === "string") {
    return !["false", "0", "não", "nao", "inativo"].includes(active.trim().toLocaleLowerCase("pt-BR"));
  }
  return true;
}

function noticeList(payload: unknown): JsonRecord[] {
  const values = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.avisos)
      ? payload.avisos
      : isRecord(payload) && Array.isArray(payload.popups)
        ? payload.popups
        : [];
  return values.filter(isRecord);
}

function extractNoticeId(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const direct = noticeId(payload);
  if (direct) return direct;
  for (const key of ["aviso", "popup", "data", "result"]) {
    const nested = payload[key];
    const id = isRecord(nested) ? noticeId(nested) : null;
    if (id) return id;
  }
  return null;
}

function noticeId(value: JsonRecord) {
  const id = value.id ?? value._id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

function newestNotice(items: JsonRecord[]) {
  return [...items].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt))[0];
}

function dateValue(value: unknown) {
  if (typeof value !== "string") return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function auditAction(method: string, body: unknown): NoticeAuditAction | null {
  if (method === "POST") return "created";
  if (method === "DELETE") return "deleted";
  if (method !== "PATCH" || !isRecord(body) || typeof body.active !== "boolean") return null;
  return body.active ? "reactivated" : "deactivated";
}

function parseJson(value?: string) {
  if (!value) return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function upstreamResponse(upstream: Response, body: string) {
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = notices;
export const POST = notices;
export const PATCH = notices;
export const DELETE = notices;
