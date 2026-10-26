"use client";

import {
  Activity, BellRing, CalendarClock, ChevronRight, CircleCheck, Eye,
  FilePlus2, History, ImageIcon, Info, LogOut, Menu, PanelsTopLeft,
  Send, Settings2, SunMedium, UploadCloud, Wifi, X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DailyMessageView } from "@/components/daily-message-view";
import { PopupsView } from "@/components/popups-view";

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
        ) : active === "Mensagem do dia" ? (
          <DailyMessageView />
        ) : <ComingSoon page={active} />}
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
              <div className={`notice-preview severity-${props.criticality}`}>
                <div className="notice-brand"><BellRing size={15} /> Central de Avisos <X size={15} /></div>
                <div className="notice-media"><ImageIcon size={25} /><small>Mídia do aviso</small></div>
                <span className="notice-pill">{criticalityLabel(props.criticality)}</span>
                <h2>{props.title || "Título do seu aviso"}</h2>
                <p>{props.message || "A mensagem aparecerá aqui enquanto você preenche o formulário."}</p>
                {props.link && <span className="notice-link">Acessar conteúdo <ChevronRight size={13} /></span>}
              </div>
            </div>
          </div>
          <div className="preview-note"><Wifi size={16} /><span><strong>Sincronizado com o formulário</strong><small>O resultado final pode variar de acordo com a tela do colaborador.</small></span></div>
        </aside>
      </div>
    </div>
  );
}

function ComingSoon({ page }: { page: string }) {
  return <div className="content-container placeholder-page"><span className="placeholder-icon"><PanelsTopLeft size={26} /></span><span className="eyebrow">MIGRAÇÃO EM ANDAMENTO</span><h1>{page}</h1><p>Esta área já faz parte da navegação web e será conectada à funcionalidade equivalente da aplicação JavaFX na próxima etapa.</p><button type="button" onClick={() => window.location.reload()}>Voltar ao novo aviso</button></div>;
}

function criticalityLabel(value: string) {
  if (value === "critical") return "Crítico";
  if (value === "attention") return "Atenção";
  return "Informativo";
}
