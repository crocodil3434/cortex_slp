"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2, CheckCircle2 } from "lucide-react";
import emailjs from "@emailjs/browser";

const questions = [
  { id: "patientName", labelTR: "Hastanın Adı Soyadı", labelEN: "Patient Full Name", type: "text", placeholderTR: "Adınız ve soyadınız", placeholderEN: "Your full name" },
  { id: "age", labelTR: "Hastanın Yaşı", labelEN: "Patient Age", type: "text", placeholderTR: "Örn: 45", placeholderEN: "E.g: 45" },
  { id: "email", labelTR: "E-Posta Adresi", labelEN: "Email Address", type: "email", placeholderTR: "ornek@email.com", placeholderEN: "example@email.com" },
  { id: "phone", labelTR: "Telefon Numarası", labelEN: "Phone Number", type: "tel", placeholderTR: "+90 5XX XXX XXXX", placeholderEN: "+90 5XX XXX XXXX" },
  { id: "primaryConcern", labelTR: "Birincil Şikayet / Başvuru Nedeni", labelEN: "Primary Concern / Reason for Visit", type: "textarea", placeholderTR: "Şikayetinizi detaylı olarak açıklayınız...", placeholderEN: "Please describe your concern in detail..." },
  { id: "symptoms", labelTR: "Şikayetler Ne Zamandır Devam Ediyor?", labelEN: "Duration of Symptoms", type: "text", placeholderTR: "Örn: 3 aydır", placeholderEN: "E.g: 3 months" },
  { id: "history", labelTR: "Geçmiş Tıbbi Öykü", labelEN: "Past Medical History", type: "textarea", placeholderTR: "Nörolojik / cerrahi geçmişiniz...", placeholderEN: "Neurological / surgical history..." },
  { id: "consent", labelTR: "KVKK/GDPR Aydınlatma Metnini okudum ve verilerimin işlenmesini onaylıyorum.", labelEN: "I have read the GDPR Consent form and approve the processing of my data.", type: "checkbox", placeholderTR: "", placeholderEN: "" },
];

