import type { JsonRecord } from "@/lib/client/api";
import type { UserRole } from "@/types/auth";

export type NoticeAuditActor = {
  id: string;
  username: string;
  name: string;
  role?: UserRole;
};

export type NoticeAudit = {
  createdBy?: NoticeAuditActor;
  createdAt?: string;
  deactivatedBy?: NoticeAuditActor;
  deactivatedAt?: string;
  reactivatedBy?: NoticeAuditActor;
  reactivatedAt?: string;
};

export type NoticeRecord = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  criticality: string;
  priority: string;
  link?: string;
  imageUrl?: string;
  imageMimeType?: string;
  imageName?: string;
  publishedDate?: string;
  expirationDate?: string;
  closable?: boolean;
  audit?: NoticeAudit;
};

export function normalizeNotice(raw: JsonRecord, index: number): NoticeRecord {
  return {
    id: String(raw.id ?? raw._id ?? index),
    title: String(raw.title ?? raw.titulo ?? "Sem título"),
    message: String(raw.message ?? raw.mensagem ?? ""),
    active: booleanValue(raw.active ?? raw.ativo, true),
    criticality: String(raw.criticality ?? raw.criticidade ?? "informative"),
    priority: String(raw.priority ?? raw.prioridade ?? "normal"),
    link: optionalText(raw.link),
    imageUrl: optionalText(raw.imageUrl ?? raw.imagem ?? raw.imageData),
    imageMimeType: optionalText(raw.imageMimeType ?? raw.mimeType),
    imageName: optionalText(raw.imageName ?? raw.nomeImagem),
    publishedDate: optionalText(raw.publishedDate ?? raw.dataPublicacao ?? raw.createdAt),
    expirationDate: optionalText(raw.expirationDate ?? raw.dataExpiracao),
    closable: booleanValue(raw.closable ?? raw.podeFechar, true),
    audit: normalizeAudit(raw.audit),
  };
}

function normalizeAudit(value: unknown): NoticeAudit | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as JsonRecord;
  const audit = {
    createdBy: normalizeActor(raw.createdBy),
    createdAt: optionalText(raw.createdAt),
    deactivatedBy: normalizeActor(raw.deactivatedBy),
    deactivatedAt: optionalText(raw.deactivatedAt),
    reactivatedBy: normalizeActor(raw.reactivatedBy),
    reactivatedAt: optionalText(raw.reactivatedAt),
  };
  return Object.values(audit).some(Boolean) ? audit : undefined;
}

function normalizeActor(value: unknown): NoticeAuditActor | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as JsonRecord;
  if (typeof raw.id !== "string" || typeof raw.username !== "string" || typeof raw.name !== "string") {
    return undefined;
  }
  const role = raw.role === "nti" || raw.role === "gecom" ? raw.role : undefined;
  return { id: raw.id, username: raw.username, name: raw.name, ...(role ? { role } : {}) };
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLocaleLowerCase("pt-BR");
    if (["true", "1", "sim", "ativo"].includes(normalized)) return true;
    if (["false", "0", "não", "nao", "inativo"].includes(normalized)) return false;
  }
  return fallback;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
