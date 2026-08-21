import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import type {
  Client, Assessment, TherapySession, SMARTGoal, CrocodilSettings,
} from "./types";
import { format, parseISO, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";

// ── Font ──────────────────────────────────────────────────────
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

// ── Ortak Stiller ─────────────────────────────────────────────
const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Roboto", fontSize: 10, color: "#374151", lineHeight: 1.5 },
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: "#0d9488", paddingBottom: 10, marginBottom: 16 },
  headerLeft: {},
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0d9488" },
  headerSub: { fontSize: 8.5, color: "#6b7280", marginTop: 2 },
  headerRight: { alignItems: "flex-end" },
  headerMeta: { fontSize: 8.5, color: "#6b7280" },
  headerName: { fontSize: 10, fontWeight: "bold", color: "#111827" },
  // Section
  section: { marginTop: 12, marginBottom: 6 },
  sectionTitle: {
    fontSize: 11, fontWeight: "bold", color: "#0d9488",
    borderBottomWidth: 1, borderBottomColor: "#ccfbf1",
    paddingBottom: 3, marginBottom: 6,
  },
  // Row
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#6b7280", fontSize: 9.5 },
  value: { flex: 1, color: "#111827", fontWeight: "bold", fontSize: 9.5 },
  // Text
  paragraph: { marginBottom: 6, textAlign: "justify", fontSize: 9.5, lineHeight: 1.6 },
  // Badge
  badge: { fontSize: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 3 },
  // Progress bar
  barBg: { height: 5, backgroundColor: "#e5e7eb", borderRadius: 3, flex: 1, marginTop: 3 },
  barFill: { height: 5, borderRadius: 3 },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#f0fdf9", paddingVertical: 3, paddingHorizontal: 4, borderRadius: 3, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 2.5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6" },
  th: { fontWeight: "bold", color: "#374151", fontSize: 8.5 },
  td: { color: "#4b5563", fontSize: 8.5 },
  // Divider
  divider: { borderBottomWidth: 0.5, borderBottomColor: "#e5e7eb", marginVertical: 6 },
  // Footer
  footer: {
    position: "absolute", bottom: 20, left: 36, right: 36,
    fontSize: 7.5, color: "#9ca3af", textAlign: "center",
    borderTopWidth: 0.5, borderTopColor: "#e5e7eb", paddingTop: 6,
  },
  // Box
  box: { backgroundColor: "#f8fffe", borderRadius: 4, padding: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "#0d9488" },
  warnBox: { backgroundColor: "#fffbeb", borderRadius: 4, padding: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
});

