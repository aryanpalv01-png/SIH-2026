import crypto from "node:crypto";
import exifr from "exifr";
import jpeg from "jpeg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import type { AnalysisCheck, AnalysisRegion, AnalysisResult } from "./analyzer";

export type ForensicInput = {
  filename: string;
  mimeType: string;
  fileSize: number;
  documentType: "aadhaar" | "pan" | "passport" | "marksheet" | "bank_statement" | "other";
  content?: Buffer;
};

export type ForensicProvider = "local" | "huggingface" | "trufor" | "catnet" | "ocr" | "pixel";
export type ForensicModuleResult = AnalysisCheck & { provider: ForensicProvider; available: boolean };
export type ForensicAnalysis = { score: number; status: "verified" | "needs_review" | "likely_forged"; checks: ForensicModuleResult[]; providers: Record<string, "active" | "not_configured" | "not_applicable" | "error">; providerHealth: Record<string, "healthy" | "not_configured" | "not_applicable" | "degraded">; extractedFields: Record<string, string>; comparisonFindings: string[] };

const editingSoftware = /(photoshop|gimp|canva|illustrator|affinity|pixelmator|after effects)/i;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const verhoeffMultiplication = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const verhoeffPermutation = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const verhoeffInverse = [0,4,3,2,1,5,6,7,8,9];

function check(checkName: string, result: AnalysisResult, confidence: number, explanation: string, provider: ForensicProvider, flaggedRegion?: AnalysisRegion): ForensicModuleResult {
  return { checkName, result, confidence, explanation, provider, available: result !== "not_applicable", ...(flaggedRegion ? { flaggedRegion } : {}) };
}

export async function inspectMetadata(input: ForensicInput): Promise<ForensicModuleResult> {
  const name = input.filename.toLowerCase();
  const suspiciousName = editingSoftware.test(name) || /(edited|modified|retouched|final[-_ ]?copy)/i.test(name);
  if (!allowedMimeTypes.has(input.mimeType) || input.fileSize <= 0) return check("metadata_exif_inspection", "flag", 12, "The file format or size is invalid, so metadata provenance cannot be trusted.", "local");
  const bytes = input.content;
  if (!bytes) return check("metadata_exif_inspection", "not_applicable", 0, "Raw file bytes were not available to inspect EXIF or PDF metadata.", "local");
  if (input.mimeType === "application/pdf") {
    const pdfText = bytes.toString("latin1");
    const producerMatch = pdfText.match(/\/(?:Producer|Creator|Author)\s*\(([^)]*)\)/i);
    const metadataText = producerMatch?.[1] ?? "";
    if (editingSoftware.test(metadataText) || suspiciousName) return check("metadata_exif_inspection", "flag", 20, `PDF metadata indicates a derivative or editing workflow${metadataText ? ` (${metadataText})` : ""}. Confirm the original source and issuance path.`, "local");
    return check("metadata_exif_inspection", producerMatch ? "pass" : "not_applicable", producerMatch ? 86 : 0, producerMatch ? "PDF producer metadata was parsed and no common editing-software marker was found." : "The PDF did not expose a readable Producer/Creator metadata token; absence is not proof of authenticity.", "local");
  }
  try {
    const exif = await exifr.parse(bytes, { translateValues: false, tiff: true, exif: true, xmp: true, iptc: true, icc: false });
    const metadataText = JSON.stringify(exif ?? {});
    if (editingSoftware.test(metadataText) || suspiciousName) return check("metadata_exif_inspection", "flag", 18, "Image metadata contains an editing-software marker or derivative filename. Treat provenance as requiring manual review.", "local");
    if (!exif) return check("metadata_exif_inspection", "not_applicable", 0, "No readable EXIF/XMP metadata was found. Stripped metadata is inconclusive and should not be treated as a clean pass.", "local");
    return check("metadata_exif_inspection", "pass", 88, "EXIF/XMP metadata was parsed and no common editing-software marker was found. Metadata absence or cleanliness is not proof of authenticity.", "local");
  } catch { return check("metadata_exif_inspection", "not_applicable", 0, "The image metadata parser could not decode this file; the signal was excluded rather than guessed.", "local"); }
}

