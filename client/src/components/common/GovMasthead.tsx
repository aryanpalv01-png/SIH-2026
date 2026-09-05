import { ShieldCheck } from "lucide-react";

interface GovMastheadProps {
  theme?: "dark" | "light";
  compact?: boolean;
}

export function GovMasthead({ theme = "dark", compact = false }: GovMastheadProps) {
  const isDark = theme === "dark";

  return (
    <div className="w-full shrink-0">
      {/* Official 4px Indian Tricolor Ribbon */}
      <div className="tiranga-stripe" />

      {/* Official Masthead Text Bar */}
      <div
        className={`px-4 py-1.5 text-[11px] font-medium transition-colors ${
          isDark
            ? "bg-[#060E1A] text-slate-300 border-b border-white/10"
            : "bg-slate-100 text-slate-700 border-b border-slate-200"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-tight text-saffron">
              <span>🇮🇳</span>
              <span>भारत सरकार</span>
            </span>
            <span className={isDark ? "text-white/25" : "text-slate-300"}>|</span>
            <span className="font-semibold tracking-tight text-slate-200">
              GOVERNMENT OF INDIA
            </span>
            {!compact && (
              <>
                <span className="hidden text-white/25 md:inline">|</span>
                <span className="hidden text-slate-400 lg:inline">
                  Ministry of Electronics & Information Technology (MeitY)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10.5px]">
            <span className="hidden items-center gap-1 text-india-green font-semibold sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-india-green" /> Digital India
            </span>
            <span className={isDark ? "text-white/20 hidden sm:inline" : "text-slate-300 hidden sm:inline"}>|</span>
            <span className="rounded bg-saffron/15 px-1.5 py-0.5 font-bold uppercase tracking-wider text-saffron border border-saffron/30">
              सत्यमेव जयते
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
