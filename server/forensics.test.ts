import { describe, expect, it, vi } from "vitest";
import { analyzeCompressionAndEla, detectCopyMoveAndScreenshot, fuseForensicChecks, inspectMetadata, probeConfiguredServiceHealth, runForensicAnalysis, validateDocumentIdentifier, verifyQrOrBarcode } from "./forensics";

describe("forensic module contracts", () => {
  it("flags editing traces in the metadata preflight", async () => {
    const result = await inspectMetadata({ filename: "passport.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "passport", content: Buffer.from("/Producer (Photoshop)") });
    expect(result.result).toBe("flag");
    expect(result.provider).toBe("local");
  });

  it("keeps checksum validation scoped when OCR text is unavailable", () => {
    const result = validateDocumentIdentifier({ filename: "marksheet_2026.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "marksheet" });
    expect(result.result).toBe("not_applicable");
    expect(result.explanation).toContain("OCR");
  });

  it("does not pretend QR signatures are verified without a decodable image", async () => {
    const original = process.env.UIDAI_QR_VERIFY_URL;
    delete process.env.UIDAI_QR_VERIFY_URL;
    const result = await verifyQrOrBarcode({ filename: "aadhaar.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "aadhaar" });
    if (original) process.env.UIDAI_QR_VERIFY_URL = original;
    expect(result.result).toBe("not_applicable");
    expect(result.explanation).toContain("decodable JPEG or PNG");
  });

  it("keeps image-only modules honest for PDFs", () => {
    const input = { filename: "statement.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "bank_statement" as const };
    expect(analyzeCompressionAndEla(input).result).toBe("not_applicable");
    expect(detectCopyMoveAndScreenshot(input).every((item) => item.result === "not_applicable")).toBe(true);
  });

  it("caps hard checksum failures below the likely-forged threshold (score < 35)", () => {
    const result = fuseForensicChecks([
      { checkName: "checksum_identifier_validation", result: "flag", confidence: 5, explanation: "Invalid identifier", provider: "local", available: true },
      { checkName: "compression_analysis", result: "pass", confidence: 98, explanation: "Consistent", provider: "local", available: true },
    ]);
    expect(result.score).toBeLessThan(35);
    expect(result.status).toBe("likely_forged");
  });

  it("caps high-confidence clone-detection failures below 35 via Tier A Hard Override", () => {
    const result = fuseForensicChecks([
      { checkName: "copy_move_clone_detection", result: "flag", confidence: 20, explanation: "Duplicated seal found", provider: "local", available: true, flaggedRegion: { x: 10, y: 10, width: 20, height: 20 } },
      { checkName: "metadata_exif_inspection", result: "pass", confidence: 95, explanation: "Clean EXIF", provider: "local", available: true },
    ]);
    expect(result.score).toBeLessThan(35);
    expect(result.status).toBe("likely_forged");
  });

  it("normalizes TruFor and CAT-Net self-hosted health states", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: url.includes("healthy"), status: url.includes("degraded") ? 503 : 200 })));
    expect(await probeConfiguredServiceHealth("https://healthy.example/analyze-tampering")).toBe("healthy");
    expect(await probeConfiguredServiceHealth("https://degraded.example/analyze-tampering")).toBe("degraded");
    expect(await probeConfiguredServiceHealth("https://healthy.example/analyze-catnet")).toBe("healthy");
    expect(await probeConfiguredServiceHealth("https://degraded.example/analyze-catnet")).toBe("degraded");
    expect(await probeConfiguredServiceHealth(undefined)).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it("propagates direct TruFor and CAT-Net health into analysis providerHealth", async () => {
    const originalTruFor = process.env.TRUFOR_API_URL;
    const originalCatNet = process.env.CATNET_API_URL;
    const originalHf = process.env.HF_API_TOKEN;
    const originalWorker = process.env.FORENSIC_WORKER_URL;
    process.env.TRUFOR_API_URL = "https://trufor.example/analyze-tampering";
    process.env.CATNET_API_URL = "https://catnet.example/analyze-catnet";
    delete process.env.HF_API_TOKEN;
    delete process.env.FORENSIC_WORKER_URL;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => ({}) })));
    const result = await runForensicAnalysis({ filename: "scan.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "other" });
    expect(result.providerHealth.trufor).toBe("healthy");
    expect(result.providerHealth.catnet).toBe("healthy");
    if (originalTruFor) process.env.TRUFOR_API_URL = originalTruFor; else delete process.env.TRUFOR_API_URL;
    if (originalCatNet) process.env.CATNET_API_URL = originalCatNet; else delete process.env.CATNET_API_URL;
    if (originalHf) process.env.HF_API_TOKEN = originalHf; else delete process.env.HF_API_TOKEN;
    if (originalWorker) process.env.FORENSIC_WORKER_URL = originalWorker; else delete process.env.FORENSIC_WORKER_URL;
    vi.unstubAllGlobals();
  });

  it("marks non-Aadhaar QR verification as not applicable", async () => {
    const result = await verifyQrOrBarcode({ filename: "passport.png", mimeType: "image/png", fileSize: 1200, documentType: "passport", content: Buffer.alloc(4) });
    expect(result.result).toBe("not_applicable");
    expect(result.explanation).toContain("Aadhaar");
  });

  it("returns explicit provider fallbacks rather than guessed model scores", async () => {
    const result = await runForensicAnalysis({ filename: "scan.pdf", mimeType: "application/pdf", fileSize: 1200, documentType: "other" });
    expect(result.checks.some((check) => check.checkName === "trufor_inference" && check.result === "not_applicable")).toBe(true);
    expect(result.checks.some((check) => check.checkName === "catnet_inference" && check.result === "not_applicable")).toBe(true);
    expect(result.providers.trufor).toBe("not_configured");
    expect(result.providerHealth.ocr).toBe("not_configured");
  });
});
