"use client";

import React, { useState } from "react";
import { Target, CheckCircle2, Circle, Plus, Trash2, Edit3, ArrowUpRight, Check } from "lucide-react";
import type { SMARTGoal } from "@/lib/crocodil/types";
import { saveGoal, deleteGoal } from "@/lib/crocodil/storage";
import { useToast } from "@/components/crocodil/Toast";

export function ClientGoalSummary({
  goals,
  clientId,
  onRefresh,
}: {
  goals: SMARTGoal[];
  clientId?: string;
  onRefresh?: () => void;
}) {
  const activeGoals = goals.filter((g) => g.status === "aktif");
  const completedGoals = goals.filter((g) => g.status === "tamamlandı");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newIcf, setNewIcf] = useState("");
  const [newTarget, setNewTarget] = useState(80);
  const [saving, setSaving] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    if (!newDesc.trim()) {
      toastError("Eksik Bilgi", "Lütfen hedef açıklamasını giriniz.");
      return;
    }

    setSaving(true);
    try {
      await saveGoal({
        clientId,
        description: newDesc.trim(),
        icfCode: newIcf.trim() || undefined,
        targetPercent: Number(newTarget) || 80,
        currentPercent: 0,
        domain: "bodyFunction",
        status: "aktif",
      });
      toastSuccess("Hedef Eklendi", "Yeni klinik terapi hedefi başarıyla kaydedildi.");
      setNewDesc("");
      setNewIcf("");
      setNewTarget(80);
      setShowAddForm(false);
      onRefresh?.();
    } catch (err: any) {
      toastError("Hata", err.message || "Hedef kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (goal: SMARTGoal) => {
    const nextStatus = goal.status === "aktif" ? "tamamlandı" : "aktif";
    const nextPercent = nextStatus === "tamamlandı" ? Math.max(goal.currentPercent, goal.targetPercent) : goal.currentPercent;
    try {
      await saveGoal({
        ...goal,
        status: nextStatus,
        currentPercent: nextPercent,
      });
      toastSuccess("Hedef Güncellendi", `Hedef durumu "${nextStatus}" olarak güncellendi.`);
      onRefresh?.();
    } catch (err: any) {
      toastError("Hata", err.message || "Hedef güncellenemedi.");
    }
  };

  const handleUpdatePercent = async (goal: SMARTGoal, delta: number) => {
    const nextPercent = Math.max(0, Math.min(100, goal.currentPercent + delta));
    const nextStatus = nextPercent >= goal.targetPercent ? "tamamlandı" : goal.status;
    try {
      await saveGoal({
        ...goal,
        currentPercent: nextPercent,
        status: nextStatus,
      });
      onRefresh?.();
    } catch (err: any) {
      toastError("Hata", err.message || "İlerleme kaydedilemedi.");
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!window.confirm("Bu hedefi silmek istediğinize emin misiniz?")) return;
    try {
      await deleteGoal(goalId);
      toastSuccess("Hedef Silindi", "Klinik hedef başarıyla kaldırıldı.");
      onRefresh?.();
    } catch (err: any) {
      toastError("Hata", err.message || "Hedef silinemedi.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0fdf9" }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#f0fdf9", background: "#f8fffe" }}>
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Target className="w-4 h-4 text-teal-600" />
          Klinik Hedefler & SMART Terapi Planı
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-gray-500">
            <span className="text-teal-600 font-bold">{completedGoals.length}</span> tamamlandı,{" "}
            <span className="text-blue-600 font-bold">{activeGoals.length}</span> aktif
          </div>
          {clientId && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? "Vazgeç" : "Yeni Hedef Ekle"}
            </button>
          )}
        </div>
      </div>

      {/* Manuel Yeni Hedef Ekleme Formu */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className="p-4 bg-teal-50/50 border-b border-teal-100 space-y-3">
          <div className="font-bold text-xs text-teal-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            Yeni SMART / ICF Hedefi Tanımla
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Hedef açıklaması (Örn: /r/ sesini sözcük başında %80 doğrulukla üretir)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:border-teal-500"
                required
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="ICF Kodu (Örn: b320)"
                value={newIcf}
                onChange={(e) => setNewIcf(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <input
                type="number"
                min={1}
                max={100}
                placeholder="Hedef % (80)"
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-teal-200 bg-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-sm"
            >
              {saving ? "Kaydediliyor..." : "Hedefi Kaydet"}
            </button>
          </div>
        </form>
      )}

      <div className="p-4 space-y-4">
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">Henüz danışana atanmış klinik hedef bulunmuyor.</p>
            <p className="text-xs text-gray-400 mt-1">
              Değerlendirme formundan veya yukarıdaki <strong>"+ Yeni Hedef Ekle"</strong> butonundan hedef tanımlayabilirsiniz.
            </p>
          </div>
        ) : null}

        {/* Aktif Hedefler */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Devam Eden Hedefler</h4>
            {activeGoals.map((goal) => (
              <div key={goal.id} className="p-3 rounded-xl border border-gray-100 hover:border-teal-200 transition-all bg-white group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-gray-800 leading-snug">{goal.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {goal.icfCode && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-100 inline-block">
                          ICF: {goal.icfCode}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        Hedef Kriteri: %{goal.targetPercent} Doğruluk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-base font-extrabold" style={{ color: goal.currentPercent >= goal.targetPercent ? "#10b981" : "#0d9488" }}>
                        %{goal.currentPercent}
                      </span>
                      <span className="text-[10px] text-gray-400 block">Başarı</span>
                    </div>
                    {/* Hızlı İlerleme & Aksiyon Butonları */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="İlerlemeyi +%10 artır"
                        onClick={() => handleUpdatePercent(goal, 10)}
                        className="w-6 h-6 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-bold flex items-center justify-center border border-teal-200"
                      >
                        +10
                      </button>
                      <button
                        title="Tamamlandı olarak işaretle"
                        onClick={() => handleToggleStatus(goal)}
                        className="w-6 h-6 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs flex items-center justify-center border border-green-200"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Hedefi sil"
                        onClick={() => handleDelete(goal.id)}
                        className="w-6 h-6 rounded-md bg-red-50 text-red-500 hover:bg-red-100 text-xs flex items-center justify-center border border-red-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, goal.currentPercent)}%`,
                      background: goal.currentPercent >= goal.targetPercent ? "#10b981" : "linear-gradient(90deg, #14b8a6, #0d9488)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tamamlanan Hedefler */}
        {completedGoals.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: "#f9fafb" }}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tamamlanan Hedefler</h4>
            <div className="flex flex-col gap-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div className="flex items-center gap-2 flex-1 pr-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-medium text-gray-700">{goal.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-700 bg-green-100/70 px-2 py-0.5 rounded-full text-[11px]">
                      %{goal.currentPercent} Başarı
                    </span>
                    <button
                      title="Hedefi tekrar aktife al"
                      onClick={() => handleToggleStatus(goal)}
                      className="text-[10px] text-gray-500 hover:text-teal-700 underline ml-1"
                    >
                      Aktif Yap
                    </button>
                    <button
                      title="Sil"
                      onClick={() => handleDelete(goal.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
