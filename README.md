# MCP Web Parse

An **MCP (Model Context Protocol) server** that exposes tools for discovering web page structure and parsing web content using CSS selectors. Perfect for AI agents and applications that need to extract data from web pages programmatically.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1-orange)](https://modelcontextprotocol.io/)

## Overview

**MCP Web Parse** simplifies web scraping and data extraction for AI applications. It provides a lightweight, standardized interface for:
- **Discovering** page structure and available selectors
- **Parsing** web page content with CSS selectors
- **Extracting** text, HTML, or attribute values
- **Integration** with AI agents and LLM applications via the Model Context Protocol

## Features

✨ **Easy Web Scraping** - Extract data from any web page using CSS selectors  
🔍 **Structure Discovery** - Automatically analyze pages to find the best selectors  
🤖 **AI-Ready** - Built for AI agents using the Model Context Protocol  
⚡ **Lightweight** - Minimal dependencies, fast execution  
🔌 **Flexible Transport** - Support for both stdio and HTTP transports  
📝 **TypeScript Native** - Full type safety with Zod validation  
🛡️ **Error Handling** - Comprehensive error messages and logging  

## Quick Start

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jasonseney/MCP-Web-Parse.git
cd MCP-Web-Parse
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run the server:
```bash
npm start
```

## Architecture

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5.9+ |
| **Protocol** | Model Context Protocol (MCP) v2024-11-05 |
| **Transport** | stdio / HTTP |
| **Parsing** | `@js0n-dev/web-parse-lite` v0.2.0 |
| **SDK** | `@modelcontextprotocol/sdk` v1.27.1 |
| **Validation** | Zod v4.3.6 |

### Project Structure

```
MCP-Web-Parse/
├── src/
│   └── index.ts              # MCP server implementation
├── dist/                     # Compiled JavaScript (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── test.sh                   # CLI test script
├── .replit                   # Replit configuration
└── README.md                 # This file
```

## Tools

### `web_parse` Tool

Parse web page content by URL, CSS selector, and extraction method.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✓ | The URL to fetch and parse |
| `selector` | string | ✓ | CSS selector to target elements |
| `method` | enum | ✓ | Extraction method: `"text"`, `"html"`, or `"attribute"` |
| `attribute` | string | | Required when `method` is `"attribute"` |

**Examples:**

Extract text from h1 elements:
```json
{
  "url": "https://example.com",
  "selector": "h1",
  "method": "text"
}
```

Extract HTML from article sections:
```json
{
  "url": "https://example.com/blog",
  "selector": ".article",
  "method": "html"
}
```

Extract href attributes from links:
```json
{
  "url": "https://example.com",
  "selector": "a.nav-link",
  "method": "attribute",
  "attribute": "href"
}
```

**Response Format:**
```json
{
  "success": true,
  "url": "https://example.com",
  "selector": "h1",
  "method": "text",
  "data": [
    {
      "selector": "h1",
      "value": "Example Domain"
    }
  ],
  "format": "json"
}
```

---

### `discover` Tool

Analyze a web page's HTML structure and return the most common CSS selectors with sample content. **Use this before `web_parse`** to find the right selectors for your target data.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✓ | The URL to fetch and analyze |

**Example:**
```json
{
  "url": "https://example.com"
}
```

**Response Format:**
```json
{
  "success": true,
  "url": "https://example.com",
  "selectors": [
    {
      "selector": "body > div",
      "frequency": 5,
      "sample": "Example Domain\nExample..."
    },
    {
      "selector": "h1",
      "frequency": 1,
      "sample": "Example Domain"
    }
  ],
  "sample": "<!doctype html>..."
}
```

## Usage

### Via Node.js Script

```javascript
import { parse, discover } from "@js0n-dev/web-parse-lite";

// Discover page structure
const discovered = await discover({
  url: "https://example.com"
});

// Parse specific content
const result = await parse({
  url: "https://example.com",
  selector: "h1",
  method: "text",
  format: "json"
});
```

### Via MCP Client

The server implements the Model Context Protocol, making it compatible with any MCP-compliant client:

```javascript
// Example MCP client initialization
const client = new MCPClient();
await client.connect({
  serverPath: "node dist/index.js",
  transport: "stdio"
});

// Call discover tool
const discovery = await client.callTool("discover", {
  url: "https://example.com"
});

// Call web_parse tool
const parsed = await client.callTool("web_parse", {
  url: "https://example.com",
  selector: "h1",
  method: "text"
});
```

### Via HTTP Transport

Set the environment variable to enable HTTP transport:

```bash
MCP_TRANSPORT=http PORT=3000 npm start
```

Available endpoints:
- **GET** `/` - Server info
- **GET** `/health` - Health check
- **POST** `/mcp` - MCP protocol endpoint

```bash
curl -X GET http://localhost:3000/health
# {"status":"ok","server":"mcp-web-parse"}
```

## Development

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Development Mode

Build and run in one command:
```bash
npm run dev
```

### Testing

Run the included test script:
```bash
bash test.sh
```

The test script performs the following checks:
1. ✓ Server initialization
2. ✓ Tool list retrieval
3. ✓ `web_parse` functionality (extracts h1 from example.com)
4. ✓ `discover` functionality (analyzes example.com structure)

**Note:** The test script automatically sets `NODE_TLS_REJECT_UNAUTHORIZED=0` to handle TLS certificate issues in environments like Replit.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `"stdio"` | Transport protocol: `"stdio"` or `"http"` |
| `PORT` | `"3000"` | HTTP server port (when `MCP_TRANSPORT=http`) |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `"1"` | Set to `"0"` for TLS issues (Replit environments) |

### TypeScript Configuration

The project uses a minimal `tsconfig.json` with ES modules support:
- **Target:** ES2020
- **Module:** ES2020
- **Output:** `dist/index.js`

## Logging & Monitoring

The server emits structured MCP logging messages:

```json
{
  "level": "info",
  "logger": "mcp-web-parse",
  "data": {
    "transport": "stdio",
    "requestId": 3,
    "sessionId": null,
    "event": "tool_call",
    "tool": "web_parse",
    "url": "https://example.com",
    "selector": "h1",
    "method": "text"
  }
}
```

Log levels: `debug`, `info`, `notice`, `warning`, `error`

## Error Handling

The server provides detailed error responses:

```json
{
  "error": true,
  "type": "network_error",
  "message": "Failed to fetch https://invalid-url.com"
}
```

Common error types:
- `validation` - Invalid parameters
- `network_error` - URL fetch failed
- `parsing_error` - CSS selector or parsing failed
- `unknown` - Unexpected error

## Performance & Limitations

⚡ **Performance:**
- Average parse request: <1 second (for small pages)
- Average discover request: <2 seconds (depends on page complexity)
- Streaming JSON-RPC responses via stdio

🔒 **Limitations:**
- **JavaScript-dependent content:** Pages requiring JavaScript rendering are not supported (static HTML only)
- **TLS Issues:** Some environments (Replit) may require `NODE_TLS_REJECT_UNAUTHORIZED=0`
- **Large files:** Performance degrades with very large HTML documents
- **Rate limiting:** Respects standard rate-limiting via HTTP headers

## Integration Examples

### With Claude or Other LLMs

Integrate MCP Web Parse into your LLM application to allow it to browse and extract web data:

```bash
# In your MCP configuration file (e.g., claude_desktop_config.json)
{
  "mcpServers": {
    "web-parse": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### With Custom AI Agents

```javascript
// Your AI agent can now use:
// - discover(url) → find selectors on a page
// - web_parse(url, selector, method) → extract data
```

## Troubleshooting

### Issue: "INVALID_PURPOSE" TLS Error

**Solution:** Set environment variable:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Issue: No response from server

**Solution:** Ensure the server is running and check stderr output:
```bash
npm start 2>&1 | head -20
```

### Issue: CSS selector returns empty results

**Solution:** Use the `discover` tool first to identify available selectors on the page.

### Issue: Cannot fetch HTTPS URLs

**Solution:** Check your network connection and firewall. Some networks may block outbound requests.

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs and feature requests via GitHub Issues
- Submit pull requests with improvements
- Share your use cases and integration examples

## License

This project is open source. See the repository for license information.

## Resources

- **Model Context Protocol:** https://modelcontextprotocol.io/
- **web-parse-lite:** https://www.npmjs.com/package/@js0n-dev/web-parse-lite
- **MCP SDK:** https://www.npmjs.com/package/@modelcontextprotocol/sdk
- **Zod Validation:** https://zod.dev/

## Author

Created by [@jasonseney](https://github.com/jasonseney)

---

**Questions or issues?** Open an issue on GitHub or check the existing discussions!
