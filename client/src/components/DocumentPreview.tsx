import { Eye, FileText, ScanLine } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { VerificationDocument } from "@/lib/veriscan";

export function DocumentPreview({ document, showToggle = true }: { document: VerificationDocument; showToggle?: boolean }) {
  const [showFlags, setShowFlags] = useState(true);
  const flaggedRegions = document.checks.filter((check) => check.flaggedRegion).map((check) => check.flaggedRegion!);
  const isPdf = document.mimeType === "application/pdf" || document.filename.toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-[20px] border border-border bg-paper-deep p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal text-bronze"><FileText className="h-4 w-4" strokeWidth={1.6} /></div><div><p className="text-sm font-semibold text-ink">Document preview</p><p className="text-xs text-muted-ink">{isPdf ? "PDF document" : "Image document"} · secure reference</p></div></div>
        {showToggle && <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-ink"><Eye className="h-3.5 w-3.5" /><span className="hidden sm:inline">Show flags</span><Switch checked={showFlags} onCheckedChange={setShowFlags} aria-label="Show flagged regions" /></label>}
      </div>
      <div className="document-sheet relative mx-auto aspect-[1.45/1] max-w-[560px] overflow-hidden rounded-[10px] border border-[#d8cfbd] bg-[#fbf5e8] p-5 shadow-[0_12px_30px_rgba(74,60,40,0.12)] sm:p-8">
        <div className="flex items-start justify-between border-b border-[#cfc4af] pb-3"><div><div className="h-2 w-28 rounded-full bg-[#464743]/80" /><div className="mt-2 h-1.5 w-20 rounded-full bg-[#8c8576]/60" /></div><div className="flex h-9 w-9 items-center justify-center rounded-md border border-[#8c8576]/40 text-[#8c8576]"><FileText className="h-4 w-4" /></div></div>
        <div className="mt-5 grid grid-cols-[0.68fr_1fr] gap-4"><div className="rounded-md border border-[#d6cbb8] bg-[#e8dfce] p-3"><div className="mx-auto aspect-[0.82/1] max-w-[90px] rounded bg-[#bbb1a1]"><div className="mx-auto mt-3 h-7 w-7 rounded-full bg-[#ece3d4]" /><div className="mx-auto mt-2 h-12 w-10 rounded-t-full bg-[#dfd4c2]" /></div></div><div className="space-y-3 pt-1"><div><div className="h-1.5 w-16 rounded-full bg-[#9d9587]/70" /><div className="mt-2 h-2 w-36 rounded-full bg-[#464743]/75" /></div><div><div className="h-1.5 w-20 rounded-full bg-[#9d9587]/70" /><div className="mt-2 h-2 w-28 rounded-full bg-[#464743]/55" /></div><div><div className="h-1.5 w-14 rounded-full bg-[#9d9587]/70" /><div className="mt-2 h-2 w-40 rounded-full bg-[#464743]/55" /></div><div><div className="h-1.5 w-24 rounded-full bg-[#9d9587]/70" /><div className="mt-2 h-2 w-24 rounded-full bg-[#464743]/55" /></div></div></div>
        <div className="mt-7 grid grid-cols-3 gap-3"><div className="h-8 rounded border border-[#d6cbb8] bg-[#f0e7d8]" /><div className="h-8 rounded border border-[#d6cbb8] bg-[#f0e7d8]" /><div className="h-8 rounded border border-[#d6cbb8] bg-[#f0e7d8]" /></div>
        {showFlags && flaggedRegions.map((region, index) => <span key={`${region.x}-${index}`} className="absolute rounded border-2 border-forged bg-forged/10 shadow-[0_0_0_3px_rgba(162,62,62,0.08)]" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }} aria-label={`Flagged document region ${index + 1}`} />)}
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[#9d9587]"><ScanLine className="h-3 w-3" /> {document.reference}</div>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-ink">Preview is a visual representation for the screening report. Original file access remains protected behind the authenticated storage reference.</p>
    </div>
  );
}