function isVerhoeffValid(value: string) {
  let checksum = 0;
  const digits = value.replace(/\D/g, "").split("").reverse().map(Number);
  digits.forEach((digit, index) => { checksum = verhoeffMultiplication[checksum]![verhoeffPermutation[index % 8]![digit]!]!; });
  return checksum === 0;
}

export function validateDocumentIdentifier(input: ForensicInput, extractedFields: Record<string, string> = {}): ForensicModuleResult {
  const candidate = (extractedFields.aadhaar_number || input.filename.match(/\d{10,16}/)?.[0] || "").replace(/\D/g, "");
  if (input.documentType === "aadhaar" || (input.documentType === "other" && candidate.length === 12)) {
    if (!candidate) return check("checksum_identifier_validation", "not_applicable", 0, "No Aadhaar-like identifier was extracted because OCR text is not available in this runtime.", "local");
    const valid = candidate.length === 12 && isVerhoeffValid(candidate);
    return check("checksum_identifier_validation", valid ? "pass" : "flag", valid ? 94 : 8, valid ? "The extracted 12-digit identifier passes the Verhoeff checksum." : "The extracted Aadhaar-like identifier fails the Verhoeff checksum. Confirm the printed number and issuing source.", "local");
  }
  if (input.documentType === "pan" || (input.documentType === "other" && extractedFields.pan_number)) {
    const pan = (extractedFields.pan_number || input.filename.toUpperCase().match(/[A-Z]{5}\d{4}[A-Z]/)?.[0] || "").toUpperCase();
    if (!pan) return check("checksum_identifier_validation", "not_applicable", 0, "No PAN-like identifier was extracted because OCR text is not available in this runtime.", "local");
    const valid = /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/.test(pan);
    return check("checksum_identifier_validation", valid ? "pass" : "flag", valid ? 92 : 10, valid ? "The extracted PAN-like identifier matches the expected structural rules." : "The extracted PAN-like identifier does not match the expected structural rules.", "local");
  }
  return check("checksum_identifier_validation", "not_applicable", 0, "Identifier validation is scoped to Aadhaar and PAN until OCR field extraction is configured for this document type.", "local");
}

