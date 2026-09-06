import { useI18n, Language } from "@/contexts/I18nContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();

  const options: { code: Language; label: string; short: string }[] = [
    { code: "en", label: "English", short: "EN" },
    { code: "hi", label: "हिन्दी", short: "हिं" },
    { code: "mr", label: "मराठी", short: "मरा" },
  ];

  return (
    <div className="inline-flex items-center border border-[#3A3D45] bg-[#1C1E22] font-mono text-[11px] select-none">
      <div className="flex items-center px-1.5 py-0.5 text-[#8A6D1F] border-r border-[#3A3D45]/70">
        <Globe className="h-3 w-3" />
      </div>
      <div className="flex items-center divide-x divide-[#3A3D45]/70">
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={`px-2 py-0.5 transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#8A6D1F] text-[#FAF7F0] font-bold"
                  : "text-[#A09D95] hover:text-[#FAF7F0] hover:bg-[#26282D]"
              }`}
              title={opt.label}
              aria-label={`Switch language to ${opt.label}`}
            >
              {compact ? opt.short : opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageSwitcher;
