import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const ROOT=resolve(import.meta.dirname,'..');
const PORT=Number(process.env.PORT)||4173;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const requested=resolve(ROOT,'.'+pathname,pathname.endsWith('/')?'index.html':'');
    if(requested!==ROOT&&!requested.startsWith(ROOT+sep))throw new Error('Forbidden path');
    if((await stat(requested)).isDirectory())throw new Error('No directory listing');
    const body=await readFile(requested);
    res.writeHead(200,{'content-type':MIME[extname(requested)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});
    res.end(body);
  }catch(error){res.writeHead(error.message==='Forbidden path'?403:404,{'content-type':'text/plain'});res.end('Not found');}
}).listen(PORT,'127.0.0.1',()=>console.log(`Melody Masters at http://127.0.0.1:${PORT}`));
