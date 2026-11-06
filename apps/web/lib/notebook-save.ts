export type NotebookBlock={id:string;kind:string;title:string;speakerId:string;content:string;relatedBlockId?:string;questionId?:number;questionRevision?:number;answers?:{id:string;speakerId:string;content:string}[];answer?:string;answererId?:string;status?:string;followUpDate?:string};
export type SaveConflict={label:string;local:unknown;remote:unknown};
export type ConflictChoice='local'|'remote';
const fields=['kind','title','speakerId','content','relatedBlockId','status','followUpDate'] as const;
const fieldLabels:Record<string,string>={kind:'环节类型',title:'标题',speakerId:'人员',content:'记录内容',relatedBlockId:'对应分享',status:'提问状态',followUpDate:'追踪日期'};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const clean=(b:NotebookBlock)=>Object.fromEntries([...fields.map(k=>[k,b[k]||'']),['answers',b.kind==='question'?b.answers||[]:[]]]);

/** Three-way merge: only changes made on this page replace the loaded baseline. */
export function mergeNotebook(base:NotebookBlock[],local:NotebookBlock[],remote:NotebookBlock[],choice?:ConflictChoice){
 const conflicts:SaveConflict[]=[];
 const value=(b:unknown,l:unknown,r:unknown,label:string):any=>{
  if(same(l,b))return r;if(same(r,b)||same(l,r))return l;
  conflicts.push({label,local:l,remote:r});return choice==='remote'?r:l;
 };
 const collection=<T extends {id:string}>(before:T[],mine:T[],latest:T[],label:string,canonical:(x:T)=>unknown,merge:(b:T|undefined,l:T,r:T)=>T):T[]=>{
  const bm=new Map(before.map(x=>[x.id,x])),lm=new Map(mine.map(x=>[x.id,x])),rm=new Map(latest.map(x=>[x.id,x]));
  const merged=new Map<string,T>();
  for(const id of new Set([...bm.keys(),...lm.keys(),...rm.keys()])){
   const b=bm.get(id),l=lm.get(id),r=rm.get(id);
   if(l&&r)merged.set(id,merge(b,l,r));
   else if(b){
    const remaining=l||r;
    if(remaining&&!same(canonical(remaining),canonical(b))){
     const selected=value(canonical(b),l?canonical(l):undefined,r?canonical(r):undefined,`${label} · ${(b as {title?:string}).title||'条目'}（移除与修改冲突）`);
     if(selected!==undefined)merged.set(id,(choice==='remote'?r:l)!);
    }
   }else if(l||r)merged.set(id,(l||r)!);
  }
  const kept=(rows:T[])=>rows.filter(x=>bm.has(x.id)&&merged.has(x.id)).map(x=>x.id);
  const order:string[]=value(kept(before),kept(mine),kept(latest),`${label}顺序`);
  // Insert new entries beside their nearest surviving neighbour, without discarding either author's additions.
  for(const rows of [mine,latest])for(let i=0;i<rows.length;i++){
   const id=rows[i].id;if(!merged.has(id)||order.includes(id))continue;
   const previous=rows.slice(0,i).reverse().find(x=>order.includes(x.id)),next=rows.slice(i+1).find(x=>order.includes(x.id));
   if(previous)order.splice(order.indexOf(previous.id)+1,0,id);else if(next)order.splice(order.indexOf(next.id),0,id);else order.push(id);
  }
  return order.filter(id=>merged.has(id)).map(id=>merged.get(id)!);
 };
 const blocks=collection(base,local,remote,'会议环节',clean,(b,l,r)=>{
  const merged:NotebookBlock={...r,id:l.id};
  for(const field of fields)(merged as any)[field]=value(b?.[field]||'',l[field]||'',r[field]||'',`「${l.title||r.title||'未命名环节'}」的${fieldLabels[field]}`);
  if(merged.kind==='question'){
   merged.answers=collection(b?.answers||[],l.answers||[],r.answers||[],`「${merged.title}」回答`,x=>x,(before,mine,latest)=>({id:mine.id,speakerId:value(before?.speakerId||'',mine.speakerId,latest.speakerId,`「${merged.title}」回答人`),content:value(before?.content||'',mine.content,latest.content,`「${merged.title}」回答内容`)}));
   // IDs and revisions belong to the latest server snapshot, not the editable fields.
   merged.questionId=r.kind==='question'?r.questionId:undefined;merged.questionRevision=r.kind==='question'?r.questionRevision:undefined;
  }else{delete merged.questionId;delete merged.questionRevision;delete merged.answers;delete merged.answer;delete merged.answererId;}
  return merged;
 });
 const presentations=new Set(blocks.filter(b=>b.kind==='presentation').map(b=>b.id));
 return {blocks:blocks.map(b=>b.relatedBlockId&&!presentations.has(b.relatedBlockId)?{...b,relatedBlockId:undefined}:b),conflicts};
}

export class NotebookConflictError extends Error{
 constructor(public conflicts:SaveConflict[]){super('同一处内容在另一页面也被修改。你的输入已保留，请核对后选择。');}
}
type Snapshot={record:{revision:number}|null;blocks:NotebookBlock[]};
export async function saveNotebook<T extends NotebookBlock>(options:{base:T[];local:T[];choice?:ConflictChoice;read:()=>Promise<Snapshot>;write:(body:{blocks:NotebookBlock[];revision:number})=>Promise<{blocks:T[];revision:number}>}){
 for(let attempt=0;attempt<3;attempt++){
  const latest=await options.read(),merged=mergeNotebook(options.base,options.local,latest.blocks,options.choice);
  if(merged.conflicts.length&&!options.choice)throw new NotebookConflictError(merged.conflicts);
  try{return await options.write({blocks:merged.blocks,revision:latest.record?.revision||0});}
  catch(e){if(!(e&&typeof e==='object'&&'status' in e&&e.status===409))throw e;}
 }
 throw new Error('其他页面仍在同时保存。你的输入已保留，请稍后再点保存。');
}
