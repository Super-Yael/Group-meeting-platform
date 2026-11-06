import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {createDb,addDuty} from './core.js';
import {meetingBlocks,saveMeetingBlocks} from './meeting-records.js';

test('legacy notes and questions survive migration and ordered block saves are atomic',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-notes-')),filename=path.join(dir,'test.sqlite');
 let db=createDb(filename);
 try{
  db.prepare("INSERT INTO daily_records(date,recorder_id,summary,clinical,custom_sections) VALUES('2026-11-04','cyx','原总结','原始证据',?)").run(JSON.stringify([{title:'现场原话',content:'原话保持不变'}]));
  const qid=Number(db.prepare("INSERT INTO qa_logs(date,questioner_id,question,status) VALUES('2026-11-04','lxg','原问题','open')").run().lastInsertRowid);
  db.close();db=createDb(filename);
  const original=db.prepare('SELECT * FROM daily_records').get();
  const blocks=meetingBlocks(db,'2026-11-04',original);
  assert.ok(blocks.some(b=>b.content==='原始证据'));assert.ok(blocks.some(b=>b.content==='原话保持不变'));assert.ok(blocks.some(b=>b.questionId===qid));
  const result=saveMeetingBlocks(db,'2026-11-04','cyx',{blocks:[...blocks].reverse(),revision:0});
  assert.equal(result.revision,1);assert.equal(result.blocks[0].questionId,qid);
  assert.equal((db.prepare('SELECT clinical FROM daily_records').get() as any).clinical,'原始证据');
  assert.throws(()=>saveMeetingBlocks(db,'2026-11-04','cyx',{blocks,revision:0}),/记录已被更新/);
  assert.throws(()=>saveMeetingBlocks(db,'2026-11-04','cyx',{blocks:[...result.blocks,result.blocks[0]],revision:1}),/环节标识重复/);
  assert.equal((db.prepare('SELECT revision FROM daily_records').get() as any).revision,1);
  const detached=result.blocks.filter(b=>b.questionId!==qid);
  saveMeetingBlocks(db,'2026-11-04','cyx',{blocks:detached,revision:1});
  assert.ok(db.prepare('SELECT 1 FROM qa_logs WHERE id=?').get(qid),'removing a block retains tracked questions');
  assert.ok(!meetingBlocks(db,'2026-11-04',db.prepare('SELECT * FROM daily_records').get()).some(b=>b.questionId===qid),'removed blocks stay removed');
  assert.ok(meetingBlocks(db,'2026-11-04',db.prepare('SELECT * FROM daily_records').get(),true).some(b=>b.questionId===qid),'exports still include tracked questions');
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('meeting sequence, recorder question updates, reopening, conflicts and export work together',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-notebook-api-')),filename=path.join(dir,'test.sqlite'),db=createDb(filename),date='2026-11-06';
 for(const uid of ['fwl','cyx','lxg','lzq','chs'])db.prepare("INSERT INTO sessions VALUES(?,?,datetime('now','+1 day'))").run(createHash('sha256').update('test-'+uid).digest('hex'),uid);
 addDuty(db,'fwl',date,'cyx','recorder');addDuty(db,'fwl',date,'lxg','presenter');addDuty(db,'fwl',date,'sya','presenter');
 const socket=createServer().listen(0,'127.0.0.1');await once(socket,'listening');const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
 const child=spawn(process.execPath,['--import','tsx',path.join(__dirname,'index.ts')],{env:{...process.env,DB_PATH:filename,PORT:String(port),NODE_ENV:'test'},stdio:'ignore'}),base=`http://127.0.0.1:${port}`;
 const call=async(uid:string,method:string,route:string,body?:unknown)=>{const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',Cookie:'mm_session=test-'+uid},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json() as any};};
 try{
  let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(base+'/health')).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready);
  const initial=await call('cyx','GET','/api/records/'+date);assert.equal(initial.status,200);
  assert.deepEqual(initial.data.blocks.map((b:any)=>b.kind),['presentation','question','analysis','mentor_summary','speech']);
  const blocks=initial.data.blocks;blocks[0].content='分享内容';blocks[1]={...blocks[1],speakerId:'lxg',content:'需要验证的机制？',status:'tracking',followUpDate:'2026-11-09'};blocks[2].content='现场分析';blocks[3].content='老师总结';blocks[4].speakerId='lzq';blocks[4].content='补充发言';
  assert.equal((await call('lzq','PUT','/api/records/'+date,{blocks,revision:0})).status,403);
  assert.equal((await call('chs','PUT','/api/records/'+date,{blocks,revision:0})).status,403);
  const saved=await call('cyx','PUT','/api/records/'+date,{blocks,revision:0});assert.equal(saved.status,200);
  let q=(await call('cyx','GET','/api/records/'+date)).data.qa[0];assert.equal(q.status,'tracking');
  assert.equal((await call('lzq','PUT','/api/qa/'+q.id,{status:'resolved'})).status,403);
  assert.equal((await call('cyx','PUT','/api/qa/'+q.id,{status:'resolved',answer:'老师补充的答案',answererId:'chs',revision:q.revision})).status,200);
  let next=await call('chs','GET','/api/records/'+date);
  assert.equal(next.data.blocks[1].status,'resolved');assert.equal(next.data.blocks[1].answer,'老师补充的答案');
  assert.equal((await call('cyx','GET','/api/records/2026-11-09')).data.followUps.length,0);
  assert.equal((await call('cyx','PUT','/api/records/'+date,{blocks:saved.data.blocks,revision:1})).status,409,'stale question edits do not overwrite newer answers');
  q=next.data.qa[0];
  assert.equal((await call('lxg','PUT','/api/qa/'+q.id,{status:'tracking',followUpDate:'2026-11-10',revision:q.revision})).status,200);
  assert.equal((await call('cyx','GET','/api/records/2026-11-09')).data.followUps[0].status,'tracking');
  const pi=await call('chs','GET','/api/pi/overview?from=2026-11-01&to=2026-11-10');assert.equal(pi.status,200);assert.equal(pi.data.questionCount,1);assert.equal(pi.data.questions[0].status,'tracking');
  next=await call('cyx','GET','/api/records/'+date);next.data.blocks[4].title='课后补充';
  assert.equal((await call('cyx','PUT','/api/records/'+date,{blocks:next.data.blocks.toReversed(),revision:1})).status,200);
  const reloaded=await call('cyx','GET','/api/records/'+date);assert.equal(reloaded.data.blocks[0].title,'课后补充');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM qa_logs').get() as any).n,1,'saving does not duplicate linked questions');
  assert.equal((await call('cyx','POST','/api/papers',{date,title:'讨论的文献',presenterId:'lxg'})).status,200);
  for(const uid of ['sya','cyx','lzq','lpl'])await call('cyx','PUT',`/api/attendance/${date}/${uid}`,{present:false});
  assert.equal((await call('cyx','POST',`/api/records/${date}/publish`,{})).status,200);
  const exported=await fetch(base+`/api/export?from=${date}&to=${date}&format=docx`,{headers:{Cookie:'mm_session=test-chs'}});
  assert.equal(exported.status,200);assert.deepEqual([...new Uint8Array(await exported.arrayBuffer()).slice(0,2)],[80,75]);
  const bad=[{...reloaded.data.blocks.find((b:any)=>b.kind==='question'),questionId:q.id,questionRevision:999,relatedBlockId:undefined}];
  assert.equal((await call('fwl','PUT','/api/records/2026-11-09',{blocks:bad,revision:0})).status,400);
 }finally{child.kill();await once(child,'exit');db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
