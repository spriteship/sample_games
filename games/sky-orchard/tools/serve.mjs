import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
createServer((req,res)=>{
  const relative=decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/, '')||'index.html';
  const file=normalize(join(root,relative));
  if(!file.startsWith(root+'/')) return res.writeHead(403).end('Forbidden');
  const stream=createReadStream(file);
  stream.on('open',()=>{res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});stream.pipe(res);});
  stream.on('error',()=>res.writeHead(404).end('Not found'));
}).listen(Number(process.env.PORT)||4285,'127.0.0.1',()=>console.log('Sky Orchard: http://127.0.0.1:'+(Number(process.env.PORT)||4285)));