// ── Yardımcı Bileşenler ───────────────────────────────────────
function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}:</Text>
      <Text style={s.value}>{String(value)}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function GoalProgressBar({ goal }: { goal: SMARTGoal }) {
  const pct = Math.min(goal.currentPercent, 100);
  const color = pct >= goal.targetPercent ? "#10b981" : "#0d9488";
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
        <Text style={{ fontSize: 9, color: "#374151", flex: 1 }}>{goal.description}</Text>
        <Text style={{ fontSize: 9, color, fontWeight: "bold", width: 50, textAlign: "right" }}>
          %{pct} / %{goal.targetPercent}
        </Text>
      </View>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Rapor Belge Props ─────────────────────────────────────────
interface ReportProps {
  client: Client;
  assessment?: Assessment;
  sessions?: TherapySession[];
  goals?: SMARTGoal[];
  settings?: CrocodilSettings | null;
  reportType: "assessment" | "progress" | "hep";
}

// ── DEĞERLENDİRME RAPORU ──────────────────────────────────────
function AssessmentReportContent({ client, assessment, settings }: {
  client: Client; assessment: Assessment; settings?: CrocodilSettings | null;
}) {
  const age = client.birthDate
    ? differenceInYears(new Date(), parseISO(client.birthDate))
    : null;
  const cats = assessment.selectedCategories ?? [];

  return (
    <>
      {/* Danışan Bilgileri */}
      <View style={s.section}>
        <SectionTitle>Danışan Bilgileri</SectionTitle>
        <View style={s.box}>
          <Row label="Ad Soyad" value={`${client.firstName} ${client.lastName}`} />
          <Row label="Yaş / Doğum Tarihi" value={age !== null
            ? `${age} yaş (${client.birthDate ? format(parseISO(client.birthDate), "dd.MM.yyyy") : ""})`
            : undefined} />
          <Row label="Cinsiyet" value={client.gender} />
          <Row label="Dominant El" value={client.handedness} />
          <Row label="Birincil Tanı" value={client.primaryDiagnosis} />
          <Row label="Sevk Kaynağı" value={client.referralSource} />
          <Row label="Sevk Tanısı" value={client.referralDiagnosis} />
          <Row label="Sigorta Türü" value={client.insuranceType} />
        </View>
      </View>

      {/* Değerlendirme Bilgileri */}
      <View style={s.section}>
        <SectionTitle>Değerlendirme Bilgileri</SectionTitle>
        <Row label="Değerlendirme Tarihi" value={format(parseISO(assessment.createdAt), "d MMMM yyyy", { locale: tr })} />
        <Row label="Değerlendiren" value={assessment.assessor || settings?.clinicianName} />
        <Row label="Değerlendirilen Alanlar" value={cats.join(", ")} />
        <Row label="Durum" value={assessment.status === "tamamlandı" ? "Tamamlandı" : "Devam Ediyor"} />
      </View>

      {/* Klinik Özet / Sonuç */}
      {assessment.conclusion?.editedSummary || assessment.conclusion?.aiSummary ? (
        <View style={s.section}>
          <SectionTitle>Klinik Özet</SectionTitle>
          <Text style={s.paragraph}>
            {assessment.conclusion.editedSummary ?? assessment.conclusion.aiSummary}
          </Text>
        </View>
      ) : null}

      {/* Öncelik Alanları */}
      {assessment.conclusion?.priorityAreas?.length > 0 && (
        <View style={s.section}>
          <SectionTitle>Öncelikli Müdahale Alanları</SectionTitle>
          {assessment.conclusion.priorityAreas.map((area: string, i: number) => (
            <Text key={i} style={{ ...s.paragraph, marginBottom: 2 }}>
              {i + 1}. {area}
            </Text>
          ))}
        </View>
      )}

      {/* Dil Değerlendirmesi */}
      {assessment.language && cats.includes("language") && (
        <View style={s.section}>
          <SectionTitle>Dil Değerlendirmesi</SectionTitle>
          {assessment.language.receptiveTests?.length > 0 && (
            <>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#374151", marginBottom: 3 }}>Alıcı Dil Testleri</Text>
              {assessment.language.receptiveTests.map((t: any, i: number) => (
                <View key={i} style={s.row}>
                  <Text style={{ ...s.td, flex: 2 }}>{t.testName}{t.subtestName ? ` — ${t.subtestName}` : ""}</Text>
                  {t.standardScore != null && <Text style={{ ...s.td, width: 60 }}>SS: {t.standardScore}</Text>}
                  {t.percentile != null && <Text style={{ ...s.td, width: 60 }}>%{t.percentile}</Text>}
                </View>
              ))}
            </>
          )}
          {assessment.language.receptiveNotes && <Text style={{ ...s.paragraph, marginTop: 4 }}>{assessment.language.receptiveNotes}</Text>}
          {assessment.language.mlu && <Row label="MLU" value={`${assessment.language.mlu} morfem`} />}
          {assessment.language.expressive_notes && <Text style={s.paragraph}>{assessment.language.expressive_notes}</Text>}
        </View>
      )}

      {/* Artikülasyon & Fonoloji */}
      {assessment.articulation && cats.includes("articulation") && (
        <View style={s.section}>
          <SectionTitle>Artikülasyon & Fonoloji Değerlendirmesi</SectionTitle>
          {assessment.articulation.intelligibilityFamiliar != null && (
            <Row label="Anlaşılırlık (Tanıdık)" value={`%${assessment.articulation.intelligibilityFamiliar}`} />
          )}
          {assessment.articulation.intelligibilityUnfamiliar != null && (
            <Row label="Anlaşılırlık (Yabancı)" value={`%${assessment.articulation.intelligibilityUnfamiliar}`} />
          )}
          {assessment.articulation.soundInventory?.filter((s: any) => s.status === "error").length > 0 && (
            <Row
              label="Hatalı Ünsüzler"
              value={assessment.articulation.soundInventory
                .filter((s: any) => s.status === "error")
                .map((s: any) => `/${s.sound}/${s.substitution ? `→/${s.substitution}/` : ""}`)
                .join(", ")}
            />
          )}
          {assessment.articulation.vowelInventory?.filter((v: any) => v.status === "error").length > 0 && (
            <Row
              label="Ünlü Bozulmaları"
              value={assessment.articulation.vowelInventory
                .filter((v: any) => v.status === "error")
                .map((v: any) => `/${v.sound}/ (${v.errorType || "bozulma"})`)
                .join(", ")}
            />
          )}
          {assessment.articulation.phonologicalProcesses?.length > 0 && (
            <Row label="Fonolojik Süreçler" value={assessment.articulation.phonologicalProcesses.join(", ")} />
          )}
          {assessment.articulation.stimulabilityNotes && <Row label="Stimülabilite" value={assessment.articulation.stimulabilityNotes} />}
          {assessment.articulation.notes && <Text style={s.paragraph}>{assessment.articulation.notes}</Text>}
        </View>
      )}

      {/* Motor Konuşma Değerlendirmesi */}
      {assessment.motorSpeech && cats.includes("motorSpeech") && (
        <View style={s.section}>
          <SectionTitle>Motor Konuşma Değerlendirmesi</SectionTitle>
          {assessment.motorSpeech.diagnosisType && (
            <Row label="Tanı / Profil" value={assessment.motorSpeech.diagnosisType} />
          )}
          {assessment.motorSpeech.dysarthriaType && (
            <Row label="Dizartri Alt Tipi" value={assessment.motorSpeech.dysarthriaType} />
          )}
          {assessment.motorSpeech.apraxiaType && (
            <Row label="Apraksi Sınıfı" value={assessment.motorSpeech.apraxiaType} />
          )}
          {assessment.motorSpeech.apraxiaFeatures?.length > 0 && (
            <Row label="Apraktik Bulgular" value={assessment.motorSpeech.apraxiaFeatures.join(", ")} />
          )}
          {assessment.motorSpeech.typicalMotorFeatures?.length > 0 && (
            <Row label="Gelişimsel Motor Etkilenme" value={assessment.motorSpeech.typicalMotorFeatures.join(", ")} />
          )}
          {(assessment.motorSpeech.ddkAmr != null || assessment.motorSpeech.ddkSmr != null) && (
            <Row
              label="Diadokokinetik (DDK)"
              value={`AMR: ${assessment.motorSpeech.ddkAmr ?? "—"} Hz | SMR: ${assessment.motorSpeech.ddkSmr ?? "—"} Hz (${assessment.motorSpeech.ddkRegularity || "düzenli"})`}
            />
          )}
          <Row
            label="5 Alt Sistem Profili"
            value={`Solunum: ${assessment.motorSpeech.respirationSupport || "normal"} | Fonasyon: ${assessment.motorSpeech.phonationQuality || "normal"} | Rezonans: ${assessment.motorSpeech.resonanceFunction || "normal"} | Artikülasyon: ${assessment.motorSpeech.articulationPrecision || "normal"} | Prosodi: ${assessment.motorSpeech.prosodyControl || "normal"}`}
          />
          {assessment.motorSpeech.m105SessionId && (
            <Row
              label="Modül 105 Sensör Ölçümü"
              value={`Çene ROM: ${assessment.motorSpeech.mandibularRomDeg ?? "—"}° | Masseter Asimetri: %${assessment.motorSpeech.semgAsymmetryPct ?? "—"} | Solunum: ${assessment.motorSpeech.respirationRateBpm ?? "—"} bpm`}
            />
          )}
          {assessment.motorSpeech.typicalMotorNotes && (
            <Text style={s.paragraph}>{assessment.motorSpeech.typicalMotorNotes}</Text>
          )}
          {assessment.motorSpeech.notes && <Text style={s.paragraph}>{assessment.motorSpeech.notes}</Text>}
        </View>
      )}

      {/* Ses */}
      {assessment.voice && cats.includes("voice") && (
        <View style={s.section}>
          <SectionTitle>Ses Değerlendirmesi</SectionTitle>
          {assessment.voice.grbasG != null && (
            <Row label="GRBAS Genel" value={`G:${assessment.voice.grbasG} R:${assessment.voice.grbasR} B:${assessment.voice.grbasB} A:${assessment.voice.grbasA} S:${assessment.voice.grbasS}`} />
          )}
          {assessment.voice.f0 != null && <Row label="Temel Frekans (F0)" value={`${assessment.voice.f0} Hz`} />}
          {assessment.voice.mpt != null && <Row label="Maksimum Fonasyon Süresi" value={`${assessment.voice.mpt} sn`} />}
          {assessment.voice.notes && <Text style={s.paragraph}>{assessment.voice.notes}</Text>}
        </View>
      )}

      {/* Akıcılık */}
      {assessment.fluency && cats.includes("fluency") && (
        <View style={s.section}>
          <SectionTitle>Akıcılık Değerlendirmesi</SectionTitle>
          {assessment.fluency.type && <Row label="Akıcısızlık Türü" value={assessment.fluency.type} />}
          {assessment.fluency.ssi4Total != null && <Row label="SSI-4 Toplam" value={`${assessment.fluency.ssi4Total} (${assessment.fluency.ssi4Severity})`} />}
          {assessment.fluency.sldPercent != null && <Row label="SLD Yüzdesi" value={`%${assessment.fluency.sldPercent}`} />}
          {assessment.fluency.notes && <Text style={s.paragraph}>{assessment.fluency.notes}</Text>}
        </View>
      )}

      {/* Yutma */}
      {assessment.dysphagia && cats.includes("dysphagia") && (
        <View style={s.section}>
          <SectionTitle>Yutma Değerlendirmesi</SectionTitle>
          {assessment.dysphagia.foisScore != null && <Row label="FOIS Düzeyi" value={assessment.dysphagia.foisScore} />}
          {assessment.dysphagia.eat10Total != null && <Row label="EAT-10 Toplam" value={assessment.dysphagia.eat10Total} />}
          {assessment.dysphagia.iddsiFoodLevel != null && <Row label="IDDSI Gıda Düzeyi" value={assessment.dysphagia.iddsiFoodLevel} />}
          {assessment.dysphagia.iddsiLiquidLevel != null && <Row label="IDDSI Sıvı Düzeyi" value={assessment.dysphagia.iddsiLiquidLevel} />}
          {assessment.dysphagia.notes && <Text style={s.paragraph}>{assessment.dysphagia.notes}</Text>}
        </View>
      )}

      {/* Afazi */}
      {assessment.aphasia && cats.includes("aphasia") && (
        <View style={s.section}>
          <SectionTitle>Afazi Değerlendirmesi</SectionTitle>
          {assessment.aphasia.aphasiaType && <Row label="Afazi Türü" value={assessment.aphasia.aphasiaType} />}
          {assessment.aphasia.wabAQ != null && <Row label="WAB-R AQ" value={assessment.aphasia.wabAQ} />}
          {assessment.aphasia.bntRawScore != null && <Row label="BNT Ham Puan" value={assessment.aphasia.bntRawScore} />}
          {assessment.aphasia.notes && <Text style={s.paragraph}>{assessment.aphasia.notes}</Text>}
        </View>
      )}

      {/* ICF Profili */}
      {assessment.icf && (assessment.icf.bodyFunctions?.length > 0 || assessment.icf.activities?.length > 0) && (
        <View style={s.section}>
          <SectionTitle>ICF Profili</SectionTitle>
          {assessment.icf.bodyFunctions?.slice(0, 6).map((c: any, i: number) => (
            <Text key={i} style={{ ...s.td, marginBottom: 2 }}>
              • {c.code} — {c.label} (Niteleyici: .{c.qualifier})
            </Text>
          ))}
        </View>
      )}

      {/* SMART Hedefler */}
      {assessment.conclusion?.smartGoals?.length > 0 && (
        <View style={s.section}>
          <SectionTitle>Terapi Hedefleri (SMART)</SectionTitle>
          {assessment.conclusion.smartGoals.map((g: any, i: number) => (
            <View key={i} style={{ ...s.box, marginBottom: 5 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#0d9488", marginBottom: 2 }}>Hedef {i + 1}</Text>
              <Text style={{ fontSize: 9, color: "#374151" }}>{g.description}</Text>
              {g.deadline && <Text style={{ fontSize: 8.5, color: "#6b7280", marginTop: 2 }}>Hedef Tarihi: {g.deadline}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Öneriler */}
      {assessment.conclusion?.referrals && (
        <View style={s.section}>
          <SectionTitle>Yönlendirmeler ve Öneriler</SectionTitle>
          <Text style={s.paragraph}>{assessment.conclusion.referrals}</Text>
        </View>
      )}

      {/* Terapist Notları */}
      {assessment.conclusion?.parentRecommendations && (
        <View style={[s.warnBox, { marginTop: 8 }]}>
          <Text style={{ fontSize: 9, fontWeight: "bold", color: "#b45309", marginBottom: 4 }}>Ebeveyn / Bakıcı Önerileri</Text>
          <Text style={{ fontSize: 9, color: "#374151" }}>{assessment.conclusion.parentRecommendations}</Text>
        </View>
      )}
    </>
  );
}

// ── İLERLEME RAPORU ──────────────────────────────────────────
function ProgressReportContent({ client, sessions, goals, settings }: {
  client: Client; sessions: TherapySession[]; goals: SMARTGoal[];
  settings?: CrocodilSettings | null;
}) {
  const activeGoals = goals.filter(g => g.status === "aktif");
  const completedGoals = goals.filter(g => g.status === "tamamlandı");
  const totalSessions = sessions.length;

  return (
    <>
      <View style={s.section}>
        <SectionTitle>Terapi Özeti</SectionTitle>
        <View style={s.box}>
          <Row label="Danışan" value={`${client.firstName} ${client.lastName}`} />
          <Row label="Toplam Seans Sayısı" value={totalSessions} />
          <Row label="İlk Seans" value={sessions.length > 0 ? format(parseISO(sessions[sessions.length - 1].sessionDate), "d MMMM yyyy", { locale: tr }) : undefined} />
          <Row label="Son Seans" value={sessions.length > 0 ? format(parseISO(sessions[0].sessionDate), "d MMMM yyyy", { locale: tr }) : undefined} />
          <Row label="Raporlayan" value={settings?.clinicianName} />
          <Row label="Rapor Tarihi" value={format(new Date(), "d MMMM yyyy", { locale: tr })} />
        </View>
      </View>

      {/* Aktif Hedefler */}
      {activeGoals.length > 0 && (
        <View style={s.section}>
          <SectionTitle>Aktif Hedefler ve İlerleme</SectionTitle>
          {activeGoals.map(g => <GoalProgressBar key={g.id} goal={g} />)}
        </View>
      )}

      {/* Tamamlanan Hedefler */}
      {completedGoals.length > 0 && (
        <View style={s.section}>
          <SectionTitle>Tamamlanan Hedefler ✓</SectionTitle>
          {completedGoals.map(g => (
            <View key={g.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ ...s.td, flex: 1 }}>{g.description}</Text>
              <Text style={{ fontSize: 8.5, color: "#10b981", fontWeight: "bold" }}>✓ Tamamlandı</Text>
            </View>
          ))}
        </View>
      )}

      {/* Son 5 Seans */}
      {sessions.slice(0, 5).length > 0 && (
        <View style={s.section}>
          <SectionTitle>Son Seans Notları</SectionTitle>
          {sessions.slice(0, 5).map(sess => (
            <View key={sess.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 9, fontWeight: "bold", color: "#374151" }}>
                  Seans #{sess.sessionNumber} — {format(parseISO(sess.sessionDate), "d MMMM yyyy", { locale: tr })}
                </Text>
                <Text style={{ fontSize: 8.5, color: "#6b7280" }}>{sess.durationMinutes} dk</Text>
              </View>
              {sess.clinicianNotes && (
                <Text style={{ fontSize: 9, color: "#4b5563", marginTop: 2 }}>{sess.clinicianNotes}</Text>
              )}
              {sess.goalProgress.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 3, gap: 4 }}>
                  {sess.goalProgress.map(gp => {
                    const goal = goals.find(g => g.id === gp.goalId);
                    return goal ? (
                      <Text key={gp.goalId} style={{ fontSize: 8, color: "#0d9488" }}>
                        %{gp.accuracyPercent}
                      </Text>
                    ) : null;
                  })}
                </View>
              )}
              <View style={s.divider} />
            </View>
          ))}
        </View>
      )}
    </>
  );
}

// ── EV EGZERSİZ PROGRAMI RAPORU ───────────────────────────────
function HEPReportContent({ client, sessions }: { client: Client; sessions: TherapySession[] }) {
  // En son seansın HEP'ini al
  const lastSessionWithHep = sessions.find(s => s.hep?.exercises?.length);
  const hep = lastSessionWithHep?.hep;
  const lastSession = sessions[0];

  return (
    <>
      <View style={[s.warnBox, { marginBottom: 12 }]}>
        <Text style={{ fontSize: 10, fontWeight: "bold", color: "#b45309", marginBottom: 3 }}>
          Sayın {client.parentName ?? `${client.firstName} ${client.lastName}`},
        </Text>
        <Text style={{ fontSize: 9.5, color: "#374151" }}>
          Aşağıdaki egzersizler, dil ve konuşma terapistiniz tarafından seanslarınız arasında uygulamanız amacıyla hazırlanmıştır.
          Düzenli uygulama, terapötik ilerleme için kritik öneme sahiptir.
        </Text>
      </View>

      <View style={s.section}>
        <SectionTitle>Danışan Bilgileri</SectionTitle>
        <Row label="Ad Soyad" value={`${client.firstName} ${client.lastName}`} />
        {client.parentName && <Row label="Ebeveyn / Bakıcı" value={client.parentName} />}
        {lastSession && <Row label="Program Tarihi" value={format(parseISO(lastSession.sessionDate), "d MMMM yyyy", { locale: tr })} />}
      </View>

      {hep ? (
        <>
          {hep.frequency && (
            <View style={s.section}>
              <SectionTitle>Program Bilgileri</SectionTitle>
              <Row label="Uygulama Sıklığı" value={hep.frequency} />
              <Row label="Seans Süresi" value={hep.duration} />
              {hep.notes && <Text style={{ ...s.paragraph, marginTop: 4 }}>{hep.notes}</Text>}
            </View>
          )}

          <View style={s.section}>
            <SectionTitle>Egzersizler</SectionTitle>
            {hep.exercises.map((ex, i) => (
              <View key={i} style={[s.box, { marginBottom: 8 }]}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: "#0d9488", marginBottom: 4 }}>
                  {i + 1}. {ex.name}
                </Text>
                <Text style={{ fontSize: 9.5, color: "#374151", marginBottom: 4 }}>{ex.description}</Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {ex.sets && <Text style={{ fontSize: 9, color: "#6b7280" }}>Set: {ex.sets}</Text>}
                  {ex.reps && <Text style={{ fontSize: 9, color: "#6b7280" }}>Tekrar: {ex.reps}</Text>}
                  {ex.frequency && <Text style={{ fontSize: 9, color: "#6b7280" }}>Sıklık: {ex.frequency}</Text>}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={s.section}>
          <Text style={{ fontSize: 10, color: "#6b7280", textAlign: "center" }}>
            Henüz bir ev egzersiz programı tanımlanmamıştır.
          </Text>
        </View>
      )}

      <View style={[s.warnBox, { marginTop: 12 }]}>
        <Text style={{ fontSize: 9, fontWeight: "bold", color: "#b45309", marginBottom: 2 }}>Önemli Not</Text>
        <Text style={{ fontSize: 9, color: "#374151" }}>
          Bu egzersizler yalnızca klinisyeninizin rehberliğinde uygulanmalıdır.
          Ağrı veya rahatsızlık hissinde uygulamayı durdurun ve terapistinize bilgi verin.
        </Text>
      </View>
    </>
  );
}

// ── ANA BELGE BİLEŞENİ ───────────────────────────────────────
export const ClinicalReportDocument = ({
  client, assessment, sessions, goals, settings, reportType,
}: ReportProps) => {
  const reportTitles = {
    assessment: "Klinik Değerlendirme Raporu",
    progress: "Terapi İlerleme Raporu",
    hep: "Ev Egzersiz Programı",
  };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>{reportTitles[reportType]}</Text>
            <Text style={s.headerSub}>Medikal Dil ve Konuşma Terapisi</Text>
          </View>
          <View style={s.headerRight}>
            {settings?.clinicianName && <Text style={s.headerName}>{settings.clinicianName}</Text>}
            <Text style={s.headerMeta}>Dil ve Konuşma Terapisti</Text>
            {settings?.clinicName && <Text style={s.headerMeta}>{settings.clinicName}</Text>}
            <Text style={s.headerMeta}>
              {format(new Date(), "d MMMM yyyy", { locale: tr })}
            </Text>
          </View>
        </View>

        {/* İçerik */}
        {reportType === "assessment" && assessment && (
          <AssessmentReportContent client={client} assessment={assessment} settings={settings} />
        )}
        {reportType === "progress" && sessions && goals && (
          <ProgressReportContent client={client} sessions={sessions} goals={goals} settings={settings} />
        )}
        {reportType === "hep" && sessions && (
          <HEPReportContent client={client} sessions={sessions} />
        )}

        {/* Footer */}
        <Text style={s.footer} fixed>
          Bu rapor Crocodil Medikal Dil ve Konuşma Terapisi Sistemi aracılığıyla oluşturulmuştur.
          {settings?.clinicName ? ` | ${settings.clinicName}` : ""}{" "}
          | Sayfa {"{"}<Text render={({ pageNumber }) => pageNumber} />{"}"} / {"{"}<Text render={({ totalPages }) => totalPages} />{"}"} 
        </Text>
      </Page>
    </Document>
  );
};
