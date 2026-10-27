import type { JsonRecord } from "@/lib/client/api";

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
};

export function normalizeNotice(raw: JsonRecord, index: number): NoticeRecord {
  return {
    id: String(raw.id ?? raw._id ?? index),
    title: String(raw.title ?? raw.titulo ?? "Sem título"),
    message: String(raw.message ?? raw.mensagem ?? ""),
    active: Boolean(raw.active ?? raw.ativo ?? true),
    criticality: String(raw.criticality ?? raw.criticidade ?? "informative"),
    priority: String(raw.priority ?? raw.prioridade ?? "normal"),
    link: optionalText(raw.link),
    imageUrl: optionalText(raw.imageUrl ?? raw.imagem ?? raw.imageData),
    imageMimeType: optionalText(raw.imageMimeType ?? raw.mimeType),
    imageName: optionalText(raw.imageName ?? raw.nomeImagem),
    publishedDate: optionalText(raw.publishedDate ?? raw.dataPublicacao ?? raw.createdAt),
    expirationDate: optionalText(raw.expirationDate ?? raw.dataExpiracao),
    closable: Boolean(raw.closable ?? raw.podeFechar ?? true),
  };
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
