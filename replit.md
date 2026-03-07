# mcp-web-parse

An MCP (Model Context Protocol) server that exposes a `web_parse` tool for parsing web pages using CSS selectors.

## Architecture

- **Runtime**: Node.js 20, TypeScript
- **Transport**: stdio (MCP standard)
- **Dependencies**:
  - `@modelcontextprotocol/sdk` — official MCP TypeScript SDK
  - `@js0n-dev/web-parse-lite` — HTML parsing library
  - `zod` — schema validation (used by MCP SDK)

## Project Structure

```
src/
  index.ts        — MCP server entry point, registers the web_parse tool
dist/
  index.js        — compiled output
package.json
tsconfig.json
```

## Tool: web_parse

Parameters:
- `url` (string, required) — URL to parse
- `selector` (string, required) — CSS selector
- `method` ("text" | "html" | "attribute") — extraction method
- `attribute` (string, optional) — required when method is "attribute"

## Build & Run

```bash
npm run build    # compile TypeScript
npm start        # run the server
npm run dev      # build + run
```
