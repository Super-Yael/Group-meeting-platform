#!/usr/bin/env node
// Private content stays outside Git. Preview by default; --apply takes a verified backup first.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));

export function validateCatalog(input,categories){
 if(!input||typeof input.migrationId!=='string'||!/^[-a-z0-9]{3,80}$/.test(input.migrationId)||!Array.isArray(input.updates)||!Array.isArray(input.pages)||input.updates.length+input.pages.length>500)throw new Error('Invalid catalog migration');
 const keys=new Set();
 for(const page of [...input.updates,...input.pages]){
  if(!page||typeof page.key!=='string'||!/^[-a-z0-9]{2,80}$/.test(page.key)||keys.has(page.key))throw new Error('Import keys must be unique');keys.add(page.key);
  for(const [key,max] of [['title',200],['summary',1000],['content',100000]])if(typeof page[key]!=='string'||page[key].length>max||key==='title'&&!page[key].trim())throw new Error(`Invalid ${key}: ${page.key}`);
  const category=categories.find(c=>c.key===page.categoryKey&&(c.parentKey||c.key==='unfiled'));if(!category)throw new Error(`Invalid category: ${page.key}`);
  for(const field of ['aliases','tags'])if(!Array.isArray(page[field])||page[field].length>50||page[field].some(s=>typeof s!=='string'||!s.trim()||s.length>100))throw new Error(`Invalid ${field}: ${page.key}`);
  if(!page.facets||typeof page.facets!=='object'||Array.isArray(page.facets))throw new Error(`Invalid facets: ${page.key}`);
  for(const [key,values] of Object.entries(page.facets)){
   const axis=category.axes.find(a=>a.key===key);if(!axis||!Array.isArray(values)||values.length>50||values.some(v=>!axis.values.some(option=>option.key===v)))throw new Error(`Invalid facet values: ${page.key}/${key}`);
  }
  if(typeof page.archived!=='boolean')throw new Error(`Invalid visibility: ${page.key}`);
 }
 for(const row of input.archiveLegacy||[])if(!Number.isSafeInteger(row.id)||row.id<1||typeof row.expectedTitle!=='string')throw new Error('Invalid legacy archive identity');
 return input;
}
export function migrateCatalog(db,input,actor,{apply=false,saveDocument,ensureDocumentSchema,categories}){
 validateCatalog(input,categories);
 if(!db.prepare("SELECT id FROM users WHERE id=? AND role='admin'").get(actor))throw new Error('An existing administrator is required');
 const find=db.prepare("SELECT d.* FROM audit_log a JOIN documents d ON d.id=json_extract(a.details,'$.documentId') WHERE a.action='document.import' AND json_extract(a.details,'$.key')=? ORDER BY a.id DESC LIMIT 1");
 const byTitle=db.prepare('SELECT * FROM documents WHERE title=? ORDER BY id LIMIT 1');
 const done=db.prepare("SELECT 1 FROM audit_log WHERE action='document.catalog.migrate' AND json_extract(details,'$.migrationId')=? AND json_extract(details,'$.key')=? LIMIT 1");
 const mark=db.prepare("INSERT INTO audit_log(actor_id,action,details) VALUES(?,'document.catalog.migrate',?)");
 const results=[];
 const execute=()=>{
  if(apply)ensureDocumentSchema(db);
  for(const [existingOnly,pages] of [[true,input.updates],[false,input.pages]])for(const page of pages){
   if(done.get(input.migrationId,page.key)){results.push({key:page.key,action:'preserve'});continue;}
   const old=find.get(page.key)||byTitle.get(page.expectedTitle||page.title);
   if(existingOnly&&!old)throw new Error(`Original page missing: ${page.key}`);
   const action=old?'classify':'create';let id=old?.id;
   if(apply){
    const parse=(v,fallback)=>{try{return JSON.parse(v);}catch{return fallback;}};
    const metadata={...page,content:old?old.content:page.content,title:old&&old.title!==page.expectedTitle?old.title:page.title,summary:old?.summary||page.summary,aliases:[...new Set([...parse(old?.aliases_json,[]),...page.aliases])],tags:[...new Set([...parse(old?.tags_json,[]),...page.tags])]};
    const saved=saveDocument(db,{id:actor,role:'admin'},metadata,id);id=saved.id;
    if(!old)db.prepare("INSERT INTO audit_log(actor_id,action,details) VALUES(?,'document.import',?)").run(actor,JSON.stringify({key:page.key,documentId:id}));
    mark.run(actor,JSON.stringify({migrationId:input.migrationId,key:page.key,documentId:id}));
   }
   results.push({key:page.key,action,id,contentPreserved:!!old});
  }
  for(const row of input.archiveLegacy||[]){
   const key=`legacy-${row.id}`;if(done.get(input.migrationId,key)){results.push({key,action:'preserve'});continue;}
   const old=db.prepare('SELECT id,title FROM documents WHERE id=?').get(row.id);if(!old||old.title!==row.expectedTitle)throw new Error(`Legacy page identity changed: ${row.id}`);
   if(apply){db.prepare('UPDATE documents SET archived=1,revision=revision+1 WHERE id=?').run(old.id);mark.run(actor,JSON.stringify({migrationId:input.migrationId,key,documentId:old.id,archived:true}));}
   results.push({key,action:'archive',id:old.id,contentPreserved:true});
  }
  return results;
 };
 return apply?db.transaction(execute)():execute();
}
async function main(){
 const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
 const filename=get('--db'),inputPath=get('--input'),actor=get('--actor'),apply=args.includes('--apply');
 if(!filename||!inputPath||!actor)throw new Error('Usage: migrate-method-catalog.mjs --db PATH --input PRIVATE_JSON --actor ADMIN [--apply] [--server-dir PATH]');
 const serverDir=path.resolve(get('--server-dir')||(fs.existsSync(path.join(here,'dist'))?here:path.join(here,'../apps/server')));
 const Database=createRequire(path.join(serverDir,'package.json'))('better-sqlite3');
 const {saveDocument,ensureDocumentSchema}=await import(pathToFileURL(path.join(serverDir,'dist/lab-documents.js')));
 const {catalogCategories:categories}=await import(pathToFileURL(path.join(serverDir,'dist/lab-taxonomy.js')));
 const input=validateCatalog(JSON.parse(fs.readFileSync(inputPath,'utf8')),categories);
 const db=new Database(filename,{readonly:!apply,fileMustExist:true});db.pragma('busy_timeout=5000');db.pragma('foreign_keys=ON');
 try{
  if(apply){
   const backup=path.join(path.dirname(filename),`before-experiment-catalog-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`);
   await db.backup(backup);fs.chmodSync(backup,0o600);const verify=new Database(backup,{readonly:true,fileMustExist:true});
   try{if(verify.pragma('integrity_check',{simple:true})!=='ok')throw new Error('Backup integrity check failed');}finally{verify.close();}
   console.log('Verified backup: '+backup);
  }
  const rows=migrateCatalog(db,input,actor,{apply,saveDocument,ensureDocumentSchema,categories});
  console.log(JSON.stringify({applied:apply,counts:Object.fromEntries(['create','classify','archive','preserve'].map(action=>[action,rows.filter(r=>r.action===action).length])),rows},null,2));
  if(db.pragma('integrity_check',{simple:true})!=='ok')throw new Error('Database integrity check failed');
 }finally{db.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
