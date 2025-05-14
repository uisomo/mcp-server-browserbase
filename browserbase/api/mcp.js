import crypto from 'node:crypto';
import { ServerList } from '../src/server.ts';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

// Store sessions in memory (for Vercel serverless functions)
// Note: In production with multiple instances, use Redis or other storage
const streamableSessions = new Map();
const serverList = new ServerList();

// Extract configuration from URL search parameters (copied from transport.ts)
function extractConfigFromURL(url) {
  const config = {};
  
  if (url.searchParams.has('browserbaseApiKey')) {
    config.browserbaseApiKey = url.searchParams.get('browserbaseApiKey') || undefined;
  }
  
  if (url.searchParams.has('browserbaseProjectId')) {
    config.browserbaseProjectId = url.searchParams.get('browserbaseProjectId') || undefined;
  }
  
  if (url.searchParams.has('proxies')) {
    config.proxies = url.searchParams.get('proxies') === 'true';
  }
  
  if (url.searchParams.has('advancedStealth')) {
    config.advancedStealth = url.searchParams.get('advancedStealth') === 'true';
  }
  
  if (url.searchParams.has('contextId')) {
    config.context = {
      contextId: url.searchParams.get('contextId') || undefined,
      persist: url.searchParams.has('persist') ? url.searchParams.get('persist') === 'true' : true
    };
  }
  
  const browserWidth = url.searchParams.get('browserWidth');
  const browserHeight = url.searchParams.get('browserHeight');
  if (browserWidth || browserHeight) {
    config.viewPort = {};
    if (browserWidth) config.viewPort.browserWidth = parseInt(browserWidth, 10);
    if (browserHeight) config.viewPort.browserHeight = parseInt(browserHeight, 10);
  }
  
  return config;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  
  // Handle session-based requests
  const sessionId = req.headers['mcp-session-id'];
  if (sessionId) {
    const transport = streamableSessions.get(sessionId);
    if (!transport) {
      res.statusCode = 404;
      res.end('Session not found');
      return;
    }
    return await transport.handleRequest(req, res);
  }

  // Handle GET requests specifically with the correct error format
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    }));
    return;
  }

  if (req.method === 'POST') {
    // Extract configuration from URL parameters
    const config = extractConfigFromURL(url);
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: sessionId => {
        streamableSessions.set(sessionId, transport);
      }
    });
    
    transport.onclose = () => {
      if (transport.sessionId)
        streamableSessions.delete(transport.sessionId);
    };
    
    const server = await serverList.create(config);
    await server.connect(transport);
    return await transport.handleRequest(req, res);
  }

  res.statusCode = 400;
  res.end('Invalid request');
} 