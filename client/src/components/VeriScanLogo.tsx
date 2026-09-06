import React from "react";

/**
 * Institutional Forensic Document Emblem:
 * 1. Document shape with a folded top-right corner
 * 2. A single thin diagonal inspection line
 * 3. Circular wax-seal style bronze badge with a checkmark
 */
export function VeriScanDocumentEmblem({ className = "h-8 w-8 text-[#8A6D1F]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document Body with Folded Top-Right Corner */}
      <path
        d="M22 14 H64 L80 30 V86 H22 Z"
        fill="#FAF7F0"
        stroke="#8A6D1F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Folded Top-Right Corner Flap */}
      <path
        d="M64 14 V30 H80 Z"
        fill="#EEE8DA"
        stroke="#8A6D1F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Document Content Lines */}
      <line x1="32" y1="36" x2="58" y2="36" stroke="#D1CEC7" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="46" x2="68" y2="46" stroke="#D1CEC7" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="56" x2="52" y2="56" stroke="#D1CEC7" strokeWidth="2" strokeLinecap="round" />

      {/* Single Thin Diagonal Forensic Inspection Hairline */}
      <line
        x1="12"
        y1="78"
        x2="88"
        y2="22"
        stroke="#B08D2E"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />

      {/* Circular Wax-Seal Style Bronze Badge with Checkmark */}
      <g transform="translate(62, 64)">
        {/* Outer Wax Seal Circle */}
        <circle cx="0" cy="0" r="18" fill="#8A6D1F" stroke="#B08D2E" strokeWidth="1.5" />
        {/* Inner Dashed Border Ring */}
        <circle cx="0" cy="0" r="14.5" fill="none" stroke="#FAF7F0" strokeWidth="1" strokeDasharray="2 1.5" opacity="0.75" />
        {/* Crisp White Checkmark */}
        <path
          d="M-6 0 L-2 4 L7 -5"
          fill="none"
          stroke="#FAF7F0"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

// Backwards compatibility alias
export const AshokaChakra = VeriScanDocumentEmblem;

export function VeriScanLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3" aria-label="VeriScan Forensic Portal">
      <div className="relative flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[10px] sm:rounded-[12px] bg-[#2A2C30] text-[#FAF7F0] shadow-[0_4px_14px_rgba(42,44,48,0.35)] border border-[#8A6D1F]/40 p-1">
        <VeriScanDocumentEmblem className="h-full w-full" />
      </div>
      {!compact && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-base sm:text-xl font-bold tracking-tight text-[#FAF7F0]">
              VeriScan
            </span>
            <span className="rounded bg-[#8A6D1F]/25 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#B08D2E] border border-[#8A6D1F]/50">
              AUDIT
            </span>
          </div>
          <span className="hidden sm:inline text-[9.5px] font-medium tracking-wide text-[#FAF7F0]/65">
            Institutional Forensic Platform
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

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center bg-[#2A2C30] text-[#FAF7F0] shadow-[0_6px_18px_rgba(42,44,48,0.35)] border border-[#8A6D1F]/50 ${dimensions}`}
      aria-hidden="true"
    >
      <VeriScanDocumentEmblem className="h-full w-full" />
    </div>
  );
}

