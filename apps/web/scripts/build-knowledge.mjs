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
const canonical=url=>{const u=new URL(url);u.hash='';u.search='';u.pathname=u.pathname.replace(/\/index\.html$/,'/').replace(/\/$/,'');return u.href.replace(/\/$/,'');};
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
  contentDir=path.resolve(contentDir);const revision=fs.existsSync(path.join(contentDir,'.git'))?execFileSync('git',['-C',contentDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim():'local-review';
  const root=path.join(contentDir,'handbooks'),more=path.join(root,'books.json');
  const books=[{key:'biostar',title:'Biostar 中文手册'},...(fs.existsSync(more)?JSON.parse(fs.readFileSync(more,'utf8')).books:[])];
  const categories=[{key:'bio',name:'生物信息学',parentKey:null,description:'生物信息学手册、课程与计算分析。',axes:[]}],documents=[],bodies=new Map(),anchors=new Map(),entries=[],assets=[],byUrl=new Map(),assetsByBook=new Map();
  function addAsset(data,ext){const resource='/knowledge/assets/biostar/'+createHash('sha256').update(data).digest('hex').slice(0,24)+ext;if(!assets.some(a=>a.path===resource))assets.push({path:resource,data});return resource;}
  for(const info of books){
   const book=path.join(root,info.key),manifest=JSON.parse(fs.readFileSync(path.join(book,'source-manifest.json'),'utf8')),status=JSON.parse(fs.readFileSync(path.join(book,'translation-status.json'),'utf8'));
   if(status.completedSegments!==status.segments||status.chapters!==manifest.chapters.length)throw new Error('The full translation must be complete before publication: '+info.key);
   const bookKey='bio/'+info.key,folders=manifest.sections||[...new Set(manifest.chapters.map(p=>p.section))].map((key,index)=>({key,name:sectionNames[index]||key}));
   categories.push({key:bookKey,name:info.title,parentKey:'bio',description:'按原文目录阅读。',axes:[]});
   folders.forEach(folder=>categories.push({key:bookKey+'/'+folder.key,name:folder.name,parentKey:bookKey,description:'',axes:[]}));
   const media=new Map(),assetDir=path.join(book,'assets');for(const name of fs.existsSync(assetDir)?fs.readdirSync(assetDir):[]){const ext=path.extname(name).toLowerCase();if(!['.png','.jpg','.jpeg','.gif','.svg'].includes(ext))continue;media.set(name,addAsset(fs.readFileSync(path.join(assetDir,name)),ext));}assetsByBook.set(info.key,media);
   const pages=[...manifest.chapters].sort((a,b)=>(a.order??a.id)-(b.order??b.id));
   for(const [order,page] of pages.entries()){
    let content=fs.readFileSync(path.join(book,'zh',page.key),'utf8');const english=fs.readFileSync(path.join(book,'en',page.key),'utf8');
    const zhHead=headings(content,page.id),enHead=headings(english,page.id);if(zhHead.length!==enHead.length)throw new Error('Heading structure changed: '+info.key+'/'+page.key);
    const title=zhHead[0]?.text||page.title;let removed=false;if(/^#\s/.test(content)){content=content.replace(/^# [^\n]*\n\s*/, '');removed=true;}
    const bodyHead=headings(content,page.id),aliases=new Map();enHead.forEach((h,i)=>{const target=removed?(i===0?'method-page-title':bodyHead[i-1]?.id):bodyHead[i]?.id;if(target){aliases.set(slug(h.text),target);const original=page.originalHeadings?.[i]?.anchor;if(original)aliases.set(original,target);}});anchors.set(page.id,aliases);
    const section=folders.find(f=>f.key===page.section),category=section?.name||page.section,first=parser.parse(content).children.find(n=>n.type==='paragraph'&&text(n).trim());
    documents.push({id:page.id,title,category:info.title+' / '+category,category_key:bookKey+'/'+page.section,category_path:'生物信息学 / '+info.title+' / '+category,content:'',summary:first?text(first).replace(/\s+/g,' ').slice(0,200):'查看本章完整内容。',aliases:[page.title],tags:[],facets:{},archived:false,author_id:'',author_name:'',updated_at:status.translatedAt,collection:'handbook',book_key:info.key,order,body_url:`/knowledge/docs/${page.id}.json`,source_path:`handbooks/${info.key}/zh/${page.key}`});
    bodies.set(page.id,content);const entry={...page,book:info.key};entries.push(entry);if(page.source&&!byUrl.has(canonical(page.source)))byUrl.set(canonical(page.source),entry);
   }
  }
  const rnaHome=documents.filter(d=>d.book_key==='rna-seq-by-example').sort((a,b)=>a.order-b.order)[0];
  const rnaStub=documents.find(d=>d.book_key==='biostar'&&d.source_path.endsWith('/xxii-rna-seq-analysis/rna-seq-by-example.md'));
  if(rnaHome&&rnaStub)rnaStub.redirect_to=rnaHome.id;
  const byPath=new Map(entries.map(p=>[p.book+'\0'+p.key,p]));let localLinks=0;
  function rewrite(href,page,image=false){
   if(href.startsWith('/knowledge/'))return href;
   if(image){
    if(/^data:image\/svg\+xml;base64,/i.test(href))return addAsset(Buffer.from(href.split(',')[1],'base64'),'.svg');
    if(/^https?:/i.test(href)){const name=decodeURIComponent(new URL(href).pathname.split('/').at(-1));const match=[...assetsByBook.values()].flatMap(m=>[...m.entries()]).find(([n])=>n.endsWith('-'+name));if(match)return match[1];return href;}
    const name=decodeURIComponent(href.split('/').at(-1)?.split('?')[0]||'');const asset=assetsByBook.get(page.book)?.get(name);if(!asset)throw new Error('Missing local image: '+page.book+' / '+href);return asset;
   }
   if(href.startsWith('#')){const old=decodeURIComponent(href.slice(1));return '#'+encodeURIComponent(anchors.get(page.id)?.get(old)||old);}
   if(/^(mailto:|ftp:)/i.test(href))return href;
   let target;try{const resolved=new URL(href,page.source);target=byUrl.get(canonical(resolved.href));}catch{}
   const [raw,fragment]=href.split('#');if(!target&&!/^(https?:|\/)/i.test(raw)){const key=decodeURIComponent(new URL(raw,'https://book.invalid/'+page.key).pathname.slice(1));target=byPath.get(page.book+'\0'+key);}
   if(target){localLinks++;const anchor=fragment?(anchors.get(target.id)?.get(decodeURIComponent(fragment))||decodeURIComponent(fragment)):'';return `?view=documents&doc=${target.id}${anchor?'#'+encodeURIComponent(anchor):''}`;}
   if(!/^(https?:|\/)/i.test(raw)&&/\.(md|html)(?:\?|$)/.test(raw))return new URL(raw.replace(/\.md(?=\?|$)/,'.html'),page.source).href;
   return href;
  }
  for(const page of entries){let body=bodies.get(page.id),changes=[];
   function walk(n){if(['link','image'].includes(n.type)){const href=rewrite(n.url,page,n.type==='image');if(href!==n.url){const raw=body.slice(n.position.start.offset,n.position.end.offset),i=raw.lastIndexOf('](');if(i>=0)changes.push({start:n.position.start.offset+i+2,end:n.position.end.offset-1,text:href+(n.title?' '+JSON.stringify(n.title):'')});}}for(const c of n.children||[])walk(c);}walk(parser.parse(body));
   for(const change of changes.sort((a,b)=>b.start-a.start))body=body.slice(0,change.start)+change.text+body.slice(change.end);bodies.set(page.id,body);
  }
  const methodIndex=path.join(contentDir,'methods/index.json');let methodCount=0;
  if(fs.existsSync(methodIndex)){
   const methods=JSON.parse(fs.readFileSync(methodIndex,'utf8'));categories.push(...methods.categories);
   for(const method of methods.documents){if(method.archived)continue;const file=path.join(contentDir,'methods',method.file);const body=fs.readFileSync(file,'utf8');const {file:_,...metadata}=method;documents.push({...metadata,content:'',author_id:'',author_name:'',collection:'methods',order:method.id,body_url:`/knowledge/docs/${method.id}.json`,source_path:'methods/'+method.file});bodies.set(method.id,body);methodCount++;}
  }
  const policyId=90000,policyFile='governance/usage-and-confidentiality.md';let policy=fs.readFileSync(path.join(contentDir,policyFile),'utf8');const policyTitle=policy.split('\n')[0].replace(/^#\s+/,'');policy=policy.replace(/^# [^\n]*\n\s*/,'');
  documents.push({id:policyId,title:policyTitle,category:'使用与保密声明',category_key:'policy',category_path:'使用与保密声明',content:'',summary:'仅限授权成员内部学习和研究；参考来源、可用性及保密要求集中列明。',aliases:['保密协议','使用限制','版权'],tags:[],facets:{},archived:false,author_id:'',author_name:'',collection:'governance',order:99999,body_url:`/knowledge/docs/${policyId}.json`,source_path:policyFile});bodies.set(policyId,policy);
  assets.push({path:'/knowledge/assets/governance/confidentiality-agreement.pdf',data:fs.readFileSync(path.join(contentDir,'governance/assets/confidentiality-agreement.pdf'))});
  fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});const key=Buffer.from(dataKey,'base64');let bytes=0,files=0;
  function write(resource,data){const clear=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data)),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(resource));const encrypted=Buffer.concat([Buffer.from('MLD1'),nonce,cipher.update(clear),cipher.final(),cipher.getAuthTag()]);const filename=path.join(outDir,resource.slice('/knowledge/'.length)+'.bin');fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,encrypted);bytes+=encrypted.length;files++;}
  write('/knowledge/catalog.json',{version:revision,categories,documents,policyId,chapterCount:entries.length,sectionCount:categories.filter(c=>c.parentKey?.startsWith('bio/')).length,bookCount:books.length,methodCount});write('/knowledge/search.json',documents.map(d=>({id:d.id,content:bodies.get(d.id)})));
  for(const doc of documents)write(doc.body_url,{id:doc.id,content:bodies.get(doc.id)});for(const asset of assets)write(asset.path,asset.data);
  const result={documents:documents.length,bookChapters:entries.length,books:books.length,methods:methodCount,media:assets.length-1,pdf:1,localLinks,encryptedFiles:files,encryptedBytes:bytes,contentRevision:revision};console.log(JSON.stringify(result));return result;
 }finally{if(temp)fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildKnowledge().catch(error=>{console.error(error.message);process.exitCode=1;});
