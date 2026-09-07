import React from "react";

export function AshokaChakra({ className = "h-6 w-6 text-[#FF9933]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      {/* Outer ring */}
      <circle cx="50" cy="50" r="46" strokeWidth="3" />
      <circle cx="50" cy="50" r="42" strokeWidth="1.2" />
      {/* Center hub */}
      <circle cx="50" cy="50" r="10" fill="currentColor" />
      <circle cx="50" cy="50" r="4" fill="#FFFFFF" />
      {/* 24 spokes */}
      {[...Array(24)].map((_, i) => {
        const angle = (i * 360) / 24;
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2="50"
            y2="8"
            transform={`rotate(${angle} 50 50)`}
            strokeWidth="1.8"
          />
        );
      })}
    </svg>
  );
}

// Backwards compatibility alias
export const VeriScanDocumentEmblem = AshokaChakra;

export function VeriScanLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3" aria-label="VeriScan National Portal">
      <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[10px] sm:rounded-[12px] bg-[#111827] text-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] border border-[#3A3D45] p-1">
        <AshokaChakra className="h-5 w-5 sm:h-6 sm:w-6 text-[#FF9933]" />
        {/* Tricolor India Green accent dot */}
        <span className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 flex h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 items-center justify-center rounded-full border border-[#111827] bg-[#138808]" />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-base sm:text-xl font-bold tracking-tight text-white">
              VeriScan
            </span>
            <span className="rounded bg-[#FF9933]/20 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#FF9933] border border-[#FF9933]/40">
              GOV.IN
            </span>
          </div>
          <span className="hidden sm:inline text-[9.5px] font-medium text-slate-400">
            भारत सरकार · Ministry of Electronics & IT
          </span>
        </div>
      )}
    </div>
  );
}

export function VeriScanMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions =
    size === "lg"
      ? "h-14 w-14 rounded-[18px] p-2"
      : size === "sm"
      ? "h-8 w-8 rounded-[10px] p-1"
      : "h-10 w-10 rounded-[13px] p-1.5";
  const chakraSize = size === "lg" ? "h-9 w-9" : size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-[#111827] text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)] border border-[#3A3D45] ${dimensions}`}
      aria-hidden="true"
    >
      <AshokaChakra className={`${chakraSize} text-[#FF9933]`} />
      <span
        className={`absolute -bottom-1 -right-1 flex rounded-full border border-[#111827] bg-[#138808] ${
          size === "lg" ? "h-4 w-4" : size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"
        }`}
      />
    </div>
  );
}

