import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // In local/demo mode when external OAuth is unconfigured, provide default analyst user
  if (!user && (!process.env.OAUTH_SERVER_URL || process.env.NODE_ENV === "development")) {
    user = {
      id: 1,
      openId: "demo-analyst-001",
      name: "Institutional Analyst",
      email: "analyst@veriscan.internal",
      loginMethod: "demo",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
