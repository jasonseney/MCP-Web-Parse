# mcp-web-parse

An MCP (Model Context Protocol) server that exposes tools for discovering page structure and parsing web pages using CSS selectors.

## Architecture

- **Runtime**: Node.js 20, TypeScript
- **Transport**: stdio (MCP standard)
- **Dependencies**:
  - `@modelcontextprotocol/sdk` — official MCP TypeScript SDK
  - `@js0n-dev/web-parse-lite` (v0.2.0) — HTML parsing and page discovery library
  - `zod` — schema validation (used by MCP SDK)

## Project Structure

```
src/
  index.ts     — MCP server entry point, registers web_parse and discover tools
dist/
  index.js     — compiled output
test.sh        — CLI test script (sends JSON-RPC messages to the server)
package.json
tsconfig.json
```

## Tools

### web_parse
Parse web page content by URL, CSS selector, and extraction method.
- `url` (string, required) — URL to parse
- `selector` (string, required) — CSS selector
- `method` ("text" | "html" | "attribute") — extraction method
- `attribute` (string, optional) — required when method is "attribute"

### discover
Analyze a web page's HTML structure and return the most common CSS selectors with sample text. Use before `web_parse` to find the right selectors.
- `url` (string, required) — URL to fetch and analyze
- Returns: top 30 selectors ranked by frequency + sample text snippets

## Build & Run

```bash
npm run build    # compile TypeScript
npm start        # run the server
npm run dev      # build + run
```

## Testing

- `bash test.sh` — sends JSON-RPC messages to the server and displays init, tool list, and a sample parse result

## Notes

- Replit's TLS certificates cause `INVALID_PURPOSE` errors with Node.js fetch. Set `NODE_TLS_REJECT_UNAUTHORIZED=0` when making HTTPS requests (already configured in test.sh and the Start application workflow).
