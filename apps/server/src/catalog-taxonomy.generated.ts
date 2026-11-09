// Generated from team_doc/taxonomy.json. Edit the document repository, then rebuild.
export const topicCategories = [
  {
    "key": "bio",
    "name": "生物信息学",
    "parentKey": null,
    "description": "测序技术、序列数据与组学分析。",
    "axes": []
  },
  {
    "key": "molecular",
    "name": "分子生物学",
    "parentKey": null,
    "description": "核酸提取、扩增、克隆与基因编辑。",
    "axes": [
      {
        "key": "target",
        "label": "按分子对象",
        "description": "从 DNA、RNA 与染色质寻找实验。",
        "values": [
          {
            "key": "dna",
            "label": "DNA",
            "aliases": []
          },
          {
            "key": "rna",
            "label": "RNA",
            "aliases": []
          },
          {
            "key": "chromatin",
            "label": "染色质",
            "aliases": []
          }
        ]
      },
      {
        "key": "purpose",
        "label": "按实验目的",
        "description": "按照分子操作和测量目的查找。",
        "values": [
          {
            "key": "extraction",
            "label": "提取 / 纯化",
            "aliases": []
          },
          {
            "key": "amplification",
            "label": "扩增",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量",
            "aliases": []
          },
          {
            "key": "cloning",
            "label": "克隆 / 构建",
            "aliases": []
          },
          {
            "key": "editing",
            "label": "编辑 / 扰动",
            "aliases": []
          },
          {
            "key": "regulation",
            "label": "转录调控",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "cells",
    "name": "细胞实验",
    "parentKey": null,
    "description": "细胞培养、分离分选与表型检测。",
    "axes": [
      {
        "key": "purpose",
        "label": "按实验目的",
        "description": "按照希望观察或改变的细胞特征分类。",
        "values": [
          {
            "key": "culture",
            "label": "培养与建模",
            "aliases": []
          },
          {
            "key": "growth",
            "label": "增殖 / 活力",
            "aliases": []
          },
          {
            "key": "death",
            "label": "死亡 / 凋亡",
            "aliases": []
          },
          {
            "key": "migration",
            "label": "迁移 / 侵袭",
            "aliases": []
          },
          {
            "key": "cycle",
            "label": "细胞周期",
            "aliases": []
          },
          {
            "key": "function",
            "label": "功能与状态",
            "aliases": []
          },
          {
            "key": "delivery",
            "label": "递送与扰动",
            "aliases": []
          },
          {
            "key": "sorting",
            "label": "分离 / 分选",
            "aliases": [
              "磁珠",
              "FACS"
            ]
          }
        ]
      },
      {
        "key": "system",
        "label": "按培养体系",
        "description": "从细胞模型查找适用方法。",
        "values": [
          {
            "key": "line",
            "label": "细胞系",
            "aliases": []
          },
          {
            "key": "primary",
            "label": "原代细胞",
            "aliases": []
          },
          {
            "key": "coculture",
            "label": "共培养",
            "aliases": []
          },
          {
            "key": "organoid",
            "label": "类器官 / 三维培养",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "animals",
    "name": "动物实验",
    "parentKey": null,
    "description": "动物模型、体内评价与取样。",
    "axes": [
      {
        "key": "model",
        "label": "按模型类型",
        "description": "按模型的生物学来源与用途查找。",
        "values": [
          {
            "key": "xenograft",
            "label": "异种移植",
            "aliases": []
          },
          {
            "key": "syngeneic",
            "label": "同系模型",
            "aliases": []
          },
          {
            "key": "pdx",
            "label": "患者来源 / PDX",
            "aliases": []
          },
          {
            "key": "genetic",
            "label": "遗传模型",
            "aliases": []
          },
          {
            "key": "general",
            "label": "通用体内研究",
            "aliases": []
          }
        ]
      },
      {
        "key": "task",
        "label": "按实验任务",
        "description": "区分模型、观测、分布和取样。",
        "values": [
          {
            "key": "modeling",
            "label": "模型建立与评价",
            "aliases": []
          },
          {
            "key": "imaging",
            "label": "活体成像",
            "aliases": []
          },
          {
            "key": "pharmacology",
            "label": "药代 / 体内分布",
            "aliases": []
          },
          {
            "key": "sampling",
            "label": "组织取样",
            "aliases": []
          },
          {
            "key": "phenotyping",
            "label": "体内表型",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "proteins",
    "name": "蛋白与免疫实验",
    "parentKey": null,
    "description": "蛋白、抗体检测及分子互作。",
    "axes": [
      {
        "key": "purpose",
        "label": "按实验目的",
        "description": "区分丰度、身份、定位、互作和细胞表型。",
        "values": [
          {
            "key": "abundance",
            "label": "丰度 / 定量",
            "aliases": []
          },
          {
            "key": "identity",
            "label": "分子鉴定",
            "aliases": []
          },
          {
            "key": "localization",
            "label": "定位",
            "aliases": []
          },
          {
            "key": "interaction",
            "label": "分子互作",
            "aliases": []
          },
          {
            "key": "cellular",
            "label": "细胞表型 / 分选",
            "aliases": []
          },
          {
            "key": "purification",
            "label": "分离 / 纯化",
            "aliases": []
          }
        ]
      },
      {
        "key": "material",
        "label": "按检测对象",
        "description": "区分整体分子样本与细胞层面的检测。",
        "values": [
          {
            "key": "protein",
            "label": "蛋白 / 免疫球蛋白",
            "aliases": []
          },
          {
            "key": "complex",
            "label": "相互作用复合物",
            "aliases": []
          },
          {
            "key": "cell",
            "label": "细胞群体",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "histology",
    "name": "组织学与病理",
    "parentKey": null,
    "description": "组织处理、染色、原位检测与显微观察。",
    "axes": [
      {
        "key": "purpose",
        "label": "按检测目的",
        "description": "区分形态、定位和细胞状态。",
        "values": [
          {
            "key": "preparation",
            "label": "组织处理",
            "aliases": []
          },
          {
            "key": "morphology",
            "label": "形态观察",
            "aliases": []
          },
          {
            "key": "localization",
            "label": "分子定位",
            "aliases": []
          },
          {
            "key": "death",
            "label": "细胞死亡",
            "aliases": []
          },
          {
            "key": "imaging",
            "label": "显微成像",
            "aliases": []
          }
        ]
      },
      {
        "key": "material",
        "label": "按样本层级",
        "description": "根据材料和空间层级查找方法。",
        "values": [
          {
            "key": "tissue",
            "label": "组织 / 切片",
            "aliases": []
          },
          {
            "key": "cell",
            "label": "细胞材料",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "microbiology",
    "name": "微生物实验",
    "parentKey": null,
    "description": "培养、鉴定、计数、药敏与生物膜。",
    "axes": [
      {
        "key": "purpose",
        "label": "按实验目的",
        "description": "按所需微生物读出选择方法。",
        "values": [
          {
            "key": "culture",
            "label": "培养与分离",
            "aliases": []
          },
          {
            "key": "identification",
            "label": "鉴定",
            "aliases": []
          },
          {
            "key": "growth",
            "label": "计数 / 生长",
            "aliases": []
          },
          {
            "key": "susceptibility",
            "label": "药敏检测",
            "aliases": []
          },
          {
            "key": "biofilm",
            "label": "生物膜",
            "aliases": []
          },
          {
            "key": "imaging",
            "label": "显微观察",
            "aliases": []
          }
        ]
      },
      {
        "key": "readout",
        "label": "按主要读出",
        "description": "识别要获取的微生物信息。",
        "values": [
          {
            "key": "identity",
            "label": "形态 / 身份",
            "aliases": []
          },
          {
            "key": "quantity",
            "label": "数量 / 生长",
            "aliases": []
          },
          {
            "key": "phenotype",
            "label": "功能 / 药敏",
            "aliases": []
          },
          {
            "key": "structure",
            "label": "空间 / 生物膜",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "function",
    "name": "生理与功能检测",
    "parentKey": null,
    "description": "血小板、线粒体、氧化应激与电生理。",
    "axes": [
      {
        "key": "target",
        "label": "按功能对象",
        "description": "从具体功能与读出进入。",
        "values": [
          {
            "key": "platelets",
            "label": "血小板",
            "aliases": []
          },
          {
            "key": "mitochondria",
            "label": "线粒体 / 能量",
            "aliases": []
          },
          {
            "key": "redox",
            "label": "氧化应激",
            "aliases": []
          },
          {
            "key": "calcium",
            "label": "钙信号",
            "aliases": []
          },
          {
            "key": "electrical",
            "label": "电生理",
            "aliases": []
          }
        ]
      },
      {
        "key": "readout",
        "label": "按信号类型",
        "description": "区分功能评价的测量原理。",
        "values": [
          {
            "key": "optical",
            "label": "光学信号",
            "aliases": []
          },
          {
            "key": "electrical",
            "label": "电学信号",
            "aliases": []
          },
          {
            "key": "biochemical",
            "label": "生化 / 群体功能",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "structure",
    "name": "结构计算与药物设计",
    "parentKey": null,
    "description": "结构预测、分子对接、动力学与虚拟筛选。",
    "axes": [
      {
        "key": "task",
        "label": "按计算任务",
        "description": "区分结构、相互作用和时间变化。",
        "values": [
          {
            "key": "prediction",
            "label": "结构预测",
            "aliases": []
          },
          {
            "key": "docking",
            "label": "分子对接",
            "aliases": []
          },
          {
            "key": "dynamics",
            "label": "动力学模拟",
            "aliases": []
          },
          {
            "key": "screening",
            "label": "虚拟筛选",
            "aliases": []
          },
          {
            "key": "properties",
            "label": "分子性质评估",
            "aliases": []
          }
        ]
      },
      {
        "key": "material",
        "label": "按研究对象",
        "description": "按参与建模或计算的分子对象查找。",
        "values": [
          {
            "key": "protein",
            "label": "蛋白 / 核酸",
            "aliases": []
          },
          {
            "key": "compound",
            "label": "小分子",
            "aliases": []
          },
          {
            "key": "complex",
            "label": "分子复合物",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "statistics",
    "name": "医学统计与证据分析",
    "parentKey": null,
    "description": "统计建模、研究结果评价与证据合成。",
    "axes": [
      {
        "key": "task",
        "label": "按分析任务",
        "description": "按数据问题选择统计方法。",
        "values": [
          {
            "key": "comparison",
            "label": "描述与比较",
            "aliases": []
          },
          {
            "key": "regression",
            "label": "关联 / 回归",
            "aliases": []
          },
          {
            "key": "survival",
            "label": "生存 / 事件时间",
            "aliases": []
          },
          {
            "key": "prediction",
            "label": "预测模型",
            "aliases": []
          },
          {
            "key": "causal",
            "label": "因果推断",
            "aliases": []
          },
          {
            "key": "evidence",
            "label": "证据合成",
            "aliases": []
          }
        ]
      },
      {
        "key": "endpoint",
        "label": "按结果类型",
        "description": "先理解变量与终点，再选择分析方法。",
        "values": [
          {
            "key": "continuous",
            "label": "连续测量",
            "aliases": []
          },
          {
            "key": "categorical",
            "label": "分类 / 二元结果",
            "aliases": []
          },
          {
            "key": "time",
            "label": "时间与事件",
            "aliases": []
          },
          {
            "key": "mixed",
            "label": "多类型 / 综合证据",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "imaging",
    "name": "图像分析与计算病理",
    "parentKey": null,
    "description": "图像定量、分割与计算病理。",
    "axes": [
      {
        "key": "material",
        "label": "按图像来源",
        "description": "先匹配图像来源，再确定分析任务。",
        "values": [
          {
            "key": "microscopy",
            "label": "细胞 / 显微图像",
            "aliases": []
          },
          {
            "key": "pathology",
            "label": "组织 / 病理切片",
            "aliases": []
          },
          {
            "key": "radiology",
            "label": "医学影像",
            "aliases": []
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "区分分割、定量和建模。",
        "values": [
          {
            "key": "segmentation",
            "label": "分割与识别",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量与统计",
            "aliases": []
          },
          {
            "key": "features",
            "label": "特征提取",
            "aliases": []
          },
          {
            "key": "prediction",
            "label": "分类 / 预测",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "bio/environment",
    "name": "环境配置与软件管理",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": []
  },
  {
    "key": "bio/scripting",
    "name": "脚本、协作与可复现分析",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": []
  },
  {
    "key": "bio/sequencing",
    "name": "测序技术与项目设计",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "generation",
        "label": "按技术代次",
        "description": "技术代次描述读取分子的方式；WGS、WES 等覆盖策略不属于代次。",
        "values": [
          {
            "key": "first",
            "label": "一代测序",
            "aliases": [
              "Sanger",
              "链终止测序"
            ]
          },
          {
            "key": "second",
            "label": "二代测序 / NGS",
            "aliases": [
              "next generation sequencing",
              "高通量短读长"
            ]
          },
          {
            "key": "third",
            "label": "三代测序",
            "aliases": [
              "长读长",
              "Nanopore",
              "SMRT",
              "HiFi"
            ]
          }
        ]
      },
      {
        "key": "breadth",
        "label": "按覆盖范围",
        "description": "同一种覆盖策略可与不同平台组合，范围与平台分别选择。",
        "values": [
          {
            "key": "genome",
            "label": "全基因组 / WGS",
            "aliases": [
              "whole genome sequencing",
              "全基因组测序"
            ]
          },
          {
            "key": "exome",
            "label": "全外显子组 / WES",
            "aliases": [
              "whole exome sequencing",
              "全外显子测序"
            ]
          },
          {
            "key": "targeted",
            "label": "靶向 / Panel",
            "aliases": [
              "靶向测序",
              "panel sequencing"
            ]
          },
          {
            "key": "amplicon",
            "label": "扩增子测序",
            "aliases": [
              "amplicon",
              "16S",
              "ITS"
            ]
          },
          {
            "key": "transcriptome",
            "label": "转录组",
            "aliases": [
              "RNA-seq",
              "RNAseq"
            ]
          }
        ]
      },
      {
        "key": "analyte",
        "label": "按检测对象",
        "description": "根据研究对象区分 DNA、RNA 和表观信息。",
        "values": [
          {
            "key": "dna",
            "label": "DNA",
            "aliases": []
          },
          {
            "key": "rna",
            "label": "RNA",
            "aliases": []
          },
          {
            "key": "epigenetic",
            "label": "表观遗传",
            "aliases": []
          },
          {
            "key": "single",
            "label": "单细胞",
            "aliases": []
          },
          {
            "key": "spatial",
            "label": "空间组学",
            "aliases": []
          },
          {
            "key": "microbiome",
            "label": "微生物组",
            "aliases": []
          }
        ]
      },
      {
        "key": "stage",
        "label": "按实验环节",
        "description": "把样本准备和实际读取技术分开理解。",
        "values": [
          {
            "key": "preparation",
            "label": "样本 / 核酸",
            "aliases": []
          },
          {
            "key": "library",
            "label": "文库 / 捕获",
            "aliases": []
          },
          {
            "key": "sequencing",
            "label": "上机测序",
            "aliases": []
          },
          {
            "key": "quality",
            "label": "质量控制",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "bio/data",
    "name": "数据来源与文件格式",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": []
  },
  {
    "key": "bio/qc",
    "name": "测序质控",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/alignment",
    "name": "序列比对与组装",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/variation",
    "name": "基因组变异与注释",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/rnaseq",
    "name": "RNA-seq",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/single-cell",
    "name": "单细胞与空间组学",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/epigenetics",
    "name": "表观组学",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  },
  {
    "key": "bio/microbiome",
    "name": "微生物与宏基因组",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "material",
        "label": "按数据层级",
        "description": "区分单个分离株与群落数据。",
        "values": [
          {
            "key": "isolate",
            "label": "分离株基因组",
            "aliases": []
          },
          {
            "key": "marker",
            "label": "16S / ITS 扩增子",
            "aliases": []
          },
          {
            "key": "shotgun",
            "label": "宏基因组",
            "aliases": []
          },
          {
            "key": "transcript",
            "label": "宏转录组",
            "aliases": []
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分类、组装、功能和比较分析中查找。",
        "values": [
          {
            "key": "taxonomy",
            "label": "分类与群落",
            "aliases": []
          },
          {
            "key": "assembly",
            "label": "组装与分箱",
            "aliases": []
          },
          {
            "key": "function",
            "label": "功能 / 耐药注释",
            "aliases": []
          },
          {
            "key": "comparison",
            "label": "比较基因组",
            "aliases": []
          },
          {
            "key": "phylogeny",
            "label": "系统发育",
            "aliases": []
          }
        ]
      }
    ]
  },
  {
    "key": "bio/integration",
    "name": "功能解释与多组学整合",
    "parentKey": "bio",
    "description": "按主题查阅方法、流程与问题排查。",
    "axes": [
      {
        "key": "data",
        "label": "按数据类型",
        "description": "从已有数据寻找分析方法。",
        "values": [
          {
            "key": "dna",
            "label": "DNA / 基因组",
            "aliases": [
              "genome",
              "基因组"
            ]
          },
          {
            "key": "rna",
            "label": "RNA / 转录组",
            "aliases": [
              "RNA-seq",
              "转录组"
            ]
          },
          {
            "key": "single",
            "label": "单细胞 / 空间",
            "aliases": [
              "scRNA",
              "single cell",
              "spatial"
            ]
          },
          {
            "key": "epigenetic",
            "label": "表观组",
            "aliases": [
              "ATAC",
              "ChIP",
              "甲基化"
            ]
          },
          {
            "key": "protein",
            "label": "蛋白 / 代谢",
            "aliases": [
              "proteomics",
              "metabolomics"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物 / 微生物组",
            "aliases": [
              "细菌",
              "bacteria",
              "微生物",
              "microbiome"
            ]
          }
        ]
      },
      {
        "key": "task",
        "label": "按分析任务",
        "description": "从分析工作所处的阶段寻找方法。",
        "values": [
          {
            "key": "qc",
            "label": "质量控制",
            "aliases": []
          },
          {
            "key": "alignment",
            "label": "比对 / 组装",
            "aliases": []
          },
          {
            "key": "quantification",
            "label": "定量 / 差异分析",
            "aliases": []
          },
          {
            "key": "annotation",
            "label": "注释 / 富集",
            "aliases": []
          },
          {
            "key": "integration",
            "label": "整合 / 网络",
            "aliases": []
          },
          {
            "key": "variation",
            "label": "变异与克隆",
            "aliases": []
          }
        ]
      },
      {
        "key": "system",
        "label": "按研究体系",
        "description": "方法可用于不同研究对象；分类不限制具体疾病或物种。",
        "values": [
          {
            "key": "human",
            "label": "人类 / 临床样本",
            "aliases": [
              "临床",
              "人体"
            ]
          },
          {
            "key": "tumor",
            "label": "肿瘤研究",
            "aliases": [
              "cancer",
              "oncology"
            ]
          },
          {
            "key": "microbe",
            "label": "微生物研究",
            "aliases": [
              "细菌",
              "真菌",
              "bacteria"
            ]
          },
          {
            "key": "model",
            "label": "动物 / 模型体系",
            "aliases": [
              "mouse",
              "小鼠"
            ]
          }
        ]
      }
    ]
  }
];
export const legacyCategoryKeys = {
  "dry": "bio",
  "wet": "",
  "biostar": "bio",
  "bio/methods/omics": "bio/integration",
  "bio/methods/microbiology": "bio/microbiome",
  "bio/methods/structure": "structure",
  "bio/methods/statistics": "statistics",
  "bio/methods/imaging": "imaging",
  "wet/molecular": "molecular",
  "wet/cells": "cells",
  "wet/animals": "animals",
  "wet/proteins": "proteins",
  "wet/histology": "histology",
  "wet/microbiology": "microbiology",
  "wet/function": "function",
  "wet/sequencing": "bio/sequencing",
  "bio/applied-bioinformatics-2023": "bio",
  "bio/applied-bioinformatics-2023/lectures": "bio/data",
  "bio/applied-bioinformatics-2023/quizzes": "bio",
  "bio/applied-bioinformatics-2023/extra": "bio",
  "bio/applied-bioinformatics-2026": "bio",
  "bio/applied-bioinformatics-2026/setup": "bio/environment",
  "bio/applied-bioinformatics-2026/formats": "bio/scripting",
  "bio/applied-bioinformatics-2026/related": "bio",
  "bio/applied-bioinformatics-2026/welcome": "bio/scripting",
  "bio/applied-bioinformatics-2026/getting-started": "bio",
  "bio/applied-bioinformatics-2026/learning-unix": "bio/scripting",
  "bio/applied-bioinformatics-2026/genomic-data": "bio/scripting",
  "bio/applied-bioinformatics-2026/visualize-genomes": "bio/data",
  "bio/applied-bioinformatics-2026/collaboration": "bio/scripting",
  "bio/applied-bioinformatics-2026/sequencing": "bio",
  "bio/applied-bioinformatics-2026/alignments": "bio",
  "bio/applied-bioinformatics-2026/structural-variants": "bio/variation",
  "bio/applied-bioinformatics-2026/genomic-variation": "bio/variation",
  "bio/applied-bioinformatics-2026/automation": "bio/scripting",
  "bio/applied-bioinformatics-2026/computer-setup": "bio/environment",
  "bio/applied-bioinformatics-2026/quickstart": "bio/environment",
  "bio/applied-bioinformatics-2026/environments": "bio/environment",
  "bio/applied-bioinformatics-2026/troubleshooting": "bio/environment",
  "bio/applied-bioinformatics-2026/share-and-collaborate": "bio/scripting",
  "bio/applied-bioinformatics-2026/data-formats": "bio/data",
  "bio/applied-bioinformatics-2026/methods": "bio/data",
  "bio/applied-bioinformatics-2026/extra": "bio/alignment",
  "bio/bioinformatics-scripting": "bio",
  "bio/bioinformatics-scripting/home": "bio/scripting",
  "bio/bioinformatics-scripting/better-loops": "bio/scripting",
  "bio/bioinformatics-scripting/makefiles": "bio/scripting",
  "bio/bioinformatics-scripting/programming": "bio/scripting",
  "bio/bioinformatics-scripting/tmux": "bio/scripting",
  "bio/biostar": "bio",
  "bio/biostar/i-preface": "bio/scripting",
  "bio/biostar/ii-installation": "bio/environment",
  "bio/biostar/iii-unix-command-line": "bio/scripting",
  "bio/biostar/iv-writing-scripts": "bio/scripting",
  "bio/biostar/v-bits-of-statistics": "statistics",
  "bio/biostar/vi-data-sources": "bio/data",
  "bio/biostar/vii-data-formats": "bio/data",
  "bio/biostar/viii-visualizing-data": "bio/data",
  "bio/biostar/ix-sequence-ontology": "bio/data",
  "bio/biostar/x-gene-ontology": "bio/integration",
  "bio/biostar/xi-reproducibility": "bio/scripting",
  "bio/biostar/xii-sequencing-instruments": "bio/sequencing",
  "bio/biostar/xiii-sequencing-data": "bio/sequencing",
  "bio/biostar/xiv-quality-control": "bio/qc",
  "bio/biostar/xv-patterns": "bio/alignment",
  "bio/biostar/xvi-alignments": "bio/alignment",
  "bio/biostar/xvii-blast": "bio/alignment",
  "bio/biostar/xviii-short-read-alignment": "bio/alignment",
  "bio/biostar/xix-sam-bam-format": "bio/alignment",
  "bio/biostar/xx-genomic-variation": "bio/variation",
  "bio/biostar/xxi-variation-calling": "bio/variation",
  "bio/biostar/xxii-rna-seq-analysis": "bio/rnaseq",
  "bio/biostar/xxiii-chip-seq-analysis": "bio/epigenetics",
  "bio/biostar/xxiv-ming-tang’s-chip-seq": "bio/epigenetics",
  "bio/biostar/xxv-sequence-assembly": "bio/alignment",
  "bio/biostar/xxvi-metagenomics": "bio/microbiome",
  "bio/biostar/xxvii-appendix": "bio/data",
  "bio/biostar/xxviii-rna-seq-zika": "bio/rnaseq",
  "bio/biostar-workflows": "bio",
  "bio/biostar-workflows/home": "bio",
  "bio/biostar-workflows/data-formats": "bio/data",
  "bio/biostar-workflows/why-makefiles": "bio/scripting",
  "bio/biostar-workflows/installation-help": "bio/environment",
  "bio/biostar-workflows/guides": "bio/data",
  "bio/biostar-workflows/rna-seq": "bio/rnaseq",
  "bio/biostar-workflows/recipes": "bio/variation",
  "bio/biostar-workflows/workflows": "bio/variation",
  "bio/biostar-workflows/snakemake-tips": "bio/scripting",
  "bio/biostar-workflows/alternatives": "bio",
  "bio/biostar-workflows/usage": "bio/scripting",
  "bio/corona-virus-genome-analysis": "bio",
  "bio/corona-virus-genome-analysis/home": "bio",
  "bio/corona-virus-genome-analysis/i-install": "bio/environment",
  "bio/corona-virus-genome-analysis/ii-discovery": "bio/microbiome",
  "bio/corona-virus-genome-analysis/iii-data": "bio/microbiome",
  "bio/corona-virus-genome-analysis/iv-reproducibility": "bio/microbiome",
  "bio/corona-virus-genome-analysis/v-methods": "bio/microbiome",
  "bio/corona-virus-genome-analysis/vi-appendix": "bio/microbiome",
  "bio/corona-virus-genome-analysis/vii-rants": "bio/microbiome",
  "bio/fasttrack-bioinformatics-2025": "bio",
  "bio/fasttrack-bioinformatics-2025/lectures": "bio/variation",
  "bio/fasttrack-bioinformatics-2025/getting-started": "bio/environment",
  "bio/fasttrack-bioinformatics-2025/genomic-data": "bio/sequencing",
  "bio/fasttrack-bioinformatics-2025/methods": "bio/scripting",
  "bio/fasttrack-bioinformatics-2025/toolbox": "bio/scripting",
  "bio/fasttrack-bioinformatics-2025/papers": "bio/rnaseq",
  "bio/fasttrack-bioinformatics-2025/computer-setup": "bio/environment",
  "bio/fasttrack-bioinformatics-2025/command-line-setup": "bio/environment",
  "bio/fasttrack-bioinformatics-2025/data-analysis-environment": "bio/scripting",
  "bio/fasttrack-bioinformatics-2025/troubleshooting": "bio/environment",
  "bio/fasttrack-bioinformatics-2025/data-formats": "bio/data",
  "bio/fasttrack-bioinformatics-2025/data-sources": "bio/data",
  "bio/fasttrack-bioinformatics-2025/related-methods": "bio/qc",
  "bio/fasttrack-bioinformatics-2025/alignment": "bio/alignment",
  "bio/fasttrack-bioinformatics-2025/variant-calling": "bio/variation",
  "bio/fasttrack-bioinformatics-2025/rna-seq-setup": "bio/environment",
  "bio/fasttrack-bioinformatics-2025/other-topics": "bio/scripting",
  "bio/fasttrack-bioinformatics-2025/extra": "bio/scripting",
  "bio/rna-seq-by-example": "bio",
  "bio/rna-seq-by-example/home": "bio",
  "bio/rna-seq-by-example/i-rna-seq-step-by-step": "bio/rnaseq",
  "bio/rna-seq-by-example/ii-rna-seq-in-practice": "bio/rnaseq",
  "bio/rna-seq-by-example/iii-the-grouchy-grinch": "bio/rnaseq",
  "bio/rna-seq-by-example/iv-further-explorations": "bio",
  "bio/rna-seq-by-example/v-code": "bio",
  "dry/omics": "bio/integration",
  "dry/microbiology": "bio/microbiome",
  "dry/structure": "structure",
  "dry/statistics": "statistics",
  "dry/imaging": "imaging",
  "biostar/i-preface": "bio/scripting",
  "biostar/ii-installation": "bio/environment",
  "biostar/iii-unix-command-line": "bio/scripting",
  "biostar/iv-writing-scripts": "bio/scripting",
  "biostar/v-bits-of-statistics": "statistics",
  "biostar/vi-data-sources": "bio/data",
  "biostar/vii-data-formats": "bio/data",
  "biostar/viii-visualizing-data": "bio/data",
  "biostar/ix-sequence-ontology": "bio/data",
  "biostar/x-gene-ontology": "bio/integration",
  "biostar/xi-reproducibility": "bio/scripting",
  "biostar/xii-sequencing-instruments": "bio/sequencing",
  "biostar/xiii-sequencing-data": "bio/sequencing",
  "biostar/xiv-quality-control": "bio/qc",
  "biostar/xv-patterns": "bio/alignment",
  "biostar/xvi-alignments": "bio/alignment",
  "biostar/xvii-blast": "bio/alignment",
  "biostar/xviii-short-read-alignment": "bio/alignment",
  "biostar/xix-sam-bam-format": "bio/alignment",
  "biostar/xx-genomic-variation": "bio/variation",
  "biostar/xxi-variation-calling": "bio/variation",
  "biostar/xxii-rna-seq-analysis": "bio/rnaseq",
  "biostar/xxiii-chip-seq-analysis": "bio/epigenetics",
  "biostar/xxiv-ming-tang’s-chip-seq": "bio/epigenetics",
  "biostar/xxv-sequence-assembly": "bio/alignment",
  "biostar/xxvi-metagenomics": "bio/microbiome",
  "biostar/xxvii-appendix": "bio/data",
  "biostar/xxviii-rna-seq-zika": "bio/rnaseq"
} as Record<string,string>;
