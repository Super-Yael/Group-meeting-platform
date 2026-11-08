'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,Copy,ExternalLink,Search,X,ChevronRight,FileText} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {MethodMarkdown} from '@/components/method-markdown';
import {loadKnowledge,loadKnowledgeBody,loadKnowledgeSearch} from '@/lib/knowledge-client';
import {categoryTrail,documentHeadings,documentsInCategory,filterDocuments,type MethodCatalog,type MethodDocument} from '@/lib/method-docs';
import './method-library.css';
type Props={user:{id:string;name:string;role:string};readOnly:boolean;onDirtyChange:(dirty:boolean)=>void};
function route(){const p=new URLSearchParams(location.search),id=p.get('doc');return {id:id&&/^\d+$/.test(id)?Number(id):null,category:p.get('category')||'',query:p.get('q')||''};}
export function MethodLibrary({user,readOnly,onDirtyChange}:Props){
 const [catalog,setCatalog]=useState<MethodCatalog>({categories:[],documents:[]}),[selectedId,setSelectedId]=useState<number|null>(null),[categoryKey,setCategoryKey]=useState(''),[query,setQuery]=useState('');
 const [loading,setLoading]=useState(true),[loadingBody,setLoadingBody]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[activeHeading,setActiveHeading]=useState(''),[searchLoaded,setSearchLoaded]=useState(false),[searchLoading,setSearchLoading]=useState(false);
 const loadedBodies=useRef(new Set<number>()),directoryRef=useRef<HTMLDetailsElement>(null),outlineRef=useRef<HTMLDetailsElement>(null),titleRef=useRef<HTMLHeadingElement>(null);
 const {categories,documents}=catalog,selected=documents.find(d=>d.id===selectedId),book=documents.filter(d=>d.collection==='biostar');
 const current=categories.find(c=>c.key===(selected?.category_key||categoryKey)),trail=categoryTrail(categories,current?.key||'');
 const policy=documents.find(d=>d.id===(catalog.policyId||90000));
 const scoped=useMemo(()=>documentsInCategory(documents,categoryKey),[documents,categoryKey]);
 const results=useMemo(()=>filterDocuments(scoped,query,categories),[scoped,query,categories]);
 const ordered=book.toSorted((a,b)=>(a.order||0)-(b.order||0)),position=ordered.findIndex(d=>d.id===selectedId),previous=ordered[position-1],next=ordered[position+1];
 const headings=useMemo(()=>documentHeadings(selected?.content||'',selected?.id||'empty'),[selected?.id,selected?.content]);
 useEffect(()=>{onDirtyChange(false);},[onDirtyChange]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError('');try{const data=await loadKnowledge(signal);if(signal?.aborted)return;loadedBodies.current.clear();setSearchLoaded(false);setCatalog(data);const state=route();setSelectedId(state.id);setCategoryKey(state.category);setQuery(state.query);}catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'文档加载失败');}finally{if(!signal?.aborted)setLoading(false);}
 },[user.id]);
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[load]);
 useEffect(()=>{
  if(loading||!selected||loadedBodies.current.has(selected.id))return;const controller=new AbortController();setLoadingBody(true);setError('');
  loadKnowledgeBody(selected,controller.signal).then(body=>{if(controller.signal.aborted)return;loadedBodies.current.add(body.id);setCatalog(c=>({...c,documents:c.documents.map(d=>d.id===body.id?{...d,content:body.content}:d)}));}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'正文加载失败');}).finally(()=>{if(!controller.signal.aborted)setLoadingBody(false);});
  return()=>controller.abort();
 },[selected?.id,selected?.body_url,catalog.version,loading]);
 useEffect(()=>{
  if(!query||searchLoaded||loading)return;const controller=new AbortController();setSearchLoading(true);
  loadKnowledgeSearch(controller.signal).then(rows=>{if(controller.signal.aborted)return;const index=new Map(rows.map(row=>[row.id,row.content]));setCatalog(c=>({...c,documents:c.documents.map(d=>({...d,search_text:index.get(d.id)||''}))}));setSearchLoaded(true);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'搜索索引加载失败');}).finally(()=>{if(!controller.signal.aborted)setSearchLoading(false);});
  return()=>controller.abort();
 },[!!query,searchLoaded,loading]);
 function urlFor({id=null,category='',q='',hash=''}:{id?:number|null;category?:string;q?:string;hash?:string}={}){const url=new URL(typeof location==='undefined'?'https://local.invalid/':location.href);for(const key of ['doc','category','by','q'])url.searchParams.delete(key);url.searchParams.set('view','documents');if(id)url.searchParams.set('doc',String(id));if(category)url.searchParams.set('category',category);if(q)url.searchParams.set('q',q);url.hash=hash;return url.pathname+url.search+url.hash;}
 function navigate(state:{id?:number|null;category?:string;q?:string;hash?:string},event?:MouseEvent<HTMLAnchorElement>){if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0))return;event?.preventDefault();setSelectedId(state.id||null);setCategoryKey(state.category||'');setQuery(state.q||'');setError('');history.pushState(null,'',urlFor(state));if(directoryRef.current)directoryRef.current.open=false;requestAnimationFrame(()=>titleRef.current?.focus({preventScroll:true}));}
 useEffect(()=>{const restore=()=>{const state=route();setSelectedId(state.id);setCategoryKey(state.category);setQuery(state.query);setError('');};addEventListener('popstate',restore);return()=>removeEventListener('popstate',restore);},[]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>{let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}const target=hash&&document.getElementById(hash);if(target)target.scrollIntoView();else window.scrollTo({top:0,behavior:'instant'});});
  const elements=headings.map(h=>document.getElementById(h.id)).filter((e):e is HTMLElement=>!!e),update=()=>{const h=[...elements].reverse().find(e=>e.getBoundingClientRect().top<=150)||elements[0];if(h)setActiveHeading(h.id);};
  const observer=new IntersectionObserver(update,{rootMargin:'-80px 0px -60% 0px'});elements.forEach(e=>observer.observe(e));update();return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[selectedId,selected?.content,categoryKey,headings]);
 function search(value:string){setSelectedId(null);setQuery(value);setError('');history.replaceState(null,'',urlFor({category:categoryKey,q:value}));}
 function methodLink(doc:MethodDocument){return <a key={doc.id} href={urlFor({id:doc.id})} onClick={e=>navigate({id:doc.id},e)} aria-current={selectedId===doc.id?'page':undefined}>{doc.title}</a>;}
 function directory(mobile=false){return <nav className="method-directory" aria-label={mobile?'移动端文档目录':'文档目录'}><div className="method-directory-heading"><BookOpen size={17}/><strong>团队文档</strong></div>
  <label className="method-search"><Search size={16}/><input type="search" aria-label={mobile?'搜索移动端目录':'搜索文档目录'} placeholder="标题 / 缩写 / 正文" value={query} onChange={e=>search(e.target.value)}/>{query&&<button type="button" aria-label="清除搜索" onClick={()=>search('')}><X size={14}/></button>}</label>
  <a className={`method-all-link ${!selectedId&&!categoryKey?'active':''}`} href={urlFor()} onClick={e=>navigate({},e)}>手册总览<span>{book.length} 篇</span></a>
  {loading?<p className="method-directory-status">正在加载目录…</p>:categories.filter(c=>c.parentKey===null).map(root=><div className="method-book-tree" key={root.key}><a className="method-book-label" href={urlFor({category:root.key})} onClick={e=>navigate({category:root.key},e)}>{root.name}</a>{categories.filter(c=>c.parentKey===root.key).map(c=>{const pages=documentsInCategory(documents,c.key),open=current?.key===c.key;return <details key={c.key} className="method-book-section" open={open}><summary><a href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)} className={open?'active':''}>{c.name}</a><span>{pages.length}</span><ChevronDown size={12}/></summary>{<div className="method-tree-methods">{pages.toSorted((a,b)=>(a.order||0)-(b.order||0)).map(methodLink)}</div>}</details>;})}</div>)}
  {policy&&<a className={`method-policy-nav ${selectedId===policy.id?'active':''}`} href={urlFor({id:policy.id})} onClick={e=>navigate({id:policy.id},e)}><FileText size={15}/>使用与保密声明</a>}
 </nav>;}
 function outline(mobile=false){return <nav aria-label={mobile?'移动端本页章节':'本页章节'} className="method-outline"><p>本页内容</p><ul>{headings.map(h=><li key={h.id} className={h.depth>2?'method-outline-nested':''}><a href={`#${encodeURIComponent(h.id)}`} aria-current={activeHeading===h.id?'location':undefined} onClick={()=>{setActiveHeading(h.id);if(outlineRef.current)outlineRef.current.open=false;}}>{h.text}</a></li>)}</ul><a className="method-top" href="#method-page-title">返回顶部</a></nav>;}
 function rows(pages:MethodDocument[]){return <div className="method-result-list">{pages.map(doc=><a key={doc.id} href={urlFor({id:doc.id})} onClick={e=>navigate({id:doc.id},e)}><div><h3>{doc.title}</h3>{query&&<span className="method-result-path">{doc.category_path}</span>}<p>{doc.summary}</p></div><ChevronRight size={16}/></a>)}</div>;}
 async function copyLink(){try{await navigator.clipboard.writeText(location.href);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('请复制地址栏中的页面链接');}}
 return <div className="method-library"><div className="method-mobile-tools"><details ref={directoryRef}><summary><BookOpen size={17}/>文档目录<ChevronDown size={15}/></summary>{directory(true)}</details></div><div className={`method-layout ${!selected?'method-layout-index':''}`}>
  <aside className="method-sidebar">{directory()}</aside><section className="method-reading" aria-label="团队文档正文">
   {error&&<div role="alert" className="method-message error">{error}<Button onClick={()=>{if(selected){loadedBodies.current.delete(selected.id);}load();}}>重新加载</Button></div>}
   {loading?<div className="method-loading"><div/><div/><div/><p>正在加载文档…</p></div>:selected?<article>
    <nav className="method-breadcrumb" aria-label="页面位置"><a href={urlFor()} onClick={e=>navigate({},e)}>团队文档</a>{trail.map(c=><span key={c.key}><span>/</span><a href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}>{c.name}</a></span>)}</nav>
    <header className="method-article-header"><h1 id="method-page-title" ref={titleRef} tabIndex={-1}>{selected.title}</h1><div className="method-article-meta"><span>{selected.collection==='biostar'?'中文译文':'团队声明'}</span><div className="method-page-actions"><button type="button" onClick={copyLink}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?'已复制':'复制链接'}</span></button>{user.role==='admin'&&!readOnly&&selected.source_path&&<a href={`https://github.com/Super-Yael/team_doc/edit/main/${selected.source_path.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>编辑源文件</a>}</div></div></header>
    {loadingBody&&!selected.content?<div className="method-loading"><div/><div/><div/><p>正在加载正文…</p></div>:<>{!!headings.length&&<details className="method-mobile-outline" ref={outlineRef}><summary>本页内容<ChevronDown size={14}/></summary>{outline(true)}</details>}<MethodMarkdown content={selected.content} documentId={selected.id}/></>}
    {selected.collection==='biostar'&&<nav className="method-pagination" aria-label="相邻文档">{previous?<a href={urlFor({id:previous.id})} onClick={e=>navigate({id:previous.id},e)}><span><ArrowLeft size={15}/>上一篇</span><strong>{previous.title}</strong></a>:<div/>}{next?<a href={urlFor({id:next.id})} onClick={e=>navigate({id:next.id},e)}><span>下一篇<ArrowRight size={15}/></span><strong>{next.title}</strong></a>:<div/>}</nav>}
   </article>:selectedId?<div className="method-empty"><h1 className="page-title">此条目已下线或不存在</h1><p>知识库已切换为 Biostar 中文手册，请从目录查阅。</p><Button onClick={()=>navigate({})}>返回手册总览</Button></div>:<section className="method-index">
    <nav className="method-breadcrumb"><a href={urlFor()} onClick={e=>navigate({},e)}>团队文档</a>{categoryTrail(categories,categoryKey).map(c=><span key={c.key}><span>/</span><a href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}>{c.name}</a></span>)}</nav>
    <header className="method-index-header"><h1 id="method-page-title" ref={titleRef} tabIndex={-1}>{query?'搜索文档':current?.name||'Biostar 中文手册'}</h1><p>{query?`“${query}” · ${searchLoading?'正在检索全文…':`找到 ${results.length} 篇文档`}`:current?.parentKey?`本章 ${scoped.length} 篇文档，按原文顺序阅读。`:`${catalog.sectionCount||0} 章 · ${book.length} 篇正文。涵盖命令行、测序、序列比对、变异、组装与组学分析。`}</p></header>
    <label className="method-main-search"><Search size={19}/><input type="search" aria-label="搜索文档正文" placeholder="搜索，例如 FASTQ、序列比对、RNA-seq" value={query} onChange={e=>search(e.target.value)}/>{query&&<button type="button" aria-label="清除关键词" onClick={()=>search('')}><X size={17}/></button>}</label>
    {query?<>{results.length?rows(results):!searchLoading&&<div className="method-empty"><p>没有找到相关文档。试试中文、英文或工具名称。</p>{categoryKey&&<Button onClick={()=>navigate({q:query})}>搜索全部文档</Button>}</div>}</>:current?.parentKey?rows(scoped.toSorted((a,b)=>(a.order||0)-(b.order||0))):<><div className="method-book-intro"><p>从目录开始，也可以接着阅读上一章。代码、数据示例和原图随正文保留。</p>{ordered[0]&&<a href={urlFor({id:ordered[0].id})} onClick={e=>navigate({id:ordered[0].id},e)}>开始阅读<ArrowRight size={16}/></a>}</div><div className="method-chapter-index">{categories.filter(c=>c.parentKey==='biostar').map((c,i)=><a key={c.key} href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}><div><span>第 {i+1} 章</span><h2>{c.name}</h2><p>{documentsInCategory(documents,c.key).slice(0,2).map(d=>d.title).join(' · ')}</p></div><span>{documentsInCategory(documents,c.key).length} 篇</span><ChevronRight size={16}/></a>)}</div></>}
   </section>}
   {policy&&selectedId!==policy.id&&<footer className="method-library-footer"><span>内部资料 · 仅限授权成员</span><a href={urlFor({id:policy.id})} onClick={e=>navigate({id:policy.id},e)}>团队文档使用、可用性与保密声明</a></footer>}
  </section>{selected&&!!headings.length&&<aside className="method-toc">{outline()}</aside>}
 </div></div>;
}
