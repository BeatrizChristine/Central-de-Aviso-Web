"use client";

import {
  Activity,
  BellRing,
  ChevronRight,
  FilePlus2,
  History,
  LogOut,
  Menu,
  PanelsTopLeft,
  Settings2,
  SunMedium,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DailyMessageView } from "@/components/daily-message-view";
import { HistoryView } from "@/components/history-view";
import { LoginView } from "@/components/login-view";
import { MonitorView } from "@/components/monitor-view";
import { PopupsView } from "@/components/popups-view";
import { SettingsView } from "@/components/settings-view";
import { NoticeComposer } from "@/features/notices/notice-composer";
import { isJsonRecord, readJson } from "@/lib/client/api";
import { isAuthUser, type AuthUser } from "@/types/auth";

const navigation = [
  { label: "Novo aviso", icon: FilePlus2, group: "Comunicação" },
  { label: "Popups", icon: PanelsTopLeft, group: "Comunicação" },
  { label: "Histórico", icon: History, group: "Comunicação" },
  { label: "Acessando agora", icon: Activity, group: "Administração" },
  { label: "Mensagem do dia", icon: SunMedium, group: "Administração" },
  { label: "Configurações", icon: Settings2, group: "Administração" },
] as const;

type PageName = (typeof navigation)[number]["label"];
type ApiState = "checking" | "online" | "unconfigured" | "offline";

export default function Home() {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePage, setActivePage] = useState<PageName>("Novo aviso");
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiState, setApiState] = useState<ApiState>("checking");

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => response.ok ? readJson(response) : null)
      .then((payload) => {
        if (!mounted || !isJsonRecord(payload) || !isAuthUser(payload.user)) return;
        setAuthenticatedUser(payload.user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setAuthChecked(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!authenticatedUser) return;
    fetch("/api/status", { cache: "no-store" })
      .then(readJson)
      .then((status) => {
        if (!isJsonRecord(status)) return setApiState("offline");
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

  function selectPage(page: PageName) {
    setActivePage(page);
    setMenuOpen(false);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      setAuthenticatedUser(null);
      setMenuOpen(false);
    }
  }

  if (!authChecked) {
    return <main className="auth-loading" aria-busy="true"><BellRing size={30} /><span>Verificando sessão…</span></main>;
  }
  if (!authenticatedUser) return <LoginView onLogin={setAuthenticatedUser} />;

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
        {(["Comunicação", "Administração"] as const).map((group) => (
          <nav key={group} aria-label={group}>
            <p className="nav-heading">{group}</p>
            {navigation.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.label} className={`nav-item ${activePage === item.label ? "nav-item-active" : ""}`} onClick={() => selectPage(item.label)}>
                  <Icon size={18} /><span>{item.label}</span>
                  {activePage === item.label && <ChevronRight className="nav-chevron" size={15} />}
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
        {activePage === "Novo aviso" ? (
          <NoticeComposer />
        ) : activePage === "Popups" ? (
          <PopupsView onCreateNotice={() => selectPage("Novo aviso")} />
        ) : activePage === "Histórico" ? (
          <HistoryView />
        ) : activePage === "Acessando agora" ? (
          <MonitorView />
        ) : activePage === "Mensagem do dia" ? (
          <DailyMessageView />
        ) : (
          <SettingsView />
        )}
      </section>
    </main>
  );
}
