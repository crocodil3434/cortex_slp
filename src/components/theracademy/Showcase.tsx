"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, AudioLines, CirclePause, FileText, Maximize2, Menu, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import data from "@/content/theracademy.json";
import { Kernel } from "./Kernel";
import { useSound } from "./useSound";
import s from "./showcase.module.css";

const choices = [
  { label: "Konuşma örneğini incele", response: "Bu kısa örnekte gözlenen akıcılık, farklı bağlamları tek başına açıklamayabilir.", reflection: "Bir sonraki sorunda hangi bağlamı araştırırdın?" },
  { label: "Günlük yaşamı keşfet", response: "“Söylemek istediğim şeyi bazen değiştiriyorum. Özellikle yeni biriyle tanışırken.”", reflection: "Gözlenebilir konuşmanın yanında kişinin deneyimi de yeni bilgi sunuyor." },
  { label: "Kişinin hedefini sor", response: "“Toplantılarda söyleyeceklerimi ertelemeden paylaşabilmek istiyorum.”", reflection: "Kişinin önceliğini öğrenmek, değerlendirme sorularına yön verebilir." },
];
const chapterIds = data.chapters.map(c => c.id);

export function Showcase({ presentation = false }: { presentation?: boolean }) {
  const [active, setActive] = useState(0);
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [phase, setPhase] = useState(0);
  const [clip, setClip] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sound = useSound();
  const go = useCallback((index: number) => {
    const next = Math.max(0, Math.min(chapterIds.length - 1, index));
    setActive(next); setMenu(false);
    if (!presentation) document.getElementById(chapterIds[next])?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [presentation]);
  useEffect(() => {
    if (presentation) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(chapterIds.indexOf(entry.target.id));
    }, { rootMargin: "-25% 0px -35% 0px", threshold: 0 });
    root.current?.querySelectorAll("section[data-scene]").forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [presentation]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "Escape") { setMenu(false); menuButton.current?.focus(); return; }
      if (!presentation || menu || target.closest("button,a,input,textarea,select")) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) { event.preventDefault(); go(active + 1); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) { event.preventDefault(); go(active - 1); }
      if (event.key === "Home") { event.preventDefault(); go(0); }
      if (event.key === "End") { event.preventDefault(); go(chapterIds.length - 1); }
    };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [active, go, menu, presentation]);
  useEffect(() => {
    if (!clip || paused) return;
    const timer = window.setInterval(() => setPhase(prev => { if (prev >= 3) return 0; return prev + 1; }), 2400);
    return () => window.clearInterval(timer);
  }, [clip, paused]);
  async function fullscreen() {
    try { if (!document.fullscreenElement) await root.current?.requestFullscreen(); else await document.exitFullscreen(); setFullscreenError(""); }
    catch { setFullscreenError("Tam ekran desteklenmiyor. Tarayıcının tam ekran seçeneğini kullanabilirsiniz."); }
  }
  const visible = (index: number) => !presentation || active === index;
  const tag = (index: number) => <div className={s.sectionTag}><span>{data.chapters[index].number} / {data.chapters[index].label}</span><Link href={`/dosya#${data.chapters[index].id}`} className={s.dossierLink}>Dosya {data.chapters[index].number} <ArrowUpRight size={13}/></Link></div>;
  return <div ref={root} className={`${s.world} ${presentation ? s.presentation : ""} ${paused ? s.paused : ""}`}>
    <a className={s.skip} href="#main">İçeriğe geç</a>
    <header className={s.header}>
      <Link href="/" className={s.brand} aria-label="Theracademy ana sayfa"><span className={s.brandMark}>t<span>↗</span></span>theracademy</Link>
      <nav className={s.desktopNav} aria-label="Ana menü"><button onClick={() => go(1)}>Yaklaşım</button><button onClick={() => go(3)}>Deneyim</button><button onClick={() => go(5)}>Gelecek</button></nav>
      <div className={s.headerActions}><Link className={s.headerCta} href={presentation ? "/" : "/sunum"}>{presentation ? "Vitrine dön" : "Sunumu başlat"}<ArrowUpRight size={16}/></Link><button ref={menuButton} className={s.iconButton} aria-label={menu ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={menu} aria-controls="chapter-menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
    </header>
    {menu && <nav id="chapter-menu" aria-label="Bölümler" className={s.menu}>{data.chapters.map((c,i) => <button key={c.id} onClick={() => go(i)}><small>{c.number}</small>{c.label}<ArrowUpRight/></button>)}<Link href="/dosya">Proje dosyası <FileText/></Link></nav>}
    <main id="main">
      {visible(0) && <section id="baslangic" data-scene className={`${s.hero} ${s.scene}`}>
        <div className={s.heroTop}><span><i/> KLİNİK SİMÜLASYON TEKNOLOJİLERİ</span><span>İNSAN ODAKLI. BİLİM TEMELLİ.</span></div>
        <h1 className={s.heroTitle}><span>KLİNİK</span><span className={s.outline}>DÜŞÜNMENİN</span><span>YENİ ALANI<span className={s.lime}>.</span></span></h1>
        <div className={s.heroKernel}><Kernel/></div>
        <div className={s.heroFoot}><div><span className={s.eyebrow}>BİR VAKADAN KLİNİK DÜŞÜNMEYE</span><p>Bilgiyi deneyime.<br/>Deneyimi yeni bir bakışa.</p></div><button className={s.roundCta} onClick={() => go(3)} aria-label="Örnek vakayı keşfet"><ArrowUpRight size={34}/><span>DENEYİMİ<br/>KEŞFET</span></button><button className={s.scrollHint} onClick={() => go(1)}>HİKÂYEYE GİR <ArrowDown size={18}/></button></div>
        <div className={s.heroBottom}><span>THERACADEMY / GELİŞTİRME AŞAMASINDA</span><span>01 — 07</span><span>SAĞLIK BİLİMLERİ İÇİN</span></div>
      </section>}
      {!presentation && <div className={s.ribbon} aria-hidden="true"><div className={s.ribbonTrack}>{[0, 1].map(copy => <span className={s.ribbonGroup} key={copy}>{Array.from({ length: 4 }, (_, repeat) => <span key={repeat}>KEŞFET ↗ DENEYİMLE ↗ DÜŞÜN ↗ GELİŞ ↗</span>)}</span>)}</div></div>}
      {visible(1) && <section id="yaklasim" data-scene className={`${s.scene} ${s.approach}`}>
        {tag(1)}<div className={s.split}><div><h2>EZBERİN<br/>BİTTİĞİ<br/><em>YERDE.</em></h2><p className={s.lead}>Bir insanı anlamak, bir bilgiyi hatırlamaktan fazlasını gerektirir.</p></div><div className={s.approachRight}><p>Öykü. Bağlam. Belirsizlik.<br/>Ve senin bir sonraki sorun.</p><div className={s.pathDrawing} aria-hidden="true"><svg viewBox="0 0 500 270">
          <path className={s.connectionBase} d="M30 140H130"/>
          <path className={s.connectionBase} d="M130 140C210 140 160 40 240 40S280 230 370 230H470"/>
          <path className={`${s.connectionBase} ${s.connectionGreen}`} d="M130 140C220 140 170 215 250 215S310 60 390 60H470"/>
          <path className={s.connectionPulse} pathLength="100" d="M30 140H130C210 140 160 40 240 40S280 230 370 230H470"/>
          <path className={s.connectionPulse} pathLength="100" d="M30 140H130C220 140 170 215 250 215S310 60 390 60H470"/>
          <circle cx="30" cy="140" r="9"/><circle cx="470" cy="230" r="9"/><circle cx="470" cy="60" r="9"/>
        </svg><span>BİLGİ</span><span>KLİNİK KARAR</span></div><p className={s.smallCopy}>Theracademy, klinik düşünme pratiği için yapılandırılmış vaka deneyimleri geliştirmeyi hedefler.</p></div></div>
        <div className={s.principles}>{["Bağlamı gör.","Sorunu derinleştir.","Kararını gerekçelendir."].map((t,i) => <div key={t}><small>0{i+1}</small><span>{t}</span><ArrowUpRight/></div>)}</div>
      </section>}
      {visible(2) && <section id="biz" data-scene className={`${s.scene} ${s.about}`}>
        {tag(2)}<div className={s.split}><div><h2>KLİNİKTEN<br/>DOĞAN<br/><em>BİR FİKİR.</em></h2><p className={s.lead}>Klinik deneyim × eğitim tasarımı × teknoloji.</p><p className={s.smallCopy}>İlk odağımız dil ve konuşma terapisi. Başlangıç alanımız akıcılık bozuklukları. Hedefimiz, sağlık bilimlerinde yeni bir öğrenme deneyimi geliştirmek.</p><div className={s.founder}><span>MFY</span><div><strong>Muhammed Furkan Yaya</strong><small>Dil ve Konuşma Terapisti · Girişimci</small></div></div></div><div className={s.missionStack}><article><small>01 / MİSYONUMUZ</small><h3>Deneyime<br/>alan açmak.</h3><p>Yapılandırılmış simülasyonlarla klinik düşünme ve karar verme pratiğini desteklemek.</p></article><article><small>02 / VİZYONUMUZ</small><h3>Disiplinlerin<br/>ötesine geçmek.</h3><p>Akademik değerlendirmeyle gelişen, farklı sağlık disiplinlerine uyarlanabilen bir platform oluşturmak.</p></article></div></div>
      </section>}
      {visible(3) && <section id="deneyim" data-scene className={`${s.scene} ${s.experience}`}>
        {tag(3)}<div className={s.experienceHeading}><h2>BİR VAKA.<br/><em>YENİ BİR BAKIŞ.</em></h2><p>Bir sonraki soruyu sen seç.<br/><span>Sentetik örnek · Etkileşimli gösterim</span></p></div>
        <div className={s.simulation}><div className={s.patientVisual}><div className={s.patientTop}><span>TA / DEMO 001</span><span className={s.pill}>SENTETİK VAKA</span></div><svg className={s.portrait} viewBox="0 0 360 330" aria-hidden="true"><defs><linearGradient id="portrait" x2="1" y2="1"><stop stopColor="#bdde77"/><stop offset="1" stopColor="#53775e"/></linearGradient></defs><circle cx="180" cy="152" r="123" fill="none" stroke="#b9d681" strokeOpacity=".2"/>{Array.from({length:9},(_,i)=><ellipse key={i} cx="180" cy="152" rx={25+i*12} ry="123" fill="none" stroke="#b9d681" strokeOpacity=".1"/>)}<path d="M65 330c5-65 44-88 80-101v-30c-22-15-34-43-34-74 0-49 28-78 69-78s69 29 69 78c0 31-12 59-34 74v30c36 13 75 36 80 101" fill="url(#portrait)"/><path d="M113 113c0-49 35-73 70-73 49 0 71 37 69 83-18-8-30-20-41-39-20 25-53 34-98 29Z" fill="#1c3229"/><path d="M143 147h20m36 0h20m-39 3-5 29h13m-27 21q19 10 38 0" fill="none" stroke="#294838" strokeWidth="3" strokeLinecap="round"/><path d="m145 230 35 38 35-38m-35 38v62" fill="none" stroke="#294838" strokeWidth="2"/></svg><div className={s.patientQuote}>“Bazen söylemek<br/>istediklerimi<br/><em>erteliyorum.</em>”</div><div className={s.wave} aria-hidden="true">{Array.from({length:35},(_,i)=><i key={i} style={{height: `${9+((i*17)%37)}px`,animationDelay:`${i*-.07}s`}}/>)}</div></div><div className={s.casePanel}><span className={s.eyebrow}>AKICILIK / İLK GÖRÜŞME</span><h3>Nereden<br/>başlarsın?</h3><p>Konuşma güçlüğü yaşadığını ifade eden bir yetişkinle ilk görüşmedesin. Hangi bilgiyi keşfetmek istersin?</p><div className={s.choices}>{choices.map((c,i)=><button key={c.label} aria-pressed={choice===i} onClick={()=>{setChoice(i);sound.cue();}}><span>0{i+1}</span>{c.label}<ArrowUpRight size={20}/></button>)}</div><div className={s.response} aria-live="polite">{choice===null ? <p>Bir soru seç. Vakaya yeni bir pencereden bak.</p> : <><small>KEŞFEDİLEN BİLGİ</small><p>{choices[choice].response}</p><span>{choices[choice].reflection}</span><button onClick={()=>setChoice(null)}><RotateCcw size={13}/> Baştan keşfet</button></>}</div><small className={s.demoNote}>Önceden yazılmış gösterimdir. Gerçek hasta, canlı yapay zekâ veya klinik değerlendirme değildir.</small></div></div>
        <div className={s.clipStrip}><div><small>ANİMASYON / VAKANIN YOLCULUĞU</small><strong>{["Bir öyküyle başlar.","Bağlamla derinleşir.","Kararla şekillenir.","Geri bildirimle gelişir."][phase]}</strong></div><div className={s.clipSteps}>{["ÖYKÜ","BAĞLAM","KARAR","GERİ BİLDİRİM"].map((label,i)=><button aria-label={`${label} aşaması`} aria-pressed={phase===i} className={phase===i ? s.stepActive : ""} key={label} onClick={()=>{setPhase(i);setClip(false);}}><span>0{i+1}</span>{label}</button>)}</div><button className={s.iconButton} aria-label={clip ? "Animasyonu durdur" : "Animasyonu oynat"} onClick={()=>setClip(!clip)}>{clip ? <CirclePause/> : <Play/>}</button></div>
      </section>}
      {visible(4) && <section id="model" data-scene className={`${s.scene} ${s.business}`}>
        {tag(4)}<div className={s.modelHeading}><span className={s.eyebrow}>ÖNERİLEN GELİR MODELİ</span><h2>DEĞER ÜRET.<br/><em>SÜREKLİLİK KUR.</em></h2></div><div className={s.modelGrid}><div className={s.modelCore}><Kernel compact/><span>THERACADEMY</span><p>Kurum · Öğrenen · İçerik</p></div><div className={s.modelRows}>{[{n:"01",title:"Kurumsal lisans",sub:"ANA MODEL",text:"Üniversite ve bölüm düzeyinde yıllık kullanım."},{n:"02",title:"Dönemlik erişim",sub:"TAMAMLAYICI",text:"Ders ve dönem kapsamına göre öğrenci erişimi."},{n:"03",title:"Özel içerik & destek",sub:"TAMAMLAYICI",text:"Kuruma özgü içerik ve uygulamaya geçiş desteği."}].map(row=><article key={row.n}><span>{row.n}</span><div><small>{row.sub}</small><h3>{row.title}</h3><p>{row.text}</p></div><ArrowUpRight/></article>)}</div></div><div className={s.modelFoot}><span>Önce ihtiyacı ve ödeme isteğini doğrula.</span><p>Fiyatlandırma araştırılacak. Hibe ve proje fonları, Ar-Ge finansmanı olarak ayrıca ele alınacak.</p></div>
      </section>}
      {visible(5) && <section id="gelecek" data-scene className={`${s.scene} ${s.roadmap}`}>
        {tag(5)}<h2>ÖNCE DERİNLEŞ.<br/><em>SONRA GENİŞLE.</em></h2><div className={s.roadmapGrid}>{[{time:"0—6",label:"KISA VADE",title:"Çekirdeği kur.",text:"Prototip, uzman incelemesi ve pilot hazırlığı.",gate:"Geçiş ölçütü: kullanılabilir deneyim ve pilot protokolü."},{time:"6—18",label:"ORTA VADE",title:"Sahada öğren.",text:"Pilot uygulamalar, iyileştirme ve kurumsal kullanım.",gate:"Geçiş ölçütü: pilot bulguları ve ücretli kullanımın sınanması."},{time:"18—36",label:"UZUN VADE",title:"Etkiyi genişlet.",text:"Yeni disiplinler, dil seçenekleri ve uluslararası ortaklıklar.",gate:"Geçiş ölçütü: sürdürülebilir içerik üretimi ve kullanım."}].map((r,i)=><article key={r.time}><small>{r.label}</small><div className={s.timelineNumber}>{r.time}<span>AY</span></div><div className={s.timelineLine}><span/> <ArrowRight size={22}/></div><h3>{r.title}</h3><p>{r.text}</p><small>{r.gate}</small><span className={s.timelineIndex}>0{i+1}</span></article>)}</div><p className={s.roadmapNote}>Planlama varsayımıdır. Takvim; ekip kapasitesi, finansman ve pilot sonuçlarına göre güncellenecek.</p>
      </section>}
      {visible(6) && <section id="birlikte" data-scene className={`${s.scene} ${s.closing}`}>
        {tag(6)}<span className={s.eyebrow}>BİR SONRAKİ ADIM</span><h2>GELECEĞİ<br/><em>BİRLİKTE</em><br/>DENEYİMLEYELİM<span className={s.lime}>.</span></h2><div className={s.closingBottom}><p>Akademik değerlendirme.<br/>Pilot uygulama.<br/>Girişim geliştirme.</p><Link href="/dosya" className={s.primaryButton}>Proje dosyasını aç <ArrowUpRight/></Link></div><footer className={s.footer}><span>THERACADEMY © 2026<br/><small>Bir Crocodil ürün girişimi.</small></span><a href="mailto:dktfurkan@gmail.com">İletişime geç <ArrowUpRight size={16}/></a><span>GÖRÜŞME TASLAĞI / V{data.version}</span></footer>
      </section>}
    </main>
    <div className={s.controls} aria-label="Deneyim kontrolleri"><button aria-label={sound.enabled ? "Sesi kapat" : "Sesi aç"} aria-pressed={sound.enabled} onClick={sound.toggle}>{sound.enabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>SES {sound.enabled ? "AÇIK" : "KAPALI"}</span></button><button aria-label={paused ? "Hareketleri sürdür" : "Hareketleri duraklat"} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused ? <Play size={16}/> : <CirclePause size={16}/>}</button>{presentation && <button aria-label="Tam ekranı değiştir" onClick={fullscreen}><Maximize2 size={16}/></button>}<AudioLines size={16} className={s.controlDecoration}/></div>
    {presentation && <div className={s.presenterBar}><button aria-label="Önceki bölüm" disabled={active===0} onClick={()=>go(active-1)}><ArrowLeft/></button><span aria-live="polite">{data.chapters[active].number} / 07 <small>{data.chapters[active].label}</small></span><button aria-label="Sonraki bölüm" disabled={active===6} onClick={()=>go(active+1)}><ArrowRight/></button></div>}
    {(sound.error || fullscreenError) && <p role="status" className={s.notice}>{sound.error || fullscreenError}</p>}
  </div>;
}
