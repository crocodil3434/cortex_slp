"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CookieBanner } from "@/components/ui/CookieBanner";

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isCrocodil = pathname.startsWith("/crocodil");

  if (isCrocodil) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="flex-grow pt-20">
        {children}
      </main>
      <Footer />
      <CookieBanner />
    </>
  );
}
