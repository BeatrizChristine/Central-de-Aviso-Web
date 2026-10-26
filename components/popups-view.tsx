"use client";

import {
  AlertTriangle,
  CalendarClock,
  ExternalLink,
  FilePlus2,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PopupRecord = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  criticality: string;
  priority: string;
  link?: string;
  imageUrl?: string;
  publishedDate?: string;
  expirationDate?: string;
};

type RawPopup = Record<string, unknown>;

export function PopupsView({ onCreateNotice }: { onCreateNotice: () => void }) {
  const [items, setItems] = useState<PopupRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await fetch("/api/avisos", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "Não foi possível carregar os popups."));
      const source = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.avisos)
          ? payload.avisos
          : Array.isArray(payload?.popups)
            ? payload.popups
            : [];
      setItems(source.map(normalizePopup));
    } catch (error) {
      setItems([]);
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar os popups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const matchesText = !normalizedQuery || `${item.title} ${item.message}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesStatus = status === "all" || (status === "active" ? item.active : !item.active);
      return matchesText && matchesStatus;
    });
  }, [items, query, status]);

  async function toggle(item: PopupRecord) {
    setActionId(item.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/avisos?id=${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "Não foi possível alterar o popup."));
      setItems((current) => current.map((record) => record.id === item.id ? { ...record, active: !record.active } : record));
      setFeedback(item.active ? "Popup desativado." : "Popup ativado.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao alterar o popup.");
    } finally {
      setActionId(null);
    }
  }

  async function remove(item: PopupRecord) {
    if (!window.confirm(`Excluir definitivamente o popup “${item.title}”?`)) return;
    setActionId(item.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/avisos?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(errorMessage(payload, "Não foi possível excluir o popup."));
      setItems((current) => current.filter((record) => record.id !== item.id));
      setFeedback("Popup excluído.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao excluir o popup.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="content-container management-page">
      <div className="management-heading">
        <div><span className="eyebrow">COMUNICAÇÃO</span><h1>Popups publicados</h1><p>Acompanhe e gerencie os avisos enviados para a Intranet.</p></div>
        <div className="management-actions"><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button><button type="button" className="primary-button" onClick={onCreateNotice}><FilePlus2 size={16} /> Novo aviso</button></div>
      </div>

      <div className="filter-card">
        <label className="search-control"><span>BUSCAR</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título ou mensagem" /></div></label>
        <label><span>STATUS</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
        <div className="result-count"><strong>{filtered.length}</strong><span>{filtered.length === 1 ? "popup encontrado" : "popups encontrados"}</span></div>
      </div>

      {feedback && <div className="inline-notice" role="status"><AlertTriangle size={17} /> {feedback}</div>}
      {loading ? (
        <div className="empty-state"><LoaderCircle className="spin" size={30} /><strong>Carregando popups…</strong></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><span className="placeholder-icon"><Search size={25} /></span><strong>Nenhum popup encontrado</strong><p>Publique um novo aviso ou altere os filtros da pesquisa.</p></div>
      ) : (
        <div className="popup-list">
          {filtered.map((item) => (
            <article className={`popup-card-web criticality-${criticalityTheme(item.criticality)}`} key={item.id}>
              <div className="popup-card-top">
                <div><span className="popup-type">{criticalityLabel(item.criticality)} · {priorityLabel(item.priority)}</span><h2>{item.title}</h2></div>
                <span className={`state-badge ${item.active ? "state-active" : "state-inactive"}`}>{item.active ? "Ativo" : "Inativo"}</span>
              </div>
              <p className="popup-message">{item.message || "Sem mensagem informada."}</p>
              <div className="popup-meta">
                {item.expirationDate && <span><CalendarClock size={14} /> Expira em {formatDate(item.expirationDate)}</span>}
                {item.imageUrl && <span><Paperclip size={14} /> Possui anexo</span>}
                {item.link && <a href={item.link} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir link</a>}
              </div>
              <div className="popup-card-actions">
                <button type="button" className="secondary-button" disabled={actionId === item.id} onClick={() => void toggle(item)}>{item.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{item.active ? "Desativar" : "Ativar"}</button>
                <button type="button" className="danger-button-web" disabled={actionId === item.id} onClick={() => void remove(item)}><Trash2 size={16} /> Excluir</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizePopup(raw: RawPopup, index: number): PopupRecord {
  return {
    id: String(raw.id ?? raw._id ?? index),
    title: String(raw.title ?? raw.titulo ?? "Sem título"),
    message: String(raw.message ?? raw.mensagem ?? ""),
    active: Boolean(raw.active ?? raw.ativo ?? true),
    criticality: String(raw.criticality ?? raw.criticidade ?? "informative"),
    priority: String(raw.priority ?? raw.prioridade ?? "normal"),
    link: optionalText(raw.link),
    imageUrl: optionalText(raw.imageUrl ?? raw.imagem ?? raw.imageData),
    publishedDate: optionalText(raw.publishedDate ?? raw.dataPublicacao),
    expirationDate: optionalText(raw.expirationDate ?? raw.dataExpiracao),
  };
}

function optionalText(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function errorMessage(payload: unknown, fallback: string) { return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback; }
function criticalityTheme(value: string) { const normalized = value.toLowerCase(); return normalized.includes("critic") ? "critical" : normalized.includes("high") || normalized.includes("attention") ? "attention" : "normal"; }
function criticalityLabel(value: string) { const theme = criticalityTheme(value); return theme === "critical" ? "Crítico" : theme === "attention" ? "Atenção" : "Informativo"; }
function priorityLabel(value: string) { const normalized = value.toLowerCase(); if (normalized.includes("urgent") || normalized.includes("immediate")) return "Urgente"; if (normalized.includes("high")) return "Alta"; if (normalized.includes("low")) return "Baixa"; return "Normal"; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }
