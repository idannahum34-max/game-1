import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Determine static directory
  // Vite builds to dist/ in the project root
  const staticDir = path.resolve(__dirname, "..", "dist");

  // Verify dist directory exists
  if (!fs.existsSync(staticDir)) {
    console.error(`[ERROR] Static directory not found: ${staticDir}`);
    console.error("[ERROR] Make sure to run 'pnpm run build' before starting the server");
    process.exit(1);
  }

  // Verify index.html exists
  const indexPath = path.join(staticDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    console.error(`[ERROR] index.html not found at: ${indexPath}`);
    console.error("[ERROR] Build output is incomplete");
    process.exit(1);
  }

  console.log(`[Server] Serving static files from: ${staticDir}`);
  console.log(`[Server] index.html found: ${indexPath}`);

  // Serve static files with caching headers
  app.use(express.static(staticDir, {
    maxAge: "1d", // Cache static assets for 1 day
    etag: false,
  }));

  // Health check endpoint
  app.get("/_health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Handle client-side routing - serve index.html for all non-static routes
  app.get("*", (_req, res) => {
    res.sendFile(indexPath);
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`[Server] ✓ Running on http://localhost:${port}/`);
    console.log(`[Server] ✓ Health check: http://localhost:${port}/_health`);
  });
}

startServer().catch((error) => {
  console.error("[ERROR] Failed to start server:", error);
  process.exit(1);
});
