// Değerlendirme formları için paylaşılan prop tipi
import type { Assessment } from "@/lib/crocodil/types";

export interface AssessmentFormProps {
  assessment: Assessment;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    gender?: string;
  };
  onSave: (data: Partial<Assessment>) => Promise<void>;
}

// Paylaşılan stil sabitleri
export const LABEL = "text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1";
export const INPUT = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 transition-colors bg-white";
export const SECTION = "bg-white rounded-2xl p-5 border space-y-4 mb-4";
export const SECTION_TITLE = "flex items-center gap-2 font-semibold text-gray-700 text-sm";
export const TEXTAREA = "w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 transition-colors bg-white resize-none";

export function ScaleSelector({
  label,
  value,
  max,
  labels,
  onChange,
  color = "#0d9488",
}: {
  label: string;
  value?: number;
  max: number;
  labels?: string[];
  onChange: (v: number) => void;
  color?: string;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className="flex flex-col items-center gap-0.5 transition-all"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border-2 transition-all"
              style={{
                background: value === i ? color : "white",
                borderColor: value === i ? color : "#e5e7eb",
                color: value === i ? "white" : "#374151",
              }}
            >
              {i}
            </div>
            {labels?.[i] && (
              <span className="text-[9px] text-gray-400 w-9 text-center leading-tight">{labels[i]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  refRange,
  onChange,
}: {
  label: string;
  value?: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  refRange?: [number, number];
  onChange: (v: number) => void;
}) {
  const inRange = value !== undefined && refRange
    ? value >= refRange[0] && value <= refRange[1]
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={LABEL}>{label}</span>
        <div className="flex items-center gap-2">
          {value !== undefined && (
            <span className="text-sm font-bold" style={{ color: inRange === false ? "#ef4444" : inRange === true ? "#10b981" : "#374151" }}>
              {value}{unit}
            </span>
          )}
          {refRange && (
            <span className="text-xs text-gray-400">({refRange[0]}–{refRange[1]}{unit})</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 0.1}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-500"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

export function NumberInput({
  label,
  value,
  placeholder,
  min,
  max,
  step,
  unit,
  refMin,
  refMax,
  refLabel,
  onChange,
}: {
  label: string;
  value?: number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  refMin?: number;
  refMax?: number;
  refLabel?: string;
  onChange: (v: number | undefined) => void;
}) {
  const inRange =
    value !== undefined && refMin !== undefined && refMax !== undefined
      ? value >= refMin && value <= refMax
      : null;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className={LABEL}>{label}</span>
        {refLabel && <span className="text-xs text-gray-400">{refLabel}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step ?? 0.01}
          placeholder={placeholder ?? "—"}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={INPUT + " pr-10"}
          style={{
            borderColor: inRange === false ? "#ef4444" : inRange === true ? "#10b981" : "#e5e7eb",
          }}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
        )}
      </div>
      {inRange === false && (
        <p className="text-xs text-red-500 mt-0.5">⚠️ Referans aralığı dışında</p>
      )}
      {inRange === true && (
        <p className="text-xs text-green-500 mt-0.5">✓ Normal aralık</p>
      )}
    </div>
  );
}

export function CheckboxGroup({
  label,
  options,
  selected,
  onChange,
  cols = 2,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (s: string[]) => void;
  cols?: number;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer group">
            <div
              className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                borderColor: selected.includes(opt) ? "#0d9488" : "#d1d5db",
                background: selected.includes(opt) ? "#0d9488" : "white",
              }}
              onClick={() => toggle(opt)}
            >
              {selected.includes(opt) && (
                <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-white">
                  <path d="M1 4L3.5 6.5L9 1" strokeWidth="1.5" stroke="white" fill="none" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function RadioGroup({
  label,
  options,
  value,
  onChange,
  inline,
}: {
  label: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string) => void;
  inline?: boolean;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className={`flex gap-2 ${inline ? "flex-wrap" : "flex-col"}`}>
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{ borderColor: value === opt.value ? "#0d9488" : "#d1d5db" }}
              onClick={() => onChange(opt.value)}
            >
              {value === opt.value && (
                <div className="w-2 h-2 rounded-full" style={{ background: "#0d9488" }} />
              )}
            </div>
            <span className="text-sm text-gray-700">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="sticky bottom-4 mx-5 mt-4">
      <div className="bg-white rounded-2xl border p-3 flex items-center justify-between shadow-lg"
        style={{ borderColor: "#e5f7f5" }}>
        <span className="text-xs text-gray-400">Değişiklikler otomatik kaydedilir</span>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #0d9488, #134e4a)" }}
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
