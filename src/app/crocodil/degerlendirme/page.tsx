"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function DegerlendirmeIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/crocodil/danisman"); }, []);
  return null;
}
