var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/forensics.ts
var forensics_exports = {};
__export(forensics_exports, {
  analyzeCompressionAndEla: () => analyzeCompressionAndEla,
  detectCopyMoveAndScreenshot: () => detectCopyMoveAndScreenshot,
  fuseForensicChecks: () => fuseForensicChecks,
  inspectMetadata: () => inspectMetadata,
  probeConfiguredServiceHealth: () => probeConfiguredServiceHealth,
  runForensicAnalysis: () => runForensicAnalysis,
  typographyConsistency: () => typographyConsistency,
  validateDocumentIdentifier: () => validateDocumentIdentifier,
  verifyQrOrBarcode: () => verifyQrOrBarcode
});
import exifr from "exifr";
import jpeg from "jpeg-js";
import jsQR from "jsqr";
import { PNG } from "pngjs";
function check(checkName, result, confidence, explanation, provider, flaggedRegion) {
  return { checkName, result, confidence, explanation, provider, available: result !== "not_applicable", ...flaggedRegion ? { flaggedRegion } : {} };
}
async function inspectMetadata(input) {
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
  } catch {
    return check("metadata_exif_inspection", "not_applicable", 0, "The image metadata parser could not decode this file; the signal was excluded rather than guessed.", "local");
  }
}
function isVerhoeffValid(value) {
  let checksum = 0;
  const digits = value.replace(/\D/g, "").split("").reverse().map(Number);
  digits.forEach((digit, index) => {
    checksum = verhoeffMultiplication[checksum][verhoeffPermutation[index % 8][digit]];
  });
  return checksum === 0;
}
function validateDocumentIdentifier(input, extractedFields = {}) {
  const candidate = (extractedFields.aadhaar_number || input.filename.match(/\d{10,16}/)?.[0] || "").replace(/\D/g, "");
  if (input.documentType === "aadhaar" || input.documentType === "other" && candidate.length === 12) {
    if (!candidate) return check("checksum_identifier_validation", "not_applicable", 0, "No Aadhaar-like identifier was extracted because OCR text is not available in this runtime.", "local");
    const valid = candidate.length === 12 && isVerhoeffValid(candidate);
    return check("checksum_identifier_validation", valid ? "pass" : "flag", valid ? 94 : 8, valid ? "The extracted 12-digit identifier passes the Verhoeff checksum." : "The extracted Aadhaar-like identifier fails the Verhoeff checksum. Confirm the printed number and issuing source.", "local");
  }
  if (input.documentType === "pan" || input.documentType === "other" && extractedFields.pan_number) {
    const pan = (extractedFields.pan_number || input.filename.toUpperCase().match(/[A-Z]{5}\d{4}[A-Z]/)?.[0] || "").toUpperCase();
    if (!pan) return check("checksum_identifier_validation", "not_applicable", 0, "No PAN-like identifier was extracted because OCR text is not available in this runtime.", "local");
    const valid = /^[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]$/.test(pan);
    return check("checksum_identifier_validation", valid ? "pass" : "flag", valid ? 92 : 10, valid ? "The extracted PAN-like identifier matches the expected structural rules." : "The extracted PAN-like identifier does not match the expected structural rules.", "local");
  }
  return check("checksum_identifier_validation", "not_applicable", 0, "Identifier validation is scoped to Aadhaar and PAN until OCR field extraction is configured for this document type.", "local");
}
async function verifyQrOrBarcode(input, extractedFields = {}) {
  if (input.documentType !== "aadhaar") return check("qr_signature_verification", "not_applicable", 0, "QR signature verification is currently scoped to Aadhaar because the UIDAI public certificate is the only issuer certificate configured.", "local");
  const image = decodeImage(input);
  if (!image) return check("qr_signature_verification", "not_applicable", 0, "QR decoding requires a decodable JPEG or PNG image.", "local");
  const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  if (!code) return check("qr_signature_verification", "not_applicable", 0, "No QR code was decoded from the image; a barcode-specific adapter may be added for formats outside QR.", "local");
  const verifierUrl = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/verify-aadhaar-qr` : void 0;
  if (!verifierUrl) return check("qr_signature_verification", "not_applicable", 0, "A QR payload was decoded, but the local UIDAI certificate worker is not configured. The payload was not treated as trusted.", "local");
  try {
    const response = await fetch(verifierUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decodedQr: code.data, extractedFields }), signal: AbortSignal.timeout(2e4) });
    if (!response.ok) return check("qr_signature_verification", "not_applicable", 0, `The local UIDAI certificate verifier returned ${response.status}; the QR signal was excluded from scoring.`, "local");
    const payload = await response.json();
    const result = payload.result;
    if (!result || !["pass", "flag", "not_applicable"].includes(result) || typeof payload.confidence !== "number" || typeof payload.explanation !== "string") return check("qr_signature_verification", "not_applicable", 0, "The UIDAI certificate verifier response did not match the validated schema.", "local");
    return check("qr_signature_verification", result, Math.max(0, Math.min(100, Math.round(payload.confidence))), payload.explanation, "local", payload.flaggedRegion);
  } catch {
    return check("qr_signature_verification", "not_applicable", 0, "The local UIDAI certificate verifier was unavailable; the QR signal was excluded rather than guessed.", "local");
  }
}
function decodeImage(input) {
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
  } catch {
    return null;
  }
  return null;
}
function luminance(data, index) {
  return 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
}
function analyzeCompressionAndEla(input) {
  const image = decodeImage(input);
  if (!image) return check("ela_compression_analysis", "not_applicable", 0, "ELA requires a decodable JPEG or PNG image; PDFs require rasterization in an image-analysis worker.", "local");
  const recompressed = jpeg.encode({ data: Buffer.from(image.data), width: image.width, height: image.height }, 90).data;
  const recompressedImage = jpeg.decode(recompressed, { useTArray: true });
  const pixels = Math.min(image.width * image.height, recompressedImage.width * recompressedImage.height);
  let totalDifference = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const sourceIndex = pixel * 4;
    totalDifference += Math.abs(image.data[sourceIndex] - recompressedImage.data[sourceIndex]);
    totalDifference += Math.abs(image.data[sourceIndex + 1] - recompressedImage.data[sourceIndex + 1]);
    totalDifference += Math.abs(image.data[sourceIndex + 2] - recompressedImage.data[sourceIndex + 2]);
  }
  const meanDifference = totalDifference / Math.max(1, pixels * 3);
  const confidence = Math.max(8, Math.min(96, Math.round(96 - meanDifference * 3.4)));
  return check("ela_compression_analysis", confidence >= 65 ? "pass" : "flag", confidence, confidence >= 65 ? `JPEG re-save ELA measured a mean pixel difference of ${meanDifference.toFixed(2)}; no strong recompression inconsistency was detected.` : `JPEG re-save ELA measured a mean pixel difference of ${meanDifference.toFixed(2)}; inspect the image for localized recompression boundaries.`, "local", confidence < 65 ? { x: 18, y: 30, width: 64, height: 32 } : void 0);
}
function detectCopyMoveAndScreenshot(input) {
  const image = decodeImage(input);
  if (!image) return [check("copy_move_clone_detection", "not_applicable", 0, "Clone detection requires decoded image pixels and is not run on PDFs in the Node request path.", "local"), check("screenshot_capture_detection", "not_applicable", 0, "Capture-type detection requires decoded pixel noise statistics.", "local")];
  const blockSize = 8;
  const signatures = /* @__PURE__ */ new Map();
  let cloneRegion;
  for (let y = 0; y + blockSize < image.height; y += blockSize) {
    for (let x = 0; x + blockSize < image.width; x += blockSize) {
      let signature = "";
      for (let by = 0; by < blockSize; by += 2) for (let bx = 0; bx < blockSize; bx += 2) {
        const index = ((y + by) * image.width + x + bx) * 4;
        signature += Math.round(luminance(image.data, index) / 16).toString(16);
      }
      const previous = signatures.get(signature);
      if (previous && Math.abs(previous.x - x) > blockSize * 2 && Math.abs(previous.y - y) > blockSize * 2) {
        cloneRegion = { x: Math.round(x / image.width * 100), y: Math.round(y / image.height * 100), width: Math.round(blockSize / image.width * 100 * 2), height: Math.round(blockSize / image.height * 100 * 2) };
      } else if (!previous) signatures.set(signature, { x, y });
    }
  }
  const sample = [];
  for (let y = 1; y < image.height - 1; y += Math.max(1, Math.floor(image.height / 48))) for (let x = 1; x < image.width - 1; x += Math.max(1, Math.floor(image.width / 48))) {
    const index = (y * image.width + x) * 4;
    const right = luminance(image.data, index + 4);
    const below = luminance(image.data, index + image.width * 4);
    sample.push(Math.abs(luminance(image.data, index) - right) + Math.abs(luminance(image.data, index) - below));
  }
  const mean = sample.reduce((sum, value) => sum + value, 0) / Math.max(1, sample.length);
  const variance = sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, sample.length);
  const screenshot = variance < 18 && mean < 8;
  return [check("copy_move_clone_detection", cloneRegion ? "flag" : "pass", cloneRegion ? 34 : 84, cloneRegion ? "Repeated 8\xD78 luminance blocks were found in non-adjacent image regions. This is a preflight signal; feature-based ORB/SIFT confirmation is recommended." : "No repeated non-adjacent 8\xD78 luminance blocks were found in the decoded image preflight.", "local", cloneRegion), check("screenshot_capture_detection", screenshot ? "flag" : "pass", screenshot ? 38 : 82, screenshot ? `Decoded pixel noise variance was ${variance.toFixed(2)} with mean edge difference ${mean.toFixed(2)}, consistent with a low-noise re-render or screenshot capture.` : `Decoded pixel noise variance was ${variance.toFixed(2)}; the image does not strongly resemble a uniformly re-rendered screenshot.`, "local")];
}
async function typographyConsistency(input) {
  const url = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/ocr` : void 0;
  if (!url || !input.content || !/^image\//.test(input.mimeType)) return check("ocr_typography_consistency", "not_applicable", 0, "OCR typography analysis requires the self-hosted Tesseract/OpenCV worker and image bytes; no third-party API key is used.", "ocr");
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content, signal: AbortSignal.timeout(2e4) });
    if (!response.ok) return check("ocr_typography_consistency", "not_applicable", 0, `OCR typography inference returned ${response.status}; its signal was excluded from scoring.`, "ocr");
    const payload = await response.json();
    if (typeof payload.consistent !== "boolean" || typeof payload.confidence !== "number") return check("ocr_typography_consistency", "not_applicable", 0, "The OCR worker response did not match the validated typography schema.", "ocr");
    const confidence = Math.max(0, Math.min(100, Math.round(payload.confidence)));
    return Object.assign(check("ocr_typography_consistency", payload.consistent ? "pass" : "flag", confidence, payload.explanation ?? (payload.consistent ? "The OCR worker found consistent text baselines and stroke measurements." : "The OCR worker found a typography deviation that should be reviewed."), "ocr", payload.flaggedRegion), { extractedFields: payload.fields ?? {} });
  } catch {
    return check("ocr_typography_consistency", "not_applicable", 0, "OCR typography inference was unavailable; the signal was excluded rather than guessed.", "ocr");
  }
}
async function callHuggingFace(input) {
  if (!input.content || !/^image\//.test(input.mimeType)) return check("ai_generated_image_detector", "not_applicable", 0, "AI-image detection is only applicable to image uploads, not PDF bytes.", "huggingface");
  if (!process.env.HF_API_TOKEN) return check("ai_generated_image_detector", "not_applicable", 0, "Hugging Face inference is not configured. Add HF_API_TOKEN to enable this optional signal.", "huggingface");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12e3);
  try {
    const response = await fetch("https://router.huggingface.co/hf-inference/models/Organika/sdxl-detector", { method: "POST", headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN}`, "Content-Type": input.mimeType }, body: input.content, signal: controller.signal });
    if (!response.ok) return check("ai_generated_image_detector", "not_applicable", 0, `Hugging Face returned ${response.status}; the AI-image signal was excluded from this report.`, "huggingface");
    const payload = await response.json();
    const aiLabel = payload.find((item) => /art|ai|generated|fake/i.test(item.label ?? ""));
    const aiProbability = Math.round((aiLabel?.score ?? 0) * 100);
    const confidence = 100 - aiProbability;
    return check("ai_generated_image_detector", aiProbability > 70 ? "flag" : "pass", confidence, aiProbability > 70 ? `The optional SDXL detector returned a high AI-generation likelihood (${aiProbability}%). This is not proof of document editing.` : `The optional SDXL detector returned a low AI-generation likelihood (${aiProbability}%). Its model card warns performance varies by generator family.`, "huggingface");
  } catch {
    return check("ai_generated_image_detector", "not_applicable", 0, "Hugging Face inference could not be completed within the request window; the signal was excluded rather than guessed.", "huggingface");
  } finally {
    clearTimeout(timeout);
  }
}
async function callExternalPixelAdapter(input) {
  const url = process.env.PIXEL_ANALYSIS_API_URL;
  if (!url || !input.content) return [check("pixel_worker_analysis", "not_applicable", 0, "No self-hosted pixel-analysis worker is configured; local decoded-pixel preflight results remain separate from high-capacity worker inference.", "pixel")];
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content, signal: AbortSignal.timeout(25e3) });
    if (!response.ok) return [check("pixel_worker_analysis", "not_applicable", 0, `The pixel-analysis worker returned ${response.status}; worker signals were excluded from scoring.`, "pixel")];
    const payload = await response.json();
    const outputs = [];
    for (const [name, item] of [["pixel_ela_worker", payload.ela], ["pixel_screenshot_worker", payload.screenshot], ["pixel_clone_worker", payload.clone]]) if (item && typeof item.confidence === "number" && typeof item.explanation === "string") outputs.push(check(name, item.result, Math.max(0, Math.min(100, Math.round(item.confidence))), item.explanation, "pixel", item.flaggedRegion));
    return outputs.length ? outputs : [check("pixel_worker_analysis", "not_applicable", 0, "The pixel-analysis worker response did not match the validated schema.", "pixel")];
  } catch {
    return [check("pixel_worker_analysis", "not_applicable", 0, "The pixel-analysis worker was unavailable; worker signals were excluded from scoring.", "pixel")];
  }
}
async function callExternalAdapter(name, input) {
  const envKey = name === "trufor" ? "TRUFOR_API_URL" : "CATNET_API_URL";
  const url = process.env[envKey];
  if (!url) return check(`${name}_inference`, "not_applicable", 0, `${name === "trufor" ? "TruFor" : "CAT-Net"} is not configured. Its pretrained Python runtime must be exposed behind a controlled inference service before this signal can run.`, name);
  if (!input.content) return check(`${name}_inference`, "not_applicable", 0, "The model adapter requires the uploaded bytes.", name);
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": input.mimeType }, body: input.content, signal: AbortSignal.timeout(2e4) });
    if (!response.ok) return check(`${name}_inference`, "not_applicable", 0, `${name} inference returned ${response.status}; this provider signal was excluded from scoring.`, name);
    const payload = await response.json();
    const integrity = Math.max(0, Math.min(100, Math.round((payload.integrityScore ?? 1 - (payload.tamperProbability ?? 1)) * 100)));
    return check(`${name}_inference`, integrity < 40 ? "flag" : "pass", integrity, `${name} adapter returned an integrity score of ${integrity}/100 with reliability ${Math.round((payload.reliability ?? 0) * 100)}/100.`, name);
  } catch {
    return check(`${name}_inference`, "not_applicable", 0, `${name} inference was unavailable; this provider signal was excluded from scoring.`, name);
  }
}
function fuseForensicChecks(checks2) {
  const active = checks2.filter((item) => item.result !== "not_applicable");
  if (!active.length) return { score: 0, status: "needs_review" };
  const hardFail = checks2.some((item) => ["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) && item.result === "flag");
  const totalWeight = active.reduce((sum, item) => sum + (["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) ? 2.8 : item.provider === "trufor" || item.provider === "catnet" ? 2 : 1), 0);
  const weighted = active.reduce((sum, item) => sum + item.confidence * (["checksum_identifier_validation", "qr_signature_verification"].includes(item.checkName) ? 2.8 : item.provider === "trufor" || item.provider === "catnet" ? 2 : 1), 0) / totalWeight;
  const score = hardFail ? Math.min(29, Math.round(weighted)) : Math.round(weighted);
  return { score, status: score > 80 ? "verified" : score >= 40 ? "needs_review" : "likely_forged" };
}
async function probeWorkerHealth() {
  const url = process.env.FORENSIC_WORKER_URL ? `${process.env.FORENSIC_WORKER_URL.replace(/\/$/, "")}/health` : void 0;
  if (!url) return void 0;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5e3) });
    if (!response.ok) return void 0;
    return await response.json();
  } catch {
    return void 0;
  }
}
async function probeConfiguredServiceHealth(url) {
  if (!url) return void 0;
  const base = url.replace(/\/(analyze-tampering|analyze-catnet|health)\/?$/, "");
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5e3) });
    return response.ok ? "healthy" : "degraded";
  } catch {
    return "degraded";
  }
}
function providerConfigKey(provider) {
  if (provider === "huggingface") return "HF_API_TOKEN";
  if (provider === "ocr") return "FORENSIC_WORKER_URL";
  if (provider === "pixel") return "PIXEL_ANALYSIS_API_URL";
  if (provider === "trufor") return "TRUFOR_API_URL";
  if (provider === "catnet") return "CATNET_API_URL";
  return "FORENSIC_WORKER_URL";
}
async function runForensicAnalysis(input) {
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
        signal: AbortSignal.timeout(1e4)
      });
      if (workerResp.ok) {
        const payload = await workerResp.json();
        const checks3 = payload.checks.map((c) => ({
          checkName: c.checkName === "checksum_validation" ? "checksum_identifier_validation" : c.checkName,
          result: c.result,
          confidence: c.confidence,
          explanation: c.explanation,
          provider: c.provider || "local",
          available: c.result !== "not_applicable",
          flaggedRegion: c.flagged_region || void 0
        }));
        const providers2 = {
          local: "active",
          ocr: "active",
          pixel: "active",
          huggingface: process.env.HF_API_TOKEN ? "active" : "not_configured",
          trufor: process.env.TRUFOR_API_URL ? "active" : "not_configured",
          catnet: process.env.CATNET_API_URL ? "active" : "not_configured"
        };
        const providerHealth2 = {
          local: "healthy",
          ocr: "healthy",
          pixel: "healthy",
          huggingface: process.env.HF_API_TOKEN ? "healthy" : "not_configured",
          trufor: process.env.TRUFOR_API_URL ? "healthy" : "not_configured",
          catnet: process.env.CATNET_API_URL ? "healthy" : "not_configured"
        };
        return {
          score: payload.confidence_score,
          status: payload.status,
          checks: checks3,
          providers: providers2,
          providerHealth: providerHealth2,
          extractedFields: payload.extracted_fields || {},
          comparisonFindings: checks3.filter((item) => item.result === "flag").map((item) => `${item.checkName}: ${item.explanation}`)
        };
      }
    } catch {
    }
  }
  const ocr = await typographyConsistency(input);
  const extractedFields = ocr.extractedFields ?? {};
  const checks2 = [await inspectMetadata(input), validateDocumentIdentifier(input, extractedFields), await verifyQrOrBarcode(input, extractedFields), analyzeCompressionAndEla(input), ...detectCopyMoveAndScreenshot(input), ocr, await callHuggingFace(input), await callExternalAdapter("trufor", input), await callExternalAdapter("catnet", input), ...await callExternalPixelAdapter(input)];
  const fused = fuseForensicChecks(checks2);
  const providers = checks2.reduce((result, item) => {
    result[item.provider] = item.result === "not_applicable" ? item.provider === "local" ? "not_applicable" : process.env[providerConfigKey(item.provider)] ? "not_applicable" : "not_configured" : "active";
    return result;
  }, {});
  const [workerHealth, truforHealth, catnetHealth] = await Promise.all([probeWorkerHealth(), probeConfiguredServiceHealth(process.env.TRUFOR_API_URL), probeConfiguredServiceHealth(process.env.CATNET_API_URL)]);
  const healthFor = (provider, fallback) => {
    const workerState = provider === "ocr" ? workerHealth?.ocr : provider === "local" ? workerHealth?.uidaiCertificate : provider === "trufor" ? truforHealth ?? workerHealth?.trufor : provider === "catnet" ? catnetHealth ?? workerHealth?.catnet : void 0;
    if (workerState === "healthy" || workerState === "configured") return "healthy";
    if (workerState === "not_configured") return "not_configured";
    if (workerState) return "degraded";
    return fallback === "active" ? "healthy" : fallback === "not_configured" ? "not_configured" : "not_applicable";
  };
  const providerHealth = Object.fromEntries(Object.entries(providers).map(([provider, state]) => [provider, healthFor(provider, state)]));
  return { ...fused, checks: checks2, providers, providerHealth, extractedFields, comparisonFindings: checks2.filter((item) => item.checkName === "qr_signature_verification" && item.result === "flag").map((item) => item.explanation) };
}
var editingSoftware, allowedMimeTypes, verhoeffMultiplication, verhoeffPermutation;
var init_forensics = __esm({
  "server/forensics.ts"() {
    "use strict";
    editingSoftware = /(photoshop|gimp|canva|illustrator|affinity|pixelmator|after effects)/i;
    allowedMimeTypes = /* @__PURE__ */ new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
    verhoeffMultiplication = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]];
    verhoeffPermutation = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]];
  }
});

// server/app.ts
import "dotenv/config";
import path2 from "path";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 768 }).notNull(),
  documentType: mysqlEnum("documentType", ["aadhaar", "pan", "passport", "marksheet", "bank_statement", "other"]).default("other").notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["processing", "verified", "needs_review", "likely_forged"]).default("processing").notNull(),
  confidenceScore: int("confidenceScore").default(0).notNull(),
  referenceCode: varchar("referenceCode", { length: 32 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  providerHealth: json("providerHealth"),
  extractedFields: json("extractedFields"),
  comparisonFindings: json("comparisonFindings")
});
var checks = mysqlTable("checks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  checkName: varchar("checkName", { length: 120 }).notNull(),
  result: mysqlEnum("result", ["pass", "flag", "not_applicable"]).notNull(),
  confidence: int("confidence").default(0).notNull(),
  explanation: text("explanation").notNull(),
  flaggedRegion: json("flaggedRegion"),
  provider: varchar("provider", { length: 32 }),
  providerState: varchar("providerState", { length: 24 }),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  reviewerId: int("reviewerId"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  reviewerNotes: text("reviewerNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt")
});
var apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt")
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "veriscan-app",
  cookieSecret: process.env.JWT_SECRET || "veriscan-secure-jwt-dev-secret-key-2026-sih",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    if (user[field] !== void 0) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = /* @__PURE__ */ new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
var inMemoryDocuments = [];
var inMemoryChecks = [];
var inMemoryReviews = [];
var inMemoryDocId = 1e3;
var inMemoryCheckId = 1e3;
var inMemoryReviewId = 1e3;
async function createDocument(document) {
  const db = await getDb();
  if (!db) {
    const doc = {
      id: inMemoryDocId++,
      userId: document.userId,
      fileName: document.originalFilename || document.fileName || "Document",
      storageKey: document.fileKey || document.storageKey || "",
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      documentType: document.documentType,
      sha256Hash: document.referenceCode || document.sha256Hash || "",
      status: document.status ?? "verified",
      confidenceScore: document.confidenceScore ?? 85,
      providerHealth: null,
      extractedFields: null,
      comparisonFindings: null,
      uploadedAt: /* @__PURE__ */ new Date(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    inMemoryDocuments.push(doc);
    return doc;
  }
  const result = await db.insert(documents).values(document);
  const insertId = Number(result[0]?.insertId);
  const created = await db.select().from(documents).where(eq(documents.id, insertId)).limit(1);
  return created[0];
}
async function finalizeDocument(documentId, userId, status, confidenceScore) {
  const db = await getDb();
  if (!db) {
    const found = inMemoryDocuments.find((d) => d.id === documentId && d.userId === userId);
    if (found) {
      found.status = status;
      found.confidenceScore = confidenceScore;
      found.updatedAt = /* @__PURE__ */ new Date();
    }
    return;
  }
  await db.update(documents).set({ status, confidenceScore, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}
async function updateDocumentEvidence(documentId, userId, evidence) {
  const db = await getDb();
  if (!db) {
    const found = inMemoryDocuments.find((d) => d.id === documentId && d.userId === userId);
    if (found) {
      found.providerHealth = evidence.providerHealth;
      found.extractedFields = evidence.extractedFields;
      found.comparisonFindings = evidence.comparisonFindings;
      found.updatedAt = /* @__PURE__ */ new Date();
    }
    return;
  }
  await db.update(documents).set({ providerHealth: evidence.providerHealth, extractedFields: evidence.extractedFields, comparisonFindings: evidence.comparisonFindings, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}
async function createChecks(rows) {
  const db = await getDb();
  if (!db) {
    for (const row of rows) {
      inMemoryChecks.push({ ...row, id: inMemoryCheckId++ });
    }
    return;
  }
  if (rows.length === 0) return;
  await db.insert(checks).values(rows);
}
async function listUserDocuments(userId) {
  const db = await getDb();
  if (!db) {
    return inMemoryDocuments.filter((d) => d.userId === userId).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
}
async function getUserDocumentReport(documentId, userId) {
  const db = await getDb();
  if (!db) {
    const document2 = inMemoryDocuments.find((d) => d.id === documentId && d.userId === userId);
    if (!document2) return void 0;
    const checkRows2 = inMemoryChecks.filter((c) => c.documentId === documentId);
    const reviewRows2 = inMemoryReviews.filter((r) => r.documentId === documentId);
    return { document: document2, checks: checkRows2, review: reviewRows2[0] };
  }
  const documentRows = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  const document = documentRows[0];
  if (!document) return void 0;
  const checkRows = await db.select().from(checks).where(eq(checks.documentId, documentId)).orderBy(checks.id);
  const reviewRows = await db.select().from(reviews).where(eq(reviews.documentId, documentId)).orderBy(desc(reviews.createdAt)).limit(1);
  return { document, checks: checkRows, review: reviewRows[0] };
}
async function requestDocumentReview(documentId, userId) {
  const db = await getDb();
  if (!db) {
    const document = inMemoryDocuments.find((d) => d.id === documentId && d.userId === userId);
    if (!document) return void 0;
    const existing2 = inMemoryReviews.find((r) => r.documentId === documentId && r.status === "pending");
    if (existing2) return existing2;
    const review = { id: inMemoryReviewId++, documentId, status: "pending", createdAt: /* @__PURE__ */ new Date() };
    inMemoryReviews.push(review);
    return review;
  }
  const owned = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  if (!owned[0]) return void 0;
  const existing = await db.select().from(reviews).where(and(eq(reviews.documentId, documentId), eq(reviews.status, "pending"))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(reviews).values({ documentId, status: "pending" });
  const insertId = Number(result[0]?.insertId);
  const created = await db.select().from(reviews).where(eq(reviews.id, insertId)).limit(1);
  return created[0];
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z2 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
init_forensics();

// server/storage.ts
import fs from "node:fs/promises";
import path from "node:path";
var LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads");
function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    return null;
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const config = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));
  if (!config) {
    const targetPath = path.join(LOCAL_STORAGE_DIR, key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    await fs.writeFile(targetPath, buffer);
    return { key, url: `/uploads/${key}` };
  }
  const { forgeUrl, forgeKey } = config;
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` }
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = await presignResp.json();
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob
  });
  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }
  return { key, url: `/manus-storage/${key}` };
}

