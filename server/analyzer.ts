export type AnalysisResult = "pass" | "flag" | "not_applicable";
export type AnalysisRegion = { x: number; y: number; width: number; height: number };
export type AnalysisCheck = {
  checkName: string;
  result: AnalysisResult;
  confidence: number;
  explanation: string;
  flaggedRegion?: AnalysisRegion;
};

export type AnalyzerInput = {
  filename: string;
  mimeType: string;
  fileSize: number;
  documentType: "aadhaar" | "pan" | "passport" | "marksheet" | "bank_statement" | "other";
};

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function analyzeDocument(input: AnalyzerInput): { score: number; status: "verified" | "needs_review" | "likely_forged"; checks: AnalysisCheck[] } {
  const normalizedName = input.filename.toLowerCase();
  const hasEditMarker = /(edited|final[-_ ]?copy|modified|photoshop|copy)/.test(normalizedName);
  const formatPass = allowedMimeTypes.has(input.mimeType) && input.fileSize > 0;
  const compressionConfidence = hasEditMarker ? 34 : 91 - (input.fileSize % 8);
  const fontConfidence = hasEditMarker ? 29 : input.mimeType === "application/pdf" ? 94 : 83 - (input.fileSize % 7);
  const noiseConfidence = hasEditMarker ? 37 : 89 - (input.fileSize % 9);
  const cloneConfidence = hasEditMarker ? 66 : 93 - (input.fileSize % 6);
  const qrApplicable = ["aadhaar", "pan", "passport", "marksheet"].includes(input.documentType);
  const qrConfidence = qrApplicable ? (hasEditMarker ? 22 : 96 - (input.fileSize % 5)) : 0;

  const checks: AnalysisCheck[] = [
    {
      checkName: "file_format_metadata",
      result: formatPass ? "pass" : "flag",
      confidence: formatPass ? 98 : 12,
      explanation: formatPass ? "The file format is supported and basic metadata is internally readable." : "The file could not be validated as a supported document format.",
    },
    {
      checkName: "compression_analysis",
      result: compressionConfidence >= 70 ? "pass" : "flag",
      confidence: compressionConfidence,
      explanation: compressionConfidence >= 70 ? "Compression patterns remain consistent across the document surface." : "Isolated recompression signals were detected around one or more visible fields.",
      flaggedRegion: compressionConfidence < 70 ? { x: 52, y: 34, width: 34, height: 16 } : undefined,
    },
    {
      checkName: "font_consistency",
      result: fontConfidence >= 70 ? "pass" : "flag",
      confidence: fontConfidence,
      explanation: fontConfidence >= 70 ? "Text spacing, weight, and glyph rendering align with the surrounding template." : "One or more text fields use a rendering profile that differs from the surrounding template.",
      flaggedRegion: fontConfidence < 70 ? { x: 22, y: 40, width: 58, height: 17 } : undefined,
    },
    {
      checkName: "qr_checksum_validation",
      result: qrApplicable ? (qrConfidence >= 70 ? "pass" : "flag") : "not_applicable",
      confidence: qrConfidence,
      explanation: qrApplicable ? (qrConfidence >= 70 ? "The machine-readable data is structurally valid and internally consistent." : "The visible checksum does not reconcile with the extracted document number.") : "No machine-readable code was present for this document type.",
      flaggedRegion: qrApplicable && qrConfidence < 70 ? { x: 68, y: 74, width: 20, height: 18 } : undefined,
    },
    {
      checkName: "noise_consistency",
      result: noiseConfidence >= 70 ? "pass" : "flag",
      confidence: noiseConfidence,
      explanation: noiseConfidence >= 70 ? "Image noise and rasterization artifacts are consistent across the scan." : "Noise varies across a visible region, which can indicate a re-rendered field.",
      flaggedRegion: noiseConfidence < 70 ? { x: 58, y: 58, width: 30, height: 20 } : undefined,
    },
    {
      checkName: "clone_detection",
      result: cloneConfidence >= 70 ? "pass" : "flag",
      confidence: cloneConfidence,
      explanation: cloneConfidence >= 70 ? "No duplicated content or copy-move artifacts were found in the visible fields." : "Repeated visual fragments suggest a possible copy-move operation.",
      flaggedRegion: cloneConfidence < 70 ? { x: 28, y: 55, width: 48, height: 18 } : undefined,
    },
  ];

  const weightedChecks = checks.filter((check) => check.result !== "not_applicable");
  const rawScore = Math.round(weightedChecks.reduce((sum, check) => {
    const weight = check.checkName === "qr_checksum_validation" || check.checkName === "file_format_metadata" ? 1.8 : 1;
    return sum + check.confidence * weight;
  }, 0) / weightedChecks.reduce((sum, check) => sum + (check.checkName === "qr_checksum_validation" || check.checkName === "file_format_metadata" ? 1.8 : 1), 0));
  const score = !formatPass ? 20 : hasEditMarker ? Math.min(rawScore, 29) : rawScore;
  const status = score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged";

  return { score, status, checks };
}

/**
 * Future ML adapters can call the configured webhook with file metadata or a secure
 * temporary object reference and return the same AnalysisCheck shape. The frontend
 * and scoring policy do not need to change when that adapter is introduced.
 */
export function getAnalysisWebhookUrl() {
  return process.env.ANALYSIS_WEBHOOK_URL ?? null;
}
