import { describe, expect, it, vi } from "vitest";
import { detectAiGeneratedImage, isHuggingFaceConfigured } from "./services/aiDetector";

describe("Hugging Face integration & AI Detector Service", () => {
  it("authenticates the configured inference token or reports unconfigured", async () => {
    const token = process.env.HF_API_TOKEN;
    if (token) {
      const response = await fetch("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(response.ok).toBe(true);
    } else {
      expect(token).toBeUndefined();
    }
  }, 15_000);

  it("detects configuration status via isHuggingFaceConfigured", () => {
    const orig = process.env.HF_API_TOKEN;
    try {
      process.env.HF_API_TOKEN = "hf_test_token_sample";
      expect(isHuggingFaceConfigured()).toBe(true);
      delete process.env.HF_API_TOKEN;
      expect(isHuggingFaceConfigured()).toBe(false);
    } finally {
      if (orig) process.env.HF_API_TOKEN = orig;
      else delete process.env.HF_API_TOKEN;
    }
  });

  it("ensures authorization header format is strictly `Authorization: Bearer ${process.env.HF_API_TOKEN}`", async () => {
    const orig = process.env.HF_API_TOKEN;
    process.env.HF_API_TOKEN = "hf_dummy_test_token_12345";

    let capturedAuthHeader = "";
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation((url, init) => {
      capturedAuthHeader = (init?.headers as Record<string, string>)?.Authorization || "";
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [{ label: "human", score: 0.95 }],
      });
    });

    try {
      const result = await detectAiGeneratedImage({
        filename: "test.jpg",
        mimeType: "image/jpeg",
        fileSize: 100,
        documentType: "pan",
        content: Buffer.from("fake_jpeg_content"),
      });

      expect(capturedAuthHeader).toBe(`Bearer ${process.env.HF_API_TOKEN}`);
      expect(result.checkName).toBe("ai_generated_image_detector");
      expect(result.provider).toBe("huggingface");
    } finally {
      global.fetch = originalFetch;
      if (orig) process.env.HF_API_TOKEN = orig;
      else delete process.env.HF_API_TOKEN;
    }
  });

  it("returns not_applicable with confidence 0 when unconfigured", async () => {
    const orig = process.env.HF_API_TOKEN;
    delete process.env.HF_API_TOKEN;

    try {
      const result = await detectAiGeneratedImage({
        filename: "test.jpg",
        mimeType: "image/jpeg",
        fileSize: 100,
        documentType: "pan",
        content: Buffer.from("fake_jpeg_content"),
      });

      expect(result.result).toBe("not_applicable");
      expect(result.confidence).toBe(0);
      expect(result.available).toBe(false);
    } finally {
      if (orig) process.env.HF_API_TOKEN = orig;
      else delete process.env.HF_API_TOKEN;
    }
  });
});

