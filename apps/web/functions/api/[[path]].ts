import {proxyApiRequest} from '../../lib/api-proxy';

export function onRequest(context:{request:Request}){
 return proxyApiRequest(context.request);
}