export async function verifyQrOrBarcode(input: ForensicInput, extractedFields: Record<string, string> = {}): Promise<ForensicModuleResult> {
  if (input.documentType !== "aadhaar") return check("qr_signature_verification", "not_applicable", 0, "QR signature verification is currently scoped to Aadhaar because the UIDAI public certificate is the only issuer certificate configured.", "local");
  const image = decodeImage(input);
  if (!image) return check("qr_signature_verification", "not_applicable", 0, "QR decoding requires a decodable JPEG or PNG image.", "local");
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  if (!code) return check("qr_signature_verification", "not_applicable", 0, "No QR code was decoded from the image; a barcode-specific adapter may be added for formats outside QR.", "local");
  const verifierUrl = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/verify-aadhaar-qr` : undefined;
  if (!verifierUrl) return check("qr_signature_verification", "not_applicable", 0, "A QR payload was decoded, but the local UIDAI certificate worker is not configured. The payload was not treated as trusted.", "local");
  try {
    const response = await fetch(verifierUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decodedQr: code.data, extractedFields }), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return check("qr_signature_verification", "not_applicable", 0, `The local UIDAI certificate verifier returned ${response.status}; the QR signal was excluded from scoring.`, "local");
    const payload = await response.json() as { result?: AnalysisResult; confidence?: number; explanation?: string; flaggedRegion?: AnalysisRegion };
    const result = payload.result;
    if (!result || !["pass", "flag", "not_applicable"].includes(result) || typeof payload.confidence !== "number" || typeof payload.explanation !== "string") return check("qr_signature_verification", "not_applicable", 0, "The UIDAI certificate verifier response did not match the validated schema.", "local");
    return check("qr_signature_verification", result, Math.max(0, Math.min(100, Math.round(payload.confidence))), payload.explanation, "local", payload.flaggedRegion);
  } catch { return check("qr_signature_verification", "not_applicable", 0, "The local UIDAI certificate verifier was unavailable; the QR signal was excluded rather than guessed.", "local"); }
}

function byteEntropy(bytes: Buffer) {
  if (!bytes.length) return 0;
  const counts = new Array<number>(256).fill(0);
  for (let index = 0; index < bytes.length; index += 1) { const byte = bytes[index]!; counts[byte] = (counts[byte] ?? 0) + 1; }
  return counts.reduce((entropy, count) => { if (!count) return entropy; const probability = count / bytes.length; return entropy - probability * Math.log2(probability); }, 0);
}

type DecodedImage = { width: number; height: number; data: Uint8ClampedArray };

function decodeImage(input: ForensicInput): DecodedImage | null {
  if (!input.content || !/^image\//.test(input.mimeType)) return null;
  try {
    if (input.mimeType === "image/jpeg") {
      const decoded = jpeg.decode(input.content, { useTArray: true });
      return { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
    }
    if (input.mimeType === "image/png") {
      const decoded = PNG.sync.read(input.content);
      return { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) };
    }
  } catch { return null; }
  return null;
}

function luminance(data: Uint8ClampedArray, index: number) { return 0.2126 * data[index]! + 0.7152 * data[index + 1]! + 0.0722 * data[index + 2]!; }

export function analyzeCompressionAndEla(input: ForensicInput): ForensicModuleResult {
  const image = decodeImage(input);
  if (!image) return check("ela_compression_analysis", "not_applicable", 0, "ELA requires a decodable JPEG or PNG image; PDFs require rasterization in an image-analysis worker.", "local");
  const recompressed = jpeg.encode({ data: Buffer.from(image.data), width: image.width, height: image.height }, 90).data;
  const recompressedImage = jpeg.decode(recompressed, { useTArray: true });
  const pixels = Math.min(image.width * image.height, recompressedImage.width * recompressedImage.height);
  let totalDifference = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const sourceIndex = pixel * 4;
    totalDifference += Math.abs(image.data[sourceIndex]! - recompressedImage.data[sourceIndex]!);
    totalDifference += Math.abs(image.data[sourceIndex + 1]! - recompressedImage.data[sourceIndex + 1]!);
    totalDifference += Math.abs(image.data[sourceIndex + 2]! - recompressedImage.data[sourceIndex + 2]!);
  }
  const meanDifference = totalDifference / Math.max(1, pixels * 3);
  const confidence = Math.max(8, Math.min(96, Math.round(96 - meanDifference * 3.4)));
  return check("ela_compression_analysis", confidence >= 65 ? "pass" : "flag", confidence, confidence >= 65 ? `JPEG re-save ELA measured a mean pixel difference of ${meanDifference.toFixed(2)}; no strong recompression inconsistency was detected.` : `JPEG re-save ELA measured a mean pixel difference of ${meanDifference.toFixed(2)}; inspect the image for localized recompression boundaries.`, "local", confidence < 65 ? { x: 18, y: 30, width: 64, height: 32 } : undefined);
}

export function detectCopyMoveAndScreenshot(input: ForensicInput): ForensicModuleResult[] {
  const image = decodeImage(input);
  if (!image) return [check("copy_move_clone_detection", "not_applicable", 0, "Clone detection requires decoded image pixels and is not run on PDFs in the Node request path.", "local"), check("screenshot_capture_detection", "not_applicable", 0, "Capture-type detection requires decoded pixel noise statistics.", "local")];
  const blockSize = 8;
  const signatures = new Map<string, { x: number; y: number }>();
  let cloneRegion: AnalysisRegion | undefined;
  for (let y = 0; y + blockSize < image.height; y += blockSize) {
    for (let x = 0; x + blockSize < image.width; x += blockSize) {
      let signature = "";
      for (let by = 0; by < blockSize; by += 2) for (let bx = 0; bx < blockSize; bx += 2) { const index = ((y + by) * image.width + x + bx) * 4; signature += Math.round(luminance(image.data, index) / 16).toString(16); }
      const previous = signatures.get(signature);
      if (previous && Math.abs(previous.x - x) > blockSize * 2 && Math.abs(previous.y - y) > blockSize * 2) { cloneRegion = { x: Math.round((x / image.width) * 100), y: Math.round((y / image.height) * 100), width: Math.round((blockSize / image.width) * 100 * 2), height: Math.round((blockSize / image.height) * 100 * 2) }; }
      else if (!previous) signatures.set(signature, { x, y });
    }
  }
  const sample: number[] = [];
  for (let y = 1; y < image.height - 1; y += Math.max(1, Math.floor(image.height / 48))) for (let x = 1; x < image.width - 1; x += Math.max(1, Math.floor(image.width / 48))) { const index = (y * image.width + x) * 4; const right = luminance(image.data, index + 4); const below = luminance(image.data, index + image.width * 4); sample.push(Math.abs(luminance(image.data, index) - right) + Math.abs(luminance(image.data, index) - below)); }
  const mean = sample.reduce((sum, value) => sum + value, 0) / Math.max(1, sample.length);
  const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, sample.length);
  const screenshot = variance < 18 && mean < 8;
  return [check("copy_move_clone_detection", cloneRegion ? "flag" : "pass", cloneRegion ? 34 : 84, cloneRegion ? "Repeated 8×8 luminance blocks were found in non-adjacent image regions. This is a preflight signal; feature-based ORB/SIFT confirmation is recommended." : "No repeated non-adjacent 8×8 luminance blocks were found in the decoded image preflight.", "local", cloneRegion), check("screenshot_capture_detection", screenshot ? "flag" : "pass", screenshot ? 38 : 82, screenshot ? `Decoded pixel noise variance was ${variance.toFixed(2)} with mean edge difference ${mean.toFixed(2)}, consistent with a low-noise re-render or screenshot capture.` : `Decoded pixel noise variance was ${variance.toFixed(2)}; the image does not strongly resemble a uniformly re-rendered screenshot.`, "local")];
}

export async function typographyConsistency(input: ForensicInput): Promise<ForensicModuleResult> {
  const url = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/ocr` : undefined;
  if (!url || !input.content || !/^image\//.test(input.mimeType)) return check("ocr_typography_consistency", "not_applicable", 0, "OCR typography analysis requires the self-hosted Tesseract/OpenCV worker and image bytes; no third-party API key is used.", "ocr");
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content as unknown as BodyInit, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return check("ocr_typography_consistency", "not_applicable", 0, `OCR typography inference returned ${response.status}; its signal was excluded from scoring.`, "ocr");
    const payload = await response.json() as { consistent?: boolean; confidence?: number; explanation?: string; flaggedRegion?: AnalysisRegion; fields?: Record<string, string> };
    if (typeof payload.consistent !== "boolean" || typeof payload.confidence !== "number") return check("ocr_typography_consistency", "not_applicable", 0, "The OCR worker response did not match the validated typography schema.", "ocr");
    const confidence = Math.max(0, Math.min(100, Math.round(payload.confidence)));
    return Object.assign(check("ocr_typography_consistency", payload.consistent ? "pass" : "flag", confidence, payload.explanation ?? (payload.consistent ? "The OCR worker found consistent text baselines and stroke measurements." : "The OCR worker found a typography deviation that should be reviewed."), "ocr", payload.flaggedRegion), { extractedFields: payload.fields ?? {} });
  } catch { return check("ocr_typography_consistency", "not_applicable", 0, "OCR typography inference was unavailable; the signal was excluded rather than guessed.", "ocr"); }
}

