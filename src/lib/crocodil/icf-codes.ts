// ============================================================
// CROCODIL — ICF Kodu Veritabanı (Dil & Konuşma Terapisi)
// ============================================================

export interface ICFCodeDef {
  code: string;
  label: string;
  description: string;
  domain: "b" | "d" | "e" | "s";
  category: string;
  slpRelevance: "primary" | "secondary";
}

export const ICF_SLP_CODES: ICFCodeDef[] = [
  // ── BODY FUNCTIONS (b) ─────────────────────────────────

  // Zihinsel Fonksiyonlar
  { code: "b110", label: "Bilinç Fonksiyonları", description: "Uyanıklık, açıklık ve sürdürülen bilinç durumu", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b117", label: "Entelektüel Fonksiyonlar", description: "Genel zihinsel işlevler; problem çözme, bilgi edinimi", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b122", label: "Global Psikososyal Fonksiyonlar", description: "Erken yaştan itibaren gelişen kişilerarası etkileşim becerileri", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b126", label: "Mizaç ve Kişilik Fonksiyonları", description: "Karakteri oluşturan mizaç özellikleri", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b130", label: "Enerji ve Dürtü Fonksiyonları", description: "Motivasyon, iştah, dürtü kontrolü", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b134", label: "Uyku Fonksiyonları", description: "Uyku kalitesi ve miktarı", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b140", label: "Dikkat Fonksiyonları", description: "Sürdürülen, bölünmüş ve seçici dikkat", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b144", label: "Bellek Fonksiyonları", description: "Kısa süreli, uzun süreli, çalışma belleği", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b147", label: "Psikomotor Fonksiyonlar", description: "Motor aktivite kontrolünün zihinsel boyutu", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b152", label: "Duygu Fonksiyonları", description: "Duygu düzenleme ve ifadesi", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b156", label: "Algı Fonksiyonları", description: "İşitsel, görsel, dokunsal algı", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b160", label: "Düşünce Fonksiyonları", description: "Düşünce akışı, hızı ve içeriği", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b164", label: "Yüksek Düzey Bilişsel Fonksiyonlar", description: "Soyutlama, planlama, organizasyon, yürütücü işlevler", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b167", label: "Dil Mental Fonksiyonları", description: "İşaret, sembol ve diğer dil sistemlerini tanıma ve kullanma", domain: "b", category: "Dil", slpRelevance: "primary" },
  { code: "b172", label: "Hesaplama Fonksiyonları", description: "Sayı ve işlem anlama kapasitesi", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },
  { code: "b176", label: "Sıralı Hareketleri Yürütme Fonksiyonları", description: "Karmaşık hareket dizilerini planlama ve yürütme (apraksi ilgili)", domain: "b", category: "Zihinsel", slpRelevance: "primary" },
  { code: "b180", label: "Öz ve Zaman Deneyimine İlişkin Fonksiyonlar", description: "Beden imajı, zaman algısı", domain: "b", category: "Zihinsel", slpRelevance: "secondary" },

  // Ses Fonksiyonları
  { code: "b310", label: "Ses Fonksiyonları", description: "Ses üretimi: kalite, pitch, loudness, rezonans", domain: "b", category: "Ses", slpRelevance: "primary" },
  { code: "b320", label: "Artikülasyon Fonksiyonları", description: "Konuşma seslerinin üretimi (artikülatörler yoluyla)", domain: "b", category: "Ses", slpRelevance: "primary" },
  { code: "b330", label: "Konuşmanın Akıcılık ve Ritim Fonksiyonları", description: "Konuşmanın akış hızı, ritim ve sürekliliği", domain: "b", category: "Ses", slpRelevance: "primary" },
  { code: "b340", label: "Alternatif Sesletim Fonksiyonları", description: "Humming, şarkı söyleme, ağlama gibi alternatif sesler", domain: "b", category: "Ses", slpRelevance: "secondary" },

  // İşitme
  { code: "b230", label: "İşitme Fonksiyonları", description: "Ses frekansı ve yoğunluğunun algılanması", domain: "b", category: "Duyular", slpRelevance: "primary" },
  { code: "b235", label: "Vestibüler Fonksiyonlar", description: "Denge ve hareket algısı", domain: "b", category: "Duyular", slpRelevance: "secondary" },

  // Sindirim
  { code: "b510", label: "Yutma Fonksiyonları", description: "Beslenme: çiğneme, bolus oluşturma, yutma refleksi", domain: "b", category: "Yutma", slpRelevance: "primary" },
  { code: "b515", label: "Sindirim Fonksiyonları", description: "Gıdanın sindirim sisteminde taşınması", domain: "b", category: "Yutma", slpRelevance: "secondary" },
  { code: "b525", label: "Dışkılama Fonksiyonları", description: "Bağırsak boşaltım fonksiyonları", domain: "b", category: "Yutma", slpRelevance: "secondary" },
  { code: "b530", label: "Kilo Bakımı Fonksiyonları", description: "Vücut kütlesinin sürdürülmesi", domain: "b", category: "Yutma", slpRelevance: "secondary" },

  // Kas-İskelet
  { code: "b710", label: "Eklem Mobilite Fonksiyonları", description: "Eklem hareket açıklığı", domain: "b", category: "Motor", slpRelevance: "secondary" },
  { code: "b730", label: "Kas Gücü Fonksiyonları", description: "Kas gücü ve tonusu", domain: "b", category: "Motor", slpRelevance: "primary" },
  { code: "b750", label: "Motor Refleks Fonksiyonları", description: "İstemsiz kas yanıtları", domain: "b", category: "Motor", slpRelevance: "primary" },
  { code: "b760", label: "İstemsiz Hareket Kontrolü Fonksiyonları", description: "Tremor, spazm, diskinezi", domain: "b", category: "Motor", slpRelevance: "primary" },
  { code: "b765", label: "İstemsiz Hareket Fonksiyonları", description: "Koordinasyonsuz, kontrol dışı hareketler", domain: "b", category: "Motor", slpRelevance: "secondary" },
  { code: "b770", label: "Yürüme Örüntüsü Fonksiyonları", description: "Yürüme kalitesi ve ritmi", domain: "b", category: "Motor", slpRelevance: "secondary" },

  // ── ACTIVITIES & PARTICIPATION (d) ─────────────────────

  // Öğrenme ve Bilgi Uygulama
  { code: "d115", label: "Dinleme", description: "Konuşulan dil, işaret ve semboller yoluyla iletilen bilgiyi kasıtlı olarak duyma", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d130", label: "Taklit Etme", description: "Başkalarının yaptığı basit veya karmaşık hareketleri ya da sesleri taklit etme", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d135", label: "Alıştırma Yapma", description: "Kasıtlı beceri geliştirme için tekrarlanan eylemler", domain: "d", category: "Öğrenme", slpRelevance: "secondary" },
  { code: "d160", label: "Dikkat Odaklama", description: "Dikkat gerektiren bir göreve ya da nesneye konsantre olma", domain: "d", category: "Öğrenme", slpRelevance: "primary" },
  { code: "d163", label: "Düşünme", description: "Kavramların, fikir ve görüşlerin formüle edilmesi", domain: "d", category: "Öğrenme", slpRelevance: "primary" },
  { code: "d166", label: "Okuma", description: "Yazılı dili anlamaya yönelik metin performansı", domain: "d", category: "Okuma-Yazma", slpRelevance: "primary" },
  { code: "d170", label: "Yazma", description: "Dil sembollerini yazıya dökerek iletişim kurma", domain: "d", category: "Okuma-Yazma", slpRelevance: "primary" },
  { code: "d172", label: "Hesaplama", description: "Matematiksel işlemleri gerçekleştirme", domain: "d", category: "Öğrenme", slpRelevance: "secondary" },
  { code: "d175", label: "Problem Çözme", description: "Hedef doğrultusunda çözüm bulmak için gerçek ya da kavramsal problemleri tanımlama", domain: "d", category: "Öğrenme", slpRelevance: "primary" },
  { code: "d177", label: "Kararlar Alma", description: "Seçenekler arasında seçim yapma ve uygulamaya koyma", domain: "d", category: "Öğrenme", slpRelevance: "secondary" },

  // İletişim
  { code: "d310", label: "Sözlü Mesajları Alma", description: "Konuşulan dili anlama (sözcükler, cümleler, metinler)", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d315", label: "Sözlü Olmayan Mesajları Alma", description: "Jest, mimik, sembol yoluyla iletişimi anlama", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d320", label: "İşaret Dili Mesajlarını Alma", description: "Resmi işaret diliyle iletilen mesajları alma", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d325", label: "Yazılı Mesajları Alma", description: "Yazı, Braille veya diğer sistemleri okuyarak iletişim alma", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d330", label: "Konuşma", description: "Sözcükler, cümleler ve parçalar aracılığıyla sözlü mesaj üretme", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d335", label: "Sözlü Olmayan Mesajlar Üretme", description: "İmalar, semboller ve çizimler aracılığıyla mesaj üretme", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d340", label: "Resmi İşaret Diliyle Mesajlar Üretme", description: "Resmi işaret diliyle iletişim kurma", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d345", label: "Yazılı Mesajlar Üretme", description: "Yazılı dil sistemleriyle mesaj üretme", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d350", label: "Konuşma Yoluyla İletişim", description: "Karşılıklı konuşma (dinleme ve yanıt verme)", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d355", label: "Tartışma", description: "Farklı görüşler ya da konular üzerine tartışma yürütme", domain: "d", category: "İletişim", slpRelevance: "primary" },
  { code: "d360", label: "İletişim Araçları ve Tekniklerini Kullanma", description: "Telefon, bilgisayar, AAC cihazları ile iletişim", domain: "d", category: "İletişim", slpRelevance: "primary" },

  // Öz bakım
  { code: "d510", label: "Kendini Yıkama", description: "Vücudu yıkama ve kurulama", domain: "d", category: "Öz Bakım", slpRelevance: "secondary" },
  { code: "d520", label: "Vücut Parçaları Bakımı", description: "Cilt, dişler, saç bakımı", domain: "d", category: "Öz Bakım", slpRelevance: "secondary" },
  { code: "d550", label: "Yeme", description: "Yiyeceği ağıza götürme, çiğneme ve yutma", domain: "d", category: "Yutma", slpRelevance: "primary" },
  { code: "d560", label: "İçme", description: "Sıvıyı ağıza götürme ve yutma", domain: "d", category: "Yutma", slpRelevance: "primary" },

  // Kişilerarası Etkileşim
  { code: "d710", label: "Temel Kişilerarası Etkileşimler", description: "Saygılı, ılımlı, sosyal olarak uygun etkileşimler", domain: "d", category: "Sosyal", slpRelevance: "primary" },
  { code: "d720", label: "Karmaşık Kişilerarası Etkileşimler", description: "İlişkilerin başlatılması, sürdürülmesi ve sonlandırılması", domain: "d", category: "Sosyal", slpRelevance: "primary" },
  { code: "d730", label: "Yabancılarla İlişki", description: "Yabancılarla geçici iletişim ve temas", domain: "d", category: "Sosyal", slpRelevance: "secondary" },
  { code: "d740", label: "Resmi İlişkiler", description: "İşveren, otorite figürleriyle ilişkiler", domain: "d", category: "Sosyal", slpRelevance: "secondary" },
  { code: "d750", label: "Gayri Resmi Sosyal İlişkiler", description: "Arkadaş, akran ilişkileri", domain: "d", category: "Sosyal", slpRelevance: "primary" },
  { code: "d760", label: "Aile İlişkileri", description: "Aile üyeleriyle ilişkiler", domain: "d", category: "Sosyal", slpRelevance: "secondary" },
  { code: "d770", label: "Yakın İlişkiler", description: "Romantik ve eş ilişkileri", domain: "d", category: "Sosyal", slpRelevance: "secondary" },

  // Eğitim
  { code: "d810", label: "Resmi Dışı Eğitim", description: "Ev ya da toplumda yapılan eğitim", domain: "d", category: "Eğitim", slpRelevance: "secondary" },
  { code: "d820", label: "Okul Eğitimi", description: "İlköğretim düzeyinde öğrenim", domain: "d", category: "Eğitim", slpRelevance: "primary" },
  { code: "d825", label: "Mesleki Eğitim", description: "Mesleki beceri edinimi", domain: "d", category: "Eğitim", slpRelevance: "secondary" },
  { code: "d830", label: "Yükseköğretim", description: "Üniversite ve üstü eğitim", domain: "d", category: "Eğitim", slpRelevance: "secondary" },

  // İş
  { code: "d840", label: "Çıraklık", description: "İş öncesi deneyim", domain: "d", category: "İş", slpRelevance: "secondary" },
  { code: "d845", label: "İş Edinme, Tutma ve Sonlandırma", description: "İş arama ve sözleşme süreçleri", domain: "d", category: "İş", slpRelevance: "secondary" },
  { code: "d850", label: "Ücretli İş", description: "Ücret karşılığı istihdam", domain: "d", category: "İş", slpRelevance: "secondary" },
  { code: "d855", label: "Ücretsiz İş", description: "Aile işletmesi, gönüllülük", domain: "d", category: "İş", slpRelevance: "secondary" },

  // ── ENVIRONMENTAL FACTORS (e) ─────────────────────────
  { code: "e110", label: "Kişisel Tüketim Ürünleri veya Maddeleri", description: "Yiyecek, ilaç, destekleyici ürünler", domain: "e", category: "Ürünler", slpRelevance: "secondary" },
  { code: "e115", label: "Günlük Yaşam Ürün ve Teknolojileri", description: "Ev eşyaları ve araç gereçler", domain: "e", category: "Ürünler", slpRelevance: "secondary" },
  { code: "e125", label: "İletişim Ürün ve Teknolojileri", description: "AAC cihazları, ses amplifikatörler, yardımcı teknoloji", domain: "e", category: "Teknoloji", slpRelevance: "primary" },
  { code: "e130", label: "Eğitim Ürün ve Teknolojileri", description: "Eğitim ortamında kullanılan araçlar", domain: "e", category: "Eğitim", slpRelevance: "secondary" },
  { code: "e310", label: "Yakın Aile", description: "Ebeveynler, eşler, kardeşler ile yakın akrabalar", domain: "e", category: "Destek", slpRelevance: "primary" },
  { code: "e315", label: "Geniş Aile", description: "Uzak akrabalar", domain: "e", category: "Destek", slpRelevance: "secondary" },
  { code: "e320", label: "Arkadaşlar", description: "Arkadaşlık ağı", domain: "e", category: "Destek", slpRelevance: "primary" },
  { code: "e325", label: "Tanıdıklar ve Komşular", description: "Yakın çevre kişileri", domain: "e", category: "Destek", slpRelevance: "secondary" },
  { code: "e330", label: "Otorite Konumundaki Kişiler", description: "Öğretmenler, yöneticiler, işverenler", domain: "e", category: "Destek", slpRelevance: "secondary" },
  { code: "e340", label: "Kişisel Bakım Sağlayıcılar ve Kişisel Yardımcılar", description: "Bakıcı, yardımcı hizmet sağlayıcılar", domain: "e", category: "Destek", slpRelevance: "primary" },
  { code: "e355", label: "Sağlık Profesyonelleri", description: "Doktorlar, terapistler, hemşireler", domain: "e", category: "Destek", slpRelevance: "primary" },
  { code: "e360", label: "Sağlık İlişkili Diğer Profesyoneller", description: "Sosyal hizmet uzmanları, psikologlar", domain: "e", category: "Destek", slpRelevance: "secondary" },
  { code: "e410", label: "Yakın Aile Tutumları", description: "Aile üyelerinin sağlık durumuna ilişkin tutumları", domain: "e", category: "Tutumlar", slpRelevance: "primary" },
  { code: "e420", label: "Arkadaş Tutumları", description: "Arkadaşların tutumları", domain: "e", category: "Tutumlar", slpRelevance: "secondary" },
  { code: "e450", label: "Sağlık Profesyonellerinin Tutumları", description: "Sağlık çalışanlarının tutumları", domain: "e", category: "Tutumlar", slpRelevance: "secondary" },
  { code: "e460", label: "Toplumsal Tutumlar", description: "Toplumun genel tutumları", domain: "e", category: "Tutumlar", slpRelevance: "secondary" },
  { code: "e570", label: "Sosyal Güvenlik Hizmetleri", description: "SGK, sigorta ve yardım sistemleri", domain: "e", category: "Sistemler", slpRelevance: "secondary" },
  { code: "e580", label: "Sağlık Hizmetleri", description: "Sağlık altyapısı ve politikaları", domain: "e", category: "Sistemler", slpRelevance: "secondary" },
  { code: "e585", label: "Eğitim ve Öğretim Hizmetleri", description: "Eğitim kurumları ve politikaları", domain: "e", category: "Sistemler", slpRelevance: "secondary" },
];

export function searchICFCodes(query: string): ICFCodeDef[] {
  const q = query.toLowerCase();
  return ICF_SLP_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.label.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
  ).slice(0, 20);
}

export function getICFByCategory(category: string): ICFCodeDef[] {
  return ICF_SLP_CODES.filter((c) => c.category === category);
}

export function getICFByDomain(domain: "b" | "d" | "e" | "s"): ICFCodeDef[] {
  return ICF_SLP_CODES.filter((c) => c.domain === domain);
}

export const ICF_CATEGORIES = [...new Set(ICF_SLP_CODES.map((c) => c.category))];

export function getICFCode(code: string): ICFCodeDef | undefined {
  return ICF_SLP_CODES.find((c) => c.code === code);
}

export const ICF_QUALIFIER_LABELS: Record<number, string> = {
  0: "0 — Sorun yok (0–4%)",
  1: "1 — Hafif sorun (5–24%)",
  2: "2 — Orta sorun (25–49%)",
  3: "3 — Ağır sorun (50–95%)",
  4: "4 — Tam sorun (96–100%)",
};
