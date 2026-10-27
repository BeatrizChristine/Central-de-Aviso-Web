"use client";

import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  Eye,
  Info,
  Send,
  UploadCloud,
  Wifi,
} from "lucide-react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { DateTimeField } from "@/components/date-time-field";
import { FilterSelect } from "@/components/filter-select";
import { IntranetNoticeCard } from "@/components/intranet-notice-card";
import { apiError, readJson } from "@/lib/client/api";

type SubmitState = "idle" | "sending" | "success" | "error";
type SelectedAttachment = {
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
  size: number;
};

export function NoticeComposer() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [criticality, setCriticality] = useState("informative");
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [closable, setClosable] = useState(true);
  const [attachment, setAttachment] = useState<SelectedAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [feedback, setFeedback] = useState("");

  async function publishNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");
    setFeedback("");

    try {
      const response = await fetch("/api/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          priority,
          criticality,
          link: link.trim() || null,
          publishedDate: publishedDate || null,
          expirationDate: expirationDate || null,
          active: true,
          closable,
          ...(attachment ? { imageBase64: attachment.base64, imageMimeType: attachment.mimeType } : {}),
        }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "A API recusou o aviso."));
      setSubmitState("success");
      setFeedback("Aviso publicado com sucesso.");
    } catch (error) {
      setSubmitState("error");
      setFeedback(error instanceof Error ? error.message : "Não foi possível publicar o aviso.");
    }
  }

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
      setAttachment({
        name: file.name,
        mimeType: file.type,
        base64: previewUrl.split(",")[1] || "",
        previewUrl,
        size: file.size,
      });
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Não foi possível ler a imagem.");
      event.target.value = "";
    }
  }

  function removeAttachment() {
    setAttachment(null);
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
        <form className="form-card" onSubmit={publishNotice}>
          <section className="form-section">
            <div className="section-heading"><span className="section-icon"><Info size={19} /></span><span><strong>Conteúdo do aviso</strong><small>As informações que serão exibidas no popup.</small></span></div>
            <label>Título do aviso <em>*</em>
              <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Manutenção programada" />
              <small className="field-counter">{title.length}/120</small>
            </label>
            <label>Mensagem <em>*</em>
              <textarea required maxLength={1000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma mensagem clara e objetiva para os colaboradores." />
              <small className="field-counter">{message.length}/1000</small>
            </label>
            <div className="field-row">
              <FilterSelect label="CRITICIDADE" value={criticality} onValueChange={setCriticality} options={[{ value: "informative", label: "Informativa" }, { value: "attention", label: "Moderada" }, { value: "critical", label: "Crítica" }]} />
              <FilterSelect label="PRIORIDADE" value={priority} onValueChange={setPriority} options={[{ value: "low", label: "Baixa" }, { value: "normal", label: "Normal" }, { value: "high", label: "Alta" }]} />
            </div>
            <label>Link complementar<input type="url" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://intranet.exemplo.gov.br/pagina" /></label>
            <div className={`upload-box ${attachment ? "upload-box-selected" : ""}`}>
              <input ref={fileInput} className="upload-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void selectAttachment(event)} />
              <span className="upload-icon"><UploadCloud size={22} /></span>
              <span><strong>{attachment?.name || "Anexar imagem"}</strong><small>{attachment ? `${formatFileSize(attachment.size)} · ${attachment.mimeType}` : "JPG, PNG, GIF ou WEBP de até 5 MB."}</small></span>
              <div className="upload-actions">
                {attachment && <button type="button" className="upload-remove" onClick={removeAttachment}>Remover</button>}
                <button type="button" onClick={() => fileInput.current?.click()}>{attachment ? "Trocar imagem" : "Selecionar imagem"}</button>
              </div>
            </div>
            {attachmentError && <div className="upload-error" role="alert">{attachmentError}</div>}
          </section>
          <section className="form-section">
            <div className="section-heading"><span className="section-icon"><CalendarClock size={19} /></span><span><strong>Publicação</strong><small>Defina o período de exibição do aviso.</small></span></div>
            <div className="field-row">
              <DateTimeField label="Publicar em" value={publishedDate} onChange={setPublishedDate} />
              <DateTimeField label="Expirar em" value={expirationDate} min={publishedDate || undefined} onChange={setExpirationDate} />
            </div>
            <label className="check-row"><input type="checkbox" checked={closable} onChange={(event) => setClosable(event.target.checked)} /><span><strong>Permitir fechar o aviso</strong><small>O colaborador poderá dispensar o popup.</small></span></label>
          </section>
          {feedback && <div className={`feedback feedback-${submitState}`} role="status">{submitState === "success" ? <CircleCheck size={18} /> : <Info size={18} />}{feedback}</div>}
          <div className="form-actions"><button type="submit" className="primary-button" disabled={submitState === "sending"}><Send size={17} /> {submitState === "sending" ? "Publicando..." : "Publicar aviso"}</button></div>
        </form>

        <aside className="preview-panel">
          <div className="preview-heading"><span><Eye size={17} /> Pré-visualização</span><small>Atualização automática</small></div>
          <div className="browser-preview">
            <div className="browser-bar"><i /><i /><i /><span>intranet.exemplo.gov.br</span></div>
            <div className="preview-background">
              <IntranetNoticeCard variant="preview" notice={{
                title: title || "Título do seu aviso",
                message: message || "A mensagem aparecerá aqui enquanto você preenche o formulário.",
                criticality,
                priority,
                link: link || undefined,
                imageUrl: attachment?.previewUrl,
                imageMimeType: attachment?.mimeType,
                imageName: attachment?.name,
                publishedDate: publishedDate || undefined,
                expirationDate: expirationDate || undefined,
                closable,
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
