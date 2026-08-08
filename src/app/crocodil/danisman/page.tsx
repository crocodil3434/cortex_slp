"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getClients, searchClients } from "@/lib/crocodil/storage";
import type { Client } from "@/lib/crocodil/types";
import { Search, Plus, Filter, Users, ChevronRight, Calendar, Clock, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const STATUS_CONFIG = {
  aktif: { label: "Aktif", bg: "rgba(13,148,136,0.12)", color: "#0d9488", border: "rgba(13,148,136,0.3)" },
  pasif: { label: "Pasif", bg: "rgba(107,114,128,0.1)", color: "#6b7280", border: "rgba(107,114,128,0.2)" },
  tamamlandı: { label: "Tamamlandı", bg: "rgba(16,185,129,0.1)", color: "#10b981", border: "rgba(16,185,129,0.2)" },
};

const COLOR_PALETTE = [
  "#0d9488", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899",
];

function getAvatarColor(id: string) {
  const i = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const color = getAvatarColor(client.id);
  const status = STATUS_CONFIG[client.status];
  const age = client.birthDate
    ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / 31557600000)
    : null;

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-4 border cursor-pointer transition-all"
      style={{ borderColor: "#f0fdf9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
        >
          {client.avatarInitials ?? "??"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800 truncate">
                {client.firstName} {client.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {age !== null && (
                  <span className="text-xs text-gray-400">{age} yaş</span>
                )}
                {client.primaryDiagnosis && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-500 truncate max-w-[180px]">
                      {client.primaryDiagnosis}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full border"
                style={{ background: status.bg, color: status.color, borderColor: status.border }}
              >
                {status.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            {client.referralSource && (
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{client.referralSource}</span>
              </div>
            )}
            {client.createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(parseISO(client.createdAt), "d MMM yy", { locale: tr })}</span>
              </div>
            )}
            {client.googleCalendarLinked && (
              <div className="flex items-center gap-1">
                <span className="text-blue-400">🔵 Google</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DanismanListePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tümü" | Client["status"]>("tümü");

  useEffect(() => {
    setClients(getClients());
  }, []);

  const filtered = (query ? searchClients(query) : clients).filter(
    (c) => statusFilter === "tümü" || c.status === statusFilter
  );

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Danışanlar</h1>
            <p className="text-xs text-gray-400 mt-0.5">{clients.filter((c) => c.status === "aktif").length} aktif · {clients.length} toplam</p>
          </div>
          <Link href="/crocodil/danisman/yeni">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
            >
              <Plus className="w-4 h-4" />
              Yeni Danışan
            </motion.button>
          </Link>
        </div>

        {/* Arama + Filtre */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad, tanı veya sevk kaynağı ara..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm focus:outline-none focus:border-teal-400 transition-colors"
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
            {(["tümü", "aktif", "pasif", "tamamlandı"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-2 text-xs font-medium capitalize transition-all"
                style={{
                  background: statusFilter === s ? "#0d9488" : "transparent",
                  color: statusFilter === s ? "white" : "#6b7280",
                }}
              >
                {s === "tümü" ? "Tümü" : STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">👥</div>
            <p className="font-medium text-gray-600">
              {query ? "Arama sonucu bulunamadı" : "Henüz danışan yok"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {query ? "Farklı bir arama terimi deneyin" : "Yeni danışan ekleyerek başlayın"}
            </p>
            {!query && (
              <Link href="/crocodil/danisman/yeni">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
                >
                  <Plus className="w-4 h-4" />
                  İlk Danışanı Ekle
                </motion.button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <ClientCard
                  client={client}
                  onClick={() => router.push(`/crocodil/danisman/${client.id}`)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
