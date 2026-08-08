import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { Client, Assessment, TherapySession, SMARTGoal } from "./types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

// Font yükleme (Türkçe karakter desteği için)
Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
  fontWeight: "normal",
});

Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
  fontWeight: "bold",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 11,
    lineHeight: 1.5,
    color: "#374151",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#0d9488",
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0d9488",
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    backgroundColor: "#f0fdf9",
    padding: 4,
    marginTop: 15,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontWeight: "bold",
    color: "#4b5563",
  },
  value: {
    flex: 1,
  },
  textBlock: {
    marginBottom: 10,
    textAlign: "justify",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

interface ReportProps {
  client: Client;
  assessment?: Assessment;
  clinicianName: string;
  clinicName?: string;
  reportType: "assessment" | "progress";
  sessions?: TherapySession[];
  goals?: SMARTGoal[];
}

export const ClinicalReportDocument = ({
  client,
  assessment,
  clinicianName,
  clinicName,
  reportType,
  sessions,
  goals,
}: ReportProps) => {
  const age = client.birthDate ? new Date().getFullYear() - new Date(client.birthDate).getFullYear() : "";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {reportType === "assessment" ? "Klinik Değerlendirme Raporu" : "Terapi İlerleme Raporu"}
            </Text>
            <Text style={styles.subtitle}>Medikal Dil ve Konuşma Terapisi</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontWeight: "bold" }}>{clinicianName}</Text>
            <Text style={{ fontSize: 10 }}>Dil ve Konuşma Terapisti</Text>
            {clinicName && <Text style={{ fontSize: 10 }}>{clinicName}</Text>}
            <Text style={{ fontSize: 10, marginTop: 4 }}>
              Tarih: {format(new Date(), "d MMMM yyyy", { locale: tr })}
            </Text>
          </View>
        </View>

        {/* Danışan Bilgileri */}
        <View>
          <Text style={styles.sectionTitle}>Danışan Bilgileri</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Ad Soyad:</Text>
            <Text style={styles.value}>{client.firstName} {client.lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Yaş / Doğum T.:</Text>
            <Text style={styles.value}>{age} yaş ({client.birthDate ? format(parseISO(client.birthDate), "dd.MM.yyyy") : "—"})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tanı / Şikayet:</Text>
            <Text style={styles.value}>{client.primaryDiagnosis || "—"}</Text>
          </View>
        </View>

        {/* Değerlendirme Raporu İçeriği */}
        {reportType === "assessment" && assessment && (
          <View>
            {assessment.conclusion?.summary && (
              <View>
                <Text style={styles.sectionTitle}>Klinik Özet</Text>
                <Text style={styles.textBlock}>{assessment.conclusion.summary}</Text>
              </View>
            )}

            {assessment.conclusion?.clinicalImpression && (
              <View>
                <Text style={styles.sectionTitle}>Klinik İzlenim & Prognoz</Text>
                <Text style={styles.textBlock}>{assessment.conclusion.clinicalImpression}</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Prognoz:</Text>
                  <Text style={styles.value}>(+) {assessment.conclusion.prognosis?.toUpperCase()}</Text>
                </View>
              </View>
            )}

            {assessment.icf && assessment.icf.codes.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>ICF Profili</Text>
                {assessment.icf.codes.map((c, i) => (
                  <Text key={i} style={{ marginBottom: 2 }}>• {c.code} (Şiddet: .{c.qualifier}) {c.notes ? `- ${c.notes}` : ""}</Text>
                ))}
              </View>
            )}

            {assessment.conclusion?.recommendation && (
              <View>
                <Text style={styles.sectionTitle}>Öneriler</Text>
                <Text style={styles.textBlock}>{assessment.conclusion.recommendation}</Text>
                {assessment.conclusion.referrals && (
                  <Text style={{ ...styles.textBlock, fontStyle: "italic", marginTop: 4 }}>
                    Yönlendirme: {assessment.conclusion.referrals}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* İlerleme Raporu İçeriği */}
        {reportType === "progress" && sessions && goals && (
          <View>
            <Text style={styles.sectionTitle}>Terapi Hedefleri ve İlerleme</Text>
            <Text style={{ marginBottom: 10 }}>Raporlama Dönemi İçindeki Seans Sayısı: {sessions.length}</Text>
            
            {goals.map((g, i) => {
              // Son seanstaki başarıyı bul
              let lastProgress = 0;
              for (let j = sessions.length - 1; j >= 0; j--) {
                const gp = sessions[j].goalProgress.find(p => p.goalId === g.id);
                if (gp) {
                  lastProgress = gp.accuracyPercent;
                  break;
                }
              }
              
              return (
                <View key={i} style={{ marginBottom: 10, padding: 5, backgroundColor: "#f9fafb" }}>
                  <Text style={{ fontWeight: "bold", marginBottom: 2 }}>Hedef {i + 1}: {g.description}</Text>
                  <View style={styles.row}>
                    <Text style={{ width: 100, fontSize: 10, color: "#6b7280" }}>Hedeflenen: %{g.targetPercent}</Text>
                    <Text style={{ width: 100, fontSize: 10, color: lastProgress >= g.targetPercent ? "#10b981" : "#3b82f6", fontWeight: "bold" }}>Güncel: %{lastProgress}</Text>
                    <Text style={{ flex: 1, fontSize: 10 }}>Durum: {g.status.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Bu rapor Crocodil Medikal Dil ve Konuşma Terapisi Sistemi tarafından oluşturulmuştur.
          {"\n"}Sayfa {"{"}pageNumber{"}"} / {"{"}totalPages{"}"}
        </Text>
      </Page>
    </Document>
  );
};