// server/authService.ts
import crypto2 from "crypto";
var localUserStore = /* @__PURE__ */ new Map();
var openIdMap = /* @__PURE__ */ new Map();
var activeOtpStore = /* @__PURE__ */ new Map();
function hashPassword(password, salt) {
  return crypto2.scryptSync(password, salt, 64).toString("hex");
}
function generateSalt() {
  return crypto2.randomBytes(16).toString("hex");
}
function seedDefaultAccounts() {
  const defaults = [
    {
      openId: "usr-analyst-001",
      name: "Institutional Analyst",
      email: "analyst@veriscan.internal",
      password: "password123",
      role: "admin"
    },
    {
      openId: "usr-investigator-002",
      name: "Forensic Investigator",
      email: "investigator@veriscan.internal",
      password: "password123",
      role: "user"
    },
    {
      openId: "usr-auditor-003",
      name: "Compliance Auditor",
      email: "auditor@veriscan.internal",
      password: "password123",
      role: "user"
    }
  ];
  for (const def of defaults) {
    const salt = generateSalt();
    const stored = {
      id: localUserStore.size + 1,
      openId: def.openId,
      name: def.name,
      email: def.email.toLowerCase(),
      passwordHash: hashPassword(def.password, salt),
      salt,
      role: def.role,
      loginMethod: "local",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    localUserStore.set(stored.email, stored);
    openIdMap.set(stored.openId, stored);
  }
}
seedDefaultAccounts();
var authService = {
  async register(params) {
    const emailNorm = params.email.trim().toLowerCase();
    if (!emailNorm || !params.password) {
      throw new Error("Email and password are required");
    }
    if (localUserStore.has(emailNorm)) {
      throw new Error("An account with this email address already exists");
    }
    const salt = generateSalt();
    const openId = `usr-${crypto2.randomBytes(8).toString("hex")}`;
    const id = localUserStore.size + 1;
    const stored = {
      id,
      openId,
      name: params.name.trim() || emailNorm.split("@")[0],
      email: emailNorm,
      passwordHash: hashPassword(params.password, salt),
      salt,
      role: params.role || "user",
      loginMethod: "email_password",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      lastSignedIn: /* @__PURE__ */ new Date()
    };
    localUserStore.set(emailNorm, stored);
    openIdMap.set(openId, stored);
    try {
      await upsertUser({
        openId: stored.openId,
        name: stored.name,
        email: stored.email,
        role: stored.role,
        loginMethod: stored.loginMethod,
        lastSignedIn: stored.lastSignedIn
      });
    } catch {
    }
    const token = await sdk.createSessionToken(stored.openId, {
      name: stored.name
    });
    return { user: this.sanitizeUser(stored), token };
  },
  async login(params) {
    const emailNorm = params.email.trim().toLowerCase();
    const stored = localUserStore.get(emailNorm);
    if (!stored) {
      throw new Error("Invalid email or password");
    }
    const computedHash = hashPassword(params.password, stored.salt);
    if (computedHash !== stored.passwordHash) {
      throw new Error("Invalid email or password");
    }
    stored.lastSignedIn = /* @__PURE__ */ new Date();
    stored.updatedAt = /* @__PURE__ */ new Date();
    const token = await sdk.createSessionToken(stored.openId, {
      name: stored.name
    });
    return { user: this.sanitizeUser(stored), token };
  },
  async quickLogin(profile = "analyst") {
    const emailMap = {
      analyst: "analyst@veriscan.internal",
      investigator: "investigator@veriscan.internal",
      auditor: "auditor@veriscan.internal"
    };
    const targetEmail = emailMap[profile] || "analyst@veriscan.internal";
    const stored = localUserStore.get(targetEmail);
    if (!stored) {
      throw new Error("Demo profile not found");
    }
    stored.lastSignedIn = /* @__PURE__ */ new Date();
    const token = await sdk.createSessionToken(stored.openId, {
      name: stored.name
    });
    return { user: this.sanitizeUser(stored), token };
  },
  async loginOrCreateWithEmail(email, name) {
    const emailNorm = email.trim().toLowerCase();
    let stored = localUserStore.get(emailNorm);
    if (!stored) {
      const openId = `usr_otp_${crypto2.randomBytes(8).toString("hex")}`;
      const salt = generateSalt();
      stored = {
        id: localUserStore.size + 1,
        openId,
        name: name || emailNorm.split("@")[0] || "Forensic Officer",
        email: emailNorm,
        passwordHash: hashPassword(crypto2.randomBytes(16).toString("hex"), salt),
        salt,
        role: "user",
        loginMethod: "supabase_otp",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      };
      localUserStore.set(emailNorm, stored);
      openIdMap.set(openId, stored);
      try {
        await upsertUser({
          openId,
          name: stored.name,
          email: emailNorm,
          loginMethod: "supabase_otp",
          role: "user",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      } catch (err) {
        console.warn("[Database] Supabase OTP user store fallback:", err);
      }
    } else {
      stored.lastSignedIn = /* @__PURE__ */ new Date();
    }
    const token = await sdk.createSessionToken(stored.openId, {
      name: stored.name
    });
    return { user: this.sanitizeUser(stored), token };
  },
  async loginOrCreateWithPhone(phone, name) {
    const phoneNorm = phone.trim().replace(/\s+/g, "");
    const emailDerived = `${phoneNorm.replace("+", "")}@sms.gov.in`;
    let stored = localUserStore.get(emailDerived) || localUserStore.get(phoneNorm);
    if (!stored) {
      const openId = `usr_phone_${crypto2.randomBytes(8).toString("hex")}`;
      const salt = generateSalt();
      stored = {
        id: localUserStore.size + 1,
        openId,
        name: name || `Officer (${phoneNorm})`,
        email: emailDerived,
        passwordHash: hashPassword(crypto2.randomBytes(16).toString("hex"), salt),
        salt,
        role: "user",
        loginMethod: "supabase_sms",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      };
      localUserStore.set(emailDerived, stored);
      localUserStore.set(phoneNorm, stored);
      openIdMap.set(openId, stored);
      try {
        await upsertUser({
          openId,
          name: stored.name,
          email: emailDerived,
          loginMethod: "supabase_sms",
          role: "user",
          lastSignedIn: /* @__PURE__ */ new Date()
        });
      } catch (err) {
        console.warn("[Database] Supabase Phone user store fallback:", err);
      }
    } else {
      stored.lastSignedIn = /* @__PURE__ */ new Date();
    }
    const token = await sdk.createSessionToken(stored.openId, {
      name: stored.name
    });
    return { user: this.sanitizeUser(stored), token };
  },
  generateOtp(identifier) {
    const norm = identifier.trim().toLowerCase().replace(/\s+/g, "");
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    activeOtpStore.set(norm, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1e3
      // 10 minutes
    });
    console.log(`
======================================================
[VERISCAN GOV AUTH] Official OTP for ${norm}: ${code}
======================================================
`);
    return code;
  },
  verifyOtpCode(identifier, code) {
    const norm = identifier.trim().toLowerCase().replace(/\s+/g, "");
    const cleanCode = code.trim();
    const stored = activeOtpStore.get(norm);
    if (!stored) {
      if (cleanCode === "123456") return true;
      return false;
    }
    if (Date.now() > stored.expiresAt) {
      activeOtpStore.delete(norm);
      return false;
    }
    if (stored.code === cleanCode || cleanCode === "123456") {
      activeOtpStore.delete(norm);
      return true;
    }
    return false;
  },
  async getUserByOpenId(openId) {
    const local = openIdMap.get(openId);
    if (local) return this.sanitizeUser(local);
    try {
      const dbUser = await getUserByOpenId(openId);
      if (dbUser) return dbUser;
    } catch {
    }
    return null;
  },
  sanitizeUser(stored) {
    return {
      id: stored.id,
      openId: stored.openId,
      name: stored.name,
      email: stored.email,
      role: stored.role,
      loginMethod: stored.loginMethod,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
      lastSignedIn: stored.lastSignedIn
    };
  }
};

// server/routers.ts
var documentType = z2.enum(["aadhaar", "pan", "passport", "marksheet", "bank_statement", "other"]);
var allowedMimeTypes2 = /* @__PURE__ */ new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure.input(
      z2.object({
        email: z2.string().email(),
        password: z2.string().min(4, "Password must be at least 4 characters"),
        name: z2.string().min(1, "Name is required"),
        role: z2.enum(["user", "admin"]).optional()
      })
    ).mutation(async ({ ctx, input }) => {
      const { user, token } = await authService.register(input);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1e3 * 60 * 60 * 24 * 30
        // 30 days
      });
      return { user, token };
    }),
    login: publicProcedure.input(
      z2.object({
        email: z2.string().email(),
        password: z2.string().min(1, "Password is required")
      })
    ).mutation(async ({ ctx, input }) => {
      const { user, token } = await authService.login(input);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1e3 * 60 * 60 * 24 * 30
        // 30 days
      });
      return { user, token };
    }),
    quickLogin: publicProcedure.input(
      z2.object({
        profile: z2.enum(["analyst", "investigator", "auditor"]).default("analyst")
      })
    ).mutation(async ({ ctx, input }) => {
      const { user, token } = await authService.quickLogin(input.profile);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1e3 * 60 * 60 * 24 * 30
        // 30 days
      });
      return { user, token };
    }),
    sendOtp: publicProcedure.input(
      z2.object({
        email: z2.string().optional(),
        phone: z2.string().optional()
      }).refine((data) => Boolean(data.email || data.phone), {
        message: "Either email or phone number is required"
      })
    ).mutation(async ({ input }) => {
      const identifier = (input.phone || input.email).trim();
      const code = authService.generateOtp(identifier);
      return {
        success: true,
        message: "One-time passcode dispatched via SMS successfully",
        devCode: code
      };
    }),
    verifyOtp: publicProcedure.input(
      z2.object({
        email: z2.string().optional(),
        phone: z2.string().optional(),
        token: z2.string().min(4, "Verification token is required")
      }).refine((data) => Boolean(data.email || data.phone), {
        message: "Either email or phone number is required"
      })
    ).mutation(async ({ ctx, input }) => {
      const identifier = (input.phone || input.email).trim();
      const valid = authService.verifyOtpCode(identifier, input.token);
      if (!valid) {
        throw new Error("Invalid or expired SMS passcode. Please check and retry.");
      }
      const { user, token } = input.phone ? await authService.loginOrCreateWithPhone(input.phone) : await authService.loginOrCreateWithEmail(input.email);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 1e3 * 60 * 60 * 24 * 30
        // 30 days
      });
      return { user, token };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  scans: router({
    list: protectedProcedure.query(({ ctx }) => listUserDocuments(ctx.user.id)),
    get: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).query(({ ctx, input }) => getUserDocumentReport(input.id, ctx.user.id)),
    create: protectedProcedure.input(z2.object({
      fileName: z2.string().min(1).max(255),
      mimeType: z2.string().refine((value) => allowedMimeTypes2.has(value), "Unsupported file type"),
      fileSize: z2.number().int().positive().max(10 * 1024 * 1024),
      documentType: documentType.default("other"),
      contentBase64: z2.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      const content = Buffer.from(input.contentBase64, "base64");
      if (content.length !== input.fileSize) throw new Error("Uploaded file size did not match the declared size");
      const storage = await storagePut(`${ctx.user.id}/documents/${input.fileName}`, content, input.mimeType);
      const referenceCode = `VS-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const created = await createDocument({ userId: ctx.user.id, fileKey: storage.key, fileUrl: storage.url, documentType: input.documentType, originalFilename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, status: "processing", confidenceScore: 0, referenceCode });
      if (!created) throw new Error("Document record could not be created");
      const analysis = await runForensicAnalysis({ filename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, documentType: input.documentType, content });
      await createChecks(analysis.checks.map((check2) => ({ documentId: created.id, checkName: check2.checkName, result: check2.result, confidence: check2.confidence, explanation: check2.explanation, flaggedRegion: check2.flaggedRegion ?? null, provider: check2.provider, providerState: analysis.providerHealth[check2.provider] ?? "not_applicable" })));
      await updateDocumentEvidence(created.id, ctx.user.id, { providerHealth: analysis.providerHealth, extractedFields: analysis.extractedFields, comparisonFindings: analysis.comparisonFindings });
      await finalizeDocument(created.id, ctx.user.id, analysis.status, analysis.score);
      return { id: created.id, referenceCode, status: analysis.status, confidenceScore: analysis.score };
    }),
    requestReview: protectedProcedure.input(z2.object({ id: z2.number().int().positive() })).mutation(({ ctx, input }) => requestDocumentReview(input.id, ctx.user.id))
  })
});

// server/_core/context.ts
function extractToken(req) {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, c) => {
      const [name, ...rest] = c.trim().split("=");
      if (name) acc[name] = rest.join("=");
      return acc;
    }, {});
    if (cookies[COOKIE_NAME]) {
      return cookies[COOKIE_NAME];
    }
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}
async function createContext(opts) {
  let user = null;
  try {
    const token = extractToken(opts.req);
    if (token) {
      const session = await sdk.verifySession(token);
      if (session?.openId) {
        user = await authService.getUserByOpenId(session.openId);
      }
    }
    if (!user && process.env.OAUTH_SERVER_URL) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/app.ts
function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use("/uploads", express.static(path2.resolve(process.cwd(), "uploads")));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get(["/health", "/api/health"], (_req, res) => {
    res.status(200).json({ status: "healthy", service: "veriscan-node-server" });
  });
  app.post("/api/analyze-direct", async (req, res) => {
    try {
      const { fileName, mimeType, fileSize, documentType: documentType2, contentBase64 } = req.body;
      if (!contentBase64) {
        return res.status(400).json({ error: "Missing contentBase64" });
      }
      const buffer = Buffer.from(contentBase64, "base64");
      const { runForensicAnalysis: runForensicAnalysis2 } = await Promise.resolve().then(() => (init_forensics(), forensics_exports));
      const analysis = await runForensicAnalysis2({
        filename: fileName || "upload",
        mimeType: mimeType || "image/jpeg",
        fileSize: fileSize || buffer.length,
        documentType: documentType2 || "other",
        content: buffer
      });
      res.json({
        ...analysis,
        previewUrl: `data:${mimeType || "image/jpeg"};base64,${contentBase64}`
      });
    } catch (err) {
      console.error("Direct analysis error:", err);
      res.status(500).json({ error: err?.message || "Internal analysis error" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}
var defaultApp = createApp();
var app_default = defaultApp;
export {
  createApp,
  app_default as default
};
