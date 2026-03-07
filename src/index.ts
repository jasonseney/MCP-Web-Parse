#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { parse, discover, WebParseLiteError } from "@js0n-dev/web-parse-lite";

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
    if (method === "attribute" && !attribute) {
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
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-web-parse server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
