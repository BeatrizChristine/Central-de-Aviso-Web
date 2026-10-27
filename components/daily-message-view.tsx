"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LoaderCircle,
  MessageSquareText,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { FilterSelect } from "@/components/filter-select";
import { apiError, arrayPayload, readJson } from "@/lib/client/api";

type ListedMessage = {
  message: string;
  position: number;
};

export function DailyMessageView() {
  const [messages, setMessages] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async (clearFeedback = true) => {
    setLoading(true);
    if (clearFeedback) setFeedback("");
    try {
      const response = await fetch("/api/mensagens", { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível carregar as mensagens."));
      const list = arrayPayload(payload, ["messages"]);
      setMessages(list.filter((item: unknown): item is string => typeof item === "string").reverse());
    } catch (error) {
      setMessages([]);
      setFeedback(error instanceof Error ? error.message : "Falha ao carregar as mensagens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filteredMessages = useMemo<ListedMessage[]>(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return messages
      .map((message, index) => ({ message, position: index + 1 }))
      .filter(({ message }) => !normalizedQuery || message.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  }, [messages, query]);

  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstResult = (currentPage - 1) * pageSize;
  const visibleMessages = filteredMessages.slice(firstResult, firstResult + pageSize);

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
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível salvar a mensagem."));
      setContent("");
      setOriginal(null);
      setPage(1);
      setFeedback(original ? "Mensagem atualizada." : "Mensagem adicionada.");
      await load(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao salvar a mensagem.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(message: string) {
    if (!window.confirm("Excluir esta mensagem do dia?")) return;
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch("/api/mensagens", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(apiError(payload, "Não foi possível excluir a mensagem."));
      if (original === message) cancelEdit();
      setFeedback("Mensagem excluída.");
      await load(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao excluir a mensagem.");
    } finally {
      setSaving(false);
    }
  }

  function edit(message: string) {
    setOriginal(message);
    setContent(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setOriginal(null);
    setContent("");
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const resultEnd = Math.min(firstResult + visibleMessages.length, filteredMessages.length);

  return (
    <div className="content-container management-page daily-page">
      <div className="management-heading">
        <div>
          <span className="eyebrow">COMUNICAÇÃO</span>
          <h1>Mensagem do dia</h1>
          <p>Gerencie as frases exibidas em destaque na Intranet.</p>
        </div>
        <button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </div>

      <div className="daily-grid">
        <form className="daily-editor" onSubmit={save}>
          <div className="section-heading">
            <span className="section-icon"><MessageSquareText size={19} /></span>
            <span>
              <strong>{original ? "Editar mensagem" : "Nova mensagem"}</strong>
              <small>Use uma frase curta, clara e adequada ao ambiente interno.</small>
            </span>
          </div>
          <div className="daily-editor-body">
            <label>
              CONTEÚDO
              <textarea
                required
                maxLength={280}
                rows={3}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Digite a mensagem que será exibida na Intranet."
              />
              <small className="field-counter">{content.length}/280</small>
            </label>
            <div className="daily-editor-actions">
              {original && <button type="button" className="secondary-button" onClick={cancelEdit}><X size={16} /> Cancelar</button>}
              <button type="submit" className="primary-button" disabled={saving || !content.trim()}>
                {original ? <Save size={16} /> : <Plus size={16} />}
                {saving ? "Salvando…" : original ? "Salvar alterações" : "Adicionar mensagem"}
              </button>
            </div>
          </div>
        </form>

        <section className="daily-messages-section" aria-labelledby="daily-list-title">
          <div className="daily-list-heading">
            <div>
              <strong id="daily-list-title">Mensagens cadastradas</strong>
              <small>{messages.length} {messages.length === 1 ? "mensagem" : "mensagens"}</small>
            </div>
          </div>

          <div className="monitor-toolbar daily-list-toolbar">
            <label className="daily-search search-control">
              <div>
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                  placeholder="Digite parte da mensagem"
                />
              </div>
            </label>
            <div className="monitor-list-options">
              <FilterSelect
                compact
                label="Mostrar"
                value={String(pageSize)}
                options={[10, 25, 50].map((size) => ({ value: String(size), label: String(size) }))}
                onValueChange={(value) => changePageSize(Number(value))}
              />
              <div className="monitor-results">
                <span>{filteredMessages.length} encontradas</span>
                <span>Exibindo {visibleMessages.length} de {filteredMessages.length}</span>
              </div>
            </div>
          </div>

          {feedback && <div className="inline-notice" role="status"><CheckCircle2 size={17} /> {feedback}</div>}

          {loading ? (
            <div className="empty-state compact"><LoaderCircle className="spin" size={27} /> Carregando…</div>
          ) : messages.length === 0 ? (
            <div className="empty-state compact"><MessageSquareText size={26} /><strong>Nenhuma mensagem cadastrada</strong></div>
          ) : filteredMessages.length === 0 ? (
            <div className="empty-state compact"><Search size={26} /><strong>Nenhuma mensagem encontrada</strong><p>Tente buscar por outro texto.</p></div>
          ) : (
            <div className="daily-list-card">
              <div className="daily-list-scroll">
                <div className="daily-list">
                  {visibleMessages.map(({ message, position }) => (
                    <article key={`${message}-${position}`}>
                      <span className="daily-index">{String(position).padStart(2, "0")}</span>
                      <p>{message}</p>
                      <div>
                        <button type="button" aria-label={`Editar mensagem ${position}`} title="Editar" onClick={() => edit(message)} disabled={saving}><Edit3 size={15} /></button>
                        <button type="button" aria-label={`Excluir mensagem ${position}`} title="Excluir" onClick={() => void remove(message)} disabled={saving}><Trash2 size={15} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="daily-pagination">
                <span>Exibindo {firstResult + 1}–{resultEnd} de {filteredMessages.length}</span>
                <div>
                  <button type="button" aria-label="Página anterior" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
                  <strong>Página {currentPage} de {totalPages}</strong>
                  <button type="button" aria-label="Próxima página" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
