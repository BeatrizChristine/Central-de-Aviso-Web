import type { Metadata } from "next";
import "./globals.css";

// O painel é operacional e recebe novas versões com frequência. Mantê-lo
// estático faria o HTML apontar para um JavaScript antigo após uma atualização.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Central de Avisos | Comunicação interna",
  description: "Administração de avisos, popups e mensagens da Intranet.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
