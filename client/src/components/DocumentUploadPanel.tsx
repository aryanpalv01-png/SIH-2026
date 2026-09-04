import { useRef, useState } from "react";
import { FileCheck2, FileUp, LockKeyhole, ScanSearch } from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!acceptedTypes.includes(file.type)) {
      setError("This file type is not supported. Upload a PDF, JPG, PNG, or WEBP file.");
      return;
    }
    if (file.size > maxFileSize) {
      setError("This file is larger than 10 MB. Upload a smaller document for screening.");
      return;
    }
    setError("");
    onFile(file);
  };

  return (
    <div className={`upload-panel ${compact ? "upload-panel-compact" : ""}`}>
      <div
        className={`upload-dropzone ${isDragging ? "upload-dropzone-active" : ""} ${disabled ? "pointer-events-none opacity-70" : ""}`}
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
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <div className="upload-icon-wrap"><FileUp className="h-6 w-6" strokeWidth={1.6} /></div>
        <div className="max-w-md text-center">
          <p className="font-serif text-2xl font-semibold tracking-[-0.02em] text-ink">Upload a document to verify</p>
          <p className="mt-2 text-sm leading-6 text-muted-ink">Drop an identity document, certificate, or financial record here. VeriScan screens the file without connecting to a government database.</p>
        </div>
        <Button type="button" disabled={disabled} className="mt-5 bg-bronze text-ink hover:bg-bronze-light" onClick={() => inputRef.current?.click()}>
          <ScanSearch className="mr-2 h-4 w-4" /> {disabled ? "Uploading securely…" : "Choose a document"}
        </Button>
        <p className="mt-3 text-[11px] uppercase tracking-[0.17em] text-muted-ink">PDF, JPG, PNG, or WEBP · up to 10 MB</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-ink">
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5 text-bronze-dark" /> Encrypted in transit</span>
          <span className="inline-flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5 text-bronze-dark" /> Reference-only storage</span>
        </div>

        {/* Quick Test Samples */}
        <div className="mt-6 border-t border-border/70 pt-4 w-full text-center">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-ink mb-2.5">
            Or test with forensic benchmark samples:
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
                className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                  sample.tone === "verified"
                    ? "border-bronze/40 bg-bronze/10 text-bronze-dark hover:bg-bronze hover:text-ink"
                    : "border-forged/30 bg-forged/5 text-forged hover:bg-forged hover:text-paper"
                }`}
              >
                {sample.label}
              </a>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg border border-forged/20 bg-forged/5 px-3 py-2 text-sm text-forged" role="alert">{error}</p>}
    </div>
  );
}
