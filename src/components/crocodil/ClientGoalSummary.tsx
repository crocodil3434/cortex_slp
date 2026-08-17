"use client";

import React from "react";
import { Target, CheckCircle2, Circle } from "lucide-react";
import type { SMARTGoal } from "@/lib/crocodil/types";

export function ClientGoalSummary({ goals }: { goals: SMARTGoal[] }) {
  const activeGoals = goals.filter(g => g.status === "aktif");
  const completedGoals = goals.filter(g => g.status === "tamamlandı");

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#f0fdf9" }}>
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "#f0fdf9", background: "#f8fffe" }}>
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <Target className="w-4 h-4 text-teal-600" />
          Klinik Hedefler
        </div>
        <div className="text-xs font-medium text-gray-500">
          <span className="text-teal-600 font-bold">{completedGoals.length}</span> tamamlandı,{" "}
          <span className="text-blue-600 font-bold">{activeGoals.length}</span> aktif
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeGoals.length === 0 && completedGoals.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Henüz hedef tanımlanmamış.</p>
        ) : null}

        {/* Aktif Hedefler */}
        {activeGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Devam Eden Hedefler</h4>
            {activeGoals.map(goal => (
              <div key={goal.id} className="group">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-medium text-gray-700 leading-snug">{goal.description}</p>
                    {goal.icfCode && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 mt-1 inline-block">
                        {goal.icfCode}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: goal.currentPercent >= goal.targetPercent ? "#10b981" : "#0d9488" }}>
                      %{goal.currentPercent}
                    </span>
                    <span className="text-xs text-gray-400 block">Hedef: %{goal.targetPercent}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${goal.currentPercent}%`,
                      background: goal.currentPercent >= goal.targetPercent ? "#10b981" : "linear-gradient(90deg, #14b8a6, #0d9488)"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tamamlanan Hedefler (Özet) */}
        {completedGoals.length > 0 && (
          <div className="space-y-2 mt-4 pt-4 border-t" style={{ borderColor: "#f9fafb" }}>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tamamlanan Hedefler</h4>
            <div className="flex flex-col gap-1.5">
              {completedGoals.map(goal => (
                <div key={goal.id} className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="truncate flex-1">{goal.description}</span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    %{goal.currentPercent} Başarı
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
