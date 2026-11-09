import {test} from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {ensureDocumentSchema,getDocument,saveDocument,listDocuments} from './lab-documents.js';
import {catalogCategories} from './lab-taxonomy.js';
function setup(){const db=new Database(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT);INSERT INTO users VALUES('admin','Admin','admin'),('member','Member','member'),('other','Other','member'),('pi','PI','pi');CREATE TABLE documents(id INTEGER PRIMARY KEY,title TEXT NOT NULL,category TEXT NOT NULL,content TEXT NOT NULL,author_id TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);CREATE TABLE audit_log(id INTEGER PRIMARY KEY,actor_id TEXT,action TEXT,details TEXT);");return db;}
test('catalog metadata migration preserves all original text, ownership and IDs and can run twice',()=>{
 const db=setup();try{
  db.prepare('INSERT INTO documents(id,title,category,content,author_id) VALUES(7,?,?,?,?)').run('FISH 原位杂交','测序技术','Original content','member');
  ensureDocumentSchema(db);ensureDocumentSchema(db);
  const doc=getDocument(db,{id:'member',role:'member'},7);
  assert.equal(doc.content,'Original content');assert.equal(doc.author_id,'member');assert.equal(doc.category_key,'histology');assert.equal(doc.id,7);assert.deepEqual(doc.aliases,[]);
 }finally{db.close();}
});
test('generation and coverage are stored independently; invalid facets and unauthorized edits cannot change data',()=>{
 const db=setup();try{
  ensureDocumentSchema(db);const member={id:'member',role:'member'};
  const first=saveDocument(db,member,{title:'WGS',content:'## 范围\nDNA',categoryKey:'wet/sequencing',aliases:['全基因组','WGS'],summary:'Genome',tags:['细菌'],facets:{breadth:['genome'],analyte:['dna']}});
  assert.deepEqual(first.facets,{breadth:['genome'],analyte:['dna']});assert.equal(first.can_edit,true);
  assert.throws(()=>saveDocument(db,{id:'other',role:'member'},{title:'Changed',content:'x'},first.id),/作者/);
  assert.throws(()=>saveDocument(db,{id:'pi',role:'pi'},{title:'Changed',content:'x'},first.id),/只读/);
  assert.throws(()=>saveDocument(db,member,{title:'Changed',content:'x',categoryKey:'wet/cells',facets:{generation:['second']}},first.id),/不匹配/);
  assert.throws(()=>saveDocument(db,member,{title:'Changed',content:'x',facets:{breadth:['fake']}},first.id),/无效/);
  assert.equal(getDocument(db,member,first.id).title,'WGS');
  const next=saveDocument(db,member,{title:'WGS revised',content:'New',baseRevision:0},first.id);
  assert.equal(next.revision,1);assert.deepEqual(next.aliases,['全基因组','WGS']);assert.deepEqual(next.tags,['细菌']);
  assert.throws(()=>saveDocument(db,member,{title:'Stale',content:'Lost',baseRevision:0},first.id),/其他成员/);
  assert.equal(getDocument(db,member,first.id).content,'New');
  saveDocument(db,{id:'admin',role:'admin'},{title:'WGS revised',content:'New',archived:true,baseRevision:1},first.id);
  assert.equal(listDocuments(db,member,{activeOnly:true}).length,0);assert.equal(getDocument(db,member,first.id).archived,true);assert.equal(getDocument(db,{id:'pi',role:'pi'},first.id).can_edit,false);
  assert.equal(getDocument(db,member,first.id).author_id,'member');
 }finally{db.close();}
});
test('every family has independent views and the catalogue contains no experiment-design section',()=>{
 assert.ok(!catalogCategories.some(c=>c.name.includes('实验设计')));
 assert.ok(!catalogCategories.some(c=>c.key==='wet'||c.key==='dry'));
 assert.ok(catalogCategories.filter(c=>c.parentKey).every(c=>c.key.startsWith(c.parentKey+'/')));
 assert.ok(catalogCategories.find(c=>c.key==='cells')?.parentKey===null);
 const seq=catalogCategories.find(c=>c.key==='bio/sequencing')!;
 assert.ok(seq.axes.find(a=>a.key==='generation')!.values.some(v=>v.key==='second'));
 assert.ok(seq.axes.find(a=>a.key==='breadth')!.values.some(v=>v.key==='genome'));
 assert.ok(!seq.axes.find(a=>a.key==='generation')!.values.some(v=>v.label.includes('WGS')));
});
