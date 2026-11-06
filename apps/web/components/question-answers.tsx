'use client';
import {ArrowUp,ArrowDown,Plus,Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
export type QuestionAnswer={id:string;speakerId:string;content:string};
type Person={id:string;name:string};
export function QuestionAnswers({answers,users,onChange,disabled=false,prefix='问题'}:{answers:QuestionAnswer[];users:Person[];onChange?:(answers:QuestionAnswer[])=>void;disabled?:boolean;prefix?:string}){
 const change=(id:string,patch:Partial<QuestionAnswer>)=>onChange?.(answers.map(a=>a.id===id?{...a,...patch}:a));
 const move=(index:number,delta:number)=>{const next=[...answers];[next[index],next[index+delta]]=[next[index+delta],next[index]];onChange?.(next);};
 return <div className="question-responses">
  <p className="response-title">逐人回答</p>
  {!answers.length&&<p className="small muted">尚未记录回答。{onChange?'可按现场顺序逐位添加。':''}</p>}
  {answers.map((answer,index)=><div className="answer-entry" key={answer.id}>
   {onChange?<><div className="answer-entry-heading"><label className="field"><span>回答人 {index+1}</span><select className="select" aria-label={`${prefix}第 ${index+1} 条回答人`} disabled={disabled} value={answer.speakerId} onChange={e=>change(answer.id,{speakerId:e.target.value})}><option value="">选择回答人</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label><div className="row-actions answer-actions"><Button kind="ghost" aria-label={`${prefix}上移第 ${index+1} 条回答`} disabled={disabled||index===0} onClick={()=>move(index,-1)}><ArrowUp size={15}/></Button><Button kind="ghost" aria-label={`${prefix}下移第 ${index+1} 条回答`} disabled={disabled||index===answers.length-1} onClick={()=>move(index,1)}><ArrowDown size={15}/></Button><Button kind="ghost" aria-label={`${prefix}移除第 ${index+1} 条回答`} disabled={disabled} onClick={()=>onChange(answers.filter(a=>a.id!==answer.id))}><Trash2 size={15}/></Button></div></div><textarea className="textarea" aria-label={`${prefix}第 ${index+1} 条回答内容`} disabled={disabled} value={answer.content} placeholder="记录这位成员的回答、补充或不同观点。" onChange={e=>change(answer.id,{content:e.target.value})}/></>:<><p className="small response-speaker">回答 {index+1} · {users.find(u=>u.id===answer.speakerId)?.name||'未署名'}</p><div className="doc-content">{answer.content||<span className="muted">尚未记录</span>}</div></>}
  </div>)}
  {onChange&&<Button disabled={disabled} onClick={()=>onChange([...answers,{id:crypto.randomUUID(),speakerId:'',content:''}])}><Plus size={15}/>{answers.length?'添加下一位回答':'添加回答'}</Button>}
 </div>;
}
