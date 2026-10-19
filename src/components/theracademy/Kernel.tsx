import { useId } from "react";
import styles from "./showcase.module.css";

export function Kernel({ compact = false }: { compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const rings = Array.from({ length: 28 }, (_, i) => {
    const angle = i * Math.PI / 28;
    const points = Array.from({ length: 101 }, (_, j) => {
      const t = j * Math.PI * 2 / 100;
      const radius = 145 + 28 * Math.cos(3 * t + angle * 2);
      const x = 300 + radius * Math.cos(t) * Math.cos(angle) - 72 * Math.sin(t) * Math.sin(angle);
      const y = 300 + radius * Math.cos(t) * Math.sin(angle) + 72 * Math.sin(t) * Math.cos(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(" ");
    return <polyline key={i} points={points} fill="none" stroke={`url(#${id})`} strokeWidth="1" opacity={0.45 + (i % 4) * 0.13} />;
  });
  return <div className={`${styles.kernel} ${compact ? styles.compact : ""}`} aria-hidden="true">
    <svg viewBox="0 0 600 600"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e1ff58"/><stop offset=".5" stopColor="#a4cf2c"/><stop offset="1" stopColor="#465b1a"/></linearGradient></defs>
      <circle cx="300" cy="300" r="247" fill="none" stroke="currentColor" strokeOpacity=".12" strokeDasharray="2 8"/>
      <circle cx="300" cy="300" r="216" fill="none" stroke="currentColor" strokeOpacity=".15"/>
      <g className={styles.kernelSpin}>{rings}</g>
      <circle cx="300" cy="300" r="21" fill="#d6fa4d"/>
      <path d="M300 45v28M300 527v28M45 300h28M527 300h28" stroke="currentColor" strokeOpacity=".5"/>
    </svg>
    <span className={styles.kernelLabel}>CASE KERNEL / 001</span>
    <span className={styles.kernelLabelBottom}>ÖYKÜ · BAĞLAM · KARAR</span>
  </div>;
}
