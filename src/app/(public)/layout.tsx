import type { Metadata } from "next";
export const metadata: Metadata = { icons: { icon: "/theracademy/mark.svg" } };
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
