import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../dist');
if(!fs.existsSync(root+'/index.html')){const r=spawnSync(process.execPath,[path.join(import.meta.dirname,'build.mjs')],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.pck':'application/octet-stream','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||4174);
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
  if(file===root)file+='/index.html';
  if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'});
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port,'0.0.0.0',()=>console.log(`Emberhold is live: http://localhost:${port}`));
