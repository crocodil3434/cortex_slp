"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { saveClient, getClients, saveCalendarEvent } from "@/lib/crocodil/storage";
import type { Client } from "@/lib/crocodil/types";
import { ArrowLeft, Save, User, Phone, Calendar, Stethoscope, CreditCard } from "lucide-react";
import Link from "next/link";

const SECTION = "border rounded-2xl p-4 space-y-3";
const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1";
const INPUT = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 transition-colors bg-white";
const SECTION_TITLE = "flex items-center gap-2 font-semibold text-gray-700 mb-3";

export default function YeniDanismanPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: "belirtilmemiş" as Client["gender"],
    handedness: "sağ" as Client["handedness"],
    phone: "",
    email: "",
    parentName: "",
    parentPhone: "",
    parentRelation: "",
    referralSource: "",
    referralDiagnosis: "",
    primaryDiagnosis: "",
    insuranceType: "SGK" as Client["insuranceType"],
    insuranceName: "",
    notes: "",
    status: "aktif" as Client["status"],
  });

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("Ad ve soyad zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const newClient = saveClient({ ...form });
      // Takvim etkinliğini danışanla eşleştir
      const eventId = params.get("eventId");
      if (eventId) {
        // Mevcut event'i güncelle
      }
      router.push(`/crocodil/danisman/${newClient.id}`);
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="flex flex-col h-full" style={{ background: "#f8fffe" }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ background: "white", borderColor: "#e5f7f5" }}>
        <div className="flex items-center gap-3">
          <Link href="/crocodil/danisman">
            <button className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb" }}>
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Yeni Danışan</h1>
            <p className="text-xs text-gray-400">Hasta kaydı oluştur</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </motion.button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5 max-w-2xl mx-auto w-full">
        <div className="space-y-4">
          {/* Kişisel Bilgiler */}
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <div className={SECTION_TITLE}>
              <User className="w-4 h-4 text-teal-600" />
              Kişisel Bilgiler
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Ad *</label>
                <input type="text" value={form.firstName} onChange={f("firstName")} placeholder="Ad" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>Soyad *</label>
                <input type="text" value={form.lastName} onChange={f("lastName")} placeholder="Soyad" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Doğum Tarihi</label>
                <input type="date" value={form.birthDate} onChange={f("birthDate")} className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>Cinsiyet</label>
                <select value={form.gender} onChange={f("gender")} className={INPUT} style={{ borderColor: "#e5e7eb" }}>
                  <option value="erkek">Erkek</option>
                  <option value="kadın">Kadın</option>
                  <option value="belirtilmemiş">Belirtilmemiş</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Dominant El</label>
                <select value={form.handedness} onChange={f("handedness")} className={INPUT} style={{ borderColor: "#e5e7eb" }}>
                  <option value="sağ">Sağ</option>
                  <option value="sol">Sol</option>
                  <option value="çift">Çift</option>
                </select>
              </div>
            </div>
          </div>

          {/* İletişim */}
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <div className={SECTION_TITLE}>
              <Phone className="w-4 h-4 text-teal-600" />
              İletişim Bilgileri
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Telefon</label>
                <input type="tel" value={form.phone} onChange={f("phone")} placeholder="0555 123 45 67" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>E-posta</label>
                <input type="email" value={form.email} onChange={f("email")} placeholder="ornek@mail.com" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL}>Ebeveyn / Bakıcı</label>
                <input type="text" value={form.parentName} onChange={f("parentName")} placeholder="Ad Soyad" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>Ebeveyn Tel</label>
                <input type="tel" value={form.parentPhone} onChange={f("parentPhone")} placeholder="0555..." className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>Yakınlık</label>
                <select value={form.parentRelation} onChange={f("parentRelation")} className={INPUT} style={{ borderColor: "#e5e7eb" }}>
                  <option value="">Seçin</option>
                  <option>Anne</option>
                  <option>Baba</option>
                  <option>Eş</option>
                  <option>Kardeş</option>
                  <option>Bakıcı</option>
                  <option>Diğer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Klinik Bilgiler */}
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <div className={SECTION_TITLE}>
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Klinik Bilgiler
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Sevk Kaynağı</label>
                <input type="text" value={form.referralSource} onChange={f("referralSource")} placeholder="Dr. Adı / Bölüm" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
              <div>
                <label className={LABEL}>Sevk Tanısı</label>
                <input type="text" value={form.referralDiagnosis} onChange={f("referralDiagnosis")} placeholder="ICD-10 veya açıklama" className={INPUT} style={{ borderColor: "#e5e7eb" }} />
              </div>
            </div>
            <div>
              <label className={LABEL}>Ön Tanı / Ana Şikayet</label>
              <input type="text" value={form.primaryDiagnosis} onChange={f("primaryDiagnosis")} placeholder="Ana başvuru sebebi..." className={INPUT} style={{ borderColor: "#e5e7eb" }} />
            </div>
          </div>

          {/* Sigorta */}
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <div className={SECTION_TITLE}>
              <CreditCard className="w-4 h-4 text-teal-600" />
              Sigorta Bilgileri
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Sigorta Türü</label>
                <select value={form.insuranceType} onChange={f("insuranceType")} className={INPUT} style={{ borderColor: "#e5e7eb" }}>
                  <option value="SGK">SGK</option>
                  <option value="özel">Özel Sigorta</option>
                  <option value="yok">Yok</option>
                  <option value="diğer">Diğer</option>
                </select>
              </div>
              {form.insuranceType === "özel" && (
                <div>
                  <label className={LABEL}>Sigorta Şirketi</label>
                  <input type="text" value={form.insuranceName} onChange={f("insuranceName")} placeholder="Sigorta adı..." className={INPUT} style={{ borderColor: "#e5e7eb" }} />
                </div>
              )}
            </div>
          </div>

          {/* Notlar */}
          <div className={SECTION} style={{ borderColor: "#e5f7f5" }}>
            <label className={LABEL}>Genel Notlar</label>
            <textarea
              value={form.notes}
              onChange={f("notes")}
              placeholder="Danışan hakkında genel notlar..."
              rows={3}
              className={INPUT + " resize-none"}
              style={{ borderColor: "#e5e7eb" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