async function callHuggingFace(input: ForensicInput): Promise<ForensicModuleResult> {
  if (!input.content || !/^image\//.test(input.mimeType)) return check("ai_generated_image_detector", "not_applicable", 0, "AI-image detection is only applicable to image uploads, not PDF bytes.", "huggingface");
  if (!process.env.HF_API_TOKEN) return check("ai_generated_image_detector", "not_applicable", 0, "Hugging Face inference is not configured. Add HF_API_TOKEN to enable this optional signal.", "huggingface");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/Organika/sdxl-detector", { method: "POST", headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN}`, "Content-Type": input.mimeType }, body: input.content as unknown as BodyInit, signal: controller.signal });
    if (!response.ok) return check("ai_generated_image_detector", "not_applicable", 0, `Hugging Face returned ${response.status}; the AI-image signal was excluded from this report.`, "huggingface");
    const payload = await response.json() as Array<{ label?: string; score?: number }>;
    const aiLabel = payload.find((item) => /art|ai|generated|fake/i.test(item.label ?? ""));
    const aiProbability = Math.round((aiLabel?.score ?? 0) * 100);
    const confidence = 100 - aiProbability;
    return check("ai_generated_image_detector", aiProbability > 70 ? "flag" : "pass", confidence, aiProbability > 70 ? `The optional SDXL detector returned a high AI-generation likelihood (${aiProbability}%). This is not proof of document editing.` : `The optional SDXL detector returned a low AI-generation likelihood (${aiProbability}%). Its model card warns performance varies by generator family.`, "huggingface");
  } catch { return check("ai_generated_image_detector", "not_applicable", 0, "Hugging Face inference could not be completed within the request window; the signal was excluded rather than guessed.", "huggingface"); } finally { clearTimeout(timeout); }
}

