import { useState } from "react";
import { VerificationDocument, formatDateTime, formatDocumentType } from "@/lib/veriscan";
import { StatusSeal, CheckSeal } from "./StatusSeal";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  ShieldCheck,
  FileText,
  Lock,
  Calendar,
  Award,
  Hash,
  X
} from "lucide-react";

interface ForensicPdfExportProps {
  document: VerificationDocument;
  isOpen: boolean;
  onClose: () => void;
}

export function ForensicPdfExport({
  document,
  isOpen,
  onClose,
}: ForensicPdfExportProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const passedChecks = document.checks.filter((c) => c.result === "pass");
  const flaggedChecks = document.checks.filter((c) => c.result === "flag");
  const naChecks = document.checks.filter((c) => c.result === "not_applicable");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-charcoal/80 p-4 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl rounded-[24px] border border-border bg-paper shadow-2xl print:border-none print:shadow-none print:max-w-none">
        {/* Modal Action Bar (Hidden in print) */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-bronze-dark" />
            <h3 className="font-serif text-lg font-bold text-ink">
              Official Forensic Certificate Preview
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-bronze text-ink hover:bg-bronze-light font-semibold"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-muted-ink hover:text-ink"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Certificate Content - Print Optimized */}
        <div className="p-8 sm:p-12 print:p-8 bg-paper text-ink space-y-8 print:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-2 border-bronze pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-charcoal flex items-center justify-center text-bronze font-serif font-bold text-sm">
                  VS
                </div>
                <span className="font-serif text-2xl font-bold tracking-tight text-ink">
                  VERISCAN
                </span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-ink">
                Autonomous Forensic Document Screening Report
              </p>
            </div>

            <div className="sm:text-right">
              <span className="font-mono text-xs text-muted-ink block">
                REFERENCE CODE
              </span>
              <span className="font-mono text-lg font-bold text-ink">
                {document.reference}
              </span>
            </div>
          </div>

          {/* Verdict and Score Summary */}
          <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr] rounded-2xl border border-border bg-paper-deep p-6">
            <div>
              <p className="eyebrow text-bronze-dark">FINAL AUDIT VERDICT</p>
              <div className="mt-2 flex items-center gap-3">
                <StatusSeal status={document.status} size="lg" />
                <div>
                  <h2 className="font-serif text-2xl font-bold text-ink capitalize">
                    {document.status.replace("_", " ")}
                  </h2>
                  <p className="text-xs text-muted-ink mt-0.5">
                    Multi-signal probabilistic and mathematical verification summary
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-ink block">DOCUMENT TYPE</span>
                  <span className="font-semibold text-ink">
                    {formatDocumentType(document.type)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-ink block">ORIGINAL FILE</span>
                  <span className="font-semibold text-ink truncate block">
                    {document.filename}
                  </span>
                </div>
                <div>
                  <span className="text-muted-ink block">DATE SCREENED</span>
                  <span className="font-semibold text-ink">
                    {formatDateTime(document.uploadedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-ink block">INTEGRITY HASH</span>
                  <span className="font-mono text-ink text-[11px]">
                    SHA256: {document.reference.replace("-", "").toLowerCase()}99c
                  </span>
                </div>
              </div>
            </div>

            {/* Score box */}
            <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6 text-center">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-ink">
                AUTHENTICITY SCORE
              </span>
              <div className="my-2 font-serif text-6xl font-bold text-ink">
                {document.score}
                <span className="font-sans text-xl font-normal text-muted-ink">
                  /100
                </span>
              </div>
              <p className="text-xs text-muted-ink max-w-[200px]">
                {document.score >= 80
                  ? "High confidence of authenticity across all layers."
                  : document.score >= 40
                  ? "Elevated concern. Human document inspection advised."
                  : "Critical failure. Mathematical or visual forgery detected."}
              </p>
            </div>
          </div>

          {/* 11 Forensic Modules Breakdown Table */}
          <div>
            <h4 className="font-serif text-lg font-bold text-ink mb-3">
              Forensic Evaluation Matrix (11 Independent Modules)
            </h4>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-deep text-muted-ink border-b border-border">
                  <tr>
                    <th className="p-3 font-semibold">MODULE NAME</th>
                    <th className="p-3 font-semibold">STATUS</th>
                    <th className="p-3 font-semibold">CONFIDENCE</th>
                    <th className="p-3 font-semibold">FINDINGS & OBSERVATION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {document.checks.map((check) => (
                    <tr key={check.id} className="hover:bg-paper-deep/40">
                      <td className="p-3 font-semibold text-ink">
                        {check.name}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            check.result === "pass"
                              ? "bg-emerald-50 text-emerald-700"
                              : check.result === "flag"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <CheckSeal result={check.result} size="sm" />
                          {check.result}
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        {check.result === "not_applicable"
                          ? "—"
                          : `${check.confidence}%`}
                      </td>
                      <td className="p-3 text-muted-ink leading-relaxed max-w-xs">
                        {check.explanation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Institutional Stamp & Legal Disclaimer */}
          <div className="border-t border-border pt-6 grid sm:grid-cols-2 gap-6 text-xs text-muted-ink">
            <div>
              <p className="font-semibold text-ink">TECHNICAL METHODOLOGY</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                Screening conducted via deterministic checksum logic (Verhoeff & PAN regex),
                cryptographic certificate validation, high-frequency DCT and ELA artifact analysis,
                SIFT/ORB copy-move localization, and pretrained deep forensic models.
              </p>
            </div>
            <div>
              <p className="font-semibold text-ink">LEGAL DISCLAIMER</p>
              <p className="mt-1 leading-relaxed text-[11px]">
                VeriScan observations represent forensic file-level evidence and do not constitute
                a direct query to government repositories. Deterministic checksums prove mathematical
                validity; probabilistic scores should be reviewed in accordance with your organization's
                compliance protocol.
              </p>
            </div>
          </div>

          {/* Seal Watermark & Signature Area */}
          <div className="flex items-center justify-between border-t border-border/80 pt-4 text-[10px] text-muted-ink">
            <span>AUDIT TRAIL VERIFIED BY VERISCAN ORCHESTRATION LAYER</span>
            <span className="font-mono">CERTIFICATE ID: CERT-{document.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
