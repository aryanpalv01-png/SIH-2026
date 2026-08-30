import { Check, ScanLine } from "lucide-react";

export function VeriScanLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="VeriScan">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-ink text-paper shadow-[0_6px_18px_rgba(24,26,29,0.16)]">
        <div className="relative h-5 w-4 rounded-[2px] border border-paper/80 bg-transparent">
          <span className="absolute -right-px -top-px h-1.5 w-1.5 border-b border-l border-paper/80 bg-ink" />
          <ScanLine className="absolute -left-0.5 top-2 h-2.5 w-5 rotate-[-28deg] text-bronze" strokeWidth={1.2} />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-ink bg-bronze text-ink shadow-sm">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      </div>
      {!compact && <span className="font-serif text-xl font-semibold tracking-[-0.03em] text-paper">VeriScan</span>}
    </div>
  );
}

export function VeriScanMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-16 w-16 rounded-[22px]" : size === "sm" ? "h-8 w-8 rounded-[10px]" : "h-11 w-11 rounded-[15px]";
  const documentSize = size === "lg" ? "h-8 w-6" : size === "sm" ? "h-4 w-3" : "h-5 w-4";
  return (
    <div className={`relative flex shrink-0 items-center justify-center bg-ink text-paper shadow-[0_8px_22px_rgba(24,26,29,0.14)] ${dimensions}`} aria-hidden="true">
      <div className={`relative rounded-[2px] border border-paper/80 ${documentSize}`}>
        <span className="absolute -right-px -top-px h-1/4 w-1/4 border-b border-l border-paper/80 bg-ink" />
        <ScanLine className="absolute -left-0.5 top-1/2 h-2/5 w-[135%] -translate-y-1/2 rotate-[-28deg] text-bronze" strokeWidth={1.4} />
      </div>
      <span className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-ink bg-bronze text-ink ${size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"}`}>
        <Check className={size === "lg" ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} strokeWidth={3} />
      </span>
    </div>
  );
}
