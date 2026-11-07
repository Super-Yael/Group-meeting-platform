import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {createServer} from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDb,hashPassword} from './core.js';

test('PI can read and export but every team mutation is denied by the API',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-lab-pi-')),filename=path.join(dir,'test.sqlite');
 const db=createDb(filename),password='pi-test-only-password';
 db.prepare("UPDATE users SET password_hash=? WHERE id='chs'").run(hashPassword(password));
 db.prepare("INSERT INTO sessions VALUES(?,'fwl',datetime('now','+1 day'))").run(createHash('sha256').update('test-admin-token').digest('hex'));
 db.prepare("INSERT INTO documents(title,content,author_id) VALUES('测试文档','已有内容','fwl')").run();
 db.prepare("INSERT INTO daily_records(date,recorder_id,status,summary) VALUES('2026-11-04','fwl','published','测试纪要')").run();
 const socket=createServer().listen(0,'127.0.0.1');await once(socket,'listening');
 const port=(socket.address() as {port:number}).port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
 const child=spawn(process.execPath,['--import','tsx',path.join(__dirname,'index.ts')],{env:{...process.env,DB_PATH:filename,PORT:String(port),NODE_ENV:'test',WEB_ORIGIN:'http://localhost:3000'},stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;
 try{
  let ready=false;
  for(let i=0;i<60;i++){try{ready=(await fetch(base+'/health')).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'test API started');
  assert.equal((await fetch(base+'/api/documents/catalog')).status,401,'the knowledge library requires authentication');
  const invite=await fetch(base+'/api/admin/invite',{method:'POST',headers:{'Content-Type':'application/json',Cookie:'mm_session=test-admin-token'},body:JSON.stringify({userId:'chs'})});
  assert.equal(invite.status,200,'admin can invite PI');
  const {code}=await invite.json() as {code:string};
  const activate=await fetch(base+'/api/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'chs',code,password})});
  assert.equal(activate.status,200,'PI can set own first password');
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'chs',password})});
  assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie')!.split(';')[0];
  const headers={'Content-Type':'application/json',Cookie:cookie};
  for(const route of ['/api/pi/overview?from=2026-11-04&to=2026-11-05','/api/bootstrap','/api/schedule?from=2026-11-04&to=2026-11-05','/api/records/2026-11-04','/api/documents','/api/documents/catalog','/api/documents/1','/api/reviews','/api/export?from=2026-11-04&to=2026-11-04&format=docx']){
   const response=await fetch(base+route,{headers});assert.equal(response.status,200,route);await response.arrayBuffer();
  }
  const writes=[['POST','/api/schedule'],['DELETE','/api/schedule/1'],['POST','/api/schedule/generate'],['POST','/api/schedule/1/move'],['POST','/api/swaps'],['POST','/api/swaps/1/decide'],['PUT','/api/records/2026-11-04'],['POST','/api/records/2026-11-04/publish'],['PUT','/api/attendance/2026-11-04/lxg'],['POST','/api/papers'],['POST','/api/qa'],['PUT','/api/qa/1'],['POST','/api/documents'],['PUT','/api/documents/1'],['PUT','/api/reviews'],['PUT','/api/settings'],['POST','/api/admin/invite']];
  for(const [method,route] of writes){const response=await fetch(base+route,{method,headers,body:'{}'});assert.equal(response.status,403,`${method} ${route}`);}
  const change=await fetch(base+'/api/account/password',{method:'POST',headers,body:JSON.stringify({currentPassword:password,newPassword:'new-pi-test-password'})});
  assert.equal(change.status,200,'own password remains editable');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM documents').get() as any).n,1);
  assert.equal((db.prepare('SELECT summary FROM daily_records').get() as any).summary,'测试纪要');
  assert.equal((await fetch(base+'/api/logout',{method:'POST',headers,body:'{}'})).status,200);
 }finally{child.kill();await once(child,'exit');db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
