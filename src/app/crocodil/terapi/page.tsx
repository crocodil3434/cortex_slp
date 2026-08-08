"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function TerapiIndex() {
  const router = useRouter();
  useEffect(() => { router.replace("/crocodil/danisman"); }, []);
  return null;
}
