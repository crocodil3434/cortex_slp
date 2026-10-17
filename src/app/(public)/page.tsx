import type { Metadata } from "next";
import { Showcase } from "@/components/theracademy/Showcase";
export const metadata: Metadata = {
  title: "Theracademy — Klinik düşünmenin yeni alanı",
  description: "Sağlık bilimleri eğitimi için klinik simülasyon. Bir vakadan klinik düşünmeye.",
};
export default function Home() { return <Showcase />; }
