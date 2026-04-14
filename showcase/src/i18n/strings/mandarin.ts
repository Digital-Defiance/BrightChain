import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// Mandarin Chinese translations - Complete
export const ShowcaseMandarinStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: '首页',
  [ShowcaseStrings.Nav_SoupDemo]: 'Soup演示',
  [ShowcaseStrings.Nav_Ledger]: '账本',
  [ShowcaseStrings.Nav_Blog]: '博客',
  [ShowcaseStrings.Nav_FAQ]: '常见问题',
  [ShowcaseStrings.Nav_Docs]: '文档',
  [ShowcaseStrings.Nav_Home_Description]: '主页',
  [ShowcaseStrings.Nav_SoupDemo_Description]: '交互式区块可视化',
  [ShowcaseStrings.Nav_Ledger_Description]: '带治理的区块链账本',
  [ShowcaseStrings.Nav_Blog_Description]: 'BrightChain博客和更新',
  [ShowcaseStrings.Nav_FAQ_Description]: '常见问题解答',
  [ShowcaseStrings.Nav_Docs_Description]: '项目文档',
  [ShowcaseStrings.Nav_ToggleMenu]: '切换菜单',
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'BrightDB标志',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: '绝密 dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChat标志',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHub标志',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightID标志',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMail标志',
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'BrightVote标志',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPass标志',
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: '金丝雀协议标志',
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: '数字焚烧袋标志',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: '语言',
  [ShowcaseStrings.Lang_EN_US]: '英语（美国）',
  [ShowcaseStrings.Lang_EN_GB]: '英语（英国）',
  [ShowcaseStrings.Lang_ES]: '西班牙语',
  [ShowcaseStrings.Lang_FR]: '法语',
  [ShowcaseStrings.Lang_DE]: '德语',
  [ShowcaseStrings.Lang_ZH_CN]: '中文',
  [ShowcaseStrings.Lang_JA]: '日语',
  [ShowcaseStrings.Lang_UK]: '乌克兰语',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'FAQ模式',
  [ShowcaseStrings.FAQ_Gild_Character]: 'Gild 角色',
  [ShowcaseStrings.FAQ_Phix_Character]: 'Phix 角色',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: '切换到{MODE}FAQ',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain常见问题',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'BrightChain宇宙',
  [ShowcaseStrings.FAQ_Subtitle_Technical]: '无主文件系统的进化继承者',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]: '认识吉祥物、使命和生态系统',
  [ShowcaseStrings.FAQ_Toggle_Technical]: '技术',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: '生态系统',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gild守护细节',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phix揭示愿景',
  [ShowcaseStrings.FAQ_BackToHome]: '← 返回首页',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. 什么是BrightChain？',
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    'BrightChain是一个去中心化的高性能"无主"数据基础设施。它是无主文件系统（OFFSystem）的架构继承者，为2026年的硬件环境进行了现代化改造，包括Apple Silicon和NVMe存储。',

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    '2. BrightChain与原始OFFSystem有何不同？',
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChain尊重其前身的"无主"理念，同时引入了关键的现代化改进：',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: '可选冗余',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    '用户可以请求使用Reed-Solomon编码以更高的持久性存储其区块。',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]: '恢复性能',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    '利用@digitaldefiance/node-rs-accelerate，系统利用GPU/NPU硬件以高达30+ GB/s的速度执行Reed-Solomon恢复操作。',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: '可扩展性',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    '通过超级CBL（组成区块列表），系统使用递归索引来支持实际上无限的文件大小，具有O(log N)的检索效率。',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: '身份',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    'BIP39/32的集成允许安全的基于助记词的身份和分层确定性密钥管理。',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: '可选加密',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    '用户可以选择在其数据之上添加ECIES加密，利用以太坊密钥空间/身份HDKey系统。',

  [ShowcaseStrings.FAQ_Tech_Q3_Title]: '3. 数据如何实现"无主"？',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    'BrightChain使用多层加密方法来确保没有单个节点在法律或实际意义上"托管"文件：',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'XOR基线',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    '每个区块通过简单的XOR操作处理，使静态数据与随机噪声无法区分。',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: '配方',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    '要重建文件，用户需要配方——区块顺序的特定空间映射。',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: '可选加密',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    '用户可以选择在其数据之上添加ECIES加密。没有配方，数据保持无序状态，如果选择了加密，则被加密锁定。',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]: '4. 什么是"元组权衡"，它提供了什么？',
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    '"元组权衡"是"无主"分片开销与其为网络提供的无与伦比的法律和经济利益之间的刻意平衡。',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]: '法律优势：合理否认',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    '通过XOR混合将数据分片为几乎随机的元组（区块），贡献存储的用户托管的数据在数学上与噪声无法区分。',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    '结果：由于单个节点无法在没有"配方"的情况下重建连贯的文件，因此在技术和法律上不可能声称特定节点运营商正在"托管"或"分发"任何特定内容。这为参与者提供了终极的合理否认层。',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    '经济优势：效率vs.工作量证明',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    '虽然"无主"分片确实引入了轻微的存储开销，但与传统工作量证明（PoW）或权益证明（PoS）网络的巨大能源和硬件成本相比，这是微不足道的。',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    '结果：BrightChain实现了高性能数据完整性，而无需在浪费的哈希竞赛中燃烧"焦耳"。这使网络具有高度竞争力，以传统区块链成本的一小部分提供低延迟性能。',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: '权衡总结：',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    '用户接受数据"分片"的轻微增加，以换取零责任托管环境和超低成本基础设施。这使BrightChain成为高度监管或资源受限环境中去中心化存储最可行的平台。',

  [ShowcaseStrings.FAQ_Tech_Q5_Title]: '5. BrightChain与传统区块链有何不同？',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    '从技术上讲，BrightChain是一个去中心化的区块存储，而不是单一的整体区块链。传统区块链是账本，而BrightChain提供底层基础设施来同时托管和支持多个混合Merkle树账本。我们使用区块链接作为重建文件的结构方法，但系统被设计为高性能基础，可以在统一的"无主"存储层之上驱动许多不同的区块链和dApp。',

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. Reed-Solomon（RS）在BrightChain中的作用是什么？',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    '虽然XOR处理数据的隐私和"无主"状态，但Reed-Solomon纠删编码是可恢复性的可选层。',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: '冗余',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    'RS允许即使多个托管节点离线也能重建文件。',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: '权衡',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    '与简单的XOR相比，RS增加了计算开销和存储要求。用户必须根据数据的重要性和可用的"焦耳"来选择冗余级别。',

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. 什么是"焦耳"？',
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    '焦耳是BrightChain生态系统中工作和资源消耗的计量单位。',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: '成本基础',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    '每个操作——存储数据、执行XOR混合或编码Reed-Solomon分片——都有以焦耳计的预计成本。',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]: '资源管理',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    '用户必须权衡高冗余存储的焦耳成本与其数据的价值。',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. 如何获得焦耳？',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    '焦耳通过以工换工模式获得。用户通过向网络贡献资源来获得焦耳：',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: '存储',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]: '为其他节点托管加密区块。',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: '计算',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    '提供CPU/GPU/NPU周期来为集体执行编码或恢复任务。',
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    '这确保网络保持为一个自我维持的能源经济体，其中贡献等于容量。',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]: '9. 如何维护匿名性？',
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]: 'BrightChain采用中介匿名。',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: '链上',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]: '所有操作对一般网络都是匿名的。',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: '法定人数',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    '身份通过加密方式与治理法定人数绑定。这确保虽然用户的数据和操作是私密的，但社区通过Shamir秘密共享和同态投票维护着"社会层"的问责制。',

  [ShowcaseStrings.FAQ_Tech_Q10_Title]: '10. 什么是BrightDB，它如何工作？',
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    'BrightDB是直接构建在BrightChain区块存储之上的高级文档存储层。它提供了一种结构化的方式来存储、查询和管理复杂数据对象，无需中央数据库服务器。',
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: '工作原理',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]: '面向文档的存储',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    '类似于NoSQL数据库，BrightDB将数据存储为"文档"，分片为加密区块并分布在网络中。',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]: '不可变版本控制',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    '对文档的每次更改都记录为具有加密可验证历史的新条目。',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]: '去中心化索引',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    '分布式索引系统允许节点通过DHT查找和重建特定文档，无需中央"主"节点。',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    '基于法定人数的访问',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    '对特定数据库或集合的访问可以由法定人数管理，需要授权签名者的加密批准。',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: '为什么重要',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    '大多数dApp面临困难，因为它们将"重"数据存储在中心化服务器上。BrightDB保持数据去中心化、无主和高性能——实现真正的无服务器应用程序，与传统Web应用一样快，但与区块链一样安全。',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]: '11. BrightChain推出了哪些dApp？',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChain推出了一套核心"Bright-Apps"，旨在用安全、主权的替代方案取代中心化的数据收集服务。',
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'BrightChart标志',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]: '患者自有医疗记录',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    '一个由患者持有密钥的电子病历。BrightChart将符合FHIR R4标准的医疗数据作为加密块存储在BrightChain上——没有可被攻破的中央数据库。患者通过BrightTrust委托向医疗提供者授予细粒度访问权限，每次访问事件都记录在不可变的审计追踪中。从单一代码库支持医疗、牙科和兽医诊所。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: '主权通信',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    '一个完全符合RFC标准的电子邮件系统，连接传统SMTP和去中心化存储。与标准电子邮件提供商不同，BrightMail将每条消息分片到"无主"区块存储中，支持端到端加密的"暗模式"消息。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]: '社交网络和主权图谱',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: '概念',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    '一个去中心化、抗审查的社交网络平台，反映了传统"信息流"的流畅性，没有中央监控或算法操纵。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: '区别',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    '每个帖子、"点赞"和关系都作为不可变的分片文档存储在BrightDB中。由于利用了焦耳经济，没有广告——用户贡献微量的计算或存储来"提升"他们的声音或维持社区的历史。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]: '法定人数的力量',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    '审核不由企业"安全团队"处理。相反，社区由治理法定人数管理。规则通过加密方式执行，社区标准通过同态投票进行表决，确保群组的数字空间真正保持"无主"和自决。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: '零知识保险库',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    '一个密码和身份管理系统，您的保险库以分布式加密区块的形式存在。访问由您的BIP39助记词管理，每次凭证更改都通过BrightDB进行版本控制和验证。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: '弹性社区',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    '一个具有持久频道、语音和媒体共享的实时通信平台。社区治理通过法定人数管理，GPU加速恢复确保聊天历史永不丢失。',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    '数字焚烧袋 / 金丝雀协议',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    '一个专为高风险数据设计的专业文件共享和加密平台。它利用"智能保险库"，可以被编程为永久销毁"配方"（映射和密钥），或在可验证的条件下将其释放给特定方——例如"死人开关"、定时释放或法定人数共识。它是举报人、法律专业人士以及任何需要保证数据过期的人的终极工具。',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    '12. 什么是Paillier加密，它如何实现私密投票？',
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    'Paillier是一种具有特殊属性的公钥加密方案，称为加法同态——你可以将加密值相加而无需解密它们。如果你为候选人A加密一个"1"，另一个人也为候选人A加密一个"1"，你可以将这些密文相乘，解密后的结果是"2"。没有人看到过单独的选票。在BrightChain的投票系统中，每张选票都用Paillier公钥加密，加密的选票同态聚合为每个候选人的单个密文，只有最终计数被解密——永远不会解密任何单独的投票。为了增加安全性，Paillier私钥可以使用门限密码学分割给多个守护者，这样没有单一方可以独自解密计数。这种方法原生适用于常见的投票方法，如多数制、赞成制和评分投票，其中计数只是加法。需要淘汰轮次的方法（如排名选择）需要轮次之间的中间解密，而某些方法（如二次投票）根本无法同态完成。',

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. Paillier桥做什么？',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    'Paillier桥是一种确定性密钥派生构造，允许您直接从现有的ECDH（椭圆曲线Diffie-Hellman）密钥对派生Paillier同态加密密钥。无需管理两个单独的密钥对——一个用于身份/认证（ECC），一个用于同态投票加密（Paillier）——桥将您的ECDH共享密钥通过HKDF和HMAC-DRBG确定性地生成3072位Paillier密钥所需的大素数。这意味着您的整个加密身份，包括投票密钥，可以从单个32字节ECC私钥恢复。桥是单向的（您无法将Paillier密钥反转回EC密钥），完全确定性的（相同输入始终产生相同输出），并实现与NIST建议一致的128位安全性。',
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    '请参阅我们关于该主题的论文以获取更多信息。',

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    '14. BrightChain不就是另一个像IPFS一样的去中心化存储（dWS）吗？',
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    '不是。IPFS是为内容发现和持久性设计的"公共图书馆"。BrightChain是"主权保险库"。IPFS专注于通过CID查找数据，而BrightChain专注于无主状态和高速恢复。在BrightChain中，数据被如此彻底地分片，以至于没有单个节点"拥有"甚至"知道"它正在托管什么。',

  [ShowcaseStrings.FAQ_Tech_Q15_Title]: '15. 与IPFS相比，"性能"有何不同？',
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    'IPFS是"尽力而为"的，通常延迟较高。BrightChain是为Apple Silicon（M4 Max）时代构建的。通过使用@digitaldefiance/node-rs-accelerate，我们实现了30+ GB/s的恢复速度。我们不只是"获取"文件；我们使用硬件加速的Reed-Solomon以总线速度从分片重新实体化数据。',

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    '16. BrightChain与IPFS在隐私方面有何不同？',
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    'IPFS默认是透明的；如果你有哈希值，你就可以看到文件。BrightChain使用XOR基线。数据在接触网络之前就被功能性地"粉碎"了（就像Digital Burnbag标志一样）。隐私不是"插件"——它是数据的机械状态。',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. BrightChain和IPFS的经济模式如何比较？',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFS依赖Filecoin（一个沉重的外部区块链）来提供激励。BrightChain使用焦耳。它是一个"热力"计量单位，衡量实际工作（CPU/NPU周期）和资源消耗。它是内置的、低开销的，并直接与网络的"能量"挂钩。',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 BrightChain到底是什么？',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChain是为一个你的数据属于你的世界而建的基础设施——不属于平台，不属于公司，不属于任何碰巧运行服务器的人。它是一个去中心化的存储层，每个文件都被分片、混合并分散在网络中，使得没有单个节点以任何有意义的方式"托管"你的数据。结果是一个隐私不是你打开的功能的系统——它是架构的默认状态。我们称之为"无主"，因为一旦你的数据进入BrightChain，没有人拥有这些碎片。只有你持有将它们重新组合的配方。',

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]: '什么是Digital Burnbag？',
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    '在情报机构中，"焚烧袋"是一个用于标记销毁的机密文件的容器——你把它们放进去，它们会在可验证的保管链下被焚烧。Digital Burnbag将这个概念带到了数据领域。当你在BrightChain中重命名、移动或销毁数据时，系统执行"凤凰循环"：它将数据复制到新状态，然后加密焚烧旧状态。没有什么是简单删除的——它重生了。旧状态可证明已消失，新状态可证明完好无损。这是BrightChain的产品层，吉祥物Gild和Phix在这里生活和工作。',

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]: '什么是金丝雀协议？',
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    '这个名字来自煤矿中的金丝雀——当出现问题时会鸣叫的预警系统。金丝雀协议监视你的信息流、你的API——任何能反映你是否存活、事情是否按计划进行的心跳信号。一旦事情偏离计划，你的金丝雀死了（对不起，Gild！），文件或文件夹就会被销毁——可验证地销毁。它也可以反向运作：用胁迫代码登录，或通过预设的提供商设置规则，你的数据也可以在这些条件下自毁。一切都关乎规则和条件。如果事情不按计划进行，Gild就完了。它也可能监控网络完整性，但其核心目的是条件性销毁：当规则要求时，你的数据就会被烧毁。我们的吉祥物Gild是这个协议的活体化身：一只以强迫性警惕守护你数据的金色金丝雀。现有的Burnbag/金丝雀协议标志——一只带火焰尾巴的金色金丝雀——是两个吉祥物合为一个标志。Gild是金色的身体；Phix是火焰。',

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: '认识角色们',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Volta——火花',
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: '高压建筑师',
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    '以电池发明者亚历山德罗·伏特命名，Volta是一个活的火花——一只锯齿状的、霓虹蓝色的几何狐狸，由纯粹的、噼啪作响的电力组成。她是供应者：她生成并推动焦耳通过系统，渴望以全功率为每个操作供电。过度活跃、慷慨地提供能量且略显鲁莽，Volta认为节约很无聊。"你想要20太焦耳？搞定。还要什么？"在UI中，她在焦耳计附近噼啪作响，在繁重操作期间她发出白热光，振动着执行的欲望。她代表纯粹的、混沌的潜力——行动的欲望。',
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    'Volta吉祥物——由电力构成的霓虹蓝色几何狐狸',

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ohm——锚',
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: '电阻的斯多葛僧侣',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    '以定义电阻的格奥尔格·欧姆命名，Ohm是Volta加速器的刹车。一只沉重的、石头般的树懒龟，壳上集成了发光的欧米茄符号，他缓慢而审慎地移动。他的咒语："Ohm mani padme ohm。"当Volta像喝了咖啡的狐狸一样到处乱窜时，Ohm坐在深沉、扎根的莲花位上，以完美的60Hz嗡嗡声振动，使整个系统居中。他冷静、怀疑，并带着干燥的机智——那个真正阅读收据的会计师。不反对花费，只是反对浪费。当能量水平飙升时，他执行"电阻冥想"，将沉重的石爪放在进度条上，将电流从蓝色变为平静的深琥珀色。他代表扎根的智慧——正确行动的纪律。',
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    '吉祥物Ohm——一只像石头一样的慢乌龟，壳上有发光的Omega符号',

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Gild——见证者',
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: '金色金丝雀守护者',
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    '一只虚荣的金色金丝雀，痴迷于他原始的黄色外衣。Gild是守护者——他看守你的数据，发出警告，保持事物安全。想想Duolingo猫头鹰的能量：鼓励的，偶尔让人内疚的，但从根本上站在你这边。问题是？Gild住在煤矿里。每次文件操作都会扬起煤烟，他不断变脏。上传50个文件？他被灰烬覆盖，疯狂地梳理羽毛，嘟囔着他的羽毛。他的煤烟水平是系统活动的被动指标——空闲系统意味着一只原始的、得意洋洋地梳理的Gild；大量使用意味着一只肮脏的、愤怒的金丝雀。他一丝不苟、戏剧化且长期受苦。"我刚梳理完！现在我成了烟囱清扫工，因为你不会拼写文档。"他是Burnbag/金丝雀协议标志的金色身体——没有火的标志。',
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]: '吉祥物Gild——一只虚荣的金色金丝雀',

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Phix——重生',
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: '毁灭者-创造者',
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    '"Phix" = "fix" + "phoenix"。Gild的邪恶双胞胎。相同的鸟类轮廓，但他的羽毛发出余烬红光，他的眼睛像热煤一样变窄，他咧嘴笑着，好像他即将过于享受这一切。Phix是执行者——他消耗焦耳来焚烧旧数据状态，并与新状态一起重生。Gild被火烦恼的地方，Phix就是火。他出现在重命名操作和金丝雀触发的级联中——任何数据死亡和重生的地方。但Phix也纯粹就是关于销毁。他就是那个拿着火柴站在那里的纵火犯，随时准备在你想烧东西的时候搭把手。删除一个文件？Phix在笑。清空一个文件夹？他已经点着了。虽然他从销毁中获得极大的快乐，但他也为创造感到自豪——从灰烬中带着新事物重生就是他的本色。欢快、混乱，消防部门里那个太爱自己工作的纵火犯。当用户触发重命名时，Gild退到一边，Phix出现——微笑着、发光着、准备燃烧。他是Burnbag/金丝雀协议标志的火焰——没有金色的标志。',
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    'Phix吉祥物——余烬红色的凤凰，Gild的火焰双胞胎',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: '经济体系',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ 什么是焦耳？',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    '焦耳是BrightChain的能量单位——不是投机性加密货币，而是真实工作和贡献的衡量标准。在视觉上，它们是微小的霓虹蓝色闪电代币，像游戏中的硬币一样流动、积累和消耗。Volta生成它们，Ohm通过他的门调节它们的流动，操作消耗它们。BrightChain中的每个操作都有焦耳成本——从接近零的元数据重命名到百万焦耳的完整周期重新加密。用户通过以工换工模式赚取焦耳：向网络贡献存储或计算，你就获得使用它的能力。UI中的焦耳计显示你的能量预算，小火花可见地从Volta通过Ohm的门流向你的操作。',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 什么是煤烟？',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    '煤烟是每个操作的可见后果——你数字行为的"碳足迹"。它不是你花费的货币；它是你无法避免的成本。每当Phix燃烧数据时，他就会产生煤烟——积聚在Gild金色羽毛上的黑暗颗粒和烟云。你做得越多，Gild就越脏。轻度使用留下这里那里的污迹；大量使用使他变得漆黑且愤怒。煤烟代表BrightChain生态系统中的业力：每个行动都留下印记，有人必须承受它。用Ohm的话说："Volta给你能量，Phix把它变成热量，Gild承受后果。我只是确保我们不浪费超过必要的。"',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: '全局视角',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]: '🌐 这一切如何组合在一起？',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    '生态系统是一个双层系统。在平台层面，BrightChain运行在Volta（花费者）和Ohm（节约者）之间的张力上，焦耳作为能量货币在它们之间流动。在产品层面，Digital Burnbag运行在Phix（毁灭者-创造者）和Gild（守护者）之间的张力上，煤烟是不可避免的后果。当焚烧袋操作触发时，四个角色都会互动：Volta伸手拿焦耳，Ohm评估成本并不情愿地让它们通过，Phix捕获能量并爆发，Gild被产生的煤烟击中。金丝雀协议是贯穿一切的完整性线索——Gild警惕的眼睛确保每次转换都是合法的。Burnbag/金丝雀协议标志讲述了起源故事：Gild和Phix是同一只鸟。一个是身体，另一个是火。标志是它们重叠的时刻——已经在燃烧的金丝雀，尚未完全出现的凤凰。',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 BrightChain信仰什么？',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    '能量守恒。行动有后果。数据有重量。BrightChain生态系统中的每个角色都映射到一个更深层的原则：Volta是火花——纯粹的、混沌的潜力和行动的欲望。Ohm是锚——扎根的智慧和正确行动的纪律。焦耳是流动——在它们之间移动的精神。Phix是重生——道路尽头的变革之火。Gild是见证者——承受我们执着（和我们打字错误）的世俗煤烟的人。煤烟是业力——无法避免的可见成本。它们共同形成一个闭环：Volta提供能量，Ohm确保它被明智地花费，Phix转换状态，Gild承担重量。没有什么是免费的。没有什么被浪费。一切都留下印记。',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 我在哪里可以看到吉祥物的行动？',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    '吉祥物贯穿整个产品体验。Gild出现在文件浏览、上传和共享期间——他的煤烟水平被动地反映正在发生多少活动。当你触发重命名或销毁操作时，Gild退到一边，Phix带着[ Phix ]按钮出现：它暗暗地闷烧着微弱的琥珀色光芒，悬停时点燃，点击时着火，并显示炉式进度条，灰烬颗粒从源流向目的地。Volta和Ohm住在平台范围的焦耳计中，Volta在能量计附近噼啪作响，Ohm在昂贵操作期间介入执行他的电阻冥想——将进度条从霓虹蓝变为平静的琥珀色。煤烟在你的会话期间可见地积聚在Gild的羽毛上。即将推出：吉祥物出现在错误页面、加载屏幕、根据操作严重性缩放的确认对话框中，是的——还有周边商品。',

  // Hero Section
  [ShowcaseStrings.Hero_Badge]: '🌟 去中心化应用平台',
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChain 利用"明亮区块汤"概念革新了数据存储方式。您的文件被拆分为区块，并通过 XOR 运算与随机数据混合，使其看起来完全随机，同时保持完美的安全性。',
  [ShowcaseStrings.Hero_Description_NotCrypto]: '这不是加密货币。',
  [ShowcaseStrings.Hero_Description_P2]:
    '没有代币，没有挖矿，没有工作量证明。BrightChain 重视存储和计算的真实贡献，以焦耳为单位进行追踪——这是一个与现实世界能源成本挂钩的单位，而非市场投机。',
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 无主存储 • ⚡ 节能高效 • 🌐 去中心化 • 🎭 匿名且可追责 • 🗳️ 同态投票 • 💾 存储优先于算力',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 交互式演示',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 BrightChain Soup 演示',
  [ShowcaseStrings.Hero_CTA_GitHub]: '在 GitHub 上查看',
  [ShowcaseStrings.Hero_CTA_Blog]: '博客',

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: '革命性的',
  [ShowcaseStrings.Comp_Title_Features]: '功能',
  [ShowcaseStrings.Comp_Title_Capabilities]: '与能力',
  [ShowcaseStrings.Comp_Subtitle]:
    '去中心化应用平台——先进的密码学、去中心化存储和民主治理',
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChain 利用"明亮区块汤"概念革新了数据存储——结合先进的密码学、去中心化存储和民主治理。',
  [ShowcaseStrings.Comp_Intro_P1]:
    '您的文件被拆分为区块，并通过 XOR 运算与随机数据混合，使其看起来完全随机，同时保持完美的安全性。从同态投票到中介匿名，从分布式文件存储到基于法定人数的治理，BrightChain 提供了下一代去中心化应用所需的一切。',
  [ShowcaseStrings.Comp_Problem_Title]: '❌ 传统区块链的问题',
  [ShowcaseStrings.Comp_Problem_1]: '工作量证明挖矿造成的巨大能源浪费',
  [ShowcaseStrings.Comp_Problem_2]: '数十亿设备上的存储容量被白白浪费',
  [ShowcaseStrings.Comp_Problem_3]: '缺乏隐私保护的投票机制',
  [ShowcaseStrings.Comp_Problem_4]: '没有问责的匿名性导致滥用',
  [ShowcaseStrings.Comp_Problem_5]: '昂贵的链上存储限制了应用场景',
  [ShowcaseStrings.Comp_Problem_6]: '节点运营者面临存储内容的法律责任',
  [ShowcaseStrings.Comp_Problem_Result]:
    '对环境有害、法律风险高且功能有限的区块链技术。',
  [ShowcaseStrings.Comp_Solution_Title]: '✅ BrightChain 解决方案',
  [ShowcaseStrings.Comp_Solution_P1]:
    'BrightChain 通过仅将工作量证明用于限流而非共识来消除挖矿浪费。无主文件系统通过仅存储经 XOR 随机化的区块来提供法律豁免。同态投票实现了隐私保护的选举，而中介匿名则在隐私与问责之间取得平衡。',
  [ShowcaseStrings.Comp_Solution_P2]:
    '基于以太坊的密钥空间构建，但摆脱了工作量证明的限制，BrightChain 将个人设备上未使用的存储变现，创建了一个可持续的 P2P 网络。法定人数系统提供了具有数学安全保障的民主治理。',
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 无主存储',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    '密码学随机性消除了存储责任——没有任何单个区块包含可识别的内容',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ 节能高效',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    '没有浪费的工作量证明挖矿——所有计算都服务于有用的目的',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 去中心化',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    '分布在整个网络中——类似 IPFS 的 P2P 存储，利用个人设备上的闲置空间',
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 匿名且可追责',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    '兼具隐私与审核能力——通过法定人数共识实现中介匿名',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ 同态投票',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    '隐私保护的选举，投票计数过程永远不会泄露个人投票',
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 法定人数治理',
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    '具有可配置阈值和数学安全性的民主决策',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 使用 BrightStack 构建',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node——用 BrightDB 替换 MongoDB，其他一切保持不变',
  [ShowcaseStrings.Comp_ProjectPage]: '项目主页',

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: '交互式',
  [ShowcaseStrings.Demo_Title_Demo]: '演示',
  [ShowcaseStrings.Demo_Subtitle]: '可视化 ECIES 加密功能',
  [ShowcaseStrings.Demo_Disclaimer]:
    '注意：此可视化演示使用 @digitaldefiance/ecies-lib（浏览器库）。@digitaldefiance/node-ecies-lib 为 Node.js 服务器应用提供相同的功能和 API。两个库二进制兼容，因此用其中一个加密的数据可以被另一个解密。',
  [ShowcaseStrings.Demo_Alice_Title]: 'Alice（发送方）',
  [ShowcaseStrings.Demo_Alice_PublicKey]: '公钥：',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: '要加密的消息：',
  [ShowcaseStrings.Demo_Alice_Placeholder]: '输入一条秘密消息...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: '加密中...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: '为 Bob 加密',
  [ShowcaseStrings.Demo_Bob_Title]: 'Bob（接收方）',
  [ShowcaseStrings.Demo_Bob_PublicKey]: '公钥：',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: '加密载荷：',
  [ShowcaseStrings.Demo_Bob_Decrypting]: '解密中...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: '解密消息',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: '解密后的消息：',
  [ShowcaseStrings.Demo_Error]: '错误：',

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: '构建于',
  [ShowcaseStrings.About_Title_By]: 'by Digital Defiance',
  [ShowcaseStrings.About_Subtitle]: '去中心化基础设施领域的开源创新',
  [ShowcaseStrings.About_Vision_Title]: '我们的愿景',
  [ShowcaseStrings.About_Vision_P1]:
    '在 Digital Defiance，我们致力于为个人和组织提供真正去中心化的基础设施，尊重隐私、促进可持续发展并实现民主参与。',
  [ShowcaseStrings.About_Vision_P2]:
    'BrightChain 利用"明亮区块汤"概念革新了数据存储方式。您的文件被拆分为区块，并通过 XOR 运算与随机数据混合，使其看起来完全随机，同时保持完美的安全性。通过消除挖矿浪费、将闲置存储变现，以及实现同态投票和中介匿名等功能，我们创建了一个服务于所有人的平台。',
  [ShowcaseStrings.About_Vision_NotCrypto]:
    '这不是加密货币。当你听到"区块链"时，你可能会想到比特币。BrightChain 没有货币、没有工作量证明、没有挖矿。BrightChain 不是通过燃烧能源来铸造代币，而是重视存储和计算的真实贡献。这些贡献以焦耳为单位进行追踪，焦耳通过公式与现实世界的能源成本挂钩——而非市场投机。你无法挖掘或交易焦耳；它们反映的是实际的资源成本，我们会随着时间不断优化这个公式。',
  [ShowcaseStrings.About_Vision_StorageDensity]:
    '存储密度与算力密度的优势：每条区块链都会在某些方面产生浪费。BrightChain 尽一切可能减少浪费，但其存储机制确实存在一些开销。然而，存储是近年来成本效益最高、密度提升最大的领域之一，而数据中心正在为满足区块链和 AI 的 CPU 算力密度需求而苦苦挣扎。以最小的存储开销换取匿名性，免除版权诉讼等法律顾虑，或避免托管不当内容的风险，使每个人都能全力参与，充分利用我们遍布全球的庞大存储资源。',
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStack 是去中心化应用的全栈范式：BrightChain + Express + React + Node。如果你熟悉 MERN 技术栈，你就已经了解 BrightStack——只需将 MongoDB 替换为 BrightDB。',
  [ShowcaseStrings.About_BrightStack_P2]:
    'BrightDB 是一个基于无主文件系统的类 MongoDB 文档数据库，支持完整的 CRUD 操作、查询、索引、事务和聚合管道。与 MongoDB 相同的使用模式——集合、查找、插入、更新——但每个文档都以隐私保护的白化区块形式存储。',
  [ShowcaseStrings.About_BrightStack_P3]:
    'BrightPass、BrightMail 和 BrightHub 都是基于 BrightStack 构建的，证明了去中心化应用开发可以像传统全栈开发一样简单。',
  [ShowcaseStrings.About_OpenSource]:
    '100% 开源。BrightChain 在 MIT 许可证下完全开源。在 BrightStack 上构建你自己的 dApp，为去中心化的未来做出贡献。',
  [ShowcaseStrings.About_WorkInProgress]:
    'BrightChain 仍在开发中。目前，我们力求每天保持构建稳定，但难免有疏漏，BrightChain 尚未成熟。对于任何不便或不稳定，我们深表歉意。',
  [ShowcaseStrings.About_OtherImpl_Title]: '其他实现',
  [ShowcaseStrings.About_OtherImpl_P1]:
    '虽然这个 TypeScript/Node.js 实现是 BrightChain 最主要、最成熟的版本，但一个并行的 C++ 核心库及 macOS/iOS 用户界面正在开发中。这个原生实现将 BrightChain 的隐私和安全特性带到了 Apple 平台。两个代码仓库都处于早期开发阶段，尚未准备好用于生产环境。',
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: '无主存储',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    '密码学随机性消除了存储责任。没有任何单个区块包含可识别的内容，为节点运营者提供法律豁免。',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: '节能高效',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    '没有浪费的工作量证明挖矿。所有计算都服务于有用的目的——存储、验证和网络运营。',
  [ShowcaseStrings.About_Feature_Anonymous_Title]: '匿名且可追责',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    '兼具隐私与审核能力。中介匿名通过法定人数共识在隐私与问责之间取得平衡。',
  [ShowcaseStrings.About_CTA_Title]: '加入这场变革',
  [ShowcaseStrings.About_CTA_Desc]:
    '帮助我们构建去中心化基础设施的未来。为 BrightChain 做贡献、报告问题，或在 GitHub 上给我们加星，以表达你对可持续区块链技术的支持。',
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 交互式演示',
  [ShowcaseStrings.About_CTA_LearnMore]: '了解更多',
  [ShowcaseStrings.About_CTA_GitHub]: '在 GitHub 上访问 BrightChain',
  [ShowcaseStrings.About_CTA_Docs]: '阅读文档',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance。以 ❤️ 为开发者社区而作。',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]: '正在初始化加密投票系统……',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 正在解密投票……',
  [ShowcaseStrings.Vote_LoadingDemo]: '正在加载投票演示……',
  [ShowcaseStrings.Vote_RunAnotherElection]: '再次举行选举',
  [ShowcaseStrings.Vote_StartElection]: '🎯 开始选举！',
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 {METHOD} 演示',
  [ShowcaseStrings.Vote_ComingSoonDesc]: '该投票方法已在库中完整实现。',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 公民投票中（{VOTED}/{TOTAL} 已投票）',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    '已投票数（{VOTED}/{TOTAL} 已投票）',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ 投给了 {CHOICE}',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 结果',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} 票（{PERCENT}%）',
  [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT} 票赞成（{PERCENT}%）',
  [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 显示审计日志',
  [ShowcaseStrings.Vote_HideAuditLog]: '🔍 隐藏审计日志',
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 显示事件日志',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 隐藏事件日志',
  [ShowcaseStrings.Vote_AuditLogTitle]: '🔒 不可变审计日志（需求 1.1）',
  [ShowcaseStrings.Vote_AuditLogDesc]: '加密签名、哈希链式审计追踪',
  [ShowcaseStrings.Vote_ChainIntegrity]: '链完整性：',
  [ShowcaseStrings.Vote_ChainValid]: '✅ 有效',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ 已被破坏',
  [ShowcaseStrings.Vote_EventLogTitle]: '📊 事件记录器（需求 1.3）',
  [ShowcaseStrings.Vote_EventLogDesc]:
    '全面的事件追踪，具有微秒级时间戳和序列号',
  [ShowcaseStrings.Vote_SequenceIntegrity]: '序列完整性：',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ 有效',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ 检测到间隔',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: '事件总数：{COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: '时间戳：',
  [ShowcaseStrings.Vote_VoterToken]: '投票者令牌：',

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ 政府级投票系统',
  [ShowcaseStrings.Vote_TitleDesc]:
    '探索我们全面的加密投票库，包含 15 种不同的投票方法。每个演示展示了使用同态加密确保投票隐私的真实应用场景。',
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ 同态加密',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 可验证回执',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ 角色分离',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ 测试',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: '选择投票方法',
  [ShowcaseStrings.VoteSel_SecureCategory]: '✅ 完全安全（单轮、隐私保护）',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]: '⚠️ 多轮（需要中间解密）',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ 不安全（无隐私——仅限特殊情况）',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: '多数制',
  [ShowcaseStrings.VoteMethod_Approval]: '赞成投票',
  [ShowcaseStrings.VoteMethod_Weighted]: '加权投票',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'Borda 计数',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: '评分投票',
  [ShowcaseStrings.VoteMethod_YesNo]: '赞成/反对',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: '赞成/反对/弃权',
  [ShowcaseStrings.VoteMethod_Supermajority]: '绝对多数',
  [ShowcaseStrings.VoteMethod_RankedChoice]: '排名选择 (IRV)',
  [ShowcaseStrings.VoteMethod_TwoRound]: '两轮制',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: '二次投票',
  [ShowcaseStrings.VoteMethod_Consensus]: '共识制',
  [ShowcaseStrings.VoteMethod_ConsentBased]: '同意制',

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]: '欢迎来到河滨市预算选举！',
  [ShowcaseStrings.Plur_IntroStory]:
    '市议会已拨款 5000 万美元用于一项重大计划，但他们无法决定资助哪个项目。这就需要你来做决定了！',
  [ShowcaseStrings.Plur_IntroSituation]:
    '三项提案已列入选票。每项都有热情的支持者，但只有一项能够胜出。',
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    '绿色团队希望在每栋公共建筑上安装太阳能板',
  [ShowcaseStrings.Plur_IntroTransit]: '公共交通倡导者正在推动建设新的地铁线路',
  [ShowcaseStrings.Plur_IntroHousing]:
    '住房联盟要求为 500 个家庭提供经济适用房',
  [ShowcaseStrings.Plur_IntroChallenge]:
    '你将为 5 位市民投票。每张选票都经过加密——即使是选举官员也无法在最终计票前看到个人选票。这才是真正的民主应有的样子！',
  [ShowcaseStrings.Plur_DemoTitle]: '🗳️ 多数制投票 - 河滨市预算',
  [ShowcaseStrings.Plur_DemoTagline]:
    '🏛️ 每人一票，得票最多者获胜。民主在行动！',
  [ShowcaseStrings.Plur_CandidatesTitle]: '城市预算优先事项',
  [ShowcaseStrings.Plur_VoterInstruction]:
    '点击一项提案为每位市民投票。请记住：他们的选择是加密且私密的！',
  [ShowcaseStrings.Plur_ClosePollsBtn]: '📦 关闭投票并计票！',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 人民已经做出了选择！',
  [ShowcaseStrings.Plur_ResultsIntro]: '解密所有选票后，河滨市的选择是：',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 计票过程',
  [ShowcaseStrings.Plur_TallyExplain]:
    '每张加密选票通过同态加法汇总，然后解密以揭示总数：',
  [ShowcaseStrings.Plur_Cand1_Name]: '绿色能源计划',
  [ShowcaseStrings.Plur_Cand1_Desc]: '投资可再生能源基础设施',
  [ShowcaseStrings.Plur_Cand2_Name]: '公共交通扩展',
  [ShowcaseStrings.Plur_Cand2_Desc]: '建设新的地铁线路和公交路线',
  [ShowcaseStrings.Plur_Cand3_Name]: '经济适用房计划',
  [ShowcaseStrings.Plur_Cand3_Desc]: '为低收入家庭提供住房补贴',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: 'TechCorp的重大决定！',
  [ShowcaseStrings.Appr_IntroStory]:
    '📢 紧急团队会议："我们需要选择未来5年的技术栈，但每个人都有不同的意见！"',
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'CTO有一个绝妙的主意：赞成投票。不再为一种语言争论不休，每个人都可以为所有愿意使用的语言投票。',
  [ShowcaseStrings.Appr_IntroStakes]:
    '🤔 关键点：你可以赞成任意多或任意少。喜欢TypeScript和Python？两个都投！只信任Rust？那就是你的选择！',
  [ShowcaseStrings.Appr_IntroWinner]:
    '🎯 获胜者：获得最多赞成票的语言将成为团队的主要语言。',
  [ShowcaseStrings.Appr_IntroChallenge]:
    '这就是联合国选举秘书长的方式。没有分票，没有策略博弈——只有真实的偏好！',
  [ShowcaseStrings.Appr_StartBtn]: '🚀 开始投票！',
  [ShowcaseStrings.Appr_DemoTitle]: '✅ 赞成投票 - TechCorp技术栈选择',
  [ShowcaseStrings.Appr_DemoTagline]:
    '👍 为你赞成的所有语言投票。最多赞成票获胜！',
  [ShowcaseStrings.Appr_CandidatesTitle]: '团队偏好的编程语言',
  [ShowcaseStrings.Appr_Cand1_Desc]: '类型安全的JavaScript超集',
  [ShowcaseStrings.Appr_Cand2_Desc]: '通用脚本语言',
  [ShowcaseStrings.Appr_Cand3_Desc]: '内存安全的系统语言',
  [ShowcaseStrings.Appr_Cand4_Desc]: '快速并发语言',
  [ShowcaseStrings.Appr_Cand5_Desc]: '企业级平台',
  [ShowcaseStrings.Appr_VotersTitle]: '投票 ({VOTED}/{TOTAL} 已投票)',
  [ShowcaseStrings.Appr_SubmitBtn]: '提交 ({COUNT} 已选择)',
  [ShowcaseStrings.Appr_TallyBtn]: '计票并公布结果',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ 已投票',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: '奥运会主办城市选择！',
  [ShowcaseStrings.Borda_IntroStory]:
    '🌍 国际奥委会会议室：五个国家必须选择下一届奥运会主办城市。但每个人都有自己的偏好！',
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 博达计数法根据排名给分：第1名 = 3分，第2名 = 2分，第3名 = 1分。',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 这种方法奖励共识选择而非极端选择。总分最高的城市获胜！',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 开始投票！',
  [ShowcaseStrings.Borda_DemoTitle]: '🏆 博达计数法 - 奥运会主办地选择',
  [ShowcaseStrings.Borda_DemoTagline]: '📊 为所有城市排名。积分 = 共识！',
  [ShowcaseStrings.Borda_CandidatesTitle]: '候选城市',
  [ShowcaseStrings.Borda_Cand1_Desc]: '光之城',
  [ShowcaseStrings.Borda_Cand2_Desc]: '日出之国',
  [ShowcaseStrings.Borda_Cand3_Desc]: '天使之城',
  [ShowcaseStrings.Borda_VotersTitle]:
    '国际奥委会成员 ({VOTED}/{TOTAL} 已投票)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ 已排名！',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 计算积分！',
  [ShowcaseStrings.Borda_ResultsTitle]: '🎉 奥运会主办城市揭晓！',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} 分',
  [ShowcaseStrings.Borda_NewVoteBtn]: '新投票',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 BrightChain 消息传递演示',
  [ShowcaseStrings.Msg_Subtitle]: '发送以 CBL 区块形式存储在 Soup 中的消息！',
  [ShowcaseStrings.Msg_Initializing]: '正在初始化……',
  [ShowcaseStrings.Msg_SendTitle]: '发送消息',
  [ShowcaseStrings.Msg_FromLabel]: '发件人：',
  [ShowcaseStrings.Msg_ToLabel]: '收件人：',
  [ShowcaseStrings.Msg_Placeholder]: '输入你的消息……',
  [ShowcaseStrings.Msg_SendBtn]: '📤 发送消息',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 消息（{COUNT}）',
  [ShowcaseStrings.Msg_NoMessages]: '暂无消息。发送你的第一条消息吧！✨',
  [ShowcaseStrings.Msg_From]: '发件人：',
  [ShowcaseStrings.Msg_To]: '收件人：',
  [ShowcaseStrings.Msg_Message]: '消息：',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 从 Soup 中检索',
  [ShowcaseStrings.Msg_SendFailed]: '消息发送失败：',
  [ShowcaseStrings.Msg_RetrieveFailed]: '消息检索失败：',
  [ShowcaseStrings.Msg_ContentTemplate]: '消息内容：{CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ 区块链账本',
  [ShowcaseStrings.Ledger_Subtitle]:
    '一个仅追加、加密链式、数字签名的账本，具有基于角色的治理。添加条目、管理签名者并验证链。',
  [ShowcaseStrings.Ledger_Initializing]: '正在为签名者生成 SECP256k1 密钥对……',
  [ShowcaseStrings.Ledger_Entries]: '条目',
  [ShowcaseStrings.Ledger_ActiveSigners]: '活跃签名者',
  [ShowcaseStrings.Ledger_Admins]: '管理员',
  [ShowcaseStrings.Ledger_BrightTrust]: '法定人数',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 验证链',
  [ShowcaseStrings.Ledger_Reset]: '🔄 重置',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 活跃签名者',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 追加条目',
  [ShowcaseStrings.Ledger_PayloadLabel]: '载荷（文本）',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: '输入数据……',
  [ShowcaseStrings.Ledger_AppendBtn]: '追加到链',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 授权签名者',
  [ShowcaseStrings.Ledger_Suspend]: '暂停',
  [ShowcaseStrings.Ledger_Reactivate]: '重新激活',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ 管理员',
  [ShowcaseStrings.Ledger_ToWriter]: '→ 写入者',
  [ShowcaseStrings.Ledger_Retire]: '退休',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: '新签名者名称',
  [ShowcaseStrings.Ledger_AddSigner]: '+ 添加签名者',
  [ShowcaseStrings.Ledger_EventLog]: '📋 事件日志',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ 链',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 创世',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ 治理',
  [ShowcaseStrings.Ledger_Data]: '📄 数据',
  [ShowcaseStrings.Ledger_EntryDetails]: '条目 #{SEQ} 详情',
  [ShowcaseStrings.Ledger_Type]: '类型',
  [ShowcaseStrings.Ledger_Sequence]: '序列号',
  [ShowcaseStrings.Ledger_Timestamp]: '时间戳',
  [ShowcaseStrings.Ledger_EntryHash]: '条目哈希',
  [ShowcaseStrings.Ledger_PreviousHash]: '前一哈希',
  [ShowcaseStrings.Ledger_NullGenesis]: 'null（创世）',
  [ShowcaseStrings.Ledger_Signer]: '签名者',
  [ShowcaseStrings.Ledger_SignerKey]: '签名者密钥',
  [ShowcaseStrings.Ledger_Signature]: '签名',
  [ShowcaseStrings.Ledger_PayloadSize]: '载荷大小',
  [ShowcaseStrings.Ledger_Payload]: '载荷',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} 字节',

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: '跳转到主要内容',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: '滚动浏览',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ 浏览器兼容性提示',
  [ShowcaseStrings.Compat_DismissAriaLabel]: '关闭警告',
  [ShowcaseStrings.Compat_BrowserNotice]:
    '您的浏览器（{BROWSER} {VERSION}）可能不支持此演示的所有功能。',
  [ShowcaseStrings.Compat_CriticalIssues]: '严重问题：',
  [ShowcaseStrings.Compat_Warnings]: '警告：',
  [ShowcaseStrings.Compat_RecommendedActions]: '建议操作：',
  [ShowcaseStrings.Compat_Recommendation]:
    '为获得最佳体验，请使用最新版本的 Chrome、Firefox、Safari 或 Edge。',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: '调试面板',
  [ShowcaseStrings.Debug_OpenTitle]: '打开调试面板',
  [ShowcaseStrings.Debug_CloseTitle]: '关闭调试面板',
  [ShowcaseStrings.Debug_BlockStore]: '区块存储',
  [ShowcaseStrings.Debug_SessionId]: '会话 ID：',
  [ShowcaseStrings.Debug_BlockCount]: '区块数量：',
  [ShowcaseStrings.Debug_TotalSize]: '总大小：',
  [ShowcaseStrings.Debug_LastOperation]: '最近操作：',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: '区块 ID（{COUNT}）',
  [ShowcaseStrings.Debug_ClearSession]: '清除会话',
  [ShowcaseStrings.Debug_AnimationState]: '动画状态',
  [ShowcaseStrings.Debug_Playing]: '播放中',
  [ShowcaseStrings.Debug_Paused]: '已暂停',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ 播放中',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ 已暂停',
  [ShowcaseStrings.Debug_Speed]: '速度：',
  [ShowcaseStrings.Debug_Frame]: '帧：',
  [ShowcaseStrings.Debug_Sequence]: '序列：',
  [ShowcaseStrings.Debug_Progress]: '进度：',
  [ShowcaseStrings.Debug_Performance]: '性能',
  [ShowcaseStrings.Debug_FrameRate]: '帧率：',
  [ShowcaseStrings.Debug_FrameTime]: '帧时间：',
  [ShowcaseStrings.Debug_DroppedFrames]: '丢帧数：',
  [ShowcaseStrings.Debug_Memory]: '内存：',
  [ShowcaseStrings.Debug_Sequences]: '序列数：',
  [ShowcaseStrings.Debug_Errors]: '错误数：',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 文件重建动画',
  [ShowcaseStrings.Recon_Subtitle]: '观看区块如何重新组装为您的原始文件',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: '处理 CBL',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]: '读取组成区块列表元数据',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: '选择区块',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]: '从 Soup 中识别所需区块',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: '检索区块',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]: '从存储中收集区块',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]: '验证校验和',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]: '验证区块完整性',
  [ShowcaseStrings.Recon_Step_Reassemble]: '重新组装文件',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]: '合并区块并移除填充',
  [ShowcaseStrings.Recon_Step_DownloadReady]: '可以下载',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]: '文件重建完成',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 组成区块列表',
  [ShowcaseStrings.Recon_CBLSubtitle]: '从 CBL 中提取的区块引用',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 区块（{COUNT}）',
  [ShowcaseStrings.Recon_BlocksSubtitle]: '正在检索和验证的区块',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 文件重新组装',
  [ShowcaseStrings.Recon_ReassemblySubtitle]: '合并区块并移除填充',
  [ShowcaseStrings.Recon_Complete]: '文件重建完成！',
  [ShowcaseStrings.Recon_ReadyForDownload]: '您的文件已准备好下载',
  [ShowcaseStrings.Recon_FileName]: '文件名：',
  [ShowcaseStrings.Recon_Size]: '大小：',
  [ShowcaseStrings.Recon_Blocks]: '区块数：',
  [ShowcaseStrings.Recon_WhatsHappening]: '当前进展',
  [ShowcaseStrings.Recon_TechDetails]: '技术详情：',
  [ShowcaseStrings.Recon_CBLContainsRefs]: 'CBL 包含所有区块的引用',
  [ShowcaseStrings.Recon_BlockCountTemplate]: '区块数量：{COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]: '原始文件大小：{SIZE} 字节',
  [ShowcaseStrings.Recon_BlockSelection]: '区块选择：',
  [ShowcaseStrings.Recon_IdentifyingBlocks]: '在 Soup 中识别区块',
  [ShowcaseStrings.Recon_SelectedByChecksums]: '通过校验和选择区块',
  [ShowcaseStrings.Recon_AllBlocksRequired]: '重建需要所有区块',
  [ShowcaseStrings.Recon_ChecksumValidation]: '校验和验证：',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]: '确保区块未被损坏',
  [ShowcaseStrings.Recon_ComparesChecksums]:
    '将存储的校验和与计算的校验和进行比较',
  [ShowcaseStrings.Recon_InvalidBlocksFail]: '无效区块将导致重建失败',
  [ShowcaseStrings.Recon_FileReassembly]: '文件重新组装：',
  [ShowcaseStrings.Recon_CombinedInOrder]: '按正确顺序合并区块',
  [ShowcaseStrings.Recon_PaddingRemoved]: '移除随机填充',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]: '逐字节重建原始文件',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: 'BrightChain 区块 Soup 动画演示',
  [ShowcaseStrings.Anim_Subtitle]:
    '通过逐步动画和教育内容体验 BrightChain 流程！',
  [ShowcaseStrings.Anim_Initializing]: '正在初始化 BrightChain 动画演示……',
  [ShowcaseStrings.Anim_PauseAnimation]: '暂停动画',
  [ShowcaseStrings.Anim_PlayAnimation]: '播放动画',
  [ShowcaseStrings.Anim_ResetAnimation]: '重置动画',
  [ShowcaseStrings.Anim_SpeedTemplate]: '速度：{SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 性能监控',
  [ShowcaseStrings.Anim_FrameRate]: '帧率：',
  [ShowcaseStrings.Anim_FrameTime]: '帧时间：',
  [ShowcaseStrings.Anim_DroppedFrames]: '丢帧数：',
  [ShowcaseStrings.Anim_Memory]: '内存：',
  [ShowcaseStrings.Anim_Sequences]: '序列数：',
  [ShowcaseStrings.Anim_Errors]: '错误数：',
  [ShowcaseStrings.Anim_DropFilesOrClick]: '拖放文件到此处或点击上传',
  [ShowcaseStrings.Anim_ChooseFiles]: '选择文件',
  [ShowcaseStrings.Anim_StorageTemplate]: '区块 Soup 存储（{COUNT} 个文件）',
  [ShowcaseStrings.Anim_NoFilesYet]:
    '尚无存储文件。上传一些文件来体验动画魔法吧！✨',
  [ShowcaseStrings.Anim_RetrieveFile]: '检索文件',
  [ShowcaseStrings.Anim_DownloadCBL]: '下载 CBL',
  [ShowcaseStrings.Anim_SizeTemplate]: '大小：{SIZE} 字节 | 区块数：{BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: '编码动画',
  [ShowcaseStrings.Anim_ReconstructionAnimation]: '重建动画',
  [ShowcaseStrings.Anim_CurrentStep]: '当前步骤',
  [ShowcaseStrings.Anim_DurationTemplate]: '持续时间：{DURATION}ms',
  [ShowcaseStrings.Anim_BlockDetails]: '区块详情',
  [ShowcaseStrings.Anim_Index]: '索引：',
  [ShowcaseStrings.Anim_Size]: '大小：',
  [ShowcaseStrings.Anim_Id]: 'ID：',
  [ShowcaseStrings.Anim_Stats]: '动画统计',
  [ShowcaseStrings.Anim_TotalFiles]: '文件总数：',
  [ShowcaseStrings.Anim_TotalBlocks]: '区块总数：',
  [ShowcaseStrings.Anim_AnimationSpeed]: '动画速度：',
  [ShowcaseStrings.Anim_Session]: '会话：',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]: '（刷新页面后数据将被清除）',
  [ShowcaseStrings.Anim_WhatsHappening]: '当前进展：',
  [ShowcaseStrings.Anim_Duration]: '持续时间：',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'BrightChain 演示',
  [ShowcaseStrings.Soup_Subtitle]:
    '将文件和消息作为区块存储在去中心化区块 Soup 中。一切都变成彩色的 Soup 罐头！',
  [ShowcaseStrings.Soup_Initializing]:
    '正在初始化 SessionIsolatedBrightChain……',
  [ShowcaseStrings.Soup_StoreInSoup]: '将数据存储到区块 Soup',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 存储文件',
  [ShowcaseStrings.Soup_DropFilesOrClick]: '拖放文件到此处或点击上传',
  [ShowcaseStrings.Soup_ChooseFiles]: '选择文件',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 使用磁力链接将 CBL 存储到 Soup',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    '使用 XOR 白化将 CBL 存储到区块 Soup 中，并生成可分享的磁力链接。如果不启用此选项，您将直接获得 CBL 文件。',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 存储消息',
  [ShowcaseStrings.Soup_From]: '发件人：',
  [ShowcaseStrings.Soup_To]: '收件人：',
  [ShowcaseStrings.Soup_Message]: '消息：',
  [ShowcaseStrings.Soup_TypeMessage]: '输入您的消息……',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 发送消息到 Soup',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL 已存储到 Soup',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 使用了超级 CBL',
  [ShowcaseStrings.Soup_HierarchyDepth]: '层级深度：',
  [ShowcaseStrings.Soup_SubCBLs]: '子 CBL 数：',
  [ShowcaseStrings.Soup_LargeFileSplit]: '大文件已拆分为层级结构',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    '您的 CBL 已作为两个 XOR 组件存储在区块 Soup 中。使用此磁力链接检索文件：',
  [ShowcaseStrings.Soup_Component1]: '组件 1：',
  [ShowcaseStrings.Soup_Component2]: '组件 2：',
  [ShowcaseStrings.Soup_Copy]: '📋 复制',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: '从 Soup 中检索',
  [ShowcaseStrings.Soup_UploadCBLFile]: '上传 CBL 文件',
  [ShowcaseStrings.Soup_UseMagnetURL]: '使用磁力链接',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    '上传 .cbl 文件以从区块 Soup 中重建原始文件。区块必须已存在于 Soup 中才能完成重建。',
  [ShowcaseStrings.Soup_ChooseCBLFile]: '选择 CBL 文件',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    '粘贴磁力链接以检索文件。磁力链接引用存储在 Soup 中的白化 CBL 组件。',
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: '加载',
  [ShowcaseStrings.Soup_MessagePassing]: '消息传递',
  [ShowcaseStrings.Soup_HideMessagePanel]: '隐藏消息面板',
  [ShowcaseStrings.Soup_ShowMessagePanel]: '显示消息面板',
  [ShowcaseStrings.Soup_SendMessage]: '发送消息',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 消息（{COUNT}）',
  [ShowcaseStrings.Soup_NoMessagesYet]: '暂无消息。发送您的第一条消息吧！✨',
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 从 Soup 中检索',
  [ShowcaseStrings.Soup_StoredMessages]: '已存储的消息',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]: '已存储的文件和消息',
  [ShowcaseStrings.Soup_RemoveFromList]: '从列表中移除',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    '从列表中移除"{NAME}"？（区块将保留在 Soup 中）',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 检索文件',
  [ShowcaseStrings.Soup_DownloadCBL]: '下载 CBL',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 检索消息',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 磁力链接',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    '白化 CBL 磁力链接（使用"使用磁力链接"进行检索）',
  [ShowcaseStrings.Soup_ProcessingSteps]: '处理步骤',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'CBL 存储步骤',
  [ShowcaseStrings.Soup_BlockDetails]: '区块详情',
  [ShowcaseStrings.Soup_Index]: '索引：',
  [ShowcaseStrings.Soup_Size]: '大小：',
  [ShowcaseStrings.Soup_Id]: 'ID：',
  [ShowcaseStrings.Soup_Color]: '颜色：',
  [ShowcaseStrings.Soup_SoupStats]: 'Soup 统计',
  [ShowcaseStrings.Soup_TotalFiles]: '文件总数：',
  [ShowcaseStrings.Soup_TotalBlocks]: '区块总数：',
  [ShowcaseStrings.Soup_BlockSize]: '区块大小：',
  [ShowcaseStrings.Soup_SessionDebug]: '会话调试',
  [ShowcaseStrings.Soup_SessionId]: '会话 ID：',
  [ShowcaseStrings.Soup_BlocksInMemory]: '内存中的区块数：',
  [ShowcaseStrings.Soup_BlockIds]: '区块 ID：',
  [ShowcaseStrings.Soup_ClearSession]: '清除会话',
  [ShowcaseStrings.Soup_Session]: '会话：',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]: '（刷新页面后数据将被清除）',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]: '选择文件以高亮显示其块：',
  [ShowcaseStrings.ESV_BlockSoup]: '块汤',
  [ShowcaseStrings.ESV_ShowingConnections]: '显示连接：',
  [ShowcaseStrings.ESV_EmptySoup]: '空汤',
  [ShowcaseStrings.ESV_EmptySoupHint]: '上传文件，看它们变成五彩缤纷的汤罐头！',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} 个块 • {size} 字节',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]: '影评人颁奖之夜！',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    '三部电影获得最佳影片提名。影评人必须独立评价每一部。',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    '为每部电影打0-10分。喜欢一部，讨厌另一部？诚实打分！最高平均分获胜。',
  [ShowcaseStrings.Score_IntroChallenge]:
    '与排名不同，如果所有电影都很棒，你可以给多部电影打高分！',
  [ShowcaseStrings.Score_StartBtn]: '🎬 开始评分！',
  [ShowcaseStrings.Score_DemoTitle]: '⭐ 评分投票 - 最佳影片',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 为每部电影打0-10分。最高平均分获胜！',
  [ShowcaseStrings.Score_NominatedFilms]: '提名影片',
  [ShowcaseStrings.Score_Genre_SciFi]: '科幻史诗',
  [ShowcaseStrings.Score_Genre_Romance]: '浪漫剧情',
  [ShowcaseStrings.Score_Genre_Thriller]: '科技惊悚',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 {VOTER}的评分',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - 糟糕',
  [ShowcaseStrings.Score_Label_Average]: '5 - 一般',
  [ShowcaseStrings.Score_Label_Masterpiece]: '10 - 杰作',
  [ShowcaseStrings.Score_SubmitTemplate]: '提交评分 ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 加密中...',
  [ShowcaseStrings.Score_EncryptingVote]: '正在加密投票...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 已评分的影评人: {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 计算平均分！',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 获奖者是...',
  [ShowcaseStrings.Score_TallyTitle]: '📊 评分平均化过程',
  [ShowcaseStrings.Score_TallyExplain]:
    '每部电影的分数被相加并除以{COUNT}位影评人：',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 平均分',
  [ShowcaseStrings.Score_ResetBtn]: '新颁奖典礼',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]: 'StartupCo的董事会风云！',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    '这是年度股东大会。公司价值1亿美元，每个人都想对下一步发展发表意见。',
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    '并非所有投票都是平等的。风投基金拥有45%的股份。创始人拥有30%和15%。员工和天使投资人拥有其余部分。',
  [ShowcaseStrings.Weight_StakeExpand]: '巨大的增长潜力，但有风险',
  [ShowcaseStrings.Weight_StakeAcquire]: '消灭竞争对手，但成本高昂',
  [ShowcaseStrings.Weight_StakeIPO]: 'IPO意味着流动性，但也意味着审查',
  [ShowcaseStrings.Weight_IntroChallenge]:
    '每票按持股比例加权。风投基金的投票权是天使投资人的18倍。这就是企业民主！',
  [ShowcaseStrings.Weight_StartBtn]: '📄 进入董事会',
  [ShowcaseStrings.Weight_DemoTitle]: '⚖️ 加权投票 - StartupCo董事会会议',
  [ShowcaseStrings.Weight_DemoTagline]:
    '💰 你的股份 = 你的投票权。欢迎来到公司治理！',
  [ShowcaseStrings.Weight_ProposalsTitle]: '战略提案',
  [ShowcaseStrings.Weight_Proposal1_Desc]: '在东京和新加坡开设办事处',
  [ShowcaseStrings.Weight_Proposal2_Desc]: '与TechStartup Inc.合并',
  [ShowcaseStrings.Weight_Proposal3_Desc]: '下季度在纳斯达克上市',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    '股东 ({VOTED}/{TOTAL} 已投票)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} 股 ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ 投票给 {EMOJI} {NAME}',
  [ShowcaseStrings.Weight_TallyBtn]: '统计加权投票',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 结果（按股份权重）',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} 股 ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 获胜提案获得了总股份的{PERCENT}%',
  [ShowcaseStrings.Weight_ResetBtn]: '重新投票',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: '全国公投！',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ 问题："我们国家是否应该实行每周四天工作制？"',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 是/否公投：最简单的民主形式。一个问题，两个选择，多数决定。',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ 赞成阵营：更好的工作生活平衡，更高的生产力，更幸福的公民！',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ 反对阵营：经济风险，商业中断，未经验证的政策！',
  [ShowcaseStrings.YN_IntroChallenge]:
    '🗳️ 用于脱欧、苏格兰独立以及世界各地的宪法修改。',
  [ShowcaseStrings.YN_StartBtn]: '🗳️ 立即投票！',
  [ShowcaseStrings.YN_DemoTitle]: '👍 是/否公投 - 每周四天工作制',
  [ShowcaseStrings.YN_DemoTagline]: '🗳️ 一个问题。两个选择。民主决定。',
  [ShowcaseStrings.YN_ReferendumQuestion]: '我们是否应该实行每周四天工作制？',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    '公民投票中（{VOTED}/{TOTAL}人已投票）',
  [ShowcaseStrings.YN_VotedYes]: '✓ 投了 👍 赞成',
  [ShowcaseStrings.YN_VotedNo]: '✓ 投了 👎 反对',
  [ShowcaseStrings.YN_BtnYes]: '👍 赞成',
  [ShowcaseStrings.YN_BtnNo]: '👎 反对',
  [ShowcaseStrings.YN_TallyBtn]: '📊 计票！',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 公投结果！',
  [ShowcaseStrings.YN_LabelYes]: '赞成',
  [ShowcaseStrings.YN_LabelNo]: '反对',
  [ShowcaseStrings.YN_MotionPasses]: '✅ 动议通过！',
  [ShowcaseStrings.YN_MotionFails]: '❌ 动议未通过！',
  [ShowcaseStrings.YN_OutcomePass]: '人民已经发声：我们实行每周四天工作制！',
  [ShowcaseStrings.YN_OutcomeFail]: '人民已经发声：我们保持每周五天工作制。',
  [ShowcaseStrings.YN_ResetBtn]: '新公投',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]: '联合国安理会决议！',
  [ShowcaseStrings.YNA_IntroResolution]:
    '🌍 决议："联合国是否应因人权侵犯对X国实施制裁？"',
  [ShowcaseStrings.YNA_IntroStory]:
    '🤷 赞成/反对/弃权：有时你还没准备好做决定。弃权不计入总数但会被记录。',
  [ShowcaseStrings.YNA_IntroYes]: '✅ 赞成：立即实施制裁',
  [ShowcaseStrings.YNA_IntroNo]: '❌ 反对：否决该决议',
  [ShowcaseStrings.YNA_IntroAbstain]: '🤷 弃权：中立 - 不想选边站',
  [ShowcaseStrings.YNA_IntroChallenge]:
    '🏛️ 用于联合国投票、议会程序和世界各地的董事会会议。',
  [ShowcaseStrings.YNA_StartBtn]: '🌎 投票！',
  [ShowcaseStrings.YNA_DemoTitle]: '🤷 赞成/反对/弃权 - 联合国决议',
  [ShowcaseStrings.YNA_DemoTagline]: '🌍 三个选择：支持、反对或保持中立',
  [ShowcaseStrings.YNA_ReferendumQuestion]: '对X国实施制裁？',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    '安理会成员（{VOTED}/{TOTAL}人已投票）',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 赞成',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 反对',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 弃权',
  [ShowcaseStrings.YNA_BtnYes]: '👍 赞成',
  [ShowcaseStrings.YNA_BtnNo]: '👎 反对',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 弃权',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 决议计票！',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 决议结果！',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 投票计数',
  [ShowcaseStrings.YNA_TallyExplain]:
    '弃权被记录但不计入决定。获胜者需要赞成/反对票的多数：',
  [ShowcaseStrings.YNA_LabelYes]: '赞成',
  [ShowcaseStrings.YNA_LabelNo]: '反对',
  [ShowcaseStrings.YNA_LabelAbstain]: '弃权',
  [ShowcaseStrings.YNA_AbstainNote]: '不计入决定',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ 决议通过！',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ 决议未通过！',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    '决定票：{DECIDING} | 弃权：{ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: '新决议',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: '宪法修正案投票！',
  [ShowcaseStrings.Super_IntroStakes]:
    '🏛️ 利害攸关：修改宪法需要超过简单多数。我们需要绝对多数！',
  [ShowcaseStrings.Super_IntroThreshold]:
    '🎯 2/3门槛：至少66.67%必须投赞成票才能通过修正案。这可以防止仓促的变更。',
  [ShowcaseStrings.Super_IntroAmendment]:
    '📜 修正案："为所有联邦法官增加任期限制"',
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ 高门槛：9个州中必须有6个批准（简单多数不够！）',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 用于宪法修改、条约批准和弹劾审判。',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ 开始批准！',
  [ShowcaseStrings.Super_DemoTitle]: '🎯 绝对多数 - 宪法修正案',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 通过需要{PERCENT}%（{REQUIRED}/{TOTAL}个州）',
  [ShowcaseStrings.Super_TrackerTitle]: '📊 实时门槛追踪器',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} 赞成',
  [ShowcaseStrings.Super_RequiredTemplate]: '需要{PERCENT}%',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ 目前通过中（{YES}/{TOTAL} = {PERCENT}%）',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ 目前未通过（{YES}/{TOTAL} = {PERCENT}%）- 还需要{NEED}票赞成',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    '州议会（{VOTED}/{TOTAL}已投票）',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ 批准',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ 否决',
  [ShowcaseStrings.Super_BtnRatify]: '✅ 批准',
  [ShowcaseStrings.Super_BtnReject]: '❌ 否决',
  [ShowcaseStrings.Super_TallyBtn]: '📜 最终计票！',
  [ShowcaseStrings.Super_ResultsTitle]: '🏛️ 修正案结果！',
  [ShowcaseStrings.Super_CalcTitle]: '📊 绝对多数计算',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    '需要：{REQUIRED}/{TOTAL}个州（{PERCENT}%）',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    '实际：{ACTUAL}/{VOTED}个州（{PERCENT}%）',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} 批准',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} 否决',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ {PERCENT}% 门槛',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ 修正案已批准！',
  [ShowcaseStrings.Super_AmendmentFails]: '❌ 修正案未通过！',
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    '修正案以{COUNT}个州通过（{PERCENT}%）',
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    '未达到{THRESHOLD}%的门槛。{REQUIRED}个所需州中只有{ACTUAL}个批准。',
  [ShowcaseStrings.Super_ResetBtn]: '新修正案',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: '政治大对决！',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ 选举之夜特别节目：四个政党争夺控制权。但转折来了——没人希望分票让最不喜欢的候选人获胜！',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 排序投票来救场！不是只选一个，而是将所有候选人从最喜欢到最不喜欢排序。',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    '🔥 运作方式：如果第一轮没人获得50%+，我们淘汰最后一名并将其选票转移给选民的第二选择。重复直到有人获胜！',
  [ShowcaseStrings.RC_IntroWhyCool]:
    '✨ 为什么很酷：你可以在第一轮用心投票而不会"浪费"选票。如果你的最爱被淘汰，备选方案会生效。',
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 在澳大利亚、缅因州、阿拉斯加和纽约市使用！亲眼观看即时决选投票。',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ 开始排序！',
  [ShowcaseStrings.RC_DemoTitle]: '🔄 排序投票 - 全国选举',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 全部排序！没有搅局者，没有遗憾，只有民主。',
  [ShowcaseStrings.RC_PartiesTitle]: '政党',
  [ShowcaseStrings.RC_Cand1_Platform]: '全民医保、气候行动',
  [ShowcaseStrings.RC_Cand2_Platform]: '降低税收、传统价值观',
  [ShowcaseStrings.RC_Cand3_Platform]: '个人自由、小政府',
  [ShowcaseStrings.RC_Cand4_Platform]: '环境保护、可持续发展',
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    '排列你的偏好（{VOTED}/{TOTAL}人已投票）',
  [ShowcaseStrings.RC_VotedBadge]: '✓ 已投票',
  [ShowcaseStrings.RC_AddToRanking]: '添加到排序：',
  [ShowcaseStrings.RC_SubmitBallot]: '提交选票',
  [ShowcaseStrings.RC_RunInstantRunoff]: '运行即时决选',
  [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 显示公告板',
  [ShowcaseStrings.RC_HideBulletinBoard]: '📜 隐藏公告板',
  [ShowcaseStrings.RC_BulletinBoardTitle]: '📜 公共公告板（要求1.2）',
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    '透明的仅追加投票发布，带默克尔树验证',
  [ShowcaseStrings.RC_EntryTemplate]: '条目 #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: '加密投票：',
  [ShowcaseStrings.RC_VoterHash]: '投票者哈希：',
  [ShowcaseStrings.RC_Verified]: '✅ 已验证',
  [ShowcaseStrings.RC_Invalid]: '❌ 无效',
  [ShowcaseStrings.RC_MerkleTree]: '默克尔树：',
  [ShowcaseStrings.RC_MerkleValid]: '✅ 有效',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ 已被篡改',
  [ShowcaseStrings.RC_TotalEntries]: '总条目数：',
  [ShowcaseStrings.RC_ResultsTitle]: '🏆 即时决选投票结果',
  [ShowcaseStrings.RC_EliminationRounds]: '淘汰轮次',
  [ShowcaseStrings.RC_RoundTemplate]: '第{ROUND}轮',
  [ShowcaseStrings.RC_Eliminated]: '已淘汰',
  [ShowcaseStrings.RC_Winner]: '获胜者！',
  [ShowcaseStrings.RC_FinalWinner]: '最终获胜者',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]: '经过{COUNT}轮后获胜',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: '总统选举 - 两轮投票！',
  [ShowcaseStrings.TR_IntroSystem]:
    '🗳️ 制度：四位候选人竞争。如果第一轮没人获得50%+，前两名在第二轮对决！',
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 为什么两轮？确保获胜者获得多数支持。在法国、巴西和许多总统选举中使用。',
  [ShowcaseStrings.TR_IntroRound1]: '📊 第一轮：在4位候选人中投票给你的最爱',
  [ShowcaseStrings.TR_IntroRound2]: '🔄 第二轮：如有需要，在前两名之间选择',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ 这需要在轮次之间进行中间解密——投票在轮次之间不是私密的！',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ 开始第一轮！',
  [ShowcaseStrings.TR_DemoTitle]: '2️⃣ 两轮投票 - 总统选举',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 第一轮：选择你的最爱',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 第二轮：最终决选！',
  [ShowcaseStrings.TR_Round1Candidates]: '第一轮候选人',
  [ShowcaseStrings.TR_Cand1_Party]: '进步党',
  [ShowcaseStrings.TR_Cand2_Party]: '保守党',
  [ShowcaseStrings.TR_Cand3_Party]: '科技前进',
  [ShowcaseStrings.TR_Cand4_Party]: '正义联盟',
  [ShowcaseStrings.TR_VotersTemplate]: '选民（{VOTED}/{TOTAL}人已投票）',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ 投票给了 {EMOJI}',
  [ShowcaseStrings.TR_CountRound1]: '📊 计算第一轮选票！',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ 第一轮结果',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 第一轮计票',
  [ShowcaseStrings.TR_Round1TallyExplain]: '检查是否有人获得50%+多数...',
  [ShowcaseStrings.TR_AdvanceRound2]: '→ 第二轮',
  [ShowcaseStrings.TR_EliminatedBadge]: '已淘汰',
  [ShowcaseStrings.TR_NoMajority]: '🔄 没有多数！需要决选！',
  [ShowcaseStrings.TR_TopTwoAdvance]: '前两名候选人进入第二轮：',
  [ShowcaseStrings.TR_StartRound2]: '▶️ 开始第二轮决选！',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 第二轮决选',
  [ShowcaseStrings.TR_Round1ResultTemplate]: '第一轮：{VOTES}票',
  [ShowcaseStrings.TR_FinalVoteTemplate]: '最终投票（{VOTED}/{TOTAL}人已投票）',
  [ShowcaseStrings.TR_FinalCount]: '🏆 最终计票！',
  [ShowcaseStrings.TR_ElectionWinner]: '🎉 选举获胜者！',
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 第二轮最终计票',
  [ShowcaseStrings.TR_Round2TallyExplain]: '前两名候选人的直接对决：',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME}获胜！',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    '在决选中获得{VOTES}票（{PERCENT}%）',
  [ShowcaseStrings.TR_NewElection]: '新选举',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]: 'STAR投票 - 两全其美！',
  [ShowcaseStrings.STAR_IntroAcronym]: '🌟 STAR = 评分然后自动决选',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ 步骤1：给所有候选人打0-5星（就像给电影评分！）',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 步骤2：总分前两名进入自动决选。你的评分决定你的偏好！',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 神奇之处：你可以给多个候选人高分，但决选确保多数支持',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 例子：你给Alex=5、Jordan=4、Sam=2、Casey=1。如果Alex和Jordan是前两名，你的票投给Alex！',
  [ShowcaseStrings.STAR_IntroChallenge]:
    '⚠️ 结合了评分投票的表达力和决选的多数要求！',
  [ShowcaseStrings.STAR_StartBtn]: '⭐ 开始评分！',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 STAR投票 - 市议会',
  [ShowcaseStrings.STAR_DemoTagline]: '⭐ 评分，然后自动决选！',
  [ShowcaseStrings.STAR_CandidatesTitle]: '候选人',
  [ShowcaseStrings.STAR_Cand1_Platform]: '艺术与文化',
  [ShowcaseStrings.STAR_Cand2_Platform]: '环境',
  [ShowcaseStrings.STAR_Cand3_Platform]: '经济',
  [ShowcaseStrings.STAR_Cand4_Platform]: '医疗',
  [ShowcaseStrings.STAR_RatingsTemplate]: '⭐ {VOTER}的评分（0-5星）',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]: '提交评分（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 运行STAR算法！',
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ 阶段1：分数总计',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 汇总所有分数',
  [ShowcaseStrings.STAR_Phase1TallyExplain]: '按总分寻找前两名候选人...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL}分（平均{AVG}）',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ 决选',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 自动决选阶段',
  [ShowcaseStrings.STAR_TopTwoAdvance]: '前两名晋级！正在检查直接对决偏好...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ 运行自动决选！',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 STAR获胜者！',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 阶段2：自动决选',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    '根据选民偏好比较{NAME1}与{NAME2}：',
  [ShowcaseStrings.STAR_VotersPreferred]: '位选民更偏好',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME}获胜！',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    '在自动决选中以{WINNER}比{LOSER}获胜',
  [ShowcaseStrings.STAR_NewElection]: '新选举',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: 'STV - 比例代表制！',
  [ShowcaseStrings.STV_IntroGoal]: '🏛️ 目标：选出3位反映选民偏好多样性的代表！',
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 STV（单一可转移投票）：排列候选人。当你的首选获胜或被淘汰时，选票会转移。',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 当选门槛：需要{QUOTA}票赢得一个席位（德鲁普配额：{VOTERS}/(3+1) + 1）',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 转移：获胜者的多余选票和被淘汰候选人的选票转移到下一偏好',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 在爱尔兰、澳大利亚参议院和许多市议会中用于公平代表！',
  [ShowcaseStrings.STV_StartBtn]: '📊 开始排序！',
  [ShowcaseStrings.STV_DemoTitle]: '📊 STV - 市议会（{SEATS}个席位）',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 当选门槛：每个席位需要{QUOTA}票',
  [ShowcaseStrings.STV_PartiesRunning]: '参选政党',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 {VOTER}的排序',
  [ShowcaseStrings.STV_RankingInstruction]: '点击按偏好顺序添加候选人：',
  [ShowcaseStrings.STV_SubmitRankingTemplate]: '提交排序（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 运行STV计票！',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ 议会已选出！',
  [ShowcaseStrings.STV_CountingTitle]: '📊 STV计票过程',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    '当选门槛：{QUOTA}票 | 席位：{SEATS}\n首选计票决定初始获胜者',
  [ShowcaseStrings.STV_QuotaMet]: '（达到门槛！）',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ 当选',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 当选代表',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 这{COUNT}个政党各自达到了{QUOTA}票的门槛，赢得了议会席位！',
  [ShowcaseStrings.STV_NewElection]: '新选举',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]: '二次方投票 - 预算分配！',
  [ShowcaseStrings.Quad_IntroChallenge]:
    '💰 挑战：140万美元预算，4个项目。如何衡量偏好强度？',
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² 二次方投票：每票花费票²积分。1票 = 1积分，2票 = 4积分，3票 = 9积分！',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ 不安全方法：需要非同态运算（平方根）。个人投票可见！',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    '🎯 为什么使用？防止富裕投票者主导。显示偏好强度，而不仅仅是是/否。',
  [ShowcaseStrings.Quad_IntroUsedIn]:
    '💡 在科罗拉多州众议院、台湾vTaiwan平台和企业治理实验中使用！',
  [ShowcaseStrings.Quad_StartBtn]: '💰 开始分配！',
  [ShowcaseStrings.Quad_DemoTitle]: '² 二次方投票 - 城市预算',
  [ShowcaseStrings.Quad_DemoTagline]: '💰 100语音积分。投票花费票²！',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ 不安全：此方法无法使用同态加密。投票可见！',
  [ShowcaseStrings.Quad_BudgetProjects]: '预算项目',
  [ShowcaseStrings.Quad_Proj1_Name]: '新公园',
  [ShowcaseStrings.Quad_Proj1_Desc]: '50万美元',
  [ShowcaseStrings.Quad_Proj2_Name]: '图书馆翻新',
  [ShowcaseStrings.Quad_Proj2_Desc]: '30万美元',
  [ShowcaseStrings.Quad_Proj3_Name]: '社区中心',
  [ShowcaseStrings.Quad_Proj3_Desc]: '40万美元',
  [ShowcaseStrings.Quad_Proj4_Name]: '道路维修',
  [ShowcaseStrings.Quad_Proj4_Desc]: '20万美元',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 {VOTER}的预算（剩余{REMAINING}积分）',
  [ShowcaseStrings.Quad_VotesTemplate]: '{VOTES}票（花费{COST}积分）',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    '下一票花费{NEXT_COST}积分（从{CURRENT}到{NEXT_TOTAL}）',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]: '总花费：{USED}/100积分',
  [ShowcaseStrings.Quad_SubmitTemplate]: '提交分配（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 计算总数！',
  [ShowcaseStrings.Quad_ResultsTitle]: '💰 预算分配结果！',
  [ShowcaseStrings.Quad_TallyTitle]: '📊 二次方投票总计',
  [ShowcaseStrings.Quad_TallyExplain]:
    '每个项目的总票数（非积分）决定资金优先级：',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: '共{TOTAL}票',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 最高优先',
  [ShowcaseStrings.Quad_ExplanationTitle]: '💡 二次方投票如何运作',
  [ShowcaseStrings.Quad_ExplanationP1]:
    '二次方成本防止了任何人主导单个项目。投10票需要100积分（你的全部预算！），但在2个项目上各投5票只需要50积分。',
  [ShowcaseStrings.Quad_ExplanationResult]:
    '结果：拥有广泛而强烈支持的项目胜过拥有狭窄而极端支持的项目。',
  [ShowcaseStrings.Quad_ResetBtn]: '新预算投票',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: '共识决策！',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ 场景：一个小型合作社需要做出重大决定。每个人的声音都很重要！',
  [ShowcaseStrings.Cons_IntroConsensus]:
    '🤝 共识投票：需要95%以上的同意。一两个反对就能阻止提案。',
  [ShowcaseStrings.Cons_IntroInsecure]:
    '⚠️ 不安全方法：没有隐私 - 每个人都能看到谁支持/反对！',
  [ShowcaseStrings.Cons_IntroWhyUse]:
    '🎯 为什么使用？适用于信任和团结比隐私更重要的小团体。',
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 在合作社、意向社区和基于共识的组织中使用！',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 开始投票！',
  [ShowcaseStrings.Cons_DemoTitle]: '🤝 共识投票 - 合作社决策',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    '🎯 需要{PERCENT}%同意（{REQUIRED}/{TOTAL}成员）',
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ 不安全：没有隐私 - 所有投票可见以建立共识！',
  [ShowcaseStrings.Cons_Proposal]:
    '提案：我们是否应该投资5万美元购买太阳能板？',
  [ShowcaseStrings.Cons_ProposalDesc]:
    '这是一项需要近乎一致支持的重大财务决定。',
  [ShowcaseStrings.Cons_TrackerTitle]: '📊 实时共识追踪器',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT}人支持',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ 达成共识（{SUPPORT}/{TOTAL}）',
  [ShowcaseStrings.Cons_NeedMoreTemplate]: '❌ 还需要{NEEDED}人才能达成共识',
  [ShowcaseStrings.Cons_MembersTemplate]: '合作社成员（{VOTED}/{TOTAL}已投票）',
  [ShowcaseStrings.Cons_Support]: '✅ 支持',
  [ShowcaseStrings.Cons_Oppose]: '❌ 反对',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ 支持',
  [ShowcaseStrings.Cons_BtnOppose]: '❌ 反对',
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 检查共识！',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 共识结果！',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 最终计数',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    '需要：{REQUIRED}/{TOTAL}（{PERCENT}%）',
  [ShowcaseStrings.Cons_ActualTemplate]:
    '实际：{SUPPORT}/{VOTED}（{ACTUAL_PERCENT}%）',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT}人支持',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT}人反对',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ {PERCENT}%门槛',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ 达成共识！',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ 共识失败！',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    '提案以{COUNT}名成员支持通过（{PERCENT}%）',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    '未达到{THRESHOLD}%门槛。{OPPOSE}名成员反对，阻止了共识。',
  [ShowcaseStrings.Cons_FailNote]:
    '💡 在共识决策中，即使一两个反对也很重要。团体必须解决关切或修改提案。',
  [ShowcaseStrings.Cons_ResetBtn]: '新提案',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]: '基于同意的决策！',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 社会治理：一个工人合作社需要做出每个人都能接受的决定。',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    '🙋 基于同意：不是关于同意 - 而是"没有强烈反对"。你能接受吗？',
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ 不安全方法：没有隐私 - 异议必须被听取和处理！',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 问题："你是否有会损害组织的原则性异议？"',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    '🌍 在社会治理组织、合弄制和协作工作场所中使用！',
  [ShowcaseStrings.Consent_StartBtn]: '🙋 开始流程！',
  [ShowcaseStrings.Consent_DemoTitle]: '🙋 基于同意 - 工人合作社',
  [ShowcaseStrings.Consent_DemoTagline]: '🤝 没有强烈异议 = 达成同意',
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ 不安全：没有隐私 - 异议公开分享以供讨论！',
  [ShowcaseStrings.Consent_ProposalTitle]:
    '提案：从下个月开始实行每周四天工作制',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    '你是否有会损害我们组织的原则性异议？',
  [ShowcaseStrings.Consent_ProposalNote]:
    '"我更喜欢5天"不是原则性异议。"这会让我们破产"才是。',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ 同意',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 异议',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ 提出了{COUNT}项原则性异议 - 提案必须修改或撤回',
  [ShowcaseStrings.Consent_MembersTemplate]:
    '圈子成员（{RESPONDED}/{TOTAL}已回应）',
  [ShowcaseStrings.Consent_NoObjection]: '✅ 无异议',
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 原则性异议',
  [ShowcaseStrings.Consent_BtnNoObjection]: '✅ 无异议',
  [ShowcaseStrings.Consent_BtnObject]: '🚫 提出异议',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}，你的原则性异议是什么？',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 检查同意！',
  [ShowcaseStrings.Consent_ResultsTitle]: '🙋 同意流程结果！',
  [ShowcaseStrings.Consent_ConsentCheckTitle]: '📊 同意检查',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    '零原则性异议即达成同意\n提出的异议：{COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ 无异议（{COUNT}）',
  [ShowcaseStrings.Consent_NoObjectionsDesc]: '这些成员可以接受该提案',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]: '🚫 原则性异议（{COUNT}）',
  [ShowcaseStrings.Consent_ObjectionRaised]: '提出了异议',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ 达成同意！',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 同意被阻止！',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    '全部{COUNT}名成员给予同意（无原则性异议）。提案继续推进。',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    '提出了{COUNT}项原则性异议。圈子必须在继续之前解决关切。',
  [ShowcaseStrings.Consent_NextStepsTitle]: '💡 社会治理的下一步：',
  [ShowcaseStrings.Consent_NextStep1]: '完整听取异议',
  [ShowcaseStrings.Consent_NextStep2]: '修改提案以解决关切',
  [ShowcaseStrings.Consent_NextStep3]: '用更新后的提案重新测试同意',
  [ShowcaseStrings.Consent_NextStep4]: '如果异议持续，提案将被撤回',
  [ShowcaseStrings.Consent_ResetBtn]: '新提案',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'BrightChain博客',
  [ShowcaseStrings.Blog_Subtitle]: '思考、教程和更新',
  [ShowcaseStrings.Blog_Loading]: '正在加载文章...',
  [ShowcaseStrings.Blog_NewPost]: '+ 新文章',
  [ShowcaseStrings.Blog_NoPosts]: '还没有博客文章。请稍后再来！',
  [ShowcaseStrings.Blog_NewBadge]: '✨ 新',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: '{AUTHOR}著',
  [ShowcaseStrings.Blog_BackToHome]: '← 返回首页',

  // BlogPost.tsx (TODO: translate)
  [ShowcaseStrings.BlogPost_Loading]: 'Loading post...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Post Not Found',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    "The blog post you're looking for doesn't exist.",
  [ShowcaseStrings.BlogPost_BackToBlog]: '← Back to Blog',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ This post was just published! It will appear in the blog list after the next site deployment.',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'By {AUTHOR}',

  // Components.tsx feature cards (TODO: translate)
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    'MongoDB-competitive document database storing data on the Owner-Free Filesystem. Every document transparently stored as whitened blocks with TUPLE architecture for plausible deniability.',
  [ShowcaseStrings.Feat_BrightDB_Cat]: 'Storage',
  [ShowcaseStrings.Feat_BrightDB_Tech1]: 'Document Store',
  [ShowcaseStrings.Feat_BrightDB_Tech2]: 'ACID Transactions',
  [ShowcaseStrings.Feat_BrightDB_Tech3]: 'Aggregation Pipeline',
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    'MongoDB-like API: collections, CRUD, queries, indexes, transactions',
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    '15 query operators: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch',
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    'Aggregation pipeline: $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup',
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    'Single-field, compound, and unique indexes with B-tree structures',
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    'Multi-document ACID transactions with commit/abort and optimistic concurrency',
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    'Change streams for real-time insert/update/delete event subscriptions',
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    'Express REST middleware for drop-in API access to collections',
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    'TTL indexes for automatic document expiration',
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    'Schema validation with strict/moderate levels and default values',
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    'Full-text search with weighted fields and $text operator',
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    'Copy-on-write storage: blocks never deleted, only mappings updated',
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    'Every document stored as 3-block TUPLE (data + 2 randomizers) for plausible deniability',
  [ShowcaseStrings.Feat_BrightDBPools_Title]: 'BrightDB Pools',
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    'Lightweight namespace-isolated storage pools that logically partition blocks without separate physical storage. Each pool enforces its own ACL, encryption, and whitening boundaries — enabling multi-tenant, multi-application data isolation on a single BrightChain node.',
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'Storage',
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: 'Namespace Isolation',
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'Pool ACLs',
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'Gossip Discovery',
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    'Namespace-prefixed storage keys (poolId:hash) — logical isolation without physical separation',
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    'Per-pool ACLs with Read, Write, Replicate, and Admin permissions enforced at the store layer',
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    'Pool-scoped XOR whitening: tuples never cross pool boundaries, preserving per-pool plausible deniability',
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    'Gossip-based pool discovery across peers with configurable query timeouts and caching',
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    'Pool bootstrap seeding: generate cryptographic random blocks as whitening material for new pools',
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    'Safe deletion validation — checks cross-pool XOR dependencies before removing a pool',
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    'Pool-scoped Bloom filters and manifests for efficient peer reconciliation',
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    'Multi-admin quorum governance: ACL updates require >50% admin signatures',
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    'Public read/write flags for open pools, or locked-down member-only access',
  [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
  [ShowcaseStrings.Feat_OFFS_Desc]:
    'Revolutionary distributed storage that breaks files into blocks and XORs them with random data. No single block contains identifiable content, providing legal immunity for node operators while enabling secure, decentralized file storage.',
  [ShowcaseStrings.Feat_OFFS_Cat]: 'Storage',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'XOR Encryption',
  [ShowcaseStrings.Feat_OFFS_Tech2]: 'Distributed Storage',
  [ShowcaseStrings.Feat_OFFS_Tech3]: 'SHA-512',
  [ShowcaseStrings.Feat_OFFS_HL1]:
    'Files split into source blocks and merged with random data via XOR',
  [ShowcaseStrings.Feat_OFFS_HL2]:
    'Original blocks discarded - only randomized blocks stored',
  [ShowcaseStrings.Feat_OFFS_HL3]:
    'Constituent Block Lists (CBL) track block relationships',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'Blocks identified by SHA-512 hash - automatic deduplication',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    'Multi-use blocks can be part of multiple files simultaneously',
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'Legal protection for node operators - no identifiable content stored',
  [ShowcaseStrings.Feat_Messaging_Title]: 'Messaging System',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    'Secure, decentralized message passing with encryption, routing, delivery tracking, and gossip protocol for epidemic-style propagation. Built on the block store with WebSocket real-time delivery.',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'Network',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'Gossip Protocol',
  [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
  [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Bloom Filters',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    'Encrypted message passing with per-recipient or shared key encryption',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    'Epidemic-style gossip propagation with priority-based delivery',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    'Automatic retry with exponential backoff for failed deliveries',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    'Bloom filter-based discovery protocol for efficient block location',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'Real-time WebSocket events for message delivery and acknowledgments',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    'Persistent delivery tracking with per-recipient status',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    'RFC 5322/2045 compliant email with threading, BCC privacy, attachments, inbox operations, and delivery tracking. Full email composition, sending, and retrieval built on messaging infrastructure.',
  [ShowcaseStrings.Feat_BrightMail_Cat]: 'Network',
  [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
  [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
  [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
  [ShowcaseStrings.Feat_BrightMail_Tech4]: 'Threading',
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    'RFC-compliant Internet Message Format with MIME support',
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    'Threading via In-Reply-To and References headers',
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    'BCC privacy with cryptographically separated copies per recipient',
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    'Multiple attachments with Content-ID for inline images',
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    'Inbox operations: query, filter, sort, search with pagination',
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    'Per-recipient delivery tracking via gossip acknowledgments',
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    'Multiple encryption schemes: ECIES, shared key, S/MIME',
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    'Digital signatures for sender authentication',
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    'Forward/reply with RFC-compliant Resent-* headers',
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Discord-competitive communication platform with Signal-grade end-to-end encryption. Direct messaging, group chats, and channels with real-time presence, typing indicators, and role-based permissions.',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'Network',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'E2E Encryption',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Key Rotation',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    'Direct messaging for person-to-person encrypted conversations',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    'Group chats with shared encryption and automatic key rotation',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'Channels with four visibility modes: public/private/secret/invisible',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'Real-time presence system: online/offline/idle/DND',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'Role-based permissions: Owner/Admin/Moderator/Member',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'Typing indicators, reactions, and message edits via WebSocket',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'Time-limited, usage-limited invite tokens for channels',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'Full-text message search within channel history',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'Seamless conversation promotion from DMs to groups',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    '1Password-competitive password keychain with VCBL architecture for efficient encrypted credential storage. TOTP/2FA, breach detection, emergency access, and import from major password managers.',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'Identity',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
  [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
  [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Shamir Sharing',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    'VCBL (Vault Constituent Block List) for efficient encrypted storage',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    'Multiple entry types: login, secure note, credit card, identity',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    'Cryptographically secure password generation with constraints',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    'TOTP/2FA support with QR code generation for authenticators',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'k-anonymity breach detection via Have I Been Pwned API',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'Append-only encrypted audit logging for all vault operations',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    "Emergency access via Shamir's Secret Sharing for recovery",
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'Multi-member vault sharing with ECIES per-recipient encryption',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    'Import from 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'Browser extension autofill API ready',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'Privacy-preserving elections using Paillier homomorphic encryption with ECDH-derived keys. Supports 15+ voting methods from simple plurality to complex ranked choice with government compliance features.',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'Governance',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Paillier Encryption',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
  [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Homomorphic Cryptography',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'ECDH-to-Paillier bridge derives homomorphic keys from ECDSA/ECDH keys',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    'Privacy-preserving vote aggregation via homomorphic addition',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    '15+ voting methods: Plurality, Approval, Weighted, Borda, Score, Ranked Choice, IRV, STAR, STV, Quadratic, Consensus, etc.',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'Security classifications: fully homomorphic, multi-round, insecure',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    'Government compliance: immutable audit logs, public bulletin board, verifiable receipts',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    'Hierarchical aggregation: Precinct → County → State → National',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    '128-bit security level with Miller-Rabin primality testing (256 rounds)',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'Cross-platform determinism (Node.js and browser environments)',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    'Timing attack resistance with constant-time operations',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    'Twitter-competitive decentralized social network with unique FontAwesome icon markup syntax. Posts, threads, DMs, connection lists, hubs for privacy, and real-time notifications via WebSocket.',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'Network',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Real-time Messaging',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Connection Management',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    'Posts with 280-char limit, markdown, and unique {{icon}} syntax for FontAwesome',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    'Threaded conversations with 10-level nesting and reply hierarchies',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    'Connection lists, categories, and hubs for organizing relationships',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    'Direct messaging with read receipts, typing indicators, and reactions',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    'Group conversations (up to 50 participants) with admin roles',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    'Message requests for non-followers with accept/decline workflow',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'Real-time notifications via WebSocket with smart grouping',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    'Notification preferences: quiet hours, DND mode, per-category settings',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'Protected accounts with follow request approval workflow',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'Connection insights: strength calculation, mutual connections, suggestions',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'Hub-based content visibility for private group sharing',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'Rich text formatting with XSS prevention and emoji support',
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Brokered Anonymity & BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    "Sophisticated privacy mechanism enabling anonymous operations while maintaining accountability. Identity information encrypted and split using Shamir's Secret Sharing, reconstructable only through majority BrightTrust consensus.",
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: "Shamir's Secret Sharing",
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Forward Error Correction',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'BrightTrust Consensus',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Post anonymously with encrypted identity backup',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Identity shards distributed across ~24 BrightTrust members',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'Majority vote required to reconstruct identity information',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    'Time-limited accountability - data expires after statute of limitations',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'Legal compliance mechanism for FISA warrants and court orders',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    'Permanent privacy protection after expiration period',
  [ShowcaseStrings.Feat_Encryption_Title]: 'Advanced Encryption Stack',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    'State-of-the-art encryption combining ECIES for key derivation with AES-256-GCM for file security. Complete cryptosystem with BIP39/32 authentication and SECP256k1 elliptic curve cryptography.',
  [ShowcaseStrings.Feat_Encryption_Cat]: 'Cryptography',
  [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
  [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
  [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'ECIES encryption with user-specific key derivation',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    'AES-256-GCM for authenticated file encryption',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'BIP39/32 mnemonic-based authentication',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'SECP256k1 elliptic curve (Ethereum-compatible keyspace)',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'Verified block-level data integrity with XOR functionality',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'Cross-platform cryptographic operations',
  [ShowcaseStrings.Feat_Storage_Title]: 'Decentralized Storage Network',
  [ShowcaseStrings.Feat_Storage_Desc]:
    'Peer-to-peer distributed file system that monetizes unused storage on personal devices. IPFS-like architecture with energy-efficient proof-of-work and reputation-based incentives.',
  [ShowcaseStrings.Feat_Storage_Cat]: 'Network',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'P2P Networks',
  [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
  [ShowcaseStrings.Feat_Storage_Tech3]: 'Block Replication',
  [ShowcaseStrings.Feat_Storage_HL1]:
    'Utilize wasted storage space on personal computers and devices',
  [ShowcaseStrings.Feat_Storage_HL2]:
    'Distributed Hash Table (DHT) for efficient block tracking',
  [ShowcaseStrings.Feat_Storage_HL3]:
    'Configurable block durability and accessibility requirements',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'Dynamic replication based on block usefulness and access patterns',
  [ShowcaseStrings.Feat_Storage_HL5]:
    'Energy-efficient alternative to traditional proof-of-work mining',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'Storage credits and bandwidth compensation for node operators',
  [ShowcaseStrings.Feat_Sealing_Title]: 'BrightTrust-Based Document Sealing',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Advanced document protection with customizable threshold requirements for access restoration. Groups can seal sensitive information requiring configurable majority consensus to unseal.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Threshold Cryptography',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Secret Sharing',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Multi-Party Computation',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Seal documents with configurable quorum thresholds (e.g., 3-of-5, 7-of-10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Distributed shard storage across trusted BrightTrust members',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    'Mathematical guarantee of security until threshold reached',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    'Flexible unsealing for legal compliance or group decisions',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    'Supports organizational governance and compliance workflows',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    'Time-based expiration for automatic privacy protection',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'Sophisticated identity management ensuring user privacy and control. Support for registered aliases, anonymous posting, and cryptographic identity verification.',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'Identity',
  [ShowcaseStrings.Feat_BrightID_Tech1]: 'Public Key Infrastructure',
  [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'Identity Management',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'BIP39/32 mnemonic-based identity generation',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'Multiple registered aliases per user account',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'Anonymous posting with optional identity recovery',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    'Public key-based authentication (SECP256k1)',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'Forward Error Correction for identity backup',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'Privacy-preserving identity verification',
  [ShowcaseStrings.Feat_Reputation_Title]: 'Reputation & Energy Tracking',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'Revolutionary reputation system that tracks energy costs in Joules. Good actors enjoy minimal proof-of-work requirements while bad actors face increased computational burdens.',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'Network',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Proof of Work',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'Reputation Systems',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'Energy Accounting',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    'Energy costs measured in actual Joules for real-world correlation',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'Dynamic proof-of-work based on user reputation',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'Content creators rewarded as their content is consumed',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    'Bad actors throttled with increased computational requirements',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'Storage and bandwidth costs tracked and compensated',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'Incentivizes positive contributions and quality content',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'Block Temperature & Lifecycle',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    "Intelligent block management with hot/cold storage tiers. Frequently accessed blocks stay 'hot' with high replication, while unused blocks cool down and may expire.",
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Storage',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Storage Tiering',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Block Lifecycle',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Access Patterns',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    "'Keep Until At Least' contracts for minimum storage duration",
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'Block usefulness increases with access, staleness decreases',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'Dynamic replication based on access patterns and temperature',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    'Auto-extension of contracts for frequently accessed blocks',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    'Energy credits returned for blocks that prove useful',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    'Configurable durability and accessibility requirements',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'Zero Mining Waste',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    "Built on Ethereum's foundation but engineered without proof-of-work constraints. All computational work serves useful purposes - storage, verification, and network operations.",
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Network',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Ethereum Keyspace',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Efficient Consensus',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Green Blockchain',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    'No wasteful mining - all computation serves useful purposes',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Ethereum-compatible keyspace and cryptography (SECP256k1)',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Proof-of-work used only for transaction throttling',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'Energy-efficient consensus mechanisms',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    'Sustainable blockchain without environmental impact',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    'Focus on storage and computation, not artificial scarcity',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Cross-Platform Determinism',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Identical cryptographic operations across Node.js and browser environments. Deterministic key generation ensures consistent results regardless of platform.',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Cryptography',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Browser Crypto',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Deterministic Algorithms',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'Unified cryptographic operations across platforms',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    'Deterministic random bit generation (HMAC-DRBG)',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'Consistent Paillier key derivation from ECDH keys',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'Browser and Node.js compatibility',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    'Reproducible cryptographic results',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'Cross-platform testing and verification',
  [ShowcaseStrings.Feat_Contracts_Title]: 'Digital Contracts & Governance',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    'Smart contract capabilities for decentralized applications. BrightTrust-based governance with configurable voting thresholds for network decisions and policy enforcement.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Smart Contracts',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Governance',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Voting Systems',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Digital contract execution on decentralized network',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'BrightTrust-based decision making for network governance',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    'Configurable majority requirements for different actions',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'Homomorphic voting for privacy-preserving governance',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'Reputation-weighted voting mechanisms',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    'Transparent and auditable governance processes',
  [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js (fork)',
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    "Enhanced implementation of Shamir's Secret Sharing for secure data splitting and reconstruction. Pure TypeScript with native browser support, cryptographically audited, and optimized for splitting any secret (passwords, keys, files) into threshold-recoverable shares.",
  [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Cryptography',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: "Shamir's Secret Sharing",
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Data Security',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    'Divide secrets into n shares with configurable t-of-n threshold recovery',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    'Information-theoretically secure - shares below threshold reveal no information',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Cure53 security audit (July 2019) with zero issues found',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'Native browser support without polyfills (crypto.getRandomValues)',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'Cross-platform deterministic operations (Node.js and browser)',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    'Full TypeScript support with comprehensive type definitions',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    'Convert passwords, files, and keys to/from hex with automatic padding',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    'Generate new shares dynamically from existing shares',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    'Configurable Galois field (3-20 bits) supporting up to 1,048,575 shares',
  [ShowcaseStrings.Feat_Burnbag_Desc]:
    '零知识安全存储，配备自动故障安全协议。密码学擦除销毁配方（映射+密钥），使分散的加密块在触发时永久不可恢复。',
  [ShowcaseStrings.Feat_Burnbag_Cat]: '密码学',
  [ShowcaseStrings.Feat_Burnbag_Tech1]: '密码学擦除',
  [ShowcaseStrings.Feat_Burnbag_Tech2]: '死人开关',
  [ShowcaseStrings.Feat_Burnbag_Tech3]: '金丝雀协议',
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    '零知识架构：正常情况下服务提供商无法访问用户数据',
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    '密码学擦除：销毁配方使分散的块永久不可恢复',
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    '死人开关：心跳监控在不活动时触发配方的自动销毁',
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    '金丝雀协议：带有第三方API监控的规则引擎（Twitter、Fitbit、Google、GitHub）',
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    '胁迫检测：特殊胁迫代码触发销毁协议而非正常访问',
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    '可配置的协议操作：文件删除、数据分发、公开披露或自定义响应',
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    '双密钥架构：用户控制的BIP39密钥加上用于协议执行的可选系统托管密钥',
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    '继承法定人数：预授权的可信联系人，用于安全的数据发布或恢复',
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    '读取时变异：任何未授权的配方访问都会触发永久且不可变的账本变异',
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    '可配置的信任级别：零信任、条件信任或按文件敏感度的混合模式',
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    '多语言支持：英语、法语、西班牙语、乌克兰语和普通话',
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    '使用secp256k1密钥和AES-256-GCM的ECIES加密确保文件安全',

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    '基于BrightChain密码学构建的患者自有电子病历。您的健康数据归您所有——加密、去中心化，仅凭您的密钥可访问。',
  [ShowcaseStrings.Feat_BrightChart_Cat]: '身份',
  [ShowcaseStrings.Feat_BrightChart_Tech1]: '无主EMR',
  [ShowcaseStrings.Feat_BrightChart_Tech2]: '端到端加密',
  [ShowcaseStrings.Feat_BrightChart_Tech3]: '患者控制访问',
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    '患者通过密码学密钥拥有和控制所有医疗记录',
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    '端到端加密的健康数据存储在BrightChain上——没有可被攻破的中央服务器',
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    '细粒度同意：通过BrightTrust委托与医疗提供者共享特定记录',
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    '每次访问、编辑和共享事件的不可变审计追踪',
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    '跨提供者可移植——无供应商锁定，无数据绑架',
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    '通过Shamir秘密共享实现紧急访问，支持可配置法定人数',
  [ShowcaseStrings.Feat_BrightChart_HL7]: '带密码学完整性验证的版本化病历',
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    '提供者签名的条目确保诊断和处方的真实性',
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    '支持离线：加密记录本地缓存，连接时同步',
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    '内置数字焚烧袋，用于需要保证销毁的敏感记录',
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    '可互操作的数据层，专为FHIR兼容的健康记录交换设计',
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    '零知识证明实现保险验证，无需暴露完整病历',

  // Remaining (TODO: translate)
  [ShowcaseStrings.Soup_Time]: 'Time',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'Failed to retrieve file: {ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Please upload a .cbl file',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    'CBL loaded! File: {NAME} ({BLOCKS} blocks). You can now retrieve the file if all blocks are in the soup.',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'Failed to parse CBL: {ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    'File reconstructed successfully! Size: {SIZE} bytes. The file has been downloaded and added to receipts.',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'Failed to process magnet URL: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: 'Message sent and stored in soup!',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'Failed to send message: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'Message retrieved from soup: {TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'Failed to retrieve message: {ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: 'Magnet URL copied to clipboard!',
  [ShowcaseStrings.Anim_PauseBtn]: 'Pause Animation',
  [ShowcaseStrings.Anim_PlayBtn]: 'Play Animation',
  [ShowcaseStrings.Anim_ResetBtn]: 'Reset Animation',
  [ShowcaseStrings.Anim_SpeedLabel]: 'Speed: {SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 Performance Monitor',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'Frame Rate:',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'Frame Time:',
  [ShowcaseStrings.Anim_PerfDropped]: 'Dropped Frames:',
  [ShowcaseStrings.Anim_PerfMemory]: 'Memory:',
  [ShowcaseStrings.Anim_PerfSequences]: 'Sequences:',
  [ShowcaseStrings.Anim_PerfErrors]: 'Errors:',
  [ShowcaseStrings.Anim_WhatHappening]: "What's happening:",
  [ShowcaseStrings.Anim_DurationLabel]: 'Duration:',
  [ShowcaseStrings.Anim_SizeInfo]: 'Size: {SIZE} bytes | Blocks: {BLOCKS}',

  // Educational/Encoding (TODO: translate)
  [ShowcaseStrings.Edu_CloseTooltip]: 'Close tooltip',
  [ShowcaseStrings.Edu_WhatsHappening]: "🔍 What's Happening",
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 Why It Matters',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Technical Details',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Related Concepts',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ Visual Cues',
  [ShowcaseStrings.Edu_GetHelp]: 'Get help with this step',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ I Understand - Continue',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ Skip This Step',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 BrightChain Concept Glossary',
  [ShowcaseStrings.Edu_CloseGlossary]: 'Close glossary',
  [ShowcaseStrings.Edu_BackToGlossary]: '← Back to Glossary',
  [ShowcaseStrings.Edu_Definition]: 'Definition',
  [ShowcaseStrings.Edu_TechnicalDefinition]: 'Technical Definition',
  [ShowcaseStrings.Edu_Examples]: 'Examples',
  [ShowcaseStrings.Edu_RelatedTerms]: 'Related Terms',
  [ShowcaseStrings.Edu_SearchPlaceholder]: 'Search concepts...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'Process Overview',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: 'What We Accomplished',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Technical Outcomes',
  [ShowcaseStrings.Edu_WhatsNext]: "What's Next?",
  [ShowcaseStrings.Edu_LearningProgress]: 'Learning Progress',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED} of {TOTAL} steps completed',
  [ShowcaseStrings.Enc_Title]: '🎬 File Encoding Animation',
  [ShowcaseStrings.Enc_Subtitle]:
    'Watch as your file is transformed into BrightChain blocks',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 File Chunks ({COUNT})',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    'Each chunk will become a block in the soup',
  [ShowcaseStrings.Enc_EduWhatsHappening]: "🎓 What's Happening Now",
  [ShowcaseStrings.Enc_TechDetails]: 'Technical Details:',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'Block size: {SIZE} bytes',
  [ShowcaseStrings.Enc_ExpectedChunks]: 'Expected chunks: {COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    'Each chunk becomes one block in the soup',
  [ShowcaseStrings.Enc_WhyPadding]: 'Why Padding?',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'All blocks must be the same size',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'Random padding prevents data analysis',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'Padding is removed during reconstruction',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'Checksum Purpose:',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Ensures data integrity',
  [ShowcaseStrings.Enc_UniqueIdentifier]: 'Used as unique block identifier',
  [ShowcaseStrings.Enc_EnablesVerification]:
    'Enables verification during retrieval',

  // ProcessCompletionSummary (TODO)
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Key Learning Points',
  [ShowcaseStrings.Edu_CloseSummary]: 'Close summary',
  [ShowcaseStrings.Edu_Overview]: 'Overview',
  [ShowcaseStrings.Edu_Achievements]: 'Achievements',
  [ShowcaseStrings.Edu_Technical]: 'Technical',
  [ShowcaseStrings.Edu_NextSteps]: 'Next Steps',
  [ShowcaseStrings.Edu_Previous]: '← Previous',
  [ShowcaseStrings.Edu_Next]: 'Next →',
  [ShowcaseStrings.Edu_Finish]: 'Finish',

  // EducationalModeControls (TODO)
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 Educational Mode',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'Animation Speed:',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Very Slow)',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Slow)',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Moderate)',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x (Normal)',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Fast)',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Very Fast)',
  [ShowcaseStrings.Edu_StepByStep]: 'Step-by-Step Mode',
  [ShowcaseStrings.Edu_ShowTooltips]: 'Show Tooltips',
  [ShowcaseStrings.Edu_ShowExplanations]: 'Show Explanations',
  [ShowcaseStrings.Edu_AutoAdvance]: 'Auto Advance Steps',
};

export default ShowcaseMandarinStrings;
