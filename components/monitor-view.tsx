"use client";

import { Activity, Clock3, Globe2, Laptop2, LoaderCircle, Monitor, RefreshCw, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Visitor = { name: string; department: string; page: string; time: string; browser: string; ip: string; machine: string; lastActivity: string };
type Presence = { onlineNow: number; today: number; total: number; lastConnection: string; visitors: Visitor[] };
const emptyPresence: Presence = { onlineNow: 0, today: 0, total: 0, lastConnection: "—", visitors: [] };

export function MonitorView() {
  const [presence, setPresence] = useState<Presence>(emptyPresence);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/visitas", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível consultar os acessos."));
      const visitors = Array.isArray(payload?.visitantes) ? payload.visitantes.map(normalizeVisitor) : [];
      setPresence({ onlineNow: number(payload?.onlineAgora), today: number(payload?.acessosHoje), total: number(payload?.totalVisitantes), lastConnection: String(payload?.ultimaConexao ?? "—"), visitors });
      setUpdatedAt(new Date());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha ao consultar os acessos."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return presence.visitors.filter((visitor) => !needle || Object.values(visitor).join(" ").toLocaleLowerCase("pt-BR").includes(needle));
  }, [presence.visitors, query]);
  const identifiedMachines = presence.visitors.filter((visitor) => visitor.machine !== "Não informado").length;

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Acessando agora</h1><p>Visão em tempo real dos acessos à Intranet, atualizada a cada 30 segundos.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar agora</button></div>
      <div className="monitor-stats"><MonitorStat icon={<Activity size={20} />} value={presence.onlineNow} label="Online agora" tone="green" /><MonitorStat icon={<Clock3 size={20} />} value={presence.today} label="Acessos hoje" tone="blue" /><MonitorStat icon={<Users size={20} />} value={presence.total} label="Total de visitantes" tone="violet" /><div className="last-update"><span className="live-dot" /><p><strong>Monitoramento ativo</strong><small>{updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Aguardando atualização"}</small></p></div></div>
      <div className="monitor-toolbar"><label className="search-control"><div><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, setor, máquina ou IP" /></div></label><div className="monitor-results"><span>{identifiedMachines} máquinas identificadas</span><span>{filtered.length} {filtered.length === 1 ? "acesso exibido" : "acessos exibidos"}</span></div></div>
      {error && <div className="inline-notice inline-error"><Activity size={17} /> {error}</div>}
      {loading ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><strong>Consultando acessos…</strong></div> : filtered.length === 0 ? <div className="empty-state"><Users size={29} /><strong>Nenhum acesso encontrado</strong><p>Não há visitantes correspondentes à pesquisa.</p></div> : <div className="visitor-table-wrap"><table className="visitor-table"><thead><tr><th>Visitante</th><th>Página atual</th><th>Dispositivo</th><th>Navegador</th><th>Tempo</th></tr></thead><tbody>{filtered.map((visitor, index) => <tr key={`${visitor.ip}-${visitor.name}-${index}`}><td><div className="visitor-person"><span className="online-indicator" /><p><strong>{visitor.name}</strong><small>{visitor.department}</small></p></div></td><td><div className="visitor-page"><Globe2 size={15} /><span>{visitor.page}</span></div></td><td><div className="visitor-device"><Laptop2 size={15} /><p><strong>{visitor.machine}</strong><small>{visitor.ip}</small></p></div></td><td>{visitor.browser}</td><td><span className="time-badge">{visitor.time}</span></td></tr>)}</tbody></table></div>}
    </div>
  );
}

function MonitorStat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) { return <div className={`monitor-stat tone-${tone}`}><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>; }
function normalizeVisitor(raw: Record<string, unknown>): Visitor { return { name: value(raw.nome, "Visitante"), department: value(raw.departamento, "Não informado"), page: value(raw.pagina, "/"), time: value(raw.tempo, "—"), browser: value(raw.navegador, "Não informado"), ip: value(raw.ip, "Não informado"), machine: value(raw.maquina, "Não informado"), lastActivity: value(raw.ultimaAtividade, "") }; }
function value(input: unknown, fallback: string) { return typeof input === "string" && input.trim() && input.toLowerCase() !== "null" ? input.trim() : fallback; }
function number(input: unknown) { const parsed = Number(input); return Number.isFinite(parsed) ? parsed : 0; }
function apiError(payload: unknown, fallback: string) { return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback; }
