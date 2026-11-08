import {API,api,ApiError} from './api';
import type {MethodCatalog,MethodDocument} from './method-docs';
async function read<T>(path:string,signal?:AbortSignal,retry=true):Promise<T>{
 const response=await fetch(API+path,{credentials:'include',cache:'no-store',signal:signal||AbortSignal.timeout(30000)});
 if(response.status===401&&retry){await api('/api/bootstrap',{signal});return read<T>(path,signal,false);}
 if(!response.ok){const body=await response.json().catch(()=>null);throw new ApiError(body?.error||'文档加载失败，请稍后重试',response.status);}
 return response.json();
}
export const loadKnowledge=(signal?:AbortSignal)=>read<MethodCatalog>('/knowledge/catalog.json',signal);
export const loadKnowledgeBody=(doc:MethodDocument,signal?:AbortSignal)=>read<{id:number;content:string}>(doc.body_url||`/knowledge/docs/${doc.id}.json`,signal);
export const loadKnowledgeSearch=(signal?:AbortSignal)=>read<{id:number;content:string}[]>('/knowledge/search.json',signal);
