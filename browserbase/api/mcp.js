import { ServerList } from '../src/server.ts';
import { handleStreamable } from '../src/transport.ts';

// Store sessions in memory (note: for production with multiple serverless instances, use external storage)
const streamableSessions = new Map();
const serverList = new ServerList();

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  
  try {
    // Reuse the existing handleStreamable function from transport.js
    await handleStreamable(req, res, url, serverList, streamableSessions);
  } catch (error) {
    console.error('Error handling request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
} 