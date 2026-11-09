// Authentication and decryption stay on Cloudflare; private content never enters browser JS bundles.
export type KnowledgeEnv={DOCS_ACCESS_SECRET?:string;DOCS_DATA_KEY?:string;ASSETS?:{fetch:(request:Request)=>Promise<Response>}};
const encoder=new TextEncoder(),decoder=new TextDecoder(),ttl=900;
const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unbase64=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function cookieValue(request:Request,name:string){return (request.headers.get('cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(name+'='))?.slice(name.length+1)||'';}
async function digest(value:string){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));}
async function signingKey(secret:string){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function issueKnowledgeCookie(request:Request,user:{id:string;role:string},secret:string,now=Math.floor(Date.now()/1000)){
 const session=cookieValue(request,'mm_session');if(!session||!user.id||!['admin','member','pi'].includes(user.role))return '';
 const payload=b64url(encoder.encode(JSON.stringify({v:1,uid:user.id,role:user.role,aud:new URL(request.url).origin,session:await digest(session),iat:now,exp:now+ttl})));
 const signature=b64url(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(secret),encoder.encode(payload))));
 return `mm_docs=${payload}.${signature}; Path=/knowledge; HttpOnly; SameSite=Lax; Max-Age=${ttl}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export function clearKnowledgeCookie(request:Request){return `mm_docs=; Path=/knowledge; HttpOnly; SameSite=Lax; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function verifyKnowledgeRequest(request:Request,secret:string,now=Math.floor(Date.now()/1000)){
 try{
  const token=cookieValue(request,'mm_docs'),session=cookieValue(request,'mm_session'),parts=token.split('.');if(!session||parts.length!==2||token.length>2048)return false;
  const [payload,signature]=parts;if(!await crypto.subtle.verify('HMAC',await signingKey(secret),unbase64(signature),encoder.encode(payload)))return false;
  const data=JSON.parse(decoder.decode(unbase64(payload)));
  return data.v===1&&typeof data.uid==='string'&&data.uid.length>0&&['admin','member','pi'].includes(data.role)&&data.aud===new URL(request.url).origin&&Number.isInteger(data.exp)&&Number.isInteger(data.iat)&&data.exp>now&&data.iat<=now+30&&data.exp-data.iat<=ttl&&data.session===await digest(session);
 }catch{return false;}
}
const privateHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Cookie'};
function failure(message:string,status:number){return Response.json({error:message},{status,headers:privateHeaders});}
const mime:Record<string,string>={json:'application/json; charset=utf-8',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml',pdf:'application/pdf'};
export async function serveKnowledge(request:Request,env:KnowledgeEnv):Promise<Response>{
 if(!env.DOCS_ACCESS_SECRET||!env.DOCS_DATA_KEY||!env.ASSETS)return failure('文档服务尚未完成配置',503);
 if(!await verifyKnowledgeRequest(request,env.DOCS_ACCESS_SECRET))return failure('请登录后查阅团队文档',401);
 if(!['GET','HEAD'].includes(request.method))return failure('不支持此操作',405);
 const url=new URL(request.url);let pathname:string;
 try{pathname=decodeURIComponent(url.pathname);}catch{return failure('资源路径无效',400);}
 if(!pathname.startsWith('/knowledge/')||pathname.includes('\\')||pathname.includes('%')||pathname.split('/').some(s=>s==='..'||s==='.')||!/^\/knowledge\/(?:catalog\.json|search\.json|docs\/\d+\.json|assets\/(?:[a-f0-9]{24}\.(?:png|jpg|jpeg|gif|svg)|governance\/confidentiality-agreement\.pdf))$/.test(pathname))return failure('资源不存在',404);
 try{
  const keyBytes=unbase64(env.DOCS_DATA_KEY);if(keyBytes.length!==32)return failure('文档服务密钥配置无效',503);
  url.pathname=pathname+'.bin';url.search='';
  // Fetch only encrypted assets. No plaintext is published even if routing is accidentally bypassed.
  const asset=await env.ASSETS.fetch(new Request(url,{method:'GET'}));if(!asset.ok)return failure('资源不存在',404);
  const packed=new Uint8Array(await asset.arrayBuffer());if(packed.length<32||decoder.decode(packed.slice(0,4))!=='MLD1')return failure('资源不存在',404);
  const key=await crypto.subtle.importKey('raw',keyBytes,'AES-GCM',false,['decrypt']);
  const clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:packed.slice(4,16),additionalData:encoder.encode(pathname)},key,packed.slice(16)));
  const headers=new Headers(privateHeaders);headers.set('Content-Type',mime[pathname.split('.').at(-1)||'']||'application/octet-stream');headers.set('Accept-Ranges','bytes');
  if(pathname.endsWith('.svg'))headers.set('Content-Security-Policy',"sandbox; default-src 'none'");
  if(pathname.endsWith('.pdf'))headers.set('Content-Disposition','inline; filename="confidentiality-agreement.pdf"');
  let start=0,end=clear.length-1,status=200;const range=request.headers.get('range');
  if(range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':`bytes */${clear.length}`}});
   if(match[1]){start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;}else start=Math.max(0,clear.length-Number(match[2]));
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=clear.length)return new Response(null,{status:416,headers:{...privateHeaders,'Content-Range':`bytes */${clear.length}`}});
   status=206;headers.set('Content-Range',`bytes ${start}-${end}/${clear.length}`);
  }
  headers.set('Content-Length',String(end-start+1));return new Response(request.method==='HEAD'?null:clear.slice(start,end+1).buffer,{status,headers});
 }catch{return failure('文档资源校验失败，请稍后重试',502);}
}
