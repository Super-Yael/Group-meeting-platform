'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type MouseEvent} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronDown,Copy,FilePenLine,Plus,Search,X,ChevronRight} from 'lucide-react';
import {api,post,put} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {MethodMarkdown} from '@/components/method-markdown';
import {categoryTrail,documentHeadings,documentsInCategory,filterDocuments,groupByAxis,relatedDocuments,type CatalogCategory,type MethodCatalog,type MethodDocument} from '@/lib/method-docs';
import './method-library.css';

type Editor={id?:number;title:string;categoryKey:string;summary:string;aliases:string;tags:string;facets:Record<string,string[]>;archived:boolean;content:string;baseRevision?:number;baseline:string};
type Props={user:{id:string;name:string;role:string};readOnly:boolean;onDirtyChange:(dirty:boolean)=>void};
const fingerprint=(v:Omit<Editor,'baseline'>)=>JSON.stringify([v.title,v.categoryKey,v.summary,v.aliases,v.tags,v.facets,v.archived,v.content]);
const tokens=(value:string)=>[...new Set(value.split(/[,，;；\n]/).map(v=>v.trim()).filter(Boolean))];
function route(){const p=new URLSearchParams(location.search),id=p.get('doc');return {id:id&&/^\d+$/.test(id)?Number(id):null,category:p.get('category')||'',axis:p.get('by')||'',query:p.get('q')||''};}

