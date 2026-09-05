import "dotenv/config";
import path from "path";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Direct document analysis endpoint
  app.post("/api/analyze-direct", async (req, res) => {
    try {
      const { fileName, mimeType, fileSize, documentType, contentBase64 } = req.body;
      if (!contentBase64) {
        return res.status(400).json({ error: "Missing contentBase64" });
      }
      const buffer = Buffer.from(contentBase64, "base64");
      const { runForensicAnalysis } = await import("../forensics");
      const analysis = await runForensicAnalysis({
        filename: fileName || "upload",
        mimeType: mimeType || "image/jpeg",
        fileSize: fileSize || buffer.length,
        documentType: documentType || "other",
        content: buffer,
      });
      res.json({
        ...analysis,
        previewUrl: `data:${mimeType || "image/jpeg"};base64,${contentBase64}`,
      });
    } catch (err: any) {
      console.error("Direct analysis error:", err);
      res.status(500).json({ error: err?.message || "Internal analysis error" });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
