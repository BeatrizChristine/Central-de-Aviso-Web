"use client";

import {
  Activity, AlertTriangle, BellRing, CalendarClock, ChevronRight, CircleAlert, CircleCheck, Eye,
  ExternalLink, FilePlus2, History, Info, LogOut, Menu, PanelsTopLeft,
  Send, Settings2, SunMedium, UploadCloud, Wifi, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DailyMessageView } from "@/components/daily-message-view";
import { HistoryView } from "@/components/history-view";
import { MonitorView } from "@/components/monitor-view";
import { PopupsView } from "@/components/popups-view";
import { SettingsView } from "@/components/settings-view";

const navigation = [
  { label: "Novo aviso", icon: FilePlus2, group: "Comunicação" },
  { label: "Popups", icon: PanelsTopLeft, group: "Comunicação" },
  { label: "Histórico", icon: History, group: "Comunicação" },
  { label: "Acessando agora", icon: Activity, group: "Administração" },
  { label: "Mensagem do dia", icon: SunMedium, group: "Administração" },
  { label: "Configurações", icon: Settings2, group: "Administração" },
];

type ApiState = "checking" | "online" | "unconfigured" | "offline";
type SubmitState = "idle" | "sending" | "success" | "error";

export default function Home() {
  const [active, setActive] = useState("Novo aviso");
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiState, setApiState] = useState<ApiState>("checking");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [criticality, setCriticality] = useState("informative");
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [closable, setClosable] = useState(true);

  useEffect(() => {
    fetch("/api/status")
      .then(async (response) => {
        const status = (await response.json()) as { configured?: boolean; online?: boolean };
        setApiState(!status.configured ? "unconfigured" : status.online ? "online" : "offline");
      })
      .catch(() => setApiState("offline"));
  }, []);

  const apiLabel = useMemo(() => {
    if (apiState === "checking") return "Verificando servidor";
    if (apiState === "online") return "Servidor conectado";
    if (apiState === "unconfigured") return "API não configurada";
    return "Servidor indisponível";
  }, [apiState]);

  function selectPage(label: string) {
    setActive(label);
    setMenuOpen(false);
  }

  async function publishNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), message: message.trim(), priority, criticality,
          link: link.trim() || null, publishedDate: publishedDate || null,
          expirationDate: expirationDate || null, active: true, closable,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "A API recusou o aviso.");
      setSubmitState("success");
      setFeedback("Aviso publicado com sucesso.");
    } catch (error) {
      setSubmitState("error");
      setFeedback(error instanceof Error ? error.message : "Não foi possível publicar o aviso.");
    }
  }

  return (
    <main className="app-shell">
      <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen((value) => !value)}>
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {menuOpen && <button className="menu-backdrop" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><BellRing size={22} /></span>
          <span><strong>Central de Avisos</strong><small>Comunicação interna</small></span>
        </div>
        {["Comunicação", "Administração"].map((group) => (
          <nav key={group} aria-label={group}>
            <p className="nav-heading">{group}</p>
            {navigation.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.label} className={`nav-item ${active === item.label ? "nav-item-active" : ""}`} onClick={() => selectPage(item.label)}>
                  <Icon size={18} /><span>{item.label}</span>
                  {active === item.label && <ChevronRight className="nav-chevron" size={15} />}
                </button>
              );
            })}
          </nav>
        ))}
        <div className="sidebar-footer">
          <button type="button" className="nav-item"><LogOut size={18} /><span>Sair</span></button>
          <div className={`server-status status-${apiState}`}><span className="status-dot" /><span>{apiLabel}</span></div>
        </div>
      </aside>

      <section className="workspace">
        {active === "Novo aviso" ? (
          <NoticeComposer title={title} setTitle={setTitle} message={message} setMessage={setMessage}
            criticality={criticality} setCriticality={setCriticality} priority={priority} setPriority={setPriority}
            link={link} setLink={setLink} publishedDate={publishedDate} setPublishedDate={setPublishedDate}
            expirationDate={expirationDate} setExpirationDate={setExpirationDate} closable={closable}
            setClosable={setClosable} submitState={submitState} feedback={feedback} publishNotice={publishNotice} />
        ) : active === "Popups" ? (
          <PopupsView onCreateNotice={() => selectPage("Novo aviso")} />
        ) : active === "Histórico" ? (
          <HistoryView />
        ) : active === "Acessando agora" ? (
          <MonitorView />
        ) : active === "Mensagem do dia" ? (
          <DailyMessageView />
        ) : (
          <SettingsView />
        )}
      </section>
    </main>
  );
}

