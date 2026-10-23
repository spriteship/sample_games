import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
createServer((request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
  const file = resolve(join(root, pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')));
  if (file !== root && !file.startsWith(root + sep)) { response.writeHead(403).end('Forbidden'); return; }
  const stream = createReadStream(file);
  stream.on('open', () => { response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); stream.pipe(response); });
  stream.on('error', () => { if (!response.headersSent) response.writeHead(404).end('Not found'); });
}).listen(4175, '127.0.0.1', () => console.log('BLACKOUT: http://127.0.0.1:4175'));
