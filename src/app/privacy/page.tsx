"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  const { lang } = useLanguage();
  const isTR = lang === "tr";

  return (
    <div className="min-h-[85vh] gradient-sage py-10 md:py-20 px-4 md:px-6 relative overflow-hidden">
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
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-warm-gray-800">
            {isTR ? "KVKK & GDPR Aydınlatma Metni" : "KVKK & GDPR Privacy Policy"}
          </h1>
          <p className="text-warm-gray-400 text-sm max-w-lg mx-auto">
            {isTR 
              ? "CORTEX SLP bünyesinde kişisel ve hassas nitelikli tıbbi verilerinizin güvenliği ve gizliliği en yüksek önceliğimizdir." 
              : "The security and privacy of your personal and sensitive medical data is our highest priority at CORTEX SLP."}
          </p>
        </motion.div>

        {isTR ? (
          <div className="space-y-8 text-warm-gray-600 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">1. Veri Sorumlusu</h2>
              <p>
                CORTEX SLP (Bundan sonra &ldquo;Klinik&rdquo; olarak anılacaktır), kişisel verilerinizi 6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) ve Avrupa Birliği Genel Veri Koruma Yönetmeliği (&ldquo;GDPR&rdquo;) uyarınca veri sorumlusu sıfatıyla işlemektedir.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">2. İşlenen Kişisel Verileriniz ve Toplama Yöntemi</h2>
              <p>
                Dijital Ön Değerlendirme formumuz ve iletişim kanallarımız aracılığıyla sizden talep edilen; adınız-soyadınız, yaşınız, e-posta adresiniz, telefon numaranız, ses ve konuşma bozukluklarına dair şikayetleriniz ile geçmiş tıbbi öykünüz gibi özel nitelikli tıbbi verileriniz, tamamen hastaya özel değerlendirme yapabilmek ve kişiselleştirilmiş klinik tedavi planı sunabilmek amacıyla toplanır.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">3. Veri İşleme Amaçları ve Hukuki Sebepler</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Dil, konuşma ve yutma patolojisi alanında tıbbi değerlendirme yapmak,</li>
                <li>Randevu ve klinik operasyon süreçlerini planlamak,</li>
                <li>Hizmet kalitemizi artırmak ve size özel rehabilitasyon programları sunmak,</li>
                <li>KVKK ve GDPR mevzuatından doğan hukuki yükümlülüklerimizi yerine getirmek.</li>
              </ul>
              <p>
                Hassas nitelikli kişisel sağlık verileriniz, KVKK Madde 6 kapsamında açık rızanız doğrultusunda işlenmektedir.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">4. Verilerin Saklanması ve Güvenliği</h2>
              <p>
                Toplanan veriler, yetkisiz erişimi engellemek amacıyla şifrelenmiş veri tabanlarımızda saklanır. Klinik verileriniz, üçüncü taraf pazarlama firmalarına ya da veri simsarlarına kesinlikle aktarılmaz ve satılmaz.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">5. Veri Sahibi Hakları</h2>
              <p>
                Kişisel verilerinizin silinmesini, güncellenmesini isteme veya verilerinizin işlenmesine dair detaylı bilgi alma hakkınız saklıdır. Bu haklarınızı kullanmak için dilediğiniz zaman <strong>furkan@cortexslp.com</strong> adresine e-posta gönderebilirsiniz.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-8 text-warm-gray-600 text-sm leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">1. Data Controller</h2>
              <p>
                CORTEX SLP (hereinafter referred to as &ldquo;Clinic&rdquo;), processes your personal data in the capacity of data controller in accordance with the Law No. 6698 on Protection of Personal Data (&ldquo;KVKK&rdquo;) in Turkey and the General Data Protection Regulation (&ldquo;GDPR&rdquo;) of the European Union.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">2. Processed Data Categories & Collection Method</h2>
              <p>
                Information requested via our digital pre-assessment and communication forms includes: full name, age, email address, phone number, specific concerns regarding speech, language, swallowing, and past medical history. This sensitive health data is collected solely for the purpose of patient evaluation and personal rehabilitation design.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">3. Purpose and Legal Basis for Processing</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Providing clinical evaluation in speech, language, and swallowing pathology,</li>
                <li>Scheduling consultation appointments and planning therapy programs,</li>
                <li>Improving our healthcare services and personalizing rehabilitation sessions,</li>
                <li>Fulfilling legal obligations under KVKK and GDPR.</li>
              </ul>
              <p>
                Special categories of health data are processed based on your explicit consent pursuant to GDPR Article 9 and KVKK Article 6.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">4. Retention and Security of Data</h2>
              <p>
                All data collected is stored in highly secure, encrypted databases to prevent unauthorized access. We strictly do not share, sell, or rent your clinical data to third-party marketing companies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl font-bold text-warm-gray-800">5. Data Subject Rights</h2>
              <p>
                You have the right to request access to, rectification of, or erasure of your personal data. You can exercise these rights at any time by contacting us at <strong>furkan@cortexslp.com</strong>.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
