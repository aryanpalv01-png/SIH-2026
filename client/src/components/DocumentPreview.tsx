import { Eye, FileText, ScanLine, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { VerificationDocument } from "@/lib/veriscan";

export function DocumentPreview({ document, showToggle = true }: { document: VerificationDocument; showToggle?: boolean }) {
  const [showFlags, setShowFlags] = useState(true);
  const [imgError, setImgError] = useState(false);
  const flaggedRegions = document.checks.filter((check) => check.flaggedRegion).map((check) => check.flaggedRegion!);
  const isPdf = document.mimeType === "application/pdf" || document.filename.toLowerCase().endsWith(".pdf");
  const actualImageUrl = document.previewUrl || (document as any).fileUrl || (document as any).file_url;

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#FAF7F0] p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ashoka text-white">
            <FileText className="h-4 w-4" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Document Visual Inspection</p>
            <p className="text-[11px] text-slate-500">{isPdf ? "PDF Document" : "Image Document"} · Reference {document.reference}</p>
          </div>
        </div>
        {showToggle && flaggedRegions.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
            <Eye className="h-3.5 w-3.5 text-saffron-dark" />
            <span className="hidden sm:inline">Highlight Anomaly Regions</span>
            <Switch checked={showFlags} onCheckedChange={setShowFlags} aria-label="Show flagged regions" />
          </label>
        )}
      </div>

      <div className="document-sheet relative mx-auto aspect-[1.45/1] max-w-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {actualImageUrl && !imgError ? (
          <div className="relative h-full w-full flex items-center justify-center bg-slate-50 p-2 sm:p-4">
            <img
              src={actualImageUrl}
              alt={document.filename}
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
              className="max-h-full max-w-full object-contain rounded-md select-none"
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-slate-50">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-saffron/10 text-saffron-dark mb-3">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-slate-900">{document.filename}</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Visual image stream protected. Document verified via authenticated in-memory secure vault.
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-[11px] font-semibold text-slate-700">
              SHA256 Reference: {document.reference}
            </span>
          </div>
        )}

        {/* Flagged Anomaly Bounding Overlays */}
        {showFlags &&
          flaggedRegions.map((region, index) => (
            <div
              key={`${region.x}-${index}`}
              className="absolute rounded border-2 border-rose-500 bg-rose-500/20 shadow-[0_0_0_3px_rgba(244,63,94,0.3)] animate-pulse z-20 pointer-events-none"
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
              aria-label={`Flagged document region ${index + 1}`}
            >
              <span className="absolute -top-3.5 left-1 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap">
                Anomaly #{index + 1}
              </span>
            </div>
          ))}

        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white backdrop-blur-xs z-30">
          <ScanLine className="h-3 w-3 text-saffron" /> {document.reference}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Screening report overlays visual and mathematical tampering indicators directly on the submitted document record.
      </p>
    </div>
  );
}

