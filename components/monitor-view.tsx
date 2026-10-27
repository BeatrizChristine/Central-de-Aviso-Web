"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Laptop2,
  LoaderCircle,
  Minus,
  Monitor,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilterSelect } from "@/components/filter-select";

type Visitor = {
  name: string;
  department: string;
  page: string;
  time: string;
  browser: string;
  ip: string;
  machine: string;
  lastActivity: string;
};

type Presence = {
  onlineNow: number;
  today: number;
  total: number;
  lastConnection: string;
  visitors: Visitor[];
};

type ActivitySample = { timestamp: number; online: number };

const emptyPresence: Presence = {
  onlineNow: 0,
  today: 0,
  total: 0,
  lastConnection: "—",
  visitors: [],
};

const activityStorageKey = "central-avisos:online-history";
const hostnameStorageKey = "central-avisos:hostname-cache";
const maxActivitySamples = 30;
const hostnameCacheTtlMs = 12 * 60 * 60 * 1000;
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
            if (!response.ok) continue;
            const payload = await response.json() as { hostnames?: Record<string, string> };
            const hostnames = payload.hostnames || {};
            if (Object.keys(hostnames).length === 0) continue;

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
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível consultar os acessos."));

      const visitors = Array.isArray(payload?.visitantes)
        ? payload.visitantes.map(normalizeVisitor).map((visitor: Visitor) => hostnameCache.current[visitor.ip]
          ? { ...visitor, machine: hostnameCache.current[visitor.ip] }
          : visitor)
        : [];
      const onlineNow = number(payload?.onlineAgora);
      const now = Date.now();

      setPresence({
        onlineNow,
        today: number(payload?.acessosHoje),
        total: number(payload?.totalVisitantes),
        lastConnection: String(payload?.ultimaConexao ?? "—"),
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
    void load();
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => {
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

  const identifiedMachines = presence.visitors.filter(
    (visitor) => visitor.machine !== "Não informado",
  ).length;
  const pageSize = displayLimit === "all" ? Math.max(1, filtered.length) : Number(displayLimit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstResult = (currentPage - 1) * pageSize;
  const displayedVisitors = filtered.slice(firstResult, firstResult + pageSize);
  const resultEnd = Math.min(firstResult + displayedVisitors.length, filtered.length);

  useEffect(() => { setPage(1); }, [displayLimit, query]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por máquina, IP ou navegador" />
          </div>
        </label>
        <div className="monitor-list-options">
          <FilterSelect
            compact
            label="Mostrar"
            value={displayLimit}
            options={[{ value: "10", label: "10" }, { value: "50", label: "50" }, { value: "100", label: "100" }, { value: "all", label: "Tudo" }]}
            onValueChange={setDisplayLimit}
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

function ActivityChart({ samples }: { samples: ActivitySample[] }) {
  const recent = samples.slice(-maxActivitySamples);
  const last = recent.at(-1);
  const previous = recent.at(-2);
  const difference = last && previous ? last.online - previous.online : 0;

  if (recent.length < 2) {
    return (
      <section className="activity-chart-card">
        <ChartHeading difference={difference} />
        <div className="chart-awaiting"><Activity size={28} /><strong>Coletando atividade</strong><span>A próxima leitura formará a linha do gráfico.</span></div>
      </section>
    );
  }

  const width = 900;
  const height = 230;
  const left = 42;
  const right = 20;
  const top = 16;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(5, ...recent.map((sample) => sample.online));
  const yMaximum = Math.ceil((maximum + 2) / 5) * 5;
  const coordinates = recent.map((sample, index) => ({
    ...sample,
    x: left + (index / (recent.length - 1)) * chartWidth,
    y: top + (1 - sample.online / yMaximum) * chartHeight,
  }));
  const points = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `M ${left} ${top + chartHeight} L ${coordinates.map((point) => `${point.x} ${point.y}`).join(" L ")} L ${left + chartWidth} ${top + chartHeight} Z`;
  const labels = [coordinates[0], coordinates[Math.floor((coordinates.length - 1) / 2)], coordinates.at(-1)!];

  return (
    <section className="activity-chart-card">
      <ChartHeading difference={difference} />
      <div className="activity-chart-wrap">
        <svg className="activity-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de dispositivos online ao longo do tempo">
          <defs>
            <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F897A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F897A" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((line) => {
            const y = top + (line / 4) * chartHeight;
            const value = Math.round(yMaximum * (1 - line / 4));
            return <g key={line}><line x1={left} x2={left + chartWidth} y1={y} y2={y} className="chart-grid-line" /><text x={left - 10} y={y + 3} className="chart-axis-value">{value}</text></g>;
          })}
          <path d={area} fill="url(#activity-area)" />
          <polyline points={points} className="chart-line" />
          {coordinates.map((point) => <circle key={point.timestamp} cx={point.x} cy={point.y} r="4" className="chart-point"><title>{formatChartTime(point.timestamp)} — {point.online} online</title></circle>)}
          {labels.map((point, index) => <text key={`${point.timestamp}-${index}`} x={point.x} y={height - 8} className="chart-time-label" textAnchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}>{formatChartTime(point.timestamp)}</text>)}
        </svg>
      </div>
    </section>
  );
}

function ChartHeading({ difference }: { difference: number }) {
  const movement = difference > 0
    ? { icon: <ArrowUpRight size={15} />, text: `+${difference} desde a última leitura`, className: "movement-up" }
    : difference < 0
      ? { icon: <ArrowDownRight size={15} />, text: `${difference} desde a última leitura`, className: "movement-down" }
      : { icon: <Minus size={15} />, text: "Sem alteração na última leitura", className: "movement-stable" };

  return (
    <div className="activity-chart-heading">
      <div><span className="section-icon"><Activity size={18} /></span><p><strong>Atividade em tempo real</strong><small>Dispositivos online por leitura</small></p></div>
      <span className={`chart-movement ${movement.className}`}>{movement.icon}{movement.text}</span>
    </div>
  );
}

function MonitorStat({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: string }) {
  return <div className={`monitor-stat tone-${tone}`}><span>{icon}</span><p><strong>{value}</strong><small>{label}</small></p></div>;
}

function normalizeVisitor(raw: Record<string, unknown>): Visitor {
  return {
    name: value(raw.nome, "Visitante"),
    department: value(raw.departamento, "Não informado"),
    page: value(raw.pagina, "/"),
    time: value(raw.tempo, "—"),
    browser: value(raw.navegador, "Não informado"),
    ip: value(raw.ip, "Não informado"),
    machine: value(raw.maquina, "Não informado"),
    lastActivity: value(raw.ultimaAtividade, "—"),
  };
}

function readStoredSamples(): ActivitySample[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(activityStorageKey) || "[]");
    if (!Array.isArray(stored)) return [];
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    return stored
      .filter((sample) => Number.isFinite(sample?.timestamp) && Number.isFinite(sample?.online) && sample.timestamp >= cutoff)
      .slice(-maxActivitySamples);
  } catch {
    return [];
  }
}

