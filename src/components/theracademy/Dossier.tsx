"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Download, Printer } from "lucide-react";
import data from "@/content/theracademy.json";
import s from "./showcase.module.css";
export function Dossier() {
  return <div className={s.world}><main className={s.document}>
    <header className={s.documentHeader}><Link href="/"><ArrowLeft size={16}/> Theracademy</Link><span className={s.eyebrow}>{data.status} · V{data.version} · {data.date}</span></header>
    <span className={s.eyebrow}>TOPLANTIYA EŞLİK EDEN PROJE DOSYASI</span><h1>Fikrin<br/>arkasındaki yapı.</h1><p className={s.documentIntro}>Sunumda deneyimlediğiniz her bölümün ayrıntısı burada. Aynı numaralar, aynı anlatı; incelemek ve üzerine konuşmak için daha fazla alan.</p>
    <div className={s.documentActions}><a href="/theracademy/theracademy-toplanti-dosyasi.pdf" download><Download size={17}/> Toplantı dosyasını indir</a><button onClick={()=>window.print()}><Printer size={17}/> Bu sayfayı yazdır</button><Link href="/sunum">Sunumu aç <ArrowUpRight size={17}/></Link></div>
    <nav className={s.documentNav} aria-label="Dosya bölümleri">{data.chapters.map(c=><a key={c.id} href={`#${c.id}`}>{c.number} / {c.label}</a>)}</nav>
    {data.chapters.map(c=><section key={c.id} id={c.id} className={s.documentSection}><span>{c.number}</span><div><h2>{c.title}</h2><p>{c.detail}</p><ul>{c.points.map(point=><li key={point}>{point}</li>)}</ul></div></section>)}
    <section className={s.documentSection}><span>+</span><div><h2>Görüşmede netleştirilecekler</h2><ul><li>Pilotun kapsamı, sorumluları, katılımcı grubu ve değerlendirme ölçütleri.</li><li>Akademik ve teknik ekip rolleri; vaka inceleme süreci.</li><li>Hedef kurumlarla satın alma süreci ve ödeme isteği görüşmeleri.</li><li>İçerik üretimi, yazılım, hizmet ve destek maliyetleri.</li><li>Kurumsal iş birliği ve kuluçka desteği için izlenecek yol.</li></ul></div></section>
    <footer className={s.documentEnd}><p>Theracademy bir Crocodil ürün girişimidir. Bu dosya görüşme taslağıdır; doğrulanmış etkinlik, gerçekleşmiş gelir veya kesinleşmiş kurumsal ortaklık beyanı değildir.</p><p>İletişim: <a href="mailto:dktfurkan@gmail.com">dktfurkan@gmail.com</a> · Muhammed Furkan Yaya</p></footer>
  </main></div>;
}