export function MethodLibrary({user,readOnly,onDirtyChange}:Props){
 const [catalog,setCatalog]=useState<MethodCatalog>({categories:[],documents:[]}),[selectedId,setSelectedId]=useState<number|null>(null),[categoryKey,setCategoryKey]=useState(''),[axisKey,setAxisKey]=useState(''),[query,setQuery]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editor,setEditor]=useState<Editor|null>(null),[preview,setPreview]=useState(false),[saving,setSaving]=useState(false),[copied,setCopied]=useState(false),[activeHeading,setActiveHeading]=useState('');
 const mounted=useRef(true),mobileDirectory=useRef<HTMLDetailsElement>(null),mobileOutline=useRef<HTMLDetailsElement>(null),titleRef=useRef<HTMLHeadingElement>(null),searchRef=useRef<HTMLInputElement>(null);
 const dirty=!!editor&&fingerprint(editor)!==editor.baseline;
 const {documents,categories}=catalog;
 const active=useMemo(()=>documents.filter(d=>!d.archived),[documents]);
 const selected=documents.find(doc=>doc.id===selectedId);
 const currentCategory=categories.find(c=>c.key===(selected?.category_key||categoryKey));
 const trail=categoryTrail(categories,currentCategory?.key||'');
 const scoped=useMemo(()=>documentsInCategory(active,categoryKey),[active,categoryKey]);
 const results=useMemo(()=>filterDocuments(scoped,query,categories),[scoped,query,categories]);
 const axis=currentCategory?.axes.find(a=>a.key===axisKey)||currentCategory?.axes[0];
 const groups=useMemo(()=>groupByAxis(results,axis),[results,axis]);
 const headings=useMemo(()=>documentHeadings(selected?.content||'',selected?.id||'empty'),[selected?.id,selected?.content]);
 const related=useMemo(()=>selected?relatedDocuments(selected,active):[],[selected,active]);
 const ordered=useMemo(()=>active.filter(d=>d.category_key===selected?.category_key).sort((a,b)=>a.id-b.id),[active,selected?.category_key]);
 const position=ordered.findIndex(d=>d.id===selectedId),previous=ordered[position-1],next=ordered[position+1];
 const canWrite=!readOnly&&user.role!=='pi',editable=canWrite&&!!selected&&(selected.can_edit??(user.role==='admin'||selected.author_id===user.id));
 const canLeave=()=>!saving&&(!dirty||window.confirm('此页面尚未保存，离开会放弃修改。继续离开？'));
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[dirty]);
 function urlFor({id=null,category='',by='',q='',hash=''}:{id?:number|null;category?:string;by?:string;q?:string;hash?:string}={}){
  const url=new URL(typeof location==='undefined'?'https://local.invalid/':location.href);for(const key of ['doc','category','by','q'])url.searchParams.delete(key);url.searchParams.set('view','documents');
  if(id)url.searchParams.set('doc',String(id));if(category)url.searchParams.set('category',category);if(by)url.searchParams.set('by',by);if(q)url.searchParams.set('q',q);url.hash=hash;
  return url.pathname+url.search+url.hash;
 }
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);setError('');
  try{
   const data=await api<MethodCatalog>('/api/documents/catalog',{signal});if(signal?.aborted)return;
   const state=route();if(state.id&&!data.documents.some(d=>d.id===state.id)){
    try{const old=await api<MethodDocument>(`/api/documents/${state.id}`,{signal});data.documents.push(old);}catch(e){if(signal?.aborted)return;setError(e instanceof Error?e.message:'页面加载失败');}
   }
   setCatalog(data);setSelectedId(state.id);setCategoryKey(state.category);setAxisKey(state.axis);setQuery(state.query);
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:'实验库加载失败');}finally{if(!signal?.aborted)setLoading(false);}
 },[user.id]);
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[load]);
 useEffect(()=>{
  const restore=()=>{if(!canLeave()){history.replaceState(null,'',urlFor({id:selectedId,category:categoryKey,by:axisKey,q:query}));return;}const state=route();setEditor(null);setSelectedId(state.id);setCategoryKey(state.category);setAxisKey(state.axis);setQuery(state.query);};
  addEventListener('popstate',restore);return()=>removeEventListener('popstate',restore);
 },[dirty,saving,selectedId,categoryKey,axisKey,query]);
 useEffect(()=>{
  if(editor)return;const frame=requestAnimationFrame(()=>{let hash='';try{hash=decodeURIComponent(location.hash.slice(1));}catch{}const target=hash&&document.getElementById(hash);if(target)target.scrollIntoView();else window.scrollTo({top:0,behavior:'instant'});});
  const elements=headings.map(h=>document.getElementById(h.id)).filter((el):el is HTMLElement=>!!el);
  const update=()=>{const current=[...elements].reverse().find(el=>el.getBoundingClientRect().top<=150)||elements[0];if(current)setActiveHeading(current.id);};
  const observer=new IntersectionObserver(update,{rootMargin:'-80px 0px -60% 0px'});elements.forEach(el=>observer.observe(el));update();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[selectedId,selected?.content,categoryKey,axisKey,editor,headings]);
 function navigate({id=null,category='',by='',q=''}:{id?:number|null;category?:string;by?:string;q?:string},event?:MouseEvent<HTMLAnchorElement>){
  if(event&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0))return;event?.preventDefault();if(!canLeave())return;
  setEditor(null);setSelectedId(id);setCategoryKey(category);setAxisKey(by);setQuery(q);setError('');setNotice('');history.pushState(null,'',urlFor({id,category,by,q}));if(mobileDirectory.current)mobileDirectory.current.open=false;requestAnimationFrame(()=>titleRef.current?.focus({preventScroll:true}));
 }
 const select=(doc:MethodDocument,event?:MouseEvent<HTMLAnchorElement>)=>navigate({id:doc.id},event);
 function search(value:string){if(!canLeave())return;setQuery(value);setEditor(null);setSelectedId(null);history.replaceState(null,'',urlFor({category:categoryKey,by:axisKey,q:value}));}
 function edit(doc?:MethodDocument){
  if(!canLeave())return;
  const value={id:doc?.id,title:doc?.title||'',categoryKey:doc?.category_key||((currentCategory?.parentKey&&currentCategory.key)||'wet/molecular'),summary:doc?.summary||'',aliases:(doc?.aliases||[]).join('，'),tags:(doc?.tags||[]).join('，'),facets:doc?.facets||{},archived:!!doc?.archived,content:doc?.content||'## 用途与原理\n\n\n## 输入与适用条件\n\n\n## 方法流程\n\n\n## 对照与质量控制\n\n\n## 结果解读\n\n\n## 常见问题\n\n\n## 参考资料\n\n',baseRevision:doc?.revision};
  setEditor({...value,baseline:fingerprint(value)});setPreview(false);setError('');setNotice('');if(mobileDirectory.current)mobileDirectory.current.open=false;window.scrollTo({top:0,behavior:'instant'});
 }
 async function save(){
  if(!editor||saving)return;if(!editor.title.trim()){setError('请填写方法名称');return;}setSaving(true);setError('');
  try{
   const body={title:editor.title.trim(),categoryKey:editor.categoryKey,summary:editor.summary,aliases:tokens(editor.aliases),tags:tokens(editor.tags),facets:editor.facets,content:editor.content,archived:editor.archived,baseRevision:editor.baseRevision};
   const result=editor.id?await put(`/api/documents/${editor.id}`,body):await post('/api/documents',body);if(!mounted.current)return;
   const doc=result.document as MethodDocument;setCatalog(old=>({...old,documents:[...old.documents.filter(d=>d.id!==doc.id),doc]}));setSelectedId(doc.id);setCategoryKey('');setAxisKey('');setQuery('');setEditor(null);setNotice('页面已保存');history.replaceState(null,'',urlFor({id:doc.id}));
  }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'保存失败，草稿已保留');}finally{if(mounted.current)setSaving(false);}
 }
 async function copyLink(){if(!selected)return;try{await navigator.clipboard.writeText(new URL(urlFor({id:selected.id,hash:location.hash}),location.origin).href);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{setError('链接复制失败，请复制地址栏中的地址');}}
 function methodLink(doc:MethodDocument){return <a key={doc.id} href={urlFor({id:doc.id})} onClick={e=>select(doc,e)} aria-current={selectedId===doc.id&&!editor?'page':undefined}>{doc.title}</a>;}
 function directory(mobile=false){return <nav className="method-directory" aria-label={mobile?'移动端实验目录':'实验分类目录'}>
  <div className="method-directory-heading"><BookOpen size={17}/><strong>实验技术库</strong></div>
  <label className="method-search"><Search size={16}/><input type="search" aria-label={mobile?'搜索移动端实验目录':'搜索实验目录'} placeholder="方法名称 / 英文 / 缩写" value={query} onChange={e=>search(e.target.value)}/>{query&&<button type="button" aria-label="清除搜索" onClick={()=>search('')}><X size={14}/></button>}</label>
  <a className={`method-all-link ${!selectedId&&!categoryKey?'active':''}`} href={urlFor()} onClick={e=>navigate({},e)}>全部实验<span>{active.length}</span></a>
  {loading?<p className="method-directory-status">正在加载目录…</p>:categories.filter(c=>c.parentKey===null).map(root=>{
   const rootCount=documentsInCategory(active,root.key).length;if(root.key==='unfiled'&&!rootCount)return null;
   return <details className="method-tree-root" key={root.key} open><summary>{root.name}<span>{rootCount}</span><ChevronDown size={13}/></summary><div>{categories.filter(c=>c.parentKey===root.key).map(category=>{
    const pages=documentsInCategory(active,category.key),isCurrent=currentCategory?.key===category.key;
    return <div className="method-tree-family" key={category.key}><a href={urlFor({category:category.key})} className={isCurrent?'active':''} onClick={e=>navigate({category:category.key},e)}>{category.name}<span>{pages.length}</span></a>
     {isCurrent&&<div className="method-tree-children">{category.axes.map(a=><a key={a.key} href={urlFor({category:category.key,by:a.key})} className={!selected&&axis?.key===a.key?'active':''} onClick={e=>navigate({category:category.key,by:a.key},e)}>{a.label}</a>)}{selected&&<details open><summary>本类方法</summary><div className="method-tree-methods">{pages.map(methodLink)}</div></details>}</div>}
    </div>;
   })}{root.key==='unfiled'&&<a href={urlFor({category:root.key})} onClick={e=>navigate({category:root.key},e)}>查看待分类方法</a>}</div></details>;
  })}
  {canWrite&&<button type="button" className="method-add" onClick={()=>edit()}><Plus size={16}/>新增实验方法</button>}
 </nav>}
 function outline(mobile=false){return <nav aria-label={mobile?'移动端本页章节':'本页章节'} className="method-outline"><p>本页内容</p><ul>{headings.map(h=><li key={h.id} className={h.depth>2?'method-outline-nested':''}><a href={`#${encodeURIComponent(h.id)}`} aria-current={activeHeading===h.id?'location':undefined} onClick={()=>{setActiveHeading(h.id);if(mobileOutline.current)mobileOutline.current.open=false;}}>{h.text}</a></li>)}</ul><a className="method-top" href="#method-page-title">返回顶部</a></nav>}
 function rows(pages:MethodDocument[]){return <div className="method-result-list">{pages.map(doc=><a key={doc.id} href={urlFor({id:doc.id})} onClick={e=>select(doc,e)}><div><h3>{doc.title}</h3>{query&&<span className="method-result-path">{doc.category_path||doc.category}</span>}<p>{doc.summary||doc.content.split('\n').find(line=>line.trim()&&!line.startsWith('#'))||'查看方法说明'}</p>{!!doc.aliases?.length&&<span className="method-result-aliases">{doc.aliases.slice(0,4).join(' · ')}</span>}</div><ChevronRight size={16}/></a>)}</div>}
 const editorCategory=categories.find(c=>c.key===editor?.categoryKey);
 return <div className="method-library">
  <div className="method-mobile-tools"><details ref={mobileDirectory}><summary><BookOpen size={17}/>实验目录<ChevronDown size={15}/></summary>{directory(true)}</details></div>
  <div className={`method-layout ${editor?'method-layout-editing':!selected?'method-layout-index':''}`}>
   <aside className="method-sidebar">{directory()}</aside>
   <section className="method-reading" aria-label="实验知识正文">
    {error&&<div role="alert" className="method-message error">{error}{!documents.length&&<Button onClick={()=>load()}>重新加载</Button>}</div>}{notice&&<p role="status" className="method-message">{notice}</p>}
    {editor?<section className="method-editor" aria-label="编辑实验方法">
     <div className="method-breadcrumb">实验技术库 <span>/</span> {editor.id?'编辑方法':'新增方法'}</div>
     <div className="method-edit-heading"><h1 className="page-title">{editor.id?'编辑实验方法':'新增实验方法'}</h1><div className="row-actions"><Button disabled={saving} onClick={()=>{if(canLeave())setEditor(null);}}>取消</Button><Button kind="primary" disabled={saving||!dirty} onClick={save}>{saving?'正在保存…':'保存页面'}</Button></div></div>
     <label className="field"><span>方法名称</span><input className="input" disabled={saving} maxLength={200} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/></label>
     <label className="field"><span>实验类别</span><select className="select" disabled={saving} value={editor.categoryKey} onChange={e=>setEditor({...editor,categoryKey:e.target.value,facets:{}})}>{categories.filter(c=>c.parentKey===null).map(root=><optgroup key={root.key} label={root.name}>{categories.filter(c=>c.parentKey===root.key||c.key==='unfiled'&&root.key==='unfiled').map(c=><option key={c.key} value={c.key}>{c.name}</option>)}</optgroup>)}</select></label>
     <label className="field"><span>简介 · 说明此方法测什么、用于什么</span><textarea className="textarea method-summary-input" disabled={saving} maxLength={1000} value={editor.summary} onChange={e=>setEditor({...editor,summary:e.target.value})}/></label>
     <div className="method-editor-fields"><label className="field"><span>别名与缩写 · 用逗号分隔</span><input className="input" disabled={saving} value={editor.aliases} onChange={e=>setEditor({...editor,aliases:e.target.value})}/></label><label className="field"><span>关键词 · 可填写研究对象、样本或读出</span><input className="input" disabled={saving} value={editor.tags} onChange={e=>setEditor({...editor,tags:e.target.value})}/></label></div>
     {!!editorCategory?.axes.length&&<section className="method-facet-editor"><h2>分类维度</h2><p>各维度独立，可多选。只勾选此方法确实适用的选项。</p>{editorCategory.axes.map(a=><fieldset key={a.key} disabled={saving}><legend>{a.label}</legend><div>{a.values.map(value=><label key={value.key}><input type="checkbox" checked={!!editor.facets[a.key]?.includes(value.key)} onChange={e=>setEditor({...editor,facets:{...editor.facets,[a.key]:e.target.checked?[...editor.facets[a.key]||[],value.key]:(editor.facets[a.key]||[]).filter(v=>v!==value.key)}})}/>{value.label}</label>)}</div></fieldset>)}</section>}
     <label className="method-archive-control"><input type="checkbox" disabled={saving} checked={!editor.archived} onChange={e=>setEditor({...editor,archived:!e.target.checked})}/>显示在实验目录中</label>
     <div className="method-editor-toolbar"><div className="segment" aria-label="编辑模式"><button type="button" className={!preview?'active':''} onClick={()=>setPreview(false)}>编辑</button><button type="button" className={preview?'active':''} onClick={()=>setPreview(true)}>预览</button></div><span>{editor.id?(dirty?'尚未保存':'已保存'):'新页面'}</span></div>
     {preview?<div className="method-editor-preview"><MethodMarkdown content={editor.content} documentId="preview"/></div>:<label className="field"><span>正文 · 使用 ## 添加章节，支持列表、表格和链接</span><textarea className="textarea method-editor-input" disabled={saving} value={editor.content} onChange={e=>setEditor({...editor,content:e.target.value})}/></label>}
    </section>:loading&&!documents.length?<div className="method-loading"><div/><div/><div/><p>正在加载实验库…</p></div>:selected?<article>
     <nav className="method-breadcrumb" aria-label="页面位置"><a href={urlFor()} onClick={e=>navigate({},e)}>全部实验</a>{trail.map(c=><span key={c.key}><span>/</span><a href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}>{c.name}</a></span>)}</nav>
     {selected.archived&&<p className="method-message">此页面已归档，保留原链接供查阅。</p>}
     <header className="method-article-header"><h1 id="method-page-title" ref={titleRef} tabIndex={-1}>{selected.title}</h1>{!!selected.aliases?.length&&<p className="method-article-aliases">{selected.aliases.join(' · ')}</p>}<div className="method-article-meta"><span>更新于 {selected.updated_at.slice(0,10)}</span><div className="method-page-actions"><button type="button" onClick={copyLink}>{copied?<Check size={14}/>:<Copy size={14}/>}<span>{copied?'已复制':'复制链接'}</span></button>{editable&&<button type="button" onClick={()=>edit(selected)}><FilePenLine size={14}/><span>编辑页面</span></button>}</div></div></header>
     {!!headings.length&&<details className="method-mobile-outline" ref={mobileOutline}><summary>本页内容<ChevronDown size={14}/></summary>{outline(true)}</details>}
     <MethodMarkdown content={selected.content||'正文尚未填写。'} documentId={selected.id}/>
     {!!related.length&&<section className="method-related"><h2>相关实验方法</h2><div>{related.map(methodLink)}</div></section>}
     <nav className="method-pagination" aria-label="相邻页面">{previous?<a href={urlFor({id:previous.id})} onClick={e=>select(previous,e)}><span><ArrowLeft size={15}/>上一页</span><strong>{previous.title}</strong></a>:<div/>}{next?<a href={urlFor({id:next.id})} onClick={e=>select(next,e)}><span>下一页<ArrowRight size={15}/></span><strong>{next.title}</strong></a>:<div/>}</nav>
    </article>:selectedId?<div className="method-empty"><h1 className="page-title">页面未找到</h1><Button onClick={()=>navigate({})}>返回实验库</Button></div>:<section className="method-index">
     <nav className="method-breadcrumb" aria-label="页面位置"><a href={urlFor()} onClick={e=>navigate({},e)}>全部实验</a>{categoryTrail(categories,categoryKey).map(c=><span key={c.key}><span>/</span><a href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}>{c.name}</a></span>)}</nav>
     <header className="method-index-header"><h1 id="method-page-title" ref={titleRef} tabIndex={-1}>{query?'搜索实验方法':currentCategory?.name||'实验技术库'}</h1><p>{query?`“${query}” · 找到 ${results.length} 项方法`:currentCategory?.description||'查找干实验与湿实验的方法、原理、操作要点和结果解读。适用于不同疾病、物种与研究方向。'}</p></header>
     <label className="method-main-search"><Search size={19}/><input ref={searchRef} type="search" aria-label={categoryKey?'搜索此类实验方法':'搜索全部实验方法'} placeholder={categoryKey?'搜索此类方法的名称、英文或缩写':'搜索方法，例如 WGS、Western blot、细胞凋亡、16S'} value={query} onChange={e=>search(e.target.value)}/>{query&&<button type="button" aria-label="清除关键词" onClick={()=>search('')}><X size={17}/></button>}</label>
     {query?<><div className="method-results-heading"><h2>搜索结果</h2><span>{categoryKey?currentCategory?.name:'全部分类'}</span></div>{results.length?rows(results):<div className="method-empty"><p>没有找到匹配的方法。试试中文名称、英文全称或缩写。</p>{categoryKey&&<Button onClick={()=>navigate({q:query})}>在全部实验中搜索</Button>}{canWrite&&<Button onClick={()=>edit()}>新增实验方法</Button>}</div>}</>:currentCategory?.parentKey||currentCategory?.key==='unfiled'?<>
      {!!currentCategory.axes.length&&<div className="method-classification"><label className="method-axis-select"><span>分类方式</span><select className="select" aria-label="分类方式" value={axis?.key||''} onChange={e=>navigate({category:currentCategory.key,by:e.target.value})}>{currentCategory.axes.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}</select></label><div className="method-axis-tabs" aria-label="分类视角">{currentCategory.axes.map(a=><button type="button" key={a.key} className={axis?.key===a.key?'active':''} aria-pressed={axis?.key===a.key} onClick={()=>navigate({category:currentCategory.key,by:a.key})}>{a.label}</button>)}</div><p>{axis?.description}</p></div>}
      <p className="method-category-count">本类收录 {results.length} 项方法{axis?' · 同一种方法可出现在多个分组中':''}</p>
      {groups.map(group=><section className="method-index-group" key={group.key}><div className="method-results-heading"><h2>{group.label}</h2><span>{group.pages.length} 项</span></div>{rows(group.pages)}</section>)}
      {!results.length&&<div className="method-empty"><p>此分类暂未收录方法。</p>{canWrite&&<Button onClick={()=>edit()}>添加此类方法</Button>}</div>}
     </>:<><nav className="method-domain-jumps" aria-label="实验大类">{categories.filter(c=>c.parentKey===null&&c.key!=='unfiled'&&(!categoryKey||c.key===categoryKey)).map(root=><a key={root.key} href={`#domain-${root.key}`}>{root.name}<span>{documentsInCategory(active,root.key).length}</span></a>)}</nav><div className="method-domain-index">{categories.filter(c=>c.parentKey===null&&c.key!=='unfiled'&&(!categoryKey||c.key===categoryKey)).map(root=><section key={root.key} id={`domain-${root.key}`}><div className="method-domain-heading"><h2>{root.name}</h2><span>{documentsInCategory(active,root.key).length} 项方法</span></div><p>{root.description}</p><div className="method-category-list">{categories.filter(c=>c.parentKey===root.key).map(c=><a key={c.key} href={urlFor({category:c.key})} onClick={e=>navigate({category:c.key},e)}><div><h3>{c.name}</h3><p>{c.description}</p></div><span>{documentsInCategory(active,c.key).length}</span><ChevronRight size={16}/></a>)}</div></section>)}</div></>}
    </section>}
   </section>
   {!editor&&selected&&!!headings.length&&<aside className="method-toc">{outline()}</aside>}
  </div>
 </div>;
}
