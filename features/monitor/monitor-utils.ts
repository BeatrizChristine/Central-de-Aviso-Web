import type { ActivitySample, Visitor } from "./types";
export { isPrivateIpv4 } from "@/lib/network.mjs";

export const MAX_ACTIVITY_SAMPLES = 30;

const activityStorageKey = "central-avisos:online-history";
const hostnameStorageKey = "central-avisos:hostname-cache";
const hostnameCacheTtlMs = 12 * 60 * 60 * 1000;

export function normalizeVisitor(raw: Record<string, unknown>): Visitor {
  return {
    name: textValue(raw.nome, "Visitante"),
    department: textValue(raw.departamento, "Não informado"),
    page: textValue(raw.pagina, "/"),
    time: textValue(raw.tempo, "—"),
    browser: textValue(raw.navegador, "Não informado"),
    ip: textValue(raw.ip, "Não informado"),
    machine: textValue(raw.maquina, "Não informado"),
    lastActivity: textValue(raw.ultimaAtividade, "—"),
  };
}

export function readStoredSamples(): ActivitySample[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(activityStorageKey) || "[]") as unknown;
    if (!Array.isArray(stored)) return [];
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    return stored
      .filter(isActivitySample)
      .filter((sample) => sample.timestamp >= cutoff)
      .slice(-MAX_ACTIVITY_SAMPLES);
  } catch {
    return [];
  }
}

export function storeSample(current: ActivitySample[], sample: ActivitySample) {
  const next = current.at(-1) && sample.timestamp - current.at(-1)!.timestamp < 1_000
    ? [...current.slice(0, -1), sample]
    : [...current, sample];
  const limited = next.slice(-MAX_ACTIVITY_SAMPLES);
  window.localStorage.setItem(activityStorageKey, JSON.stringify(limited));
  return limited;
}

export function readStoredHostnames(): Record<string, string> {
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

export function storeHostnames(hostnames: Record<string, string>) {
  window.localStorage.setItem(hostnameStorageKey, JSON.stringify({
    savedAt: Date.now(),
    hostnames,
  }));
}

export function formatLastActivity(input: string) {
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

export function formatConnectedTime(input: string) {
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

export function numberValue(input: unknown) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isActivitySample(value: unknown): value is ActivitySample {
  if (!value || typeof value !== "object") return false;
  const sample = value as Record<string, unknown>;
  return Number.isFinite(sample.timestamp) && Number.isFinite(sample.online);
}

function textValue(input: unknown, fallback: string) {
  return typeof input === "string" && input.trim() && input.toLowerCase() !== "null"
    ? input.trim()
    : fallback;
}
