import { useAuth } from "@/_core/hooks/useAuth";
import { MicroservicesTelemetry } from "@/components/MicroservicesTelemetry";
import { trpc } from "@/lib/trpc";
import { getPreviewDocument } from "@/lib/scanStore";
import { serverDocumentToVerification, VerificationDocument } from "@/lib/veriscan";
import { ArrowLeft, Terminal, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";

interface PipelineStep {
  code: string;
  name: string;
  detail: string;
  subsystem: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    code: "INGEST_BYTES",
    name: "Payload Ingestion",
    detail: "Read payload -> Compute SHA-256 cryptographic digest",
    subsystem: "SYS_IO",
  },
  {
    code: "METADATA_EXIF",
    name: "EXIF & Header Analysis",
    detail: "Decode tags & check editing software markers (Photoshop/GIMP)",
    subsystem: "EXIF_PARSER",
  },
  {
    code: "DETERMINISTIC_CHECKSUM",
    name: "Dihedral Verhoeff",
    detail: "Verhoeff permutation check & syntax regex validation",
    subsystem: "MATH_CORE",
  },
  {
    code: "CRYPTOGRAPHIC_QR",
    name: "Asymmetric QR Signature",
    detail: "UIDAI 2048-bit digital signature & public key verification",
    subsystem: "CRYPTO_RSA",
  },
  {
    code: "ELA_COMPRESSION",
    name: "Error Level Analysis",
    detail: "JPEG grid 8x8 block error level matrix & resave anomaly detection",
    subsystem: "CV_ELA",
  },
  {
    code: "COPY_MOVE_CLONE",
    name: "Keypoint Duplication",
    detail: "Keypoint feature matching & duplicate visual motif map",
    subsystem: "CV_SIFT",
  },
  {
    code: "OCR_TYPOGRAPHY",
    name: "Typography Forensics",
    detail: "Baseline alignment, font kerning & character weight analysis",
    subsystem: "OCR_ALIGN",
  },
  {
    code: "SCORE_FUSION",
    name: "Bayesian Evidence Fusion",
    detail: "Tier A hard overrides, cumulative penalties & verdict arbitration",
    subsystem: "FUSION_ENGINE",
  },
];

