import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, extname, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, AppError } from './store.mjs';
import { QAError } from '../src/qa-domain.ts';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createApp({store=new Store(resolve(root,process.env.QA_DATA_DIR??'.data','camposol-qa.sqlite')),dataDir=resolve(root,process.env.QA_DATA_DIR??'.data'),allowedOrigins=['http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4317','http://localhost:4317']}={}) {
  const attempts=new Map();
  function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
  async function body(req,maximum=40_000){let raw='';for await(const chunk of req){raw+=chunk; if(Buffer.byteLength(raw)>maximum)throw new AppError(413,'La solicitud es demasiado grande.');}try{const v=JSON.parse(raw||'{}');if(v===null||Array.isArray(v)||typeof v!=='object')throw 0;return v;}catch{throw new AppError(400,'La solicitud no contiene un objeto JSON válido.');}}
  function throttle(req,key){const now=Date.now();for(const [k,v] of attempts)if(v.end<now)attempts.delete(k);const k=`${req.socket.remoteAddress}:${key}`;const entry=attempts.get(k)??{n:0,end:now+60_000};entry.n++;attempts.set(k,entry);if(entry.n>8)throw new AppError(429,'Demasiados intentos. Espera un minuto antes de volver a intentar.');}
  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    try {
      const host=req.headers.host??'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))throw new AppError(403,'Este servidor solo acepta acceso local.');
      const url=new URL(req.url,`http://${host}`),path=url.pathname;
      if(!path.startsWith('/api/')){
        if(req.method!=='GET')throw new AppError(405,'Método no permitido.');
        const pathname=decodeURIComponent(path);let target=resolve(root,'dist','.'+pathname);const dist=resolve(root,'dist');
        const rel=relative(dist,target);if(rel.startsWith('..')||isAbsolute(rel)||pathname.includes('\\'))throw new AppError(404,'Archivo no encontrado.');
        try{if((await stat(target)).isDirectory())target=join(target,'index.html');await stat(target);}catch{target=join(dist,'index.html');}
        let bytes;try{bytes=await readFile(target);}catch{res.writeHead(503,{'Content-Type':'text/html; charset=utf-8'});res.end('<!doctype html><html lang="es"><meta charset="utf-8"><title>Camposol QA — preparación</title><body><h1>Camposol QA</h1><p>El backend local está operativo. Falta compilar la interfaz React: ejecuta <code>npm install</code> y <code>npm run build</code> en el directorio del proyecto.</p><p>Esta pantalla no representa la interfaz terminada.</p></body></html>');return;}
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");res.writeHead(200,{'Content-Type':types[extname(target)]??'application/octet-stream'});res.end(bytes);return;
      }
      const mutate=!['GET','HEAD'].includes(req.method);
      if(mutate){if(!allowedOrigins.includes(req.headers.origin))throw new AppError(403,'Origen no autorizado.');if(!req.headers['content-type']?.startsWith('application/json'))throw new AppError(415,'Se requiere contenido JSON.');}
      if(path==='/api/info'&&req.method==='GET')return send(res,200,store.info());
      if(path==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,mode:'local',phase:3});
      const cookie=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('qa_session='))?.slice(11);
      const auth=store.session(cookie);
      if(path==='/api/session'&&req.method==='GET')return send(res,200,auth??{user:null,csrf:''});
      if(['/api/bootstrap','/api/login'].includes(path)&&req.method==='POST'){
        throttle(req,'login');const input=await body(req);const s=path==='/api/bootstrap'?await store.bootstrap(input):await store.login(input);
        res.setHeader('Set-Cookie',`qa_session=${s.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`);return send(res,200,{user:s.user,csrf:s.csrf});
      }
      if(path==='/api/recovery'&&req.method==='POST'){throttle(req,'recovery');const input=await body(req);const item=await store.requestReset(input.email);if(item){await mkdir(join(dataDir,'outbox'),{recursive:true});await writeFile(join(dataDir,'outbox',`${Date.now()}.json`),JSON.stringify({...item,reset_url:`${req.headers.origin}/#restablecer=${item.token}`},null,2),{mode:0o600});}return send(res,200,{message:'Si la cuenta existe, el enlace estará en el buzón local de desarrollo. No se ha enviado un correo real.'});}
      if(path==='/api/reset-password'&&req.method==='POST'){throttle(req,'reset');const input=await body(req);return send(res,200,await store.resetPassword(input.token,input.password));}
      if(!auth)throw new AppError(401,'Inicia sesión para continuar.');
      if(mutate&&!equal(req.headers['x-csrf-token'],auth.csrf))throw new AppError(403,'La solicitud no pasó la validación de sesión. Recarga la página.');
      const user=auth.user;
      if(path==='/api/logout'&&req.method==='POST'){store.logout(cookie);res.setHeader('Set-Cookie','qa_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(res,200,{ok:true});}
      if(path==='/api/ai/preferences'&&req.method==='GET')return send(res,200,store.ai.preferences(user));
      if(path==='/api/ai/preferences'&&req.method==='PUT')return send(res,200,store.ai.savePreferences(user,await body(req)));
      if(path==='/api/ai/generate'&&req.method==='POST')return send(res,200,await store.ai.generate(user,await body(req,280_000)));
      if(path==='/api/applications'&&req.method==='GET')return send(res,200,store.applications(user));
      if(path==='/api/applications'&&req.method==='PUT')return send(res,200,store.qa.saveApplication(user,await body(req)));
      if(path==='/api/qa/methodologies'&&req.method==='GET')return send(res,200,store.qa.methodologies(user));
      if(path==='/api/qa/methodologies'&&req.method==='POST'){const input=await body(req);return send(res,200,store.qa.saveMethodology(user,input.methodology,input.id??null,input.revision??0));}
      const publish=path.match(/^\/api\/qa\/methodologies\/([a-f0-9-]{36})\/approve$/);
      if(publish&&req.method==='POST'){const input=await body(req);return send(res,200,store.qa.approveMethodology(user,publish[1],input.revision));}
      if(path==='/api/qa/progress'&&req.method==='GET')return send(res,200,store.qa.progress(user));
      const qa=path.match(/^\/api\/qa\/projects\/([a-f0-9-]{36})$/);
      if(qa&&req.method==='GET')return send(res,200,store.qa.get(user,qa[1]));
      if(qa&&req.method==='POST'){const input=await body(req,2_100_000);return send(res,200,store.qa.command(user,qa[1],input.version,input.command));}
      const qaHistory=path.match(/^\/api\/qa\/projects\/([a-f0-9-]{36})\/history$/);
      if(qaHistory&&req.method==='GET')return send(res,200,store.qa.history(user,qaHistory[1],Number(url.searchParams.get('offset')??0)));
      const qaRevision=path.match(/^\/api\/qa\/projects\/([a-f0-9-]{36})\/history\/(\d+)$/);
      if(qaRevision&&req.method==='GET')return send(res,200,store.qa.revision(user,qaRevision[1],Number(qaRevision[2])));

      if(path==='/api/profile'&&req.method==='PATCH')return send(res,200,store.updateProfile(user,await body(req)));
      if(path==='/api/projects'&&req.method==='GET')return send(res,200,store.listProjects(user));
      if(path==='/api/projects'&&req.method==='POST')return send(res,201,store.createProject(user,await body(req)));
      const project=path.match(/^\/api\/projects\/([a-f0-9-]{36})$/);
      if(project&&req.method==='GET')return send(res,200,store.viewProject(user,project[1]));
      if(project&&req.method==='PATCH')return send(res,200,store.updateProject(user,project[1],await body(req)));
      const members=path.match(/^\/api\/projects\/([a-f0-9-]{36})\/members$/);
      if(members&&req.method==='GET')return send(res,200,store.members(user,members[1]));
      if(members&&req.method==='PUT')return send(res,200,store.setMember(user,members[1],await body(req)));
      const member=path.match(/^\/api\/projects\/([a-f0-9-]{36})\/members\/([a-f0-9-]{36})$/);
      if(member&&req.method==='DELETE')return send(res,200,store.removeMember(user,member[1],member[2]));
      if(path==='/api/users'&&req.method==='GET')return send(res,200,store.users(user));
      if(path==='/api/users'&&req.method==='POST')return send(res,201,await store.createUser(user,await body(req)));
      const account=path.match(/^\/api\/users\/([a-f0-9-]{36})$/);
      if(account&&req.method==='PATCH')return send(res,200,store.updateUser(user,account[1],await body(req)));
      if(path==='/api/audit'&&req.method==='GET')return send(res,200,store.events(user,url.searchParams.get('project_id')));
      throw new AppError(404,'Recurso no encontrado.');
    }catch(error){const status=error instanceof AppError||error instanceof QAError?error.status:500;if(status===500)console.error('Error interno de Camposol QA:',error.name);send(res,status,{error:status===500?'Ocurrió un error interno. Intenta nuevamente.':error.message});}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.env.NODE_ENV==='production')throw new Error('El backend SQLite es solo local. Configura Supabase para producción.');
  const port=Number(process.env.QA_PORT??4317);const server=createApp();server.listen(port,'127.0.0.1',()=>console.log(`Camposol QA — backend local: http://127.0.0.1:${port}`));
}
