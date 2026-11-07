'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,Copy,FilePenLine,Plus,Search,X} from 'lucide-react';
import {api,post,put} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {MethodMarkdown} from '@/components/method-markdown';
import {documentHeadings,filterDocuments,groupDocuments,methodCategories,type MethodDocument} from '@/lib/method-docs';
import './method-library.css';

type Editor={id?:number;title:string;category:string;content:string;baseline:string};
type Props={user:{id:string;name:string;role:string};readOnly:boolean;onDirtyChange:(dirty:boolean)=>void};
const fingerprint=(value:{title:string;category:string;content:string})=>JSON.stringify([value.title,value.category,value.content]);
function requestedDocument(){const value=new URLSearchParams(location.search).get('doc');return value&&/^\d+$/.test(value)?Number(value):null;}

export function MethodLibrary({user,readOnly,onDirtyChange}:Props){
 const [documents,setDocuments]=useState<MethodDocument[]>([]),[selectedId,setSelectedId]=useState<number|null>(null);
 const [query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [editor,setEditor]=useState<Editor|null>(null),[preview,setPreview]=useState(false),[saving,setSaving]=useState(false),[copied,setCopied]=useState(false),[activeHeading,setActiveHeading]=useState('');
 const mobileDirectory=useRef<HTMLDetailsElement>(null),mobileOutline=useRef<HTMLDetailsElement>(null),titleRef=useRef<HTMLHeadingElement>(null);
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const dirty=!!editor&&fingerprint(editor)!==editor.baseline;
 const groups=useMemo(()=>groupDocuments(documents),[documents]);
 const ordered=useMemo(()=>groups.flatMap(g=>g.pages),[groups]);
 const filteredGroups=useMemo(()=>groupDocuments(filterDocuments(documents,query)),[documents,query]);
 const selected=ordered.find(doc=>doc.id===selectedId)||(selectedId===null?ordered[0]:undefined);
 const headings=useMemo(()=>documentHeadings(selected?.content||'',selected?.id||'empty'),[selected]);
 const position=ordered.findIndex(doc=>doc.id===selected?.id),previous=ordered[position-1],next=ordered[position+1];
 const editable=!readOnly&&!!selected&&(user.role==='admin'||selected.author_id===user.id);
 const canWrite=!readOnly&&user.role!=='pi';
 const load=useCallback(async(signal?:AbortSignal)=>{
  setError('');setLoading(true);
  try{const rows=await api<MethodDocument[]>('/api/documents',{signal});if(signal?.aborted)return;setDocuments(rows);setSelectedId(requestedDocument());}
  catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'方法库加载失败');}
  finally{if(!signal?.aborted)setLoading(false);}
 },[user.id]);
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[load]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 const documentUrl=(id:number)=>{const url=new URL(typeof location==='undefined'?'https://local.invalid/':location.href);url.searchParams.set('view','documents');url.searchParams.set('doc',String(id));url.hash='';return url.pathname+url.search;};
 const canLeave=()=>!saving&&(!dirty||window.confirm('此页面尚未保存，离开会放弃修改。继续离开？'));
 useEffect(()=>{
  const restore=()=>{if(dirty&&!window.confirm('此页面尚未保存，离开会放弃修改。继续离开？')){if(selected)history.replaceState(null,'',documentUrl(selected.id));return;}setEditor(null);setSelectedId(requestedDocument());setError('');};
  addEventListener('popstate',restore);return()=>removeEventListener('popstate',restore);
 },[dirty,selected]);
 useEffect(()=>{
  if(editor||!selected)return;
  const frame=requestAnimationFrame(()=>{
   let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}
   const target=hash&&document.getElementById(hash);
   if(target)target.scrollIntoView();else window.scrollTo({top:0,behavior:'instant'});
  });
  const elements=headings.map(h=>document.getElementById(h.id)).filter((el):el is HTMLElement=>!!el);
  const update=()=>{const current=[...elements].reverse().find(el=>el.getBoundingClientRect().top<=150)||elements[0];if(current)setActiveHeading(current.id);};
  const observer=new IntersectionObserver(update,{rootMargin:'-80px 0px -60% 0px'});elements.forEach(el=>observer.observe(el));update();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[selected?.id,selected?.content,editor,headings]);
 function select(doc:MethodDocument,event?:MouseEvent<HTMLAnchorElement>){
  if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0))return;
  event?.preventDefault();if(!canLeave())return;
  setEditor(null);setSelectedId(doc.id);setError('');setNotice('');history.pushState(null,'',documentUrl(doc.id));
  if(mobileDirectory.current)mobileDirectory.current.open=false;
  requestAnimationFrame(()=>titleRef.current?.focus({preventScroll:true}));
 }
 function edit(doc?:MethodDocument){
  if(!canLeave())return;
  const value={id:doc?.id,title:doc?.title||'',category:doc?.category||'实验设计',content:doc?.content||'## 适用场景\n\n\n## 原理与流程\n\n\n## 质量控制\n\n\n## 结果与局限\n\n'};
  setEditor({...value,baseline:fingerprint(value)});setPreview(false);setError('');setNotice('');
  if(mobileDirectory.current)mobileDirectory.current.open=false;window.scrollTo({top:0,behavior:'instant'});
 }
 function cancel(){if(canLeave()){setEditor(null);setError('');}}
 async function save(){
  if(!editor||saving)return;
  if(!editor.title.trim()){setError('请填写页面标题');return;}
  if(editor.title.length>200||editor.category.length>60||editor.content.length>100000){setError('标题最多 200 字，分类最多 60 字，正文最多 100000 字');return;}
  setSaving(true);setError('');
  const value={title:editor.title.trim(),category:editor.category.trim()||'其他',content:editor.content};
  try{
   const result=editor.id?await put(`/api/documents/${editor.id}`,value):await post('/api/documents',value);
   if(!mounted.current)return;
   const id=editor.id||result.id;
   // Preserve the server ID if a save succeeds but the subsequent catalogue refresh fails.
   setEditor({...editor,...value,id,baseline:fingerprint(value)});
   const rows=await api<MethodDocument[]>('/api/documents');if(!mounted.current)return;setDocuments(rows);setSelectedId(id);setEditor(null);setQuery('');
   history.replaceState(null,'',documentUrl(id));setNotice('页面已保存');
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'保存失败，请重试');}finally{if(mounted.current)setSaving(false);}
 }
 async function copyLink(){if(!selected)return;try{await navigator.clipboard.writeText(new URL(documentUrl(selected.id)+location.hash,location.origin).href);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('链接复制失败，请复制浏览器地址栏中的地址');}}
 function directory(mobile=false){return <nav className="method-directory" aria-label={mobile?'移动端方法目录':'实验方法目录'}>
  <div className="method-directory-heading"><BookOpen size={17}/><strong>实验方法</strong></div>
  <label className="method-search"><Search size={16}/><input type="search" aria-label={mobile?'搜索方法目录':'搜索实验方法'} placeholder="搜索方法与关键词" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="清除搜索" onClick={()=>setQuery('')}><X size={14}/></button>}</label>
  {loading?<p className="method-directory-status">正在加载目录…</p>:error&&!documents.length?<div className="method-directory-status"><p>目录加载失败</p><Button onClick={()=>load()}>重新加载</Button></div>:<>
   {query&&<p className="method-directory-status">找到 {filteredGroups.reduce((sum,g)=>sum+g.pages.length,0)} 个页面</p>}
   {filteredGroups.map(group=><div className="method-nav-group" key={group.category}><h2>{group.category}</h2><ul>{group.pages.map(doc=><li key={doc.id}><a href={documentUrl(doc.id)} aria-current={!editor&&selected?.id===doc.id?'page':undefined} onClick={e=>select(doc,e)}>{doc.title}</a></li>)}</ul></div>)}
   {!filteredGroups.length&&<p className="method-directory-status">没有找到相关方法，试试其他关键词。</p>}
  </>}
  {canWrite&&<button type="button" className="method-add" onClick={()=>edit()}><Plus size={16}/>新增页面</button>}
 </nav>}
 function outline(mobile=false){return <nav aria-label={mobile?'移动端本页章节':'本页章节'} className="method-outline"><p>本页内容</p><ul>{headings.map(h=><li key={h.id} className={h.depth>2?'method-outline-nested':''}><a href={`#${encodeURIComponent(h.id)}`} aria-current={activeHeading===h.id?'location':undefined} onClick={()=>{setActiveHeading(h.id);if(mobileOutline.current)mobileOutline.current.open=false;}}>{h.text}</a></li>)}</ul><a className="method-top" href="#method-page-title">返回顶部</a></nav>}
 return <div className="method-library">
  <div className="method-mobile-tools"><details ref={mobileDirectory}><summary><BookOpen size={17}/>方法目录<ChevronDown size={15}/></summary>{directory(true)}</details></div>
  <div className={`method-layout ${editor?'method-layout-editing':''}`}>
   <aside className="method-sidebar">{directory()}</aside>
   <section className="method-reading" aria-label="方法正文">
    {error&&<div role="alert" className="method-message error">{error}</div>}{notice&&<p role="status" className="method-message">{notice}</p>}
    {editor?<section className="method-editor" aria-label="编辑方法页面">
     <div className="method-breadcrumb">实验方法 <span>/</span> {editor.id?'编辑页面':'新增页面'}</div>
     <div className="method-edit-heading"><h1 className="page-title">{editor.id?'编辑页面':'新增页面'}</h1><div className="row-actions"><Button disabled={saving} onClick={cancel}>取消</Button><Button kind="primary" disabled={saving||!dirty} onClick={save}>{saving?'正在保存…':'保存页面'}</Button></div></div>
     <label className="field"><span>页面标题</span><input className="input" disabled={saving} maxLength={200} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></label>
     <label className="field"><span>目录分类</span><input className="input" disabled={saving} list="method-categories" maxLength={60} value={editor.category} onChange={e=>setEditor({...editor,category:e.target.value})}/></label>
     <datalist id="method-categories">{[...new Set([...methodCategories,...documents.map(doc=>doc.category)])].map(category=><option key={category} value={category}/>)}</datalist>
     <div className="method-editor-toolbar"><div className="segment" aria-label="编辑模式"><button type="button" className={!preview?'active':''} onClick={()=>setPreview(false)}>编辑</button><button type="button" className={preview?'active':''} onClick={()=>setPreview(true)}>预览</button></div><span>{editor.id?(dirty?'尚未保存':'已保存'):'新页面'}</span></div>
     {preview?<div className="method-editor-preview"><MethodMarkdown content={editor.content} documentId="preview"/></div>:<label className="field"><span>正文 · 使用 ## 添加章节，支持列表、表格和链接</span><textarea className="textarea method-editor-input" disabled={saving} value={editor.content} onChange={e=>setEditor({...editor,content:e.target.value})}/></label>}
    </section>:loading&&!documents.length?<div className="method-loading"><div/><div/><div/><p>正在加载方法库…</p></div>:selected?<article>
     <div className="method-breadcrumb"><span>实验方法</span><span>/</span><span>{selected.category}</span></div>
     <header className="method-article-header"><h1 id="method-page-title" ref={titleRef} tabIndex={-1}>{selected.title}</h1><div className="method-article-meta"><span>更新于 {selected.updated_at.slice(0,10)}</span><div className="method-page-actions"><button type="button" onClick={copyLink}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?'已复制':'复制链接'}</span></button>{editable&&<button type="button" onClick={()=>edit(selected)}><FilePenLine size={14}/><span>编辑页面</span></button>}</div></div></header>
     {!!headings.length&&<details className="method-mobile-outline" ref={mobileOutline}><summary>本页内容<ChevronDown size={14}/></summary>{outline(true)}</details>}
     <MethodMarkdown content={selected.content||'正文尚未填写。'} documentId={selected.id}/>
     <nav className="method-pagination" aria-label="相邻页面">{previous?<a href={documentUrl(previous.id)} onClick={e=>select(previous,e)}><span><ArrowLeft size={15}/>上一页</span><strong>{previous.title}</strong></a>:<div/>}{next?<a href={documentUrl(next.id)} onClick={e=>select(next,e)}><span>下一页<ArrowRight size={15}/></span><strong>{next.title}</strong></a>:<div/>}</nav>
    </article>:<div className="method-empty"><h1 className="page-title">{selectedId?'页面未找到':'实验方法'}</h1><p>{selectedId?'此页面已不存在，或链接中的页面编号不正确。':'团队的方法库尚未建立。'}</p>{ordered[0]?<Button onClick={()=>select(ordered[0])}>返回方法库</Button>:canWrite?<Button onClick={()=>edit()}>创建第一个页面</Button>:<p>请管理员添加方法页面。</p>}</div>}
   </section>
   {!editor&&selected&&!!headings.length&&<aside className="method-toc">{outline()}</aside>}
  </div>
 </div>;
}
