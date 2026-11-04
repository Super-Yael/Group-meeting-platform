import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proxyApiRequest} from '../apps/web/lib/api-proxy';

const site='https://group-meeting-platform.pages.dev';
test('same-origin login forwards its body and issues a private first-party cookie',async()=>{
 const request=new Request(site+'/api/login',{method:'POST',headers:{Origin:site,'Content-Type':'application/json',Cookie:'mm_session=old-session'},body:JSON.stringify({userId:'fwl',password:'test-only-password'})});
 const send=(async(url,options)=>{
  assert.equal(String(url),'https://lab-api.yyael.com/api/login');
  assert.equal(options?.method,'POST');
  assert.equal(new Headers(options?.headers).get('origin'),site);
  assert.equal(new Headers(options?.headers).get('cookie'),'mm_session=old-session');
  assert.equal(JSON.parse(await new Response(options?.body).text()).userId,'fwl');
  return Response.json({ok:true},{headers:{'Set-Cookie':'mm_session=new-session; Domain=lab-api.yyael.com; Path=/; HttpOnly; Secure; SameSite=None','Access-Control-Allow-Origin':site,'Cache-Control':'public'}});
 }) as typeof fetch;
 const response=await proxyApiRequest(request,send);
 assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie')!;
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.doesNotMatch(cookie,/Domain=/i);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(response.headers.get('access-control-allow-origin'),null);
});
test('proxy rejects cross-site writes and never forwards an arbitrary URL',async()=>{
 let called=false;
 const blocked=await proxyApiRequest(new Request(site+'/api/documents',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),(async()=>{called=true;throw new Error();}) as typeof fetch);
 assert.equal(blocked.status,403);assert.equal(called,false);
 const missing=await proxyApiRequest(new Request(site+'/unrelated'),(async()=>{called=true;throw new Error();}) as typeof fetch);
 assert.equal(missing.status,404);assert.equal(called,false);
 await proxyApiRequest(new Request(site+'/api/documents?url=https://other.example'),(async url=>{
  assert.equal(new URL(String(url)).origin,'https://lab-api.yyael.com');return Response.json([]);
 }) as typeof fetch);
});
test('exports stream unchanged and authentication failures remain visible',async()=>{
 const bytes=new Uint8Array([80,75,3,4,0,255]);
 const response=await proxyApiRequest(new Request(site+'/api/export?format=docx'),(async()=>new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename=notes.docx'}})) as typeof fetch);
 assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
 assert.match(response.headers.get('content-disposition')!,/notes.docx/);
 const denied=await proxyApiRequest(new Request(site+'/api/bootstrap'),(async()=>Response.json({error:'请先登录'},{status:401})) as typeof fetch);
 assert.equal(denied.status,401);assert.deepEqual(await denied.json(),{error:'请先登录'});
});
test('upstream outages and unexpected redirects produce a readable error',async()=>{
 const request=()=>new Request(site+'/api/bootstrap');
 const unavailable=await proxyApiRequest(request(),(async()=>{throw new Error('network failure');}) as typeof fetch);
 assert.equal(unavailable.status,502);assert.match((await unavailable.json() as {error:string}).error,/服务器/);
 const redirect=await proxyApiRequest(request(),(async()=>new Response(null,{status:302,headers:{Location:'https://other.example'}})) as typeof fetch);
 assert.equal(redirect.status,502);assert.equal(redirect.headers.get('location'),null);
});
