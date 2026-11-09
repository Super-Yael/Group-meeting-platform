import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv,randomBytes} from 'node:crypto';
import {issueKnowledgeCookie,verifyKnowledgeRequest,serveKnowledge} from '../apps/web/lib/knowledge-edge';
import {proxyApiRequest} from '../apps/web/lib/api-proxy';
const origin='https://group-meeting-platform.pages.dev',secret='test-only-access-key',key=randomBytes(32),dataKey=key.toString('base64');
async function request(path='/knowledge/catalog.json',session='test-session',now?:number){const base=new Request(origin+'/api/bootstrap',{headers:{Cookie:'mm_session='+session}}),cookie=await issueKnowledgeCookie(base,{id:'admin',role:'admin'},secret,now);return new Request(origin+path,{headers:{Cookie:'mm_session='+session+'; '+cookie.split(';')[0]}});}
function encrypted(path:string,data:Buffer){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv);c.setAAD(Buffer.from(path));return Buffer.concat([Buffer.from('MLD1'),iv,c.update(data),c.final(),c.getAuthTag()]);}
test('document proofs bind the signed-in session, origin, expiry and role; forged cookies fail closed',async()=>{
 const valid=await request();assert.equal(await verifyKnowledgeRequest(valid,secret),true);
 assert.equal(await verifyKnowledgeRequest(new Request(valid.url,{headers:{Cookie:valid.headers.get('Cookie')!.replace('test-session','other-session')}}),secret),false);
 assert.equal(await verifyKnowledgeRequest(new Request('https://other.example/knowledge/catalog.json',{headers:valid.headers}),secret),false);
 assert.equal(await verifyKnowledgeRequest(await request('/knowledge/catalog.json','test-session',100),secret,1001),false);
 assert.equal(await verifyKnowledgeRequest(valid,secret+'wrong'),false);
 const fake=new Request(valid.url,{headers:{Cookie:valid.headers.get('Cookie')!.slice(0,-1)+'!'}});assert.equal(await verifyKnowledgeRequest(fake,secret),false);
});
test('catalog, images, encrypted blobs and PDF are unavailable without a session and never fall back to plaintext',async()=>{
 let reads=0;const env={DOCS_ACCESS_SECRET:secret,DOCS_DATA_KEY:dataKey,ASSETS:{fetch:async()=>{reads++;return new Response('should not be read');}}};
 for(const path of ['/knowledge/catalog.json','/knowledge/catalog.json.bin','/knowledge/assets/biostar/example.png','/knowledge/assets/governance/confidentiality-agreement.pdf'])assert.equal((await serveKnowledge(new Request(origin+path),env)).status,401);
 assert.equal(reads,0);
 assert.equal((await serveKnowledge(await request(),{})).status,503);
 assert.equal((await serveKnowledge(await request('/knowledge/catalog.json.bin'),env)).status,404);assert.equal(reads,0);
});
test('authorized files decrypt only at the edge; image bytes and PDF ranges are preserved without an origin API call',async()=>{
 const path='/knowledge/assets/governance/confidentiality-agreement.pdf',clear=Buffer.from('%PDF-test-complete-body'),cipher=encrypted(path,clear);let reads=0;
 const env={DOCS_ACCESS_SECRET:secret,DOCS_DATA_KEY:dataKey,ASSETS:{fetch:async(r:Request)=>{reads++;assert.equal(new URL(r.url).pathname,path+'.bin');assert.equal(r.headers.get('Cookie'),null);assert.equal(r.headers.get('Range'),null);return new Response(cipher);}}};
 const r=await request(path),response=await serveKnowledge(r,env);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),clear);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Content-Type'),'application/pdf');
 const range=new Request(r.url,{headers:{...Object.fromEntries(r.headers),'Range':'bytes=0-3'}}),partial=await serveKnowledge(range,env);assert.equal(partial.status,206);assert.equal(await partial.text(),'%PDF');assert.equal(partial.headers.get('Content-Range'),`bytes 0-3/${clear.length}`);
 const head=await serveKnowledge(new Request(r.url,{method:'HEAD',headers:r.headers}),env);assert.equal(await head.text(),'');assert.equal(head.headers.get('Content-Length'),String(clear.length));
 const bad=await serveKnowledge(new Request(r.url,{headers:{...Object.fromEntries(r.headers),'Range':'bytes=999999-'}}),env);assert.equal(bad.status,416);assert.equal(reads,4);
});
test('ciphertext cannot be moved to a different URL and malformed paths cannot select arbitrary static assets',async()=>{
 const p='/knowledge/catalog.json',packed=encrypted(p,Buffer.from('{"private":true}'));
 const env={DOCS_ACCESS_SECRET:secret,DOCS_DATA_KEY:dataKey,ASSETS:{fetch:async()=>new Response(packed)}};
 assert.equal((await serveKnowledge(await request('/knowledge/search.json'),env)).status,502);
 assert.equal((await serveKnowledge(await request('/knowledge/%252e%252e/config'),env)).status,404);
 assert.equal((await serveKnowledge(await request('/knowledge/assets/biostar/test.html'),env)).status,404);
});
test('only an authenticated bootstrap issues a proof, and logout clears it without sharing it across hosts',async()=>{
 const req=new Request(origin+'/api/bootstrap',{headers:{Cookie:'mm_session=test-session'}});
 const ok=(async()=>Response.json({user:{id:'pi',role:'pi'}})) as typeof fetch;
 const res=await proxyApiRequest(req,ok,{DOCS_ACCESS_SECRET:secret});assert.match(res.headers.get('Set-Cookie')!,/mm_docs=.*HttpOnly.*SameSite=Lax.*Secure/);assert.doesNotMatch(res.headers.get('Set-Cookie')!,/Domain=/);
 const bad=await proxyApiRequest(req,(async()=>Response.json({error:'unauthorized'},{status:401})) as typeof fetch,{DOCS_ACCESS_SECRET:secret});assert.equal(bad.headers.get('Set-Cookie'),null);
 const logout=await proxyApiRequest(new Request(origin+'/api/logout',{method:'POST'}),(async()=>Response.json({ok:true})) as typeof fetch,{DOCS_ACCESS_SECRET:secret});assert.match(logout.headers.get('Set-Cookie')!,/mm_docs=;.*Max-Age=0/);
});
import {knowledgeGateway} from '../apps/web/lib/knowledge-gateway';
test('a direct protected PDF renews an expired edge proof through authenticated bootstrap; concurrent files share that renewal',async()=>{
 const path='/knowledge/assets/governance/confidentiality-agreement.pdf',data=Buffer.from('%PDF-authorized'),env={DOCS_ACCESS_SECRET:secret,DOCS_DATA_KEY:dataKey,ASSETS:{fetch:async()=>new Response(encrypted(path,data))}};
 let checks=0;const login=(async(_url,options)=>{checks++;assert.match(new Headers(options?.headers).get('Cookie')!,/mm_session=renewal-test/);await new Promise(r=>setTimeout(r,10));return Response.json({user:{id:'pi',role:'pi'}});}) as typeof fetch;
 const expired=await request(path,'renewal-test',100);
 const responses=await Promise.all([knowledgeGateway(expired,env,login),knowledgeGateway(expired,env,login)]);assert.equal(checks,1);for(const response of responses){assert.equal(response.status,200);assert.equal(await response.text(),'%PDF-authorized');assert.match(response.headers.get('Set-Cookie')!,/^mm_docs=/);}
 const denied=await knowledgeGateway(new Request(origin+path,{headers:{Cookie:'mm_session=invalid-test'}}),env,(async()=>Response.json({error:'Expired'},{status:401})) as typeof fetch);assert.equal(denied.status,401);
});
test('SVG figures require authentication and are sandboxed when opened directly',async()=>{
 const path='/knowledge/assets/biostar/sample.svg',svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),env={DOCS_ACCESS_SECRET:secret,DOCS_DATA_KEY:dataKey,ASSETS:{fetch:async()=>new Response(encrypted(path,svg))}};
 assert.equal((await serveKnowledge(new Request(origin+path),env)).status,401);
 const res=await serveKnowledge(await request(path),env);assert.equal(res.status,200);assert.equal(res.headers.get('Content-Type'),'image/svg+xml');assert.match(res.headers.get('Content-Security-Policy')!,/sandbox.*default-src 'none'/);assert.deepEqual(Buffer.from(await res.arrayBuffer()),svg);
});
