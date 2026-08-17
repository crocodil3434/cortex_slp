"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { logout, getSettings } from "@/lib/crocodil/storage";
import { CrocodilSettings } from "@/lib/crocodil/types";
import { NotificationBell } from "@/components/crocodil/NotificationBell";
import {
  CalendarDays,
  Users,
  ClipboardList,
  Activity,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/crocodil/dashboard", label: "Ana Panel", icon: LayoutDashboard },
  { href: "/crocodil/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/crocodil/danisman", label: "Danışanlar", icon: Users },
  { href: "/crocodil/degerlendirme", label: "Değerlendirme", icon: ClipboardList },
  { href: "/crocodil/terapi", label: "Terapi Seansları", icon: Activity },
  { href: "/crocodil/analiz", label: "Analiz & Grafikler", icon: BarChart3 },
  { href: "/crocodil/ai", label: "Crocodil AI", icon: Sparkles, badge: "AI" },
];

interface SidebarProps {
  onClose?: () => void;
}

export function CrocodilSidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [settings, setSettings] = React.useState<CrocodilSettings | null>(null);

  React.useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/crocodil");
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0f2027 0%, #134e4a 100%)",
        borderRight: "1px solid rgba(13,148,136,0.2)",
      }}
    >
      {/* Logo & Başlık */}
      <div className="px-5 py-6 border-b" style={{ borderColor: "rgba(13,148,136,0.2)" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: "rgba(13,148,136,0.2)", border: "1px solid rgba(13,148,136,0.3)" }}
            >
              🐊
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">Crocodil</div>
              <div className="text-teal-400/70 text-xs">Medikal SLP</div>
            </div>
          </div>
          <NotificationBell />
        </div>

        {settings?.clinicianName && (
          <div className="mt-4 flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
            >
              {settings.clinicianName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <span className="text-white/60 text-xs truncate">{settings.clinicianName}</span>
          </div>
        )}
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
              style={{
                background: isActive ? "rgba(13,148,136,0.25)" : "transparent",
                border: isActive ? "1px solid rgba(13,148,136,0.3)" : "1px solid transparent",
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: "rgba(13,148,136,0.15)" }}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}

              <Icon
                className={`w-4 h-4 relative z-10 transition-colors ${
                  isActive ? "text-teal-400" : "text-white/40 group-hover:text-white/70"
                }`}
              />
              <span
                className={`text-sm font-medium relative z-10 flex-1 transition-colors ${
                  isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                }`}
              >
                {item.label}
              </span>

              {item.badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md relative z-10"
                  style={{ background: "rgba(217,119,6,0.3)", color: "#fbbf24", border: "1px solid rgba(217,119,6,0.3)" }}
                >
                  {item.badge}
                </span>
              )}

              {isActive && (
                <ChevronRight className="w-3 h-3 text-teal-400/50 relative z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Alt menü */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: "rgba(13,148,136,0.2)" }}>
        <Link
          href="/crocodil/ayarlar"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-sm"
        >
          <Settings className="w-4 h-4" />
          <span>Ayarlar</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış</span>
        </button>

        {/* CortexSLP bağlantısı */}
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/50 transition-all text-xs"
        >
          <span className="text-base">🏥</span>
          <span>CORTEX SLP Ana Site</span>
        </Link>
      </div>
    </div>
  );
}