async function callExternalPixelAdapter(input: ForensicInput): Promise<ForensicModuleResult[]> {
  const url = process.env.PIXEL_ANALYSIS_API_URL;
  if (!url || !input.content) return [check("pixel_worker_analysis", "not_applicable", 0, "No self-hosted pixel-analysis worker is configured; local decoded-pixel preflight results remain separate from high-capacity worker inference.", "pixel")];
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content as unknown as BodyInit, signal: AbortSignal.timeout(25_000) });
    if (!response.ok) return [check("pixel_worker_analysis", "not_applicable", 0, `The pixel-analysis worker returned ${response.status}; worker signals were excluded from scoring.`, "pixel")];
    type PixelWorkerResult = { result: AnalysisResult; confidence: number; explanation: string; flaggedRegion?: AnalysisRegion };
    const payload = await response.json() as { ela?: PixelWorkerResult; screenshot?: PixelWorkerResult; clone?: PixelWorkerResult };
    const outputs: ForensicModuleResult[] = [];
    for (const [name, item] of [["pixel_ela_worker", payload.ela], ["pixel_screenshot_worker", payload.screenshot], ["pixel_clone_worker", payload.clone]] as const) if (item && typeof item.confidence === "number" && typeof item.explanation === "string") outputs.push(check(name, item.result, Math.max(0, Math.min(100, Math.round(item.confidence))), item.explanation, "pixel", item.flaggedRegion));
    return outputs.length ? outputs : [check("pixel_worker_analysis", "not_applicable", 0, "The pixel-analysis worker response did not match the validated schema.", "pixel")];
  } catch { return [check("pixel_worker_analysis", "not_applicable", 0, "The pixel-analysis worker was unavailable; worker signals were excluded from scoring.", "pixel")]; }
}

