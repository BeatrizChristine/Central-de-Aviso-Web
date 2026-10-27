"use client";

import { AlertTriangle, BellRing, CalendarClock, CircleAlert, CircleCheck, ExternalLink, FileText, Info, Paperclip, X } from "lucide-react";
import { ReactNode, useMemo, useState } from "react";

export type IntranetNoticeData = {
  id?: string;
  title: string;
  message: string;
  active?: boolean;
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

type IntranetNoticeCardProps = {
  notice: IntranetNoticeData;
  variant?: "preview" | "list";
  actions?: ReactNode;
};

export function IntranetNoticeCard({ notice, variant = "list", actions }: IntranetNoticeCardProps) {
  const theme = noticeTheme(notice.criticality);
  return (
    <article className={`intranet-popup-preview intranet-popup-preview-${theme} ${variant === "list" ? "intranet-popup-library" : ""}`}>
      <div className="intranet-popup-accent" />
      <div className="intranet-popup-header">
        <div className="intranet-popup-heading-main">
          <span className="intranet-popup-brand-icon"><BellRing size={15} /></span>
          <div>
            <h2>{notice.title || "Título do seu aviso"}</h2>
            <div className="intranet-popup-meta">
              <span className="intranet-popup-badge">{criticalityLabel(notice.criticality)} - {priorityLabel(notice.priority)}</span>
              <span className="intranet-popup-active"><CircleCheck size={11} /> {notice.active === false ? "Inativo" : "Ativo"}</span>
              {notice.id && <span className="intranet-popup-id">#{notice.id}</span>}
            </div>
          </div>
        </div>
        {variant === "preview" && notice.closable !== false && <button type="button" aria-label="Fechar prévia"><X size={15} /></button>}
      </div>
      <div className="intranet-popup-body">
        <div className="intranet-popup-alert">
          <span className="intranet-popup-alert-icon">{alertIcon(theme)}</span>
          <div>
            <p>{notice.message || "A mensagem aparecerá aqui enquanto você preenche o formulário."}</p>
            {notice.imageUrl && <NoticeAttachment notice={notice} />}
            {notice.link && <a className="intranet-popup-link" href={notice.link} target="_blank" rel="noreferrer">Saiba mais <ExternalLink size={12} /></a>}
          </div>
        </div>
        {(notice.publishedDate || notice.expirationDate) && (
          <div className="intranet-popup-dates">
            {notice.publishedDate && <DateInfo label="Publicado" value={notice.publishedDate} />}
            {notice.expirationDate && <DateInfo label="Expira" value={notice.expirationDate} />}
          </div>
        )}
        {(actions || (variant === "preview" && notice.closable !== false)) && (
          <div className={`intranet-popup-footer ${actions ? "intranet-popup-actions" : ""}`}>
            {actions || <button type="button">Fechar</button>}
          </div>
        )}
      </div>
    </article>
  );
}

function NoticeAttachment({ notice }: { notice: IntranetNoticeData }) {
  const [failed, setFailed] = useState(false);
  const source = useMemo(() => attachmentUrl(notice.imageUrl || ""), [notice.imageUrl]);
  const mime = (notice.imageMimeType || inferMime(source)).toLowerCase();

  if (failed) return <div className="notice-attachment-error"><AlertTriangle size={15} /> Não foi possível carregar o anexo.</div>;
  if (mime.startsWith("image/") || isImageSource(source)) {
    return (
      <figure className="notice-attachment-preview">
        <img src={source} alt={notice.imageName || notice.title || "Imagem do aviso"} onError={() => setFailed(true)} />
        {notice.imageName && <figcaption>{notice.imageName}</figcaption>}
      </figure>
    );
  }
  return <a className="notice-file-link" href={source} target="_blank" rel="noreferrer"><FileText size={16} /><span><strong>Abrir anexo</strong><small>{notice.imageName || fileName(source)}</small></span><ExternalLink size={13} /></a>;
}

function DateInfo({ label, value }: { label: string; value: string }) {
  return <div className="intranet-popup-expiration"><CalendarClock size={13} /><span><small>{label.toUpperCase()}</small><strong>{formatDate(value)}</strong></span></div>;
}

export function attachmentUrl(value: string) {
  const source = value.trim();
  if (!source || source.startsWith("data:") || source.startsWith("blob:") || /^https?:\/\//i.test(source)) return source;
  if (source.startsWith("/uploads/")) return `/api/anexos?path=${encodeURIComponent(source)}`;
  return source;
}

function noticeTheme(value: string) {
  const normalized = value.toLocaleLowerCase("pt-BR");
  if (normalized.includes("critic")) return "critical";
  if (normalized.includes("attention") || normalized.includes("moder") || normalized === "high" || normalized === "alta") return "attention";
  if (normalized === "low" || normalized === "baixa") return "success";
  return "informative";
}

function criticalityLabel(value: string) {
  const theme = noticeTheme(value);
  if (theme === "critical") return "Crítica";
  if (theme === "attention") return "Moderada";
  if (theme === "success") return "Baixa";
  return "Informativa";
}

function priorityLabel(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("urgent") || normalized === "urgente" || normalized.includes("immediate")) return "Urgente";
  if (normalized.includes("important") || normalized === "importante" || normalized === "high" || normalized === "alta") return "Alta";
  if (normalized === "low" || normalized === "baixa") return "Baixa";
  return "Normal";
}

function alertIcon(theme: string) {
  if (theme === "critical") return <AlertTriangle size={16} />;
  if (theme === "attention") return <CircleAlert size={16} />;
  return <Info size={16} />;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function inferMime(source: string) {
  if (/\.pdf(?:\?|$)/i.test(source)) return "application/pdf";
  if (/\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(source)) return "image/unknown";
  return "application/octet-stream";
}

function isImageSource(source: string) { return source.startsWith("data:image/") || /\.(?:png|jpe?g|gif|webp)(?:\?|$)/i.test(source); }
function fileName(source: string) { try { return decodeURIComponent(source.split("/").at(-1)?.split("?")[0] || "Anexo"); } catch { return "Anexo"; } }
