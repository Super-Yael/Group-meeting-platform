import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

export type MethodDocument={id:number;title:string;category:string;content:string;author_id:string;author_name:string;updated_at:string};
export type DocumentHeading={id:string;text:string;depth:number;offset:number};
type MarkdownNode={type:string;value?:string;alt?:string;depth?:number;children?:MarkdownNode[];position?:{start:{offset?:number}}};
export const methodCategories=['阅读指南','实验设计','样本与建库','测序技术','数据分析','基因编辑','蛋白与功能实验','结构与计算','方法','疾病机制','文献笔记','写作规范','组内约定','其他'];

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
export function groupDocuments(documents:MethodDocument[]){
 const groups=new Map<string,MethodDocument[]>();
 for(const doc of documents){const name=doc.category.trim()||'其他';if(!groups.has(name))groups.set(name,[]);groups.get(name)!.push(doc);}
 return [...groups].sort(([a],[b])=>{
  const ai=methodCategories.indexOf(a),bi=methodCategories.indexOf(b);
  return (ai<0?methodCategories.length:ai)-(bi<0?methodCategories.length:bi)||a.localeCompare(b,'zh-CN');
 }).map(([category,pages])=>({category,pages:pages.sort((a,b)=>a.id-b.id)}));
}
export function filterDocuments(documents:MethodDocument[],query:string){
 const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return documents.filter(doc=>{const text=`${doc.title}\n${doc.category}\n${doc.content}`.toLocaleLowerCase();return terms.every(term=>text.includes(term));});
}
