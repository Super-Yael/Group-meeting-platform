const upstreamOrigin='https://lab-api.yyael.com';

// Pages only forwards requests; authentication, application logic and SQLite stay on 4C20G.
export async function proxyApiRequest(request:Request,send:typeof fetch=fetch):Promise<Response>{
 const incoming=new URL(request.url);
 if(!incoming.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
 const origin=request.headers.get('origin');
 if(origin&&origin!==incoming.origin)return Response.json({error:'来源不允许'},{status:403});
 const headers=new Headers();
 for(const name of ['accept','content-type','cookie','origin']){
  const value=request.headers.get(name);if(value)headers.set(name,value);
 }
 const target=new URL(incoming.pathname+incoming.search,upstreamOrigin);
 try{
  const response=await send(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',signal:AbortSignal.timeout(60_000)});
  const resultHeaders=new Headers(response.headers);
  // Keep responses and session cookies private to the browser's current site.
  resultHeaders.set('Cache-Control','no-store');
  resultHeaders.delete('Access-Control-Allow-Origin');
  resultHeaders.delete('Access-Control-Allow-Credentials');
  resultHeaders.delete('Report-To');resultHeaders.delete('NEL');
  const cookies=response.headers.getSetCookie();
  if(cookies.length){
   resultHeaders.delete('Set-Cookie');
   for(const cookie of cookies)resultHeaders.append('Set-Cookie',cookie.replace(/;\s*Domain=[^;]+/gi,'').replace(/SameSite=None/gi,'SameSite=Lax'));
  }
  if(response.status>=300&&response.status<400&&resultHeaders.has('Location')){
   return Response.json({error:'API 服务返回了意外跳转，请稍后重试'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers:resultHeaders});
 }catch{
  return Response.json({error:'暂时无法连接服务器，请稍后重试'},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
