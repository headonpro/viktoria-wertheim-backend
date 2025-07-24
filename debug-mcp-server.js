#!/usr/bin/env node

// Debug wrapper for the MCP server
console.error('[DEBUG] Starting MCP Server Debug Wrapper');
console.error('[DEBUG] Working directory:', process.cwd());
console.error('[DEBUG] Environment variables:');
console.error('  STRAPI_URL:', process.env.STRAPI_URL);
console.error('  STRAPI_ADMIN_EMAIL:', process.env.STRAPI_ADMIN_EMAIL ? 'SET' : 'NOT SET');
console.error('  STRAPI_ADMIN_PASSWORD:', process.env.STRAPI_ADMIN_PASSWORD ? 'SET' : 'NOT SET');
console.error('  STRAPI_DEV_MODE:', process.env.STRAPI_DEV_MODE);

// Handle process events
process.on('exit', (code) => {
    console.error('[DEBUG] Process exiting with code:', code);
});

process.on('SIGTERM', () => {
    console.error('[DEBUG] Received SIGTERM');
});

process.on('SIGINT', () => {
    console.error('[DEBUG] Received SIGINT');
});

process.on('uncaughtException', (error) => {
    console.error('[DEBUG] Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[DEBUG] Unhandled Rejection:', reason);
});

console.error('[DEBUG] Spawning actual MCP server...');

// Use child_process to spawn the actual server
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'mcpserver', 'strapi-mcp', 'build', 'index.js');
console.error('[DEBUG] Server path:', serverPath);

const child = spawn('node', [serverPath], {
    stdio: ['inherit', 'inherit', 'pipe'],
    env: process.env
});

child.stderr.on('data', (data) => {
    console.error('[DEBUG SERVER STDERR]', data.toString());
});

child.on('close', (code) => {
    console.error('[DEBUG] Server process closed with code:', code);
    process.exit(code);
});

child.on('error', (error) => {
    console.error('[DEBUG] Server process error:', error);
    process.exit(1);
});