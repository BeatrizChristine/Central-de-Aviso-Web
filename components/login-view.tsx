"use client";

import {
  ArrowRight,
  BellRing,
  Eye,
  EyeOff,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useState } from "react";

type LoginViewProps = {
  onLogin: (remember: boolean) => void;
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");

    if (!user.trim() || !password) {
      setFeedback("Informe o usuário e a senha para continuar.");
      return;
    }

    onLogin(remember);
  }

  return (
    <main className="login-page">
      <section className="login-presentation">
        <span className="login-decoration login-decoration-top" />
        <span className="login-decoration login-decoration-bottom" />

        <div className="login-presentation-content">
          <LoginBrand />

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

          <form onSubmit={submit}>
            <label htmlFor="login-user">Usuário ou e-mail</label>
            <div className="login-input">
              <UserRound size={19} />
              <input
                id="login-user"
                autoComplete="username"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                placeholder="Digite seu usuário ou e-mail"
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
              <button type="button" onClick={() => setFeedback("A recuperação de senha será conectada ao serviço de contas do IDAM.")}>Esqueci minha senha</button>
            </div>

            {feedback && <div className="login-feedback" role="status"><MessageSquareText size={15} /> {feedback}</div>}

            <button type="submit" className="login-submit">Entrar <ArrowRight size={19} /></button>
          </form>

          <footer><span />Acesso interno para colaboradores do IDAM<span /></footer>
        </div>
      </section>
    </main>
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
