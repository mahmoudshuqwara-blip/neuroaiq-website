// Minimal static server for local preview and the test suite. No dependencies.
// Usage: node tests/serve.js [port]   (serves ./src)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.normalize(path.join(root, url));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': types['.html'] });
      return res.end(fs.readFileSync(path.join(root, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`Serving src/ on http://localhost:${port}`));
