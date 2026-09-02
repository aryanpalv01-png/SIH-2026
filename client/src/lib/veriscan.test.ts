import { describe, expect, it } from "vitest";
import { getProviderDisplayName, getProviderStatusLabel, serverDocumentToVerification } from "./veriscan";

describe("provider health display mapping", () => {
  it("maps persisted health states to user-facing labels", () => {
    expect(getProviderStatusLabel("healthy", "Local only")).toBe("Active");
    expect(getProviderStatusLabel("degraded", "Self-hosted")).toBe("Degraded");
    expect(getProviderStatusLabel("not_configured", "Self-hosted")).toBe("Not configured");
    expect(getProviderStatusLabel(undefined, "Local only")).toBe("Local only");
  });

  it("normalizes persisted provider health for report surfaces", () => {
    const report = serverDocumentToVerification({ id: 7, originalFilename: "aadhaar.png", documentType: "aadhaar", mimeType: "image/png", fileSize: 2048, uploadedAt: new Date("2026-08-30T00:00:00Z"), status: "verified", confidenceScore: 92, referenceCode: "VS-TEST", providerHealth: { ocr: "healthy", trufor: "not_configured" }, extractedFields: { name: "Test" }, comparisonFindings: ["Example"] }, []);
    expect(report.providerHealth?.ocr).toBe("healthy");
    expect(report.providerHealth?.trufor).toBe("not_configured");
    expect(report.extractedFields?.name).toBe("Test");
    expect(report.comparisonFindings).toEqual(["Example"]);
  });

  it("keeps provider names readable", () => {
    expect(getProviderDisplayName("huggingface")).toBe("Hugging Face");
    expect(getProviderDisplayName("trufor")).toBe("TruFor");
    expect(getProviderDisplayName("unknown_worker")).toBe("unknown_worker");
  });
});
