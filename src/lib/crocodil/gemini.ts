// ============================================================
// CROCODIL — Gemini AI Materyal Üretici
// ============================================================

import type { AIGenerationRequest } from "./types";

const DISORDER_PROMPTS: Record<string, string> = {
  articulation: "artikülasyon/sesletim bozukluğu (Fonolojik bozukluk)",
  language: "dil bozukluğu (ifade edici/alıcı dil gecikmesi)",
  fluency: "akıcılık bozukluğu (kekemelik/kluttering)",
  voice: "ses bozukluğu (disfoni/vokal patoloji)",
  dysphagia: "yutma bozukluğu (disfaji/nörolojik/mekanik)",
  aphasia: "afazi (edinilmiş dil bozukluğu, post-stroke veya nörolojik)",
  aac: "karmaşık iletişim ihtiyacı (AAC kullanan danışan)",
  motorSpeech: "motor konuşma bozukluğu (dizartri/apraksi)",
  socialComm: "sosyal iletişim bozukluğu (pragmatik/otizm spektrum)",
};

const AGE_PROMPTS: Record<string, string> = {
  infant: "bebek (0-2 yaş)",
  preschool: "okul öncesi çocuk (3-5 yaş)",
  schoolAge: "okul çağı çocuğu (6-12 yaş)",
  adult: "yetişkin (18+ yaş)",
  elderly: "yaşlı yetişkin (65+ yaş, nörolojik geçmişi olabilir)",
};

const MATERIAL_TYPE_PROMPTS: Record<string, string> = {
  story: "kısa hikaye (100-200 kelime, klinik hedefi doğrudan barındıran)",
  wordList: "kelime listesi (sözcük başı, ortası ve sonu pozisyonlarına göre kategorize edilmiş)",
  activityGame: "oyun tabanlı terapi aktivitesi (malzeme listesi ve adım adım uygulama talimatları dahil)",
  homeProgram: "ev programı kılavuzu (ebeveyn/bakıcı için haftada 5 günlük detaylı plan)",
  sessionPlan: "yapılandırılmış 50 dakikalık seans planı (ısınma-uygulama-kapanış aşamalı)",
  goalSuggestions: "ICF-SMART formatında 3-5 adet terapi hedefi (Body Function → Activity → Participation zinciri ile)",
  parentLetter: "ebeveyn/bakıcıya bilgilendirme mektubu (bozukluk açıklaması, ev önerileri, genel bilgi)",
};

const SEVERITY_TR: Record<string, string> = {
  hafif: "hafif şiddette",
  orta: "orta şiddette",
  ağır: "ağır şiddette",
  "çok-ağır": "çok ağır şiddette",
};

export async function generateCrocodilMaterial(
  request: AIGenerationRequest,
  apiKey: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const disorder = DISORDER_PROMPTS[request.disorder] ?? request.disorder;
  const ageGroup = AGE_PROMPTS[request.ageGroup] ?? request.ageGroup;
  const materialType = MATERIAL_TYPE_PROMPTS[request.materialType] ?? request.materialType;
  const severity = request.severity ? SEVERITY_TR[request.severity] ?? request.severity : "orta şiddette";
  const language = request.language === "tr" ? "Türkçe" : "İngilizce";

  const systemInstruction = `Sen uzman bir medikal dil ve konuşma terapisti asistanısın. 
RCSLT ve ESLA (Avrupa Dil Konuşma Terapistleri Birliği) standartlarına göre, kanıta dayalı ve klinisyen onaylı materyal üretirsin.
Hiçbir zaman hasta kimlik bilgisi içerme. Klinik açıdan doğru, uygulanabilir ve etkileyici içerikler üret.
Tüm çıktıların ${language} olsun.`;

  const prompt = `
Lütfen aşağıdaki klinik profil için ${materialType} oluştur:

**Bozukluk:** ${disorder}
**Yaş Grubu:** ${ageGroup}
**Şiddet:** ${severity}
**Hedef:** ${request.targetSound ? `Hedef ses: /${request.targetSound}/` : ""}${request.targetStructure ? `Hedef yapı: ${request.targetStructure}` : ""}
**Ortam:** ${request.applicationContext === "clinic" ? "Klinik" : request.applicationContext === "home" ? "Ev" : "Okul"} uygulaması
${request.additionalNotes ? `**Ek Notlar:** ${request.additionalNotes}` : ""}

Çıktı formatı:
- Başlık (uygun bir başlık ver)
- Ana içerik (markdown formatında, net ve uygulanabilir)
- Klinisyen için notlar (italik ile)

Avrupa klinik standartlarına uygun, profesyonel ve danışan dostu bir içerik oluştur.
`.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API hatası: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

// ICF asistan için
export async function askICFAssistant(
  question: string,
  context: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  const prompt = `Sen bir ICF (Uluslararası Fonksiyonel Bütünleşik Sınıflandırma) uzman asistanısın.
Dil ve konuşma terapisi bağlamında ICF kodlama konusunda yardım ediyorsun.

Hasta bağlamı: ${context}
Soru: ${question}

Türkçe olarak yanıtla. Eğer bir ICF kodu hakkında soruluyorsa:
- Kodun tam adını ver
- Dil konuşma terapisindeki önemini açıkla
- Bu hasta için uygunluğunu değerlendir
- Şiddet niteleyici (0-4) önerisi sun

Eğer hangi kodu seçeceği soruluyorsa, en uygun 2-3 kodu öner ve gerekçele.`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("ICF asistan yanıt veremedi");
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Yanıt alınamadı.";
}

// Değerlendirme özeti için
export async function generateAssessmentSummary(
  assessmentData: Record<string, unknown>,
  clientAge: number,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;

  const prompt = `Sen kıdemli bir medikal dil ve konuşma patoloğusun.
Aşağıdaki değerlendirme verilerinden kapsamlı bir klinik değerlendirme özeti oluştur.
Danışan yaşı: ${clientAge}

Değerlendirme verileri:
${JSON.stringify(assessmentData, null, 2)}

Lütfen RCSLT standartlarında bir klinik özet yaz:
1. Yönetici Özet (2-3 cümle)
2. Ana Bulgular (madde madde)
3. Güçlü Yanlar
4. Terapi Öncelikleri
5. Öneriler

Türkçe, profesyonel ve kapsamlı olsun. Hasta kimliğine dair veri içerme.`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error("Özet oluşturulamadı");
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
