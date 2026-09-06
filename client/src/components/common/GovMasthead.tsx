import { ShieldCheck } from "lucide-react";

interface GovMastheadProps {
  theme?: "dark" | "light";
  compact?: boolean;
}

export function GovMasthead({ theme = "dark", compact = false }: GovMastheadProps) {
  return (
    <div className="w-full shrink-0">
      {/* Official 3px Indian Tricolor Ribbon */}
      <div className="tiranga-stripe" />

      {/* Official Masthead Text Bar */}
      <div className="px-4 py-1.5 text-[11px] font-mono transition-colors bg-[#1C1E22] text-[#D1CEC7] border-b border-[#3A3D45]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 font-bold tracking-tight text-[#8A6D1F]">
              <span>🇮🇳</span>
              <span>भारत सरकार</span>
            </span>
            <span className="text-[#3A3D45]">|</span>
            <span className="font-semibold tracking-tight text-[#FAF7F0]">
              GOVERNMENT OF INDIA
            </span>
            {!compact && (
              <>
                <span className="hidden text-[#3A3D45] md:inline">|</span>
                <span className="hidden text-[#A09D95] lg:inline text-[10.5px]">
                  Ministry of Electronics & Information Technology (MeitY)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10.5px]">
            <span className="hidden items-center gap-1 text-[#22C55E] font-semibold sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" /> DIGITAL_INDIA
            </span>
            <span className="text-[#3A3D45] hidden sm:inline">|</span>
            <span className="command-badge bg-[#8A6D1F]/15 text-[#D1CEC7] border-[#8A6D1F]/40 font-bold">
              सत्यमेव जयते
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
