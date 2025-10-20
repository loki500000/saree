// server.js - Azure App Service entry point for Next.js standalone build
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const port = process.env.PORT || 8080;
const dev = false; // Always run in production mode on Azure
const hostname = 'localhost';

// Use standalone build directory
const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

console.log('Starting Next.js server...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  PWD: process.cwd()
});

app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
      }
    })
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
  })
  .catch((err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
