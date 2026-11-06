import type Database from 'better-sqlite3';
export type QuestionAnswer={id:string;speakerId:string;content:string};
export function questionAnswers(q:any):QuestionAnswer[]{
 if(q?.answers_json!=null)return JSON.parse(q.answers_json);
 return q&&(q.answer||q.answerer_id)?[{id:'legacy-'+q.id,speakerId:q.answerer_id||'',content:q.answer||''}]:[];
}
export function withQuestionAnswers(rows:any[]){return rows.map(q=>({...q,answers:questionAnswers(q)}));}
export function answersForWrite(db:Database.Database,raw:any,current?:any):QuestionAnswer[]{
 if(raw.answers!==undefined){
  if(!Array.isArray(raw.answers)||raw.answers.length>100)throw new Error('每个问题最多记录 100 条回答');
  const answers=raw.answers.map((a:any)=>{
   if(!a||typeof a.id!=='string'||!/^[-\w]{1,80}$/.test(a.id)||typeof a.speakerId!=='string'||typeof a.content!=='string'||a.content.length>30000)throw new Error('回答格式无效');
   if(a.speakerId&&!db.prepare('SELECT 1 FROM users WHERE id=?').get(a.speakerId))throw new Error('请选择有效的回答人');
   if(a.content.trim()&&!a.speakerId&&!a.id.startsWith('legacy-'))throw new Error('请为每条回答选择回答人');
   return {id:a.id,speakerId:a.speakerId,content:a.content};
  });
  if(new Set(answers.map((a:QuestionAnswer)=>a.id)).size!==answers.length)throw new Error('回答标识重复');
  return answers;
 }
 const previous=questionAnswers(current);
 if(raw.answer===undefined&&raw.answererId===undefined)return previous;
 const content=raw.answer===undefined?current?.answer||'':String(raw.answer).slice(0,30000),speakerId=raw.answererId===undefined?current?.answerer_id||'':String(raw.answererId||'');
 if(previous.length>1){
  if(content!==(current?.answer||'')||speakerId!==(current?.answerer_id||''))throw Object.assign(new Error('该问题已有多条回答，请刷新页面后逐条编辑'),{status:409});
  return previous;
 }
 if(speakerId&&!db.prepare('SELECT 1 FROM users WHERE id=?').get(speakerId))throw new Error('回答人无效');
 return content||speakerId?[{id:previous[0]?.id||'legacy-new',speakerId,content}]:[];
}
export function answersText(db:Database.Database,answers:QuestionAnswer[]){
 if(answers.length===1)return answers[0].content;
 return answers.map(a=>`${(db.prepare('SELECT name FROM users WHERE id=?').get(a.speakerId) as {name:string}|undefined)?.name||'未署名'}：${a.content||'尚未记录'}`).join('\n\n');
}
