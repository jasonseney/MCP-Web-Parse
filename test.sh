#!/bin/bash

echo "=== MCP Web Parse - Test Script ==="
echo ""

export NODE_TLS_REJECT_UNAUTHORIZED=0

INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
INITIALIZED='{"jsonrpc":"2.0","method":"notifications/initialized"}'
LIST='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
PARSE='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"web_parse","arguments":{"url":"https://example.com","selector":"h1","method":"text"}}}'
DISCOVER='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"discover","arguments":{"url":"https://example.com"}}}'

RESPONSES=$(printf '%s\n%s\n%s\n%s\n%s\n' "$INIT" "$INITIALIZED" "$LIST" "$PARSE" "$DISCOVER" | node dist/index.js 2>/dev/null)

echo "--- 1. Initialize Response ---"
echo "$RESPONSES" | sed -n '1p' | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

echo ""
echo "--- 2. Tools List ---"
echo "$RESPONSES" | sed -n '2p' | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

echo ""
echo "--- 3. web_parse Result (h1 text from example.com) ---"
echo "$RESPONSES" | sed -n '3p' | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

echo ""
echo "--- 4. discover Result (page structure of example.com) ---"
echo "$RESPONSES" | sed -n '4p' | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d),null,2)))"

echo ""
echo "=== Done ==="
