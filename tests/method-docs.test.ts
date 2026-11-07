import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const Database=createRequire(path.join(__dirname,'../apps/server/package.json'))('better-sqlite3');
import {documentHeadings,filterDocuments,groupByAxis,documentsInCategory,type MethodDocument} from '../apps/web/lib/method-docs';
// @ts-expect-error The CLI is a Node ES module used directly by deployment.
import {validatePages,importDocuments} from '../deploy/import-documents.mjs';

test('chapter IDs follow the Markdown tree, handle duplicate titles and ignore fenced code',()=>{
 const content='## **样本**与 `DNA`\n\n```text\n## not a heading\n```\n\n## 样本与 DNA\n\n组装\n----\n';
 const headings=documentHeadings(content,12);
 assert.deepEqual(headings.map(h=>[h.text,h.id]),[['样本与 DNA','method-12-样本与-dna'],['样本与 DNA','method-12-样本与-dna-2'],['组装','method-12-组装']]);
 assert.equal(headings[0].offset,0);assert.equal(headings.length,3);
});
const document=(id:number,title:string,category:string,content=''):MethodDocument=>({id,title,category,content,author_id:'admin',author_name:'Admin',updated_at:'2026-11-07'});
test('catalogue search handles method aliases, mixed punctuation and independent classification axes',()=>{
 const seq={key:'wet/sequencing',name:'测序',parentKey:'wet',description:'平台与覆盖',axes:[{key:'generation',label:'按代次',description:'',values:[{key:'second',label:'二代 / NGS',aliases:['next generation sequencing']}]},{key:'breadth',label:'按覆盖',description:'',values:[{key:'genome',label:'WGS',aliases:['全基因组']}]}]};
 const docs:MethodDocument[]=[{...document(1,'二代测序','测序'),category_key:seq.key,aliases:['NGS'],facets:{generation:['second']}},{...document(2,'全基因组测序','测序'),category_key:seq.key,aliases:['WGS','whole genome sequencing'],facets:{breadth:['genome']}},{...document(3,'Western blot','蛋白'),category_key:'wet/proteins',aliases:['WB','免疫印迹']},{...document(4,'Archived WGS','Old'),category_key:seq.key,archived:true}];
 assert.deepEqual(filterDocuments(docs,'wgs',[seq]).map(d=>d.id),[2]);assert.deepEqual(filterDocuments(docs,'RNA-seq nope',[seq]),[]);
 assert.deepEqual(filterDocuments(docs,'WB',[seq]).map(d=>d.id),[3]);assert.deepEqual(filterDocuments(docs,'next-generation sequencing',[seq]).map(d=>d.id),[1]);
 const group=groupByAxis(documentsInCategory(docs,seq.key),seq.axes[0]);assert.deepEqual(group.map(g=>[g.key,g.pages.map(d=>d.id)]),[['second',[1]],['general',[2]]]);
 assert.deepEqual(documentsInCategory(docs,'wet').map(d=>d.id),[1,2,3]);
});
test('private content import is idempotent, retains authored changes and enforces the admin boundary',()=>{
 const db=new Database(':memory:');
 db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT);INSERT INTO users VALUES('admin','admin'),('member','member');CREATE TABLE documents(id INTEGER PRIMARY KEY,title TEXT,category TEXT,content TEXT,author_id TEXT);CREATE TABLE audit_log(id INTEGER PRIMARY KEY,actor_id TEXT,action TEXT,details TEXT);INSERT INTO documents VALUES(1,'Existing','Rules','Keep me','admin');");
 try{
  const pages=validatePages([{key:'sample-quality',title:'Sample','category':'Methods',content:'## DNA\nOriginal'}]);
  assert.equal(importDocuments(db,pages,'admin')[0].action,'create');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM documents').get() as any).n,1,'dry runs do not write');
  assert.throws(()=>importDocuments(db,pages,'member',{apply:true}),/admin/);
  const result=importDocuments(db,pages,'admin',{apply:true});
  db.prepare('UPDATE documents SET title=?,content=? WHERE id=?').run('Renamed','Team edits',result[0].id);
  assert.equal(importDocuments(db,pages,'admin',{apply:true})[0].action,'preserve');
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM documents').get() as any).n,2);
  assert.equal((db.prepare('SELECT content FROM documents WHERE id=?').get(result[0].id) as any).content,'Team edits');
  assert.equal((db.prepare('SELECT content FROM documents WHERE id=1').get() as any).content,'Keep me');
  assert.throws(()=>validatePages([...pages,...pages]),/unique/);
 }finally{db.close();}
});

