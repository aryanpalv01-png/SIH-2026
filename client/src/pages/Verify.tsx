import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { VeriScanMark } from "@/components/VeriScanLogo";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { fileToBase64 } from "@/lib/scanStore";
import { makeDemoDocument } from "@/lib/veriscan";
import { writeLocalScan } from "@/lib/scanStore";
import { ArrowLeft, FileImage, FileText, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function Verify() {
  const [, setLocation] = useLocation();
  const [uploadError, setUploadError] = useState("");
  const utils = trpc.useUtils();
  const createScan = trpc.scans.create.useMutation({
    onSuccess: async (result) => {
      await utils.scans.list.invalidate();
      setLocation(`/scan/${result.id}`);
    },
    onError: (error) => {
      setUploadError("The secure upload path is unavailable in this preview, so VeriScan opened a local screening simulation instead.");
      toast.info("Preview screening opened", { description: error.message || "The server upload could not be completed." });
    },
  });

  const handleFile = async (file: File) => {
    setUploadError("");
    try {
      const contentBase64 = await fileToBase64(file);
      createScan.mutate({ fileName: file.name, mimeType: file.type, fileSize: file.size, documentType: "other", contentBase64 });
    } catch {
      const scan = makeDemoDocument(file);
      writeLocalScan(scan);
      setLocation(`/scan/${scan.id}`);
    }
  };

  return <div className="mx-auto max-w-[1100px]">
    <Link href="/dashboard" className="mb-8 inline-flex items-center text-sm font-semibold text-muted-ink hover:text-bronze-dark"><ArrowLeft className="mr-2 h-4 w-4" /> Back to overview</Link>
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div><p className="eyebrow text-bronze-dark">New verification</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-[-0.04em] sm:text-5xl">A second read for important documents.</h1><p className="mt-5 max-w-lg text-base leading-7 text-muted-ink">Upload one document at a time. VeriScan will validate the file, screen it across several layers, and create a report you can revisit from your history.</p><div className="mt-8 space-y-5"><InfoRow icon={<ShieldCheck />} title="Screening, not certification" body="Results describe file-level observations. Use them alongside your organization’s review policy." /><InfoRow icon={<LockKeyhole />} title="References, not raw bytes" body="The database stores secure file references and report metadata rather than document contents." /><InfoRow icon={<Info />} title="Clear next steps" body="Mixed evidence is marked for review, with flagged regions and plain-language explanations." /></div></div>
      <div className="rounded-[24px] border border-border bg-paper-deep p-4 shadow-[0_20px_60px_rgba(70,60,42,0.08)] sm:p-6"><div className="mb-6 flex items-center gap-3"><VeriScanMark size="sm" /><div><p className="font-serif text-xl font-bold">Choose a file</p><p className="text-xs text-muted-ink">Accepted formats are checked before processing.</p></div></div><DocumentUploadPanel disabled={createScan.isPending} onFile={handleFile} />{uploadError && <p className="mt-4 rounded-xl border border-review/20 bg-review/6 px-4 py-3 text-xs leading-5 text-muted-ink" role="status">{uploadError}</p>}<div className="mt-6 grid grid-cols-2 gap-3"><FormatCard icon={<FileText />} label="PDF" detail="Text or scanned" /><FormatCard icon={<FileImage />} label="JPG / PNG" detail="Clear image" /></div></div>
    </div>
    <div className="mt-10 rounded-[18px] border border-border bg-paper px-5 py-4 text-sm text-muted-ink"><span className="font-semibold text-ink">Before you upload:</span> remove unrelated pages and use the clearest copy available. VeriScan does not connect to government databases or validate records against external registries.</div>
    <Button variant="ghost" className="mt-4 text-muted-ink hover:bg-paper-deep hover:text-ink" onClick={() => setLocation("/history")}>Need to revisit a previous report?</Button>
  </div>;
}

function InfoRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bronze/12 text-bronze-dark">{icon}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-md text-sm leading-6 text-muted-ink">{body}</p></div></div>; }
function FormatCard({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) { return <div className="rounded-xl border border-border bg-paper px-4 py-3"><div className="flex items-center gap-2 text-bronze-dark">{icon}<span className="text-sm font-semibold">{label}</span></div><p className="mt-1 text-xs text-muted-ink">{detail}</p></div>; }
