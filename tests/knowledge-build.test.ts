import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDecipheriv,randomBytes} from 'node:crypto';
// @ts-expect-error The build entry point is a Node ES module.
import {buildKnowledge} from '../apps/web/scripts/build-knowledge.mjs';
import {issueKnowledgeCookie,serveKnowledge} from '../apps/web/lib/knowledge-edge';
import {documentHeadings,filterDocuments,resolveDocumentRoute,type MethodCatalog} from '../apps/web/lib/method-docs';

function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'topic-docs-')),source=path.join(dir,'source'),out=path.join(dir,'out'),key=randomBytes(32);
 const write=(file:string,value:string|Buffer)=>{const target=path.join(source,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);};
 const json=(file:string,value:unknown)=>write(file,JSON.stringify(value));
 json('taxonomy.json',{version:2,categories:[{key:'bio',name:'生物信息学',parentKey:null,axes:[],description:''},{key:'bio/sequencing',name:'测序',parentKey:'bio',axes:[],description:''},{key:'cells',name:'细胞实验',parentKey:null,axes:[],description:''}]});
 json('catalog.json',{schema:2,policy:{id:90000,file:'governance/usage-and-confidentiality.md'},documents:[{id:1,title:'测序方法',category_key:'bio/sequencing',file:'content/bio/sequencing/method.md',order:0,aliases:['NGS'],source_ids:[1,2],kind:'guide'},{id:51,title:'细胞培养',category_key:'cells',file:'content/cells/culture.md',order:1,aliases:[],kind:'guide'}]});
 json('redirects.json',{documents:{2:1,3:null},categories:{'wet/sequencing':'bio/sequencing',wet:''},anchors:{'2#old-section':{id:1,hash:'method-1-章节'}}});
 write('content/bio/sequencing/method.md','# 测序方法\n\n完整方法摘要。\n\n## 章节\n\n[![流程](/assets/pixel.svg)](?view=documents&doc=2#old-section)\n\n```bash\necho "keep code unchanged"\n```\n\n[细胞培养](?view=documents&doc=51)\n');
 write('content/cells/culture.md','# 细胞培养\n\n培养方法。\n');
 write('assets/pixel.svg','<svg xmlns="http://www.w3.org/2000/svg"></svg>');
 write('governance/usage-and-confidentiality.md','# 使用与来源说明\n\nCopyright notice only on this final page.\n\n[协议](/knowledge/assets/governance/confidentiality-agreement.pdf)\n');
 write('governance/assets/confidentiality-agreement.pdf','%PDF-fixture');
 const read=(resource:string)=>{
  const bytes=fs.readFileSync(path.join(out,resource.slice('/knowledge/'.length)+'.bin'));assert.equal(bytes.subarray(0,4).toString(),'MLD1');
  const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(4,16));decipher.setAAD(Buffer.from(resource));decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(16,-16)),decipher.final()]);
 };
 return {dir,source,out,key,write,json,read,build:()=>buildKnowledge({contentDir:source,outDir:out,dataKey:key.toString('base64')})};
}

