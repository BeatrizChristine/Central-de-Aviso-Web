"use client";

import { History, LoaderCircle, RefreshCw, Search, ToggleRight, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { IntranetNoticeCard } from "@/components/intranet-notice-card";
import { apiError, arrayPayload, isJsonRecord, readJson } from "@/lib/client/api";
import type { AuthUser } from "@/types/auth";
import { normalizeNotice, type NoticeRecord } from "@/types/notice";

export function HistoryView({ currentUser }: { currentUser: AuthUser }) {
  const [items, setItems] = useState<NoticeRecord[]>([]);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(""); setFeedback("");
    try {
      const response = await fetch("/api/avisos", { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível carregar o histórico."));
      setItems(arrayPayload(payload, ["avisos", "popups"])
        .filter(isJsonRecord)
        .map(normalizeNotice)
        .filter((item) => !item.active));
    } catch (reason) { setItems([]); setError(reason instanceof Error ? reason.message : "Falha ao carregar o histórico."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => !needle || noticeSearchText(item).includes(needle))
      .sort((a, b) => (historyDate(a) - historyDate(b)) * (order === "recent" ? -1 : 1));
  }, [items, order, query]);

  async function activate(item: NoticeRecord) {
    setActionId(item.id);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`/api/avisos?id=${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível reativar o popup."));
      setItems((current) => current.filter((record) => record.id !== item.id));
      setFeedback("Popup reativado e enviado para a aba Popups.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha ao reativar o popup.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">COMUNICAÇÃO</span><h1>Histórico de popups</h1><p>{currentUser.role === "gecom" ? "Consulte e reative os popups publicados pela GECOM." : "Consulte e reative todos os popups que foram desativados."}</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button></div>
      <div className="filter-card history-filters">
        <label className="search-control"><span>BUSCAR</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título ou conteúdo" /></div></label>
        <FilterSelect label="ORDENAR" value={order} onValueChange={setOrder} options={[{ value: "recent", label: "Mais recentes" }, { value: "oldest", label: "Mais antigos" }]} />
        <div className="result-count"><strong>{filtered.length}</strong><span>{filtered.length === 1 ? "popup desativado" : "popups desativados"}</span></div>
      </div>
      {feedback && <div className="inline-notice" role="status"><ToggleRight size={17} /> {feedback}</div>}
      {error && <div className="inline-notice inline-error"><XCircle size={17} /> {error}</div>}
      {loading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><strong>Carregando histórico…</strong></div> : filtered.length === 0 ? <div className="empty-state"><History size={29} /><strong>Nenhum popup desativado</strong><p>Os popups desativados aparecerão aqui.</p></div> : <div className="history-list">{filtered.map((item) => <IntranetNoticeCard key={item.id} notice={item} actions={<button type="button" className="secondary-button" disabled={actionId === item.id} onClick={() => void activate(item)}><ToggleRight size={17} /> Ativar novamente</button>} />)}</div>}
    </div>
  );
}

function dateValue(value?: string) { if (!value) return 0; const parsed = new Date(value).getTime(); return Number.isNaN(parsed) ? 0 : parsed; }
function historyDate(item: NoticeRecord) { return dateValue(item.audit?.deactivatedAt || item.publishedDate); }
function noticeSearchText(item: NoticeRecord) {
  const audit = item.audit;
  return `${item.title} ${item.message} ${audit?.createdBy?.name || ""} ${audit?.createdBy?.username || ""} ${audit?.deactivatedBy?.name || ""} ${audit?.deactivatedBy?.username || ""}`
    .toLocaleLowerCase("pt-BR");
}
