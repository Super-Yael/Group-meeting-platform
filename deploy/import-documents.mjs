#!/usr/bin/env node
// Import a private handbook JSON into the existing documents table without replacing edits.
// node deploy/import-documents.mjs --db PATH --input PATH --actor fwl [--apply]
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let Database;
try{Database=require('better-sqlite3');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;Database=createRequire(new URL('../apps/server/package.json',import.meta.url))('better-sqlite3');}
import {fileURLToPath} from 'node:url';

export function validatePages(input){
 if(!Array.isArray(input)||!input.length||input.length>500)throw new Error('Input must contain 1–500 pages');
 const keys=new Set();
 return input.map(page=>{
  if(!page||typeof page.key!=='string'||!/^[a-z0-9][a-z0-9-]{1,79}$/.test(page.key)||keys.has(page.key))throw new Error('Every page needs a unique import key');
  keys.add(page.key);
  for(const [field,max] of [['title',200],['category',60],['content',100000]])if(typeof page[field]!=='string'||!page[field].trim()||page[field].length>max)throw new Error(`Invalid ${field} in ${page.key}`);
  return {key:page.key,title:page.title.trim(),category:page.category.trim(),content:page.content.trim()};
 });
}
export function importDocuments(db,pages,actor,{apply=false}={}){
 const user=db.prepare("SELECT id FROM users WHERE id=? AND role='admin'").get(actor);
 if(!user)throw new Error('An existing admin must own imported pages');
 const previous=db.prepare("SELECT json_extract(a.details,'$.documentId') AS id FROM audit_log a JOIN documents d ON d.id=json_extract(a.details,'$.documentId') WHERE a.action='document.import' AND json_extract(a.details,'$.key')=? ORDER BY a.id DESC LIMIT 1");
 const byTitle=db.prepare('SELECT id FROM documents WHERE title=? AND category=? ORDER BY id LIMIT 1');
 const insert=db.prepare('INSERT INTO documents(title,category,content,author_id) VALUES(?,?,?,?)');
 const audit=db.prepare("INSERT INTO audit_log(actor_id,action,details) VALUES(?,'document.import',?)");
 const execute=()=>pages.map(page=>{
  const existing=previous.get(page.key)||byTitle.get(page.title,page.category);
  if(existing)return {key:page.key,title:page.title,action:'preserve',id:existing.id};
  if(!apply)return {key:page.key,title:page.title,action:'create'};
  const id=Number(insert.run(page.title,page.category,page.content,actor).lastInsertRowid);
  audit.run(actor,JSON.stringify({key:page.key,documentId:id}));
  return {key:page.key,title:page.title,action:'create',id};
 });
 return apply?db.transaction(execute)():execute();
}
async function main(){
 const args=process.argv.slice(2),get=name=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
 const filename=get('--db'),input=get('--input'),actor=get('--actor'),apply=args.includes('--apply');
 if(!filename||!input||!actor)throw new Error('Usage: node import-documents.mjs --db PATH --input PATH --actor ID [--apply]');
 const pages=validatePages(JSON.parse(fs.readFileSync(input,'utf8')));
 const db=new Database(filename,{readonly:!apply,fileMustExist:true});db.pragma('busy_timeout=5000');db.pragma('foreign_keys=ON');
 try{
  if(apply){
   const backup=path.join(path.dirname(filename),`before-method-library-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
   await db.backup(backup);fs.chmodSync(backup,0o600);
   const verified=new Database(backup,{readonly:true,fileMustExist:true});
   try{if(verified.pragma('integrity_check',{simple:true})!=='ok')throw new Error('Backup integrity check failed');}finally{verified.close();}
   console.log('Verified backup: '+backup);
  }
  const result=importDocuments(db,pages,actor,{apply});
  console.log(JSON.stringify({applied:apply,created:result.filter(p=>p.action==='create').length,preserved:result.filter(p=>p.action==='preserve').length,pages:result},null,2));
 }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
