import {serveKnowledge,cookieValue,type KnowledgeEnv} from './knowledge-edge';
import {proxyApiRequest} from './api-proxy';
const renewing=new Map<string,{until:number;promise:Promise<string>}>();
// Long reading sessions and direct PDF/image links may outlive the short edge proof.
// Renew only the tiny login proof; document bytes always come from Cloudflare ASSETS.
export async function knowledgeGateway(request:Request,env:KnowledgeEnv,send:typeof fetch=fetch){
 const first=await serveKnowledge(request,env);if(first.status!==401||!cookieValue(request,'mm_session'))return first;
 const url=new URL(request.url),session=cookieValue(request,'mm_session'),cacheKey=url.origin+'\0'+session,now=Date.now();
 let entry=renewing.get(cacheKey);
 if(!entry||entry.until<now){
  const promise=(async()=>{const login=await proxyApiRequest(new Request(new URL('/api/bootstrap',url),{headers:{Cookie:'mm_session='+session}}),send,env);return login.ok?login.headers.getSetCookie().find(cookie=>cookie.startsWith('mm_docs='))||'':'';})();
  entry={until:now+5000,promise};renewing.set(cacheKey,entry);if(renewing.size>100)renewing.delete(renewing.keys().next().value!);
 }
 try{
  const cookie=await entry.promise;if(!cookie)return first;
  const headers=new Headers(request.headers),existing=(headers.get('cookie')||'').split(';').filter(p=>!p.trim().startsWith('mm_docs='));headers.set('cookie',[...existing,cookie.split(';')[0]].join('; '));
  const response=await serveKnowledge(new Request(request,{headers}),env);response.headers.append('Set-Cookie',cookie);return response;
 }catch{return first;}
}
