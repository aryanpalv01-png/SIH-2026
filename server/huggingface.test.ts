import { describe, expect, it } from "vitest";

describe("Hugging Face integration", () => {
  it("authenticates the configured inference token", async () => {
    const token = process.env.HF_API_TOKEN;
    expect(token, "HF_API_TOKEN must be configured").toBeTruthy();

    const response = await fetch("https://huggingface.co/api/whoami-v2", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.ok).toBe(true);
  }, 15_000);
});
