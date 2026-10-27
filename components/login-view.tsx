"use client";

import {
  ArrowRight,
  BellRing,
  Building2,
  Eye,
  EyeOff,
  Headphones,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Ticket,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type LoginViewProps = {
  onLogin: (user: AuthUser) => void;
};

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string | null;
};

const benefits = [
  {
    icon: BellRing,
    tone: "blue",
    title: "Avisos em tempo real",
    description: "Publique comunicados importantes para toda a equipe.",
  },
  {
    icon: UsersRound,
    tone: "purple",
    title: "Comunicação centralizada",
    description: "Gerencie as informações da Intranet em um só lugar.",
  },
  {
    icon: ShieldCheck,
    tone: "green",
    title: "Acesso rápido e seguro",
    description: "Ambiente de uso interno para os colaboradores do IDAM.",
  },
];

export function LoginView({ onLogin }: LoginViewProps) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (!supportOpen) return;
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSupportOpen(false);
    }
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [supportOpen]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!user.trim() || !password) {
      setFeedback("Informe o usuário e a senha para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: user.trim(), password, remember }),
      });
      const payload = await response.json().catch(() => null) as {
        user?: AuthUser;
        error?: string;
      } | null;
      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error || "Não foi possível realizar o login.");
      }
      setPassword("");
      onLogin(payload.user);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível realizar o login.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-presentation">
        <span className="login-decoration login-decoration-top" />
        <span className="login-decoration login-decoration-bottom" />

        <div className="login-presentation-content">
          <div className="login-message">
            <h1>Informação <span>para todos,</span> em um só lugar.</h1>
            <p>Acompanhe avisos, comunicados e informações importantes da Intranet do IDAM de forma rápida e organizada.</p>
          </div>

          <div className="login-benefits">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title}>
                  <span className={`login-benefit-icon login-benefit-${benefit.tone}`}><Icon size={24} /></span>
                  <div><strong>{benefit.title}</strong><p>{benefit.description}</p></div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="login-access">
        <div className="login-card">
          <div className="login-card-brand"><LoginBrand /></div>
          <header>
            <h2>Bem-vindo de volta</h2>
            <p>Faça login para acessar a Central de Avisos e gerenciar os comunicados da Intranet.</p>
          </header>

          <form onSubmit={(event) => void submit(event)}>
            <label htmlFor="login-user">Usuário</label>
            <div className="login-input">
              <UserRound size={19} />
              <input
                id="login-user"
                autoComplete="username"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="Digite seu usuário"
              />
            </div>

            <label htmlFor="login-password">Senha</label>
            <div className="login-input">
              <LockKeyhole size={19} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
              />
              <button type="button" className="login-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span>Lembrar de mim</span>
              </label>
              <button type="button" onClick={() => { setFeedback(""); setSupportOpen(true); }}>Esqueci minha senha</button>
            </div>

            {feedback && <div className="login-feedback" role="status"><MessageSquareText size={15} /> {feedback}</div>}

            <button type="submit" className="login-submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? "Validando no AD…" : "Entrar"} {!submitting && <ArrowRight size={19} />}
            </button>
          </form>

          <footer><span />Acesso interno para colaboradores do IDAM<span /></footer>
        </div>
      </section>

      {supportOpen && <SupportModal onClose={() => setSupportOpen(false)} />}
    </main>
  );
}

function SupportModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="support-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="support-modal" role="dialog" aria-modal="true" aria-labelledby="support-modal-title">
        <button autoFocus type="button" className="support-modal-close" onClick={onClose} aria-label="Fechar janela de suporte">
          <X size={19} />
        </button>

        <div className="support-modal-content">
          <span className="support-modal-headset"><Headphones size={24} /></span>
          <span className="support-modal-eyebrow">SUPORTE</span>
          <h2 id="support-modal-title">Recuperação de acesso</h2>
          <p className="support-modal-description">Para recuperar seu acesso, entre em contato com o NTI.</p>

          <div className="support-contact-list">
            <SupportContact icon={Building2} label="Setor" value="NTI" />
            <SupportContact icon={Phone} label="Telefone" value="(92) 98446-9237" href="tel:+5592984469237" />
            <SupportContact icon={Phone} label="Ramal" value="8216" href="tel:8216" />
            <SupportContact icon={Mail} label="E-mail" value="nti@idam.am.gov.br" href="mailto:nti@idam.am.gov.br" />
          </div>

          <div className="support-ticket">
            <Ticket size={20} />
            <div>
              <strong>Crie um chamado</strong>
              <p>Informe seu nome completo, matrícula, setor e descreva o problema de acesso.</p>
            </div>
          </div>
        </div>

        <footer className="support-modal-footer">
          <button type="button" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>
  );
}

type SupportContactProps = {
  icon: typeof Building2;
  label: string;
  value: string;
  href?: string;
};

function SupportContact({ icon: Icon, label, value, href }: SupportContactProps) {
  return (
    <div className="support-contact">
      <Icon size={20} />
      <div>
        <strong>{label}</strong>
        {href ? <a href={href}>{value}</a> : <span>{value}</span>}
      </div>
    </div>
  );
}

function LoginBrand() {
  return (
    <div className="login-brand">
      <span className="login-brand-mark"><BellRing size={27} /></span>
      <span><strong>Central de Avisos</strong><small>Comunicação interna</small></span>
    </div>
  );
}
