import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/ui/CookieBanner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CORTEX SLP | Medikal Dil, Konuşma ve Yutma Patolojisi",
  description: "Nörolojik rehabilitasyon ve vokal terapilerde kanıta dayalı, bütüncül ve evrensel klinik yaklaşım.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-warm-gray-800">
        <LanguageProvider>
          <Header />
          <main className="flex-grow pt-20">
            {children}
          </main>
          <Footer />
          <CookieBanner />
        </LanguageProvider>
      </body>
    </html>
  );
}
