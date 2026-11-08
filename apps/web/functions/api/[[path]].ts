import type {KnowledgeEnv} from '../../lib/knowledge-edge';
import {proxyApiRequest} from '../../lib/api-proxy';

export function onRequest(context:{request:Request;env:KnowledgeEnv}){
 return proxyApiRequest(context.request,fetch,context.env);
}
