"use client";

import { CheckCircle2, Edit3, LoaderCircle, MessageSquareText, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

export function DailyMessageView() {
  const [messages, setMessages] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    try {
      const response = await fetch("/api/mensagens", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível carregar as mensagens."));
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.messages) ? payload.messages : [];
      setMessages(list.filter((item: unknown): item is string => typeof item === "string").reverse());
    } catch (error) {
      setMessages([]);
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar as mensagens.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message) return;
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch("/api/mensagens", {
        method: original ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(original ? { oldMessage: original, message } : { message }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível salvar a mensagem."));
      setContent(""); setOriginal(null); setFeedback(original ? "Mensagem atualizada." : "Mensagem adicionada.");
      await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao salvar a mensagem."); }
    finally { setSaving(false); }
  }

  async function remove(message: string) {
    if (!window.confirm("Excluir esta mensagem do dia?")) return;
    setSaving(true); setFeedback("");
    try {
      const response = await fetch("/api/mensagens", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível excluir a mensagem."));
      if (original === message) cancelEdit();
      setFeedback("Mensagem excluída."); await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Falha ao excluir a mensagem."); }
    finally { setSaving(false); }
  }

  function edit(message: string) { setOriginal(message); setContent(message); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setOriginal(null); setContent(""); }

  return (
    <div className="content-container management-page">
      <div className="management-heading"><div><span className="eyebrow">COMUNICAÇÃO</span><h1>Mensagem do dia</h1><p>Gerencie as frases exibidas em destaque na Intranet.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</button></div>
      <div className="daily-grid">
        <form className="daily-editor" onSubmit={save}>
          <div className="section-heading"><span className="section-icon"><MessageSquareText size={19} /></span><span><strong>{original ? "Editar mensagem" : "Nova mensagem"}</strong><small>Use uma frase curta, clara e adequada ao ambiente interno.</small></span></div>
          <label>CONTEÚDO<textarea required maxLength={280} rows={5} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Digite a mensagem que será exibida na Intranet." /><small className="field-counter">{content.length}/280</small></label>
          <div className="daily-editor-actions">{original && <button type="button" className="secondary-button" onClick={cancelEdit}><X size={16} /> Cancelar</button>}<button type="submit" className="primary-button" disabled={saving || !content.trim()}>{original ? <Save size={16} /> : <Plus size={16} />}{saving ? "Salvando…" : original ? "Salvar alterações" : "Adicionar mensagem"}</button></div>
        </form>
        <section className="daily-list-card">
          <div className="daily-list-heading"><div><strong>Mensagens cadastradas</strong><small>{messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}</small></div></div>
          {feedback && <div className="inline-notice" role="status"><CheckCircle2 size={17} /> {feedback}</div>}
          {loading ? <div className="empty-state compact"><LoaderCircle className="spin" size={27} /> Carregando…</div> : messages.length === 0 ? <div className="empty-state compact"><MessageSquareText size={26} /><strong>Nenhuma mensagem cadastrada</strong></div> : <div className="daily-list">{messages.map((message, index) => <article key={`${message}-${index}`}><span className="daily-index">{String(index + 1).padStart(2, "0")}</span><p>{message}</p><div><button type="button" title="Editar" onClick={() => edit(message)} disabled={saving}><Edit3 size={15} /></button><button type="button" title="Excluir" onClick={() => void remove(message)} disabled={saving}><Trash2 size={15} /></button></div></article>)}</div>}
        </section>
      </div>
    </div>
  );
}

function apiError(payload: unknown, fallback: string) { return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback; }
