"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/crocodil/storage";
import { CrocodilSidebar } from "@/components/crocodil/Sidebar";
import { ToastProvider } from "@/components/crocodil/Toast";
import { ConfirmProvider } from "@/components/crocodil/ConfirmModal";
import { Menu, X } from "lucide-react";

export default function CrocodilLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    isAuthenticated().then(auth => {
      setAuthed(auth);
      setAuthChecked(true);
      if (!auth && pathname !== "/crocodil") {
        router.replace("/crocodil");
      }
    });
  }, [pathname, router]);

  if (!authChecked) return null;

  // PIN giriş sayfası — sidebar yok
  if (pathname === "/crocodil" || !authed) {
    return (
      <div className="min-h-screen" style={{ background: "#0f2027" }}>
        {children}
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex h-screen overflow-hidden" style={{ background: "#f0fdf9" }}>
          {/* Mobil overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`
              fixed inset-y-0 left-0 z-40 w-64 flex-shrink-0 transition-transform duration-300
              lg:relative lg:translate-x-0
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <CrocodilSidebar onClose={() => setSidebarOpen(false)} />
          </aside>

          {/* İçerik */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobil header */}
            <div
              className="flex items-center justify-between px-4 py-3 lg:hidden border-b"
              style={{ background: "#0f2027", borderColor: "#1a3a35" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐊</span>
                <span className="font-bold text-white text-sm">Crocodil</span>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* Ana içerik */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
