import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Central de Avisos | Comunicação interna",
  description: "Administração de avisos, popups e mensagens da Intranet.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
