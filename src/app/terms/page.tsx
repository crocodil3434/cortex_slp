"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsPage() {
  const { lang } = useLanguage();
  const isTR = lang === "tr";

  return (
    <div className="min-h-screen gradient-sage py-24 px-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-sage-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl"></div>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl p-8 md:p-16 border border-sage-100 shadow-[0_8px_30px_rgba(90,143,106,0.08)] relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 mb-12"
        >
          <div className="inline-flex bg-sage-100 p-3 rounded-2xl mb-2 text-sage-600">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-warm-gray-800">
            {isTR ? "Kullanım Koşulları" : "Terms of Service"}
          </h1>
          <p className="text-warm-gray-400 text-sm max-w-lg mx-auto">
            {isTR 
              ? "CORTEX SLP dijital platformları ve klinik hizmetlerimize ilişkin yasal koşullar." 
              : "Legal terms and conditions regarding CORTEX SLP digital platforms and clinical services."}
          </p>
        </motion.div>

        {isTR ? (
          <div className="space-y-8 text-warm-gray-600 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">1. Kabul Edilen Koşullar</h2>
              <p>
                Bu web sitesini ziyaret ederek veya Dijital Ön Değerlendirme formunu kullanarak, burada belirtilen Kullanım Koşullarını ve Gizlilik Politikamızı tamamen kabul etmiş sayılırsınız. Koşulları kabul etmiyorsanız, web sitesini ve dijital formları kullanmamanız gerekir.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">2. Tıbbi Tavsiye Niteliği Taşımama</h2>
              <p>
                Bu web sitesinde yer alan bilgiler ve Dijital Ön Değerlendirme formunun sonuçları yalnızca bilgilendirme ve ön eleme amaçlıdır. Hiçbir koşulda doğrudan teşhis veya profesyonel medikal tedavi tavsiyesi niteliği taşımaz. Sağlık sorunlarınız için her zaman yetkili bir hekime veya kliniğimize doğrudan başvurmalısınız.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">3. Kullanıcı Yükümlülükleri ve Veri Doğruluğu</h2>
              <p>
                Dijital formlarda paylaştığınız bilgilerin doğru, güncel ve size ait olması gerekmektedir. Yanıltıcı bilgi girilmesinden veya üçüncü şahısların izni olmaksızın verilerinin kullanılmasından doğacak yasal sorumluluk tamamen kullanıcıya aittir.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">4. Fikri Mülkiyet Hakları</h2>
              <p>
                CORTEX SLP web sitesinde yer alan tasarımlar, logo, metinler, görseller ve kod yapıları dahil tüm içeriklerin fikri mülkiyet hakları kliniğimize aittir. Yazılı izin olmaksızın kopyalanamaz, çoğaltılamaz veya ticari amaçlarla kullanılamaz.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">5. Hizmet ve Koşullarda Değişiklikler</h2>
              <p>
                Klinik, önceden haber vermeksizin kullanım koşullarını veya sitede sunulan dijital hizmetleri güncelleme, askıya alma veya sonlandırma hakkını saklı tutar.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-8 text-warm-gray-600 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">1. Acceptance of Terms</h2>
              <p>
                By visiting this website or utilizing our Digital Pre-Assessment form, you fully agree to be bound by these Terms of Service and our Privacy Policy. If you do not accept these terms, you should immediately cease using our digital platforms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">2. No Medical Advice</h2>
              <p>
                The information provided on this website and the outputs of the Digital Pre-Assessment form are for educational and screening purposes only. They do not constitute formal medical diagnosis, prognosis, or professional treatment advice. Always seek direct consultation with a qualified medical professional for health concerns.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">3. User Obligations and Information Accuracy</h2>
              <p>
                You are responsible for ensuring that all data submitted through our forms is accurate, truthful, and belongs to you. The clinic disclaims any liability arising from inaccurate information or unauthorized submission of third-party personal details.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">4. Intellectual Property</h2>
              <p>
                All materials, designs, logos, text, and code structures displayed on this website are the intellectual property of CORTEX SLP. No content may be copied, distributed, or modified for commercial purposes without explicit written consent.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">5. Modifications of Service and Terms</h2>
              <p>
                The clinic reserves the right to modify, suspend, or terminate digital features, services, or these Terms of Service at any time without prior notice.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
