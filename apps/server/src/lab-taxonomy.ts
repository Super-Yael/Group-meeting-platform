import {topicCategories,legacyCategoryKeys} from './catalog-taxonomy.generated.js';
export type FacetValue={key:string;label:string;aliases?:string[]};
export type CatalogAxis={key:string;label:string;description:string;values:FacetValue[]};
export type CatalogCategory={key:string;name:string;parentKey:string|null;description:string;axes:CatalogAxis[]};
export const catalogCategories:CatalogCategory[]=topicCategories;
export const leafCategories=catalogCategories.filter(c=>!catalogCategories.some(child=>child.parentKey===c.key));
export function normalizeCategory(key:string){return legacyCategoryKeys[key]??key;}
export function categoryPath(key:string):string{
 const node=catalogCategories.find(c=>c.key===normalizeCategory(key));
 if(!node)return '待分类';
 return node.parentKey?`${categoryPath(node.parentKey)} / ${node.name}`:node.name;
}
export function inferLegacyCategory(title:string,category:string){
 if(/FISH|原位杂交|免疫组化|HE\s*染色/i.test(title))return 'histology';
 if(/血清素|血小板/.test(title))return 'function';
 if(/\bSRA\b|FASTQ|数据来源|数据格式/i.test(title))return 'bio/data';
 if(/FastQC|读段预处理|测序质控/i.test(title))return 'bio/qc';
 if(/变异检测|VCF|变异注释/i.test(title))return 'bio/variation';
 if(/比对|组装/.test(title))return 'bio/alignment';
 if(/单细胞|空间组学/.test(title))return 'bio/single-cell';
 if(/转录组|RNA-seq/i.test(title))return 'bio/rnaseq';
 if(/结构预测|分子对接|动力学/.test(title))return 'structure';
 if(/CRISPR|sgRNA|基因敲除/.test(title))return 'molecular';
 if(/磁珠分选|流式|FACS/i.test(title))return 'cells';
 if(category==='蛋白与功能实验')return 'proteins';
 if(/测序|建库|面板|捕获|深度|覆盖度/.test(title)||category==='测序技术'||category==='样本与建库')return 'bio/sequencing';
 const normalized=normalizeCategory(category);
 return leafCategories.some(c=>c.key===normalized)?normalized:'bio/scripting';
}
