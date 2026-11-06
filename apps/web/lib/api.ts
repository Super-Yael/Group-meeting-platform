export const API=process.env.NODE_ENV==='production'?'':process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000';
export class ApiError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{let res:Response;try{res=await fetch(`${API}${path}`,{...options,credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},cache:'no-store',signal:options.signal||AbortSignal.timeout(30_000)});}catch{throw new Error('无法连接组会平台，请检查网络后重试');}const type=res.headers.get('content-type')||'';const body=type.includes('application/json')?await res.json():null;if(!res.ok)throw new ApiError(body?.error||`请求失败 (${res.status})`,res.status);return body as T;}
export const post=(path:string,body:unknown)=>api(path,{method:'POST',body:JSON.stringify(body)});
export const put=(path:string,body:unknown)=>api(path,{method:'PUT',body:JSON.stringify(body)});
export const del=(path:string)=>api(path,{method:'DELETE'});
export function iso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
export function addDays(date:string,n:number){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)}
