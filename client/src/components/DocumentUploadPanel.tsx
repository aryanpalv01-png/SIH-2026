import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  FileCheck2,
  FileUp,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const acceptedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const maxFileSize = 10 * 1024 * 1024;

export function DocumentUploadPanel({
  onFile,
  compact = false,
  disabled = false,
}: {
  onFile: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Clean up camera stream and preview object URL
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (stagedPreviewUrl && stagedPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(stagedPreviewUrl);
      }
    };
  }, [cameraStream, stagedPreviewUrl]);

  const handleSelectFile = (file?: File) => {
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setError("Unsupported file format. Please upload a PDF, JPG, PNG, or WEBP document.");
      return;
    }
    if (file.size > maxFileSize) {
      setError("File exceeds 10 MB limit. Please select a smaller document.");
      return;
    }
    setError("");

    // Create preview
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setStagedPreviewUrl(url);
    } else {
      setStagedPreviewUrl(null);
    }
    setStagedFile(file);
  };

  const handleCancelStaged = () => {
    if (stagedPreviewUrl && stagedPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(stagedPreviewUrl);
    }
    setStagedFile(null);
    setStagedPreviewUrl(null);
    setError("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleConfirmUpload = () => {
    if (!stagedFile) return;
    onFile(stagedFile);
  };

  const startCamera = async () => {
    setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera hardware is not accessible on this device or browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError(`Camera error: ${err?.message || "Permission was not granted."}`);
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture video frame.");
          return;
        }
        const file = new File([blob], `camera_scan_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopCamera();
        handleSelectFile(file);
      },
      "image/jpeg",
      0.95
    );
  };

  return (
    <div className={`upload-panel ${compact ? "upload-panel-compact" : ""}`}>
      {/* 1. Live Camera Viewfinder Modal/Inline Stage */}
      {isCameraActive ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-saffron/50 bg-[#0A192F] p-5 text-center shadow-xl">
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-saffron">
              <Camera className="h-4 w-4 text-saffron" />
              <span>Align Document Inside Border</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-lg p-0 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative mx-auto aspect-[1.45/1] max-w-[520px] overflow-hidden rounded-xl border border-white/20 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {/* Target Alignment Reticle */}
            <div className="pointer-events-none absolute inset-4 rounded-lg border border-white/40">
              <div className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-saffron" />
              <div className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-saffron" />
              <div className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-saffron" />
              <div className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-saffron" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-[11px] font-medium text-white/90 drop-shadow">
              Hold camera steady in good lighting
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              onClick={capturePhoto}
              className="bg-saffron text-slate-950 hover:bg-saffron/90 font-bold text-xs h-10 px-6 shadow-sm"
            >
              <Camera className="mr-2 h-4 w-4" /> Capture Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              className="border-white/20 bg-white/5 text-white hover:bg-white/15 text-xs h-10"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : stagedFile ? (
        /* 2. Staged File Confirmation with Cancel Option */
        <div className="terminal-panel p-4 sm:p-5 border border-[#3A3D45] bg-[#26282D] text-[#FAF7F0]">
          <div className="flex items-center justify-between border-b border-[#3A3D45] pb-3">
            <div className="flex items-center gap-2">
              <span className="command-badge command-badge-verified">STAGED</span>
              <span className="font-mono text-xs font-semibold text-slate-300">
                Payload Ready for Ingestion
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelStaged}
              className="text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs font-mono h-7 px-2"
            >
              <X className="mr-1 h-3.5 w-3.5" /> DISCARD
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[110px_1fr] items-center">
            {stagedPreviewUrl ? (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 overflow-hidden border border-[#3A3D45] bg-[#181A1D] flex items-center justify-center">
                <img
                  src={stagedPreviewUrl}
                  alt="Selected Document"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[1.2/1] w-full max-w-[140px] sm:max-w-none mx-auto sm:mx-0 border border-[#3A3D45] bg-[#181A1D] flex items-center justify-center text-slate-500">
                <FileUp className="h-6 w-6 text-[#8A6D1F]" />
              </div>
            )}

            <div className="space-y-1.5 text-center sm:text-left">
              <p className="font-mono text-xs font-bold text-white truncate max-w-[320px] mx-auto sm:mx-0">
                {stagedFile.name}
              </p>
              <p className="font-mono text-[11px] text-slate-400">
                PAYLOAD: {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB · MIME: {stagedFile.type || "binary"}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={handleConfirmUpload}
                  className="w-full sm:w-auto bg-[#8A6D1F] hover:bg-[#A28126] text-white font-mono font-bold text-xs h-8 px-4 rounded-xs"
                >
                  <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
                  {disabled ? "EXECUTING PIPELINE…" : "RUN FORENSIC SCREENING"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelStaged}
                  disabled={disabled}
                  className="w-full sm:w-auto border-[#3A3D45] bg-[#181A1D] text-slate-400 hover:text-white font-mono text-xs h-8 px-3 rounded-xs"
                >
                  <Trash2 className="mr-1 h-3 w-3" /> CANCEL
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Default Upload Dropzone with Choose File & Camera Scan */
        <div
          className={`upload-dropzone border border-[#3A3D45] bg-[#26282D] ${isDragging ? "!border-[#8A6D1F] !bg-[#2D3037]" : ""} ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
          onDragEnter={(event) => {
            if (disabled) return;
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleSelectFile(event.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => handleSelectFile(event.target.files?.[0])}
          />
          <div className="flex h-10 w-10 items-center justify-center border border-[#8A6D1F] bg-[#181A1D] text-[#8A6D1F]">
            <FileUp className="h-5 w-5" strokeWidth={1.75} />
          </div>

          <div className="max-w-md text-center mt-3">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white tracking-tight">
              Ingest Document for Forensic Screening
            </h3>
            <p className="mt-1 font-mono text-xs text-slate-400 leading-relaxed">
              Drag file here or select from local storage / optical camera
            </p>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 w-full max-w-xs sm:max-w-none mx-auto">
            <Button
              type="button"
              disabled={disabled}
              className="w-full sm:w-auto bg-[#8A6D1F] hover:bg-[#A28126] text-white font-mono font-bold text-xs h-8.5 px-4 rounded-xs"
              onClick={() => inputRef.current?.click()}
            >
              <ScanSearch className="mr-1.5 h-3.5 w-3.5" />
              {disabled ? "INGESTING…" : "SELECT FILE"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="w-full sm:w-auto border-[#3A3D45] bg-[#181A1D] text-slate-300 hover:border-[#8A6D1F] hover:text-[#8A6D1F] font-mono text-xs h-8.5 px-3.5 rounded-xs transition-colors"
              onClick={startCamera}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5 text-[#8A6D1F]" />
              OPTICAL CAMERA
            </Button>
          </div>

          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            PDF · JPG · PNG · WEBP · MAX 10 MB
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <LockKeyhole className="h-3 w-3 text-[#8A6D1F]" /> CLIENT ENCLAVE
            </span>
            <span className="text-[#3A3D45]">|</span>
            <span className="inline-flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-[#22C55E]" /> ZERO DISK RETENTION
            </span>
          </div>

          {/* Forensic Benchmark Specimen Chips */}
          <div className="mt-4 border-t border-[#3A3D45] pt-3 w-full text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              LOAD COMPLIANCE BENCHMARK SPECIMEN:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { id: "doc-aadhaar-valid", label: "GENUINE_AADHAAR", tone: "verified" },
                { id: "doc-aadhaar-forged", label: "VERHOEFF_CHECKSUM_FAIL", tone: "forged" },
                { id: "doc-pan-forged", label: "INVALID_PAN_STRUCT", tone: "forged" },
                { id: "doc-photoshop-spliced", label: "SPLICED_CLONE_MATCH", tone: "forged" },
              ].map((sample) => (
                <a
                  key={sample.id}
                  href={`/report/${sample.id}`}
                  className={`font-mono text-[10px] px-2 py-0.5 border rounded-xs transition-all ${
                    sample.tone === "verified"
                      ? "border-[#22C55E]/40 bg-[#22C55E]/10 text-emerald-400 hover:bg-[#22C55E]/20"
                      : "border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/40"
                  }`}
                >
                  [{sample.label}]
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p
          className="mt-2 border border-red-900/60 bg-red-950/40 px-3 py-2 font-mono text-xs text-red-400"
          role="alert"
        >
          [ERROR] {error}
        </p>
      )}
    </div>
  );
}
