import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import {createDb,addDuty,movePresenter,requestSwap,decideSwap} from './core.js';
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-lab-'));const db=createDb(path.join(dir,'test.sqlite'));return {db,cleanup:()=>{db.close();fs.rmSync(dir,{recursive:true,force:true})}}}
test('presenter move obeys capacity and own-task rules',()=>{const {db,cleanup}=setup();try{addDuty(db,'fwl','2026-11-04','cyx','recorder');const source=Number(addDuty(db,'fwl','2026-11-04','lxg','presenter'));addDuty(db,'fwl','2026-11-05','lzq','recorder');addDuty(db,'fwl','2026-11-05','sya','presenter');addDuty(db,'fwl','2026-11-05','lpl','presenter');assert.throws(()=>movePresenter(db,'cyx',source,'2026-11-06'),/只能更改自己的汇报/);assert.equal(movePresenter(db,'lxg',source,'2026-11-05').to,'2026-11-05');assert.throws(()=>addDuty(db,'fwl','2026-11-05','cyx','presenter'),/已满/);}finally{cleanup()}});
test('recorder swap requires target approval and exchanges atomically',()=>{const {db,cleanup}=setup();try{const a=Number(addDuty(db,'fwl','2026-11-04','cyx','recorder'));const b=Number(addDuty(db,'fwl','2026-11-05','lzq','recorder'));const req=Number(requestSwap(db,'cyx',a,b,'实验值班'));assert.throws(()=>decideSwap(db,'lxg',req,true),/只有目标记录人/);decideSwap(db,'lzq',req,true);assert.equal((db.prepare('SELECT user_id FROM schedules WHERE id=?').get(a) as any).user_id,'lzq');assert.equal((db.prepare('SELECT user_id FROM schedules WHERE id=?').get(b) as any).user_id,'cyx');assert.throws(()=>decideSwap(db,'lzq',req,true),/申请已处理/);}finally{cleanup()}});
test('swap rejects a duplicate duty on either day',()=>{const {db,cleanup}=setup();try{const a=Number(addDuty(db,'fwl','2026-11-04','cyx','recorder'));const b=Number(addDuty(db,'fwl','2026-11-05','lzq','recorder'));addDuty(db,'fwl','2026-11-05','cyx','presenter');assert.throws(()=>requestSwap(db,'cyx',a,b,''),/重复担任任务/);}finally{cleanup()}});
test('legacy accounts migrate without losing passwords, sessions or referenced documents',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-lab-migrate-')),filename=path.join(dir,'legacy.sqlite');
 const legacy=new Database(filename);
 legacy.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('admin','member')),team_group TEXT NOT NULL,password_hash TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 INSERT INTO users(id,name,role,team_group,password_hash) VALUES('fwl','冯汶乐','admin','host','preserved-hash');
 CREATE TABLE sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at TEXT NOT NULL);
 INSERT INTO sessions VALUES('preserved-session','fwl','2099-01-01');
 CREATE TABLE documents(id INTEGER PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL DEFAULT '方法',content TEXT NOT NULL DEFAULT '',author_id TEXT NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 INSERT INTO documents(id,title,content,author_id) VALUES(1,'已保存文档','不能丢失','fwl');`);
 legacy.close();
 const db=createDb(filename);
 try{
  assert.equal((db.prepare("SELECT password_hash FROM users WHERE id='fwl'").get() as any).password_hash,'preserved-hash');
  assert.equal((db.prepare("SELECT user_id FROM sessions WHERE token_hash='preserved-session'").get() as any).user_id,'fwl');
  assert.equal((db.prepare('SELECT content FROM documents WHERE id=1').get() as any).content,'不能丢失');
  assert.equal((db.prepare("SELECT role FROM users WHERE id='chs'").get() as any).role,'pi');
  assert.deepEqual(db.pragma('foreign_key_check'),[]);
  assert.throws(()=>addDuty(db,'fwl','2026-11-04','chs','presenter'),/PI 账号不参与/);
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