function storeSample(current: ActivitySample[], sample: ActivitySample) {
  const next = current.at(-1) && sample.timestamp - current.at(-1)!.timestamp < 1_000
    ? [...current.slice(0, -1), sample]
    : [...current, sample];
  const limited = next.slice(-maxActivitySamples);
  window.localStorage.setItem(activityStorageKey, JSON.stringify(limited));
  return limited;
}

function readStoredHostnames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = JSON.parse(window.localStorage.getItem(hostnameStorageKey) || "null") as {
      savedAt?: number;
      hostnames?: Record<string, string>;
    } | null;
    if (!stored?.savedAt || Date.now() - stored.savedAt > hostnameCacheTtlMs || !stored.hostnames) {
      return {};
    }
    return stored.hostnames;
  } catch {
    return {};
  }
}

function storeHostnames(hostnames: Record<string, string>) {
  window.localStorage.setItem(hostnameStorageKey, JSON.stringify({
    savedAt: Date.now(),
    hostnames,
  }));
}

function formatLastActivity(input: string) {
  if (!input || input === "—") return "—";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

function formatConnectedTime(input: string) {
  const match = input.match(/(\d+)\s*min/i);
  if (!match) return input;
  const totalMinutes = Number(match[1]);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days} d ${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function formatChartTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function value(input: unknown, fallback: string) {
  return typeof input === "string" && input.trim() && input.toLowerCase() !== "null" ? input.trim() : fallback;
}

function number(input: unknown) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function apiError(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}

function isPrivateIpv4(value: string) {
  const parts = value.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [first, second] = parts.map(Number);
  return first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
}
