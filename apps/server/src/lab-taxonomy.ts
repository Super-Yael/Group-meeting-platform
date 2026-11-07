export type FacetValue={key:string;label:string;aliases?:string[]};
export type CatalogAxis={key:string;label:string;description:string;values:FacetValue[]};
export type CatalogCategory={key:string;name:string;parentKey:string|null;description:string;axes:CatalogAxis[]};
const values=(items:string[][]):FacetValue[]=>items.map(([key,label,...aliases])=>({key,label,aliases}));
const axis=(key:string,label:string,description:string,items:string[][]):CatalogAxis=>({key,label,description,values:values(items)});
const data=axis('data','按数据类型','从已有数据寻找分析方法。',[
 ['dna','DNA / 基因组','genome','基因组'],['rna','RNA / 转录组','RNA-seq','转录组'],['single','单细胞 / 空间','scRNA','single cell','spatial'],['epigenetic','表观组','ATAC','ChIP','甲基化'],['protein','蛋白 / 代谢','proteomics','metabolomics'],['microbe','微生物 / 微生物组','细菌','bacteria','微生物','microbiome']
]);
const organism=axis('system','按研究体系','方法可用于不同研究对象；分类不限制具体疾病或物种。',[
 ['human','人类 / 临床样本','临床','人体'],['tumor','肿瘤研究','cancer','oncology'],['microbe','微生物研究','细菌','真菌','bacteria'],['model','动物 / 模型体系','mouse','小鼠']
]);
const cellPurpose=axis('purpose','按实验目的','按照希望观察或改变的细胞特征分类。',[
 ['culture','培养与建模'],['growth','增殖 / 活力'],['death','死亡 / 凋亡'],['migration','迁移 / 侵袭'],['cycle','细胞周期'],['function','功能与状态'],['delivery','递送与扰动']
]);
export const catalogCategories:CatalogCategory[]=[
 {key:'dry',name:'干实验',parentKey:null,description:'从序列、组学、结构、图像与临床数据中完成计算分析。',axes:[]},
 {key:'dry/omics',name:'生物信息与组学',parentKey:'dry',description:'基因组、转录组、单细胞、空间组学和多组学分析。',axes:[data,axis('task','按分析任务','从分析工作所处的阶段寻找方法。',[
  ['qc','质量控制'],['alignment','比对 / 组装'],['quantification','定量 / 差异分析'],['annotation','注释 / 富集'],['integration','整合 / 网络'],['variation','变异与克隆']
 ]),organism]},
 {key:'dry/microbiology',name:'微生物与宏基因组',parentKey:'dry',description:'覆盖细菌及其他微生物的基因组、群落、功能与进化分析。',axes:[axis('material','按数据层级','区分单个分离株与群落数据。',[
  ['isolate','分离株基因组'],['marker','16S / ITS 扩增子'],['shotgun','宏基因组'],['transcript','宏转录组']
 ]),axis('task','按分析任务','从分类、组装、功能和比较分析中查找。',[
  ['taxonomy','分类与群落'],['assembly','组装与分箱'],['function','功能 / 耐药注释'],['comparison','比较基因组'],['phylogeny','系统发育']
 ])]},
 {key:'dry/structure',name:'结构生物学与计算药理',parentKey:'dry',description:'结构预测、分子对接、动力学与计算筛选。',axes:[axis('task','按计算任务','区分结构、相互作用和时间变化。',[
  ['prediction','结构预测'],['docking','分子对接'],['dynamics','动力学模拟'],['screening','虚拟筛选'],['properties','分子性质评估']
 ])]},
 {key:'dry/statistics',name:'医学统计与证据分析',parentKey:'dry',description:'临床和基础研究数据的统计建模、整合与证据评价。',axes:[axis('task','按分析任务','按数据问题选择统计方法。',[
  ['comparison','描述与比较'],['regression','关联 / 回归'],['survival','生存 / 事件时间'],['prediction','预测模型'],['causal','因果推断'],['evidence','证据合成']
 ])]},
 {key:'dry/imaging',name:'医学图像与计算病理',parentKey:'dry',description:'显微图像定量、病理图像和医学影像分析。',axes:[axis('material','按图像来源','先匹配图像来源，再确定分析任务。',[
  ['microscopy','细胞 / 显微图像'],['pathology','组织 / 病理切片'],['radiology','医学影像']
 ]),axis('task','按分析任务','区分分割、定量和建模。',[
  ['segmentation','分割与识别'],['quantification','定量与统计'],['features','特征提取'],['prediction','分类 / 预测']
 ])]},
 {key:'wet',name:'湿实验',parentKey:null,description:'覆盖核酸、细胞、动物、蛋白、组织和微生物实验。',axes:[]},
 {key:'wet/sequencing',name:'测序',parentKey:'wet',description:'从技术代次、覆盖范围和检测对象理解测序方法。',axes:[
  axis('generation','按技术代次','技术代次描述读取分子的方式；WGS、WES 等覆盖策略不属于代次。',[
   ['first','一代测序','Sanger','链终止测序'],['second','二代测序 / NGS','next generation sequencing','高通量短读长'],['third','三代测序','长读长','Nanopore','SMRT','HiFi']
  ]),
  axis('breadth','按覆盖范围','同一种覆盖策略可与不同平台组合，范围与平台分别选择。',[
   ['genome','全基因组 / WGS','whole genome sequencing','全基因组测序'],['exome','全外显子组 / WES','whole exome sequencing','全外显子测序'],['targeted','靶向 / Panel','靶向测序','panel sequencing'],['amplicon','扩增子测序','amplicon','16S','ITS'],['transcriptome','转录组','RNA-seq','RNAseq']
  ]),
  axis('analyte','按检测对象','根据研究对象区分 DNA、RNA 和表观信息。',[
   ['dna','DNA'],['rna','RNA'],['epigenetic','表观遗传'],['single','单细胞'],['spatial','空间组学'],['microbiome','微生物组']
  ]),
  axis('stage','按实验环节','把样本准备和实际读取技术分开理解。',[
   ['preparation','样本 / 核酸'],['library','文库 / 捕获'],['sequencing','上机测序'],['quality','质量控制']
  ])
 ]},
 {key:'wet/molecular',name:'分子生物学',parentKey:'wet',description:'核酸提取、扩增、定量、克隆与基因编辑。',axes:[
  axis('target','按分子对象','从 DNA、RNA 与染色质寻找实验。',[
   ['dna','DNA'],['rna','RNA'],['chromatin','染色质']
  ]),axis('purpose','按实验目的','按照分子操作和测量目的查找。',[
   ['extraction','提取 / 纯化'],['amplification','扩增'],['quantification','定量'],['cloning','克隆 / 构建'],['editing','编辑 / 扰动'],['regulation','转录调控']
  ])
 ]},
 {key:'wet/cells',name:'细胞实验',parentKey:'wet',description:'细胞培养、表型检测、功能分析与细胞递送。',axes:[cellPurpose,axis('system','按培养体系','从细胞模型查找适用方法。',[
  ['line','细胞系'],['primary','原代细胞'],['coculture','共培养'],['organoid','类器官 / 三维培养']
 ])]},
 {key:'wet/animals',name:'动物实验',parentKey:'wet',description:'动物模型、体内评价、成像与组织取样。',axes:[axis('model','按模型类型','按模型的生物学来源与用途查找。',[
  ['xenograft','异种移植'],['syngeneic','同系模型'],['pdx','患者来源 / PDX'],['genetic','遗传模型'],['general','通用体内研究']
 ]),axis('task','按实验任务','区分模型、观测、分布和取样。',[
  ['modeling','模型建立与评价'],['imaging','活体成像'],['pharmacology','药代 / 体内分布'],['sampling','组织取样'],['phenotyping','体内表型']
 ])]},
 {key:'wet/proteins',name:'蛋白与免疫实验',parentKey:'wet',description:'蛋白定量、鉴定、免疫检测、流式和相互作用实验。',axes:[axis('purpose','按实验目的','区分丰度、身份、定位、互作和细胞表型。',[
  ['abundance','丰度 / 定量'],['identity','分子鉴定'],['localization','定位'],['interaction','分子互作'],['cellular','细胞表型 / 分选'],['purification','分离 / 纯化']
 ])]},
 {key:'wet/histology',name:'组织学与病理实验',parentKey:'wet',description:'组织处理、染色、分子定位与显微观察。',axes:[axis('purpose','按检测目的','区分形态、定位和细胞状态。',[
  ['preparation','组织处理'],['morphology','形态观察'],['localization','分子定位'],['death','细胞死亡'],['imaging','显微成像']
 ])]},
 {key:'wet/microbiology',name:'微生物实验',parentKey:'wet',description:'培养、鉴定、群体定量、药敏与微生物表型。',axes:[axis('purpose','按实验目的','按所需微生物读出选择方法。',[
  ['culture','培养与分离'],['identification','鉴定'],['growth','计数 / 生长'],['susceptibility','药敏检测'],['biofilm','生物膜'],['imaging','显微观察']
 ])]},
 {key:'wet/function',name:'生理与功能检测',parentKey:'wet',description:'血小板、线粒体、代谢状态及电生理相关检测。',axes:[axis('target','按功能对象','从具体功能与读出进入。',[
  ['platelets','血小板'],['mitochondria','线粒体 / 能量'],['redox','氧化应激'],['calcium','钙信号'],['electrical','电生理']
 ])]},
 {key:'unfiled',name:'待分类',parentKey:null,description:'尚未指定实验类别的团队页面。',axes:[]}
];
// The same method can be found through independent, family-specific views.
catalogCategories.find(c=>c.key==='dry/structure')!.axes.push(axis('material','按研究对象','按参与建模或计算的分子对象查找。',[
 ['protein','蛋白 / 核酸'],['compound','小分子'],['complex','分子复合物']
]));
catalogCategories.find(c=>c.key==='dry/statistics')!.axes.push(axis('endpoint','按结果类型','先理解变量与终点，再选择分析方法。',[
 ['continuous','连续测量'],['categorical','分类 / 二元结果'],['time','时间与事件'],['mixed','多类型 / 综合证据']
]));
catalogCategories.find(c=>c.key==='wet/proteins')!.axes.push(axis('material','按检测对象','区分整体分子样本与细胞层面的检测。',[
 ['protein','蛋白 / 免疫球蛋白'],['complex','相互作用复合物'],['cell','细胞群体']
]));
catalogCategories.find(c=>c.key==='wet/histology')!.axes.push(axis('material','按样本层级','根据材料和空间层级查找方法。',[
 ['tissue','组织 / 切片'],['cell','细胞材料']
]));
catalogCategories.find(c=>c.key==='wet/microbiology')!.axes.push(axis('readout','按主要读出','识别要获取的微生物信息。',[
 ['identity','形态 / 身份'],['quantity','数量 / 生长'],['phenotype','功能 / 药敏'],['structure','空间 / 生物膜']
]));
catalogCategories.find(c=>c.key==='wet/function')!.axes.push(axis('readout','按信号类型','区分功能评价的测量原理。',[
 ['optical','光学信号'],['electrical','电学信号'],['biochemical','生化 / 群体功能']
]));
export const leafCategories=catalogCategories.filter(c=>c.parentKey!==null||c.key==='unfiled');
export function categoryPath(key:string):string{const node=catalogCategories.find(c=>c.key===key);if(!node)return '待分类';return node.parentKey?`${categoryPath(node.parentKey)} / ${node.name}`:node.name;}
export function inferLegacyCategory(title:string,category:string){
 if(/FISH|原位杂交|免疫组化|HE染色/i.test(title))return 'wet/histology';
 if(/FASTQ|FastQC|比对|组装|变异检测|转录组|单细胞分析|数据管理|深度|覆盖度/i.test(title))return 'dry/omics';
 if(/结构预测|分子对接|动力学/.test(title))return 'dry/structure';
 if(/CRISPR|sgRNA|基因敲除/.test(title))return 'wet/molecular';
 if(/SRA|血小板/.test(title))return 'wet/function';
 if(category==='蛋白与功能实验')return 'wet/proteins';
 if(/测序|样本|建库|磁珠|面板|捕获/.test(title)||category==='测序技术'||category==='样本与建库')return 'wet/sequencing';
 return 'unfiled';
}
