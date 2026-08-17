import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  BookOpen, MessageCircle, Wind, Mic, Utensils, 
  Brain, Volume2, Cpu, Heart, Map, FileText,
  Calendar, CheckCircle2, ArrowRight
} from "lucide-react";

// Tıbbi etik, bilimsel kanıt ve umut tacirliği yapmayan, hasta bilgilendirme metinleri.
const serviceContent: Record<string, any> = {
  "dil-ve-iletisim": {
    title: "Dil ve İletişim Bozuklukları",
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    desc: "Gelişimsel veya sonradan edinilmiş dil bozukluklarında alıcı (anlama) ve ifade edici (konuşma/yazma) dil becerilerinin kapsamlı değerlendirmesi ve kanıta dayalı terapisi.",
    points: [
      "Gecikmiş dil ve konuşma",
      "Özgül dil bozukluğu (Gelişimsel dil bozukluğu)",
      "Pragmatik (sosyal) dil kullanım güçlükleri",
      "Kapsamlı dil testleri (CELF, TIFAL vb.) ile nesnel değerlendirme"
    ]
  },
  "artikulasyon": {
    title: "Artikülasyon ve Fonoloji",
    icon: MessageCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    desc: "Konuşma seslerinin doğru üretilememesi, hece/kelime yapılarındaki hatalar ve konuşma anlaşılırlığının düşüklüğü durumlarında uygulanan, motor öğrenme ve fonolojik kurallara dayanan terapi yaklaşımları.",
    points: [
      "Belirli seslerin (r, s, k vb.) üretilememesi",
      "Seslerin birbiri yerine kullanılması (Fonolojik süreçler)",
      "Konuşma anlaşılırlığının yaş düzeyine uygun olmaması",
      "Uluslararası standartlarda ses envanteri analizi"
    ]
  },
  "akicilik": {
    title: "Akıcılık Bozuklukları (Kekemelik)",
    icon: Wind,
    color: "text-sky-600",
    bg: "bg-sky-50",
    desc: "Kekemelik ve hızlı bozuk konuşma (cluttering) olgularında, bireyin konuşma akıcılığını yönetmesini sağlayan, duyarsızlaştırma ve akıcılık şekillendirme temelli bilişsel-davranışçı terapi yaklaşımları.",
    points: [
      "Konuşmada takılma, blok ve uzatmalar",
      "İkincil (kaçınma) davranışların yönetimi",
      "Okul öncesi, okul çağı ve yetişkin dönemi kekemelik terapisi",
      "Çok boyutlu kekemelik değerlendirmesi (SSI-4, OASES)"
    ]
  },
  "ses-bozukluklari": {
    title: "Klinik Ses Terapisi",
    icon: Mic,
    color: "text-violet-600",
    bg: "bg-violet-50",
    desc: "Ses tellerindeki nodül, polip, kist, felç veya kas gerginliği gibi organik, fonksiyonel ya da nörolojik ses bozukluklarında vokaj hijyen, rezonans ve laringeal fizyoterapi odaklı rehabilitasyon.",
    points: [
      "Ses kısıklığı, çatallanma ve çabuk yorulma",
      "Profesyonel ses kullanıcıları (şarkıcı, öğretmen vb.) için ses hijyeni",
      "Ameliyat (Fonomikrocerrahi) öncesi ve sonrası ses terapisi",
      "Akustik ses analizi ve aerodinamik değerlendirme"
    ]
  },
  "yutma-disfaji": {
    title: "Medikal Yutma Terapisi (Disfaji)",
    icon: Utensils,
    color: "text-amber-600",
    bg: "bg-amber-50",
    desc: "İnme, travmatik beyin hasarı, Parkinson, ALS, Demans gibi nörolojik hastalıklar veya baş-boyun kanserleri sonrası gelişen yutma güçlüklerinde (disfaji) hayati öneme sahip güvenli beslenme rehabilitasyonu.",
    points: [
      "Yemek yerken veya sıvı içerken öksürme/boğulma hissi",
      "Akciğere gıda/sıvı kaçması (Aspirasyon) riskinin azaltılması",
      "Diyet modifikasyonları (IDDSI standartları) ve postürel manevralar",
      "Aletli yutma değerlendirmeleri (FEES/MBSS) analizi"
    ]
  },
  "afazi": {
    title: "Afazi ve Nöro-İletişim",
    icon: Brain,
    color: "text-red-600",
    bg: "bg-red-50",
    desc: "İnme (felç) veya beyin kanaması gibi serebral vasküler olaylar sonrası aniden ortaya çıkan anlama, konuşma, okuma veya yazma kayıplarının (Afazi) nöroplastisite prensiplerine dayalı yoğun rehabilitasyonu.",
    points: [
      "Kelime bulma güçlüğü (Anomi)",
      "Konuşulanı anlama ve işlemleme sorunları",
      "Broca, Wernicke, Global vb. afazi tiplerine özgü terapi",
      "Gecikmiş okuma (Aleksi) ve yazma (Agrafi) rehabilitasyonu"
    ]
  },
  "aac-sistemleri": {
    title: "Alternatif ve Destekleyici İletişim (AAC)",
    icon: Volume2,
    color: "text-teal-600",
    bg: "bg-teal-50",
    desc: "Sözel iletişimin hiç olmadığı veya yetersiz kaldığı durumlarda (Serebral Palsi, Otizm, ALS vb.) bireyin ihtiyaçlarını ifade edebilmesi için uygulanan yüksek/düşük teknolojili cihaz ve sistem adaptasyonları.",
    points: [
      "Göz izleme (Eye-tracking) teknolojili cihaz uyumlaması",
      "Resim Değiş-Tokuş (PECS) ve sembol tabanlı iletişim",
      "Tablet tabanlı dijital iletişim yazılımlarının programlanması",
      "İletişim panoları ve partner stratejileri eğitimi"
    ]
  },
  "motor-konusma": {
    title: "Motor Konuşma Bozuklukları",
    icon: Cpu,
    color: "text-orange-600",
    bg: "bg-orange-50",
    desc: "Nörolojik hasarlar sonucu konuşma kaslarının zayıflığı (Dizartri) veya konuşma hareketlerini planlama zorluğu (Apraksi) durumlarında konuşma anlaşılırlığını artırmaya yönelik motor öğrenme temelli terapiler.",
    points: [
      "Apraksi (Konuşma motor planlama ve programlama bozukluğu)",
      "Dizartri (Solunum, sesleme, rezonans ve artikülasyon zayıflığı)",
      "Parkinson'a özgü konuşma terapisi (örn: LSVT LOUD/SPEAK OUT)",
      "Yoğun tekrar ve propriyoseptif geribildirim odaklı çalışma"
    ]
  },
  "sosyal-iletisim": {
    title: "Sosyal İletişim (Pragmatik)",
    icon: Heart,
    color: "text-pink-600",
    bg: "bg-pink-50",
    desc: "Otizm Spektrum Bozukluğu veya sağ hemisfer hasarı gibi durumlarda, dilin sosyal bağlamda uygun kurallarla kullanılabilmesi, ortak dikkat ve karşılıklı etkileşim becerilerinin geliştirilmesi.",
    points: [
      "Göz teması, ortak dikkat ve sıra alma",
      "Mecaz, şaka ve soyut kavramların anlaşılması",
      "Sohbet başlatma, sürdürme ve konu bütünlüğünü koruma",
      "Yüz ifadeleri ve beden dilinin doğru yorumlanması"
    ]
  },
  "icf-kodlama": {
    title: "ICF Standartlarında Değerlendirme",
    icon: Map,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    desc: "Dünya Sağlık Örgütü (WHO) tarafından geliştirilen Uluslararası Fonksiyonel Bütünleşik Sınıflandırma (ICF) çerçevesinde, hastalığın sadece medikal değil, bireyin hayatına olan çevresel ve katılımsal etkilerinin bütüncül analizi.",
    points: [
      "Sadece bozukluğa değil, yaşam kalitesine odaklanan yaklaşım",
      "Vücut yapıları ve fonksiyonlarındaki kısıtlılıkların haritalanması",
      "Çevresel bariyerler ve kolaylaştırıcı faktörlerin tespiti",
      "Disiplinlerarası ortak klinik dil kullanımı"
    ]
  },
  "ai-raporlama": {
    title: "Yapay Zeka Destekli Klinik Analiz",
    icon: FileText,
    color: "text-teal-700",
    bg: "bg-teal-100",
    desc: "Tüm değerlendirme verilerinizin klinikteki en son yapay zeka teknolojileriyle analiz edilerek, uluslararası medikal standartlarda detaylı ve objektif bir klinik rapora dönüştürülmesi süreci.",
    points: [
      "Veriye dayalı, sıfır hata paylı klinik özetleme",
      "Terapi önceliklerinin algoritmik olarak belirlenmesi",
      "Hasta ve aile için anlaşılır, detaylı sonuç raporları",
      "Kişisel verilerin uluslararası standartlarda güvenliği"
    ]
  }
};

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const data = serviceContent[resolvedParams.slug];

  if (!data) {
    notFound();
  }

  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-cream pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-4xl">
        
        <Link href="/#services" className="inline-flex items-center text-warm-gray-500 hover:text-sage-600 transition-colors mb-8 text-sm font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Ana Sayfaya Dön
        </Link>
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-sage-100 shadow-sm mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className={`w-20 h-20 rounded-2xl ${data.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-10 h-10 ${data.color}`} />
            </div>
            <div>
              <span className="text-sage-600 font-semibold tracking-wide uppercase text-sm mb-2 block">
                Klinik Değerlendirme & Terapi
              </span>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-warm-gray-800">
                {data.title}
              </h1>
            </div>
          </div>
          
          <p className="text-lg md:text-xl text-warm-gray-600 leading-relaxed font-light">
            {data.desc}
          </p>
        </div>

        {/* Details Section */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-sage-100 shadow-sm mb-12">
          <h2 className="font-serif text-2xl font-bold text-warm-gray-800 mb-8">
            Bu Alanda Hangi Konularla İlgileniyoruz?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.points.map((point: string, idx: number) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-sage-50/50">
                <CheckCircle2 className="w-6 h-6 text-sage-500 shrink-0 mt-0.5" />
                <span className="text-warm-gray-700 leading-relaxed font-medium">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-sage-600 to-teal-700 rounded-[2rem] p-10 md:p-14 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-6">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
              Profesyonel Destek Almaya Hazır Mısınız?
            </h2>
            <p className="text-sage-100 text-lg max-w-2xl mx-auto mb-8 font-light">
              Uluslararası standartlarda, kanıta dayalı ve etik kurallar çerçevesinde detaylı bir klinik değerlendirme süreci başlatmak için randevu oluşturabilirsiniz.
            </p>
            <Link href="/randevu">
              <button className="bg-white text-sage-700 hover:bg-sage-50 font-bold py-4 px-10 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mx-auto text-lg w-full md:w-auto">
                <Calendar className="w-5 h-5" />
                Danışmanlık Randevusu Al
                <ArrowRight className="w-5 h-5 ml-1" />
              </button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);
