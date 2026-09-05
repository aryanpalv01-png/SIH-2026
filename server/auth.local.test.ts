import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type SetCookieCall = {
  name: string;
  val: string;
  options: Record<string, unknown>;
};

function createMockContext(): { ctx: TrpcContext; setCookies: SetCookieCall[] } {
  const setCookies: SetCookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        setCookies.push({ name, val, options });
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.local (Register, Login, QuickLogin)", () => {
  it("allows quick login as analyst and sets the session cookie", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.quickLogin({ profile: "analyst" });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("analyst@veriscan.internal");
    expect(result.user.role).toBe("admin");
    expect(result.token).toBeDefined();
    expect(setCookies.length).toBeGreaterThanOrEqual(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("allows quick login as investigator", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.quickLogin({ profile: "investigator" });

    expect(result.user.email).toBe("investigator@veriscan.internal");
    expect(result.user.name).toBe("Forensic Investigator");
  });

  it("registers a new user and logs in with matching credentials", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    // 1. Register
    const regResult = await caller.auth.register({
      email: uniqueEmail,
      password: "secretPassword123",
      name: "New Analyst",
    });

    expect(regResult.user.email).toBe(uniqueEmail);
    expect(regResult.user.name).toBe("New Analyst");
    expect(setCookies).toHaveLength(1);

    // 2. Login
    const loginResult = await caller.auth.login({
      email: uniqueEmail,
      password: "secretPassword123",
    });

    expect(loginResult.user.email).toBe(uniqueEmail);
    expect(loginResult.token).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: "analyst@veriscan.internal",
        password: "wrongPassword",
      })
    ).rejects.toThrow("Invalid email or password");
  });
});
