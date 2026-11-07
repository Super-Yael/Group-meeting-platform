import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export type FacetValue={key:string;label:string;aliases?:string[]};
export type CatalogAxis={key:string;label:string;description:string;values:FacetValue[]};
export type CatalogCategory={key:string;name:string;parentKey:string|null;description:string;axes:CatalogAxis[]};
export type MethodDocument={id:number;title:string;category:string;content:string;author_id:string;author_name:string;updated_at:string;category_key?:string;category_path?:string;summary?:string;aliases?:string[];tags?:string[];facets?:Record<string,string[]>;archived?:boolean;can_edit?:boolean;revision?:number};
export type MethodCatalog={categories:CatalogCategory[];documents:MethodDocument[]};
export type DocumentHeading={id:string;text:string;depth:number;offset:number};
type MarkdownNode={type:string;value?:string;alt?:string;depth?:number;children?:MarkdownNode[];position?:{start:{offset?:number}}};


export function headingText(node:MarkdownNode):string{
 if(node.type==='text'||node.type==='inlineCode')return node.value||'';
 if(node.type==='image')return node.alt||'';
 return (node.children||[]).map(headingText).join('');
}
export function documentHeadings(content:string,documentId:number|string):DocumentHeading[]{
 const root=unified().use(remarkParse).use(remarkGfm).parse(content) as MarkdownNode;
 const headings:DocumentHeading[]=[],counts=new Map<string,number>();
 function walk(node:MarkdownNode){
  if(node.type==='heading'){
   const text=headingText(node),slug=text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';
   const count=(counts.get(slug)||0)+1;counts.set(slug,count);
   headings.push({id:`method-${documentId}-${slug}${count>1?`-${count}`:''}`,text,depth:Math.max(2,node.depth||2),offset:node.position?.start.offset??0});
  }
  for(const child of node.children||[])walk(child);
 }
 walk(root);return headings;
}
export function categoryTrail(categories:CatalogCategory[],key:string):CatalogCategory[]{
 const trail:CatalogCategory[]=[],seen=new Set<string>();let current=categories.find(c=>c.key===key);
 while(current&&!seen.has(current.key)){trail.unshift(current);seen.add(current.key);current=categories.find(c=>c.key===current!.parentKey);}
 return trail;
}
export function documentsInCategory(documents:MethodDocument[],key:string){return documents.filter(doc=>!doc.archived&&(!key||doc.category_key===key||doc.category_key?.startsWith(key+'/')));}
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
export function filterDocuments(documents:MethodDocument[],query:string,categories:CatalogCategory[]=[]){
 const terms=query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).map(normalize).filter(Boolean);
 return documents.filter(doc=>!doc.archived).map(doc=>{
  const category=categories.find(c=>c.key===doc.category_key);
  const facets=category?.axes.flatMap(axis=>axis.values.filter(v=>doc.facets?.[axis.key]?.includes(v.key)).flatMap(v=>[v.label,...v.aliases||[]]))||[];
  const aliases=(doc.aliases||[]).map(normalize),title=normalize(doc.title);
  const text=normalize([doc.title,doc.category_path||doc.category,doc.summary||'',doc.content,...doc.aliases||[],...doc.tags||[],...facets].join(' '));
  const matches=terms.every(term=>text.includes(term));
  const score=terms.reduce((total,term)=>total+(title===term?100:title.includes(term)?50:aliases.includes(term)?90:aliases.some(alias=>alias.includes(term))?40:1),0);
  return {doc,matches,score};
 }).filter(row=>row.matches).sort((a,b)=>b.score-a.score||a.doc.title.localeCompare(b.doc.title,'zh-CN')).map(row=>row.doc);
}
export function groupByAxis(documents:MethodDocument[],axis?:CatalogAxis){
 if(!axis)return [{key:'all',label:'全部方法',pages:documents}];
 const groups=axis.values.map(value=>({key:value.key,label:value.label,pages:documents.filter(doc=>doc.facets?.[axis.key]?.includes(value.key))})).filter(group=>group.pages.length);
 const rest=documents.filter(doc=>!axis.values.some(value=>doc.facets?.[axis.key]?.includes(value.key)));
 if(rest.length)groups.push({key:'general',label:'通用方法与配套技术',pages:rest});
 return groups;
}
export function relatedDocuments(selected:MethodDocument,documents:MethodDocument[]){
 return documents.filter(doc=>!doc.archived&&doc.id!==selected.id&&doc.category_key===selected.category_key).map(doc=>({doc,score:Object.entries(selected.facets||{}).reduce((score,[key,values])=>score+values.filter(v=>doc.facets?.[key]?.includes(v)).length,0)+(doc.tags||[]).filter(tag=>selected.tags?.includes(tag)).length})).sort((a,b)=>b.score-a.score||a.doc.id-b.doc.id).slice(0,5).map(row=>row.doc);
}
// Legacy category grouping remains available to consumers of the original documents API.
export function groupDocuments(documents:MethodDocument[]){
 const groups=new Map<string,MethodDocument[]>();for(const doc of documents){const category=doc.category_path||doc.category||'待分类';if(!groups.has(category))groups.set(category,[]);groups.get(category)!.push(doc);}
 return [...groups].sort(([a],[b])=>a.localeCompare(b,'zh-CN')).map(([category,pages])=>({category,pages:pages.sort((a,b)=>a.id-b.id)}));
}
