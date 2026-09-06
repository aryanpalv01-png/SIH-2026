import { ReactNode } from "react";

interface StatMetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  note: string;
  accent?: "saffron" | "green" | "review" | "navy" | "crimson";
  trend?: {
    text: string;
    positive?: boolean;
  };
}

export function StatMetricCard({
  icon,
  label,
  value,
  note,
  accent = "saffron",
  trend,
}: StatMetricCardProps) {
  const accentStyles = {
    saffron: {
      border: "border-[#8A6D1F]/50",
      text: "text-[#8A6D1F]",
    },
    green: {
      border: "border-[#22C55E]/50",
      text: "text-[#22C55E]",
    },
    review: {
      border: "border-amber-500/50",
      text: "text-amber-400",
    },
    navy: {
      border: "border-[#3A3D45]",
      text: "text-[#D1CEC7]",
    },
    crimson: {
      border: "border-rose-500/50",
      text: "text-rose-400",
    },
  }[accent];

  return (
    <div className="terminal-panel p-4 font-mono">
      <div className="flex items-center justify-between border-b border-[#3A3D45] pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A09D95]">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center border ${accentStyles.border} bg-[#1C1E22] ${accentStyles.text}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <p className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#FAF7F0]">
          {value}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px]">
          <p className="truncate text-[#A09D95]">{note}</p>
          {trend && (
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[9.5px] font-bold border ${
                trend.positive
                  ? "border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E]"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {trend.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
