import {knowledgeGateway} from '../lib/knowledge-gateway';
import {type KnowledgeEnv} from '../lib/knowledge-edge';
export function onRequest(context:{request:Request;env:KnowledgeEnv;next:()=>Promise<Response>}){
 let path:string;try{path=decodeURIComponent(new URL(context.request.url).pathname);}catch{return new Response('Invalid path',{status:400});}
 if(path==='/knowledge'||path.startsWith('/knowledge/')||path.includes('/knowledge/'))return knowledgeGateway(context.request,context.env);
 return context.next();
}