export default function TriagePage() {
  const { t, lang } = useLanguage();
  const language = lang;
  const isTR = language === "tr";

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(false);

  const [formData, setFormData] = useState({
    patientName: "",
    age: "",
    email: "",
    phone: "",
    primaryConcern: "",
    symptoms: "",
    history: "",
    consent: false,
  });

  const handleInputChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const nextStep = () => {
    if (currentStep < questions.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(false);

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setError(true);
      setIsSubmitting(false);
      return;
    }

    const combinedMessage = `
Klinik Ön Değerlendirme Detayları:
-----------------------------------
Site Dili: ${language.toUpperCase()}
Hastanın Yaşı: ${formData.age}
Birincil Şikayet: ${formData.primaryConcern}
Şikayet Süresi: ${formData.symptoms}
Geçmiş Tıbbi Öykü: ${formData.history}
KVKK/GDPR Onayı: ${formData.consent ? "VERİLDİ" : "VERİLMEDİ"}
    `.trim();

    const templateParams = {
      user_name: formData.patientName,
      user_email: formData.email,
      user_phone: formData.phone,
      message: combinedMessage,
    };

    try {
      await emailjs.send(
        serviceId,
        templateId,
        templateParams,
        publicKey
      );
      setIsSuccess(true);
    } catch (err) {
      console.error("Form gönderim hatası:", err);
      setError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQ = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  return (
    <div className="min-h-[90vh] gradient-sage flex items-center justify-center py-24 px-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-sage-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 space-y-3"
        >
          <span className="inline-block bg-sage-100 text-sage-700 px-4 py-1.5 rounded-full text-xs font-semibold">
            {t.triage.badge}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-warm-gray-800">
            {t.triage.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-sage-500">
              {t.triage.title.split(" ").slice(-1).join(" ")}
            </span>
          </h1>
        </motion.div>

        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-3xl p-12 border border-sage-100 text-center space-y-6 shadow-[0_8px_30px_rgba(90,143,106,0.08)]"
          >
            <div className="flex justify-center">
              <div className="bg-sage-100 p-4 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-sage-500" />
              </div>
            </div>
            <h2 className="font-serif text-2xl font-bold text-warm-gray-800">
              {isTR ? "Kayıt Tamamlandı" : "Registration Complete"}
            </h2>
            <p className="text-warm-gray-500 leading-relaxed">
              {t.triage.processing}
            </p>
          </motion.div>
        ) : (
          <div className="bg-white rounded-3xl p-8 md:p-12 border border-sage-100 shadow-[0_8px_30px_rgba(90,143,106,0.08)] relative overflow-hidden min-h-[380px] flex flex-col justify-between">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-sage-50">
              <motion.div 
                className="h-full bg-gradient-to-r from-sage-400 to-sage-500 rounded-r-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            <div className="text-right text-warm-gray-300 text-sm font-medium mb-6 mt-2">
              {currentStep + 1} / {questions.length}
            </div>

            <div className="flex-grow flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full space-y-4"
                >
                  <label className="block font-serif text-xl md:text-2xl font-bold text-warm-gray-800 leading-snug">
                    {isTR ? currentQ.labelTR : currentQ.labelEN}
                  </label>
                  
                  {currentQ.type === "textarea" ? (
                    <textarea 
                      rows={3}
                      placeholder={isTR ? currentQ.placeholderTR : currentQ.placeholderEN}
                      value={(formData[currentQ.id as keyof typeof formData] as string) || ""}
                      onChange={(e) => handleInputChange(currentQ.id, e.target.value)}
                      className="w-full bg-sage-50 border border-sage-100 text-warm-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all font-sans text-base resize-none placeholder-warm-gray-300"
                      autoFocus
                    />
                  ) : currentQ.type === "checkbox" ? (
                    <div className="space-y-4">
                      <div className="w-full h-36 overflow-y-auto bg-sage-50 border border-sage-100 rounded-xl p-4 text-xs text-warm-gray-500 leading-relaxed space-y-2">
                        <p className="font-bold text-warm-gray-700">
                          {isTR ? "CORTEX SLP KVKK & GDPR Aydınlatma Metni Özeti" : "CORTEX SLP KVKK & GDPR Summary Consent"}
                        </p>
                        {isTR ? (
                          <>
                            <p>
                              CORTEX SLP olarak, paylaştığınız kişisel ve hassas nitelikli sağlık verilerinizin güvenliğine büyük önem veriyoruz. Dijital Ön Değerlendirme Formu ile paylaştığınız tıbbi bilgiler, yalnızca durumunuza en uygun klinik değerlendirmeyi yapabilmek ve randevunuzu organize etmek amacıyla işlenmektedir.
                            </p>
                            <p>
                              Verileriniz uçtan uca şifrelenmiş altyapımızda güvenle saklanmakta ve kesinlikle üçüncü şahıslarla paylaşılmamaktadır. Dilediğiniz zaman verilerinizin silinmesini talep etme hakkınız mevcuttur. Ayrıntılı metne sayfa altındaki gizlilik politikası linkinden erişebilirsiniz.
                            </p>
                          </>
                        ) : (
                          <>
                            <p>
                              At CORTEX SLP, we prioritize the security of your personal and sensitive health data. The medical details shared in this form are processed solely to evaluate your condition and schedule clinical consultations.
                            </p>
                            <p>
                              Your data is safely stored in our encrypted systems and will not be shared with third parties. You have the right to request deletion of your records at any time. For more information, read the complete privacy policy linked in the footer.
                            </p>
                          </>
                        )}
                      </div>
                      <label className="flex items-start space-x-3 cursor-pointer pt-2 group">
                        <input 
                          type="checkbox"
                          checked={formData[currentQ.id as keyof typeof formData] as boolean || false}
                          onChange={(e) => handleInputChange(currentQ.id, e.target.checked)}
                          className="w-5 h-5 rounded-lg border-2 border-sage-300 text-sage-500 mt-0.5 shrink-0 focus:ring-sage-300 accent-sage-500"
                        />
                        <span className="text-warm-gray-500 text-sm leading-relaxed group-hover:text-warm-gray-700 transition-colors font-medium">
                          {isTR ? currentQ.labelTR : currentQ.labelEN}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <input 
                      type={currentQ.type}
                      placeholder={isTR ? currentQ.placeholderTR : currentQ.placeholderEN}
                      value={(formData[currentQ.id as keyof typeof formData] as string) || ""}
                      onChange={(e) => handleInputChange(currentQ.id, e.target.value)}
                      className="w-full bg-sage-50 border border-sage-100 text-warm-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all font-sans text-base placeholder-warm-gray-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (currentStep < questions.length - 1) nextStep();
                          else if (formData.consent) handleSubmit();
                        }
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3 border border-red-100 mt-4"
              >
                {t.triage.error}
              </motion.p>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-sage-50">
              <button 
                onClick={prevStep}
                disabled={currentStep === 0 || isSubmitting}
                className="text-warm-gray-400 hover:text-warm-gray-600 text-sm font-medium transition-colors disabled:opacity-0"
              >
                ← {t.triage.back}
              </button>
              
              {currentStep < questions.length - 1 ? (
                <button 
                  onClick={nextStep}
                  className="bg-sage-500 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-sage-600 transition-all duration-300 hover:scale-[1.02]"
                >
                  {t.triage.next} →
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={!formData.consent || isSubmitting}
                  className="flex items-center justify-center bg-sage-500 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-sage-600 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `${t.triage.complete} ✓`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
