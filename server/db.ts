import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { checks, documents, InsertDocument, InsertUser, reviews, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(documents).values(document);
  const insertId = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  const created = await db.select().from(documents).where(eq(documents.id, insertId)).limit(1);
  return created[0];
}

export async function finalizeDocument(documentId: number, userId: number, status: "verified" | "needs_review" | "likely_forged", confidenceScore: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(documents).set({ status, confidenceScore, updatedAt: new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}

export async function updateDocumentEvidence(documentId: number, userId: number, evidence: { providerHealth: unknown; extractedFields: unknown; comparisonFindings: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(documents).set({ providerHealth: evidence.providerHealth, extractedFields: evidence.extractedFields, comparisonFindings: evidence.comparisonFindings, updatedAt: new Date() }).where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
}

export async function applyWebhookAnalysis(documentId: number, result: {
  status: "verified" | "needs_review" | "likely_forged";
  confidenceScore: number;
  checks?: Array<{
    checkName: string;
    result: "pass" | "flag" | "not_applicable";
    confidence: number;
    explanation: string;
    flaggedRegion?: unknown;
    provider?: string;
    providerState?: string;
  }>;
  providerHealth?: unknown;
  extractedFields?: unknown;
  comparisonFindings?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(documents).set({
    status: result.status,
    confidenceScore: result.confidenceScore,
    ...(result.providerHealth !== undefined ? { providerHealth: result.providerHealth } : {}),
    ...(result.extractedFields !== undefined ? { extractedFields: result.extractedFields } : {}),
    ...(result.comparisonFindings !== undefined ? { comparisonFindings: result.comparisonFindings } : {}),
    updatedAt: new Date(),
  }).where(eq(documents.id, documentId));
  if (result.checks?.length) {
    await createChecks(result.checks.map((check) => ({
      documentId,
      checkName: check.checkName,
      result: check.result,
      confidence: check.confidence,
      explanation: check.explanation,
      flaggedRegion: check.flaggedRegion ?? null,
      provider: check.provider ?? "n8n",
      providerState: check.providerState ?? "active",
    })));
  }
}

export async function createChecks(rows: Array<typeof checks.$inferInsert>) {
  const db = await getDb();
  if (!db || rows.length === 0) return;
  await db.insert(checks).values(rows);
}

export async function listUserDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.uploadedAt));
}

export async function getUserDocumentReport(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const documentRows = await db.select().from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  const document = documentRows[0];
  if (!document) return undefined;
  const checkRows = await db.select().from(checks).where(eq(checks.documentId, documentId)).orderBy(checks.id);
  const reviewRows = await db.select().from(reviews).where(eq(reviews.documentId, documentId)).orderBy(desc(reviews.createdAt)).limit(1);
  return { document, checks: checkRows, review: reviewRows[0] };
}

export async function requestDocumentReview(documentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const owned = await db.select({ id: documents.id }).from(documents).where(and(eq(documents.id, documentId), eq(documents.userId, userId))).limit(1);
  if (!owned[0]) return undefined;
  const existing = await db.select().from(reviews).where(and(eq(reviews.documentId, documentId), eq(reviews.status, "pending"))).limit(1);
  if (existing[0]) return existing[0];
  const result = await db.insert(reviews).values({ documentId, status: "pending" });
  const insertId = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  const created = await db.select().from(reviews).where(eq(reviews.id, insertId)).limit(1);
  return created[0];
}
