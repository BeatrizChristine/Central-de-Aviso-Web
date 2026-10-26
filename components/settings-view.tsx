"use client";

import { Activity, CheckCircle2, KeyRound, LoaderCircle, RefreshCw, Server, Settings2, ShieldCheck, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Endpoint = { key: string; path: string; online: boolean; status: number | null; latencyMs: number };
type Diagnostics = { configured: boolean; server: string | null; tokenConfigured: boolean; checkedAt?: string; endpoints: Endpoint[] };

export function SettingsView() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const check = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/diagnostico", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Não foi possível verificar a configuração.");
      setData(payload);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Falha na verificação."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void check(); }, [check]);
  const allOnline = Boolean(data?.endpoints.length && data.endpoints.every((endpoint) => endpoint.online));

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">ADMINISTRAÇÃO</span><h1>Configurações</h1><p>Diagnóstico da conexão entre a Central de Avisos e a Intranet.</p></div><button type="button" className="secondary-button" onClick={() => void check()} disabled={loading}><RefreshCw size={16} /> Testar conexão</button></div>
      {error && <div className="inline-notice inline-error"><XCircle size={17} /> {error}</div>}
      <div className="settings-grid">
        <section className="settings-card connection-card">
          <div className="settings-card-heading"><span className="section-icon"><Server size={19} /></span><div><strong>Servidor da Intranet</strong><small>Configuração aplicada no ambiente web</small></div></div>
          {loading && !data ? <div className="settings-loading"><LoaderCircle className="spin" size={25} /> Verificando…</div> : <><div className="server-address"><span>ENDEREÇO CONFIGURADO</span><strong>{data?.server || "Não configurado"}</strong></div><div className={`connection-summary ${allOnline ? "summary-online" : "summary-offline"}`}>{allOnline ? <CheckCircle2 size={21} /> : <XCircle size={21} />}<div><strong>{allOnline ? "Todos os serviços estão online" : "Há serviços indisponíveis"}</strong><small>{data?.checkedAt ? `Última verificação: ${new Date(data.checkedAt).toLocaleString("pt-BR")}` : "Aguardando verificação"}</small></div></div></>}
        </section>
        <section className="settings-card">
          <div className="settings-card-heading"><span className="section-icon"><ShieldCheck size={19} /></span><div><strong>Segurança</strong><small>Credenciais protegidas no servidor</small></div></div>
          <div className="security-row"><KeyRound size={18} /><div><strong>Token da API</strong><small>{data?.tokenConfigured ? "Configurado no ambiente do servidor" : "Não configurado — o servidor aceita acesso pela rede interna"}</small></div><span className={`state-badge ${data?.tokenConfigured ? "state-active" : "state-inactive"}`}>{data?.tokenConfigured ? "Ativo" : "Opcional"}</span></div>
          <p className="settings-help">O endereço e o token são definidos em <code>.env.local</code> durante o desenvolvimento e nas variáveis protegidas do servidor na publicação. Eles não são expostos ao navegador.</p>
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