async function callExternalAdapter(name: "trufor" | "catnet", input: ForensicInput): Promise<ForensicModuleResult> {
  const envKey = name === "trufor" ? "TRUFOR_API_URL" : "CATNET_API_URL";
  const url = process.env[envKey];
  if (!url) return check(`${name}_inference`, "not_applicable", 0, `${name === "trufor" ? "TruFor" : "CAT-Net"} is not configured. Its pretrained Python runtime must be exposed behind a controlled inference service before this signal can run.`, name);
  if (!input.content) return check(`${name}_inference`, "not_applicable", 0, "The model adapter requires the uploaded bytes.", name);
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content as unknown as BodyInit, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return check(`${name}_inference`, "not_applicable", 0, `${name} inference returned ${response.status}; this provider signal was excluded from scoring.`, name);
    const payload = await response.json() as { integrityScore?: number; tamperProbability?: number; reliability?: number };
    const integrity = Math.max(0, Math.min(100, Math.round((payload.integrityScore ?? (1 - (payload.tamperProbability ?? 1)) ) * 100)));
    return check(`${name}_inference`, integrity < 40 ? "flag" : "pass", integrity, `${name} adapter returned an integrity score of ${integrity}/100 with reliability ${Math.round((payload.reliability ?? 0) * 100)}/100.`, name);
  } catch { return check(`${name}_inference`, "not_applicable", 0, `${name} inference was unavailable; this provider signal was excluded from scoring.`, name); }
}

