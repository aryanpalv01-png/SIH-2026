export type DocumentStatus = "verified" | "needs_review" | "likely_forged";
export type CheckResult = "pass" | "flag" | "not_applicable";
export type DocumentKind =
  | "aadhaar"
  | "pan"
  | "passport"
  | "marksheet"
  | "bank_statement"
  | "other";

export type VerificationCheck = {
  id: string;
  name: string;
  shortName: string;
  result: CheckResult;
  confidence: number;
  explanation: string;
  flaggedRegion?: { x: number; y: number; width: number; height: number };
};

export type VerificationDocument = {
  id: string;
  filename: string;
  type: DocumentKind;
  uploadedAt: string;
  status: DocumentStatus;
  score: number;
  fileSize: string;
  mimeType: string;
  reference: string;
  checks: VerificationCheck[];
};

export const scanStages = [
  "Validating file",
  "Checking compression consistency",
  "Analyzing text & fonts",
  "Verifying QR / checksum",
  "Cross-referencing patterns",
  "Finalizing report",
] as const;

export type ScanStage = (typeof scanStages)[number];

export const documentTypeLabels: Record<DocumentKind, string> = {
  aadhaar: "Aadhaar card",
  pan: "PAN card",
  passport: "Passport",
  marksheet: "Academic certificate",
  bank_statement: "Bank statement",
  other: "Other document",
};

export const statusMeta: Record<
  DocumentStatus,
  { label: string; description: string; tone: "verified" | "review" | "forged" }
> = {
  verified: {
    label: "Verified",
    description: "No material tampering indicators detected",
    tone: "verified",
  },
  needs_review: {
    label: "Needs review",
    description: "One or more signals require a human decision",
    tone: "review",
  },
  likely_forged: {
    label: "Likely forged",
    description: "Multiple tampering indicators were detected",
    tone: "forged",
  },
};

export const demoDocuments: VerificationDocument[] = [
  {
    id: "doc-verified-001",
    filename: "passport_scan_rahul.pdf",
    type: "passport",
    uploadedAt: "2026-08-28T10:42:00.000Z",
    status: "verified",
    score: 96,
    fileSize: "2.4 MB",
    mimeType: "application/pdf",
    reference: "VS-7F2A-91C4",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "pass",
        confidence: 98,
        explanation: "Compression patterns remain consistent across the document surface.",
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 94,
        explanation: "Text spacing, weight, and glyph rendering align with the surrounding template.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "pass",
        confidence: 99,
        explanation: "The visible machine-readable data is structurally valid and internally consistent.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "pass",
        confidence: 93,
        explanation: "Image noise is evenly distributed with no isolated re-rendered regions.",
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 96,
        explanation: "No duplicated content or copy-move artifacts were found in the visible fields.",
      },
    ],
  },
  {
    id: "doc-review-002",
    filename: "salary_certificate_august.jpg",
    type: "other",
    uploadedAt: "2026-08-26T14:18:00.000Z",
    status: "needs_review",
    score: 74,
    fileSize: "1.8 MB",
    mimeType: "image/jpeg",
    reference: "VS-118B-30E7",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "flag",
        confidence: 71,
        explanation: "A sharper compression boundary appears around the compensation field.",
        flaggedRegion: { x: 54, y: 36, width: 32, height: 12 },
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 86,
        explanation: "Typography is broadly consistent, although the amount field is slightly heavier.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "not_applicable",
        confidence: 0,
        explanation: "No machine-readable code was present for this document type.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "flag",
        confidence: 68,
        explanation: "Image noise varies across the lower third; review the highlighted salary field.",
        flaggedRegion: { x: 49, y: 56, width: 40, height: 17 },
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 90,
        explanation: "No repeated visual fragments were detected in the scanned surface.",
      },
    ],
  },
  {
    id: "doc-forged-003",
    filename: "marksheet_final_copy.pdf",
    type: "marksheet",
    uploadedAt: "2026-08-21T09:06:00.000Z",
    status: "likely_forged",
    score: 29,
    fileSize: "3.1 MB",
    mimeType: "application/pdf",
    reference: "VS-5D8C-442A",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "flag",
        confidence: 32,
        explanation: "Multiple fields show isolated recompression inconsistent with the base page.",
        flaggedRegion: { x: 18, y: 26, width: 64, height: 18 },
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "flag",
        confidence: 27,
        explanation: "The candidate name and grade fields use a different rendering profile from the template.",
        flaggedRegion: { x: 24, y: 42, width: 54, height: 16 },
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "flag",
        confidence: 21,
        explanation: "The visible checksum does not reconcile with the extracted document number.",
        flaggedRegion: { x: 70, y: 74, width: 18, height: 16 },
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "flag",
        confidence: 34,
        explanation: "The lower-right region has a different noise profile from the rest of the scan.",
        flaggedRegion: { x: 68, y: 62, width: 22, height: 24 },
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 78,
        explanation: "No direct copy-move match was found, but this does not offset the other flags.",
      },
    ],
  },
  {
    id: "doc-verified-004",
    filename: "bank_statement_july.pdf",
    type: "bank_statement",
    uploadedAt: "2026-08-17T16:34:00.000Z",
    status: "verified",
    score: 91,
    fileSize: "1.2 MB",
    mimeType: "application/pdf",
    reference: "VS-2AC9-76DD",
    checks: [
      {
        id: "compression",
        name: "Compression & recompression analysis",
        shortName: "Compression consistency",
        result: "pass",
        confidence: 94,
        explanation: "Page-level compression remains stable across the statement.",
      },
      {
        id: "fonts",
        name: "Text and font consistency",
        shortName: "Text & fonts",
        result: "pass",
        confidence: 92,
        explanation: "The statement uses a consistent type system across transaction rows.",
      },
      {
        id: "qr",
        name: "QR / checksum validation",
        shortName: "QR & checksum",
        result: "not_applicable",
        confidence: 0,
        explanation: "No QR or checksum field was available to validate.",
      },
      {
        id: "noise",
        name: "Noise consistency",
        shortName: "Noise pattern",
        result: "pass",
        confidence: 88,
        explanation: "Scan noise and rasterization artifacts are consistent across all pages.",
      },
      {
        id: "clone",
        name: "Clone / copy-move detection",
        shortName: "Clone detection",
        result: "pass",
        confidence: 91,
        explanation: "No duplicated line-item fragments were detected.",
      },
    ],
  },
];

