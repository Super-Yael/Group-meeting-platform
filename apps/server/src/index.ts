import express,{type Request,type Response,type NextFunction} from 'express';
import cors from 'cors';
import { createHash,randomBytes,timingSafeEqual } from 'node:crypto';
import { Document,Packer,Paragraph,TextRun,HeadingLevel } from 'docx';
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import {withQuestionAnswers,answersForWrite,answersText,questionAnswers} from './question-answers.js';
import {meetingBlocks,saveMeetingBlocks,blockLabels} from './meeting-records.js';
import {createDb,hashPassword,verifyPassword,assertDate,listDuties,addDuty,movePresenter,requestSwap,decideSwap,isAdmin,audit,assertContentWrite,recordPermissions,canEditReview} from './core.js';

const db=createDb(process.env.DB_PATH||'./data/lab.sqlite');
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
const loginAttempts=new Map<string,{count:number;until:number}>();app.use(express.json({limit:'1mb'}));
const origins=(process.env.WEB_ORIGIN||'http://localhost:3000').split(',').map(x=>x.trim());
app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin)),credentials:true}));
app.use((req,res,next)=>{if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!origins.includes(req.headers.origin)){res.status(403).json({error:'来源不允许'});return;}next();});
const wrap=(fn:(req:Request,res:Response)=>unknown)=>(req:Request,res:Response,next:NextFunction)=>{try{Promise.resolve(fn(req,res)).catch(next);}catch(e){next(e);}};
const cookie=(req:Request,name:string)=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const tokenHash=(s:string)=>createHash('sha256').update(s).digest('hex');
function user(req:Request){const token=cookie(req,'mm_session');if(!token)return null;return db.prepare(`SELECT u.id,u.name,u.role,u.team_group FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')`).get(tokenHash(token)) as {id:string;name:string;role:string;team_group:string}|undefined;}
function requireUser(req:Request){const u=user(req);if(!u)throw Object.assign(new Error('请先登录'),{status:401});return u;}
function requireAdmin(req:Request){const u=requireUser(req);if(!isAdmin(db,u.id))throw Object.assign(new Error('需要管理员权限'),{status:403});return u;}
function bodyText(value:unknown,max=10000){return typeof value==='string'?value.slice(0,max):'';}
function valDate(value:unknown){const d=String(value||'');assertDate(d);return d;}
function id(value:unknown){const n=Number(value);if(!Number.isInteger(n)||n<1)throw new Error('ID 无效');return n;}
function setting(key:string){return (db.prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value||'';}
app.get('/health',(_,res)=>res.json({ok:true}));
app.get('/api/bootstrap',wrap((req,res)=>{const u=requireUser(req);const users=db.prepare('SELECT id,name,role,team_group FROM users ORDER BY CASE team_group WHEN \'host\' THEN 0 WHEN \'A\' THEN 1 ELSE 2 END,id').all();res.json({user:u,users,settings:{meetingNumber:setting('meeting_number'),meetingUrl:setting('meeting_url'),meetingTime:setting('meeting_time'),meetingCycle:setting('meeting_cycle')}});}));
app.post('/api/login',wrap((req,res)=>{const key=req.ip||'unknown';const attempt=loginAttempts.get(key);if(attempt&&attempt.until>Date.now()&&attempt.count>=10)throw Object.assign(new Error('登录尝试过多，请 15 分钟后再试'),{status:429});if(!attempt||attempt.until<Date.now())loginAttempts.set(key,{count:0,until:Date.now()+15*60_000});const row=db.prepare('SELECT id,name,role,team_group,password_hash FROM users WHERE id=?').get(bodyText(req.body.userId,40)) as any;if(!row?.password_hash||!verifyPassword(bodyText(req.body.password,200),row.password_hash)){loginAttempts.get(key)!.count++;throw Object.assign(new Error('账号或密码错误'),{status:401});}loginAttempts.delete(key);const token=randomBytes(32).toString('hex');db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+14 days'))").run(tokenHash(token),row.id);res.cookie('mm_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax',maxAge:14*86400000,path:'/'});res.json({user:{id:row.id,name:row.name,role:row.role,team_group:row.team_group}});}));
app.post('/api/logout',wrap((req,res)=>{const token=cookie(req,'mm_session');if(token)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token));res.clearCookie('mm_session',{path:'/',secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax'});res.json({ok:true});}));
app.post('/api/account/password',wrap((req,res)=>{const u=requireUser(req);const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(u.id) as any;if(!row.password_hash||!verifyPassword(bodyText(req.body.currentPassword),row.password_hash))throw new Error('当前密码错误');const p=bodyText(req.body.newPassword,200);if(p.length<12)throw new Error('新密码至少 12 位');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(p),u.id);db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(u.id,tokenHash(cookie(req,'mm_session')||''));res.json({ok:true});}));
app.post('/api/admin/invite',wrap((req,res)=>{const u=requireAdmin(req),uid=bodyText(req.body.userId,40);const target=db.prepare('SELECT id,role FROM users WHERE id=?').get(uid) as any;if(!target||!['member','pi'].includes(target.role))throw new Error('团队账号不存在');const code=randomBytes(18).toString('base64url');db.transaction(()=>{db.prepare("INSERT INTO invites(user_id,code_hash,expires_at,created_by) VALUES(?,?,datetime('now','+7 days'),?) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,created_by=excluded.created_by,created_at=CURRENT_TIMESTAMP").run(uid,tokenHash(code),u.id);audit(db,u.id,'account.invite',{userId:uid});})();res.json({code,expiresInDays:7});}));
app.post('/api/activate',wrap((req,res)=>{const uid=bodyText(req.body.userId,40),code=bodyText(req.body.code,100),password=bodyText(req.body.password,200);if(password.length<12)throw new Error('密码至少 12 位');const invite=db.prepare("SELECT code_hash FROM invites WHERE user_id=? AND expires_at>datetime('now')").get(uid) as {code_hash:string}|undefined;if(!invite){throw Object.assign(new Error('邀请码无效或已过期'),{status:401});}const expected=Buffer.from(invite.code_hash,'hex'),actual=Buffer.from(tokenHash(code),'hex');if(!timingSafeEqual(expected,actual))throw Object.assign(new Error('邀请码无效或已过期'),{status:401});db.transaction(()=>{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password),uid);db.prepare('DELETE FROM invites WHERE user_id=?').run(uid);db.prepare('DELETE FROM sessions WHERE user_id=?').run(uid);audit(db,uid,'account.activate',{});})();const token=randomBytes(32).toString('hex');db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+14 days'))").run(tokenHash(token),uid);res.cookie('mm_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:process.env.NODE_ENV==='production'?'none':'lax',maxAge:14*86400000,path:'/'});res.json({ok:true});}));
// Team content is read-only for PI; personal password and login routes remain available.
app.use('/api',(req,_res,next)=>{try{if(!['GET','HEAD','OPTIONS'].includes(req.method))assertContentWrite(requireUser(req).role);next();}catch(error){next(error);}});
app.put('/api/settings',wrap((req,res)=>{const u=requireAdmin(req);for(const [key,value] of Object.entries({meeting_number:bodyText(req.body.meetingNumber,60),meeting_url:bodyText(req.body.meetingUrl,500),meeting_time:bodyText(req.body.meetingTime,100),meeting_cycle:bodyText(req.body.meetingCycle,200)})){if(key==='meeting_url'&&value&&!/^https:\/\//.test(value))throw new Error('会议链接必须是 HTTPS');db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,value);}audit(db,u.id,'settings.update',{});res.json({ok:true});}));
app.get('/api/pi/overview',wrap((req,res)=>{
 const u=requireUser(req);if(!['pi','admin'].includes(u.role))throw Object.assign(new Error('仅 PI 或管理员可访问'),{status:403});
 const from=valDate(req.query.from),to=valDate(req.query.to);
 if(to<from||Date.parse(to)-Date.parse(from)>365*86400000)throw new Error('请选择一年以内的有效区间');
 const records=db.prepare('SELECT r.*,u.name AS recorder_name FROM daily_records r LEFT JOIN users u ON u.id=r.recorder_id WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(from,to);
 const reviews=db.prepare('SELECT r.*,u.name AS owner_name FROM reviews r LEFT JOIN users u ON u.id=r.owner_id WHERE period_start<=? AND period_end>=? ORDER BY period_start DESC').all(to,from);
 const questionStatus=['resolved','tracking'].includes(String(req.query.questionStatus))?String(req.query.questionStatus):'open',offset=Math.max(0,Math.min(100000,Math.floor(Number(req.query.offset)||0)));
 const questions=db.prepare("SELECT q.*,u.name AS questioner_name FROM qa_logs q JOIN users u ON u.id=q.questioner_id WHERE (q.status=? OR (?='open' AND q.status='tracking')) ORDER BY CASE WHEN follow_up_date IS NULL OR follow_up_date='' THEN 1 ELSE 0 END,follow_up_date,date LIMIT 200 OFFSET ?").all(questionStatus,questionStatus,offset);
 const questionCount=(db.prepare("SELECT COUNT(*) AS n FROM qa_logs WHERE status<>'resolved'").get() as {n:number}).n;
 const paperCount=(db.prepare('SELECT COUNT(*) AS n FROM papers WHERE date BETWEEN ? AND ?').get(from,to) as {n:number}).n;
 const questionTotal=(db.prepare('SELECT COUNT(*) AS n FROM qa_logs WHERE (status=? OR (?=\'open\' AND status=\'tracking\'))').get(questionStatus,questionStatus) as {n:number}).n;
 res.json({questionTotal,from,to,updatedAt:new Date().toISOString(),records,reviews,questions:withQuestionAnswers(questions),questionCount,paperCount,duties:listDuties(db,from,to)});
}));
app.get('/api/schedule',wrap((req,res)=>{requireUser(req);const from=valDate(req.query.from),to=valDate(req.query.to);res.json({duties:listDuties(db,from,to),swaps:db.prepare(`SELECT r.*,a.user_id AS source_user_id,b.user_id AS target_user_id,ua.name AS requester_name,ub.name AS target_name FROM swap_requests r JOIN schedules a ON a.id=r.source_schedule_id JOIN schedules b ON b.id=r.target_schedule_id JOIN users ua ON ua.id=r.requester_id JOIN users ub ON ub.id=b.user_id WHERE r.status='pending' AND (r.source_date BETWEEN ? AND ? OR r.target_date BETWEEN ? AND ?) ORDER BY r.created_at DESC`).all(from,to,from,to)});}));
app.post('/api/schedule',wrap((req,res)=>{const u=requireAdmin(req);const type=req.body.dutyType;if(!['presenter','recorder','host'].includes(type))throw new Error('任务类型无效');const result=addDuty(db,u.id,valDate(req.body.date),bodyText(req.body.userId,40),type);res.json({id:result});}));
app.delete('/api/schedule/:id',wrap((req,res)=>{const u=requireAdmin(req);const duty=db.prepare('SELECT * FROM schedules WHERE id=?').get(id(req.params.id)) as any;if(!duty)throw new Error('任务不存在');db.transaction(()=>{db.prepare('DELETE FROM schedules WHERE id=?').run(duty.id);audit(db,u.id,'schedule.remove',duty);})();res.json({ok:true});}));
app.post('/api/schedule/generate',wrap((req,res)=>{const u=requireAdmin(req);const start=valDate(req.body.startDate);const days=Math.min(31,Math.max(1,Number(req.body.days)||7));const all=['lxg','sya','cyx','lzq','lpl'];const created:any[]=[];db.transaction(()=>{for(let i=0;i<days;i++){const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10);if(d.getUTCDay()===0||d.getUTCDay()===6||db.prepare('SELECT 1 FROM schedules WHERE date=?').get(date))continue;const group=i%2===0?['lxg','sya']:['cyx','lzq','lpl'];const recorder=all.filter(x=>!group.includes(x))[i%all.filter(x=>!group.includes(x)).length];addDuty(db,u.id,date,'fwl','host');for(const member of group)addDuty(db,u.id,date,member,'presenter');addDuty(db,u.id,date,recorder,'recorder');created.push(date);}})();res.json({dates:created});}));
app.post('/api/schedule/:id/move',wrap((req,res)=>{const u=requireUser(req);res.json(movePresenter(db,u.id,id(req.params.id),valDate(req.body.targetDate)));}));
app.post('/api/swaps',wrap((req,res)=>{const u=requireUser(req);res.json({id:requestSwap(db,u.id,id(req.body.sourceId),id(req.body.targetId),bodyText(req.body.reason,500))});}));
app.post('/api/swaps/:id/decide',wrap((req,res)=>{const u=requireUser(req);decideSwap(db,u.id,id(req.params.id),req.body.approve===true);res.json({ok:true});}));
app.get('/api/records/:date',wrap((req,res)=>{const u=requireUser(req);const date=valDate(req.params.date);const record=db.prepare('SELECT * FROM daily_records WHERE date=?').get(date)||null;const papers=db.prepare('SELECT p.*,u.name AS presenter_name FROM papers p LEFT JOIN users u ON u.id=p.presenter_id WHERE p.date=? ORDER BY p.id').all(date);const qa=db.prepare('SELECT q.*,u.name AS questioner_name,a.name AS answerer_name FROM qa_logs q JOIN users u ON u.id=q.questioner_id LEFT JOIN users a ON a.id=q.answerer_id WHERE q.date=? ORDER BY q.id').all(date);const attendance=db.prepare('SELECT * FROM attendance WHERE date=?').all(date);const followUps=db.prepare("SELECT q.*,u.name AS questioner_name FROM qa_logs q JOIN users u ON u.id=q.questioner_id WHERE q.status<>'resolved' AND q.date<? ORDER BY q.date DESC LIMIT 30").all(date);res.json({record,blocks:meetingBlocks(db,date,record),papers,qa:withQuestionAnswers(qa),attendance,followUps:withQuestionAnswers(followUps),duties:listDuties(db,date,date),permissions:recordPermissions(db,u,date)});}));
app.put('/api/records/:date',wrap((req,res)=>{const u=requireUser(req),date=valDate(req.params.date);const rec=db.prepare("SELECT user_id FROM schedules WHERE date=? AND duty_type='recorder'").get(date) as any;if(!recordPermissions(db,u,date).canEditRecord)throw Object.assign(new Error('只有当日记录人或管理员可以编辑'),{status:403});if(req.body.blocks!==undefined){const result=saveMeetingBlocks(db,date,rec?.user_id||u.id,req.body);audit(db,u.id,'record.save_blocks',{date,revision:result.revision});res.json(result);return;}const current=db.prepare('SELECT blocks_json FROM daily_records WHERE date=?').get(date) as any;if(current?.blocks_json!=null)throw Object.assign(new Error('请刷新页面使用新版会议记录'),{status:409});const fields=['summary','clinical','dry_lab','wet_lab','feasibility','ideas','mentor_notes','free_notes'];const values=fields.map(k=>bodyText(req.body[k],30000));const sections=Array.isArray(req.body.customSections)?req.body.customSections.slice(0,20).map((s:any)=>({title:bodyText(s.title,100),content:bodyText(s.content,10000)})):[];db.prepare(`INSERT INTO daily_records(date,recorder_id,${fields.join(',')},custom_sections) VALUES(?,?,${fields.map(()=>'?').join(',')},?) ON CONFLICT(date) DO UPDATE SET recorder_id=excluded.recorder_id,${fields.map(k=>`${k}=excluded.${k}`).join(',')},custom_sections=excluded.custom_sections,status='draft',published_at=NULL,updated_at=CURRENT_TIMESTAMP`).run(date,rec?.user_id||u.id,...values,JSON.stringify(sections));audit(db,u.id,'record.save',{date});res.json({ok:true});}));
app.post('/api/records/:date/publish',wrap((req,res)=>{
 const u=requireUser(req),date=valDate(req.params.date);
 if(!recordPermissions(db,u,date).canPublishRecord)throw Object.assign(new Error('只有当日记录人或管理员可以发布'),{status:403});
 if(!db.prepare('SELECT 1 FROM daily_records WHERE date=?').get(date))throw new Error('请先保存记录');
 db.prepare("UPDATE daily_records SET status='published',published_at=CURRENT_TIMESTAMP WHERE date=?").run(date);
 audit(db,u.id,'record.publish',{date});res.json({ok:true});
}));
app.put('/api/attendance/:date/:userId',wrap((req,res)=>{const u=requireUser(req),date=valDate(req.params.date),uid=bodyText(req.params.userId,40);if(!db.prepare('SELECT 1 FROM users WHERE id=?').get(uid))throw new Error('成员不存在');if(!recordPermissions(db,u,date).canManageAttendance)throw Object.assign(new Error('只有当日记录人或管理员可以管理出席'),{status:403});db.prepare('INSERT INTO attendance(date,user_id,present) VALUES(?,?,?) ON CONFLICT(date,user_id) DO UPDATE SET present=excluded.present').run(date,uid,req.body.present?1:0);res.json({ok:true});}));
app.post('/api/papers',wrap((req,res)=>{
 const u=requireUser(req),date=valDate(req.body.date);
 const permissions=recordPermissions(db,u,date);
 if(!permissions.canAddPaper)throw Object.assign(new Error('只有当日汇报人、记录人或管理员可以添加文献'),{status:403});
 const title=bodyText(req.body.title,500).trim();if(!title)throw new Error('请填写文献标题');
 // Presenters submit their own sources; recorders and admins can enter sources for others.
 const presenter=bodyText(req.body.presenterId,40)||(permissions.canEditRecord?null:u.id);
 if(u.role!=='admin'&&presenter){
  if(!permissions.canEditRecord&&presenter!==u.id)throw Object.assign(new Error('只能为自己的汇报添加文献'),{status:403});
  if(!db.prepare("SELECT 1 FROM schedules WHERE date=? AND user_id=? AND duty_type='presenter'").get(date,presenter))throw new Error('请选择当日汇报人');
 }
 if(presenter&&!db.prepare("SELECT 1 FROM users WHERE id=? AND role<>'pi'").get(presenter))throw new Error('汇报人无效');
 const doi=bodyText(req.body.doi,300),url=bodyText(req.body.url,500);
 if(url&&!/^https:\/\//.test(url))throw new Error('文献链接必须是 HTTPS');
 const result=db.prepare('INSERT INTO papers(date,title,doi,url,presenter_id,key_finding,limitations) VALUES(?,?,?,?,?,?,?)').run(date,title,doi,url,presenter,bodyText(req.body.keyFinding),bodyText(req.body.limitations));
 audit(db,u.id,'paper.add',{date,id:result.lastInsertRowid});res.json({id:result.lastInsertRowid});
}));
app.post('/api/qa',wrap((req,res)=>{
 const u=requireUser(req),date=valDate(req.body.date),questioner=bodyText(req.body.questionerId,40),question=bodyText(req.body.question,5000).trim();
 if(!question)throw new Error('请填写问题');
 if(questioner!==u.id&&!recordPermissions(db,u,date).canRecordOthersQa)throw Object.assign(new Error('只能记录自己的提问'),{status:403});
 const status=['open','tracking','resolved'].includes(req.body.status)?req.body.status:'open';
 const answers=answersForWrite(db,req.body),followUpDate=bodyText(req.body.followUpDate,10);if(followUpDate)assertDate(followUpDate);
 const result=db.prepare('INSERT INTO qa_logs(date,questioner_id,answerer_id,question,answer,answers_json,status,follow_up_date) VALUES(?,?,?,?,?,?,?,?)').run(date,questioner,answers[0]?.speakerId||null,question,answersText(db,answers),JSON.stringify(answers),status,status==='resolved'?null:followUpDate||null);
 res.json({id:result.lastInsertRowid});
}));
app.put('/api/qa/:id',wrap((req,res)=>{
 const u=requireUser(req),qid=id(req.params.id),q=db.prepare('SELECT * FROM qa_logs WHERE id=?').get(qid) as any;
 if(!q)throw new Error('问题不存在');
 if(q.questioner_id!==u.id&&q.answerer_id!==u.id&&!recordPermissions(db,u,q.date).canRecordOthersQa)throw Object.assign(new Error('只有提问人、回答人、当日记录人或管理员可以更新问题'),{status:403});
 if(req.body.revision!==undefined&&req.body.revision!==q.revision)throw Object.assign(new Error('问题已更新，请重新载入'),{status:409});
 const status=req.body.status??q.status;if(!['open','tracking','resolved'].includes(status))throw new Error('提问状态无效');
 const followUpDate=req.body.followUpDate===undefined?q.follow_up_date:bodyText(req.body.followUpDate,10);if(followUpDate)assertDate(followUpDate);
 const answers=answersForWrite(db,req.body,q);
 if(q.questioner_id!==u.id&&!recordPermissions(db,u,q.date).canRecordOthersQa){
  const others=(rows:ReturnType<typeof questionAnswers>)=>rows.filter(a=>a.speakerId!==u.id);
  if(JSON.stringify(others(answers))!==JSON.stringify(others(questionAnswers(q))))throw Object.assign(new Error('只能编辑自己的回答，不能修改他人的回答'),{status:403});
 }
 db.prepare('UPDATE qa_logs SET answer=?,answerer_id=?,answers_json=?,status=?,follow_up_date=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(answersText(db,answers),answers[0]?.speakerId||null,JSON.stringify(answers),status,status==='resolved'?null:followUpDate||null,qid);
 audit(db,u.id,'question.update',{id:qid,status});res.json({ok:true});
}));
// The private Git repository is now the only live knowledge source. Retain the old DB
// solely as a migration snapshot; old clients must not read or edit a stale copy.
app.all(/^\/api\/documents(?:\/.*)?$/,wrap((req,res)=>{
 requireUser(req);res.status(410).json({error:'团队文档已迁移至 Git 托管，请刷新页面后从团队文档入口查阅',location:'/?view=documents'});
}));
app.get('/api/reviews',wrap((req,res)=>{
 const u=requireUser(req);
 const rows=db.prepare('SELECT r.*,u.name AS owner_name FROM reviews r LEFT JOIN users u ON u.id=r.owner_id ORDER BY r.period_start DESC LIMIT 50').all() as {owner_id:string|null}[];
 res.json(rows.map(row=>({...row,can_edit:canEditReview(u,row.owner_id)})));
}));
app.put('/api/reviews',wrap((req,res)=>{
 const u=requireUser(req),type=req.body.periodType;
 if(!['weekly','halfmonth'].includes(type))throw new Error('周期无效');
 const start=valDate(req.body.periodStart),end=valDate(req.body.periodEnd);
 if(end<start)throw new Error('结束日期不能早于开始日期');
 db.transaction(()=>{
  // Authorize the stored owner before using any client-supplied identity or period key.
  const existing=(req.body.id
   ?db.prepare('SELECT id,owner_id FROM reviews WHERE id=?').get(id(req.body.id))
   :db.prepare('SELECT id,owner_id FROM reviews WHERE period_type=? AND period_start=?').get(type,start)) as {id:number;owner_id:string|null}|undefined;
  if(req.body.id&&!existing)throw Object.assign(new Error('周期总结不存在'),{status:404});
  if(existing&&!canEditReview(u,existing.owner_id))throw Object.assign(new Error('只有负责人或管理员可以修改周期总结'),{status:403});
  const owner=bodyText(req.body.ownerId,40)||existing?.owner_id||u.id;
  if(u.role!=='admin'&&owner!==u.id)throw Object.assign(new Error('只有管理员可以指定其他负责人'),{status:403});
  if(!db.prepare("SELECT 1 FROM users WHERE id=? AND role<>'pi'").get(owner))throw new Error('负责人必须是管理员或成员');
  const values=[type,start,end,bodyText(req.body.title,200),bodyText(req.body.summary,20000),bodyText(req.body.hypothesis,20000),bodyText(req.body.evidence,20000),bodyText(req.body.validationPlan,20000),owner,bodyText(req.body.nextStep,20000),['draft','review','ready'].includes(req.body.status)?req.body.status:'draft'];
  if(existing){
   db.prepare('UPDATE reviews SET period_type=?,period_start=?,period_end=?,title=?,summary=?,hypothesis=?,evidence=?,validation_plan=?,owner_id=?,next_step=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(...values,existing.id);
  }else{
   db.prepare('INSERT INTO reviews(period_type,period_start,period_end,title,summary,hypothesis,evidence,validation_plan,owner_id,next_step,status) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(...values);
  }
  audit(db,u.id,'review.save',{id:existing?.id,periodType:type,periodStart:start,ownerId:owner});
 })();res.json({ok:true});
}));
app.get('/api/export',wrap(async(req,res)=>{requireUser(req);const from=valDate(req.query.from),to=valDate(req.query.to),format=String(req.query.format||'docx');if(new Date(to).getTime()-new Date(from).getTime()>366*86400000)throw new Error('导出区间不能超过一年');const rows=db.prepare("SELECT r.*,u.name AS recorder_name FROM daily_records r LEFT JOIN users u ON u.id=r.recorder_id WHERE r.date BETWEEN ? AND ? AND r.status='published' ORDER BY r.date").all(from,to) as any[];if(!rows.length)throw new Error('所选区间没有已发布记录');const blocks:{heading:string;text:string}[]=[];for(const row of rows){blocks.push({heading:`${row.date} · 组会记录`,text:`记录：${row.recorder_name||'未指定'}`});for(const b of meetingBlocks(db,row.date,row,true)){
 const speaker=b.speakerId?(db.prepare('SELECT name FROM users WHERE id=?').get(b.speakerId) as any)?.name:'';
 if(b.content.trim())blocks.push({heading:`${b.title||blockLabels[b.kind]}${speaker?' · '+speaker:''}`,text:b.content+(b.kind==='question'?`\n状态：${{open:'待解决',tracking:'追踪中',resolved:'已解决'}[b.status||'open']}${b.followUpDate?' · 追踪日期 '+b.followUpDate:''}${b.answers?.length?'\n'+b.answers.map((a,i)=>`回答 ${i+1} · ${(db.prepare('SELECT name FROM users WHERE id=?').get(a.speakerId) as any)?.name||'未署名'}：${a.content||'尚未记录'}`).join('\n'):''}`:'')});
 }for(const p of db.prepare('SELECT title,doi FROM papers WHERE date=?').all(row.date) as any[])blocks.push({heading:'文献',text:p.title+(p.doi?` · DOI ${p.doi}`:'')});}

if(format==='docx'){const doc=new Document({sections:[{children:[new Paragraph({text:'课题组文献研读成册',heading:HeadingLevel.TITLE}),new Paragraph({text:`${from} — ${to}`}),...blocks.flatMap(b=>[new Paragraph({text:b.heading,heading:HeadingLevel.HEADING_2}),new Paragraph({children:[new TextRun(b.text)]})])]}]});const buf=await Packer.toBuffer(doc);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');res.setHeader('Content-Disposition',`attachment; filename="lab-notes-${from}-${to}.docx"`);res.send(buf);return;}
if(format==='pdf'){const font=process.env.PDF_FONT_PATH;if(!font||!fs.existsSync(font))throw Object.assign(new Error('服务器尚未配置中文 PDF 字体'),{status:503});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="lab-notes-${from}-${to}.pdf"`);const pdf=new PDFDocument({margin:50});pdf.pipe(res);if(font.endsWith('.ttc'))pdf.font(font,process.env.PDF_FONT_NAME||'NotoSansCJKsc-Regular');else pdf.font(font);pdf.fontSize(18).text('课题组文献研读成册');pdf.fontSize(10).text(`${from} — ${to}`);for(const b of blocks){pdf.moveDown().fontSize(13).text(b.heading).moveDown(.2).fontSize(10).text(b.text);}pdf.end();return;}throw new Error('导出格式无效');}));
app.use((err:any,_req:Request,res:Response,_next:NextFunction)=>{const message=err instanceof Error?err.message:'服务器错误';const status=err.status||(/UNIQUE constraint|FOREIGN KEY constraint/.test(message)?409:400);if(status>=500)console.error(err);res.status(status).json({error:message});});
const port=Number(process.env.PORT||4000);app.listen(port,'127.0.0.1',()=>console.log(`MM Lab API listening on 127.0.0.1:${port}`));
