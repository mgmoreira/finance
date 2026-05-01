import type { Metadata } from "next";
import { JetBrains_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIN·TERM",
  description: "Portfolio tracker & home finance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("hideMoney")==="true")document.documentElement.classList.add("hide-money")}catch(e){}` }} />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${interTight.variable}`}
        style={{
          fontFamily: "var(--font-inter-tight, -apple-system, system-ui, sans-serif)",
          background: "var(--bg)",
          color: "var(--text)",
          minHeight: "100vh",
        }}
      >
        <NavBar />
        {children}
      </body>
    </html>
  );
}