export function fuseForensicChecks(checks: ForensicModuleResult[]): { score: number; status: ForensicAnalysis["status"] } {
  const active = checks.filter((item) => item.result !== "not_applicable");
  if (!active.length) return { score: 0, status: "needs_review" };
  const hardFail = checks.some((item) => ["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) && item.result === "flag");
  const totalWeight = active.reduce((sum, item) => sum + (["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) ? 2.8 : item.provider === "trufor" || item.provider === "catnet" ? 2 : 1), 0);
  const weighted = active.reduce((sum, item) => sum + item.confidence * (["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) ? 2.8 : item.provider === "trufor" || item.provider === "catnet" ? 2 : 1), 0) / totalWeight;
  const score = hardFail ? Math.min(29, Math.round(weighted)) : Math.round(weighted);
  return { score, status: score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged" };
}

async function probeWorkerHealth() {
  const url = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/health` : undefined;
  if (!url) return undefined;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return undefined;
    return await response.json() as { ocr?: string; uidaiCertificate?: string; trufor?: string; catnet?: string };
  } catch { return undefined; }
}

export async function probeConfiguredServiceHealth(url?: string) {
  if (!url) return undefined;
  const base = url.replace(/\/(analyze-tampering|analyze-catnet|health)\/?$/, "");
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
    return response.ok ? "healthy" : "degraded";
  } catch { return "degraded"; }
}

function providerConfigKey(provider: ForensicProvider) {
  if (provider === "huggingface") return "HF_API_TOKEN";
  if (provider === "ocr") return "FORENSIC_WORKER_URL";
  if (provider === "pixel") return "PIXEL_ANALYSIS_API_URL";
  if (provider === "trufor") return "TRUFOR_API_URL";
  if (provider === "catnet") return "CATNET_API_URL";
  return "FORENSIC_WORKER_URL";
}

export async function runForensicAnalysis(input: ForensicInput): Promise<ForensicAnalysis> {
  const workerBase = process.env.FORENSIC_WORKER_URL || "http://127.0.0.1:8000";
  if (input.content && /^image\//.test(input.mimeType)) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(input.content)], { type: input.mimeType });
      formData.append("file", blob, input.filename);
      formData.append("documentType", input.documentType);

      const workerResp = await fetch(`${workerBase.replace(/\/+$/, "")}/analyze-full`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(10_000),
      });

      if (workerResp.ok) {
        const payload = await workerResp.json() as {
          status: "verified" | "needs_review" | "likely_forged";
          confidence_score: number;
          verdict: string;
          summary: string;
          hard_fail: boolean;
          checks: Array<{
            checkName: string;
            result: AnalysisResult;
            confidence: number;
            explanation: string;
            provider?: ForensicProvider;
            flagged_region?: AnalysisRegion | null;
          }>;
          extracted_fields?: Record<string, string>;
        };

        const checks: ForensicModuleResult[] = payload.checks.map((c) => ({
          checkName: c.checkName === "checksum_validation" ? "checksum_identifier_validation" : c.checkName,
          result: c.result,
          confidence: c.confidence,
          explanation: c.explanation,
          provider: (c.provider as ForensicProvider) || "local",
          available: c.result !== "not_applicable",
          flaggedRegion: c.flagged_region || undefined,
        }));

        const providers: Record<string, ForensicAnalysis["providers"][string]> = {
          local: "active",
          ocr: "active",
          pixel: "active",
          huggingface: process.env.HF_API_TOKEN ? "active" : "not_configured",
          trufor: process.env.TRUFOR_API_URL ? "active" : "not_configured",
          catnet: process.env.CATNET_API_URL ? "active" : "not_configured",
        };

        const providerHealth: ForensicAnalysis["providerHealth"] = {
          local: "healthy",
          ocr: "healthy",
          pixel: "healthy",
          huggingface: process.env.HF_API_TOKEN ? "healthy" : "not_configured",
          trufor: process.env.TRUFOR_API_URL ? "healthy" : "not_configured",
          catnet: process.env.CATNET_API_URL ? "healthy" : "not_configured",
        };

        return {
          score: payload.confidence_score,
          status: payload.status,
          checks,
          providers,
          providerHealth,
          extractedFields: payload.extracted_fields || {},
          comparisonFindings: checks
            .filter((item) => item.result === "flag")
            .map((item) => `${item.checkName}: ${item.explanation}`),
        };
      }
    } catch {
      // Fall through to local Node analysis
    }
  }

  const ocr = await typographyConsistency(input);
  const extractedFields = (ocr as ForensicModuleResult & { extractedFields?: Record<string, string> }).extractedFields ?? {};
  const checks = [await inspectMetadata(input), validateDocumentIdentifier(input, extractedFields), await verifyQrOrBarcode(input, extractedFields), analyzeCompressionAndEla(input), ...detectCopyMoveAndScreenshot(input), ocr, await callHuggingFace(input), await callExternalAdapter("trufor", input), await callExternalAdapter("catnet", input), ...await callExternalPixelAdapter(input)];
  const fused = fuseForensicChecks(checks);
  const providers = checks.reduce<Record<string, ForensicAnalysis["providers"][string]>>((result, item) => { result[item.provider] = item.result === "not_applicable" ? (item.provider === "local" ? "not_applicable" : (process.env[providerConfigKey(item.provider)] ? "not_applicable" : "not_configured")) : "active"; return result; }, {});
  const [workerHealth, truforHealth, catnetHealth] = await Promise.all([probeWorkerHealth(), probeConfiguredServiceHealth(process.env.TRUFOR_API_URL), probeConfiguredServiceHealth(process.env.CATNET_API_URL)]);
  const healthFor = (provider: string, fallback: ForensicAnalysis["providers"][string]) => {
    const workerState = provider === "ocr" ? workerHealth?.ocr : provider === "local" ? workerHealth?.uidaiCertificate : provider === "trufor" ? (truforHealth ?? workerHealth?.trufor) : provider === "catnet" ? (catnetHealth ?? workerHealth?.catnet) : undefined;
    if (workerState === "healthy" || workerState === "configured") return "healthy";
    if (workerState === "not_configured") return "not_configured";
    if (workerState) return "degraded";
    return fallback === "active" ? "healthy" : fallback === "not_configured" ? "not_configured" : "not_applicable";
  };
  const providerHealth = Object.fromEntries(Object.entries(providers).map(([provider, state]) => [provider, healthFor(provider, state)])) as ForensicAnalysis["providerHealth"];
  return { ...fused, checks, providers, providerHealth, extractedFields, comparisonFindings: checks.filter((item) => item.checkName === "qr_signature_verification" && item.result === "flag").map((item) => item.explanation) };
}
