import { useEffect, useRef, useState } from "react";
import { VerificationDocument, VerificationCheck } from "@/lib/veriscan";
import { CheckSeal } from "./StatusSeal";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Layers,
  Search,
  Crosshair,
  Sliders,
  Sparkles,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";

export type ForensicLayer =
  | "optical"
  | "ela"
  | "typography"
  | "noise"
  | "clones";

interface ForensicLoupeCanvasProps {
  document: VerificationDocument;
  onSelectCheck?: (check: VerificationCheck) => void;
}

export function ForensicLoupeCanvas({
  document,
  onSelectCheck,
}: ForensicLoupeCanvasProps) {
  const [activeLayer, setActiveLayer] = useState<ForensicLayer>("optical");
  const [loupeActive, setLoupeActive] = useState<boolean>(false);
  const [loupeZoom, setLoupeZoom] = useState<number>(4);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<any | null>(null);
  const [showFlags, setShowFlags] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const flaggedChecks = document.checks.filter(
    (c) => c.flaggedRegion && c.result === "flag"
  );

  // Draw simulated or computed forensic overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (activeLayer === "optical") {
      // Clean optical scan representation
      return;
    }

    if (activeLayer === "ela") {
      // ELA Heatmap (Error Level Analysis)
      // Simulates compression artifact gradient: cold blue for uniform blocks, hot red/yellow on tampered regions
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(10, 20, 60, 0.45)");
      gradient.addColorStop(0.5, "rgba(20, 60, 110, 0.4)");
      gradient.addColorStop(1, "rgba(10, 30, 80, 0.5)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Render high-frequency compression mismatch hotspots on flagged coordinates
      flaggedChecks.forEach((check, idx) => {
        const r = check.flaggedRegion!;
        const rx = (r.x / 100) * width;
        const ry = (r.y / 100) * height;
        const rw = (r.width / 100) * width;
        const rh = (r.height / 100) * height;

        const radGrad = ctx.createRadialGradient(
          rx + rw / 2,
          ry + rh / 2,
          5,
          rx + rw / 2,
          ry + rh / 2,
          Math.max(rw, rh) * 1.1
        );
        radGrad.addColorStop(0, "rgba(255, 45, 45, 0.85)"); // Hot red core
        radGrad.addColorStop(0.4, "rgba(255, 170, 0, 0.6)"); // Amber halo
        radGrad.addColorStop(0.7, "rgba(255, 235, 60, 0.35)");
        radGrad.addColorStop(1, "rgba(0, 210, 255, 0)");

        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(rx + rw / 2, ry + rh / 2, Math.max(rw, rh) * 1.1, 0, Math.PI * 2);
        ctx.fill();
      });

      // Overlay subtle 8x8 DCT grid artifact lines
      ctx.strokeStyle = "rgba(120, 180, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (activeLayer === "typography") {
      // Typography Baseline & Stroke-width alignment inspection
      ctx.strokeStyle = "rgba(180, 140, 40, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Draw horizontal baseline guidelines
      for (let y = 40; y < height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw bounding boxes around OCR recognized text clusters
      ctx.strokeStyle = "rgba(80, 160, 230, 0.5)";
      ctx.lineWidth = 1.2;
      const sampleTextBlocks = [
        { x: 120, y: 55, w: 180, h: 18 },
        { x: 120, y: 85, w: 220, h: 18 },
        { x: 120, y: 115, w: 140, h: 18 },
        { x: 120, y: 145, w: 160, h: 18 },
        { x: 40, y: 195, w: 260, h: 22 },
      ];
      sampleTextBlocks.forEach((b) => {
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(80, 160, 230, 0.08)";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      });
    } else if (activeLayer === "noise") {
      // Sensor Noise Distribution (identifying screen-captured zero-variance patches)
      const imgData = ctx.createImageData(width, height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        const noise = Math.random() * 45;
        imgData.data[i] = 160 + noise; // R
        imgData.data[i + 1] = 175 + noise; // G
        imgData.data[i + 2] = 190 + noise; // B
        imgData.data[i + 3] = 40; // Alpha
      }
      ctx.putImageData(imgData, 0, 0);

      // Highlight flat zones with near-zero noise variance
      ctx.fillStyle = "rgba(220, 80, 40, 0.25)";
      ctx.strokeStyle = "rgba(220, 80, 40, 0.7)";
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(width * 0.45, height * 0.2, width * 0.48, height * 0.55);
      ctx.fillRect(width * 0.45, height * 0.2, width * 0.48, height * 0.55);
      ctx.setLineDash([]);
    } else if (activeLayer === "clones") {
      // Copy-Move SIFT/ORB match vectors connecting duplicated regions
      ctx.strokeStyle = "rgba(230, 80, 120, 0.85)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(230, 80, 120, 0.9)";

      const p1 = { x: width * 0.25, y: height * 0.45 };
      const p2 = { x: width * 0.72, y: height * 0.45 };

      // Keypoints
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Connecting matching arc
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo((p1.x + p2.x) / 2, p1.y - 45, p2.x, p2.y);
      ctx.stroke();

      // Duplication bounding boxes
      ctx.strokeStyle = "rgba(230, 80, 120, 0.6)";
      ctx.strokeRect(p1.x - 25, p1.y - 25, 50, 50);
      ctx.strokeRect(p2.x - 25, p2.y - 25, 50, 50);
    }
  }, [activeLayer, flaggedChecks]);

  // Handle Loupe Mouse Movement
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loupeActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setLoupePos({ x, y });
  };

  const handleMouseLeave = () => {
    setLoupePos(null);
  };

  return (
    <div className="rounded-[22px] border border-border bg-paper-deep p-4 sm:p-6 shadow-[0_8px_30px_rgba(66,58,44,0.06)]">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal text-bronze">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-ink">
              Forensic Deep-Dive Canvas
            </h3>
            <p className="text-[11px] text-muted-ink">
              Multi-spectral layer inspection & sub-pixel loupe
            </p>
          </div>
        </div>

        {/* Loupe & Flags Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={loupeActive ? "default" : "outline"}
            className={
              loupeActive
                ? "bg-bronze text-ink hover:bg-bronze-light h-8 text-xs font-semibold"
                : "border-border bg-paper h-8 text-xs font-semibold hover:bg-paper-deep"
            }
            onClick={() => setLoupeActive(!loupeActive)}
          >
            <Crosshair className="mr-1.5 h-3.5 w-3.5" />
            {loupeActive ? `Loupe ${loupeZoom}x Active` : "Enable 4x Loupe"}
          </Button>

          {loupeActive && (
            <div className="flex items-center rounded-lg border border-border bg-paper p-0.5">
              {[2, 4, 8].map((z) => (
                <button
                  key={z}
                  onClick={() => setLoupeZoom(z)}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                    loupeZoom === z
                      ? "bg-bronze text-ink"
                      : "text-muted-ink hover:text-ink"
                  }`}
                >
                  {z}x
                </button>
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant={showFlags ? "default" : "outline"}
            className={
              showFlags
                ? "bg-paper border border-border text-ink hover:bg-paper-deep h-8 text-xs"
                : "border-border bg-transparent text-muted-ink h-8 text-xs"
            }
            onClick={() => setShowFlags(!showFlags)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {showFlags ? "Flags Visible" : "Flags Hidden"}
          </Button>
        </div>
      </div>

      {/* Layer Selection Pill Bar */}
      <div className="mt-3.5 flex flex-wrap gap-1.5 rounded-xl bg-paper p-1 border border-border/80">
        {[
          { id: "optical", label: "Optical Scan", desc: "True color document raster" },
          { id: "ela", label: "ELA Heatmap", desc: "Compression error level gradient" },
          { id: "typography", label: "Typography Grid", desc: "Stroke width & baseline alignment" },
          { id: "noise", label: "Sensor Noise", desc: "Camera sensor grain distribution" },
          { id: "clones", label: "Clone Matcher", desc: "SIFT/ORB copy-move keypoint vectors" },
        ].map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayer(layer.id as ForensicLayer)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeLayer === layer.id
                ? "bg-charcoal text-paper shadow-sm font-semibold"
                : "text-muted-ink hover:bg-paper-deep hover:text-ink"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeLayer === layer.id
                  ? "bg-bronze"
                  : "bg-muted-ink/30"
              }`}
            />
            {layer.label}
          </button>
        ))}
      </div>

      {/* Main Interactive Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative mt-4 mx-auto aspect-[1.48/1] max-w-[620px] overflow-hidden rounded-[14px] border border-[#d6cfbe] bg-[#fbf6ea] p-5 shadow-[0_12px_36px_rgba(74,60,40,0.1)] select-none transition-all ${
          loupeActive ? "cursor-crosshair" : "cursor-default"
        }`}
      >
        {/* Base Document Rendering */}
        <div className="relative h-full w-full flex flex-col justify-between">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#cfc4af] pb-2.5">
            <div>
              <div className="h-2.5 w-32 rounded-full bg-[#464743]/80" />
              <div className="mt-2 h-1.5 w-24 rounded-full bg-[#8c8576]/60" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[#8c8576]/40 text-[10px] font-bold text-[#8c8576]">
              {document.type.slice(0, 3).toUpperCase()}
            </div>
          </div>

          {/* Middle Content */}
          <div className="grid grid-cols-[0.68fr_1fr] gap-4 py-2">
            {/* Photo / Portrait placeholder */}
            <div className="rounded border border-[#d6cbb8] bg-[#e8dfce] p-2.5 shadow-inner">
              <div className="mx-auto aspect-[0.84/1] max-w-[85px] rounded bg-[#bbb1a1] overflow-hidden relative">
                <div className="mx-auto mt-3 h-7 w-7 rounded-full bg-[#ece3d4]" />
                <div className="mx-auto mt-2 h-12 w-10 rounded-t-full bg-[#dfd4c2]" />
                {activeLayer === "ela" && (
                  <div className="absolute inset-0 bg-red-500/20 mix-blend-color-burn" />
                )}
              </div>
            </div>

            {/* Document Field Text Placeholders */}
            <div className="space-y-2.5 pt-1">
              <div>
                <div className="h-1.5 w-14 rounded-full bg-[#9d9587]/70" />
                <div className="mt-1.5 h-2 w-36 rounded-full bg-[#464743]/85" />
              </div>
              <div>
                <div className="h-1.5 w-18 rounded-full bg-[#9d9587]/70" />
                <div className="mt-1.5 h-2 w-28 rounded-full bg-[#464743]/65" />
              </div>
              <div>
                <div className="h-1.5 w-12 rounded-full bg-[#9d9587]/70" />
                <div className="mt-1.5 h-2 w-44 rounded-full bg-[#464743]/65" />
              </div>
              <div>
                <div className="h-1.5 w-20 rounded-full bg-[#9d9587]/70" />
                <div className="mt-1.5 h-2 w-28 rounded-full bg-[#464743]/65" />
              </div>
            </div>
          </div>

          {/* Footer Identifier Strip */}
          <div className="mt-2 flex items-center justify-between border-t border-[#d8cfbd] pt-2 text-[10px] text-[#8c8576]">
            <span className="font-mono">{document.reference}</span>
            <span className="uppercase tracking-widest font-semibold text-[9px]">
              Forensic Audit Trace
            </span>
          </div>
        </div>

        {/* Dynamic Canvas for Visualizer Overlays */}
        <canvas
          ref={canvasRef}
          width={620}
          height={420}
          className="absolute inset-0 pointer-events-none w-full h-full"
        />

        {/* Bounding Boxes for Flagged Areas */}
        {showFlags &&
          flaggedChecks.map((check, idx) => {
            const r = check.flaggedRegion!;
            const isHovered = hoveredRegion?.id === check.id;

            return (
              <div
                key={check.id}
                onMouseEnter={() => setHoveredRegion(check)}
                onMouseLeave={() => setHoveredRegion(null)}
                onClick={() => onSelectCheck && onSelectCheck(check)}
                className={`absolute rounded cursor-pointer border-2 transition-all ${
                  isHovered
                    ? "border-forged bg-forged/25 ring-2 ring-forged/50 z-20 scale-[1.02]"
                    : "border-forged bg-forged/15 hover:bg-forged/25 z-10"
                }`}
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  width: `${r.width}%`,
                  height: `${r.height}%`,
                }}
              >
                {/* Tag pill */}
                <div className="absolute -top-3 left-1 bg-forged text-paper text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  FLAG #{idx + 1}
                </div>
              </div>
            );
          })}

        {/* Interactive Loupe Magnifier Glass */}
        {loupeActive && loupePos && (
          <div
            className="pointer-events-none absolute h-36 w-36 -ml-18 -mt-18 rounded-full border-2 border-bronze bg-[#faf5ea] shadow-[0_14px_40px_rgba(0,0,0,0.35)] overflow-hidden z-30 ring-4 ring-charcoal/20"
            style={{
              left: `${loupePos.x}px`,
              top: `${loupePos.y}px`,
            }}
          >
            {/* Magnified simulation contents */}
            <div
              className="absolute w-[620px] h-[420px] origin-top-left"
              style={{
                transform: `scale(${loupeZoom}) translate(-${
                  loupePos.x - 18 / loupeZoom
                }px, -${loupePos.y - 18 / loupeZoom}px)`,
              }}
            >
              {/* Duplicate Document layer under loupe */}
              <div className="p-5">
                <div className="border-b border-[#cfc4af] pb-2">
                  <div className="h-2.5 w-32 rounded-full bg-[#464743]" />
                </div>
                <div className="grid grid-cols-[0.68fr_1fr] gap-4 py-2">
                  <div className="aspect-[0.84/1] max-w-[85px] rounded bg-[#bbb1a1]" />
                  <div className="space-y-2 pt-1">
                    <div className="h-2 w-36 rounded-full bg-[#464743]" />
                    <div className="h-2 w-28 rounded-full bg-[#464743]" />
                    <div className="h-2 w-44 rounded-full bg-[#464743]" />
                  </div>
                </div>
              </div>

              {/* Sub-pixel grain grid under 8x */}
              {loupeZoom >= 4 && (
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(#2a2c30 1px, transparent 1px), linear-gradient(90deg, #2a2c30 1px, transparent 1px)",
                    backgroundSize: "6px 6px",
                  }}
                />
              )}
            </div>

            {/* Reticle crosshair and readout HUD */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-bronze/40" />
              <div className="w-full h-px bg-bronze/40 absolute" />
              <div className="h-4 w-4 rounded-full border border-bronze/70 absolute" />
            </div>

            <div className="absolute bottom-1.5 left-0 right-0 text-center">
              <span className="rounded bg-charcoal/85 px-1.5 py-0.5 text-[8px] font-mono text-bronze-light uppercase">
                {loupeZoom}x · X:{Math.round(loupePos.x)} Y:{Math.round(loupePos.y)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Layer Explainer Footer */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-ink border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-bronze-dark" />
          <span>
            {activeLayer === "optical" && "Showing original scanned document without artifact filtering."}
            {activeLayer === "ela" && "Error Level Analysis: re-saving compression delta highlights edited high-frequency seams."}
            {activeLayer === "typography" && "Font stroke-thickness & baseline alignment measured across extracted OCR glyphs."}
            {activeLayer === "noise" && "Sensor noise estimation: screens and rendered PDFs exhibit near-zero sensor noise."}
            {activeLayer === "clones" && "Copy-move duplication: matching keypoint vectors identify cloned stamps or digits."}
          </span>
        </div>

        {flaggedChecks.length > 0 && (
          <span className="font-semibold text-forged inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {flaggedChecks.length} flagged anomaly {flaggedChecks.length === 1 ? "zone" : "zones"}
          </span>
        )}
      </div>
    </div>
  );
}