export type ServerDocumentRecord = {
  id: number;
  originalFilename: string;
  documentType: DocumentKind;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date | string;
  status: "processing" | DocumentStatus;
  confidenceScore: number;
  referenceCode: string;
};

export type ServerCheckRecord = {
  id: number;
  checkName: string;
  result: CheckResult;
  confidence: number;
  explanation: string;
  flaggedRegion?: unknown;
};

export function formatCheckName(checkName: string) {
  const labels: Record<string, string> = {
    file_format_metadata: "File format & metadata inspection",
    compression_analysis: "Compression & recompression analysis",
    font_consistency: "Text and font consistency",
    qr_checksum_validation: "QR / checksum validation",
    noise_consistency: "Noise consistency",
    clone_detection: "Clone / copy-move detection",
  };
  return labels[checkName] ?? checkName.replaceAll("_", " ").replace(/\\b\\w/g, (character) => character.toUpperCase());
}

function isRegion(value: unknown): value is { x: number; y: number; width: number; height: number } {
  if (!value || typeof value !== "object") return false;
  const region = value as Record<string, unknown>;
  return ["x", "y", "width", "height"].every((key) => typeof region[key] === "number");
}

export function serverDocumentToVerification(document: ServerDocumentRecord, checkRows: ServerCheckRecord[] = []): VerificationDocument {
  const status: DocumentStatus = document.status === "processing" ? "needs_review" : document.status;
  return {
    id: String(document.id),
    filename: document.originalFilename,
    type: document.documentType,
    uploadedAt: new Date(document.uploadedAt).toISOString(),
    status,
    score: document.confidenceScore,
    fileSize: `${Math.max(0.1, document.fileSize / 1024 / 1024).toFixed(1)} MB`,
    mimeType: document.mimeType,
    reference: document.referenceCode,
    checks: checkRows.map((check) => ({
      id: String(check.id),
      name: formatCheckName(check.checkName),
      shortName: formatCheckName(check.checkName),
      result: check.result,
      confidence: check.confidence,
      explanation: check.explanation,
      flaggedRegion: isRegion(check.flaggedRegion) ? check.flaggedRegion : undefined,
    })),
  };
}

export function formatDocumentType(type: DocumentKind) {
  return documentTypeLabels[type] ?? "Other document";
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getDocumentById(id: string) {
  return demoDocuments.find((document) => document.id === id) ?? demoDocuments[0];
}

export function getResultLabel(result: CheckResult) {
  if (result === "pass") return "Pass";
  if (result === "flag") return "Flagged";
  return "N/A";
}

export function getScanStatus(score: number): DocumentStatus {
  if (score > 80) return "verified";
  if (score >= 40) return "needs_review";
  return "likely_forged";
}

export function getInitials(name?: string | null) {
  if (!name) return "VS";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "VS";
}

export function makeDemoDocument(file: File): VerificationDocument {
  const id = `scan-${Date.now()}`;
  const score = 86;
  return {
    id,
    filename: file.name,
    type: "other",
    uploadedAt: new Date().toISOString(),
    status: getScanStatus(score),
    score,
    fileSize: `${Math.max(0.1, file.size / 1024 / 1024).toFixed(1)} MB`,
    mimeType: file.type || "application/octet-stream",
    reference: `VS-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
    checks: demoDocuments[0].checks,
  };
}
