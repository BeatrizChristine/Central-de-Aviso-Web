"use client";

import { CheckCircle2, History, LoaderCircle, RefreshCw, Search, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusFilter } from "@/components/status-filter";
import { FilterSelect } from "@/components/filter-select";
import { IntranetNoticeCard } from "@/components/intranet-notice-card";

type HistoryItem = {
  id: string;
  title: string;
  message: string;
  active: boolean;
  criticality: string;
  priority: string;
  link?: string;
  imageUrl?: string;
  imageMimeType?: string;
  publishedDate?: string;
  expirationDate?: string;
  closable?: boolean;
};

export function HistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("all");
  const [order, setOrder] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/avisos", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível carregar o histórico."));
      const source = Array.isArray(payload) ? payload : Array.isArray(payload?.avisos) ? payload.avisos : Array.isArray(payload?.popups) ? payload.popups : [];
      setItems(source.map((raw: Record<string, unknown>, index: number) => ({
        id: String(raw.id ?? raw._id ?? index),
        title: String(raw.title ?? raw.titulo ?? "Sem título"),
        message: String(raw.message ?? raw.mensagem ?? ""),
        active: Boolean(raw.active ?? raw.ativo ?? true),
        criticality: String(raw.criticality ?? raw.criticidade ?? "informative"),
        priority: String(raw.priority ?? raw.prioridade ?? "normal"),
        link: text(raw.link),
        imageUrl: text(raw.imageUrl ?? raw.imagem ?? raw.imageData),
        imageMimeType: text(raw.imageMimeType ?? raw.mimeType),
        publishedDate: text(raw.publishedDate ?? raw.dataPublicacao ?? raw.createdAt),
        expirationDate: text(raw.expirationDate ?? raw.dataExpiracao),
        closable: Boolean(raw.closable ?? raw.podeFechar ?? true),
      })));
    } catch (reason) { setItems([]); setError(reason instanceof Error ? reason.message : "Falha ao carregar o histórico."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => (!needle || `${item.title} ${item.message}`.toLocaleLowerCase("pt-BR").includes(needle)) && (state === "all" || (state === "active" ? item.active : !item.active)))
      .sort((a, b) => (dateValue(a.publishedDate) - dateValue(b.publishedDate)) * (order === "recent" ? -1 : 1));
  }, [items, order, query, state]);

  const activeCount = items.filter((item) => item.active).length;

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">COMUNICAÇÃO</span><h1>Histórico de avisos</h1><p>Consulte as comunicações registradas no servidor da Intranet.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button></div>
      <div className="history-stats"><Stat icon={<History size={18} />} value={items.length} label="Total registrado" /><Stat icon={<CheckCircle2 size={18} />} value={activeCount} label="Avisos ativos" /><Stat icon={<XCircle size={18} />} value={items.length - activeCount} label="Avisos inativos" /></div>
      <div className="filter-card history-filters">
        <label className="search-control"><span>BUSCAR</span><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título ou conteúdo" /></div></label>
        <StatusFilter value={state} onChange={setState} />
        <FilterSelect label="ORDENAR" value={order} onValueChange={setOrder} options={[{ value: "recent", label: "Mais recentes" }, { value: "oldest", label: "Mais antigos" }]} />
      </div>
      {error && <div className="inline-notice inline-error"><XCircle size={17} /> {error}</div>}
      {loading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><strong>Carregando histórico…</strong></div> : filtered.length === 0 ? <div className="empty-state"><History size={29} /><strong>Nenhum aviso encontrado</strong><p>Altere os filtros ou publique um novo aviso.</p></div> : <div className="history-list">{filtered.map((item) => <IntranetNoticeCard key={item.id} notice={item} />)}</div>}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) { return <div><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>; }
function text(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function apiError(payload: unknown, fallback: string) { return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback; }
function dateValue(value?: string) { if (!value) return 0; const parsed = new Date(value).getTime(); return Number.isNaN(parsed) ? 0 : parsed; }
