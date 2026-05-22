"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2, CheckCircle2, Send } from "lucide-react";
import emailjs from "@emailjs/browser";

export default function ContactPage() {
  const { lang } = useLanguage();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      setError(true);
      setLoading(false);
      return;
    }
    
    try {
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        subject: formData.subject,
        message: formData.message,
        to_email: "furkan@cortexslp.com"
      };

      const res = await emailjs.send(serviceId, templateId, templateParams, publicKey);

      if (res.status === 200) {
        setSuccess(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] gradient-sky flex items-center justify-center py-10 md:py-20 px-4 md:px-6 relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-sage-200/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10 space-y-3"
        >
          <span className="inline-block bg-sky-100 text-sky-500 px-4 py-1.5 rounded-full text-xs font-semibold">
            {lang === "tr" ? "İletişim" : "Contact"}
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-warm-gray-800">
            Bize <span className="text-sage-500">Ulaşın</span>
          </h1>
          <p className="text-warm-gray-400 text-sm">
            {lang === "tr" ? "Medikal ekibimizle iletişime geçin." : "Get in touch with our medical team."}
          </p>
        </motion.div>

        {success ? (
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
              {lang === "tr" ? "Mesajınız İletildi" : "Message Sent"}
            </h2>
            <p className="text-warm-gray-500 leading-relaxed">
              {lang === "tr" ? "En kısa sürede sizinle iletişime geçeceğiz." : "We will get back to you as soon as possible."}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 md:p-12 border border-sage-100 shadow-[0_8px_30px_rgba(90,143,106,0.08)] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-warm-gray-500 text-xs font-semibold">
                    {lang === "tr" ? "İsim Soyisim" : "Full Name"}
                  </label>
                  <input 
                    required type="text" 
                    placeholder={lang === "tr" ? "Adınız ve soyadınız" : "Your full name"}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-sage-50 border border-sage-100 rounded-xl px-4 py-3 text-warm-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all placeholder-warm-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-warm-gray-500 text-xs font-semibold">
                    {lang === "tr" ? "E-Posta Adresi" : "Email Address"}
                  </label>
                  <input 
                    required type="email" 
                    placeholder="ornek@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-sage-50 border border-sage-100 rounded-xl px-4 py-3 text-warm-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all placeholder-warm-gray-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-warm-gray-500 text-xs font-semibold">
                  {lang === "tr" ? "Konu" : "Subject"}
                </label>
                <input 
                  type="text" 
                  placeholder={lang === "tr" ? "Mesajınızın konusu" : "Message subject"}
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-sage-50 border border-sage-100 rounded-xl px-4 py-3 text-warm-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all placeholder-warm-gray-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-warm-gray-500 text-xs font-semibold">
                  {lang === "tr" ? "Mesajınız" : "Your Message"}
                </label>
                <textarea 
                  required rows={5}
                  placeholder={lang === "tr" ? "Mesajınızı buraya yazınız..." : "Write your message here..."}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-sage-50 border border-sage-100 rounded-xl px-4 py-3 text-warm-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-300 transition-all placeholder-warm-gray-300 resize-none"
                ></textarea>
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3 border border-red-100"
                >
                  {lang === "tr" ? "Bir hata oluştu. Lütfen tekrar deneyin." : "An error occurred. Please try again."}
                </motion.p>
              )}

              <button 
                type="submit" disabled={loading}
                className="w-full bg-sage-500 text-white py-4 rounded-xl font-semibold text-sm hover:bg-sage-600 transition-all duration-300 hover:scale-[1.01] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{lang === "tr" ? "Gönder" : "Send"}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
