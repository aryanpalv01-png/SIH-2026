import React, { useState } from "react";
import { AlertTriangle, Eye, EyeOff, ShieldAlert, Crosshair } from "lucide-react";

export interface AnomalyItem {
  id: number | string;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  reason: string;
}

export interface AnomalyViewerProps {
  imageUrl?: string;
  anomalies?: AnomalyItem[];
  title?: string;
}

const DEFAULT_SAMPLE_ANOMALIES: AnomalyItem[] = [
  {
    id: 1,
    x_pct: 18,
    y_pct: 32,
    width_pct: 28,
    height_pct: 7,
    reason: "Font thickness & kerning mismatch in Aadhaar / PAN Name field",
  },
  {
    id: 2,
    x_pct: 22,
    y_pct: 44,
    width_pct: 22,
    height_pct: 6,
    reason: "Digital copy-paste splicing artifact detected around Date of Birth",
  },
  {
    id: 3,
    x_pct: 68,
    y_pct: 26,
    width_pct: 24,
    height_pct: 35,
    reason: "Face photo boundary compression discontinuity (Deepfake / Inpainting)",
  },
];

export function AnomalyViewer({
  imageUrl,
  anomalies = DEFAULT_SAMPLE_ANOMALIES,
  title = "Document Anomaly & Tamper Inspection",
}: AnomalyViewerProps) {
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [activeAnomalyId, setActiveAnomalyId] = useState<string | number | null>(null);

  const activeAnomalies = anomalies && anomalies.length > 0 ? anomalies : DEFAULT_SAMPLE_ANOMALIES;
  const hoveredOrSelected = activeAnomalies.find((a) => a.id === activeAnomalyId);

  return (
    <div className="terminal-panel p-4 sm:p-5">
      {/* Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 border-b border-[#3A3D45] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="command-badge bg-[#8A6D1F]/15 text-[#D1CEC7] border-[#8A6D1F]/40 flex items-center gap-1.5">
              <Crosshair className="h-3 w-3 text-[#8A6D1F]" />
              FORENSIC_LOUPE // BOUNDING_BOX
            </span>
            {showAnomalies && (
              <span className="command-badge bg-rose-950/60 text-rose-300 border-rose-800/60">
                {activeAnomalies.length} FLAGGED {activeAnomalies.length === 1 ? "ZONE" : "ZONES"}
              </span>
            )}
          </div>
          <h2 className="font-serif text-base sm:text-lg font-bold text-[#FAF7F0] mt-1 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setShowAnomalies((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 border border-[#8A6D1F] bg-[#8A6D1F]/15 hover:bg-[#8A6D1F]/25 text-[#FAF7F0] font-mono font-semibold px-3 py-1.5 text-xs transition-colors cursor-pointer select-none"
        >
          {showAnomalies ? (
            <>
              <EyeOff className="h-3.5 w-3.5 text-[#8A6D1F]" />
              <span>[HIDE_TAMPER_ZONES]</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-[#8A6D1F]" />
              <span>[SHOW_TAMPER_ZONES]</span>
            </>
          )}
        </button>
      </div>

      {/* Coordinate Readout Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-[#3A3D45] bg-[#1C1E22] px-3 py-1.5 font-mono text-[11px] text-[#A09D95]">
        <div className="flex items-center gap-2">
          <span className="text-[#8A6D1F] font-bold">COORDINATE_HUD:</span>
          {hoveredOrSelected ? (
            <span className="text-[#FAF7F0]">
              ZONE #{hoveredOrSelected.id} :: x: <strong className="text-[#22C55E]">{hoveredOrSelected.x_pct}%</strong>, y: <strong className="text-[#22C55E]">{hoveredOrSelected.y_pct}%</strong>, w: {hoveredOrSelected.width_pct}%, h: {hoveredOrSelected.height_pct}%
            </span>
          ) : (
            <span>HOVER_ZONE_TO_READ_COORDINATES</span>
          )}
        </div>
        <div className="text-[10px] text-[#A09D95]/70">
          PROJECTION: 1:1 CANONICAL_NORM
        </div>
      </div>

      {/* Document Image inside relative container */}
      <div className="relative w-full overflow-hidden border border-[#3A3D45] bg-[#151719] select-none">
        <img
          src={imageUrl || "/test_samples/sample_aadhaar.png"}
          alt="Forensic Visualizer Canvas"
          className="w-full h-auto object-contain block max-h-[580px] mx-auto"
          loading="eager"
        />

        {/* Interactive Bounding Boxes */}
        {showAnomalies &&
          activeAnomalies.map((a) => {
            const isHoveredOrActive = activeAnomalyId === a.id;
            return (
              <div
                key={a.id}
                onMouseEnter={() => setActiveAnomalyId(a.id)}
                onMouseLeave={() => setActiveAnomalyId(null)}
                onClick={() => setActiveAnomalyId(isHoveredOrActive ? null : a.id)}
                style={{
                  left: `${a.x_pct}%`,
                  top: `${a.y_pct}%`,
                  width: `${a.width_pct}%`,
                  height: `${a.height_pct}%`,
                }}
                className={`absolute border-2 cursor-crosshair group transition-all duration-150 ${
                  isHoveredOrActive
                    ? "border-rose-500 bg-rose-500/35 ring-1 ring-rose-400"
                    : "border-rose-500/80 bg-rose-500/20 hover:bg-rose-500/30"
                }`}
              >
                {/* Visual anchor tag */}
                <div className="absolute -top-3 -left-1 flex items-center justify-center h-4 px-1 border border-rose-700 bg-rose-600 text-white font-mono text-[9px] font-bold">
                  #{a.id}
                </div>

                {/* Hover Tooltip */}
                <div
                  className={`absolute z-30 pointer-events-none whitespace-nowrap border border-[#3A3D45] bg-[#1C1E22] text-[#FAF7F0] font-mono text-[11px] px-2.5 py-1 transition-all duration-150 ${
                    a.y_pct > 65 ? "bottom-full mb-2" : "top-full mt-2"
                  } left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-rose-400 font-bold">⚠️ [{a.x_pct}%, {a.y_pct}%]</span>
                    <span>{a.reason}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Flagged Coordinates Breakdown Table */}
      {showAnomalies && activeAnomalies.length > 0 && (
        <div className="mt-3 border border-[#3A3D45] bg-[#1C1E22] p-3">
          <div className="font-mono text-[10px] font-bold text-[#A09D95] uppercase tracking-wider mb-2">
            Flagged Coordinates Matrix
          </div>
          <div className="space-y-1.5">
            {activeAnomalies.map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setActiveAnomalyId(item.id)}
                onMouseLeave={() => setActiveAnomalyId(null)}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border font-mono text-xs transition-colors cursor-pointer ${
                  activeAnomalyId === item.id
                    ? "border-rose-500 bg-rose-950/30 text-[#FAF7F0]"
                    : "border-[#3A3D45] bg-[#26282D] text-[#D1CEC7] hover:border-[#8A6D1F]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="command-badge bg-rose-950/60 text-rose-300 border-rose-800/60 text-[10px]">
                    ZONE #{item.id}
                  </span>
                  <span className="text-[11px] text-[#FAF7F0]">{item.reason}</span>
                </div>
                <div className="text-[10px] text-[#A09D95] font-mono">
                  x: <strong className="text-[#8A6D1F]">{item.x_pct}%</strong> y: <strong className="text-[#8A6D1F]">{item.y_pct}%</strong> [w:{item.width_pct}% h:{item.height_pct}%]
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnomalyViewer;
