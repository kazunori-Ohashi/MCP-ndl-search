#!/bin/bash

# MCP Server Launcher Script
# This script ensures proper directory and environment setup

set -e

# Change to the correct directory
cd "$(dirname "$0")"

# Export environment variables if not already set
export NODE_ENV="${NODE_ENV:-development}"
export NDL_BASE_URL="${NDL_BASE_URL:-https://iss.ndl.go.jp/api/opensearch}"
export NDL_RECORD_SCHEMA="${NDL_RECORD_SCHEMA:-dcndl}"
export MCP_API_URL="${MCP_API_URL:-http://localhost:8787}"
export HTTP_TIMEOUT_MS="${HTTP_TIMEOUT_MS:-10000}"
export HTTP_RETRY="${HTTP_RETRY:-2}"
export OPENAI_API_KEY="${OPENAI_API_KEY:-sk-test-key-replace-with-real-key}"
export OPENAI_MODEL="${OPENAI_MODEL:-gpt-3.5-turbo}"
export OPENAI_MAX_TOKENS="${OPENAI_MAX_TOKENS:-1000}"
export OPENAI_TEMPERATURE="${OPENAI_TEMPERATURE:-0.1}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

# Use a Node.js version that's compatible with npm v10.9.2
# First try to use nvm if available
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    source "$HOME/.nvm/nvm.sh"
    # Try to use Node 20+ if available
    nvm use 20 2>/dev/null || nvm use 22 2>/dev/null || echo "Using default Node version"
fi

# Run the MCP server
exec npm run mcp:server