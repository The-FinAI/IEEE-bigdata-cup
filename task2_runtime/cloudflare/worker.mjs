// Receipt validation/storage only. No cron, model, market data or CR calculation.
export const TICKERS = ['NVDA','GOOG','META','MSFT','JPM','AMZN','AAPL','AMD','WMT','TSLA'];
export const RELEASES = [14,15].flatMap(d=>[9,10,11,12,14,15].map(h=>`2026-10-${d}T${String(h).padStart(2,'0')}:30:00-04:00`));
export const IDS = RELEASES.map(s=>s.slice(0,10)+'_'+s.slice(11,16));
const cutoff = i=>i===11 ? Date.parse('2026-10-16T08:00:00-04:00') : Date.parse(RELEASES[i+1])-300000;
const json = (data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail = (status,message)=>{throw Object.assign(new Error(message),{status});};
const hash = async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
const token = ()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
async function admin(request,env){
 if(typeof env.ADMIN_TOKEN!=='string'||env.ADMIN_TOKEN.length<32)fail(503,'Administrator configuration pending');
 const candidate=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 const a=await hash(candidate),b=await hash(env.ADMIN_TOKEN);let difference=0;
 for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
 if(difference)fail(401,'Administrator credentials required');
}
async function body(request){
 const reader=request.body?.getReader();if(!reader)fail(422,'JSON required');
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();fail(413,'Too large');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{fail(422,'Invalid JSON');}
}
export function context(control,now=Date.now()){
 const test=control.rehearsal;
 if(test?.enabled&&/^[a-f0-9]{16}$/.test(test.id)&&now<Date.parse(RELEASES[0])&&now<Date.parse(test.expires_at))
  return {round_id:IDS[0],deadline:test.expires_at,mode:'rehearsal',session_id:test.id};
 const i=RELEASES.findIndex((s,i)=>control.published?.includes(IDS[i])&&Date.parse(s)<=now&&now<=cutoff(i));
 return {round_id:i<0?null:IDS[i],deadline:i<0?null:new Date(cutoff(i)).toISOString(),mode:'live',session_id:'live'};
}
export function validateControl(p){
 if(!p||typeof p!=='object'||Object.keys(p).some(k=>!['published','rehearsal'].includes(k))||!Array.isArray(p.published)||new Set(p.published).size!==p.published.length||p.published.some(id=>!IDS.includes(id)))fail(422,'Invalid control');
 if(p.rehearsal){const r=p.rehearsal;
  if(Object.keys(r).some(k=>!['enabled','id','expires_at'].includes(k))||typeof r.enabled!=='boolean'||!/^[a-f0-9]{16}$/.test(r.id)||!Number.isFinite(Date.parse(r.expires_at))||Date.parse(r.expires_at)>=Date.parse(RELEASES[0]))fail(422,'Invalid rehearsal');
 }
 return p;
}
async function config(env){const row=await env.DB.prepare('SELECT value FROM control WHERE id=1').first();return {raw:row.value,value:JSON.parse(row.value)};}
async function accept(request,env){
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)fail(403,'Submit from the receipt website');
 const p=await body(request);
 if(!p||Object.keys(p).sort().join(',')!=='action,round_id,stock1,stock2,team_name'||typeof p.team_name!=='string'||!TICKERS.includes(p.stock1)||!TICKERS.includes(p.stock2)||p.stock1===p.stock2||!['LS','SL','F'].includes(p.action))fail(422,'Four valid fields and an active round required');
 const name=p.team_name.trim();if(!/^[A-Za-z0-9][A-Za-z0-9 _.-]{1,79}$/.test(name)||name.toLowerCase()==='codex baseline')fail(422,'Invalid unique Team Name');
 const now=Date.now(),c=await config(env),s=context(c.value,now);
 if(!s.round_id||p.round_id!==s.round_id)fail(409,'Round closed');
 const identity=await hash(name.toLowerCase()),session=s.session_id;
 const team=await env.DB.prepare('SELECT name,token_hash FROM teams WHERE session=? AND identity=?').bind(session,identity).first();
 const auth=request.headers.get('X-Team-Token')||'';
 if(team&&(team.name!==name||team.token_hash!==await hash(auth)))fail(403,'Use the original team browser/token');
 const fresh=team?null:token(),digest=team?.token_hash||await hash(fresh);
 const receipt=token(),at=new Date(now).toISOString(),statements=[];
 if(Date.now()>Date.parse(s.deadline))fail(409,'Round closed');
 // D1 batch is transactional. SQL uniqueness, not a browser check, enforces once.
 // Match the control version inside the transaction to reject concurrent closure.
 if(!team)statements.push(env.DB.prepare('INSERT INTO teams SELECT ?,?,?,? WHERE (SELECT value FROM control WHERE id=1)=? AND (SELECT COUNT(*) FROM teams WHERE session=?)<500').bind(session,identity,name,digest,c.raw,session));
 statements.push(env.DB.prepare('INSERT INTO receipts SELECT ?,?,?,?,?,?,?,? WHERE (SELECT value FROM control WHERE id=1)=? AND EXISTS(SELECT 1 FROM teams WHERE session=? AND identity=? AND token_hash=?)').bind(session,identity,p.round_id,p.stock1,p.stock2,p.action,at,receipt,c.raw,session,identity,digest));
 let result;try{result=await env.DB.batch(statements);}catch{fail(409,'Not accepted: duplicate or concurrent request; no replacement');}
 if(result.at(-1).meta.changes!==1)fail(409,'Round control changed or capacity reached; not accepted');
 return json({accepted:true,receipt_id:receipt,round_id:p.round_id,accepted_at:at,...(fresh?{team_token:fresh}:{})});
}
async function exportInbox(env,session){
 const [teams,rows]=await env.DB.batch([
  env.DB.prepare('SELECT identity,name,token_hash FROM teams WHERE session=?').bind(session),
  env.DB.prepare('SELECT * FROM receipts WHERE session=?').bind(session)
 ]);
 const inbox={schema:'finreason.task2.receipts/1',teams:{},submissions:{}};
 for(const t of teams.results)inbox.teams[t.identity]={name:t.name,token_hash:t.token_hash};
 for(const r of rows.results){const {identity,session:ignore,...p}=r;p.team_name=inbox.teams[identity].name;p.mode=session==='live'?'live':'rehearsal';(inbox.submissions[p.round_id]??={})[identity]=p;}
 return inbox;
}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url),path=url.pathname;
  if(path==='/health'&&request.method==='GET'){
   if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)return json({ok:false,role:'receipts-only',reason:'Administrator configuration pending'},503);
   const c=await config(env);return json({ok:true,role:'receipts-only',scoring:'organizer-local',storage:'private-d1',mode:context(c.value).mode});
  }
  if(path==='/status'&&request.method==='GET'){const c=await config(env);return json(context(c.value));}
  if(path==='/submissions'&&request.method==='POST')return await accept(request,env);
  if(path.startsWith('/admin/')){
   await admin(request,env);
   if(path==='/admin/control'&&request.method==='GET')return json((await config(env)).value);
   if(path==='/admin/control'&&request.method==='PUT'){
    const p=validateControl(await body(request));await env.DB.prepare('UPDATE control SET value=? WHERE id=1').bind(JSON.stringify(p)).run();return json({ok:true});
   }
   if(path==='/admin/receipts'&&request.method==='GET'){
    const session=url.searchParams.get('session')||'live';if(session!=='live'&&!/^[a-f0-9]{16}$/.test(session))fail(422,'Invalid session');
    return json(await exportInbox(env,session));
   }
   if(path==='/admin/rehearsal'&&request.method==='DELETE'){
    const p=await body(request);if(!p||Object.keys(p).join(',')!=='session_id'||!/^[a-f0-9]{16}$/.test(p.session_id))fail(422,'Exact rehearsal session required');
    const c=await config(env);if(c.value.rehearsal?.enabled&&c.value.rehearsal.id===p.session_id)fail(409,'Close rehearsal before cleanup');
    await env.DB.batch([env.DB.prepare('DELETE FROM receipts WHERE session=?').bind(p.session_id),env.DB.prepare('DELETE FROM teams WHERE session=?').bind(p.session_id)]);return json({ok:true});
   }
   return json({detail:'Not found'},404);
  }
  if(path==='/'&&request.method==='GET')return env.ASSETS.fetch(request);
  return json({detail:'Not found'},404);
 }catch(e){return json({detail:e.status?e.message:'Receipt storage unavailable; no acceptance confirmed'},e.status||503);}
}};
