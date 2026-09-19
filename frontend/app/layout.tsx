import type { Metadata } from "next";
import { Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
  display: "swap",
});

const frankRuhl = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

import { CurrencyProvider } from "@/context/CurrencyContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "AgentTravelPlanner | תכנון חופשות ומסעות עם סוכני AI אוטונומיים",
  description:
    "גלה יעדים עוצרי נשימה ותכנן את הטיול המושלם עם צוות 13 סוכני בינה מלאכותית אוטונומיים.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`dark ${heebo.variable} ${frankRuhl.variable} scroll-smooth`}>
      <body className="antialiased bg-[#090e14] text-slate-100 font-sans selection:bg-teal-500/30 selection:text-teal-200 min-h-screen text-right">
        <AuthProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
