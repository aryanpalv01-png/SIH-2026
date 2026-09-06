import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createApp } from "./app";
import { setupVite } from "./_core/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Resolves static directory for Vite production build output.
 * Checks both path.join(__dirname, "public") and path.join(__dirname, "../public")
 * depending on how esbuild bundles dist/index.js, with cwd fallbacks.
 */
export function getStaticPath(): string {
  const candidates = [
    path.join(__dirname, "public"),
    path.join(__dirname, "../public"),
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  // Default fallback
  return fs.existsSync(path.join(__dirname, "public"))
    ? path.join(__dirname, "public")
    : path.join(__dirname, "../public");
}

async function startServer() {
  const app = createApp();
  const server = createServer(app);

  // Static files and client-side routing
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    const staticPath = getStaticPath();
    const indexPath = path.join(staticPath, "index.html");

    // 1. Serve static files from Vite build output folder (dist/public)
    app.use(express.static(staticPath));

    // 2. Catch-all route to return index.html for client-side routing
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      }

      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Frontend build not found. Please build the client first.");
      }
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);

export { startServer };