test('topic build emits only canonical pages, preserves code/media/anchors and keeps source notices out of search',async()=>{
 const f=fixture();try{
  const result=await f.build();assert.equal(result.documents,2);assert.equal(result.policy,1);assert.equal(result.media,1);
  const catalog=JSON.parse(f.read('/knowledge/catalog.json').toString()) as MethodCatalog;
  assert.deepEqual(catalog.documents.map(d=>d.id),[1,51,90000]);assert.equal(catalog.categories.find(c=>c.key==='bio/sequencing')!.parentKey,'bio');
  assert.ok(catalog.documents.every(d=>d.content===''));assert.equal(catalog.documents[0].summary,'完整方法摘要。');
  assert.ok(catalog.documents.every(d=>!Object.hasOwn(d,'book_key')&&!Object.hasOwn(d,'source_ids')));
  assert.equal(fs.existsSync(path.join(f.out,'catalog.json')),false);
  assert.equal(fs.existsSync(path.join(f.out,'docs/2.json.bin')),false,'merged pages are mappings, not duplicate bodies');
  const body=JSON.parse(f.read('/knowledge/docs/1.json').toString()).content;
  assert.match(body,/echo "keep code unchanged"/);assert.match(body,/\?view=documents&doc=1#method-1-/);
  const image=/\]\((\/knowledge\/assets\/[a-f0-9]{24}\.svg)\)/.exec(body)![1];assert.equal(f.read(image).toString(),'<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  assert.equal(documentHeadings(body,1)[0].id,'method-1-章节');
  const search=JSON.parse(f.read('/knowledge/search.json').toString());assert.deepEqual(search.map((r:any)=>r.id),[1,51]);assert.doesNotMatch(JSON.stringify(search),/Copyright/);
  assert.equal(filterDocuments(catalog.documents.filter(d=>d.id!==90000),'NGS',catalog.categories).length,1);
  assert.deepEqual(resolveDocumentRoute(catalog,2,'wet/sequencing','old-section'),{id:1,category:'bio/sequencing',hash:'method-1-章节'});
  assert.equal(resolveDocumentRoute(catalog,3,'').id,3,'removed exercises show the removed-page state');
  const request=new Request('https://preview.example'+image,{headers:{Cookie:'mm_session=fixture'}}),proof=await issueKnowledgeCookie(request,{id:'pi',role:'pi'},'fixture-access-key');
  const response=await serveKnowledge(new Request(request,{headers:{Cookie:'mm_session=fixture; '+proof.split(';')[0]}}),{DOCS_ACCESS_SECRET:'fixture-access-key',DOCS_DATA_KEY:f.key.toString('base64'),ASSETS:{fetch:async(r:Request)=>new Response(fs.readFileSync(path.join(f.out,new URL(r.url).pathname.slice('/knowledge/'.length))))}});
  assert.equal(response.status,200);assert.equal(await response.text(),f.read(image).toString());
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('working-tree edits change the catalogue version while identical inputs retain the same version',async()=>{
 const f=fixture();try{
  await f.build();const before=JSON.parse(f.read('/knowledge/catalog.json').toString()).version;
  await f.build();assert.equal(JSON.parse(f.read('/knowledge/catalog.json').toString()).version,before);
  f.write('content/cells/culture.md','# 细胞培养\n\n新的培养说明。\n');await f.build();assert.notEqual(JSON.parse(f.read('/knowledge/catalog.json').toString()).version,before);
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('Git-tracked reference notes and attachments never enter published knowledge or its content version',async()=>{
 const f=fixture();try{
  const before=await f.build(),catalogBefore=JSON.parse(f.read('/knowledge/catalog.json').toString());
  const filesBefore=fs.readdirSync(f.out,{recursive:true}).toSorted();
  const marker='REFERENCE_ONLY_BIOTREE_NOTE';
  f.write('references/biotree/README.md',`# The Biostar Handbook\n\n${marker}\n\nCopyright source notes.\n\n## 家庭作业\n\n仅供记录。\n`);
  f.write('references/biotree/assets/private.svg',`<svg>${marker}</svg>`);
  f.json('references/biotree/catalog.json',{documents:[{id:99999,title:marker}]});
  const after=await f.build(),catalog=JSON.parse(f.read('/knowledge/catalog.json').toString());
  assert.equal(after.contentRevision,before.contentRevision);
  assert.deepEqual(catalog,catalogBefore);
  assert.equal(after.documents,before.documents);assert.equal(after.media,before.media);
  assert.deepEqual(fs.readdirSync(f.out,{recursive:true}).toSorted(),filesBefore);
  const published=[f.read('/knowledge/catalog.json').toString(),f.read('/knowledge/search.json').toString(),...catalog.documents.map((d:any)=>f.read(d.body_url).toString())].join('\n');
  assert.ok(!published.includes(marker));assert.ok(!published.includes('references/biotree'));
 }finally{fs.rmSync(f.dir,{recursive:true,force:true});}
});

test('broken topics, references, teaching content and shadowing redirects fail before replacing output',async()=>{
 const cases=[
  (f:ReturnType<typeof fixture>)=>f.json('redirects.json',{documents:{1:51},categories:{},anchors:{}}),
  (f:ReturnType<typeof fixture>)=>f.write('content/cells/culture.md','# 细胞培养\n\n[missing](?view=documents&doc=999)\n'),
  (f:ReturnType<typeof fixture>)=>f.write('content/cells/culture.md','# 细胞培养\n\n[missing heading](?view=documents&doc=1#missing)\n'),
  (f:ReturnType<typeof fixture>)=>f.write('content/cells/culture.md','# 细胞培养\n\n## 家庭作业\n\n提交要求。\n'),
  (f:ReturnType<typeof fixture>)=>{const c=JSON.parse(fs.readFileSync(path.join(f.source,'catalog.json'),'utf8'));c.documents[0].summary='The Biostar Handbook';f.json('catalog.json',c);},
  (f:ReturnType<typeof fixture>)=>f.json('taxonomy.json',{version:2,categories:[{key:'a',parentKey:'b',name:'a',axes:[]},{key:'b',parentKey:'a',name:'b',axes:[]}]}),
 ];
 for(const mutate of cases){const f=fixture();try{fs.mkdirSync(f.out);fs.writeFileSync(path.join(f.out,'previous-build'),'keep');mutate(f);await assert.rejects(f.build());assert.equal(fs.readFileSync(path.join(f.out,'previous-build'),'utf8'),'keep');}finally{fs.rmSync(f.dir,{recursive:true,force:true});}}
});
