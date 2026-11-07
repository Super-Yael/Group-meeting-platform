import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const Database=createRequire(path.join(__dirname,'../apps/server/package.json'))('better-sqlite3');
import {documentHeadings,filterDocuments,groupDocuments,type MethodDocument} from '../apps/web/lib/method-docs';
// @ts-expect-error The CLI is a Node ES module used directly by deployment.
import {validatePages,importDocuments} from '../deploy/import-documents.mjs';

test('chapter IDs follow the Markdown tree, handle duplicate titles and ignore fenced code',()=>{
 const content='## **样本**与 `DNA`\n\n```text\n## not a heading\n```\n\n## 样本与 DNA\n\n组装\n----\n';
 const headings=documentHeadings(content,12);
 assert.deepEqual(headings.map(h=>[h.text,h.id]),[['样本与 DNA','method-12-样本与-dna'],['样本与 DNA','method-12-样本与-dna-2'],['组装','method-12-组装']]);
 assert.equal(headings[0].offset,0);assert.equal(headings.length,3);
});
const document=(id:number,title:string,category:string,content=''):MethodDocument=>({id,title,category,content,author_id:'admin',author_name:'Admin',updated_at:'2026-11-07'});
test('the manual keeps category order and searches every term across titles and content',()=>{
 const docs=[document(1,'原有规范','组内约定'),document(5,'样本质量','样本与建库','DNA 完整性'),document(3,'手册','阅读指南'),document(8,'FASTQ','数据分析','DNA 序列')];
 assert.deepEqual(groupDocuments(docs).map(g=>g.category),['阅读指南','样本与建库','数据分析','组内约定']);
 assert.deepEqual(filterDocuments(docs,' dna 完整 ').map(d=>d.id),[5]);assert.equal(docs[0].id,1);
 assert.deepEqual(filterDocuments(docs,'unknown'),[]);
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
