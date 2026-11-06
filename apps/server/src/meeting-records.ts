import type Database from 'better-sqlite3';
import {questionAnswers,answersForWrite,answersText,type QuestionAnswer} from './question-answers.js';

export const blockKinds=['presentation','question','analysis','mentor_summary','speech'] as const;
export const blockLabels:Record<string,string>={presentation:'分享',question:'提问',analysis:'分析',mentor_summary:'老师总结',speech:'发言'};
export type MeetingBlock={id:string;kind:typeof blockKinds[number];title:string;speakerId:string;content:string;relatedBlockId?:string;questionId?:number;questionRevision?:number;answer?:string;answererId?:string;answers?:QuestionAnswer[];status?:'open'|'tracking'|'resolved';followUpDate?:string};
const fail=(message:string,status=400)=>Object.assign(new Error(message),{status});
export function ensureMeetingSchema(db:Database.Database){
 const columns=db.pragma('table_info(daily_records)') as {name:string}[];
 if(!columns.some(c=>c.name==='blocks_json'))db.exec('ALTER TABLE daily_records ADD COLUMN blocks_json TEXT');
 if(!columns.some(c=>c.name==='revision'))db.exec('ALTER TABLE daily_records ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
 const schema=(db.prepare("SELECT sql FROM sqlite_master WHERE name='qa_logs'").get() as {sql:string}).sql;
 if(!schema.includes("'tracking'"))db.transaction(()=>{
  db.exec("CREATE TABLE qa_with_tracking(id INTEGER PRIMARY KEY,date TEXT NOT NULL,questioner_id TEXT NOT NULL REFERENCES users(id),answerer_id TEXT REFERENCES users(id),question TEXT NOT NULL,answer TEXT NOT NULL DEFAULT '',status TEXT NOT NULL CHECK(status IN ('open','tracking','resolved')) DEFAULT 'open',follow_up_date TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,revision INTEGER NOT NULL DEFAULT 0)");
  db.exec('INSERT INTO qa_with_tracking(id,date,questioner_id,answerer_id,question,answer,status,follow_up_date,created_at,updated_at) SELECT id,date,questioner_id,answerer_id,question,answer,status,follow_up_date,created_at,updated_at FROM qa_logs; DROP TABLE qa_logs; ALTER TABLE qa_with_tracking RENAME TO qa_logs');
 })();
 const qaColumns=db.pragma('table_info(qa_logs)') as {name:string}[];
 if(!qaColumns.some(c=>c.name==='answers_json'))db.exec('ALTER TABLE qa_logs ADD COLUMN answers_json TEXT');
 if(!qaColumns.some(c=>c.name==='revision'))db.exec('ALTER TABLE qa_logs ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
}
export function meetingBlocks(db:Database.Database,date:string,record:any,includeUnlinked=false):MeetingBlock[]{
 let blocks:MeetingBlock[]=[];
 if(record?.blocks_json!==null&&record?.blocks_json!==undefined)blocks=JSON.parse(record.blocks_json);
 else if(record){
  for(const [key,label,kind] of [['summary','原记录 · 核心结论','analysis'],['clinical','原记录 · 临床证据','analysis'],['dry_lab','原记录 · 干实验','analysis'],['wet_lab','原记录 · 湿实验','analysis'],['feasibility','原记录 · 可行性','analysis'],['ideas','原记录 · 课题想法','analysis'],['mentor_notes','老师总结','mentor_summary'],['free_notes','自由纪要','speech']])if(record[key]?.trim())blocks.push({id:'legacy-'+key,kind:kind as MeetingBlock['kind'],title:label,speakerId:kind==='mentor_summary'?'chs':'',content:record[key]});
  for(const [i,section] of JSON.parse(record.custom_sections||'[]').entries())blocks.push({id:'legacy-custom-'+i,kind:'speech',title:section.title||'发言',speakerId:'',content:section.content||''});
 }
 const questions=db.prepare('SELECT * FROM qa_logs WHERE date=? ORDER BY id').all(date) as any[];
 if(!blocks.length&&record?.blocks_json==null){
  const presenter=db.prepare("SELECT user_id FROM schedules WHERE date=? AND duty_type='presenter' ORDER BY id LIMIT 1").get(date) as {user_id:string}|undefined;
  blocks=blockKinds.map(kind=>({id:'default-'+kind,kind,title:blockLabels[kind],speakerId:kind==='presentation'?presenter?.user_id||'':kind==='mentor_summary'?'chs':'',content:'',...(kind==='question'?{status:'open' as const,answer:'',answererId:'',answers:[],followUpDate:''}:{}),...(['question','analysis'].includes(kind)?{relatedBlockId:'default-presentation'}:{})}));
 }
 const linked=new Set(blocks.map(b=>b.questionId));
 for(const q of questions)if((record?.blocks_json==null||includeUnlinked)&&!linked.has(q.id))blocks.push({id:'question-'+q.id,kind:'question',title:'提问',speakerId:q.questioner_id,content:q.question,questionId:q.id});
 return blocks.map(b=>{
  const q=b.kind==='question'&&questions.find(q=>q.id===b.questionId);
  return q?{...b,speakerId:q.questioner_id,content:q.question,answers:questionAnswers(q),answer:q.answer,answererId:q.answerer_id||'',status:q.status,followUpDate:q.follow_up_date||'',questionRevision:q.revision}:b;
 });
}
export function saveMeetingBlocks(db:Database.Database,date:string,recorderId:string,body:any){
 if(!Array.isArray(body.blocks)||body.blocks.length>100)throw fail('会议环节最多 100 块');
 const text=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw fail('环节字段格式或长度不正确');return value;};
 const blocks:MeetingBlock[]=body.blocks.map((raw:any)=>{
  if(!raw||!blockKinds.includes(raw.kind)||typeof raw.id!=='string'||!/^[-\w]{1,80}$/.test(raw.id))throw fail('会议环节类型或标识无效');
  const b:MeetingBlock={id:raw.id,kind:raw.kind,title:text(raw.title,120),speakerId:text(raw.speakerId,40),content:text(raw.content,30000)};
  if(b.speakerId&&!db.prepare('SELECT 1 FROM users WHERE id=?').get(b.speakerId))throw fail('请选择有效的发言人');
  if(raw.relatedBlockId)b.relatedBlockId=text(raw.relatedBlockId,80);
  if(b.kind==='question'){
   b.status=raw.status||'open';if(!['open','tracking','resolved'].includes(b.status!))throw fail('提问状态无效');
   if(raw.answers!==undefined)b.answers=answersForWrite(db,raw);
   b.answer=text(raw.answer||'',30000);b.answererId=text(raw.answererId||'',40);b.followUpDate=text(raw.followUpDate||'',10);
   if(b.followUpDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(b.followUpDate)||Number.isNaN(Date.parse(b.followUpDate))||new Date(b.followUpDate).toISOString().slice(0,10)!==b.followUpDate))throw fail('追踪日期无效');
   if(b.answererId&&!db.prepare('SELECT 1 FROM users WHERE id=?').get(b.answererId))throw fail('请选择有效的回答人');
   if(b.content.trim()&&!b.speakerId)throw fail('请为提问选择提问人');
   if(raw.questionId!==undefined){if(!Number.isInteger(raw.questionId)||raw.questionId<1)throw fail('问题标识无效');b.questionId=raw.questionId;b.questionRevision=raw.questionRevision;}
  }
  return b;
 });
 if(new Set(blocks.map(b=>b.id)).size!==blocks.length)throw fail('环节标识重复');
 const questionIds=blocks.filter(b=>b.questionId).map(b=>b.questionId);
 if(new Set(questionIds).size!==questionIds.length)throw fail('同一个问题不能重复绑定环节');
 for(const b of blocks)if(b.relatedBlockId&&!blocks.some(other=>other.id===b.relatedBlockId&&other.kind==='presentation'))throw fail('关联的分享环节不存在');
 return db.transaction(()=>{
  const current=db.prepare('SELECT revision FROM daily_records WHERE date=?').get(date) as {revision:number}|undefined;
  if(!Number.isInteger(body.revision)||body.revision!==(current?.revision||0))throw fail('记录已被更新，请先保留当前内容，再重新载入',409);
  for(const b of blocks.filter(b=>b.kind==='question')){
   if(b.questionId){
    const q=db.prepare('SELECT * FROM qa_logs WHERE id=?').get(b.questionId) as any;
    if(!q||q.date!==date)throw fail('不能修改其他日期的问题');
    if(q.revision!==b.questionRevision)throw fail('有问题状态已被更新，请先保留当前内容，再重新载入',409);
    if(!b.content.trim())throw fail('已登记的问题内容不能为空');
    b.answers=answersForWrite(db,b,q);b.answer=answersText(db,b.answers);b.answererId=b.answers[0]?.speakerId||'';
    db.prepare('UPDATE qa_logs SET questioner_id=?,question=?,answer=?,answerer_id=?,answers_json=?,status=?,follow_up_date=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(b.speakerId,b.content,b.answer,b.answererId||null,JSON.stringify(b.answers),b.status,b.status==='resolved'?null:b.followUpDate||null,b.questionId);
    b.questionRevision=q.revision+1;
   }else if(b.content.trim()){
    b.answers=answersForWrite(db,b);b.answer=answersText(db,b.answers);b.answererId=b.answers[0]?.speakerId||'';
    b.questionId=Number(db.prepare('INSERT INTO qa_logs(date,questioner_id,question,answer,answerer_id,answers_json,status,follow_up_date) VALUES(?,?,?,?,?,?,?,?)').run(date,b.speakerId,b.content,b.answer,b.answererId||null,JSON.stringify(b.answers),b.status,b.status==='resolved'?null:b.followUpDate||null).lastInsertRowid);b.questionRevision=0;
   }
  }
  const summary=(blocks.find(b=>b.kind==='mentor_summary'&&b.content.trim())||blocks.find(b=>b.content.trim()))?.content||'';
  db.prepare("INSERT INTO daily_records(date,recorder_id,summary,blocks_json,revision) VALUES(?,?,?,?,1) ON CONFLICT(date) DO UPDATE SET recorder_id=excluded.recorder_id,summary=excluded.summary,blocks_json=excluded.blocks_json,revision=daily_records.revision+1,status='draft',published_at=NULL,updated_at=CURRENT_TIMESTAMP").run(date,recorderId,summary,JSON.stringify(blocks));
  return {revision:(current?.revision||0)+1,blocks};
 })();
}
