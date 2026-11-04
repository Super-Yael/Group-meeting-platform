import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDb,addDuty} from './core.js';

test('date-specific permissions and review ownership are enforced by the API',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-lab-access-')),filename=path.join(dir,'test.sqlite');
 const db=createDb(filename),date='2026-11-04';
 const people=['fwl','lxg','sya','cyx','lzq','lpl','chs'];
 for(const uid of people)db.prepare("INSERT INTO sessions VALUES(?,?,datetime('now','+1 day'))").run(createHash('sha256').update(`test-${uid}`).digest('hex'),uid);
 addDuty(db,'fwl',date,'lxg','presenter');addDuty(db,'fwl',date,'sya','presenter');
 addDuty(db,'fwl',date,'cyx','recorder');addDuty(db,'fwl',date,'lpl','host');
 const review=(owner:string,start:string)=>Number(db.prepare("INSERT INTO reviews(period_type,period_start,period_end,title,owner_id) VALUES('weekly',?,?,?,?)").run(start,start,owner+' original',owner).lastInsertRowid);
 const ownId=review('lxg','2026-11-01'),otherId=review('sya','2026-11-08');
 const socket=createServer().listen(0,'127.0.0.1');await once(socket,'listening');
 const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
 const child=spawn(process.execPath,['--import','tsx',path.join(__dirname,'index.ts')],{env:{...process.env,DB_PATH:filename,PORT:String(port),NODE_ENV:'test',WEB_ORIGIN:'http://localhost:3000'},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;
 const request=async(uid:string,method:string,route:string,body?:unknown)=>{
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Cookie:`mm_session=test-${uid}`},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json() as any};
 };
 const expectStatus=async(uid:string,method:string,route:string,body:unknown,status:number)=>{
  const result=await request(uid,method,route,body);assert.equal(result.status,status,`${uid} ${method} ${route}: ${JSON.stringify(result.body)}`);return result.body;
 };
 try{
  let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(base+'/health')).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'test API started');
  assert.equal((await request('lxg','GET','/api/pi/overview?from=2026-11-04&to=2026-11-05')).status,403);
  const piOverview=await request('chs','GET','/api/pi/overview?from=2026-11-01&to=2026-11-14');assert.equal(piOverview.status,200);assert.equal(piOverview.body.reviews.length,2);assert.equal(piOverview.body.duties.length,4);
  assert.equal((await request('chs','GET','/api/pi/overview?from=2026-11-05&to=2026-11-01')).status,400);
  await t.test('record responses expose permissions for the requested date and signed-in identity',async()=>{
   for(const uid of people){
    const result=await request(uid,'GET',`/api/records/${date}`);assert.equal(result.status,200);
    assert.equal(result.body.duties.length,4);
    const edit=['fwl','cyx'].includes(uid),paper=['fwl','cyx','lxg','sya'].includes(uid);
    assert.deepEqual(result.body.permissions,{canEditRecord:edit,canPublishRecord:edit,canManageAttendance:edit,canRecordOthersQa:edit,canAddPaper:paper},uid);
   }
   const unrelated=await request('lxg','GET','/api/records/2027-03-01');
   assert.equal(unrelated.body.permissions.canAddPaper,false);assert.deepEqual(unrelated.body.duties,[]);
   assert.equal((await fetch(base+`/api/records/${date}`)).status,401);
  });
  await t.test('only that day’s recorder and admin can save records or manage attendance',async()=>{
   await expectStatus('cyx','PUT',`/api/records/${date}`,{summary:'Saved by recorder'},200);
   for(const uid of ['lxg','lzq','lpl','chs']){
    await expectStatus(uid,'PUT',`/api/records/${date}`,{summary:'unauthorized'},403);
    await expectStatus(uid,'PUT',`/api/attendance/${date}/lxg`,{present:false},403);
    await expectStatus(uid,'POST',`/api/records/${date}/publish`,{},403);
   }
   assert.equal((db.prepare('SELECT summary FROM daily_records WHERE date=?').get(date) as any).summary,'Saved by recorder');
   await expectStatus('cyx','PUT',`/api/attendance/${date}/lxg`,{present:true},200);
   await expectStatus('fwl','PUT',`/api/attendance/${date}/lxg`,{present:true},200);
  });
  await t.test('sources require an assignment on the target date and presenters cannot impersonate others',async()=>{
   for(const uid of ['lzq','lpl','chs'])await expectStatus(uid,'POST','/api/papers',{date,title:'unauthorized'},403);
   await expectStatus('lxg','POST','/api/papers',{date:'2026-11-05',title:'wrong date'},403);
   const own=await expectStatus('lxg','POST','/api/papers',{date,title:'Own source'},200);
   assert.equal((db.prepare('SELECT presenter_id FROM papers WHERE id=?').get(own.id) as any).presenter_id,'lxg');
   await expectStatus('lxg','POST','/api/papers',{date,title:'forged speaker',presenterId:'sya'},403);
   await expectStatus('cyx','POST','/api/papers',{date,title:'Recorded source',presenterId:'sya'},200);
   await expectStatus('cyx','POST','/api/papers',{date,title:'Not a speaker',presenterId:'lzq'},400);
   await expectStatus('fwl','POST','/api/papers',{date:'2026-11-05',title:'Admin source'},200);
   assert.equal((db.prepare('SELECT COUNT(*) AS n FROM papers').get() as any).n,3);
  });
  await t.test('review readers see only authorized edit actions',async()=>{
   for(const uid of ['lxg','sya','lzq','chs','fwl']){
    const result=await request(uid,'GET','/api/reviews');assert.equal(result.status,200);
    assert.equal(result.body.find((r:any)=>r.id===ownId).can_edit,['lxg','fwl'].includes(uid));
    assert.equal(result.body.find((r:any)=>r.id===otherId).can_edit,['sya','fwl'].includes(uid));
   }
  });
  await t.test('review ownership cannot be forged through the body, period key, ID or a colliding edit',async()=>{
   const other={periodType:'weekly',periodStart:'2026-11-08',periodEnd:'2026-11-14',title:'forged',ownerId:'lxg'};
   await expectStatus('lxg','PUT','/api/reviews',other,403);
   await expectStatus('lxg','PUT','/api/reviews',{...other,id:otherId,periodStart:'2026-11-22',periodEnd:'2026-11-28'},403);
   await expectStatus('lxg','PUT','/api/reviews',{...other,id:ownId},409);
   await expectStatus('lxg','PUT','/api/reviews',{...other,id:ownId,periodStart:'2026-11-01',ownerId:'sya'},403);
   assert.equal((db.prepare('SELECT title FROM reviews WHERE id=?').get(otherId) as any).title,'sya original');
   await expectStatus('lxg','PUT','/api/reviews',{...other,id:ownId,periodStart:'2026-11-02',title:'Owner edit'},200);
   assert.equal((db.prepare('SELECT COUNT(*) AS n FROM reviews').get() as any).n,2,'editing the date updates the original record');
   await expectStatus('fwl','PUT','/api/reviews',{...other,id:otherId,ownerId:'lzq',title:'Admin reassigned'},200);
   await expectStatus('sya','PUT','/api/reviews',{...other,id:otherId,ownerId:'sya'},403);
   await expectStatus('lzq','PUT','/api/reviews',{...other,id:otherId,ownerId:'lzq',title:'New owner edit'},200);
   await expectStatus('lxg','PUT','/api/reviews',{...other,id:9999},404);
   await expectStatus('chs','PUT','/api/reviews',{...other,id:otherId},403);
   const create={periodType:'halfmonth',periodStart:'2026-11-20',periodEnd:'2026-12-03',title:'My review'};
   await expectStatus('lxg','PUT','/api/reviews',{...create,ownerId:'sya'},403);
   await expectStatus('lxg','PUT','/api/reviews',create,200);
   assert.equal((db.prepare("SELECT owner_id FROM reviews WHERE period_type='halfmonth'").get() as any).owner_id,'lxg');
  });
  await t.test('publication permissions follow the current recorder when a schedule changes',async()=>{
   for(const uid of people.filter(x=>!['fwl','chs'].includes(x)))db.prepare('INSERT INTO qa_logs(date,questioner_id,question) VALUES(?,?,?)').run(date,uid,'Question');
   await expectStatus('cyx','POST',`/api/records/${date}/publish`,{},200);
   db.prepare("UPDATE schedules SET user_id='lzq' WHERE date=? AND duty_type='recorder'").run(date);
   await expectStatus('cyx','POST',`/api/records/${date}/publish`,{},403);
   const current=await request('lzq','GET',`/api/records/${date}`);assert.equal(current.body.permissions.canPublishRecord,true);
   await expectStatus('lzq','POST',`/api/records/${date}/publish`,{},200);
  });
  await t.test('schedule removal is restricted to admins for every duty type',async()=>{
   const duties=db.prepare('SELECT id FROM schedules').all() as {id:number}[];
   for(const duty of duties){
    await expectStatus('lxg','DELETE',`/api/schedule/${duty.id}`,undefined,403);
    await expectStatus('chs','DELETE',`/api/schedule/${duty.id}`,undefined,403);
    await expectStatus('fwl','DELETE',`/api/schedule/${duty.id}`,undefined,200);
   }
  });
 }finally{child.kill();await once(child,'exit');db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
