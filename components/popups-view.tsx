"use client";

import {
  AlertTriangle,
  FilePlus2,
  LoaderCircle,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IntranetNoticeCard } from "@/components/intranet-notice-card";
import { StatusFilter } from "@/components/status-filter";
import { apiError, arrayPayload, isJsonRecord, readJson } from "@/lib/client/api";
import { normalizeNotice, type NoticeRecord } from "@/types/notice";

export function PopupsView({ onCreateNotice }: { onCreateNotice: () => void }) {
  const [items, setItems] = useState<NoticeRecord[]>([]);
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
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível carregar os popups."));
      setItems(arrayPayload(payload, ["avisos", "popups"])
        .filter(isJsonRecord)
        .map(normalizeNotice));
    } catch (error) {
      setItems([]);
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar os popups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const matchesText = !normalizedQuery || `${item.title} ${item.message}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesStatus = status === "all" || (status === "active" ? item.active : !item.active);
      return matchesText && matchesStatus;
    });
  }, [items, query, status]);

  async function toggle(item: NoticeRecord) {
    setActionId(item.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/avisos?id=${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível alterar o popup."));
      setItems((current) => current.map((record) => record.id === item.id ? { ...record, active: !record.active } : record));
      setFeedback(item.active ? "Popup desativado." : "Popup ativado.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao alterar o popup.");
    } finally {
      setActionId(null);
    }
  }

  async function remove(item: NoticeRecord) {
    if (!window.confirm(`Excluir definitivamente o popup “${item.title}”?`)) return;
    setActionId(item.id);
    setFeedback("");
    try {
      const response = await fetch(`/api/avisos?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível excluir o popup."));
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
        <StatusFilter value={status} onChange={setStatus} />
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
            <IntranetNoticeCard key={item.id} notice={item} actions={
              <>
                <button type="button" className="secondary-button" disabled={actionId === item.id} onClick={() => void toggle(item)}>{item.active ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}{item.active ? "Desativar" : "Ativar"}</button>
                <button type="button" className="danger-button-web" disabled={actionId === item.id} onClick={() => void remove(item)}><Trash2 size={16} /> Excluir</button>
              </>
            } />
          ))}
        </div>
      )}
    </div>
  );
}
