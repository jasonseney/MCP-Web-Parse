#!/usr/bin/env node

import http from "http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { parse, discover, WebParseLiteError } from "@js0n-dev/web-parse-lite";

const SERVER_INFO = {
  name: "mcp-web-parse",
  version: "1.0.0",
} as const;

type RequestContext = {
  requestId: string | number;
  sessionId?: string;
  transport: "stdio" | "streamable-http";
};

function createMcpServer() {
  const server = new McpServer(SERVER_INFO, {
    capabilities: {
      logging: {},
    },
  });

  async function logMcpEvent(
    level: "debug" | "info" | "notice" | "warning" | "error",
    data: Record<string, unknown>,
    context: RequestContext
  ) {
    await server.sendLoggingMessage(
      {
        level,
        logger: "mcp-web-parse",
        data: {
          transport: context.transport,
          requestId: context.requestId,
          sessionId: context.sessionId ?? null,
          ...data,
        },
      },
      context.sessionId
    );
  }

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
    async ({ url, selector, method, attribute }, extra) => {
      const context: RequestContext = {
        requestId: extra.requestId,
        sessionId: extra.sessionId,
        transport: extra.requestInfo ? "streamable-http" : "stdio",
      };

      await logMcpEvent(
        "info",
        {
          event: "tool_call",
          tool: "web_parse",
          url,
          selector,
          method,
          attribute: attribute ?? null,
        },
        context
      );

      if (method === "attribute" && !attribute) {
        await logMcpEvent(
          "warning",
          {
            event: "tool_validation_error",
            tool: "web_parse",
            reason: "attribute_required_for_attribute_method",
          },
          context
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  error: true,
                  type: "validation",
                  message:
                    'The "attribute" parameter is required when method is "attribute"',
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
        } = {
          url,
          selector,
          method,
          format: "json",
        };

        if (method === "attribute" && attribute) {
          options.attribute = attribute;
        }

        const result = await parse(options);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  url,
                  selector,
                  method,
                  data: result.data,
                  format: result.format,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof WebParseLiteError) {
          await logMcpEvent(
            "error",
            {
              event: "tool_execution_error",
              tool: "web_parse",
              errorType: error.type,
              message: error.message,
            },
            context
          );

          return handleError(error);
        }

        await logMcpEvent(
          "error",
          {
            event: "tool_execution_error",
            tool: "web_parse",
            errorType: "unknown",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
          context
        );

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
    async ({ url }, extra) => {
      const context: RequestContext = {
        requestId: extra.requestId,
        sessionId: extra.sessionId,
        transport: extra.requestInfo ? "streamable-http" : "stdio",
      };

      await logMcpEvent(
        "info",
        {
          event: "tool_call",
          tool: "discover",
          url,
        },
        context
      );

      try {
        const result = await discover({ url });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  url,
                  selectors: result.selectors,
                  sample: result.sample,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        if (error instanceof WebParseLiteError) {
          await logMcpEvent(
            "error",
            {
              event: "tool_execution_error",
              tool: "discover",
              errorType: error.type,
              message: error.message,
            },
            context
          );

          return handleError(error);
        }

        await logMcpEvent(
          "error",
          {
            event: "tool_execution_error",
            tool: "discover",
            errorType: "unknown",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
          context
        );

        return handleError(error);
      }
    }
  );

  return server;
}

function handleError(error: unknown) {
  if (error instanceof WebParseLiteError) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: true,
              type: error.type,
              message: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: true,
            type: "unknown",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
          null,
          2
        ),
      },
    ],
    isError: true,
  };
}

async function main() {
  const transport = process.env.MCP_TRANSPORT;

  if (transport === "http") {
    await startHttpServer();
  } else {
    await startStdioServer();
  }
}

async function startStdioServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("mcp-web-parse server running on stdio\n");
}

async function startHttpServer() {
  const port = parseInt(process.env.PORT ?? "3000", 10);

  const httpServer = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: SERVER_INFO.name }));
      return;
    }

    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...SERVER_INFO, transport: "http" }));
      return;
    }

    if (req.url === "/mcp") {
      try {
        const server = createMcpServer();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        process.stderr.write(
          `MCP request error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
        );

        if (!res.headersSent) {
          res.writeHead(500);
          res.end("Internal server error");
        }
      }

      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  httpServer.listen(port, () => {
    process.stderr.write(`mcp-web-parse HTTP server listening on port ${port}\n`);
    process.stderr.write(`  Health: http://localhost:${port}/health\n`);
    process.stderr.write(`  MCP:    http://localhost:${port}/mcp\n`);
  });
}

main().catch((error) => {
  process.stderr.write(
    `Fatal error: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
  );
  process.exit(1);
});
