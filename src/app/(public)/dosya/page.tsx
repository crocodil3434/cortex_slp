import type { Metadata } from "next";
import { Dossier } from "@/components/theracademy/Dossier";
export const metadata: Metadata = { title: "Theracademy | Proje dosyası", robots: { index: false, follow: false } };
export default function Files() { return <Dossier />; }
