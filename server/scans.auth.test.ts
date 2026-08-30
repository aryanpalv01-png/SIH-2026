import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("protected scan procedures", () => {
  it("reject unauthenticated history access", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.scans.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reject unauthenticated report access", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.scans.get({ id: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
