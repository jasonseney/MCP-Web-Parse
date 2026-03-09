#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { parse, discover, WebParseLiteError } from "@js0n-dev/web-parse-lite";
import http from "http";

// ---------------------------------------------------------------------------
// MCP Server definition — tools registered here, transport chosen below
// ---------------------------------------------------------------------------

function createServer() {
  const server = new McpServer({
    name: "mcp-web-parse",
    version: "1.0.0",
  });

  server.tool(
    "web_parse",
    "Parse web page content by URL, CSS selector, and extraction method",
    {
      url: z.string().describe("The URL to parse"),
      selector: z.string().describe("CSS selector to target elements"),
      method: z
        .enum(["text", "html", "attribute"])
        .describe('Extraction method: "text", "html", or "attribute"'),
      attribute: z
        .string()
        .optional()
        .describe('Required when method is "attribute" — the attribute name to extract'),
    },
    async ({ url, selector, method, attribute }) => {

      onsole.log(`[web_parse] url=${url} selector=${selector} method=${method}`);
      
      if (method === "attribute" && !attribute) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: true,
                  type: "validation",
                  message: 'The "attribute" parameter is required when method is "attribute"',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        const options: {
          url: string;
          selector: string;
          method: "text" | "html" | "attribute";
          format: "json";
          attribute?: string;
        } = { url, selector, method, format: "json" };

        if (method === "attribute" && attribute) {
          options.attribute = attribute;
        }

        const result = await parse(options);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, url, selector, method, data: result.data, format: result.format },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  server.tool(
    "discover",
    "Discover the structure of a web page by analyzing its HTML and returning the most common CSS selectors with sample text. Use this before web_parse to find the right selectors.",
    {
      url: z.string().describe("The URL to fetch and analyze"),
    },
    async ({ url }) => {
      try {
        console.log(`[discover] url=${url}`);
        const result = await discover({ url });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { success: true, url, selectors: result.selectors, sample: result.sample },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  return server;
}

function handleError(error: unknown) {
  if (error instanceof WebParseLiteError) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ error: true, type: error.type, message: error.message }, null, 2) }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ error: true, type: "unknown", message: error instanceof Error ? error.message : "An unexpected error occurred" }, null, 2) }],
    isError: true,
  };
}

// ---------------------------------------------------------------------------
// Transport — stdio locally, HTTP on Render (set MCP_TRANSPORT=http)
// ---------------------------------------------------------------------------

async function main() {
  const transport = process.env.MCP_TRANSPORT;

  if (transport === "http") {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

// Local: spawn process per session, communicate over stdin/stdout
async function startStdioServer() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-web-parse running on stdio");
}

// Remote: persistent HTTP server, one session per POST /mcp request
// Each request gets its own MCP server instance + transport
async function startHttpServer() {
  const PORT = parseInt(process.env.PORT ?? "3000", 10);

  const httpServer = http.createServer(async (req, res) => {

    // Health check — Render pings this to confirm the service is alive
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "mcp-web-parse" }));
      return;
    }

    // Root info endpoint — useful sanity check
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ name: "mcp-web-parse", transport: "http", version: "1.0.0" }));
      return;
    }

    // MCP endpoint — each POST creates a fresh server+transport pair
    if (req.url === "/mcp") {
      try {
        const server = createServer();
        const mcpTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless — no session persistence
        });
        await server.connect(mcpTransport);
        await mcpTransport.handleRequest(req, res);
      } catch (err) {
        console.error("MCP request error:", err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      }
      return;
    }

    // Catch-all 404
    res.writeHead(404);
    res.end("Not found");
  });

  httpServer.listen(PORT, () => {
    console.log(`mcp-web-parse HTTP server listening on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
    console.log(`  MCP:    http://localhost:${PORT}/mcp`);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
