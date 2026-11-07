import type Database from 'better-sqlite3';
import {categoryPath,inferLegacyCategory,leafCategories} from './lab-taxonomy.js';

type Actor={id:string;role:string};
type Row={id:number;title:string;category:string;category_key:string;content:string;summary:string;aliases_json:string;tags_json:string;facets_json:string;archived:number;revision:number;author_id:string;[key:string]:unknown};
const failure=(message:string,status=400)=>Object.assign(new Error(message),{status});
export function ensureDocumentSchema(db:Database.Database){
 const fields=new Set((db.pragma('table_info(documents)') as {name:string}[]).map(column=>column.name));
 db.transaction(()=>{
  for(const [name,definition] of Object.entries({category_key:"TEXT NOT NULL DEFAULT ''",summary:"TEXT NOT NULL DEFAULT ''",aliases_json:"TEXT NOT NULL DEFAULT '[]'",tags_json:"TEXT NOT NULL DEFAULT '[]'",facets_json:"TEXT NOT NULL DEFAULT '{}'",archived:'INTEGER NOT NULL DEFAULT 0',revision:'INTEGER NOT NULL DEFAULT 0'})){
   if(!fields.has(name))db.exec(`ALTER TABLE documents ADD COLUMN ${name} ${definition}`);
  }
  const rows=db.prepare("SELECT id,title,category FROM documents WHERE category_key=''").all() as {id:number;title:string;category:string}[];
  const update=db.prepare('UPDATE documents SET category_key=? WHERE id=?');
  for(const row of rows)update.run(inferLegacyCategory(row.title,row.category),row.id);
 })();
}
function array(value:unknown,label:string){
 if(!Array.isArray(value)||value.length>50||value.some(item=>typeof item!=='string'||!item.trim()||item.length>100))throw failure(`${label}格式无效，最多 50 项，每项最多 100 字`);
 return [...new Set(value.map(item=>String(item).trim()))];
}
function text(value:unknown,label:string,max:number,required=false){
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw failure(`${label}${required?'不能为空，':''}最多 ${max} 字`);
 return required?value.trim():value;
}
function json<T>(value:string,fallback:T):T{try{return JSON.parse(value) as T;}catch{return fallback;}}
export function documentView(row:Row,actor:Actor){
 const {aliases_json,tags_json,facets_json,...rest}=row;
 return {...rest,category_path:categoryPath(row.category_key),aliases:json<string[]>(aliases_json,[]),tags:json<string[]>(tags_json,[]),facets:json<Record<string,string[]>>(facets_json,{}),archived:!!row.archived,can_edit:actor.role!=='pi'&&(actor.role==='admin'||row.author_id===actor.id)};
}
export function listDocuments(db:Database.Database,actor:Actor,{activeOnly=false}={}){
 const rows=db.prepare(`SELECT d.*,u.name AS author_name FROM documents d JOIN users u ON u.id=d.author_id ${activeOnly?'WHERE d.archived=0':''} ORDER BY d.id`).all() as Row[];
 return rows.map(row=>documentView(row,actor));
}
export function getDocument(db:Database.Database,actor:Actor,id:number){
 const row=db.prepare('SELECT d.*,u.name AS author_name FROM documents d JOIN users u ON u.id=d.author_id WHERE d.id=?').get(id) as Row|undefined;
 if(!row)throw failure('页面不存在',404);return documentView(row,actor);
}
export function saveDocument(db:Database.Database,actor:Actor,input:Record<string,unknown>,id?:number){
 if(actor.role==='pi')throw failure('PI 账号为只读',403);
 if(!input||typeof input!=='object'||Array.isArray(input))throw failure('页面内容格式无效');
 return db.transaction(()=>{
  const old=id?db.prepare('SELECT * FROM documents WHERE id=?').get(id) as Row|undefined:undefined;
  if(id&&!old)throw failure('页面不存在',404);
  if(old&&actor.role!=='admin'&&old.author_id!==actor.id)throw failure('只有作者或管理员可以修改此页面',403);
  if(old&&input.baseRevision!==undefined&&input.baseRevision!==old.revision)throw failure('页面已被其他成员更新，当前草稿已保留，请重新载入最新版本后核对',409);
  const title=text(input.title,'标题',200,true),content=text(input.content,'正文',100000);
  const categoryKey=typeof input.categoryKey==='string'?input.categoryKey:old?.category_key||inferLegacyCategory(title,String(input.category||''));
  const category=leafCategories.find(c=>c.key===categoryKey);if(!category)throw failure('请选择有效的实验类别');
  const summary=input.summary===undefined?old?.summary||'':text(input.summary,'简介',1000);
  const aliases=input.aliases===undefined?json<string[]>(old?.aliases_json||'[]',[]):array(input.aliases,'别名');
  const tags=input.tags===undefined?json<string[]>(old?.tags_json||'[]',[]):array(input.tags,'标签');
  const facets=input.facets===undefined&&old?.category_key===categoryKey?json<Record<string,string[]>>(old.facets_json,{}):input.facets||{};
  if(typeof facets!=='object'||Array.isArray(facets)||facets===null)throw failure('分类维度格式无效');
  const allowed=new Map(category.axes.map(axis=>[axis.key,new Set(axis.values.map(v=>v.key))]));
  const normalized:Record<string,string[]>={};
  for(const [key,value] of Object.entries(facets)){
   if(!allowed.has(key))throw failure('分类维度与实验类别不匹配');
   const items=array(value,'分类维度');if(items.some(item=>!allowed.get(key)!.has(item)))throw failure('分类选项无效');
   normalized[key]=items;
  }
  if(input.archived!==undefined&&typeof input.archived!=='boolean')throw failure('归档状态格式无效');
  const archived=input.archived===undefined?old?.archived||0:Number(input.archived);
  const values=[title,categoryPath(categoryKey),content,categoryKey,summary,JSON.stringify(aliases),JSON.stringify(tags),JSON.stringify(normalized),archived];
  let documentId=id;
  if(old)db.prepare('UPDATE documents SET title=?,category=?,content=?,category_key=?,summary=?,aliases_json=?,tags_json=?,facets_json=?,archived=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(...values,id);
  else documentId=Number(db.prepare('INSERT INTO documents(title,category,content,category_key,summary,aliases_json,tags_json,facets_json,archived,author_id) VALUES(?,?,?,?,?,?,?,?,?,?)').run(...values,actor.id).lastInsertRowid);
  db.prepare('INSERT INTO audit_log(actor_id,action,details) VALUES(?,?,?)').run(actor.id,old?'document.update':'document.create',JSON.stringify({id:documentId,categoryKey,archived:!!archived}));
  return getDocument(db,actor,documentId!);
 })();
}
