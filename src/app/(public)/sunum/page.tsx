import type { Metadata } from "next";
import { Showcase } from "@/components/theracademy/Showcase";
export const metadata: Metadata = { title: "Theracademy | Toplantı", robots: { index: false, follow: false } };
export default function Presentation() { return <Showcase presentation />; }
