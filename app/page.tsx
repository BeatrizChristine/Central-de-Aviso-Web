"use client";

import {
  Activity, BellRing, CalendarClock, ChevronRight, CircleCheck, Eye,
  FilePlus2, History, Info, LogOut, Menu, PanelsTopLeft,
  Send, Settings2, SunMedium, UploadCloud, Wifi, X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { DateTimeField } from "@/components/date-time-field";
import { DailyMessageView } from "@/components/daily-message-view";
import { FilterSelect } from "@/components/filter-select";
import { HistoryView } from "@/components/history-view";
import { IntranetNoticeCard } from "@/components/intranet-notice-card";
import { LoginView, type AuthUser } from "@/components/login-view";
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
type SelectedAttachment = { name: string; mimeType: string; base64: string; previewUrl: string; size: number };

export default function Home() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const payload = await response.json() as { user?: AuthUser };
        return payload.user || null;
      })
      .then((user) => {
        if (active) setAuthenticatedUser(user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAuthChecked(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authenticatedUser) return;
    fetch("/api/status")
      .then(async (response) => {
        const status = (await response.json()) as { configured?: boolean; online?: boolean };
        setApiState(!status.configured ? "unconfigured" : status.online ? "online" : "offline");
      })
      .catch(() => setApiState("offline"));
  }, [authenticatedUser]);

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

  function login(user: AuthUser) {
    setAuthenticatedUser(user);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setAuthenticatedUser(null);
      setMenuOpen(false);
    }
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
          ...(attachment ? { imageBase64: attachment.base64, imageMimeType: attachment.mimeType } : {}),
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

  if (!authChecked) {
    return <main className="auth-loading" aria-busy="true"><BellRing size={30} /><span>Verificando sessão…</span></main>;
  }
  if (!authenticatedUser) return <LoginView onLogin={login} />;

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
          <div className="signed-user" title={authenticatedUser.email || authenticatedUser.username}>
            <span>{authenticatedUser.name.slice(0, 1).toLocaleUpperCase("pt-BR")}</span>
            <div><strong>{authenticatedUser.name}</strong><small>{authenticatedUser.username}</small></div>
          </div>
          <button type="button" className="nav-item" onClick={() => void logout()}><LogOut size={18} /><span>Sair</span></button>
          <div className={`server-status status-${apiState}`}><span className="status-dot" /><span>{apiLabel}</span></div>
        </div>
      </aside>

      <section className="workspace">
        {active === "Novo aviso" ? (
          <NoticeComposer title={title} setTitle={setTitle} message={message} setMessage={setMessage}
            criticality={criticality} setCriticality={setCriticality} priority={priority} setPriority={setPriority}
            link={link} setLink={setLink} publishedDate={publishedDate} setPublishedDate={setPublishedDate}
            expirationDate={expirationDate} setExpirationDate={setExpirationDate} closable={closable}
            setClosable={setClosable} attachment={attachment} setAttachment={setAttachment}
            submitState={submitState} feedback={feedback} publishNotice={publishNotice} />
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
  attachment: SelectedAttachment | null; setAttachment: (value: SelectedAttachment | null) => void;
  submitState: SubmitState; feedback: string;
  publishNotice: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

function NoticeComposer(props: ComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachmentError, setAttachmentError] = useState("");

  async function selectAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAttachmentError("");
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAttachmentError("Formato não suportado. Use JPG, PNG, GIF ou WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAttachmentError("A imagem excede o limite de 5 MB.");
      event.target.value = "";
      return;
    }
    try {
      const previewUrl = await readFileAsDataUrl(file);
      props.setAttachment({ name: file.name, mimeType: file.type, base64: previewUrl.split(",")[1] || "", previewUrl, size: file.size });
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Não foi possível ler a imagem.");
      event.target.value = "";
    }
  }

  function removeAttachment() {
    props.setAttachment(null);
    setAttachmentError("");
    if (fileInput.current) fileInput.current.value = "";
  }

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
              <FilterSelect label="CRITICIDADE" value={props.criticality} onValueChange={props.setCriticality} options={[{ value: "informative", label: "Informativa" }, { value: "attention", label: "Moderada" }, { value: "critical", label: "Crítica" }]} />
              <FilterSelect label="PRIORIDADE" value={props.priority} onValueChange={props.setPriority} options={[{ value: "low", label: "Baixa" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }]} />
            </div>
            <label>Link complementar<input type="url" value={props.link} onChange={(event) => props.setLink(event.target.value)} placeholder="https://intranet.exemplo.gov.br/pagina" /></label>
            <div className={`upload-box ${props.attachment ? "upload-box-selected" : ""}`}>
              <input ref={fileInput} className="upload-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void selectAttachment(event)} />
              <span className="upload-icon"><UploadCloud size={22} /></span>
              <span><strong>{props.attachment?.name || "Anexar imagem"}</strong><small>{props.attachment ? `${formatFileSize(props.attachment.size)} · ${props.attachment.mimeType}` : "JPG, PNG, GIF ou WEBP de até 5 MB."}</small></span>
              <div className="upload-actions">
                {props.attachment && <button type="button" className="upload-remove" onClick={removeAttachment}>Remover</button>}
                <button type="button" onClick={() => fileInput.current?.click()}>{props.attachment ? "Trocar imagem" : "Selecionar imagem"}</button>
              </div>
            </div>
            {attachmentError && <div className="upload-error" role="alert">{attachmentError}</div>}
          </section>
          <section className="form-section">
            <div className="section-heading"><span className="section-icon"><CalendarClock size={19} /></span><span><strong>Publicação</strong><small>Defina o período de exibição do aviso.</small></span></div>
            <div className="field-row">
              <DateTimeField label="Publicar em" value={props.publishedDate} onChange={props.setPublishedDate} />
              <DateTimeField label="Expirar em" value={props.expirationDate} min={props.publishedDate || undefined} onChange={props.setExpirationDate} />
            </div>
            <label className="check-row"><input type="checkbox" checked={props.closable} onChange={(event) => props.setClosable(event.target.checked)} /><span><strong>Permitir fechar o aviso</strong><small>O colaborador poderá dispensar o popup.</small></span></label>
          </section>
          {props.feedback && <div className={`feedback feedback-${props.submitState}`} role="status">{props.submitState === "success" ? <CircleCheck size={18} /> : <Info size={18} />}{props.feedback}</div>}
          <div className="form-actions"><button type="submit" className="primary-button" disabled={props.submitState === "sending"}><Send size={17} /> {props.submitState === "sending" ? "Publicando..." : "Publicar aviso"}</button></div>
        </form>

        <aside className="preview-panel">
          <div className="preview-heading"><span><Eye size={17} /> Pré-visualização</span><small>Atualização automática</small></div>
          <div className="browser-preview">
            <div className="browser-bar"><i /><i /><i /><span>intranet.exemplo.gov.br</span></div>
            <div className="preview-background">
              <IntranetNoticeCard variant="preview" notice={{
                title: props.title || "Título do seu aviso",
                message: props.message || "A mensagem aparecerá aqui enquanto você preenche o formulário.",
                criticality: props.criticality,
                priority: props.priority,
                link: props.link || undefined,
                imageUrl: props.attachment?.previewUrl,
                imageMimeType: props.attachment?.mimeType,
                imageName: props.attachment?.name,
                publishedDate: props.publishedDate || undefined,
                expirationDate: props.expirationDate || undefined,
                closable: props.closable,
                active: true,
              }} />
            </div>
          </div>
          <div className="preview-note"><Wifi size={16} /><span><strong>Sincronizado com o formulário</strong><small>O resultado final pode variar de acordo com a tela do colaborador.</small></span></div>
        </aside>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}
