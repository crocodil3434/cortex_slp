import { Hero } from "@/components/sections/Hero";
import { ClinicalServices } from "@/components/sections/ClinicalServices";
import { ClinicalPhilosophy } from "@/components/sections/ClinicalPhilosophy";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-clinical-white">
      <Hero />
      <ClinicalServices />
      <ClinicalPhilosophy />
    </div>
  );
}
