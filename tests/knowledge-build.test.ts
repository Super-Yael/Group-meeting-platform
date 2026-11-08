import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createDecipheriv,randomBytes} from 'node:crypto';
// @ts-expect-error The build entry point is a Node ES module.
import {buildKnowledge} from '../apps/web/scripts/build-knowledge.mjs';
import {unified} from 'unified';import remarkParse from 'remark-parse';import remarkGfm from 'remark-gfm';
test('private builds publish ciphertext only and preserve nested linked images, code and cross-chapter anchors',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mm-doc-build-')),book=path.join(dir,'source/handbooks/biostar'),key=randomBytes(32),out=path.join(dir,'output');
 try{
  for(const folder of ['en/i-preface','zh/i-preface','assets'])fs.mkdirSync(path.join(book,folder),{recursive:true});
  fs.mkdirSync(path.join(dir,'source/governance/assets'),{recursive:true});
  const en1='# First\n\n[![cover](../assets/pixel.png)](other.md#section)\n\n```bash\necho "keep code unchanged"\n```\n',zh1='# 第一篇\n\n[![封面](../assets/pixel.png)](other.md#section)\n\n```bash\necho "keep code unchanged"\n```\n',en2='# Other\n\n## Section\n\nReference text.\n',zh2='# 第二篇\n\n## 章节\n\n仅限内部阅读的测试正文。\n';
  for(const [lang,name,body] of [['en','first.md',en1],['zh','first.md',zh1],['en','other.md',en2],['zh','other.md',zh2]])fs.writeFileSync(path.join(book,lang,'i-preface',name),body);
  fs.writeFileSync(path.join(book,'assets/pixel.png'),Buffer.from('unchanged image bytes'));fs.writeFileSync(path.join(dir,'source/governance/assets/confidentiality-agreement.pdf'),'%PDF-test');fs.writeFileSync(path.join(dir,'source/governance/usage-and-confidentiality.md'),'# 使用声明\n\n内部使用。');
  fs.writeFileSync(path.join(book,'source-manifest.json'),JSON.stringify({chapters:[{id:50000,key:'i-preface/first.md',section:'i-preface',source:'https://example.org/first.html',title:'First',order:0},{id:50001,key:'i-preface/other.md',section:'i-preface',source:'https://example.org/other.html',title:'Other',order:1}]}));
  fs.writeFileSync(path.join(book,'translation-status.json'),JSON.stringify({chapters:2,segments:2,completedSegments:2,translatedAt:'2026-11-09'}));
  await buildKnowledge({contentDir:path.join(dir,'source'),outDir:out,dataKey:key.toString('base64')});
  function read(resource:string){const bytes=fs.readFileSync(path.join(out,resource.slice('/knowledge/'.length)+'.bin'));assert.equal(bytes.subarray(0,4).toString(),'MLD1');const d=createDecipheriv('aes-256-gcm',key,bytes.subarray(4,16));d.setAAD(Buffer.from(resource));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(16,-16)),d.final()]);}
  assert.equal(fs.existsSync(path.join(out,'catalog.json')),false);
  const catalog=JSON.parse(read('/knowledge/catalog.json').toString());assert.equal(catalog.documents.length,3);assert.ok(catalog.documents.every((d:any)=>d.content===''));
  const content=JSON.parse(read('/knowledge/docs/50000.json').toString()).content,tree=unified().use(remarkParse).use(remarkGfm).parse(content) as any;
  const nodes:any[]=[];function walk(n:any){nodes.push(n);for(const c of n.children||[])walk(c);}walk(tree);
  const image=nodes.find(n=>n.type==='image'),link=nodes.find(n=>n.type==='link');assert.match(image.url,/^\/knowledge\/assets\/biostar\/[a-f0-9]{24}\.png$/);assert.match(link.url,/^\?view=documents&doc=50001#method-50001-/);assert.equal(read(image.url).toString(),'unchanged image bytes');assert.equal(nodes.find(n=>n.type==='code').value,'echo "keep code unchanged"');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
