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
const parser=unified().use(remarkParse).use(remarkGfm);
const nodeText=n=>n.value??(n.children||[]).map(nodeText).join('');
const slug=s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
const forbidden=/作业|测验|练习题|学生提交|提交要求|版权所有|版权|Copyright|All rights reserved|©|The Biostar Handbook|RNA[- ]Seq by Example|Bioinformatics Scripting|Applied Bioinformatics|FastTrack Bioinformatics|生物信息学手册|生物信息学脚本艺术/i;
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
function walk(n,fn){fn(n);for(const c of n.children||[])walk(c,fn);}
function headingIds(body,id){
 const counts=new Map(),result=new Set(['method-page-title']);
 walk(parser.parse(body),n=>{if(n.type==='heading'){const s=slug(nodeText(n)),count=(counts.get(s)||0)+1;counts.set(s,count);result.add(`method-${id}-${s}${count>1?'-'+count:''}`);}});
 return result;
}
function within(root,file){
 const resolved=path.resolve(root,file);
 if(!resolved.startsWith(root+path.sep))throw new Error('Content path escapes repository: '+file);
 return resolved;
}
function readJson(root,file){return JSON.parse(fs.readFileSync(within(root,file),'utf8'));}
function validateTaxonomy(categories){
 const keys=new Set();
 for(const c of categories){
  if(!c.key||keys.has(c.key)||!c.name||!Array.isArray(c.axes))throw new Error('Invalid or duplicate category: '+c.key);
  keys.add(c.key);
 }
 for(const c of categories){
  if(c.parentKey&&(!keys.has(c.parentKey)||!c.key.startsWith(c.parentKey+'/')))throw new Error('Category hierarchy must match key: '+c.key);
  const seen=new Set([c.key]);let current=c;
  while(current.parentKey){if(seen.has(current.parentKey))throw new Error('Category cycle: '+c.key);seen.add(current.parentKey);current=categories.find(x=>x.key===current.parentKey);}
 }
}
export async function buildKnowledge({contentDir=process.env.TEAM_DOC_DIR,outDir=path.join(web,'out/knowledge'),dataKey=process.env.DOCS_DATA_KEY,syncServer=false}={}){
 if(!dataKey||Buffer.from(dataKey,'base64').length!==32)throw new Error('DOCS_DATA_KEY must be a 32-byte base64 secret');
 let temp;
 try{
  if(!contentDir){
   if(!process.env.DOCS_DEPLOY_KEY)throw new Error('Configure TEAM_DOC_DIR locally or DOCS_DEPLOY_KEY in Pages');
   temp=fs.mkdtempSync(path.join(os.tmpdir(),'mm-private-docs-'));const keyFile=path.join(temp,'deploy-key');
   fs.writeFileSync(keyFile,process.env.DOCS_DEPLOY_KEY.trim()+'\n',{mode:0o600});
   const known=path.join(web,'scripts/github-known-hosts');
   execFileSync('git',['clone','--quiet','--depth','1','--branch','main','ssh://git@ssh.github.com:443/Super-Yael/team_doc.git',path.join(temp,'source')],{env:{...process.env,GIT_SSH_COMMAND:`ssh -i ${quote(keyFile)} -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${quote(known)}`},stdio:['ignore','pipe','pipe']});
   contentDir=path.join(temp,'source');
  }
  contentDir=path.resolve(contentDir);
  // Include working-tree content in the version so local previews cannot reuse a stale search index.
  const catalog=readJson(contentDir,'catalog.json'),taxonomy=readJson(contentDir,'taxonomy.json'),redirects=readJson(contentDir,'redirects.json');
  if(catalog.schema!==2||taxonomy.version!==2)throw new Error('Expected the topic catalogue (schema 2)');
  const categories=taxonomy.categories;validateTaxonomy(categories);
  const catByKey=new Map(categories.map(c=>[c.key,c]));
  const categoryPath=key=>{const c=catByKey.get(key);return c.parentKey?categoryPath(c.parentKey)+' / '+c.name:c.name;};
  const policyId=catalog.policy.id,documents=[],bodies=new Map(),assets=new Map();
  const versionHash=createHash('sha256').update(JSON.stringify({catalog,taxonomy,redirects}));
  const addAsset=(resource,data)=>{if(!assets.has(resource))assets.set(resource,data);};
  const ids=new Set([policyId]);
  for(const entry of catalog.documents){
   if(!Number.isSafeInteger(entry.id)||entry.id<=0||ids.has(entry.id))throw new Error('Invalid or duplicate document ID: '+entry.id);
   ids.add(entry.id);
   if(!catByKey.has(entry.category_key))throw new Error('Unknown category: '+entry.category_key);
   if(categories.some(c=>c.parentKey===entry.category_key))throw new Error('Documents must be stored in a topic leaf: '+entry.id);
   if(!entry.file.startsWith('content/'+entry.category_key+'/'))throw new Error('File does not match document topic: '+entry.id);
   let content=fs.readFileSync(within(contentDir,entry.file),'utf8');
   const root=parser.parse(content),first=root.children[0];
   if(forbidden.test(JSON.stringify([entry.title,entry.summary||'',entry.aliases||[],entry.tags||[]])))throw new Error('Source or teaching metadata in canonical document: '+entry.id);
   walk(root,n=>{if(['text','code','inlineCode'].includes(n.type)&&forbidden.test(n.value||''))throw new Error('Source or teaching text in canonical document: '+entry.id);});
   if(first?.type!=='heading'||first.depth!==1||nodeText(first)!==entry.title)throw new Error('Document title does not match catalogue: '+entry.id);
   content=content.slice(first.position.end.offset).trim()+'\n';
   if(!content.trim())throw new Error('Empty canonical document: '+entry.id);
   const summary=parser.parse(content).children.find(n=>n.type==='paragraph'&&nodeText(n).trim());
   const {file,source_ids,review_status,...metadata}=entry;
   documents.push({...metadata,category:categoryPath(entry.category_key),category_path:categoryPath(entry.category_key),summary:entry.summary|| (summary?nodeText(summary).replace(/\s+/g,' ').slice(0,160):'查看方法、流程与结果解释。'),content:'',collection:'topics',author_id:'',author_name:'',updated_at:'',archived:false,body_url:`/knowledge/docs/${entry.id}.json`,source_path:file});
   bodies.set(entry.id,content);versionHash.update(content);
  }
  let policy=fs.readFileSync(within(contentDir,catalog.policy.file),'utf8');
  const policyHeading=parser.parse(policy).children[0];
  if(policyHeading?.type!=='heading')throw new Error('Missing policy title');
  const policyTitle=nodeText(policyHeading);policy=policy.slice(policyHeading.position.end.offset).trim()+'\n';
  documents.push({id:policyId,title:policyTitle,category:'使用与来源说明',category_key:'policy',category_path:'使用与来源说明',summary:'集中列明参考来源、权利信息与团队资料使用要求。',aliases:[],tags:[],facets:{},content:'',collection:'governance',order:99999,author_id:'',author_name:'',updated_at:'',archived:false,body_url:`/knowledge/docs/${policyId}.json`,source_path:catalog.policy.file});
  bodies.set(policyId,policy);versionHash.update(policy);
  for(const [old,target] of Object.entries(redirects.documents)){
   if(!/^\d+$/.test(old)||ids.has(Number(old)))throw new Error('Redirect shadows canonical document: '+old);
   if(target!==null&&!ids.has(target))throw new Error('Redirect target is missing: '+old);
  }
  for(const [old,target] of Object.entries(redirects.categories))if(target&&!catByKey.has(target))throw new Error('Category redirect target is missing: '+old);
  const anchors=new Map([...bodies].map(([id,body])=>[id,headingIds(body,id)]));
  for(const c of categories){
   if(c.startDocumentId===undefined)continue;
   const start=documents.find(d=>d.id===c.startDocumentId);
   if(!start||!(start.category_key===c.key||start.category_key.startsWith(c.key+'/')))throw new Error('Invalid category start document: '+c.key);
  }
  for(const [key,target] of Object.entries(redirects.anchors)){
   if(!ids.has(target.id)||!anchors.get(target.id).has(target.hash))throw new Error('Invalid legacy heading target: '+key);
  }
  let localLinks=0;
  for(const doc of documents){
   const body=bodies.get(doc.id),changes=[];
   walk(parser.parse(body),n=>{
    if(n.type!=='link'&&n.type!=='image')return;
    let href=n.url;
    if(n.type==='image'&&href.startsWith('/assets/')){
     const name=href.slice('/assets/'.length);if(name.includes('/')||!/^[-\w.]+$/.test(name))throw new Error('Invalid local asset: '+href);
     const data=fs.readFileSync(within(contentDir,'assets/'+name)),resource='/knowledge/assets/'+createHash('sha256').update(data).digest('hex').slice(0,24)+path.extname(name).toLowerCase();addAsset(resource,data);href=resource;
    }else if(n.type==='image'&&/^data:image\/svg\+xml;base64,/i.test(href)){
     const data=Buffer.from(href.split(',')[1],'base64'),resource='/knowledge/assets/'+createHash('sha256').update(data).digest('hex').slice(0,24)+'.svg';addAsset(resource,data);href=resource;
    }else if(n.type==='image'&&!/^(https?:|data:)/i.test(href))throw new Error('Unresolved local image: '+doc.id+' '+href);
    if(n.type==='link'&&href.startsWith('?view=documents')){
     const url=new URL(href,'https://local.invalid'),requested=Number(url.searchParams.get('doc'));
     if(requested){
      const target=Object.hasOwn(redirects.documents,String(requested))?redirects.documents[requested]:requested;
      if(target===null)href='?view=documents';
      else{
       if(!ids.has(target))throw new Error('Missing linked document: '+doc.id+' -> '+requested);
       const fragment=decodeURIComponent(url.hash.slice(1)),alias=redirects.anchors[`${requested}#${fragment}`];
       const hash=alias?.hash||fragment;
       if(hash&&!anchors.get(target).has(hash))throw new Error('Missing linked heading: '+doc.id+' -> '+target+'#'+hash);
       href=`?view=documents&doc=${target}`+(hash&&hash!=='method-page-title'?'#'+encodeURIComponent(hash):'');localLinks++;
      }
     }
    }else if(n.type==='link'&&href.startsWith('#')){
     if(!anchors.get(doc.id).has(decodeURIComponent(href.slice(1))))throw new Error('Missing local heading: '+doc.id+' '+href);
    }else if(n.type==='link'&&!/^(https?:|mailto:|ftp:|\/knowledge\/)/i.test(href))throw new Error('Unresolved relative link: '+doc.id+' '+href);
    if(href!==n.url){
     // Markdown positions refer to the original source; replace only the destination.
     const raw=body.slice(n.position.start.offset,n.position.end.offset),i=raw.lastIndexOf('](');
     if(i<0)throw new Error('Cannot rewrite reference-style local resource: '+doc.id);
     changes.push({start:n.position.start.offset+i+2,end:n.position.end.offset-1,text:href+(n.title?' '+JSON.stringify(n.title):'')});
    }
   });
   let rewritten=body;for(const c of changes.sort((a,b)=>b.start-a.start))rewritten=rewritten.slice(0,c.start)+c.text+rewritten.slice(c.end);bodies.set(doc.id,rewritten);
  }
  const agreement='/knowledge/assets/governance/confidentiality-agreement.pdf';
  addAsset(agreement,fs.readFileSync(within(contentDir,'governance/assets/confidentiality-agreement.pdf')));
  for(const [resource,data] of assets)versionHash.update(resource).update(data);
  const revision=versionHash.digest('hex');
  if(syncServer){
   const generated=path.resolve(web,'../server/src/catalog-taxonomy.generated.ts');
   fs.writeFileSync(generated,'// Generated from team_doc/taxonomy.json. Edit the document repository, then rebuild.\nexport const topicCategories = '+JSON.stringify(categories,null,2)+';\nexport const legacyCategoryKeys = '+JSON.stringify(redirects.categories,null,2)+' as Record<string,string>;\n');
  }
  // Validate everything before replacing a previously working output directory.
  fs.rmSync(outDir,{recursive:true,force:true});fs.mkdirSync(outDir,{recursive:true});
  const key=Buffer.from(dataKey,'base64');let bytes=0,files=0;
  function write(resource,data){
   const clear=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data)),nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(resource));
   const encrypted=Buffer.concat([Buffer.from('MLD1'),nonce,cipher.update(clear),cipher.final(),cipher.getAuthTag()]),filename=path.join(outDir,resource.slice('/knowledge/'.length)+'.bin');
   fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,encrypted);bytes+=encrypted.length;files++;
  }
  write('/knowledge/catalog.json',{version:revision,categories,documents,policyId,documentCount:catalog.documents.length,redirects});
  write('/knowledge/search.json',documents.filter(d=>d.id!==policyId).map(d=>({id:d.id,content:bodies.get(d.id)})));
  for(const doc of documents)write(doc.body_url,{id:doc.id,content:bodies.get(doc.id)});
  for(const [resource,data] of assets)write(resource,data);
  const result={documents:catalog.documents.length,policy:1,topics:categories.length,media:assets.size-1,localLinks,encryptedFiles:files,encryptedBytes:bytes,contentRevision:revision};
  console.log(JSON.stringify(result));return result;
 }finally{if(temp)fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))buildKnowledge({syncServer:true}).catch(error=>{console.error(error.message);process.exitCode=1;});
