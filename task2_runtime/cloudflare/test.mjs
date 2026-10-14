import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{IDS,RELEASES,context,validateControl} from './worker.mjs';
class Statement{
 constructor(db,sql,args=[]){Object.assign(this,{db,sql,args});}
 bind(...args){return new Statement(this.db,this.sql,args);}
 async first(){return this.db.prepare(this.sql).get(...this.args)||null;}
 async all(){return {results:this.db.prepare(this.sql).all(...this.args)};}
 async run(){return {meta:this.db.prepare(this.sql).run(...this.args)};}
}
function setup(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const env={ADMIN_TOKEN:'test-only-admin-secret-000000000000',DB:{prepare:sql=>new Statement(db,sql),async batch(statements){db.exec('BEGIN');try{const rows=[];for(const s of statements)rows.push(/^SELECT/.test(s.sql)?await s.all():await s.run());db.exec('COMMIT');return rows;}catch(e){db.exec('ROLLBACK');throw e;}}},ASSETS:{fetch:()=>new Response('form')}};
 return {db,env,call:(path,method='GET',payload,headers={})=>worker.fetch(new Request('https://receipt.example'+path,{method,headers:{...(payload?{'Content-Type':'application/json'}:{}),...headers},...(payload?{body:JSON.stringify(payload)}:{})}),env)};
}
const fixed=Date.parse('2026-10-14T04:50:00Z'),session='a'.repeat(16);
const control={published:[],rehearsal:{enabled:true,id:session,expires_at:'2026-10-14T06:00:00Z'}};
const action={team_name:'Test Team',stock1:'NVDA',stock2:'GOOG',action:'LS',round_id:IDS[0]};
test('schedule and rehearsal never extend into formal opening',()=>{
 assert.equal(context(control,fixed).mode,'rehearsal');
 assert.equal(context(control,Date.parse(RELEASES[0])).mode,'live');
 assert.equal(context({published:[IDS[0]]},Date.parse(RELEASES[0])).round_id,IDS[0]);
 assert.equal(context({published:[IDS[0]]},Date.parse('2026-10-14T10:25:01-04:00')).round_id,null);
 assert.throws(()=>validateControl({published:[],rehearsal:{...control.rehearsal,expires_at:RELEASES[0]}}));
});
test('administrator required; no public payload export',async()=>{
 const s=setup();assert.equal((await s.call('/admin/receipts')).status,401);
 assert.equal((await s.call('/leaderboard')).status,404);
 assert.equal((await s.call('/admin/control','PUT',control)).status,401);
 assert.equal((await s.call('/health')).status,200);s.db.close();
});
test('one immutable receipt, isolated from live ledger, stock/action validation',async()=>{
 const s=setup(),original=Date.now;Date.now=()=>fixed;
 try{
  const admin={Authorization:'Bearer '+s.env.ADMIN_TOKEN};assert.equal((await s.call('/admin/control','PUT',control,admin)).status,200);
  for(const p of [{...action,stock2:'NVDA'},{...action,action:'both'},{...action,stock1:'BA'}])assert.equal((await s.call('/submissions','POST',p)).status,422);
  const r=await s.call('/submissions','POST',action);assert.equal(r.status,200);const accepted=await r.json();assert.equal(accepted.accepted,true);
  assert.equal((await s.call('/submissions','POST',action)).status,403);
  assert.equal((await s.call('/submissions','POST',action,{'X-Team-Token':accepted.team_token})).status,409);
  const live=await (await s.call('/admin/receipts','GET',null,admin)).json();assert.deepEqual(live.submissions,{});
  const rehearsal=await (await s.call('/admin/receipts?session='+session,'GET',null,admin)).json();assert.equal(Object.values(rehearsal.submissions[IDS[0]])[0].stock1,'NVDA');
  assert.equal((await s.call('/admin/rehearsal','DELETE',{session_id:'live'},admin)).status,422);
  assert.equal((await s.call('/admin/rehearsal','DELETE',{session_id:session},admin)).status,409);
  await s.call('/admin/control','PUT',{published:[]},admin);
  assert.equal((await s.call('/admin/rehearsal','DELETE',{session_id:session},admin)).status,200);
  assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM receipts').get().n,0);
  assert.equal((await s.call('/submissions','POST',action)).status,409);
 }finally{Date.now=original;s.db.close();}
});
test('transaction rollback prevents orphan team on duplicate first claim',async()=>{
 const s=setup();await s.env.DB.prepare('INSERT INTO teams VALUES (?,?,?,?)').bind(session,'identity','Team','hash').run();
 await assert.rejects(s.env.DB.batch([s.env.DB.prepare('INSERT INTO teams VALUES (?,?,?,?)').bind(session,'other','Other','hash'),s.env.DB.prepare('INSERT INTO teams VALUES (?,?,?,?)').bind(session,'identity','Team','hash')]));
 assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM teams').get().n,1);s.db.close();
});
