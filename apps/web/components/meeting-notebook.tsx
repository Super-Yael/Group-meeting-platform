'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowDown,ChevronLeft,ChevronRight,Plus,Trash2,Download} from 'lucide-react';
import {addDays,api,post,put} from '@/lib/api';
import {Button} from '@/components/ui/button';
import {Modal} from '@/components/ui/dialog';
import {QuestionAnswers,type QuestionAnswer} from '@/components/question-answers';
import {saveNotebook,NotebookConflictError,type SaveConflict,type ConflictChoice} from '@/lib/notebook-save';

type Person={id:string;name:string;role:string};
type Kind='presentation'|'question'|'analysis'|'mentor_summary'|'speech';
type Status='open'|'tracking'|'resolved';
type Block={id:string;kind:Kind;title:string;speakerId:string;content:string;relatedBlockId?:string;questionId?:number;questionRevision?:number;answers?:QuestionAnswer[];answer?:string;answererId?:string;status?:Status;followUpDate?:string};
type Question={id:number;date:string;questioner_id:string;questioner_name:string;answerer_id:string|null;question:string;answer:string;status:Status;follow_up_date:string|null;revision:number;answers:QuestionAnswer[]};
type Data={record:{revision:number;status:string;updated_at:string}|null;blocks:Block[];qa:Question[];followUps:Question[];attendance:{user_id:string;present:number}[];papers:{id:number;title:string;doi:string;url:string;presenter_name:string;key_finding:string}[];duties:{user_id:string;name:string;duty_type:string}[];permissions:{canEditRecord:boolean;canPublishRecord:boolean;canManageAttendance:boolean;canRecordOthersQa:boolean;canAddPaper:boolean}};
const labels:Record<Kind,string>={presentation:'分享',question:'提问',analysis:'分析',mentor_summary:'老师总结',speech:'发言'};
const states:Record<Status,string>={open:'待解决',tracking:'追踪中',resolved:'已解决'};
const options=Object.entries(labels) as [Kind,string][];
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function MeetingNotebook({date,user,users,readOnly,onDateChange,download,onUpdated,onDirtyChange}:{date:string;user:Person;users:Person[];readOnly:boolean;onDateChange:(date:string)=>void;download:(format:'docx'|'pdf',from:string,to:string)=>void;onUpdated:()=>void;onDirtyChange:(dirty:boolean)=>void}){
 const [data,setData]=useState<Data|null>(null),[blocks,setBlocks]=useState<Block[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pane,setPane]=useState('process'),[filter,setFilter]=useState('all'),[dialog,setDialog]=useState<'question'|'paper'|''>(''),[question,setQuestion]=useState<Question|null>(null),[answerDrafts,setAnswerDrafts]=useState<QuestionAnswer[]>([]),[form,setForm]=useState<Record<string,string>>({});
 const [conflicts,setConflicts]=useState<SaveConflict[]>([]);
 const request=useRef(0),baseline=useRef<Block[]>([]),saving=useRef(false),publishIntent=useRef(false);
 const load=useCallback(async()=>{
  const serial=++request.current;setLoading(true);setError('');
  try{const next=await api<Data>(`/api/records/${date}`);if(serial!==request.current)return;baseline.current=next.blocks;setData(next);setBlocks(next.blocks);setDirty(false);setConflicts([]);}catch(e){if(serial===request.current)setError(e instanceof Error?e.message:'记录加载失败');}finally{if(serial===request.current)setLoading(false);}
 },[date,user.id]);
 useEffect(()=>{setData(null);setNotice('');void load();return()=>{request.current++;}},[load]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false);},[dirty,onDirtyChange]);
 const editable=!!data?.permissions.canEditRecord&&!readOnly;
 const name=(id:string)=>users.find(u=>u.id===id)?.name||'未指定';
 const change=(id:string,patch:Partial<Block>)=>{setBlocks(old=>old.map(b=>b.id===id?{...b,...patch}:patch.kind&&patch.kind!=='presentation'&&b.relatedBlockId===id?{...b,relatedBlockId:undefined}:b));setDirty(true);};
 const add=(kind:Kind,after=blocks.length-1)=>{
  const block:Block={id:crypto.randomUUID(),kind,title:labels[kind],speakerId:kind==='mentor_summary'?'chs':'',content:'',...(kind==='question'?{status:'open',answer:'',answererId:'',answers:[],followUpDate:''}:{})};
  const preceding=blocks.slice(0,after+1).reverse().find(b=>b.kind==='presentation');
  if(preceding&&['question','analysis'].includes(kind))block.relatedBlockId=preceding.id;
  setBlocks(old=>[...old.slice(0,after+1),block,...old.slice(after+1)]);setDirty(true);
 };
 const move=(index:number,delta:number)=>{setBlocks(old=>{const next=[...old];[next[index],next[index+delta]]=[next[index+delta],next[index]];return next;});setDirty(true);};
 const remove=(block:Block)=>{setBlocks(old=>old.filter(b=>b.id!==block.id).map(b=>b.relatedBlockId===block.id?{...b,relatedBlockId:undefined}:b));setDirty(true);if(block.questionId)setNotice('已移除提问环节；已登记的问题仍保留在问题追踪中。');};
 const save=async(publish=false,choice?:ConflictChoice)=>{
  if(!data||saving.current)return;saving.current=true;publishIntent.current=publish;setBusy(true);setError('');setNotice('');setConflicts([]);
  try{
   const saved=await saveNotebook<Block>({base:baseline.current,local:blocks,choice,read:()=>api<Data>(`/api/records/${date}`),write:body=>api<{revision:number;blocks:Block[]}>(`/api/records/${date}`,{method:'PUT',body:JSON.stringify(body)})});
   baseline.current=saved.blocks;
   setBlocks(saved.blocks);setDirty(false);
   setData(old=>old?{...old,record:{revision:saved.revision,status:'draft',updated_at:new Date().toISOString()}}:old);
   if(publish)await post(`/api/records/${date}/publish`,{});
   await load();setNotice(publish?'记录已发布入册':'会议环节与提问状态已保存');onUpdated();
  }
  catch(e){if(e instanceof NotebookConflictError)setConflicts(e.conflicts);setError(e instanceof Error?e.message:'保存失败');}finally{saving.current=false;setBusy(false);}
 };
 const personSelect=(value:string,update:(value:string)=>void,label:string)=><select className="select" aria-label={label} value={value} disabled={busy} onChange={e=>update(e.target.value)}><option value="">未指定</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>;
 const insert=(after?:number)=><select className="select insert-block" aria-label={after===undefined?'添加环节':`在环节 ${after+1} 后添加`} disabled={busy} value="" onChange={e=>add(e.target.value as Kind,after)}><option value="">＋ {after===undefined?'添加环节':'在此后添加'}</option>{options.map(([kind,label])=><option key={kind} value={kind}>{label}</option>)}</select>;
 const showQuestion=(q:Question|null)=>{setError('');setQuestion(q);setAnswerDrafts(q?.answers||[]);setForm(q?{status:q.status,followUpDate:q.follow_up_date||'',questionerId:q.questioner_id}:{question:'',questionerId:user.role==='member'?user.id:users.find(u=>u.role==='member')?.id||'',status:'open',followUpDate:''});setDialog('question');};
 const saveDialog=async()=>{
  setBusy(true);setError('');
  try{
   if(dialog==='paper')await post('/api/papers',{...form,date});
   else if(question)await put(`/api/qa/${question.id}`,{...form,answers:answerDrafts,revision:question.revision});
   else await post('/api/qa',{...form,date,answers:answerDrafts});
   // Keep the loaded baseline and local edits together; the save path merges sidebar changes by field.
   const next=await api<Data>(`/api/records/${date}`);setData(next);
   if(!dirty){baseline.current=next.blocks;setBlocks(next.blocks);}
   setDialog('');setNotice(dialog==='paper'?'文献已添加':'提问及追踪状态已更新');onUpdated();
  }catch(e){setError(e instanceof Error?e.message:'保存失败');}finally{setBusy(false);}
 };
 const changeDate=(next:string)=>{if(!next||next===date)return;if(dirty&&!window.confirm('当前环节尚未保存，切换日期会放弃这些修改。继续切换？'))return;onDateChange(next);};
 const canUpdateQuestion=(q:Question)=>!readOnly&&(data?.permissions.canRecordOthersQa||q.questioner_id===user.id||q.answerer_id===user.id);
 const allQuestions=[...(data?.qa||[]),...(data?.followUps||[])];
 const visibleQuestions=allQuestions.filter(q=>filter==='all'||q.status===filter);
 const updateAttendance=async(uid:string,present:boolean)=>{setBusy(true);try{await put(`/api/attendance/${date}/${uid}`,{present});setData(old=>old?{...old,attendance:[...old.attendance.filter(a=>a.user_id!==uid),{user_id:uid,present:present?1:0}]}:old);}catch(e){setError(e instanceof Error?e.message:'更新失败');}finally{setBusy(false);}};
 const conflictText=(value:unknown):string=>{
  if(value===undefined)return '已移除';
  if(typeof value==='string')return users.find(u=>u.id===value)?.name||states[value as Status]||labels[value as Kind]||blocks.find(b=>b.id===value)?.title||value||'未填写';
  if(Array.isArray(value))return value.map(conflictText).join('\n\n');
  if(value&&typeof value==='object'){const v=value as {title?:string;speakerId?:string;content?:string};return [v.title,v.speakerId?name(v.speakerId):'',v.content].filter(Boolean).join('\n')||'未填写';}
  return String(value??'未填写');
 };
 return <section className="meeting-notebook">
  <h1 className="page-title">{readOnly?'会议档案':'会议记录'}</h1>
  <div className="notebook-toolbar"><div className="row-actions"><div className="notebook-date-nav"><Button aria-label="前一天" title="前一天" disabled={busy} onClick={()=>changeDate(addDays(date,-1))}><ChevronLeft size={16}/></Button><input aria-label="记录日期" type="date" className="input notebook-date" value={date} onChange={e=>changeDate(e.target.value)}/><Button aria-label="后一天" title="后一天" disabled={busy} onClick={()=>changeDate(addDays(date,1))}><ChevronRight size={16}/></Button></div><span className="badge gray">{data?.record?.status==='published'?'已发布':'草稿'}</span><span className="small muted">记录：{data?.duties.find(d=>d.duty_type==='recorder')?.name||'待安排'}</span></div><div className="row-actions"><Button onClick={()=>download('docx',date,date)}><Download size={15}/>Word</Button><Button onClick={()=>download('pdf',date,date)}>PDF</Button></div></div>
  {error&&<div role="alert" className="notice error">{error}</div>}{notice&&<div role="status" className="notice">{notice}</div>}
  {!!conflicts.length&&<div className="card pad"><p>只需选择发生冲突的内容，其他修改会自动合并。</p>{conflicts.map((conflict,i)=><details key={i}><summary>{conflict.label}</summary><p className="small muted">本页内容</p><div className="doc-content">{conflictText(conflict.local)}</div><p className="small muted">服务器内容</p><div className="doc-content">{conflictText(conflict.remote)}</div></details>)}<div className="row-actions"><Button disabled={busy} onClick={()=>void save(publishIntent.current,'local')}>冲突处使用本页内容</Button><Button disabled={busy} onClick={()=>void save(publishIntent.current,'remote')}>冲突处使用服务器内容</Button></div></div>}
  {loading?<p role="status">正在读取会议记录…</p>:!data?<Button onClick={()=>void load()}>重新载入</Button>:<>
   <div className="mobile-pane-switch segment"><button className={pane==='process'?'active':''} onClick={()=>setPane('process')}>会议过程</button><button className={pane==='questions'?'active':''} onClick={()=>setPane('questions')}>问题追踪</button></div>
   <div className="notebook-layout">
    <div className={`notebook-process ${pane==='process'?'notebook-active':''}`}>
     <div className="section-header notebook-section"><h2 className="section-title">会议过程</h2>{editable&&insert()}</div>
     {!editable&&<p className="small muted">{readOnly?'只读查看会议记录。':'环节内容由当日记录人或管理员编辑，你可以登记自己的提问。'}</p>}
     <div className="meeting-blocks">{blocks.map((block,index)=><article className="card pad meeting-block" key={block.id}>
      <div className="block-heading">{editable?<><select className="select block-kind" aria-label={`环节 ${index+1} 类型`} disabled={busy} value={block.kind} onChange={e=>{const kind=e.target.value as Kind;change(block.id,{kind,title:labels[kind],questionId:undefined,questionRevision:undefined,status:'open',answer:'',answererId:'',answers:[],followUpDate:'',relatedBlockId:kind==='presentation'?undefined:block.relatedBlockId});}}>{options.map(([kind,label])=><option value={kind} key={kind}>{label}</option>)}</select><div className="row-actions block-actions"><Button kind="ghost" aria-label={`上移环节 ${index+1}`} disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/></Button><Button kind="ghost" aria-label={`下移环节 ${index+1}`} disabled={busy||index===blocks.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/></Button><Button kind="ghost" aria-label={`移除环节 ${index+1}`} disabled={busy} onClick={()=>remove(block)}><Trash2 size={15}/></Button></div></>:<h3 className="section-title">{block.title||labels[block.kind]} · {name(block.speakerId)}</h3>}</div>
      {editable?<><div className="block-fields"><Field label="环节标题"><input className="input" aria-label={`环节 ${index+1} 标题`} disabled={busy} value={block.title} onChange={e=>change(block.id,{title:e.target.value})} maxLength={120}/></Field><Field label={block.kind==='presentation'?'分享人':block.kind==='question'?'提问人':'发言人'}>{personSelect(block.speakerId,value=>change(block.id,{speakerId:value}),`环节 ${index+1} 人员`)}</Field></div>
      {['question','analysis'].includes(block.kind)&&blocks.some(b=>b.kind==='presentation')&&<Field label="对应分享（可选）"><select className="select" aria-label={`环节 ${index+1} 对应分享`} disabled={busy} value={block.relatedBlockId||''} onChange={e=>change(block.id,{relatedBlockId:e.target.value||undefined})}><option value="">整体讨论</option>{blocks.filter(b=>b.kind==='presentation').map(b=><option value={b.id} key={b.id}>{b.title} · {name(b.speakerId)}</option>)}</select></Field>}
      <Field label={block.kind==='question'?'问题':'记录内容'}><textarea aria-label={`环节 ${index+1} 内容`} className="textarea block-content" disabled={busy} placeholder={block.kind==='presentation'?'记录分享内容、文献线索与重点。':block.kind==='question'?'现场提出了什么问题？':'按实际讨论自由记录。'} value={block.content} onChange={e=>change(block.id,{content:e.target.value})}/></Field></>:<div className="doc-content">{block.content||<span className="muted">尚未记录</span>}</div>}
      {block.kind==='question'&&(editable?<><div className="question-state-field"><Field label="提问状态"><select aria-label={`环节 ${index+1} 提问状态`} className="select" disabled={busy} value={block.status||'open'} onChange={e=>change(block.id,{status:e.target.value as Status})}>{Object.entries(states).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field></div><QuestionAnswers answers={block.answers||[]} users={users} disabled={busy} prefix={`环节 ${index+1}`} onChange={answers=>change(block.id,{answers})}/>{block.status!=='resolved'&&<Field label="计划追踪日期（可选）"><input className="input" type="date" aria-label={`环节 ${index+1} 追踪日期`} disabled={busy} value={block.followUpDate||''} onChange={e=>change(block.id,{followUpDate:e.target.value})}/></Field>}<p className="small muted">保存会议记录后，提问、答案和状态一起同步到追踪列表。</p></>:<div className="question-answer"><span className="badge gray">{states[block.status||'open']}</span><QuestionAnswers answers={block.answers||[]} users={users}/>{block.followUpDate&&<p className="small muted">追踪日期：{block.followUpDate}</p>}</div>)}
      {editable&&<div className="block-insert">{insert(index)}</div>}
     </article>)}</div>
     {!blocks.length&&<div className="card pad muted">尚无会议环节。{editable?'从上方添加一个分享或发言环节开始。':''}</div>}
     {editable&&<div className="notebook-save"><span className="small muted">{dirty?'有未保存的修改':data.record?'所有环节已保存':'默认环节，可自由增删调整'}</span><div className="row-actions"><Button kind="primary" disabled={busy} onClick={()=>void save()}>保存会议记录</Button><Button disabled={busy||!data.permissions.canPublishRecord} onClick={()=>void save(true)}>保存并发布</Button></div></div>}
     <div className="section-header"><h2 className="section-title">文献来源</h2>{data.permissions.canAddPaper&&!readOnly&&<Button onClick={()=>{setForm({title:'',doi:'',url:'',presenterId:data.permissions.canEditRecord?'':user.id});setDialog('paper');}}><Plus size={15}/>添加文献</Button>}</div><div className="card pad">{data.papers.length?data.papers.map(p=><article className="list-item" key={p.id}><h3 className="notebook-paper-title">{p.title}</h3><p className="small muted">{p.presenter_name||'未指定分享人'}{p.doi&&` · DOI ${p.doi}`}</p>{p.key_finding&&<p className="doc-content">{p.key_finding}</p>}{p.url&&<a className="link" href={p.url} target="_blank" rel="noreferrer">查看原文</a>}</article>):<p className="muted">尚未登记文献来源。</p>}</div>
    </div>
    <aside className={`notebook-questions ${pane==='questions'?'notebook-active':''}`}>
     <div className="section-header notebook-section"><h2 className="section-title">问题追踪</h2>{!readOnly&&<Button kind="ghost" onClick={()=>showQuestion(null)}>登记提问</Button>}</div>
     <div className="card pad"><Field label="筛选状态"><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部状态</option>{Object.entries(states).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
     {visibleQuestions.length?visibleQuestions.map(q=><article className="list-item" key={q.id}><div className="small muted">{q.date} · {q.questioner_name}</div><p className="doc-content">{q.question}</p><span className="badge gray">{states[q.status]}</span><QuestionAnswers answers={q.answers||[]} users={users}/>{q.follow_up_date&&<p className="small muted">计划追踪 {q.follow_up_date}</p>}{canUpdateQuestion(q)&&<Button kind="ghost" onClick={()=>showQuestion(q)}>更新答案与状态</Button>}</article>):<p className="muted">暂无符合条件的问题。</p>}
     </div><div className="section-header"><h2 className="section-title">今日出席与提问</h2></div><div className="card pad">{users.filter(u=>u.role==='member').map(person=><div className="list-item" key={person.id}><div className="row-actions attendance-row"><span>{person.name} <span className="small muted">{data.qa.filter(q=>q.questioner_id===person.id).length} 问</span></span><label className="small muted"><input type="checkbox" disabled={busy||readOnly||!data.permissions.canManageAttendance} checked={!!(data.attendance.find(a=>a.user_id===person.id)?.present??1)} onChange={e=>void updateAttendance(person.id,e.target.checked)}/> 出席</label></div></div>)}</div>
    </aside>
   </div>
   <Modal open={!!dialog} onOpenChange={open=>!open&&setDialog('')} title={dialog==='paper'?'添加文献来源':question?'更新提问':'登记提问'}>
    {dialog==='paper'?<>{[['title','文献标题'],['doi','DOI（可选）'],['url','原文链接（可选）'],['keyFinding','关键发现（可选）']].map(([key,label])=><Field key={key} label={label}><input className="input" value={form[key]||''} onChange={e=>setForm(old=>({...old,[key]:e.target.value}))}/></Field>)}<Field label="分享人"><select className="select" value={form.presenterId||''} onChange={e=>setForm(old=>({...old,presenterId:e.target.value}))}><option value="">未指定</option>{users.filter(u=>u.role!=='pi'&&(data.permissions.canEditRecord?user.role==='admin'||data.duties.some(d=>d.user_id===u.id&&d.duty_type==='presenter'):u.id===user.id)).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></Field></>:<>
     {question?<p className="doc-content">{question.question}</p>:<><Field label="提问人"><select className="select" value={form.questionerId} onChange={e=>setForm(old=>({...old,questionerId:e.target.value}))}>{users.filter(u=>data.permissions.canRecordOthersQa||u.id===user.id).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></Field><Field label="问题"><textarea className="textarea" value={form.question||''} onChange={e=>setForm(old=>({...old,question:e.target.value}))}/></Field></>}
     <Field label="状态"><select className="select" value={form.status} onChange={e=>setForm(old=>({...old,status:e.target.value}))}>{Object.entries(states).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field><QuestionAnswers answers={answerDrafts} users={users} disabled={busy} onChange={setAnswerDrafts}/>{form.status!=='resolved'&&<Field label="计划追踪日期"><input className="input" type="date" value={form.followUpDate||''} onChange={e=>setForm(old=>({...old,followUpDate:e.target.value}))}/></Field>}
    </>}{error&&<p role="alert" className="notice error">{error}</p>}<div className="dialog-actions"><Button kind="primary" disabled={busy} onClick={()=>void saveDialog()}>保存</Button></div>
   </Modal>
  </>}
 </section>;
}