type ComposerProps = {
  title: string; setTitle: (value: string) => void;
  message: string; setMessage: (value: string) => void;
  criticality: string; setCriticality: (value: string) => void;
  priority: string; setPriority: (value: string) => void;
  link: string; setLink: (value: string) => void;
  publishedDate: string; setPublishedDate: (value: string) => void;
  expirationDate: string; setExpirationDate: (value: string) => void;
  closable: boolean; setClosable: (value: boolean) => void;
  submitState: SubmitState; feedback: string;
  publishNotice: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

function NoticeComposer(props: ComposerProps) {
  return (
    <div className="content-container">
      <div className="breadcrumb">Central de Avisos <ChevronRight size={13} /> Novo aviso</div>
      <div className="page-heading">
        <div><span className="eyebrow">COMUNICAÇÃO</span><h1>Criar novo aviso</h1><p>Prepare e programe uma comunicação para os colaboradores da Intranet.</p></div>
        <span className="draft-badge"><span /> Rascunho</span>
      </div>
      <div className="composer-grid">
        <form className="form-card" onSubmit={props.publishNotice}>
          <section className="form-section">
            <div className="section-heading"><span className="section-icon"><Info size={19} /></span><span><strong>Conteúdo do aviso</strong><small>As informações que serão exibidas no popup.</small></span></div>
            <label>Título do aviso <em>*</em>
              <input required maxLength={120} value={props.title} onChange={(event) => props.setTitle(event.target.value)} placeholder="Ex.: Manutenção programada" />
              <small className="field-counter">{props.title.length}/120</small>
            </label>
            <label>Mensagem <em>*</em>
              <textarea required maxLength={1000} rows={6} value={props.message} onChange={(event) => props.setMessage(event.target.value)} placeholder="Escreva uma mensagem clara e objetiva para os colaboradores." />
              <small className="field-counter">{props.message.length}/1000</small>
            </label>
            <div className="field-row">
              <label>Criticidade<select value={props.criticality} onChange={(event) => props.setCriticality(event.target.value)}><option value="informative">Informativa</option><option value="attention">Atenção</option><option value="critical">Crítica</option></select></label>
              <label>Prioridade<select value={props.priority} onChange={(event) => props.setPriority(event.target.value)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select></label>
            </div>
            <label>Link complementar<input type="url" value={props.link} onChange={(event) => props.setLink(event.target.value)} placeholder="https://intranet.exemplo.gov.br/pagina" /></label>
            <div className="upload-box"><span className="upload-icon"><UploadCloud size={22} /></span><span><strong>Anexar mídia</strong><small>Imagem, PDF ou vídeo de até 5 MB.</small></span><button type="button" disabled>Selecionar arquivo</button></div>
          </section>
          <section className="form-section">
            <div className="section-heading"><span className="section-icon"><CalendarClock size={19} /></span><span><strong>Publicação</strong><small>Defina o período de exibição do aviso.</small></span></div>
            <div className="field-row">
              <label>Publicar em<input type="datetime-local" value={props.publishedDate} onChange={(event) => props.setPublishedDate(event.target.value)} /></label>
              <label>Expirar em<input type="datetime-local" value={props.expirationDate} onChange={(event) => props.setExpirationDate(event.target.value)} /></label>
            </div>
            <label className="check-row"><input type="checkbox" checked={props.closable} onChange={(event) => props.setClosable(event.target.checked)} /><span><strong>Permitir fechar o aviso</strong><small>O colaborador poderá dispensar o popup.</small></span></label>
          </section>
          {props.feedback && <div className={`feedback feedback-${props.submitState}`} role="status">{props.submitState === "success" ? <CircleCheck size={18} /> : <Info size={18} />}{props.feedback}</div>}
          <div className="form-actions"><button type="button" className="secondary-button"><Eye size={17} /> Visualizar</button><button type="submit" className="primary-button" disabled={props.submitState === "sending"}><Send size={17} /> {props.submitState === "sending" ? "Publicando..." : "Publicar aviso"}</button></div>
        </form>

        <aside className="preview-panel">
          <div className="preview-heading"><span><Eye size={17} /> Pré-visualização</span><small>Atualização automática</small></div>
          <div className="browser-preview">
            <div className="browser-bar"><i /><i /><i /><span>intranet.idam.am.gov.br</span></div>
            <div className="preview-background">
              <div className={`intranet-popup-preview intranet-popup-preview-${props.criticality}`}>
                <div className="intranet-popup-accent" />
                <div className="intranet-popup-header">
                  <div className="intranet-popup-heading-main">
                    <span className="intranet-popup-brand-icon"><BellRing size={15} /></span>
                    <div>
                      <h2>{props.title || "Título do seu aviso"}</h2>
                      <div className="intranet-popup-meta">
                        <span className="intranet-popup-badge">{criticalityLabel(props.criticality)} - {priorityLabel(props.priority)}</span>
                        <span className="intranet-popup-active"><CircleCheck size={11} /> Ativo</span>
                      </div>
                    </div>
                  </div>
                  {props.closable && <button type="button" aria-label="Fechar prévia"><X size={15} /></button>}
                </div>
                <div className="intranet-popup-body">
                  <div className="intranet-popup-alert">
                    <span className="intranet-popup-alert-icon">{previewAlertIcon(props.criticality)}</span>
                    <div>
                      <p>{props.message || "A mensagem aparecerá aqui enquanto você preenche o formulário."}</p>
                      {props.link && <span className="intranet-popup-link">Saiba mais <ExternalLink size={12} /></span>}
                    </div>
                  </div>
                  {props.expirationDate && <div className="intranet-popup-expiration"><CalendarClock size={13} /><span><small>EXPIRA</small><strong>{formatPreviewDate(props.expirationDate)}</strong></span></div>}
                  <div className="intranet-popup-footer">{props.closable && <button type="button">Fechar</button>}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="preview-note"><Wifi size={16} /><span><strong>Sincronizado com o formulário</strong><small>O resultado final pode variar de acordo com a tela do colaborador.</small></span></div>
        </aside>
      </div>
    </div>
  );
}

function criticalityLabel(value: string) {
  if (value === "critical") return "Crítica";
  if (value === "attention") return "Moderada";
  return "Informativa";
}

function priorityLabel(value: string) {
  if (value === "high") return "Alta";
  if (value === "low") return "Baixa";
  return "Normal";
}

function previewAlertIcon(value: string) {
  if (value === "critical") return <AlertTriangle size={16} />;
  if (value === "attention") return <CircleAlert size={16} />;
  return <Info size={16} />;
}

function formatPreviewDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
