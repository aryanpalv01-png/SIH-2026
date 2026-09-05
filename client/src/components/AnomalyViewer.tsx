import React, { useState } from "react";
import { AlertTriangle, Eye, EyeOff, ShieldAlert } from "lucide-react";

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

// Fallback sample anomalies if none provided by backend
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
  // 2. UI & State Logic: boolean state showAnomalies (default: false)
  const [showAnomalies, setShowAnomalies] = useState<boolean>(false);
  const [activeAnomalyId, setActiveAnomalyId] = useState<string | number | null>(null);

  const activeAnomalies = anomalies && anomalies.length > 0 ? anomalies : DEFAULT_SAMPLE_ANOMALIES;

  return (
    <div className="w-full rounded-2xl bg-[#FAF7F0] p-5 sm:p-7 border border-slate-200 shadow-xs">
      {/* 2. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="gov-pill text-[10px] bg-[#8A6D1F]/10 text-[#8A6D1F] border-[#8A6D1F]/20">
              <ShieldAlert className="h-3 w-3" />
              Interactive Bounding Box Detection
            </span>
            {showAnomalies && (
              <span className="rounded-full bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 text-[10px] font-bold">
                {activeAnomalies.length} Flagged {activeAnomalies.length === 1 ? "Zone" : "Zones"}
              </span>
            )}
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2A2C30] mt-1 tracking-tight">
            {title}
          </h2>
        </div>

        {/* Toggle Button: "Show Tampered Zones" / "Hide Tampered Zones" */}
        <button
          type="button"
          onClick={() => setShowAnomalies((prev) => !prev)}
          className="inline-flex items-center justify-center gap-2 bg-[#8A6D1F] hover:bg-[#B08D2E] text-[#FAF7F0] font-semibold rounded-lg px-4 py-2 text-xs sm:text-sm shadow-xs transition-colors duration-150 cursor-pointer select-none"
        >
          {showAnomalies ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hide Tampered Zones</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Show Tampered Zones</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Document Image inside relative positioned container */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg border border-slate-300/80 bg-slate-900 select-none">
        <img
          src={imageUrl || "/test_samples/sample_aadhaar.png"}
          alt="Scanned Document Forensic Visualizer"
          className="w-full h-auto object-contain block max-h-[640px] mx-auto"
          loading="eager"
        />

        {/* 3. The Interactive Bounding Boxes */}
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
                className="absolute border-2 border-red-500 bg-red-500/20 cursor-crosshair group transition-all duration-150 hover:bg-red-500/35 hover:border-red-600 hover:ring-2 hover:ring-red-400/50"
              >
                {/* Visual anchor tag */}
                <div className="absolute -top-3 -left-1 flex items-center justify-center h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs">
                  #{a.id}
                </div>

                {/* 3. Hover Tooltip as a dark charcoal bubble */}
                <div
                  className={`absolute z-30 pointer-events-none whitespace-nowrap rounded-md bg-[#2A2C30] text-[#FAF7F0] text-xs px-3 py-1.5 shadow-xl border border-white/10 transition-all duration-200 ${
                    // Position tooltip above if near bottom, otherwise below
                    a.y_pct > 65 ? "bottom-full mb-2" : "top-full mt-2"
                  } left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-amber-400 font-bold">⚠️</span>
                    <span>{a.reason}</span>
                  </div>
                  {/* Subtle tooltip arrow */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${
                      a.y_pct > 65
                        ? "top-full border-t-[#2A2C30]"
                        : "bottom-full border-b-[#2A2C30]"
                    }`}
                  />
                </div>
              </div>
            );
          })}
      </div>

      {/* 4. Warning text below the image: Muted red #A23E3E */}
      <div className="mt-4 flex items-start gap-2 text-xs font-medium text-[#A23E3E] bg-[#A23E3E]/10 border border-[#A23E3E]/20 rounded-lg p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[#A23E3E]" />
        <p className="leading-relaxed">
          <strong>Forensic Notice:</strong> {showAnomalies ? (
            <span>
              Highlighted bounding boxes mark coordinates flagged by deep learning noise analysis,
              ORB copy-move clone detection, or UIDAI typographic template checks. Hover over any
              flagged box to inspect the specific tampering vector.
            </span>
          ) : (
            <span>
              Click &quot;Show Tampered Zones&quot; above to project the machine-learned anomaly
              bounding boxes directly onto the scanned document.
            </span>
          )}
        </p>
      </div>

      {/* Anomaly list summary card when zones are shown */}
      {showAnomalies && activeAnomalies.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-bold text-[#2A2C30] uppercase tracking-wider mb-2.5">
            Flagged Coordinates Breakdown
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeAnomalies.map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setActiveAnomalyId(item.id)}
                onMouseLeave={() => setActiveAnomalyId(null)}
                className={`rounded-lg border p-2.5 text-xs transition-all cursor-pointer ${
                  activeAnomalyId === item.id
                    ? "border-red-500 bg-red-50 ring-1 ring-red-400"
                    : "border-slate-200 hover:border-slate-300 bg-[#FAF7F0]/50"
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
                  <span className="font-bold text-red-700">Zone #{item.id}</span>
                  <span>
                    X:{item.x_pct}% Y:{item.y_pct}% · W:{item.width_pct}% H:{item.height_pct}%
                  </span>
                </div>
                <div className="font-medium text-[#2A2C30] text-[11px] leading-snug">
                  {item.reason}
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
