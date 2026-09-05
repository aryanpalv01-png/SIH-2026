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

  it("correctly resolves previewUrl from fileUrl", () => {
    const report = serverDocumentToVerification({
      id: 8,
      originalFilename: "aadhaar_card.jpg",
      documentType: "aadhaar",
      mimeType: "image/jpeg",
      fileSize: 4096,
      uploadedAt: new Date("2026-09-01T00:00:00Z"),
      status: "verified",
      confidenceScore: 95,
      referenceCode: "VS-URL-TEST",
      fileUrl: "https://supabase.co/storage/v1/object/public/documents/aadhaar.jpg",
    }, []);
    expect(report.previewUrl).toBe("https://supabase.co/storage/v1/object/public/documents/aadhaar.jpg");
  });
});
