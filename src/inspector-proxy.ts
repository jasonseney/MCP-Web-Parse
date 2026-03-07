#!/usr/bin/env node

import http from "node:http";
import httpProxy from "http-proxy";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const CLIENT_PORT = 5000;
const SERVER_PORT = 6277;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inspectorPath = path.resolve(
  __dirname,
  "..",
  "node_modules",
  "@modelcontextprotocol",
  "inspector",
);

const inspectorServer = spawn(
  "node",
  [
    path.join(inspectorPath, "server", "build", "index.js"),
    "--env",
    "node",
    "--args",
    "dist/index.js",
  ],
  {
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      CLIENT_PORT: String(CLIENT_PORT),
      DANGEROUSLY_OMIT_AUTH: "true",
      MCP_ENV_VARS: JSON.stringify({
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
      }),
    },
    stdio: ["pipe", "pipe", "pipe"],
  },
);

inspectorServer.stdout?.on("data", (data: Buffer) => {
  process.stdout.write(`[inspector-server] ${data}`);
});
inspectorServer.stderr?.on("data", (data: Buffer) => {
  process.stderr.write(`[inspector-server] ${data}`);
});

const clientDistDir = path.join(inspectorPath, "client", "dist");

const proxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${SERVER_PORT}`,
  ws: true,
});

proxy.on("error", (err, _req, res) => {
  console.error("[proxy] Error:", err.message);
  if (res && "writeHead" in res) {
    (res as http.ServerResponse).writeHead(502, {
      "Content-Type": "text/plain",
    });
    (res as http.ServerResponse).end("Proxy error: " + err.message);
  }
});

const PROXY_PATHS = ["/sse", "/message", "/mcp", "/oauth", "/config", "/stdio", "/health"];

const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const url = req.url || "/";
  const pathname = new URL(url, `http://127.0.0.1:${CLIENT_PORT}`).pathname;

  if (PROXY_PATHS.some((p) => pathname.startsWith(p))) {
    proxy.web(req, res);
    return;
  }

  let filePath = path.join(clientDistDir, pathname === "/" ? "index.html" : pathname);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(clientDistDir, "index.html");
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "application/octet-stream";

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

function waitForServer(port: number, retries = 20, delay = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}/`, () => {
        resolve();
      });
      req.on("error", () => {
        attempts++;
        if (attempts >= retries) {
          reject(new Error(`Server on port ${port} not ready after ${retries} attempts`));
        } else {
          setTimeout(check, delay);
        }
      });
      req.end();
    };
    check();
  });
}

async function main() {
  console.log("Waiting for Inspector proxy server to start...");
  await waitForServer(SERVER_PORT);
  console.log(`Inspector proxy server ready on port ${SERVER_PORT}`);

  server.listen(CLIENT_PORT, "0.0.0.0", () => {
    console.log(`MCP Inspector available at http://0.0.0.0:${CLIENT_PORT}`);
    console.log(`Proxying API requests to http://127.0.0.1:${SERVER_PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

process.on("SIGTERM", () => {
  inspectorServer.kill();
  server.close();
  process.exit(0);
});
