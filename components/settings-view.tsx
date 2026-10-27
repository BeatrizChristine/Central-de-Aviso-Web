"use client";

import { Activity, CheckCircle2, LoaderCircle, RefreshCw, Server, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiError, arrayPayload, isJsonRecord, readJson } from "@/lib/client/api";

type Endpoint = { key: string; path: string; online: boolean; status: number | null; latencyMs: number };
type Diagnostics = { configured: boolean; server: string | null; checkedAt?: string; endpoints: Endpoint[] };
type TestFeedback = { tone: "success" | "warning"; message: string };

export function SettingsView() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCheck, setManualCheck] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<TestFeedback | null>(null);

  const check = useCallback(async (manual = false) => {
    setLoading(true);
    setError("");
    if (manual) {
      setManualCheck(true);
      setFeedback(null);
    }
    try {
      const response = await fetch(`/api/diagnostico?check=${Date.now()}`, { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível verificar a configuração."));
      const diagnostics = parseDiagnostics(payload);
      if (!diagnostics) throw new Error("O servidor retornou um diagnóstico inválido.");
      setData(diagnostics);
      if (manual) {
        const endpoints = diagnostics.endpoints;
        const onlineCount = endpoints.filter((endpoint: Endpoint) => endpoint.online).length;
        const allResponded = endpoints.length > 0 && onlineCount === endpoints.length;
        const checkedTime = diagnostics.checkedAt ? new Date(diagnostics.checkedAt).toLocaleTimeString("pt-BR") : new Date().toLocaleTimeString("pt-BR");
        setFeedback({
          tone: allResponded ? "success" : "warning",
          message: allResponded
            ? `Teste concluído às ${checkedTime}. Todos os ${endpoints.length} serviços responderam.`
            : `Teste concluído às ${checkedTime}. ${onlineCount} de ${endpoints.length} serviços responderam.`,
        });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Falha na verificação.");
    } finally {
      setLoading(false);
      setManualCheck(false);
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void check(), 0);
    return () => window.clearTimeout(initialCheck);
  }, [check]);
  const allOnline = Boolean(data?.endpoints.length && data.endpoints.every((endpoint) => endpoint.online));

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Configurações</h1><p>Diagnóstico da conexão entre a Central de Avisos e a Intranet.</p></div><button type="button" className="secondary-button" onClick={() => void check(true)} disabled={loading} aria-busy={manualCheck}>{manualCheck ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{manualCheck ? "Testando…" : "Testar conexão"}</button></div>
      {manualCheck && <div className="inline-notice connection-test-running" role="status" aria-live="polite"><LoaderCircle className="spin" size={17} /> Testando a conexão com os serviços da Intranet…</div>}
      {feedback && !manualCheck && <div className={`inline-notice connection-test-${feedback.tone}`} role="status" aria-live="polite">{feedback.tone === "success" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{feedback.message}</div>}
      {error && <div className="inline-notice inline-error"><XCircle size={17} /> {error}</div>}
      <div className="settings-grid">
        <section className="settings-card connection-card">
          <div className="settings-card-heading"><span className="section-icon"><Server size={19} /></span><div><strong>Servidor da Intranet</strong><small>Configuração aplicada no ambiente web</small></div></div>
          {loading && !data ? <div className="settings-loading"><LoaderCircle className="spin" size={25} /> Verificando…</div> : <><div className="server-address"><span>ENDEREÇO CONFIGURADO</span><strong>{data?.server || "Não configurado"}</strong></div><div className={`connection-summary ${allOnline ? "summary-online" : "summary-offline"}`}>{allOnline ? <CheckCircle2 size={21} /> : <XCircle size={21} />}<div><strong>{allOnline ? "Todos os serviços estão online" : "Há serviços indisponíveis"}</strong><small>{data?.checkedAt ? `Última verificação: ${new Date(data.checkedAt).toLocaleString("pt-BR")}` : "Aguardando verificação"}</small></div></div></>}
        </section>
      </div>
      <section className="settings-card endpoint-card">
        <div className="settings-card-heading"><span className="section-icon"><Activity size={19} /></span><div><strong>Serviços integrados</strong><small>Resultado individual dos endpoints utilizados pela aplicação</small></div></div>
        <div className="endpoint-list">{data?.endpoints.map((endpoint) => <div key={endpoint.key}><span className={`endpoint-icon ${endpoint.online ? "endpoint-online" : "endpoint-offline"}`}>{endpoint.online ? <CheckCircle2 size={18} /> : <XCircle size={18} />}</span><div><strong>{endpointName(endpoint.key)}</strong><small>{endpoint.path}</small></div><span className="endpoint-latency">{endpoint.status ? `HTTP ${endpoint.status}` : "Sem resposta"}<small>{endpoint.latencyMs} ms</small></span></div>)}{loading && !data && <div className="settings-loading"><LoaderCircle className="spin" size={25} /> Consultando serviços…</div>}</div>
      </section>
    </div>
  );
}

function endpointName(key: string) { if (key === "avisos") return "Avisos e popups"; if (key === "mensagens") return "Mensagem do dia"; if (key === "visitas") return "Monitor de acessos"; return key; }

function parseDiagnostics(payload: unknown): Diagnostics | null {
  if (!isJsonRecord(payload)) return null;
  const endpoints = arrayPayload(payload, ["endpoints"])
    .filter(isJsonRecord)
    .map((endpoint): Endpoint => ({
      key: String(endpoint.key ?? ""),
      path: String(endpoint.path ?? ""),
      online: Boolean(endpoint.online),
      status: typeof endpoint.status === "number" ? endpoint.status : null,
      latencyMs: typeof endpoint.latencyMs === "number" ? endpoint.latencyMs : 0,
    }));
  return {
    configured: Boolean(payload.configured),
    server: typeof payload.server === "string" ? payload.server : null,
    checkedAt: typeof payload.checkedAt === "string" ? payload.checkedAt : undefined,
    endpoints,
  };
}
