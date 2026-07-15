import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Serifada para headings — reforça a identidade "barbearia clássica/premium".
// Sans para corpo/UI — legibilidade em telas pequenas e formulários.
// `display: "swap"` evita FOIT; `variable` expõe como CSS var consumida no globals.css.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Barbearia — Agendamento Online",
  description: "Sistema de agendamento para barbearia",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
