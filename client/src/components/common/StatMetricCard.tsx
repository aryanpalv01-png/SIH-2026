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
      border: "border-[#FF9933]/50",
      text: "text-[#FF9933]",
    },
    green: {
      border: "border-[#138808]/50",
      text: "text-[#138808]",
    },
    review: {
      border: "border-amber-500/50",
      text: "text-amber-400",
    },
    navy: {
      border: "border-[#3A3D45]",
      text: "text-slate-300",
    },
    crimson: {
      border: "border-rose-500/50",
      text: "text-rose-400",
    },
  }[accent];

  return (
    <div className="terminal-panel p-4 font-mono">
      <div className="flex items-center justify-between border-b border-[#3A3D45] pb-2">
        <span className="text-[11px] font-bold uppercase tracking-normal text-slate-400">
          {label}
        </span>
        <div className={`flex h-7 w-7 items-center justify-center border ${accentStyles.border} bg-[#1C1E22] ${accentStyles.text}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <p className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white">
          {value}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
          <p className="truncate text-slate-400">{note}</p>
          {trend && (
            <span
              className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold border ${
                trend.positive
                  ? "border-[#138808]/40 bg-[#138808]/10 text-[#4ADE80]"
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