// @ts-expect-error Deployment CLI is an ES module.
import {migrateCatalog} from '../deploy/migrate-method-catalog.mjs';
import {saveDocument,ensureDocumentSchema} from '../apps/server/src/lab-documents';
import {catalogCategories} from '../apps/server/src/lab-taxonomy';
test('catalog migration classifies without replacing team edits, remains atomic and never reimports changed pages',()=>{
 const db=new Database(':memory:');
 db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT);INSERT INTO users VALUES('admin','Admin','admin'),('member','Member','member');CREATE TABLE documents(id INTEGER PRIMARY KEY,title TEXT,category TEXT,content TEXT,author_id TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE audit_log(id INTEGER PRIMARY KEY,actor_id TEXT,action TEXT,details TEXT);INSERT INTO documents(id,title,category,content,author_id) VALUES(1,'Existing','Old','Team authored text','member');INSERT INTO audit_log(actor_id,action,details) VALUES('admin','document.import','{\"key\":\"existing\",\"documentId\":1}');");
 const input={migrationId:'catalog-test',updates:[{key:'existing',expectedTitle:'Existing',title:'Canonical',categoryKey:'wet/sequencing',content:'Do not overwrite',summary:'Scope',aliases:['NGS'],tags:[],facets:{generation:['second']},archived:false}],pages:[{key:'new-method',expectedTitle:'New',title:'New',categoryKey:'wet/sequencing',summary:'Genome',content:'Reference',aliases:['WGS'],tags:[],facets:{breadth:['genome']},archived:false}]};
 const options={saveDocument,ensureDocumentSchema,categories:catalogCategories};
 try{
  assert.equal(migrateCatalog(db,input,'admin',options).length,2);assert.equal((db.prepare('SELECT COUNT(*) n FROM documents').get() as any).n,1);
  assert.throws(()=>migrateCatalog(db,input,'member',{...options,apply:true}),/administrator/);
  const result=migrateCatalog(db,input,'admin',{...options,apply:true});assert.deepEqual(result.map((r:any)=>r.action),['classify','create']);
  assert.deepEqual(db.prepare('SELECT title,content,author_id FROM documents WHERE id=1').get(),{title:'Canonical',content:'Team authored text',author_id:'member'});
  const created=result[1].id;db.prepare('UPDATE documents SET title=?,content=? WHERE id=?').run('Renamed by team','New edits',created);
  assert.ok(migrateCatalog(db,input,'admin',{...options,apply:true}).every((r:any)=>r.action==='preserve'));
  assert.equal((db.prepare('SELECT content FROM documents WHERE id=?').get(created) as any).content,'New edits');
  const before=(db.prepare('SELECT COUNT(*) n FROM documents').get() as any).n;
  assert.throws(()=>migrateCatalog(db,{...input,migrationId:'failed-test',archiveLegacy:[{id:999,expectedTitle:'Missing'}]},'admin',{...options,apply:true}),/identity changed/);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM documents').get() as any).n,before,'a failed batch rolls back every write');
  assert.equal((db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='document.catalog.migrate' AND json_extract(details,'$.migrationId')='failed-test'").get() as any).n,0);
 }finally{db.close();}
});