export default function Scan() {
  const [, params] = useRoute("/scan/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const userIdentifier = user?.email || user?.openId || "guest";
  const numericId = Number(params?.id);
  const serverQuery = trpc.scans.get.useQuery(
    { id: numericId },
    { enabled: Number.isInteger(numericId) && numericId > 0, retry: false }
  );

  const document = useMemo<VerificationDocument>(() => {
    if (serverQuery.data) {
      return serverDocumentToVerification(serverQuery.data.document, serverQuery.data.checks);
    }
    return getPreviewDocument(params?.id, userIdentifier) ?? getPreviewDocument("doc-verified-001")!;
  }, [serverQuery.data, params?.id, userIdentifier]);

  const [activeStage, setActiveStage] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Timer ticker for elapsed time
  useEffect(() => {
    const start = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 45);
    return () => window.clearInterval(interval);
  }, []);

  // Step progression
  useEffect(() => {
    const stageDuration = 680;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => {
        const next = prev + 1;
        if (next <= PIPELINE_STEPS.length) {
          const step = PIPELINE_STEPS[next - 1];
          if (step) {
            setTerminalLogs((logs) => [
              ...logs.slice(-12),
              `[+${((next * stageDuration) / 1000).toFixed(3)}s] [${step.subsystem}] ${step.code} :: ${step.detail}`,
            ]);
          }
        }
        return Math.min(next, PIPELINE_STEPS.length);
      });
    }, stageDuration);
    return () => window.clearInterval(timer);
  }, []);

  // Redirect on completion
  useEffect(() => {
    if (activeStage < PIPELINE_STEPS.length) return;
    const redirectTimer = window.setTimeout(() => {
      setLocation(`/report/${document.id}`);
    }, 900);
    return () => window.clearTimeout(redirectTimer);
  }, [activeStage, document.id, setLocation]);

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const fraction = Math.floor((ms % 1000) / 10);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
  };

  const progressPercent = Math.min(100, Math.round((activeStage / PIPELINE_STEPS.length) * 100));

  return (
    <div className="mx-auto max-w-[1280px] space-y-4 py-3 sm:py-4 px-2 sm:px-4">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#3A3D45] pb-3 text-xs font-mono">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[#D1CEC7] hover:text-[#8A6D1F] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>[ESC] ABORT_EXECUTION</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-[#A09D95]">
          <span>REF: <span className="text-[#FAF7F0] font-semibold">{document.reference}</span></span>
          <span className="text-[#3A3D45]">|</span>
          <span>T+: <span className="text-[#8A6D1F] font-bold">{formatElapsed(elapsedMs)}</span></span>
          <span className="text-[#3A3D45]">|</span>
          <span className="command-badge bg-[#26282D] text-[#22C55E] border-[#3A3D45]">
            {activeStage >= PIPELINE_STEPS.length ? "FINALIZING" : "STREAMING"}
          </span>
        </div>
      </div>

      {/* Primary Terminal Command Deck */}
      <div className="terminal-panel rounded-none">
        {/* Terminal Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#3A3D45] px-4 py-3 sm:px-5 sm:py-3.5 bg-[#1C1E22]">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#3A3D45] bg-[#26282D] text-[#8A6D1F]">
              <Terminal className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight text-[#FAF7F0]">
                  Forensic Pipeline Execution Console
                </h1>
                <span className="command-badge bg-[#8A6D1F]/15 text-[#D1CEC7] border-[#8A6D1F]/40 text-[10px]">
                  8 PHASES
                </span>
              </div>
              <p className="font-mono text-[10.5px] text-[#A09D95] mt-0.5 truncate">
                TARGET: {document.filename} · SIZE: {document.fileSize}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 border-t sm:border-t-0 border-[#3A3D45]/40 pt-2 sm:pt-0 font-mono">
            <div className="text-xs text-[#A09D95]">
              PROGRESS: <span className="text-[#FAF7F0] font-bold">{activeStage} / {PIPELINE_STEPS.length}</span>
            </div>
            <div className="text-[11px] text-[#8A6D1F] font-semibold">
              {progressPercent}% COMPLETE
            </div>
          </div>
        </div>

        {/* Global Progress Track */}
        <div className="h-1 w-full bg-[#1C1E22] border-b border-[#3A3D45]">
          <div
            className="h-full bg-[#8A6D1F] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Linear Terminal Pipeline Ticker */}
        <div className="p-5 sm:p-6 space-y-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const isDone = idx < activeStage;
            const isRunning = idx === activeStage && activeStage < PIPELINE_STEPS.length;
            const isQueued = idx > activeStage;

            return (
              <div
                key={step.code}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border transition-colors font-mono text-xs ${
                  isRunning
                    ? "border-[#8A6D1F] bg-[#8A6D1F]/10 text-[#FAF7F0]"
                    : isDone
                    ? "border-[#3A3D45] bg-[#1C1E22] text-[#D1CEC7]"
                    : "border-[#3A3D45]/40 bg-[#1C1E22]/50 text-[#A09D95]/60"
                }`}
              >
                {/* Left: Step indicator & Description */}
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <span className={`text-[11px] shrink-0 ${isRunning ? "text-[#8A6D1F] font-bold" : isDone ? "text-[#22C55E]" : "text-[#A09D95]/50"}`}>
                    [{String(idx + 1).padStart(2, "0")}/08]
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold tracking-wider ${isRunning ? "text-[#FAF7F0]" : isDone ? "text-[#FAF7F0]" : "text-[#A09D95]/70"}`}>
                        {step.code}
                      </span>
                      <span className="text-[#3A3D45] hidden sm:inline">::</span>
                      <span className="text-[11px] text-[#A09D95] truncate">
                        {step.detail}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Subsystem & Status Chip */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] text-[#A09D95] uppercase tracking-widest hidden md:inline">
                    {step.subsystem}
                  </span>
                  {isDone && (
                    <span className="command-badge bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30">
                      [DONE]
                    </span>
                  )}
                  {isRunning && (
                    <span className="command-badge bg-[#8A6D1F]/20 text-[#D1CEC7] border-[#8A6D1F] flex items-center gap-1.5 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin text-[#8A6D1F]" />
                      [RUNNING]
                    </span>
                  )}
                  {isQueued && (
                    <span className="command-badge bg-transparent text-[#A09D95]/50 border-[#3A3D45]">
                      [QUEUED]
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Terminal Telemetry Log Box */}
        <div className="border-t border-[#3A3D45] bg-[#1C1E22] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-[#A09D95] uppercase tracking-widest">
              Live Kernel Stream & Subsystem Stdout
            </span>
            <span className="font-mono text-[10px] text-[#22C55E]">
              {activeStage >= PIPELINE_STEPS.length ? "COMPILATION_COMPLETE" : "SUBPROCESS_ACTIVE"}
            </span>
          </div>
          <div className="h-28 overflow-y-auto font-mono text-[11px] text-[#A09D95] space-y-1 bg-[#151719] p-3 border border-[#3A3D45]">
            <p className="text-[#8A6D1F]">&gt; [CORE] Initializing secure forensic sandbox for reference {document.reference}...</p>
            <p className="text-[#A09D95]">&gt; [STORAGE] Document byte stream verified (length: {document.fileSize}).</p>
            {terminalLogs.map((log, idx) => (
              <p key={idx} className="text-[#D1CEC7]">{log}</p>
            ))}
            {activeStage >= PIPELINE_STEPS.length && (
              <p className="text-[#22C55E] font-bold">
                &gt; [VERISCAN] All 8 forensic modules executed. Verdict synthesized. Transferring to audit dossier...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Microservices Telemetry Architecture */}
      <div>
        <MicroservicesTelemetry currentStageIndex={activeStage} />
      </div>
    </div>
  );
}
