import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { runForensicAnalysis } from "./forensics";
import { createChecks, createDocument, finalizeDocument, getUserDocumentReport, listUserDocuments, requestDocumentReview, updateDocumentEvidence } from "./db";
import { storagePut } from "./storage";

const documentType = z.enum(["aadhaar", "pan", "passport", "marksheet", "bank_statement", "other"]);
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  scans: router({
    list: protectedProcedure.query(({ ctx }) => listUserDocuments(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => getUserDocumentReport(input.id, ctx.user.id)),
    create: protectedProcedure.input(z.object({
      fileName: z.string().min(1).max(255),
      mimeType: z.string().refine((value) => allowedMimeTypes.has(value), "Unsupported file type"),
      fileSize: z.number().int().positive().max(10 * 1024 * 1024),
      documentType: documentType.default("other"),
      contentBase64: z.string().min(1),
    })).mutation(async ({ ctx, input }) => {
      const content = Buffer.from(input.contentBase64, "base64");
      if (content.length !== input.fileSize) throw new Error("Uploaded file size did not match the declared size");
      const storage = await storagePut(`${ctx.user.id}/documents/${input.fileName}`, content, input.mimeType);
      const referenceCode = `VS-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const created = await createDocument({ userId: ctx.user.id, fileKey: storage.key, fileUrl: storage.url, documentType: input.documentType, originalFilename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, status: "processing", confidenceScore: 0, referenceCode });
      if (!created) throw new Error("Document record could not be created");
      const analysis = await runForensicAnalysis({ filename: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize, documentType: input.documentType, content });
      await createChecks(analysis.checks.map((check) => ({ documentId: created.id, checkName: check.checkName, result: check.result, confidence: check.confidence, explanation: check.explanation, flaggedRegion: check.flaggedRegion ?? null, provider: check.provider, providerState: analysis.providerHealth[check.provider] ?? "not_applicable" })));
      await updateDocumentEvidence(created.id, ctx.user.id, { providerHealth: analysis.providerHealth, extractedFields: analysis.extractedFields, comparisonFindings: analysis.comparisonFindings });
      await finalizeDocument(created.id, ctx.user.id, analysis.status, analysis.score);
      return { id: created.id, referenceCode, status: analysis.status, confidenceScore: analysis.score };
    }),
    requestReview: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => requestDocumentReview(input.id, ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
