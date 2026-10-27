"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Laptop2,
  LoaderCircle,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { ActivityChart } from "@/features/monitor/activity-chart";
import {
  formatConnectedTime,
  formatLastActivity,
  isPrivateIpv4,
  normalizeVisitor,
  numberValue,
  readStoredHostnames,
  readStoredSamples,
  storeHostnames,
  storeSample,
} from "@/features/monitor/monitor-utils";
import type { ActivitySample, Visitor } from "@/features/monitor/types";
import { apiError, isJsonRecord, readJson } from "@/lib/client/api";

type Presence = {
  onlineNow: number;
  today: number;
  total: number;
  lastConnection: string;
  visitors: Visitor[];
};

const emptyPresence: Presence = {
  onlineNow: 0,
  today: 0,
  total: 0,
  lastConnection: "—",
  visitors: [],
};

const hostnameRetryMs = 5 * 60 * 1000;
const hostnameBatchSize = 16;
const hostnameBatchConcurrency = 2;

export function MonitorView() {
  const [presence, setPresence] = useState<Presence>(emptyPresence);
  const [samples, setSamples] = useState<ActivitySample[]>(readStoredSamples);
  const [query, setQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState("10");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resolvingMachines, setResolvingMachines] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const hostnameCache = useRef<Record<string, string>>(readStoredHostnames());
  const hostnameAttempts = useRef(new Map<string, number>());
  const pendingIps = useRef(new Set<string>());
  const tableScroll = useRef<HTMLDivElement>(null);

  const resolveMachines = useCallback(async (visitors: Visitor[]) => {
    const now = Date.now();
    const ips = [...new Set(visitors
      .filter((visitor) => visitor.machine === "Não informado"
        && isPrivateIpv4(visitor.ip)
        && !pendingIps.current.has(visitor.ip)
        && now - (hostnameAttempts.current.get(visitor.ip) || 0) >= hostnameRetryMs)
      .map((visitor) => visitor.ip))];
    if (ips.length === 0) return;

    ips.forEach((ip) => {
      pendingIps.current.add(ip);
      hostnameAttempts.current.set(ip, now);
    });
    setResolvingMachines(true);
    try {
      const batches = Array.from(
        { length: Math.ceil(ips.length / hostnameBatchSize) },
        (_, index) => ips.slice(index * hostnameBatchSize, (index + 1) * hostnameBatchSize),
      );
      let nextBatch = 0;

      async function resolveNextBatch() {
        while (nextBatch < batches.length) {
          const batch = batches[nextBatch++];
          try {
            const response = await fetch("/api/visitas", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ips: batch }),
            });
            const payload = await readJson(response);
            if (!response.ok || !isJsonRecord(payload)) continue;
            const hostnames = payload.hostnames;
            if (!isHostnameMap(hostnames) || Object.keys(hostnames).length === 0) continue;

            hostnameCache.current = { ...hostnameCache.current, ...hostnames };
            storeHostnames(hostnameCache.current);
            setPresence((current) => ({
              ...current,
              visitors: current.visitors.map((visitor) => hostnames[visitor.ip]
                ? { ...visitor, machine: hostnames[visitor.ip] }
                : visitor),
            }));
          } finally {
            batch.forEach((ip) => pendingIps.current.delete(ip));
          }
        }
      }

      await Promise.all(Array.from(
        { length: Math.min(hostnameBatchConcurrency, batches.length) },
        () => resolveNextBatch(),
      ));
    } finally {
      ips.forEach((ip) => pendingIps.current.delete(ip));
      setResolvingMachines(false);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/visitas", { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível consultar os acessos."));
      if (!isJsonRecord(payload)) throw new Error("O servidor retornou dados de acesso inválidos.");

      const visitors = Array.isArray(payload.visitantes)
        ? payload.visitantes.filter(isJsonRecord).map(normalizeVisitor).map((visitor) => hostnameCache.current[visitor.ip]
          ? { ...visitor, machine: hostnameCache.current[visitor.ip] }
          : visitor)
        : [];
      const onlineNow = numberValue(payload.onlineAgora);
      const now = Date.now();

      setPresence({
        onlineNow,
        today: numberValue(payload.acessosHoje),
        total: numberValue(payload.totalVisitantes),
        lastConnection: String(payload.ultimaConexao ?? "—"),
        visitors,
      });
      setSamples((current) => storeSample(current, { timestamp: now, online: onlineNow }));
      setUpdatedAt(new Date(now));
      void resolveMachines(visitors);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Falha ao consultar os acessos.";
      setError(message === "Failed to fetch"
        ? "O servidor local foi desconectado. Reinicie a Central e atualize esta página."
        : message);
    } finally {
      setLoading(false);
    }
  }, [resolveMachines]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("pt-BR");
    return presence.visitors.filter((visitor) =>
      !needle || `${visitor.machine} ${visitor.ip} ${visitor.browser} ${visitor.lastActivity}`
        .toLocaleLowerCase("pt-BR")
        .includes(needle),
    );
  }, [presence.visitors, query]);

  const identifiedMachines = presence.visitors.filter((visitor) => visitor.machine !== "Não informado").length;
  const pageSize = displayLimit === "all" ? Math.max(1, filtered.length) : Number(displayLimit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstResult = (currentPage - 1) * pageSize;
  const displayedVisitors = filtered.slice(firstResult, firstResult + pageSize);
  const resultEnd = Math.min(firstResult + displayedVisitors.length, filtered.length);

  function goToPage(nextPage: number) {
    setPage(Math.max(1, Math.min(totalPages, nextPage)));
    tableScroll.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="content-container management-page">
      <div className="management-heading">
        <div>
          <span className="eyebrow">ADMINISTRAÇÃO</span>
          <h1>Acessando agora</h1>
          <p>Visão em tempo real dos dispositivos conectados à Intranet, atualizada a cada 30 segundos.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Atualizar agora
        </button>
      </div>

      <div className="monitor-stats">
        <MonitorStat icon={<Activity size={20} />} value={presence.onlineNow} label="Dispositivos online" tone="green" />
        <MonitorStat icon={<Clock3 size={20} />} value={presence.today} label="Acessos hoje" tone="blue" />
        <MonitorStat icon={<Users size={20} />} value={presence.total} label="Acessos registrados" tone="violet" />
        <div className="last-update">
          <span className="live-dot" />
          <p>
            <strong>Monitoramento ativo</strong>
            <small>{updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString("pt-BR")}` : "Aguardando atualização"}</small>
          </p>
        </div>
      </div>

      <ActivityChart samples={samples} />

      <div className="monitor-toolbar">
        <label className="search-control">
          <div>
            <Search size={16} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por máquina, IP ou navegador" />
          </div>
        </label>
        <div className="monitor-list-options">
          <FilterSelect
            compact
            label="Mostrar"
            value={displayLimit}
            options={[{ value: "10", label: "10" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "all", label: "Tudo" }]}
            onValueChange={(value) => { setDisplayLimit(value); setPage(1); }}
          />
          <div className="monitor-results">
            <span>{resolvingMachines ? "Identificando máquinas…" : `${identifiedMachines} máquinas identificadas`}</span>
            <span>Exibindo {displayedVisitors.length} de {filtered.length}</span>
          </div>
        </div>
      </div>

      {error && <div className="inline-notice inline-error"><Activity size={17} /> {error}</div>}

      {loading ? (
        <div className="empty-state"><LoaderCircle className="spin" size={30} /><strong>Consultando acessos…</strong></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Users size={29} /><strong>Nenhum dispositivo encontrado</strong><p>Não há acessos correspondentes à pesquisa.</p></div>
      ) : (
        <div className="visitor-table-card">
          <div className="visitor-table-wrap" ref={tableScroll}>
            <table className="visitor-table">
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Endereço IP</th>
                  <th>Última atividade</th>
                  <th>Tempo conectado</th>
                  <th>Status</th>
                  <th>Navegador</th>
                </tr>
              </thead>
              <tbody>
                {displayedVisitors.map((visitor, index) => (
                  <tr key={`${visitor.ip}-${visitor.machine}-${index}`}>
                    <td>
                      <div className="visitor-device">
                        <span className="device-icon"><Laptop2 size={15} /></span>
                        <p><strong>{visitor.machine}</strong><small>Estação de trabalho</small></p>
                      </div>
                    </td>
                    <td><span className="ip-value">{visitor.ip}</span></td>
                    <td><span className="activity-value">{formatLastActivity(visitor.lastActivity)}</span></td>
                    <td><span className="time-badge">{formatConnectedTime(visitor.time)}</span></td>
                    <td><span className="online-badge"><i /> Ativo agora</span></td>
                    <td><span className="browser-value">{visitor.browser}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="daily-pagination visitor-pagination">
            <span>Exibindo {firstResult + 1}–{resultEnd} de {filtered.length}</span>
            <div>
              <button type="button" aria-label="Página anterior" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
              <strong>Página {currentPage} de {totalPages}</strong>
              <button type="button" aria-label="Próxima página" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonitorStat({ icon, value, label, tone }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: string;
}) {
  return <div className={`monitor-stat tone-${tone}`}><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>;
}

function isHostnameMap(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>)
    .every((hostname) => typeof hostname === "string");
}
