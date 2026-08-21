"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getClients, saveClient, deleteClient } from "@/lib/crocodil/storage";
import type { Client } from "@/lib/crocodil/types";
import {
  Search, Plus, Filter, Users, ChevronRight, Calendar,
  Clock, AlertCircle, LayoutGrid, List, Trash2, CheckCircle2,
  MoreVertical, Edit, Sparkles
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { useToast } from "@/components/crocodil/Toast";
import { useConfirm } from "@/components/crocodil/ConfirmModal";

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

function DanismanListeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get("status") as Client["status"]) || "tümü";

  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tümü" | Client["status"]>(initialStatus);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const { success: toastSuccess, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Hızlı Durum Değiştirme
  const handleQuickStatusChange = async (e: React.MouseEvent, client: Client, newStatus: Client["status"]) => {
    e.stopPropagation();
    try {
      const updated = await saveClient({ ...client, status: newStatus });
      setClients((prev) => prev.map((c) => (c.id === client.id ? updated : c)));
      toastSuccess(`${client.firstName} durumu "${newStatus}" olarak güncellendi`);
    } catch (err: any) {
      toastError("Durum güncellenemedi: " + (err.message || ""));
    }
  };

  // Hızlı Danışan Silme
  const handleDeleteClient = async (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    if (await confirm({
      title: `${client.firstName} ${client.lastName} adlı danışanı silmek istiyor musunuz?`,
      message: "Bu işlem geri alınamaz. Danışana ait tüm seanslar, değerlendirmeler, hedefler ve dosyalar kalıcı olarak silinecektir.",
      danger: true,
    })) {
      try {
        await deleteClient(client.id);
        setClients((prev) => prev.filter((c) => c.id !== client.id));
        toastSuccess("Danışan başarıyla silindi");
      } catch (err: any) {
        toastError("Danışan silinirken hata oluştu: " + (err.message || ""));
      }
    }
  };

  const activeCount = clients.filter((c) => c.status === "aktif").length;
  const passiveCount = clients.filter((c) => c.status === "pasif").length;
  const completedCount = clients.filter((c) => c.status === "tamamlandı").length;

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    const matchSearch = !query ||
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.primaryDiagnosis?.toLowerCase().includes(q) ||
      c.referralDiagnosis?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "tümü" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Danışanlar</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeCount} aktif · {passiveCount} pasif · {completedCount} tamamlandı · {clients.length} toplam
            </p>
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

        {/* Arama + Filtre + Görünüm Seçici */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ad, soyad veya tanı ara..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-teal-400 transition-colors"
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* İnteraktif Durum Filtre Butonları */}
            <div className="flex rounded-xl overflow-hidden border bg-white" style={{ borderColor: "#e5e7eb" }}>
              {[
                { key: "tümü", label: "Tümü", count: clients.length },
                { key: "aktif", label: "Aktif", count: activeCount },
                { key: "pasif", label: "Pasif", count: passiveCount },
                { key: "tamamlandı", label: "Tamamlandı", count: completedCount },
              ].map((tab) => {
                const isSelected = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key as any)}
                    className="px-3 py-2 text-xs font-semibold transition-all flex items-center gap-1.5"
                    style={{
                      background: isSelected ? "#0d9488" : "transparent",
                      color: isSelected ? "white" : "#4b5563",
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Görünüm Geçişi */}
            <div className="flex rounded-xl overflow-hidden border bg-white" style={{ borderColor: "#e5e7eb" }}>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-teal-50 text-teal-600" : "text-gray-400 hover:bg-gray-50"}`}
                title="Kart Görünümü"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <div className="w-px bg-gray-200" />
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 transition-colors ${viewMode === "table" ? "bg-teal-50 text-teal-600" : "text-gray-400 hover:bg-gray-50"}`}
                title="Tablo Görünümü"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">👥</div>
            <p className="font-medium text-gray-600">
              {query ? "Arama sonucu bulunamadı" : "Seçili filtrede danışan bulunamadı"}
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
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((client, i) => {
              const color = getAvatarColor(client.id);
              const status = STATUS_CONFIG[client.status];
              const age = client.birthDate
                ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / 31557600000)
                : null;

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => router.push(`/crocodil/danisman/${client.id}`)}
                  className="bg-white rounded-2xl p-4 border cursor-pointer transition-all hover:shadow-md group relative"
                  style={{ borderColor: "#f0fdf9" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                    >
                      {client.avatarInitials ?? "??"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
                            {client.firstName} {client.lastName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {age !== null && <span className="text-xs text-gray-400">{age} yaş</span>}
                            {client.primaryDiagnosis && (
                              <>
                                <span className="text-gray-200">·</span>
                                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                  {client.primaryDiagnosis}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Durum Seçici Dropdown */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={client.status}
                            onChange={(e) => handleQuickStatusChange(e as any, client, e.target.value as any)}
                            className="text-xs font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-all"
                            style={{
                              background: status.bg,
                              color: status.color,
                              borderColor: status.border,
                            }}
                          >
                            <option value="aktif">Aktif</option>
                            <option value="pasif">Pasif</option>
                            <option value="tamamlandı">Tamamlandı</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs text-gray-400 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          {client.createdAt && (
                            <span className="text-[11px]">
                              {format(parseISO(client.createdAt), "d MMM yy", { locale: tr })}
                            </span>
                          )}
                        </div>

                        {/* Hızlı Butonlar */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/crocodil/danisman/${client.id}/duzenle`);
                            }}
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="Düzenle"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClient(e, client)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Danışanı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: "#f0fdf9" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ borderColor: "#f0fdf9" }}>
                    <th className="px-5 py-3">Danışan</th>
                    <th className="px-5 py-3">Yaş/Cinsiyet</th>
                    <th className="px-5 py-3">Ön Tanı</th>
                    <th className="px-5 py-3">Kayıt Tarihi</th>
                    <th className="px-5 py-3">Durum</th>
                    <th className="px-5 py-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm" style={{ borderColor: "#f9fafb" }}>
                  {filtered.map((client) => {
                    const status = STATUS_CONFIG[client.status];
                    const color = getAvatarColor(client.id);
                    const age = client.birthDate ? Math.floor((Date.now() - new Date(client.birthDate).getTime()) / 31557600000) : null;

                    return (
                      <tr
                        key={client.id}
                        onClick={() => router.push(`/crocodil/danisman/${client.id}`)}
                        className="hover:bg-teal-50/30 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
                          >
                            {client.avatarInitials ?? "??"}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{client.firstName} {client.lastName}</div>
                            {client.phone && <div className="text-xs text-gray-400">{client.phone}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {age !== null ? `${age} yaş` : "—"}<br />
                          <span className="text-xs text-gray-400 capitalize">{client.gender || "—"}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-gray-700">{client.primaryDiagnosis || "—"}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          {client.createdAt ? format(parseISO(client.createdAt), "d MMM yyyy", { locale: tr }) : "—"}
                        </td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={client.status}
                            onChange={(e) => handleQuickStatusChange(e as any, client, e.target.value as any)}
                            className="text-xs font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-none transition-all"
                            style={{
                              background: status.bg,
                              color: status.color,
                              borderColor: status.border,
                            }}
                          >
                            <option value="aktif">Aktif</option>
                            <option value="pasif">Pasif</option>
                            <option value="tamamlandı">Tamamlandı</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => router.push(`/crocodil/danisman/${client.id}/duzenle`)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClient(e, client)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Danışanı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DanismanListePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Yükleniyor...</div>}>
      <DanismanListeContent />
    </Suspense>
  );
}
