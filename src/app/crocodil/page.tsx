"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, Key } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CrocodilLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/crocodil/dashboard");
      }
    });
  }, [router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setSuccess(true);
        setTimeout(() => router.push("/crocodil/dashboard"), 1000);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess(true);
        setError("Kayıt başarılı! Lütfen giriş yapın.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f2027 0%, #134e4a 50%, #0f2027 100%)" }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-[0.07]"
            style={{
              width: `${200 + i * 100}px`,
              height: `${200 + i * 100}px`,
              background: "radial-gradient(circle, #0d9488, transparent)",
              left: `${5 + i * 20}%`,
              top: `${10 + i * 15}%`,
            }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.07, 0.12, 0.07] }}
            transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm mx-4 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: success ? [0, 10, -10, 0] : 0 }}
            className="text-6xl mb-4 inline-block"
          >
            {success ? "✅" : "🐊"}
          </motion.div>
          <h1 className="text-2xl font-bold text-white">
            {isLogin ? "Klinik Portal" : "Klinisyen Kayıt"}
          </h1>
          <p className="text-teal-300/70 text-sm mt-1">
            {isLogin ? "Lütfen giriş yapın" : "Yeni bir hesap oluşturun"}
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center mb-4 p-3 bg-red-500/20 rounded-xl border border-red-500/50 text-red-200 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1">E-posta</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="ornek@klinik.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/70 text-sm mb-1">Şifre</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-teal-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}
          >
            {loading ? "Yükleniyor..." : isLogin ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-teal-300/80 hover:text-teal-300 text-sm transition-colors"
          >
            {isLogin ? "Hesabınız yok mu? Kayıt olun." : "Zaten hesabınız var mı? Giriş yapın."}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
