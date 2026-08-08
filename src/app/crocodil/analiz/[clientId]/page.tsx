"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getClient, getGoals, getSessions } from "@/lib/crocodil/storage";
import type { SMARTGoal, TherapySession, Client } from "@/lib/crocodil/types";
import { ArrowLeft, Target, TrendingUp, BarChart3, Activity } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from "recharts";

export default function AnalizPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [goals, setGoals] = useState<SMARTGoal[]>([]);
  const [sessions, setSessions] = useState<TherapySession[]>([]);

  useEffect(() => {
    if (!clientId) return;
    const c = getClient(clientId);
    if (!c) { router.push("/crocodil/danisman"); return; }
    setClient(c);
    setGoals(getGoals(clientId));
    
    // Seansları tarih sırasına göre sırala
    const sess = getSessions(clientId).sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
    setSessions(sess);
  }, [clientId]);

  if (!client) return null;

  // Recharts için veri hazırlama
  const chartData = sessions.map((s, i) => {
    const dataPoint: any = {
      name: `S${s.sessionNumber}`, // Seans 1, Seans 2 vb.
      date: format(parseISO(s.sessionDate), "d MMM", { locale: tr }),
      fullDate: s.sessionDate,
    };
    
    // Her aktif hedefin bu seanstaki başarısını ekle
    goals.forEach(g => {
      const prog = s.goalProgress.find(p => p.goalId === g.id);
      if (prog) {
        dataPoint[`goal_${g.id}`] = prog.accuracyPercent;
      }
    });
    
    return dataPoint;
  });

  const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#10b981"];

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center gap-3">
          <Link href={`/crocodil/danisman/${clientId}`}>
            <button className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb" }}>
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Klinik Analiz & İlerleme</h1>
            <p className="text-xs text-gray-400">{client.firstName} {client.lastName}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 max-w-5xl mx-auto w-full space-y-5">
        
        {sessions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Analiz için yeterli seans verisi yok.</p>
            <p className="text-sm mt-2">En az 1 terapi seansı kaydettikten sonra grafikler oluşacaktır.</p>
          </div>
        ) : (
          <>
            {/* Üst İstatistikler */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><Activity className="w-4 h-4 text-teal-500"/>Toplam Seans</div>
                <div className="text-2xl font-bold text-teal-700">{sessions.length}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500"/>Aktif Hedef</div>
                <div className="text-2xl font-bold text-blue-700">{goals.filter(g => g.status === "aktif").length}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-500"/>Ulaşılan Hedef</div>
                <div className="text-2xl font-bold text-purple-700">{goals.filter(g => g.status === "tamamlandı").length}</div>
              </div>
              <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-2">Ort. Seans Süresi</div>
                <div className="text-2xl font-bold text-gray-700">
                  {Math.round(sessions.reduce((acc, s) => acc + s.durationMinutes, 0) / sessions.length)} dk
                </div>
              </div>
            </div>

            {/* İlerleme Grafiği (Line Chart) */}
            <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5f7f5" }}>
              <div className="font-bold text-gray-800 mb-1">Seans Bazlı Hedef Doğruluğu (%)</div>
              <p className="text-xs text-gray-400 mb-6">Her bir terapötik hedef için seanslardaki başarı yüzdesi değişimi</p>
              
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                      labelStyle={{ fontWeight: "bold", color: "#374151", marginBottom: "4px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                    
                    {goals.map((goal, index) => (
                      <Line 
                        key={goal.id} 
                        type="monotone" 
                        dataKey={`goal_${goal.id}`} 
                        name={goal.description.substring(0, 30) + "..."} 
                        stroke={COLORS[index % COLORS.length]} 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Teknik ve Müdahale Analizi */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="font-bold text-gray-800 mb-1">En Sık Kullanılan Teknikler</div>
                <div className="space-y-3 mt-4">
                  {Object.entries(
                    sessions.flatMap(s => s.techniquesUsed).reduce((acc, curr) => {
                      acc[curr] = (acc[curr] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([tech, count], i) => (
                    <div key={tech} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{tech}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(count / sessions.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-4">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: "#e5f7f5" }}>
                <div className="font-bold text-gray-800 mb-1">Güncel Hedef Durumları</div>
                <div className="space-y-4 mt-4">
                  {goals.map((goal) => {
                    // Son seanstaki başarıyı bul
                    let lastProgress = 0;
                    for (let i = sessions.length - 1; i >= 0; i--) {
                      const gp = sessions[i].goalProgress.find(p => p.goalId === goal.id);
                      if (gp) {
                        lastProgress = gp.accuracyPercent;
                        break;
                      }
                    }
                    
                    const isMet = lastProgress >= goal.targetPercent;
                    
                    return (
                      <div key={goal.id} className="border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: "#f3f4f6" }}>
                        <p className="text-sm text-gray-700 mb-1 leading-tight">{goal.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">Hedef: %{goal.targetPercent}</div>
                          <div className="text-xs font-bold flex items-center gap-1" style={{ color: isMet ? "#10b981" : "#3b82f6" }}>
                            Son Ölçüm: %{lastProgress}
                            {isMet && <CheckCircle2 className="w-3 h-3" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Add CheckCircle2 to lucide imports at the top if missing
import { CheckCircle2 } from "lucide-react";
