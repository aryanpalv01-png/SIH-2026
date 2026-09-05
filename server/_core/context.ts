import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import { authService } from "../authService";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function extractToken(req: CreateExpressContextOptions["req"]): string | null {
  // 1. Try Cookie header
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(";").reduce((acc, c) => {
      const [name, ...rest] = c.trim().split("=");
      if (name) acc[name] = rest.join("=");
      return acc;
    }, {} as Record<string, string>);

    if (cookies[COOKIE_NAME]) {
      return cookies[COOKIE_NAME];
    }
  }

  // 2. Try Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = extractToken(opts.req);
    if (token) {
      const session = await sdk.verifySession(token);
      if (session?.openId) {
        user = await authService.getUserByOpenId(session.openId);
      }
    }

    // Fallback to OAuth if external server is configured and local session wasn't found
    if (!user && process.env.OAUTH_SERVER_URL) {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
