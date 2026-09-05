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
        <div className="rounded-2xl border-2 border-saffron/30 bg-white p-5 sm:p-6 shadow-md transition-all">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-india-green/10 text-india-green">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Document Ready for Screening
                </p>
                <p className="text-xs text-slate-500">
                  Inspect selection before running multi-layer analysis
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelStaged}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-bold"
            >
              <X className="mr-1 h-3.5 w-3.5" /> Discard
            </Button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[130px_1fr] items-center">
            {stagedPreviewUrl ? (
              <div className="aspect-[1.3/1] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shadow-inner">
                <img
                  src={stagedPreviewUrl}
                  alt="Selected Document"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[1.3/1] w-full rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                <FileUp className="h-8 w-8 text-saffron-dark" />
              </div>
            )}

            <div className="space-y-1 text-left">
              <p className="font-bold text-slate-900 text-sm truncate max-w-[340px]">
                {stagedFile.name}
              </p>
              <p className="text-xs text-slate-500">
                Size: {(stagedFile.size / (1024 * 1024)).toFixed(2)} MB · Format: {stagedFile.type || "Document"}
              </p>

              <div className="pt-2.5 flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={handleConfirmUpload}
                  className="bg-saffron text-slate-950 hover:bg-saffron/90 font-bold text-xs h-9 px-5 shadow-xs"
                >
                  <ScanSearch className="mr-2 h-4 w-4" />
                  {disabled ? "Screening Document…" : "Verify This Document"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelStaged}
                  disabled={disabled}
                  className="border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100/60 font-semibold text-xs h-9 px-3.5"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Wrong Image? Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Default Upload Dropzone with Choose File & Camera Scan */
        <div
          className={`upload-dropzone ${isDragging ? "upload-dropzone-active" : ""} ${
            disabled ? "pointer-events-none opacity-70" : ""
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
          <div className="upload-icon-wrap">
            <FileUp className="h-6 w-6 text-saffron" strokeWidth={1.8} />
          </div>

          <div className="max-w-md text-center mt-3">
            <p className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Upload or Capture a Document
            </p>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-500">
              Drop an official identity card, certificate, or statement. You can also take a photo directly via camera.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              disabled={disabled}
              className="bg-saffron text-slate-950 hover:bg-saffron/90 font-bold text-xs h-10 px-5 shadow-xs"
              onClick={() => inputRef.current?.click()}
            >
              <ScanSearch className="mr-2 h-4 w-4" />
              {disabled ? "Uploading securely…" : "Choose Document"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className="border-slate-300 bg-white text-slate-800 hover:border-saffron hover:text-saffron-dark font-bold text-xs h-10 px-4 shadow-xs transition-colors"
              onClick={startCamera}
            >
              <Camera className="mr-2 h-4 w-4 text-saffron-dark" />
              Scan with Camera
            </Button>
          </div>

          <p className="mt-3 text-[10.5px] uppercase tracking-wider font-semibold text-slate-400">
            PDF, JPG, PNG, or WEBP · up to 10 MB
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-saffron-dark" /> HMAC Encrypted Vault
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-india-green" /> Zero-Disk Processing
            </span>
          </div>

          {/* Quick Test Benchmark Samples */}
          <div className="mt-5 border-t border-slate-100 pt-3.5 w-full text-center">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
              Or test with forensic benchmark specimens:
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {[
                { id: "doc-aadhaar-valid", label: "Genuine Aadhaar", tone: "verified" },
                { id: "doc-aadhaar-forged", label: "Forged Aadhaar (Verhoeff Fail)", tone: "forged" },
                { id: "doc-pan-forged", label: "Invalid PAN", tone: "forged" },
                { id: "doc-photoshop-spliced", label: "Photoshop Spliced", tone: "forged" },
              ].map((sample) => (
                <a
                  key={sample.id}
                  href={`/report/${sample.id}`}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${
                    sample.tone === "verified"
                      ? "border-india-green/30 bg-india-green/5 text-india-green-dark hover:bg-india-green hover:text-white"
                      : "border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white"
                  }`}
                >
                  {sample.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
