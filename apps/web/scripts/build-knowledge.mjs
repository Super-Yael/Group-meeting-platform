import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createCipheriv,randomBytes,createHash} from 'node:crypto';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
const parser=unified().use(remarkParse).use(remarkGfm),text=n=>n.value??(n.children||[]).map(text).join('');
const slug=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
function headings(body,id){const result=[],counts=new Map();function walk(n){if(n.type==='heading'){const value=text(n),s=slug(value),count=(counts.get(s)||0)+1;counts.set(s,count);result.push({text:value,depth:n.depth,id:`method-${id}-${s}${count>1?'-'+count:''}`,offset:n.position.start.offset});}for(const c of n.children||[])walk(c);}walk(parser.parse(body));return result;}
const sectionNames=['导读','环境安装','Unix 命令行','脚本编写','统计基础','数据来源','数据格式','数据可视化','序列本体','基因本体','可重复研究','测序仪器','测序数据','质量控制','模式匹配','序列比对','BLAST','短读段比对','SAM / BAM 格式','基因组变异','变异检测','RNA-seq 分析','ChIP-seq 分析','Ming Tang 的 ChIP-seq 教程','序列组装','宏基因组学','附录','Zika RNA-seq 实例'];
export async function buildKnowledge({contentDir=process.env.TEAM_DOC_DIR,outDir=path.join(web,'out/knowledge'),dataKey=process.env.DOCS_DATA_KEY}={}){
 if(!dataKey||Buffer.from(dataKey,'base64').length!==32)throw new Error('DOCS_DATA_KEY must be a 32-byte base64 secret');
 let temp;
 try{
  if(!contentDir){
   if(!process.env.DOCS_DEPLOY_KEY)throw new Error('Configure TEAM_DOC_DIR locally or DOCS_DEPLOY_KEY in Pages');
   temp=fs.mkdtempSync(path.join(os.tmpdir(),'mm-private-docs-'));const keyFile=path.join(temp,'deploy-key');fs.writeFileSync(keyFile,process.env.DOCS_DEPLOY_KEY.trim()+'\n',{mode:0o600});
   const known=path.join(web,'scripts/github-known-hosts');
   execFileSync('git',['clone','--quiet','--depth','1','--branch','main','ssh://git@ssh.github.com:443/Super-Yael/team_doc.git',path.join(temp,'source')],{env:{...process.env,GIT_SSH_COMMAND:`ssh -i ${quote(keyFile)} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${quote(known)}`},stdio:['ignore','pipe','pipe']});
   contentDir=path.join(temp,'source');
  }
  contentDir=path.resolve(contentDir);const book=path.join(contentDir,'handbooks/biostar');
  const manifest=JSON.parse(fs.readFileSync(path.join(book,'source-manifest.json'),'utf8')),status=JSON.parse(fs.readFileSync(path.join(book,'translation-status.json'),'utf8'));
  if(status.completedSegments!==status.segments||status.chapters!==manifest.chapters.length)throw new Error('The full translation must be complete before publication');
  const revision=fs.existsSync(path.join(contentDir,'.git'))?execFileSync('git',['-C',contentDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim():'local-review';
  const categories=[{key:'biostar',name:'Biostar 中文手册',parentKey:null,description:'按原文章节阅读生物信息学基础、测序与数据分析。',axes:[]}];
  const folders=[...new Set(manifest.chapters.map(p=>p.section))];
  folders.forEach((folder,index)=>categories.push({key:'biostar/'+folder,name:sectionNames[index]||folder,parentKey:'biostar',description:'',axes:[]}));
  const pages=[...manifest.chapters].sort((a,b)=>(a.order??a.id)-(b.order??b.id)),documents=[],bodies=new Map(),anchors=new Map();
  const byPath=new Map(pages.map(p=>[p.key,p])),bySource=new Map(pages.map(p=>[new URL(p.source).pathname.split('/').at(-1),p]));
  for(const [order,page] of pages.entries()){
   const filename=path.join(book,'zh',page.key);let content=fs.readFileSync(filename,'utf8');
   const zhHead=headings(content,page.id),enHead=headings(fs.readFileSync(path.join(book,'en',page.key),'utf8'),page.id);
   if(zhHead.length!==enHead.length)throw new Error('Heading structure changed: '+page.key);
   const title=zhHead[0]?.text||page.title;let removed=false;
   if(/^#\s/.test(content)){content=content.replace(/^# [^\n]*\n\s*/, '');removed=true;}
   const bodyHead=headings(content,page.id),aliases=new Map();
   enHead.forEach((h,i)=>{const target=removed?(i===0?'method-page-title':bodyHead[i-1]?.id):bodyHead[i]?.id;if(target){aliases.set(slug(h.text),target);const original=page.originalHeadings?.[i]?.anchor;if(original)aliases.set(original,target);}});anchors.set(page.id,aliases);
   const first=parser.parse(content).children.find(n=>n.type==='paragraph'&&text(n).trim());
   const summary=first?text(first).replace(/\s+/g,' ').slice(0,200):'查看本章完整内容。';
   documents.push({id:page.id,title,category:'Biostar 中文手册 / '+(sectionNames[folders.indexOf(page.section)]||page.section),category_key:'biostar/'+page.section,category_path:'Biostar 中文手册 / '+(sectionNames[folders.indexOf(page.section)]||page.section),content:'',summary,aliases:[page.title],tags:[],facets:{},archived:false,author_id:'',author_name:'',updated_at:status.translatedAt,collection:'biostar',order,body_url:`/knowledge/docs/${page.id}.json`,source_path:'handbooks/biostar/zh/'+page.key});
   bodies.set(page.id,content);
  }
  const assetMap=new Map(),assets=[];
  for(const name of fs.readdirSync(path.join(book,'assets'))){
   const data=fs.readFileSync(path.join(book,'assets',name)),ext=path.extname(name).toLowerCase();if(!['.png','.jpg','.jpeg','.gif'].includes(ext))continue;
   const target='/knowledge/assets/biostar/'+createHash('sha256').update(data).digest('hex').slice(0,24)+ext;assetMap.set(name,target);if(!assets.some(a=>a.path===target))assets.push({path:target,data});
  }
  let localLinks=0;
  function rewrite(href,page,image=false){
   if(href.startsWith('/knowledge/'))return href;
   if(image){const name=decodeURIComponent(href.split('/').at(-1)?.split('?')[0]||'');const asset=assetMap.get(name);if(!asset)throw new Error('Missing local image: '+href);return asset;}
   if(href.startsWith('#')){const old=decodeURIComponent(href.slice(1));return '#'+encodeURIComponent(anchors.get(page.id)?.get(old)||old);}
   if(/^(https?:|mailto:|ftp:)/i.test(href))return href;
   const [raw,fragment]=href.split('#'),resolved=new URL(raw,'https://book.invalid/'+page.key),key=decodeURIComponent(resolved.pathname.slice(1));
   let target=byPath.get(key)||bySource.get(key.split('/').at(-1)?.replace(/\.md$/,'.html'));
   if(key.startsWith('extra/the-biostar-handbook'))target=bySource.get('index.html');
   if(target){localLinks++;const anchor=fragment?(anchors.get(target.id)?.get(decodeURIComponent(fragment))||decodeURIComponent(fragment)):'';return `?view=documents&doc=${target.id}${anchor?'#'+encodeURIComponent(anchor):''}`;}
   if(/\.(md|html)(?:\?|$)/.test(raw))return new URL(raw.replace(/\.md(?=\?|$)/,'.html'),page.source).href;
   return href;
  }
  for(const page of pages){let body=bodies.get(page.id);const changes=[];
   function walk(n){if(['link','image'].includes(n.type)){
    const href=rewrite(n.url,page,n.type==='image');if(href!==n.url){const raw=body.slice(n.position.start.offset,n.position.end.offset),i=raw.lastIndexOf('](');if(i>=0)changes.push({start:n.position.start.offset+i+2,end:n.position.end.offset-1,text:href+(n.title?' '+JSON.stringify(n.title):'')});}
   }for(const c of n.children||[])walk(c);}walk(parser.parse(body));
   for(const change of changes.sort((a,b)=>b.start-a.start))body=body.slice(0,change.start)+change.text+body.slice(change.end);
   bodies.set(page.id,body);
  }
  const policyId=90000,policyFile='governance/usage-and-confidentiality.md';let policy=fs.readFileSync(path.join(contentDir,policyFile),'utf8');const policyTitle=policy.split('\n')[0].replace(/^#\s+/,'');policy=policy.replace(/^# [^\n]*\n\s*/,'');
  documents.push({id:policyId,title:policyTitle,category:'使用与保密声明',category_key:'policy',category_path:'使用与保密声明',content:'',summary:'仅限授权成员内部学习和研究；参考来源、可用性及保密要求集中列明。',aliases:['保密协议','使用限制','版权'],tags:[],facets:{},archived:false,author_id:'',author_name:'',updated_at:status.translatedAt,collection:'governance',order:99999,body_url:`/knowledge/docs/${policyId}.json`,source_path:policyFile});bodies.set(policyId,policy);
  assets.push({path:'/knowledge/assets/governance/confidentiality-agreement.pdf',data:fs.readFileSync(path.join(contentDir,'governance/assets/confidentiality-agreement.pdf'))});
  fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});const key=Buffer.from(dataKey,'base64');let bytes=0,files=0;
  function write(resource,data){
   const clear=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data));const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(resource));const encrypted=Buffer.concat([Buffer.from('MLD1'),nonce,cipher.update(clear),cipher.final(),cipher.getAuthTag()]);
   const filename=path.join(outDir,resource.slice('/knowledge/'.length)+'.bin');fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,encrypted);bytes+=encrypted.length;files++;
  }
  write('/knowledge/catalog.json',{version:revision,categories,documents,policyId,chapterCount:pages.length,sectionCount:folders.length});
  write('/knowledge/search.json',documents.map(d=>({id:d.id,content:bodies.get(d.id)})));
  for(const doc of documents)write(doc.body_url,{id:doc.id,content:bodies.get(doc.id)});
  for(const asset of assets)write(asset.path,asset.data);
  const result={documents:documents.length,bookChapters:pages.length,sections:folders.length,media:assets.length-1,pdf:1,localLinks,encryptedFiles:files,encryptedBytes:bytes,contentRevision:revision};console.log(JSON.stringify(result));return result;
 }finally{if(temp)fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildKnowledge().catch(error=>{console.error(error.message);process.exitCode=1;});
