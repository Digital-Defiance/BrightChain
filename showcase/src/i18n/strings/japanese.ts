import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// Japanese translations - Complete
export const ShowcaseJapaneseStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: 'ホーム',
  [ShowcaseStrings.Nav_SoupDemo]: 'Soupデモ',
  [ShowcaseStrings.Nav_Ledger]: '台帳',
  [ShowcaseStrings.Nav_Blog]: 'ブログ',
  [ShowcaseStrings.Nav_FAQ]: 'よくある質問',
  [ShowcaseStrings.Nav_Docs]: 'ドキュメント',
  [ShowcaseStrings.Nav_Home_Description]: 'メインページ',
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    'インタラクティブなブロック可視化',
  [ShowcaseStrings.Nav_Ledger_Description]:
    'ガバナンス付きブロックチェーン台帳',
  [ShowcaseStrings.Nav_Blog_Description]: 'BrightChainブログと更新情報',
  [ShowcaseStrings.Nav_FAQ_Description]: 'よくある質問',
  [ShowcaseStrings.Nav_Docs_Description]: 'プロジェクトドキュメント',
  [ShowcaseStrings.Nav_ToggleMenu]: 'メニュー切替',
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'BrightDBのロゴ',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'トップシークレット dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChatのロゴ',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHubのロゴ',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightIDのロゴ',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMailのロゴ',
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'BrightVoteのロゴ',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPassのロゴ',
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: 'カナリアプロトコルのロゴ',
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: 'デジタルバーンバッグのロゴ',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: '言語',
  [ShowcaseStrings.Lang_EN_US]: '英語（米国）',
  [ShowcaseStrings.Lang_EN_GB]: '英語（英国）',
  [ShowcaseStrings.Lang_ES]: 'スペイン語',
  [ShowcaseStrings.Lang_FR]: 'フランス語',
  [ShowcaseStrings.Lang_DE]: 'ドイツ語',
  [ShowcaseStrings.Lang_ZH_CN]: '中国語',
  [ShowcaseStrings.Lang_JA]: '日本語',
  [ShowcaseStrings.Lang_UK]: 'ウクライナ語',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'FAQモード',
  [ShowcaseStrings.FAQ_Gild_Character]: 'ギルドキャラクター',
  [ShowcaseStrings.FAQ_Phix_Character]: 'フィックスキャラクター',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: '{MODE}FAQに切り替え',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain よくある質問',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'BrightChainユニバース',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'オーナーフリーファイルシステムの進化的後継者',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'マスコット、ミッション、エコシステムを紹介',
  [ShowcaseStrings.FAQ_Toggle_Technical]: '技術',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'エコシステム',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gildが詳細を守る',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phixがビジョンを明かす',
  [ShowcaseStrings.FAQ_BackToHome]: '← ホームに戻る',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. BrightChainとは何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    'BrightChainは、分散型の高性能「オーナーフリー」データインフラストラクチャです。Owner-Free File System（OFFSystem）のアーキテクチャ的後継者であり、Apple SiliconやNVMeストレージを含む2026年のハードウェア環境向けに近代化されています。',

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    '2. BrightChainはオリジナルのOFFSystemとどう違いますか？',
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChainは前身の「オーナーフリー」哲学を尊重しながら、重要な近代化を導入しています：',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: 'オプトイン冗長性',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    'ユーザーはReed-Solomonエンコーディングを使用して、より高い耐久性でブロックを保存するよう要求できます。',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]: 'リカバリ性能',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    '@digitaldefiance/node-rs-accelerateを使用して、システムはGPU/NPUハードウェアを活用し、30+ GB/sの速度でReed-Solomonリカバリ操作を実行します。',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'スケーラビリティ',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    'Super CBL（構成ブロックリスト）を通じて、システムは再帰的インデックスを使用し、O(log N)の取得効率で事実上無制限のファイルサイズをサポートします。',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'アイデンティティ',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    'BIP39/32の統合により、安全なニーモニックベースのアイデンティティと階層的決定論的鍵管理が可能になります。',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: 'オプトイン暗号化',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    'ユーザーはオプションでデータの上にECIES暗号化を重ねることができ、Ethereumキースペース/アイデンティティHDKeyシステムを利用します。',

  [ShowcaseStrings.FAQ_Tech_Q3_Title]:
    '3. データはどのように「オーナーフリー」ですか？',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    'BrightChainは多層暗号化アプローチを使用して、単一のノードが法的または実際的な意味でファイルを「ホスト」しないことを保証します：',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'XORベースライン',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    'すべてのブロックは単純なXOR操作で処理され、静止データをランダムノイズと区別できなくします。',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'レシピ',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    'ファイルを再構築するには、ユーザーはレシピ——ブロック順序の特定の空間マップが必要です。',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: 'オプトイン暗号化',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    'ユーザーはオプションでデータの上にECIES暗号化を重ねることができます。レシピなしでは、データは無秩序のままであり、オプトインした場合は暗号的にロックされます。',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    '4. 「タプルトレードオフ」とは何で、何を提供しますか？',
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    '「タプルトレードオフ」は、「オーナーフリー」シャーディングのオーバーヘッドと、それがネットワークに提供する比類のない法的・経済的利益との間の意図的なバランスです。',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    '法的優位性：もっともらしい否認',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    'XORミキシングによってデータをほぼランダムなタプル（ブロック）にシャーディングすることで、ストレージを提供するユーザーは数学的にノイズと区別できないデータをホストしています。',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    '結果：単一のノードが「レシピ」なしで一貫したファイルを再構築できないため、特定のノードオペレーターが特定のコンテンツを「ホスト」または「配布」していると主張することは技術的にも法的にも不可能です。これは参加者に究極のもっともらしい否認の層を提供します。',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    '経済的優位性：効率性 vs. Proof-of-Work',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    '「オーナーフリー」シャーディングは軽微なストレージオーバーヘッドを導入しますが、従来のProof-of-Work（PoW）やProof-of-Stake（PoS）ネットワークの膨大なエネルギーとハードウェアコストと比較すると無視できるものです。',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    '結果：BrightChainは無駄なハッシング競争に「ジュール」を燃やすことなく、高性能なデータ整合性を実現します。これによりネットワークは高い競争力を持ち、レガシーブロックチェーンのコストの一部で低レイテンシ性能を提供します。',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: 'トレードオフの要約：',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    'ユーザーはデータ「シャード」のわずかな増加を受け入れる代わりに、ゼロ責任のホスティング環境と超低コストインフラストラクチャを得ます。これにより、BrightChainは高度に規制された環境やリソースが制約された環境での分散型ストレージに最も実行可能なプラットフォームとなります。',

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    '5. BrightChainは従来のブロックチェーンとどう違いますか？',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    '技術的には、BrightChainは単一のモノリシックなブロックチェーンではなく、分散型ブロックストアです。従来のブロックチェーンが台帳であるのに対し、BrightChainは複数のハイブリッドMerkleツリー台帳を同時にホストしサポートするための基盤インフラストラクチャを提供します。ファイルを再構築するための構造的方法としてブロックチェーニングを使用しますが、システムは統一された「オーナーフリー」ストレージ層の上で多くの異なるブロックチェーンやdAppを動かすことができる高性能な基盤として設計されています。',

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. BrightChainにおけるReed-Solomon（RS）の役割は何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    'XORがデータのプライバシーと「オーナーフリー」ステータスを処理する一方、Reed-Solomon消失訂正符号は回復可能性のためのオプトイン層です。',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: '冗長性',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    'RSにより、複数のホスティングノードがオフラインになってもファイルを再構築できます。',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'トレードオフ',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    'RSは単純なXORと比較して計算オーバーヘッドとストレージ要件を追加します。ユーザーはデータの重要性と利用可能な「ジュール」に基づいて冗長性レベルを選択する必要があります。',

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. 「ジュール」とは何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    'ジュールはBrightChainエコシステム内の作業とリソース消費の計算単位です。',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'コスト基準',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    'すべてのアクション——データの保存、XORミキシングの実行、Reed-Solomonシャードのエンコード——にはジュールでの予測コストがあります。',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]: 'リソース管理',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    'ユーザーは高冗長性ストレージのジュールコストとデータの価値を比較検討する必要があります。',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. ジュールはどのように取得しますか？',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    'ジュールはWork-for-Workモデルを通じて獲得されます。ユーザーはネットワークにリソースを提供することでジュールを取得します：',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'ストレージ',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    '他のピアのために暗号化されたブロックをホストする。',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: '計算',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    '集団のためにエンコードまたはリカバリタスクを実行するCPU/GPU/NPUサイクルを提供する。',
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    'これにより、ネットワークは貢献が容量に等しい自立的なエネルギー経済として維持されます。',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]: '9. 匿名性はどのように維持されますか？',
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    'BrightChainは仲介匿名性を採用しています。',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'オンチェーン',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    'すべてのアクションは一般ネットワークに対して匿名です。',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: 'クォーラム',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    'アイデンティティはガバナンスクォーラムに暗号的に結びつけられています。これにより、ユーザーのデータとアクションはプライベートでありながら、コミュニティはShamirの秘密分散と準同型投票を通じて「ソーシャルレイヤー」の説明責任を維持します。',

  [ShowcaseStrings.FAQ_Tech_Q10_Title]:
    '10. BrightDBとは何で、どのように機能しますか？',
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    'BrightDBはBrightChainブロックストアの上に直接構築された高レベルのドキュメントストア層です。中央データベースサーバーなしで複雑なデータオブジェクトを保存、クエリ、管理する構造化された方法を提供します。',
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: '仕組み',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    'ドキュメント指向ストレージ',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    'NoSQLデータベースと同様に、BrightDBはデータを「ドキュメント」として保存し、暗号化されたブロックにシャーディングしてネットワーク全体に分散します。',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    '不変バージョニング',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    'ドキュメントへのすべての変更は、暗号的に検証可能な履歴を持つ新しいエントリとして記録されます。',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    '分散インデックス',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    '分散インデックスシステムにより、ノードは中央の「マスター」ノードなしでDHTを通じて特定のドキュメントを見つけて再構築できます。',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    'クォーラムベースのアクセス',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    '特定のデータベースやコレクションへのアクセスはクォーラムによって管理でき、承認された署名者からの暗号的承認が必要です。',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'なぜ重要か',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    'ほとんどのdAppは「重い」データを中央集権サーバーに保存するため苦戦しています。BrightDBはデータを分散型、オーナーフリー、高性能に保ちます——従来のWebアプリと同じくらい高速でありながら、ブロックチェーンと同じくらい安全な、真にサーバーレスなアプリケーションを可能にします。',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    '11. BrightChainと共にローンチしたdAppは何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChainは、中央集権的なデータ収集サービスを安全で主権的な代替手段に置き換えるために設計されたコア「Bright-Apps」スイートと共にローンチしました。',
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'BrightChartロゴ',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]: '患者所有の医療記録',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    '患者が鍵を保持する電子カルテ。BrightChartはFHIR R4準拠の医療データをBrightChain上の暗号化ブロックとして保存し、侵害される中央データベースはありません。患者はBrightTrust委任を通じてプロバイダーに細粒度のアクセスを付与し、すべてのアクセスイベントは不変の監査証跡に記録されます。単一のコードベースから医療、歯科、獣医の診療をサポートします。',
  [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: 'BrightCalロゴ',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]: '共有および個人カレンダー管理',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
    'オーナーが鍵を保持するカレンダーシステム。BrightCalは細粒度のアクセス制御を伴う安全な暗号化スケジューリングを実現します。イベントは暗号化ブロックとして保存されます。すべてのカレンダーデータは不変で復元可能であり、繰り返しイベント、リマインダー、および伝統的なカレンダーシステムとの連携をサポートします。',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: '主権的コミュニケーション',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    '従来のSMTPと分散型ストレージを橋渡しする完全RFC準拠のメールシステム。標準的なメールプロバイダーとは異なり、BrightMailはすべてのメッセージを「オーナーフリー」ブロックストアにシャーディングし、エンドツーエンド暗号化された「ダークモード」メッセージングをサポートします。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
    'ソーシャルネットワークと主権グラフ',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'コンセプト',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    '中央監視やアルゴリズム操作なしに、レガシー「フィード」の流動性を反映する分散型、検閲耐性のソーシャルネットワーキングプラットフォーム。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: '違い',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    'すべての投稿、「いいね」、関係はBrightDB内の不変のシャーディングされたドキュメントとして保存されます。ジュール経済を活用するため、広告はありません——ユーザーは計算やストレージの微小な部分を提供して、自分の声を「ブースト」したり、コミュニティの歴史を維持したりします。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]: 'クォーラムの力',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    'モデレーションは企業の「セーフティチーム」によって処理されません。代わりに、コミュニティはガバナンスクォーラムによって統治されます。ルールは暗号的に施行され、コミュニティ基準は準同型投票を通じて投票され、グループのデジタルスペースが真に「オーナーフリー」で自己決定的であることを保証します。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: 'ゼロ知識ボールト',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    'ボールトが分散暗号化ブロックとして存在するパスワードとアイデンティティ管理システム。アクセスはBIP39ニーモニックによって管理され、すべての資格情報の変更はBrightDBを通じてバージョン管理され検証可能です。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'レジリエントコミュニティ',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    '永続的なチャンネル、音声、メディア共有を備えたリアルタイムコミュニケーションプラットフォーム。コミュニティガバナンスはクォーラムを通じて管理され、GPU加速リカバリによりチャット履歴が失われることはありません。',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    'デジタルバーンバッグ / カナリアプロトコル',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    '高リスクデータ向けに設計された、専門的なファイル共有・暗号化プラットフォームです。「スマートボールト」を活用し、「レシピ」（マップとキー）を永久に破壊するか、検証可能な条件下で特定の関係者に公開するようプログラムできます。条件には「デッドマンスイッチ」、時限公開、クォーラム合意などがあります。内部告発者、法律専門家、そしてデータの確実な有効期限を必要とするすべての人にとって究極のツールです。',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    '12. Paillier暗号とは何で、どのようにプライベート投票を可能にしますか？',
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    'Paillierは加法準同型と呼ばれる特別な性質を持つ公開鍵暗号方式です——暗号化された値を復号することなく加算できます。候補者Aに「1」を暗号化し、別の人も候補者Aに「1」を暗号化した場合、それらの暗号文を掛け合わせると、復号時の結果は「2」になります。個々の投票用紙を見る人はいません。BrightChainの投票システムでは、各投票はPaillier公開鍵で暗号化され、暗号化された投票用紙は候補者ごとに単一の暗号文に準同型的に集約され、最終集計のみが復号されます——個々の投票は決して復号されません。セキュリティを強化するため、Paillier秘密鍵は閾値暗号を使用して複数の守護者に分割でき、単一の当事者だけでは集計を復号できません。このアプローチは、多数決、承認、スコア投票などの一般的な投票方法にネイティブに機能します。淘汰ラウンドを必要とする方法（順位選択など）はラウンド間の中間復号が必要であり、一部の方法（二次投票など）は準同型的にまったく実行できません。',

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. Paillierブリッジは何をしますか？',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    'Paillierブリッジは、既存のECDH（楕円曲線Diffie-Hellman）鍵ペアからPaillier準同型暗号鍵を直接導出できる決定論的鍵導出構造です。アイデンティティ/認証用（ECC）と準同型投票暗号化用（Paillier）の2つの別々の鍵ペアを管理する代わりに、ブリッジはECDH共有秘密をHKDFとHMAC-DRBGを通じて処理し、3072ビットPaillier鍵に必要な大きな素数を決定論的に生成します。これは、投票鍵を含むすべての暗号アイデンティティが単一の32バイトECC秘密鍵から回復できることを意味します。ブリッジは一方向（Paillier鍵からEC鍵に戻すことはできません）、完全に決定論的（同じ入力は常に同じ出力を生成）であり、NIST推奨に準拠した128ビットセキュリティを達成します。',
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    '詳細については、このトピックに関する論文をご覧ください。',

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    '14. BrightChainはIPFSのような別の分散型ストレージ（dWS）ではないのですか？',
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    'いいえ。IPFSはコンテンツの発見と永続性のために設計された「公共図書館」です。BrightChainは「主権ボールト」です。IPFSがCIDを介したデータの検索に焦点を当てているのに対し、BrightChainはオーナーフリーステータスと高速リカバリに焦点を当てています。BrightChainでは、データは非常に徹底的にシャーディングされるため、単一のノードが何をホストしているかを「所有」したり「知っている」ことさえありません。',

  [ShowcaseStrings.FAQ_Tech_Q15_Title]:
    '15. IPFSとの「パフォーマンス」の違いは何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    'IPFSは「ベストエフォート」であり、しばしば高レイテンシです。BrightChainはApple Silicon（M4 Max）時代向けに構築されています。@digitaldefiance/node-rs-accelerateを使用することで、30+ GB/sのリカバリ速度を達成しています。単にファイルを「フェッチ」するのではなく、ハードウェアアクセラレーテッドReed-Solomonを使用してシャードからバス速度でデータを再実体化します。',

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    '16. BrightChain vs IPFSのプライバシーについてはどうですか？',
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    'IPFSはデフォルトで透明です；ハッシュがあればファイルを見ることができます。BrightChainはXORベースラインを使用します。データはネットワークに触れる前に機能的に「シュレッダー」されます（Digital Burnbagロゴのように）。プライバシーは「プラグイン」ではありません——それはデータの機械的状態です。',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. BrightChainとIPFSの経済はどのように比較されますか？',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFSはインセンティブのためにFilecoin（重い外部ブロックチェーン）に依存しています。BrightChainはジュールを使用します。これは実際の作業（CPU/NPUサイクル）とリソース消費を測定する「熱」の計算単位です。組み込みで、低オーバーヘッドで、ネットワークの「エネルギー」に直接結びついています。',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 BrightChainとは本当は何ですか？',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChainは、あなたのデータがあなたのものである世界のためのインフラストラクチャです——プラットフォームのものでも、企業のものでも、たまたまサーバーを運営している人のものでもありません。すべてのファイルがシャーディングされ、混合され、ネットワーク全体に散らばる分散型ストレージ層であり、単一のノードがあなたのデータを意味のある形で「ホスト」することはありません。結果は、プライバシーがオンにする機能ではないシステムです——それはアーキテクチャのデフォルト状態です。データがBrightChainに入ると誰もピースを所有しないため、「オーナーフリー」と呼んでいます。それらを再び組み立てるレシピを持っているのはあなただけです。',

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]:
    'Digital Burnbagとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    '情報機関では、「焼却袋」は破棄対象の機密文書用の容器です——投入すると、検証可能な管理の連鎖で焼却されます。Digital Burnbagはそのコンセプトをデータに持ち込みます。BrightChainでデータの名前変更、移動、または破棄を行うと、システムは「フェニックスサイクル」を実行します：データを新しい状態にコピーし、古い状態を暗号的に焼却します。単純に削除されるものはありません——再生されます。古い状態は証明可能に消え、新しい状態は証明可能に無傷です。これはBrightChainのプロダクト層であり、マスコットのGildとPhixが住み、働く場所です。',

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]:
    'カナリアプロトコルとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    '名前は炭鉱のカナリア——何かがおかしいときに鳴く早期警告システムに由来します。カナリアプロトコルはあなたのフィード、API——あなたが生きているか、物事が計画通りに進んでいるかの心拍を示すあらゆるものを監視します。計画通りにいかなくなった瞬間、あなたのカナリアが死に（ごめんね、Gild！）、ファイルやフォルダは検証可能に破壊されます。逆方向にも機能します：脅迫コードでログインしたり、事前に指定されたプロバイダーを通じてルールを設定すれば、それらの条件でもデータを破壊できます。すべてはルールと条件次第です。計画通りにいかなければ、Gildがやられます。ネットワークの整合性も監視するかもしれませんが、その核心的な目的は条件付き破壊です：ルールがそう言えば、データは燃えます。マスコットのGildはこのプロトコルの生きた体現です：強迫的な警戒であなたのデータを見守る金色のカナリア。既存のBurnbag/カナリアプロトコルのロゴ——炎の尾を持つ金色のカナリア——は一つのマークに両方のマスコットを表しています。Gildは金色の体；Phixは炎です。',

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'キャストに会う',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Volta——スパーク',
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: 'ハイボルテージアーキテクト',
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    'バッテリーの発明者アレッサンドロ・ボルタにちなんで名付けられたVoltaは、生きたスパークです——純粋でパチパチと音を立てる電気でできた、ギザギザのネオンブルーの幾何学的キツネ。彼女はプロバイダー：システム全体にジュールを生成し押し出し、すべての操作をフルパワーで動かすことに熱心です。多動で、エネルギーに寛大で、少し無謀なVoltaは、節約は退屈だと思っています。「20テラジュール欲しい？完了。他には？」UIでは、ジュールメーターの近くでパチパチと音を立て、重い操作中は白熱して振動し、実行への欲求を示します。彼女は純粋で混沌としたポテンシャル——行動への欲求を表しています。',
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    'Voltaマスコット — 電気でできたネオンブルーの幾何学的キツネ',

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ohm——アンカー',
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: '抵抗のストイックな僧侶',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    '電気抵抗を定義したゲオルク・オームにちなんで名付けられたOhmは、Voltaのアクセルに対するブレーキです。甲羅に光るオメガシンボルが統合された、重い石のようなナマケモノカメで、ゆっくりと慎重に動きます。彼のマントラ：「Ohm mani padme ohm。」Voltaがカフェイン入りのキツネのように飛び回る間、Ohmは深く根を張った蓮華座に座り、完璧な60Hzのハム音で振動し、システム全体を中心に据えます。冷静で懐疑的で、ドライなウィットを武器にしています——実際にレシートを読む会計士。支出に反対ではなく、浪費に反対なだけです。エネルギーレベルがレッドラインに達すると、「抵抗瞑想」を行い、重い石の足をプログレスバーに置き、電流をブルーから落ち着いた深いアンバーに変えます。彼は根を張った知恵——正しく行動する規律を表しています。',
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    'Ohmマスコット — 重い石のようなナマケモノカメ、オメガシンボルが光る',

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Gild——証人',
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: '金色のカナリアガーディアン',
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    '自分の pristine な黄色い毛並みに執着する虚栄心の強い金色のカナリア。Gildはガーディアン——あなたのデータを見守り、警告を発し、物事を安全に保ちます。Duolingoのフクロウのエネルギーを想像してください：励まし、時々罪悪感を感じさせるが、根本的にあなたの味方。問題は？Gildは炭鉱に住んでいます。すべてのファイル操作がススを巻き上げ、彼は常に汚れます。50ファイルをアップロード？灰に覆われ、必死に羽を整え、羽毛についてブツブツ言っています。彼のスス レベルはシステムアクティビティの受動的なインジケーターです——アイドルシステムは pristine で得意げに毛づくろいするGild；ヘビーユースは汚れて怒っているカナリアを意味します。彼は几帳面で、ドラマチックで、長く苦しんでいます。「たった今毛づくろいしたのに！ドキュメントのスペルもできないから煙突掃除人になった。」彼はBurnbag/カナリアプロトコルロゴの金色の体——火のないロゴです。',
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]:
    'Gildマスコット — 金色のカナリアガーディアン',

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Phix——再生',
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: '破壊者-創造者',
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    '「Phix」=「fix」+「phoenix」。Gildの邪悪な双子。同じ鳥のシルエットですが、羽は残り火のような赤で光り、目は熱い石炭のように細くなり、これを楽しみすぎるかのようにニヤリと笑います。Phixはエンフォーサー——ジュールを消費して古いデータ状態を焼却し、新しいものと共に蘇ります。Gildが火に悩まされるところ、Phixは火そのものです。名前変更操作やカナリアトリガーのカスケード——データが死んで再生するあらゆる場面に登場します。しかしPhixは単純な破壊そのものでもあります。何かを燃やしたいときにマッチを持って立っている放火魔で、喜んで手を貸します。ファイルを削除？Phixはニヤニヤ。フォルダを消去？もう火がついています。破壊に歓喜する一方で、創造にも誇りを感じています——灰の中から新しいものと共に蘇ることこそ彼の本質です。陽気で混沌とした、自分の仕事を少し愛しすぎている消防署の放火犯。ユーザーが名前変更をトリガーすると、Gildは脇に退き、Phixが現れます——ニヤリと笑い、光り、燃やす準備ができています。彼はBurnbag/カナリアプロトコルロゴの炎——金のないロゴです。',
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    'Phixマスコット — 残り火のような赤いフェニックス、Gildの炎の双子',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: '経済',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ ジュールとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'ジュールはBrightChainのエネルギー単位です——投機的な暗号通貨ではなく、実際の作業と貢献の尺度です。視覚的には、ゲームのコインのように流れ、蓄積し、消耗する小さなネオンブルーの稲妻トークンです。Voltaがそれらを生成し、Ohmがゲートを通じてフローを調整し、操作がそれらを消費します。BrightChainのすべてのアクションにはジュールコストがあります——ほぼゼロのメタデータ名前変更から百万ジュールのフルサイクル再暗号化まで。ユーザーはWork-for-Workモデルを通じてジュールを獲得します：ネットワークにストレージまたは計算を提供すれば、それを使用する能力を獲得します。UIのジュールメーターはエネルギー予算を表示し、小さなスパークがVoltaからOhmのゲートを通じて操作に流れるのが見えます。',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 ススとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'ススはすべての操作の目に見える結果——デジタルアクションの「カーボンフットプリント」です。使う通貨ではありません；避けられないコストです。Phixがデータを燃やすたびに、ススを生成します——Gildの金色の羽に蓄積する暗い粒子と煙の雲。やればやるほど、Gildは汚れます。軽い使用はあちこちに汚れを残します；ヘビーユースは彼を真っ黒にして憤慨させます。ススはBrightChainエコシステムにおけるカルマを表しています：すべてのアクションは痕跡を残し、誰かがそれを背負わなければなりません。Ohmの言葉で：「Voltaがエネルギーを与え、Phixがそれを熱に変え、Gildが結果を背負う。私はただ必要以上に無駄にしないようにするだけだ。」',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: '全体像',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    '🌐 すべてはどのように組み合わさりますか？',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'エコシステムは二層システムです。プラットフォームレベルでは、BrightChainはVolta（消費者）とOhm（節約者）の間の緊張で動き、ジュールがエネルギー通貨として両者の間を流れます。プロダクトレベルでは、Digital BurnbagはPhix（破壊者-創造者）とGild（ガーディアン）の間の緊張で動き、ススが避けられない結果です。バーンバッグ操作が発動すると、4つのキャラクターすべてが相互作用します：Voltaがジュールに手を伸ばし、Ohmがコストを評価して渋々通し、Phixがエネルギーを捕らえて噴火し、Gildが結果のススを浴びます。カナリアプロトコルはすべてを貫く整合性の糸です——すべての変換が正当であることを保証するGildの警戒の目。Burnbag/カナリアプロトコルのロゴは起源の物語を語ります：GildとPhixは同じ鳥です。一方は体、もう一方は炎。ロゴはそれらが重なる瞬間です——すでに燃えているカナリア、まだ完全に現れていないフェニックス。',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]:
    '🧘 BrightChainは何を信じていますか？',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'エネルギーは保存されます。行動には結果があります。データには重さがあります。BrightChainエコシステムのすべてのキャラクターはより深い原則にマッピングされます：Voltaはスパーク——純粋で混沌としたポテンシャルと行動への欲求。Ohmはアンカー——根を張った知恵と正しく行動する規律。ジュールはフロー——両者の間を移動するスピリット。Phixは再生——道の終わりの変革の炎。Gildは証人——私たちの執着（とタイプミス）の世俗的なススに苦しむ者。ススはカルマ——避けられない目に見えるコスト。一緒に閉じたループを形成します：Voltaがエネルギーを提供し、Ohmがそれが賢く使われることを保証し、Phixが状態を変換し、Gildが重さを背負います。無料のものはありません。無駄にされるものはありません。すべてが痕跡を残します。',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 マスコットはどこで見られますか？',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    'マスコットはプロダクト体験全体に織り込まれています。Gildはファイルの閲覧、アップロード、共有中に登場し——ススレベルがどれだけのアクティビティが発生しているかを受動的に反映します。名前変更や破壊操作をトリガーすると、Gildは脇に退き、Phixが[ Phix ]ボタンと共に現れます：かすかなアンバーの輝きで暗くくすぶり、ホバーで点火し、クリックで発火し、灰の粒子がソースからデスティネーションに流れる炉スタイルのプログレスバーを表示します。VoltaとOhmはプラットフォーム全体のジュールメーターに住んでおり、Voltaがエネルギーゲージの近くでパチパチと音を立て、Ohmが高コストの操作中に介入して抵抗瞑想を行います——プログレスバーをネオンブルーから落ち着いたアンバーに変えます。ススはセッション中にGildの羽に目に見えて蓄積します。近日公開：エラーページ、ローディング画面、操作の重大度に応じたスケールの確認ダイアログでのマスコット登場、そしてはい——グッズも。',

  // Hero Section
  [ShowcaseStrings.Hero_Badge]: '🌟 分散型アプリプラットフォーム',
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChainは「Bright Block Soup」コンセプトを用いてデータストレージに革命を起こします。ファイルはブロックに分割され、XOR演算によりランダムデータと混合されることで、完全なセキュリティを維持しながら完全にランダムに見えるようになります。',
  [ShowcaseStrings.Hero_Description_NotCrypto]: '暗号通貨ではありません。',
  [ShowcaseStrings.Hero_Description_P2]:
    'コインなし、マイニングなし、Proof of Workなし。BrightChainはストレージと計算の実際の貢献を重視し、市場の投機ではなく現実のエネルギーコストに連動した単位であるジュールで追跡します。',
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 オーナーフリーストレージ • ⚡ エネルギー効率 • 🌐 分散型 • 🎭 匿名かつ説明責任あり • 🗳️ 準同型投票 • 💾 電力よりストレージ',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 インタラクティブデモ',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 BrightChain Soupデモ',
  [ShowcaseStrings.Hero_CTA_GitHub]: 'GitHubで見る',
  [ShowcaseStrings.Hero_CTA_Blog]: 'ブログ',

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: '革新的な',
  [ShowcaseStrings.Comp_Title_Features]: '機能',
  [ShowcaseStrings.Comp_Title_Capabilities]: 'と性能',
  [ShowcaseStrings.Comp_Subtitle]:
    '分散型アプリプラットフォーム — 先進的な暗号技術、分散型ストレージ、民主的ガバナンス',
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChainは「Bright Block Soup」コンセプトを用いてデータストレージに革命を起こします — 先進的な暗号技術、分散型ストレージ、民主的ガバナンスを組み合わせています。',
  [ShowcaseStrings.Comp_Intro_P1]:
    'ファイルはブロックに分割され、XOR演算によりランダムデータと混合されることで、完全なセキュリティを維持しながら完全にランダムに見えるようになります。準同型投票から仲介匿名性、分散ファイルストレージからクォーラムベースのガバナンスまで、BrightChainは次世代の分散型アプリケーションに必要なすべてを提供します。',
  [ShowcaseStrings.Comp_Problem_Title]: '❌ 従来のブロックチェーンの問題点',
  [ShowcaseStrings.Comp_Problem_1]:
    'Proof of Workマイニングによる膨大なエネルギー浪費',
  [ShowcaseStrings.Comp_Problem_2]:
    '数十億台のデバイスで無駄になっているストレージ容量',
  [ShowcaseStrings.Comp_Problem_3]:
    'プライバシーを保護する投票メカニズムがない',
  [ShowcaseStrings.Comp_Problem_4]: '説明責任のない匿名性は悪用につながる',
  [ShowcaseStrings.Comp_Problem_5]:
    '高コストなオンチェーンストレージがアプリケーションを制限',
  [ShowcaseStrings.Comp_Problem_6]:
    'ノードオペレーターが保存コンテンツに対する法的責任を負う',
  [ShowcaseStrings.Comp_Problem_Result]:
    '環境破壊的で、法的リスクが高く、機能的に限定されたブロックチェーン技術。',
  [ShowcaseStrings.Comp_Solution_Title]: '✅ BrightChainのソリューション',
  [ShowcaseStrings.Comp_Solution_P1]:
    'BrightChainはProof of Workをコンセンサスではなくスロットリングにのみ使用することでマイニングの無駄を排除します。オーナーフリーファイルシステムはXORでランダム化されたブロックのみを保存することで法的免責を提供します。準同型投票はプライバシーを保護した選挙を可能にし、仲介匿名性はプライバシーと説明責任のバランスを取ります。',
  [ShowcaseStrings.Comp_Solution_P2]:
    'Ethereumのキースペース上に構築されながらもProof of Workの制約なしに設計されたBrightChainは、個人デバイスの未使用ストレージを収益化し、持続可能なP2Pネットワークを構築します。クォーラムシステムは数学的なセキュリティ保証を備えた民主的ガバナンスを提供します。',
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 オーナーフリーストレージ',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    '暗号学的ランダム性がストレージの法的責任を排除 — 単一のブロックに識別可能なコンテンツは含まれません',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ エネルギー効率',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    '無駄なProof of Workマイニングなし — すべての計算が有用な目的に使われます',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 分散型',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    'ネットワーク全体に分散 — 個人デバイスの未使用スペースを活用するIPFS風P2Pストレージ',
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 匿名かつ説明責任あり',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    'モデレーション機能を備えたプライバシー — クォーラムコンセンサスによる仲介匿名性',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ 準同型投票',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    '個々の投票を明かすことなく集計できるプライバシー保護型選挙',
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 クォーラムガバナンス',
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    '設定可能な閾値と数学的セキュリティを備えた民主的意思決定',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 BrightStackで構築',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node — MongoDBをBrightDBに置き換えるだけ',
  [ShowcaseStrings.Comp_ProjectPage]: 'プロジェクトページ',

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: 'インタラクティブ',
  [ShowcaseStrings.Demo_Title_Demo]: 'デモ',
  [ShowcaseStrings.Demo_Subtitle]: 'ECIES暗号化機能の可視化',
  [ShowcaseStrings.Demo_Disclaimer]:
    '注意：このデモは@digitaldefiance/ecies-lib（ブラウザライブラリ）を使用しています。@digitaldefiance/node-ecies-libはNode.jsサーバーアプリケーション向けに同一のAPIで同じ機能を提供します。両ライブラリはバイナリ互換であり、一方で暗号化したデータをもう一方で復号できます。',
  [ShowcaseStrings.Demo_Alice_Title]: 'Alice（送信者）',
  [ShowcaseStrings.Demo_Alice_PublicKey]: '公開鍵：',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: '暗号化するメッセージ：',
  [ShowcaseStrings.Demo_Alice_Placeholder]: '秘密のメッセージを入力...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: '暗号化中...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Bobに暗号化して送信',
  [ShowcaseStrings.Demo_Bob_Title]: 'Bob（受信者）',
  [ShowcaseStrings.Demo_Bob_PublicKey]: '公開鍵：',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: '暗号化ペイロード：',
  [ShowcaseStrings.Demo_Bob_Decrypting]: '復号中...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'メッセージを復号',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: '復号されたメッセージ：',
  [ShowcaseStrings.Demo_Error]: 'エラー：',

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: '構築技術',
  [ShowcaseStrings.About_Title_By]: 'Digital Defiance 制作',
  [ShowcaseStrings.About_Subtitle]:
    '分散型インフラストラクチャにおけるオープンソースイノベーション',
  [ShowcaseStrings.About_Vision_Title]: '私たちのビジョン',
  [ShowcaseStrings.About_Vision_P1]:
    'Digital Defianceでは、プライバシーを尊重し、持続可能性を促進し、民主的参加を可能にする真に分散型のインフラストラクチャで個人と組織を支援することを信じています。',
  [ShowcaseStrings.About_Vision_P2]:
    'BrightChainは「Bright Block Soup」コンセプトを用いてデータストレージに革命を起こします。ファイルはブロックに分割され、XOR演算によりランダムデータと混合されることで、完全なセキュリティを維持しながら完全にランダムに見えるようになります。マイニングの無駄を排除し、未使用ストレージを収益化し、準同型投票や仲介匿名性などの機能を実装することで、すべての人のために機能するプラットフォームを構築しました。',
  [ShowcaseStrings.About_Vision_NotCrypto]:
    '暗号通貨ではありません。「ブロックチェーン」と聞くと、おそらくBitcoinを思い浮かべるでしょう。BrightChainには通貨もProof of Workもマイニングもありません。コインを鋳造するためにエネルギーを燃やす代わりに、BrightChainはストレージと計算の実際の貢献を重視します。これらの貢献はジュールという単位で追跡され、市場の投機ではなく数式によって現実のエネルギーコストに連動しています。ジュールをマイニングしたり取引したりすることはできません。実際のリソースコストを反映しており、その数式は時間とともに改善されます。',
  [ShowcaseStrings.About_Vision_StorageDensity]:
    'ストレージ密度 vs. 電力密度の優位性：すべてのブロックチェーンにはどこかに無駄があります。BrightChainはあらゆる方法で無駄を削減しますが、ストレージメカニズムにおいて若干のオーバーヘッドがあります。しかし、ストレージは近年最もコスト効率が高く、大幅な密度向上を達成した分野の一つです。一方、データセンターはブロックチェーンやAIのCPU要件に必要な電力密度の確保に苦戦しています。匿名性と著作権訴訟などへの懸念からの解放、または不適切なコンテンツのホスティングに対する最小限のストレージオーバーヘッドというトレードオフにより、誰もが全力で参加し、世界中に広がる膨大なストレージリソースを最大限に活用できます。',
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStackは分散型アプリのためのフルスタックパラダイムです：BrightChain + Express + React + Node。MERNスタックを知っていれば、BrightStackも分かります — MongoDBをBrightDBに置き換えるだけです。',
  [ShowcaseStrings.About_BrightStack_P2]:
    'BrightDBはオーナーフリーファイルシステム上のMongoDB風ドキュメントデータベースで、完全なCRUD、クエリ、インデックス、トランザクション、集約パイプラインを備えています。MongoDBで使うのと同じパターン — コレクション、find、insert、update — ですが、すべてのドキュメントがプライバシー保護されたホワイトニングブロックとして保存されます。',
  [ShowcaseStrings.About_BrightStack_P3]:
    'BrightPass、BrightMail、BrightHubはすべてBrightStack上に構築されており、分散型アプリ開発が従来のフルスタック開発と同じくらい簡単であることを証明しています。',
  [ShowcaseStrings.About_OpenSource]:
    '100%オープンソース。BrightChainはMIT Licenseの下で完全にオープンソースです。BrightStack上で独自のdAppを構築し、分散型の未来に貢献しましょう。',
  [ShowcaseStrings.About_WorkInProgress]:
    'BrightChainは開発中です。現在、日々安定したビルドを維持することを目指していますが、見落としが発生する可能性があり、BrightChainはまだ成熟していません。ご不便やご迷惑をおかけして申し訳ございません。',
  [ShowcaseStrings.About_OtherImpl_Title]: 'その他の実装',
  [ShowcaseStrings.About_OtherImpl_P1]:
    'このTypeScript/Node.js実装がBrightChainの主要かつ最も成熟したバージョンですが、macOS/iOS UI付きのC++コアライブラリも並行して開発中です。このネイティブ実装はBrightChainのプライバシーとセキュリティ機能をAppleプラットフォームにもたらします。両リポジトリとも初期開発段階であり、本番環境での使用にはまだ対応していません。',
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'このTypeScript/Node.js実装が主要で最も成熟したバージョンですが、',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++コアライブラリ',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOSインターフェース',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    'が開発中です。このネイティブ実装はBrightChainのプライバシーとパフォーマンス機能をAppleデバイスに直接もたらします。',
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: 'オーナーフリーストレージ',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    '暗号学的ランダム性がストレージの法的責任を排除します。単一のブロックに識別可能なコンテンツは含まれず、ノードオペレーターに法的免責を提供します。',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: 'エネルギー効率',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    '無駄なProof of Workマイニングなし。すべての計算がストレージ、検証、ネットワーク運用という有用な目的に使われます。',
  [ShowcaseStrings.About_Feature_Anonymous_Title]: '匿名かつ説明責任あり',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    'モデレーション機能を備えたプライバシー。仲介匿名性がクォーラムコンセンサスを通じてプライバシーと説明責任のバランスを取ります。',
  [ShowcaseStrings.About_CTA_Title]: '革命に参加しよう',
  [ShowcaseStrings.About_CTA_Desc]:
    '分散型インフラストラクチャの未来を一緒に築きましょう。BrightChainに貢献し、問題を報告し、またはGitHubでスターを付けて持続可能なブロックチェーン技術への支持を示してください。',
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 インタラクティブデモ',
  [ShowcaseStrings.About_CTA_LearnMore]: '詳しく見る',
  [ShowcaseStrings.About_CTA_GitHub]: 'GitHubでBrightChainを見る',
  [ShowcaseStrings.About_CTA_Docs]: 'ドキュメントを読む',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance. 開発コミュニティへの ❤️ を込めて。',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]: '暗号投票システムを初期化中...',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 投票を復号中...',
  [ShowcaseStrings.Vote_LoadingDemo]: '投票デモを読み込み中...',
  [ShowcaseStrings.Vote_RunAnotherElection]: '別の選挙を実行',
  [ShowcaseStrings.Vote_StartElection]: '🎯 選挙を開始！',
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 {METHOD}デモ',
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    'この投票方式はライブラリに完全実装されています。',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 市民の投票（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    '投票状況（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ {CHOICE}に投票済み',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 結果',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT}票（{PERCENT}%）',
  [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT}件の承認（{PERCENT}%）',
  [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 監査ログを表示',
  [ShowcaseStrings.Vote_HideAuditLog]: '🔍 監査ログを非表示',
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 イベントログを表示',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 イベントログを非表示',
  [ShowcaseStrings.Vote_AuditLogTitle]: '🔒 不変監査ログ（要件1.1）',
  [ShowcaseStrings.Vote_AuditLogDesc]: '暗号署名付きハッシュチェーン監査証跡',
  [ShowcaseStrings.Vote_ChainIntegrity]: 'チェーン整合性：',
  [ShowcaseStrings.Vote_ChainValid]: '✅ 有効',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ 改ざんあり',
  [ShowcaseStrings.Vote_EventLogTitle]: '📊 イベントロガー（要件1.3）',
  [ShowcaseStrings.Vote_EventLogDesc]:
    'マイクロ秒タイムスタンプとシーケンス番号による包括的なイベント追跡',
  [ShowcaseStrings.Vote_SequenceIntegrity]: 'シーケンス整合性：',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ 有効',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ ギャップ検出',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: '合計イベント数：{COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: 'タイムスタンプ：',
  [ShowcaseStrings.Vote_VoterToken]: '投票者トークン：',

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ 政府レベルの投票システム',
  [ShowcaseStrings.Vote_TitleDesc]:
    '15種類の投票方式を備えた包括的な暗号投票ライブラリをご覧ください。各デモは準同型暗号による投票プライバシーを保証した実際のユースケースを示しています。',
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ 準同型暗号',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 検証可能な受領証',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ 役割分離',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900以上のテスト',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: '投票方式を選択',
  [ShowcaseStrings.VoteSel_SecureCategory]:
    '✅ 完全セキュア（単一ラウンド、プライバシー保護）',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    '⚠️ マルチラウンド（中間復号が必要）',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ 非セキュア（プライバシーなし — 特殊ケースのみ）',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: '多数決',
  [ShowcaseStrings.VoteMethod_Approval]: '承認投票',
  [ShowcaseStrings.VoteMethod_Weighted]: '加重投票',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'ボルダカウント',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: 'スコア投票',
  [ShowcaseStrings.VoteMethod_YesNo]: '賛成/反対',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: '賛成/反対/棄権',
  [ShowcaseStrings.VoteMethod_Supermajority]: '特別多数決',
  [ShowcaseStrings.VoteMethod_RankedChoice]: '順位選択（IRV）',
  [ShowcaseStrings.VoteMethod_TwoRound]: '二回投票制',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: '二次投票',
  [ShowcaseStrings.VoteMethod_Consensus]: 'コンセンサス',
  [ShowcaseStrings.VoteMethod_ConsentBased]: '同意ベース',

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]: 'リバーサイド市予算選挙へようこそ！',
  [ShowcaseStrings.Plur_IntroStory]:
    '市議会は大規模プロジェクトに5,000万ドルを割り当てましたが、どのプロジェクトに資金を投入するか決められません。そこであなたの出番です！',
  [ShowcaseStrings.Plur_IntroSituation]:
    '3つの提案が投票にかけられています。それぞれに熱心な支持者がいますが、勝てるのは1つだけです。',
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    'グリーンチームはすべての公共建築物にソーラーパネルの設置を望んでいます',
  [ShowcaseStrings.Plur_IntroTransit]:
    '交通推進派は新しい地下鉄路線の建設を推進しています',
  [ShowcaseStrings.Plur_IntroHousing]:
    '住宅連合は500世帯分の手頃な住宅を要求しています',
  [ShowcaseStrings.Plur_IntroChallenge]:
    '5人の市民の投票を行います。各投票は暗号化されます — 最終集計まで選挙管理者でさえ個々の投票用紙を見ることはできません。これが本来の民主主義のあるべき姿です！',
  [ShowcaseStrings.Plur_DemoTitle]: '🗳️ 多数決投票 — リバーサイド市予算',
  [ShowcaseStrings.Plur_DemoTagline]:
    '🏛️ 一人一票。最多得票が勝利。民主主義の実践！',
  [ShowcaseStrings.Plur_CandidatesTitle]: '市予算の優先事項',
  [ShowcaseStrings.Plur_VoterInstruction]:
    '提案をクリックして各市民の投票を行ってください。投票は暗号化されプライベートです！',
  [ShowcaseStrings.Plur_ClosePollsBtn]: '📦 投票を締め切り集計する！',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 市民の声が届きました！',
  [ShowcaseStrings.Plur_ResultsIntro]:
    'すべての投票を復号した結果、リバーサイド市の選択は：',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 集計プロセス',
  [ShowcaseStrings.Plur_TallyExplain]:
    '各暗号化投票は準同型的に加算され、合計を明らかにするために復号されました：',
  [ShowcaseStrings.Plur_Cand1_Name]: 'グリーンエネルギー構想',
  [ShowcaseStrings.Plur_Cand1_Desc]: '再生可能エネルギーインフラへの投資',
  [ShowcaseStrings.Plur_Cand2_Name]: '公共交通機関の拡張',
  [ShowcaseStrings.Plur_Cand2_Desc]: '新しい地下鉄路線とバス路線の建設',
  [ShowcaseStrings.Plur_Cand3_Name]: '手頃な住宅プログラム',
  [ShowcaseStrings.Plur_Cand3_Desc]: '低所得世帯向け住宅の補助',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: 'TechCorpの大きな決断！',
  [ShowcaseStrings.Appr_IntroStory]:
    '📢 緊急チームミーティング：「今後5年間の技術スタックを選ぶ必要がありますが、全員意見が違います！」',
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'CTOが素晴らしいアイデアを思いつきました：承認投票。一つの言語を巡って争う代わりに、全員が使いたい言語すべてに投票できます。',
  [ShowcaseStrings.Appr_IntroStakes]:
    '🤔 ポイント：好きなだけ多くても少なくても承認できます。TypeScriptもPythonも好き？両方に投票！Rustだけ信頼する？それがあなたの投票です！',
  [ShowcaseStrings.Appr_IntroWinner]:
    '🎯 勝者：最も多くの承認を得た言語がチームの主要言語になります。',
  [ShowcaseStrings.Appr_IntroChallenge]:
    '国連が事務総長を選出する方法です。票の分裂なし、戦略的駆け引きなし — 正直な好みだけ！',
  [ShowcaseStrings.Appr_StartBtn]: '🚀 投票しよう！',
  [ShowcaseStrings.Appr_DemoTitle]: '✅ 承認投票 - TechCorpスタック選定',
  [ShowcaseStrings.Appr_DemoTagline]:
    '👍 承認するすべての言語に投票。最多承認が勝利！',
  [ShowcaseStrings.Appr_CandidatesTitle]: 'チームが好むプログラミング言語',
  [ShowcaseStrings.Appr_Cand1_Desc]: '型安全なJavaScriptスーパーセット',
  [ShowcaseStrings.Appr_Cand2_Desc]: '汎用スクリプト言語',
  [ShowcaseStrings.Appr_Cand3_Desc]: 'メモリ安全なシステム言語',
  [ShowcaseStrings.Appr_Cand4_Desc]: '高速な並行処理言語',
  [ShowcaseStrings.Appr_Cand5_Desc]: 'エンタープライズプラットフォーム',
  [ShowcaseStrings.Appr_VotersTitle]: '投票する ({VOTED}/{TOTAL} 投票済み)',
  [ShowcaseStrings.Appr_SubmitBtn]: '送信 ({COUNT} 件選択)',
  [ShowcaseStrings.Appr_TallyBtn]: '投票を集計して結果を公開',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ 投票済み',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: 'オリンピック開催都市の選定！',
  [ShowcaseStrings.Borda_IntroStory]:
    '🌍 IOC委員会室：5カ国が次のオリンピック開催都市を選ばなければなりません。しかし全員に好みがあります！',
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 ボルダ方式はランキングに基づいてポイントを付与：1位 = 3ポイント、2位 = 2ポイント、3位 = 1ポイント。',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 これは対立的な選択よりも合意形成を重視します。最も多くの合計ポイントを獲得した都市が勝利！',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 投票開始！',
  [ShowcaseStrings.Borda_DemoTitle]: '🏆 ボルダ方式 - オリンピック開催地選定',
  [ShowcaseStrings.Borda_DemoTagline]:
    '📊 すべての都市をランク付け。ポイント = 合意！',
  [ShowcaseStrings.Borda_CandidatesTitle]: '候補都市',
  [ShowcaseStrings.Borda_Cand1_Desc]: '光の都',
  [ShowcaseStrings.Borda_Cand2_Desc]: '日出ずる国',
  [ShowcaseStrings.Borda_Cand3_Desc]: '天使の街',
  [ShowcaseStrings.Borda_VotersTitle]: 'IOC委員 ({VOTED}/{TOTAL} 投票済み)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ ランク付け済み！',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 ポイント集計！',
  [ShowcaseStrings.Borda_ResultsTitle]: '🎉 オリンピック開催都市発表！',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} ポイント',
  [ShowcaseStrings.Borda_NewVoteBtn]: '新しい投票',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 BrightChainメッセージパッシングデモ',
  [ShowcaseStrings.Msg_Subtitle]:
    'Soup内のCBLブロックとして保存されるメッセージを送信！',
  [ShowcaseStrings.Msg_Initializing]: '初期化中...',
  [ShowcaseStrings.Msg_SendTitle]: 'メッセージ送信',
  [ShowcaseStrings.Msg_FromLabel]: '送信者：',
  [ShowcaseStrings.Msg_ToLabel]: '宛先：',
  [ShowcaseStrings.Msg_Placeholder]: 'メッセージを入力...',
  [ShowcaseStrings.Msg_SendBtn]: '📤 メッセージを送信',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 メッセージ（{COUNT}件）',
  [ShowcaseStrings.Msg_NoMessages]:
    'まだメッセージがありません。最初のメッセージを送信しましょう！ ✨',
  [ShowcaseStrings.Msg_From]: '送信者：',
  [ShowcaseStrings.Msg_To]: '宛先：',
  [ShowcaseStrings.Msg_Message]: 'メッセージ：',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Soupから取得',
  [ShowcaseStrings.Msg_SendFailed]: 'メッセージの送信に失敗しました：',
  [ShowcaseStrings.Msg_RetrieveFailed]: 'メッセージの取得に失敗しました：',
  [ShowcaseStrings.Msg_ContentTemplate]: 'メッセージ内容：{CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ ブロックチェーン台帳',
  [ShowcaseStrings.Ledger_Subtitle]:
    '追記専用、暗号チェーン、デジタル署名付きの台帳で、役割ベースのガバナンスを備えています。エントリの追加、署名者の管理、チェーンの検証が可能です。',
  [ShowcaseStrings.Ledger_Initializing]: '署名者用のSECP256k1鍵ペアを生成中…',
  [ShowcaseStrings.Ledger_Entries]: 'エントリ',
  [ShowcaseStrings.Ledger_ActiveSigners]: 'アクティブな署名者',
  [ShowcaseStrings.Ledger_Admins]: '管理者',
  [ShowcaseStrings.Ledger_BrightTrust]: 'クォーラム',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 チェーンを検証',
  [ShowcaseStrings.Ledger_Reset]: '🔄 リセット',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 アクティブな署名者',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 エントリを追加',
  [ShowcaseStrings.Ledger_PayloadLabel]: 'ペイロード（テキスト）',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'データを入力…',
  [ShowcaseStrings.Ledger_AppendBtn]: 'チェーンに追加',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 承認済み署名者',
  [ShowcaseStrings.Ledger_Suspend]: '一時停止',
  [ShowcaseStrings.Ledger_Reactivate]: '再有効化',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ 管理者へ',
  [ShowcaseStrings.Ledger_ToWriter]: '→ ライターへ',
  [ShowcaseStrings.Ledger_Retire]: '退役',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: '新しい署名者名',
  [ShowcaseStrings.Ledger_AddSigner]: '+ 署名者を追加',
  [ShowcaseStrings.Ledger_EventLog]: '📋 イベントログ',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ チェーン',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 ジェネシス',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ ガバナンス',
  [ShowcaseStrings.Ledger_Data]: '📄 データ',
  [ShowcaseStrings.Ledger_EntryDetails]: 'エントリ #{SEQ} の詳細',
  [ShowcaseStrings.Ledger_Type]: 'タイプ',
  [ShowcaseStrings.Ledger_Sequence]: 'シーケンス',
  [ShowcaseStrings.Ledger_Timestamp]: 'タイムスタンプ',
  [ShowcaseStrings.Ledger_EntryHash]: 'エントリハッシュ',
  [ShowcaseStrings.Ledger_PreviousHash]: '前のハッシュ',
  [ShowcaseStrings.Ledger_NullGenesis]: 'null（ジェネシス）',
  [ShowcaseStrings.Ledger_Signer]: '署名者',
  [ShowcaseStrings.Ledger_SignerKey]: '署名者キー',
  [ShowcaseStrings.Ledger_Signature]: '署名',
  [ShowcaseStrings.Ledger_PayloadSize]: 'ペイロードサイズ',
  [ShowcaseStrings.Ledger_Payload]: 'ペイロード',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT}バイト',

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: 'メインコンテンツへスキップ',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: 'スクロールして探索',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ ブラウザ互換性に関するお知らせ',
  [ShowcaseStrings.Compat_DismissAriaLabel]: '警告を閉じる',
  [ShowcaseStrings.Compat_BrowserNotice]:
    'お使いのブラウザ（{BROWSER} {VERSION}）では、このデモの一部の機能がサポートされていない場合があります。',
  [ShowcaseStrings.Compat_CriticalIssues]: '重大な問題：',
  [ShowcaseStrings.Compat_Warnings]: '警告：',
  [ShowcaseStrings.Compat_RecommendedActions]: '推奨アクション：',
  [ShowcaseStrings.Compat_Recommendation]:
    '最適な体験のために、Chrome、Firefox、Safari、またはEdgeの最新バージョンをご使用ください。',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: 'デバッグパネル',
  [ShowcaseStrings.Debug_OpenTitle]: 'デバッグパネルを開く',
  [ShowcaseStrings.Debug_CloseTitle]: 'デバッグパネルを閉じる',
  [ShowcaseStrings.Debug_BlockStore]: 'ブロックストア',
  [ShowcaseStrings.Debug_SessionId]: 'セッションID：',
  [ShowcaseStrings.Debug_BlockCount]: 'ブロック数：',
  [ShowcaseStrings.Debug_TotalSize]: '合計サイズ：',
  [ShowcaseStrings.Debug_LastOperation]: '最後の操作：',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: 'ブロックID（{COUNT}）',
  [ShowcaseStrings.Debug_ClearSession]: 'セッションをクリア',
  [ShowcaseStrings.Debug_AnimationState]: 'アニメーション状態',
  [ShowcaseStrings.Debug_Playing]: '再生中',
  [ShowcaseStrings.Debug_Paused]: '一時停止',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ 再生中',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ 一時停止',
  [ShowcaseStrings.Debug_Speed]: '速度：',
  [ShowcaseStrings.Debug_Frame]: 'フレーム：',
  [ShowcaseStrings.Debug_Sequence]: 'シーケンス：',
  [ShowcaseStrings.Debug_Progress]: '進捗：',
  [ShowcaseStrings.Debug_Performance]: 'パフォーマンス',
  [ShowcaseStrings.Debug_FrameRate]: 'フレームレート：',
  [ShowcaseStrings.Debug_FrameTime]: 'フレーム時間：',
  [ShowcaseStrings.Debug_DroppedFrames]: 'ドロップフレーム：',
  [ShowcaseStrings.Debug_Memory]: 'メモリ：',
  [ShowcaseStrings.Debug_Sequences]: 'シーケンス：',
  [ShowcaseStrings.Debug_Errors]: 'エラー：',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 ファイル再構築アニメーション',
  [ShowcaseStrings.Recon_Subtitle]:
    'ブロックが元のファイルに再構成される様子をご覧ください',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: 'CBLを処理中',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    '構成ブロックリストのメタデータを読み取り中',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: 'ブロックを選択中',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    'Soupから必要なブロックを特定中',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'ブロックを取得中',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
    'ストレージからブロックを収集中',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]: 'チェックサムを検証中',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    'ブロックの整合性を検証中',
  [ShowcaseStrings.Recon_Step_Reassemble]: 'ファイルを再構成中',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    'ブロックを結合しパディングを除去中',
  [ShowcaseStrings.Recon_Step_DownloadReady]: 'ダウンロード準備完了',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    'ファイルの再構築が完了しました',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 構成ブロックリスト',
  [ShowcaseStrings.Recon_CBLSubtitle]: 'CBLから抽出されたブロック参照',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 ブロック（{COUNT}）',
  [ShowcaseStrings.Recon_BlocksSubtitle]: '取得および検証中のブロック',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 ファイル再構成',
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    'ブロックを結合しパディングを除去',
  [ShowcaseStrings.Recon_Complete]: 'ファイルの再構築が完了しました！',
  [ShowcaseStrings.Recon_ReadyForDownload]:
    'ファイルのダウンロード準備ができました',
  [ShowcaseStrings.Recon_FileName]: 'ファイル名：',
  [ShowcaseStrings.Recon_Size]: 'サイズ：',
  [ShowcaseStrings.Recon_Blocks]: 'ブロック：',
  [ShowcaseStrings.Recon_WhatsHappening]: '現在の処理内容',
  [ShowcaseStrings.Recon_TechDetails]: '技術的詳細：',
  [ShowcaseStrings.Recon_CBLContainsRefs]:
    'CBLにはすべてのブロックへの参照が含まれています',
  [ShowcaseStrings.Recon_BlockCountTemplate]: 'ブロック数：{COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    '元のファイルサイズ：{SIZE}バイト',
  [ShowcaseStrings.Recon_BlockSelection]: 'ブロック選択：',
  [ShowcaseStrings.Recon_IdentifyingBlocks]: 'Soup内のブロックを特定中',
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    'ブロックはチェックサムによって選択されます',
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    '再構築にはすべてのブロックが必要です',
  [ShowcaseStrings.Recon_ChecksumValidation]: 'チェックサム検証：',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    'ブロックが破損していないことを確認します',
  [ShowcaseStrings.Recon_ComparesChecksums]:
    '保存されたチェックサムと計算されたチェックサムを比較します',
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    '無効なブロックがあると再構築は失敗します',
  [ShowcaseStrings.Recon_FileReassembly]: 'ファイル再構成：',
  [ShowcaseStrings.Recon_CombinedInOrder]: 'ブロックは正しい順序で結合されます',
  [ShowcaseStrings.Recon_PaddingRemoved]: 'ランダムパディングが除去されます',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    '元のファイルがバイト単位で再構築されます',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: 'アニメーションBrightChainブロックSoupデモ',
  [ShowcaseStrings.Anim_Subtitle]:
    'ステップバイステップのアニメーションと教育コンテンツでBrightChainプロセスを体験しましょう！',
  [ShowcaseStrings.Anim_Initializing]:
    'アニメーションBrightChainデモを初期化中...',
  [ShowcaseStrings.Anim_PauseAnimation]: 'アニメーションを一時停止',
  [ShowcaseStrings.Anim_PlayAnimation]: 'アニメーションを再生',
  [ShowcaseStrings.Anim_ResetAnimation]: 'アニメーションをリセット',
  [ShowcaseStrings.Anim_SpeedTemplate]: '速度：{SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 パフォーマンスモニター',
  [ShowcaseStrings.Anim_FrameRate]: 'フレームレート：',
  [ShowcaseStrings.Anim_FrameTime]: 'フレーム時間：',
  [ShowcaseStrings.Anim_DroppedFrames]: 'ドロップフレーム：',
  [ShowcaseStrings.Anim_Memory]: 'メモリ：',
  [ShowcaseStrings.Anim_Sequences]: 'シーケンス：',
  [ShowcaseStrings.Anim_Errors]: 'エラー：',
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    'ここにファイルをドロップまたはクリックしてアップロード',
  [ShowcaseStrings.Anim_ChooseFiles]: 'ファイルを選択',
  [ShowcaseStrings.Anim_StorageTemplate]:
    'ブロックSoupストレージ（{COUNT}ファイル）',
  [ShowcaseStrings.Anim_NoFilesYet]:
    'まだファイルがありません。ファイルをアップロードしてアニメーションの魔法をご覧ください！ ✨',
  [ShowcaseStrings.Anim_RetrieveFile]: 'ファイルを取得',
  [ShowcaseStrings.Anim_DownloadCBL]: 'CBLをダウンロード',
  [ShowcaseStrings.Anim_SizeTemplate]:
    'サイズ：{SIZE}バイト | ブロック：{BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: 'エンコードアニメーション',
  [ShowcaseStrings.Anim_ReconstructionAnimation]: '再構築アニメーション',
  [ShowcaseStrings.Anim_CurrentStep]: '現在のステップ',
  [ShowcaseStrings.Anim_DurationTemplate]: '所要時間：{DURATION}ms',
  [ShowcaseStrings.Anim_BlockDetails]: 'ブロック詳細',
  [ShowcaseStrings.Anim_Index]: 'インデックス：',
  [ShowcaseStrings.Anim_Size]: 'サイズ：',
  [ShowcaseStrings.Anim_Id]: 'ID：',
  [ShowcaseStrings.Anim_Stats]: 'アニメーション統計',
  [ShowcaseStrings.Anim_TotalFiles]: '合計ファイル数：',
  [ShowcaseStrings.Anim_TotalBlocks]: '合計ブロック数：',
  [ShowcaseStrings.Anim_AnimationSpeed]: 'アニメーション速度：',
  [ShowcaseStrings.Anim_Session]: 'セッション：',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    '（ページ更新時にデータがクリアされます）',
  [ShowcaseStrings.Anim_WhatsHappening]: '現在の処理：',
  [ShowcaseStrings.Anim_Duration]: '所要時間：',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'BrightChainデモ',
  [ShowcaseStrings.Soup_Subtitle]:
    'ファイルやメッセージを分散型ブロックSoupにブロックとして保存します。すべてがカラフルなSoup缶になります！',
  [ShowcaseStrings.Soup_Initializing]:
    'SessionIsolatedBrightChainを初期化中...',
  [ShowcaseStrings.Soup_StoreInSoup]: 'ブロックSoupにデータを保存',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 ファイルを保存',
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    'ここにファイルをドロップまたはクリックしてアップロード',
  [ShowcaseStrings.Soup_ChooseFiles]: 'ファイルを選択',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 マグネットURLでCBLをSoupに保存',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    'XORホワイトニングを使用してCBLをブロックSoupに保存し、共有可能なマグネットURLを生成します。これを使用しない場合、CBLファイルが直接取得されます。',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 メッセージを保存',
  [ShowcaseStrings.Soup_From]: '送信者：',
  [ShowcaseStrings.Soup_To]: '宛先：',
  [ShowcaseStrings.Soup_Message]: 'メッセージ：',
  [ShowcaseStrings.Soup_TypeMessage]: 'メッセージを入力...',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 メッセージをSoupに送信',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBLがSoupに保存されました',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 スーパーCBLが使用されました',
  [ShowcaseStrings.Soup_HierarchyDepth]: '階層の深さ：',
  [ShowcaseStrings.Soup_SubCBLs]: 'サブCBL：',
  [ShowcaseStrings.Soup_LargeFileSplit]:
    '大きなファイルが階層構造に分割されました',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    'CBLは2つのXORコンポーネントとしてブロックSoupに保存されました。このマグネットURLを使用してファイルを取得してください：',
  [ShowcaseStrings.Soup_Component1]: 'コンポーネント1：',
  [ShowcaseStrings.Soup_Component2]: 'コンポーネント2：',
  [ShowcaseStrings.Soup_Copy]: '📋 コピー',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Soupから取得',
  [ShowcaseStrings.Soup_UploadCBLFile]: 'CBLファイルをアップロード',
  [ShowcaseStrings.Soup_UseMagnetURL]: 'マグネットURLを使用',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    '.cblファイルをアップロードして、ブロックSoupから元のファイルを再構築します。再構築にはブロックがすでにSoup内に存在している必要があります。',
  [ShowcaseStrings.Soup_ChooseCBLFile]: 'CBLファイルを選択',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    'マグネットURLを貼り付けてファイルを取得します。マグネットURLはSoupに保存されたホワイトニングされたCBLコンポーネントを参照します。',
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: '読み込み',
  [ShowcaseStrings.Soup_MessagePassing]: 'メッセージパッシング',
  [ShowcaseStrings.Soup_HideMessagePanel]: 'メッセージパネルを非表示',
  [ShowcaseStrings.Soup_ShowMessagePanel]: 'メッセージパネルを表示',
  [ShowcaseStrings.Soup_SendMessage]: 'メッセージを送信',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 メッセージ（{COUNT}）',
  [ShowcaseStrings.Soup_NoMessagesYet]:
    'まだメッセージがありません。最初のメッセージを送信しましょう！ ✨',
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Soupから取得',
  [ShowcaseStrings.Soup_StoredMessages]: '保存済みメッセージ',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]: '保存済みファイル＆メッセージ',
  [ShowcaseStrings.Soup_RemoveFromList]: 'リストから削除',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    '「{NAME}」をリストから削除しますか？（ブロックはSoupに残ります）',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 ファイルを取得',
  [ShowcaseStrings.Soup_DownloadCBL]: 'CBLをダウンロード',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 メッセージを取得',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 マグネットURL',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    'ホワイトニングされたCBLマグネットURL（「マグネットURLを使用」で取得）',
  [ShowcaseStrings.Soup_ProcessingSteps]: '処理ステップ',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'CBL保存ステップ',
  [ShowcaseStrings.Soup_BlockDetails]: 'ブロック詳細',
  [ShowcaseStrings.Soup_Index]: 'インデックス：',
  [ShowcaseStrings.Soup_Size]: 'サイズ：',
  [ShowcaseStrings.Soup_Id]: 'ID：',
  [ShowcaseStrings.Soup_Color]: '色：',
  [ShowcaseStrings.Soup_SoupStats]: 'Soup統計',
  [ShowcaseStrings.Soup_TotalFiles]: '合計ファイル数：',
  [ShowcaseStrings.Soup_TotalBlocks]: '合計ブロック数：',
  [ShowcaseStrings.Soup_BlockSize]: 'ブロックサイズ：',
  [ShowcaseStrings.Soup_SessionDebug]: 'セッションデバッグ',
  [ShowcaseStrings.Soup_SessionId]: 'セッションID：',
  [ShowcaseStrings.Soup_BlocksInMemory]: 'メモリ内ブロック：',
  [ShowcaseStrings.Soup_BlockIds]: 'ブロックID：',
  [ShowcaseStrings.Soup_ClearSession]: 'セッションをクリア',
  [ShowcaseStrings.Soup_Session]: 'セッション：',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    '（ページ更新時にデータがクリアされます）',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]: 'ファイルを選択してブロックをハイライト：',
  [ShowcaseStrings.ESV_BlockSoup]: 'ブロックスープ',
  [ShowcaseStrings.ESV_ShowingConnections]: '接続を表示中：',
  [ShowcaseStrings.ESV_EmptySoup]: '空のスープ',
  [ShowcaseStrings.ESV_EmptySoupHint]:
    'ファイルをアップロードして、カラフルなスープ缶に変換されるのを見てみましょう！',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} ブロック • {size} バイト',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]: '映画批評家アワードナイト！',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    '3本の映画が最優秀作品賞にノミネートされています。批評家はそれぞれを独立して評価しなければなりません。',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    '各映画を0〜10で評価してください。好きな映画も嫌いな映画も正直に採点！最高平均点が勝ちます。',
  [ShowcaseStrings.Score_IntroChallenge]:
    'ランキングとは異なり、すべて素晴らしければ複数の映画に高得点をつけることができます！',
  [ShowcaseStrings.Score_StartBtn]: '🎬 評価開始！',
  [ShowcaseStrings.Score_DemoTitle]: '⭐ スコア投票 - 最優秀作品賞',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 各映画を0〜10で評価。最高平均点が勝利！',
  [ShowcaseStrings.Score_NominatedFilms]: 'ノミネート作品',
  [ShowcaseStrings.Score_Genre_SciFi]: 'SF大作',
  [ShowcaseStrings.Score_Genre_Romance]: 'ロマンスドラマ',
  [ShowcaseStrings.Score_Genre_Thriller]: 'テックスリラー',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 {VOTER}の評価',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - 最悪',
  [ShowcaseStrings.Score_Label_Average]: '5 - 普通',
  [ShowcaseStrings.Score_Label_Masterpiece]: '10 - 傑作',
  [ShowcaseStrings.Score_SubmitTemplate]: '評価を提出 ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 暗号化中...',
  [ShowcaseStrings.Score_EncryptingVote]: '投票を暗号化中...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 評価した批評家: {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 平均を計算！',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 そして受賞者は...',
  [ShowcaseStrings.Score_TallyTitle]: '📊 スコア平均化プロセス',
  [ShowcaseStrings.Score_TallyExplain]:
    '各映画のスコアが合計され、{COUNT}人の批評家で割られました：',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 平均',
  [ShowcaseStrings.Score_ResetBtn]: '新しい授賞式',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]: 'StartupCoの取締役会ドラマ！',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    '年次株主総会です。会社の価値は1億ドルで、全員が次の展開に口を出したがっています。',
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    'すべての票が平等ではありません。VCファンドは株式の45%を所有。創業者は30%と15%を所有。従業員とエンジェル投資家が残りを所有しています。',
  [ShowcaseStrings.Weight_StakeExpand]: '巨大な成長の可能性、しかしリスクあり',
  [ShowcaseStrings.Weight_StakeAcquire]: '競合を排除、しかし高コスト',
  [ShowcaseStrings.Weight_StakeIPO]: 'IPOは流動性を意味するが、監視も伴う',
  [ShowcaseStrings.Weight_IntroChallenge]:
    '各票は保有株式で加重されます。VCファンドの票はエンジェル投資家の18倍の重みがあります。これが企業民主主義です！',
  [ShowcaseStrings.Weight_StartBtn]: '📄 取締役会室に入る',
  [ShowcaseStrings.Weight_DemoTitle]: '⚖️ 加重投票 - StartupCo取締役会',
  [ShowcaseStrings.Weight_DemoTagline]:
    '💰 あなたの株式 = あなたの投票力。コーポレートガバナンスへようこそ！',
  [ShowcaseStrings.Weight_ProposalsTitle]: '戦略的提案',
  [ShowcaseStrings.Weight_Proposal1_Desc]: '東京とシンガポールにオフィスを開設',
  [ShowcaseStrings.Weight_Proposal2_Desc]: 'TechStartup Inc.と合併',
  [ShowcaseStrings.Weight_Proposal3_Desc]: '来四半期にNASDAQに上場',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    '株主 ({VOTED}/{TOTAL} 投票済み)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} 株 ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ {EMOJI} {NAME} に投票',
  [ShowcaseStrings.Weight_TallyBtn]: '加重投票を集計',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 結果（株式加重別）',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} 株 ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 勝利した提案は総株式の{PERCENT}%を獲得しました',
  [ShowcaseStrings.Weight_ResetBtn]: '新しい投票',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: '国民投票！',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ 質問：「わが国は週4日勤務制を導入すべきか？」',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 賛成/反対の国民投票：民主主義の最もシンプルな形。一つの質問、二つの選択肢、多数決で決定。',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ 賛成キャンペーン：ワークライフバランスの改善、生産性の向上、より幸せな市民！',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ 反対キャンペーン：経済的リスク、ビジネスの混乱、未検証の政策！',
  [ShowcaseStrings.YN_IntroChallenge]:
    '🗳️ ブレグジット、スコットランド独立、世界中の憲法改正に使用されています。',
  [ShowcaseStrings.YN_StartBtn]: '🗳️ 今すぐ投票！',
  [ShowcaseStrings.YN_DemoTitle]: '👍 賛成/反対の国民投票 - 週4日勤務制',
  [ShowcaseStrings.YN_DemoTagline]:
    '🗳️ 一つの質問。二つの選択肢。民主主義が決める。',
  [ShowcaseStrings.YN_ReferendumQuestion]: '週4日勤務制を導入すべきか？',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    '投票中の市民（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.YN_VotedYes]: '✓ 👍 賛成に投票',
  [ShowcaseStrings.YN_VotedNo]: '✓ 👎 反対に投票',
  [ShowcaseStrings.YN_BtnYes]: '👍 賛成',
  [ShowcaseStrings.YN_BtnNo]: '👎 反対',
  [ShowcaseStrings.YN_TallyBtn]: '📊 投票を集計！',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 国民投票の結果！',
  [ShowcaseStrings.YN_LabelYes]: '賛成',
  [ShowcaseStrings.YN_LabelNo]: '反対',
  [ShowcaseStrings.YN_MotionPasses]: '✅ 動議は可決！',
  [ShowcaseStrings.YN_MotionFails]: '❌ 動議は否決！',
  [ShowcaseStrings.YN_OutcomePass]: '国民の声：週4日勤務制を導入します！',
  [ShowcaseStrings.YN_OutcomeFail]: '国民の声：週5日勤務制を維持します。',
  [ShowcaseStrings.YN_ResetBtn]: '新しい国民投票',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]: '国連安全保障理事会決議！',
  [ShowcaseStrings.YNA_IntroResolution]:
    '🌍 決議：「国連はX国に対して人権侵害を理由に制裁を課すべきか？」',
  [ShowcaseStrings.YNA_IntroStory]:
    '🤷 賛成/反対/棄権：決断の準備ができていないこともあります。棄権は合計に含まれませんが記録されます。',
  [ShowcaseStrings.YNA_IntroYes]: '✅ 賛成：直ちに制裁を課す',
  [ShowcaseStrings.YNA_IntroNo]: '❌ 反対：決議を否決する',
  [ShowcaseStrings.YNA_IntroAbstain]: '🤷 棄権：中立 - どちらの側にもつかない',
  [ShowcaseStrings.YNA_IntroChallenge]:
    '🏛️ 国連の投票、議会手続き、世界中の取締役会で使用されています。',
  [ShowcaseStrings.YNA_StartBtn]: '🌎 投票する！',
  [ShowcaseStrings.YNA_DemoTitle]: '🤷 賛成/反対/棄権 - 国連決議',
  [ShowcaseStrings.YNA_DemoTagline]: '🌍 三つの選択肢：支持、反対、または中立',
  [ShowcaseStrings.YNA_ReferendumQuestion]: 'X国に制裁を課すか？',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    '安全保障理事会メンバー（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 賛成',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 反対',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 棄権',
  [ShowcaseStrings.YNA_BtnYes]: '👍 賛成',
  [ShowcaseStrings.YNA_BtnNo]: '👎 反対',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 棄権',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 決議を集計！',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 決議の結果！',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 投票集計',
  [ShowcaseStrings.YNA_TallyExplain]:
    '棄権は記録されますが、決定には含まれません。勝者は賛成/反対票の過半数が必要です：',
  [ShowcaseStrings.YNA_LabelYes]: '賛成',
  [ShowcaseStrings.YNA_LabelNo]: '反対',
  [ShowcaseStrings.YNA_LabelAbstain]: '棄権',
  [ShowcaseStrings.YNA_AbstainNote]: '決定には含まれません',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ 決議は可決！',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ 決議は否決！',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    '決定票：{DECIDING} | 棄権：{ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: '新しい決議',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: '憲法改正投票！',
  [ShowcaseStrings.Super_IntroStakes]:
    '🏛️ 重大な局面：憲法改正には単純多数決以上が必要です。特別多数決が必要です！',
  [ShowcaseStrings.Super_IntroThreshold]:
    '🎯 2/3の閾値：改正案が通過するには少なくとも66.67%が賛成する必要があります。これは拙速な変更を防ぎます。',
  [ShowcaseStrings.Super_IntroAmendment]:
    '📜 改正案：「すべての連邦判事に任期制限を追加する」',
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ 高いハードル：9州中6州が批准する必要があります（単純多数決では不十分！）',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 憲法改正、条約批准、弾劾裁判に使用されています。',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ 批准を開始！',
  [ShowcaseStrings.Super_DemoTitle]: '🎯 特別多数決 - 憲法改正',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 通過には{PERCENT}%が必要（{REQUIRED}/{TOTAL}州）',
  [ShowcaseStrings.Super_TrackerTitle]: '📊 リアルタイム閾値トラッカー',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} 賛成',
  [ShowcaseStrings.Super_RequiredTemplate]: '{PERCENT}% 必要',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ 現在可決中（{YES}/{TOTAL} = {PERCENT}%）',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ 現在否決中（{YES}/{TOTAL} = {PERCENT}%）- あと{NEED}票の賛成が必要',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    '州議会（{VOTED}/{TOTAL}が投票済み）',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ 批准',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ 拒否',
  [ShowcaseStrings.Super_BtnRatify]: '✅ 批准',
  [ShowcaseStrings.Super_BtnReject]: '❌ 拒否',
  [ShowcaseStrings.Super_TallyBtn]: '📜 最終集計！',
  [ShowcaseStrings.Super_ResultsTitle]: '🏛️ 改正案の結果！',
  [ShowcaseStrings.Super_CalcTitle]: '📊 特別多数決の計算',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    '必要：{REQUIRED}/{TOTAL}州（{PERCENT}%）',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    '実際：{ACTUAL}/{VOTED}州（{PERCENT}%）',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} 批准',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} 拒否',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ {PERCENT}% 閾値',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ 改正案批准！',
  [ShowcaseStrings.Super_AmendmentFails]: '❌ 改正案否決！',
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    '改正案は{COUNT}州で可決されました（{PERCENT}%）',
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    '{THRESHOLD}%の閾値に達しませんでした。必要な{REQUIRED}州のうち{ACTUAL}州のみが批准しました。',
  [ShowcaseStrings.Super_ResetBtn]: '新しい改正案',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: '大政治対決！',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ 選挙の夜スペシャル：4つの政党が権力を争っています。しかし、票の分裂で最も嫌いな候補者に勝利を渡したくない！',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 順位付き投票が救います！1人だけ選ぶのではなく、すべての候補者を好きな順に並べます。',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    '🔥 仕組み：第1ラウンドで誰も50%+を獲得しなければ、最下位を排除し、その票を有権者の第2希望に移します。誰かが勝つまで繰り返します！',
  [ShowcaseStrings.RC_IntroWhyCool]:
    '✨ なぜ素晴らしいか：第1ラウンドで本心で投票しても票を「無駄」にしません。お気に入りが排除されたら、バックアップの選択肢が有効になります。',
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 オーストラリア、メイン州、アラスカ、NYCで使用されています！即時決選投票を目の前でご覧ください。',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ 順位付け開始！',
  [ShowcaseStrings.RC_DemoTitle]: '🔄 順位付き投票 - 国政選挙',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 全員を順位付け！スポイラーなし、後悔なし、民主主義だけ。',
  [ShowcaseStrings.RC_PartiesTitle]: '政党',
  [ShowcaseStrings.RC_Cand1_Platform]: '国民皆保険、気候変動対策',
  [ShowcaseStrings.RC_Cand2_Platform]: '減税、伝統的価値観',
  [ShowcaseStrings.RC_Cand3_Platform]: '個人の自由、小さな政府',
  [ShowcaseStrings.RC_Cand4_Platform]: '環境保護、持続可能性',
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    '優先順位を付けてください（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.RC_VotedBadge]: '✓ 投票済み',
  [ShowcaseStrings.RC_AddToRanking]: '順位に追加：',
  [ShowcaseStrings.RC_SubmitBallot]: '投票用紙を提出',
  [ShowcaseStrings.RC_RunInstantRunoff]: '即時決選投票を実行',
  [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 掲示板を表示',
  [ShowcaseStrings.RC_HideBulletinBoard]: '📜 掲示板を非表示',
  [ShowcaseStrings.RC_BulletinBoardTitle]: '📜 公開掲示板（要件1.2）',
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    'マークルツリー検証による透明な追記専用投票公開',
  [ShowcaseStrings.RC_EntryTemplate]: 'エントリー #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: '暗号化された投票：',
  [ShowcaseStrings.RC_VoterHash]: '投票者ハッシュ：',
  [ShowcaseStrings.RC_Verified]: '✅ 検証済み',
  [ShowcaseStrings.RC_Invalid]: '❌ 無効',
  [ShowcaseStrings.RC_MerkleTree]: 'マークルツリー：',
  [ShowcaseStrings.RC_MerkleValid]: '✅ 有効',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ 改ざんあり',
  [ShowcaseStrings.RC_TotalEntries]: 'エントリー合計：',
  [ShowcaseStrings.RC_ResultsTitle]: '🏆 即時決選投票の結果',
  [ShowcaseStrings.RC_EliminationRounds]: '排除ラウンド',
  [ShowcaseStrings.RC_RoundTemplate]: 'ラウンド {ROUND}',
  [ShowcaseStrings.RC_Eliminated]: '排除',
  [ShowcaseStrings.RC_Winner]: '勝者！',
  [ShowcaseStrings.RC_FinalWinner]: '最終勝者',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]: '{COUNT}ラウンド後に勝利',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: '大統領選挙 - 二回投票制！',
  [ShowcaseStrings.TR_IntroSystem]:
    '🗳️ システム：4人の候補者が競います。第1ラウンドで誰も50%+を獲得しなければ、上位2人が第2ラウンドで対決！',
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 なぜ二回投票？勝者が過半数の支持を得ることを保証します。フランス、ブラジル、多くの大統領選挙で使用されています。',
  [ShowcaseStrings.TR_IntroRound1]:
    '📊 第1ラウンド：4人の候補者からお気に入りに投票',
  [ShowcaseStrings.TR_IntroRound2]:
    '🔄 第2ラウンド：必要に応じて上位2人から選択',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ ラウンド間で中間復号が必要です - ラウンド間で投票は非公開ではありません！',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ 第1ラウンド開始！',
  [ShowcaseStrings.TR_DemoTitle]: '2️⃣ 二回投票制 - 大統領選挙',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 第1ラウンド：お気に入りを選択',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 第2ラウンド：最終決選投票！',
  [ShowcaseStrings.TR_Round1Candidates]: '第1ラウンド候補者',
  [ShowcaseStrings.TR_Cand1_Party]: '進歩党',
  [ShowcaseStrings.TR_Cand2_Party]: '保守党',
  [ShowcaseStrings.TR_Cand3_Party]: 'テック・フォワード',
  [ShowcaseStrings.TR_Cand4_Party]: '正義連合',
  [ShowcaseStrings.TR_VotersTemplate]: '有権者（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ {EMOJI}に投票',
  [ShowcaseStrings.TR_CountRound1]: '📊 第1ラウンドの票を数える！',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ 第1ラウンド結果',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 第1ラウンド集計',
  [ShowcaseStrings.TR_Round1TallyExplain]:
    '50%+の過半数を獲得した人がいるか確認中...',
  [ShowcaseStrings.TR_AdvanceRound2]: '→ 第2ラウンドへ',
  [ShowcaseStrings.TR_EliminatedBadge]: '排除',
  [ShowcaseStrings.TR_NoMajority]: '🔄 過半数なし！決選投票が必要！',
  [ShowcaseStrings.TR_TopTwoAdvance]: '上位2候補が第2ラウンドに進出：',
  [ShowcaseStrings.TR_StartRound2]: '▶️ 第2ラウンド決選投票開始！',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 第2ラウンド決選投票',
  [ShowcaseStrings.TR_Round1ResultTemplate]: '第1ラウンド：{VOTES}票',
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    '最終投票（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.TR_FinalCount]: '🏆 最終集計！',
  [ShowcaseStrings.TR_ElectionWinner]: '🎉 選挙の勝者！',
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 第2ラウンド最終集計',
  [ShowcaseStrings.TR_Round2TallyExplain]: '上位2候補の直接対決：',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME}が勝利！',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    '決選投票で{VOTES}票（{PERCENT}%）を獲得',
  [ShowcaseStrings.TR_NewElection]: '新しい選挙',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]: 'STAR投票 - 両方の良いとこ取り！',
  [ShowcaseStrings.STAR_IntroAcronym]: '🌟 STAR = スコア後自動決選投票',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ ステップ1：全候補者を0-5つ星で評価（映画の評価のように！）',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 ステップ2：合計スコア上位2人が自動決選投票へ。あなたのスコアが好みを決定！',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 魔法：複数の候補者に高いスコアを付けられますが、決選投票が過半数の支持を保証します',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 例：Alex=5、Jordan=4、Sam=2、Casey=1と評価。AlexとJordanが上位2人なら、あなたの票はAlexへ！',
  [ShowcaseStrings.STAR_IntroChallenge]:
    '⚠️ スコア投票の表現力と決選投票の過半数要件を組み合わせています！',
  [ShowcaseStrings.STAR_StartBtn]: '⭐ 評価開始！',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 STAR投票 - 市議会',
  [ShowcaseStrings.STAR_DemoTagline]: '⭐ スコアを付けて、自動決選投票！',
  [ShowcaseStrings.STAR_CandidatesTitle]: '候補者',
  [ShowcaseStrings.STAR_Cand1_Platform]: '芸術・文化',
  [ShowcaseStrings.STAR_Cand2_Platform]: '環境',
  [ShowcaseStrings.STAR_Cand3_Platform]: '経済',
  [ShowcaseStrings.STAR_Cand4_Platform]: '医療',
  [ShowcaseStrings.STAR_RatingsTemplate]: '⭐ {VOTER}の評価（0-5つ星）',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    '評価を提出（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 STARアルゴリズムを実行！',
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ フェーズ1：スコア合計',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 全スコアを合計中',
  [ShowcaseStrings.STAR_Phase1TallyExplain]: '合計スコアで上位2候補を検索中...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL}ポイント（平均{AVG}）',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ 決選投票',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 自動決選投票フェーズ',
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    '上位2人が進出！直接対決の好みを確認中...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ 自動決選投票を実行！',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 STAR勝者！',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 フェーズ2：自動決選投票',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    '有権者の好みで{NAME1}対{NAME2}を比較：',
  [ShowcaseStrings.STAR_VotersPreferred]: '人の有権者が支持',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME}が勝利！',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    '自動決選投票で{WINNER}対{LOSER}で勝利',
  [ShowcaseStrings.STAR_NewElection]: '新しい選挙',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: 'STV - 比例代表制！',
  [ShowcaseStrings.STV_IntroGoal]:
    '🏛️ 目標：有権者の好みの多様性を反映する3人の代表を選出！',
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 STV（単記移譲式投票）：候補者を順位付け。第1希望が当選または排除されると票が移譲されます。',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 当選基数：議席獲得に{QUOTA}票必要（ドループ基数：{VOTERS}/(3+1) + 1）',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 移譲：当選者の余剰票と排除された候補者の票が次の希望に移譲されます',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 アイルランド、オーストラリア上院、多くの市議会で公正な代表のために使用されています！',
  [ShowcaseStrings.STV_StartBtn]: '📊 順位付け開始！',
  [ShowcaseStrings.STV_DemoTitle]: '📊 STV - 市議会（{SEATS}議席）',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 当選基数：議席あたり{QUOTA}票必要',
  [ShowcaseStrings.STV_PartiesRunning]: '立候補政党',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 {VOTER}の順位',
  [ShowcaseStrings.STV_RankingInstruction]:
    'クリックして候補者を優先順に追加：',
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    '順位を提出（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 STV集計を実行！',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ 議会が選出されました！',
  [ShowcaseStrings.STV_CountingTitle]: '📊 STV集計プロセス',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    '当選基数：{QUOTA}票 | 議席：{SEATS}\n第1希望の集計で最初の当選者を決定',
  [ShowcaseStrings.STV_QuotaMet]: '（基数達成！）',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ 当選',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 選出された代表',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 これらの{COUNT}政党はそれぞれ{QUOTA}票の基数を達成し、議会の議席を獲得しました！',
  [ShowcaseStrings.STV_NewElection]: '新しい選挙',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]: '二次投票 - 予算配分！',
  [ShowcaseStrings.Quad_IntroChallenge]:
    '💰 課題：140万ドルの予算、4つのプロジェクト。選好の強さをどう測定するか？',
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² 二次投票：各票のコストは票²クレジット。1票 = 1クレジット、2票 = 4クレジット、3票 = 9クレジット！',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ 安全でない方式：非準同型演算（平方根）が必要。個々の投票が見えます！',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    '🎯 なぜ使うのか？裕福な投票者の支配を防ぎます。賛否だけでなく、選好の強さを示します。',
  [ShowcaseStrings.Quad_IntroUsedIn]:
    '💡 コロラド州議会、台湾のvTaiwanプラットフォーム、企業統治の実験で使用されています！',
  [ShowcaseStrings.Quad_StartBtn]: '💰 配分を開始！',
  [ShowcaseStrings.Quad_DemoTitle]: '² 二次投票 - 市の予算',
  [ShowcaseStrings.Quad_DemoTagline]:
    '💰 100ボイスクレジット。票のコストは票²！',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ 安全でない：この方式は準同型暗号を使用できません。投票が見えます！',
  [ShowcaseStrings.Quad_BudgetProjects]: '予算プロジェクト',
  [ShowcaseStrings.Quad_Proj1_Name]: '新しい公園',
  [ShowcaseStrings.Quad_Proj1_Desc]: '50万ドル',
  [ShowcaseStrings.Quad_Proj2_Name]: '図書館の改修',
  [ShowcaseStrings.Quad_Proj2_Desc]: '30万ドル',
  [ShowcaseStrings.Quad_Proj3_Name]: 'コミュニティセンター',
  [ShowcaseStrings.Quad_Proj3_Desc]: '40万ドル',
  [ShowcaseStrings.Quad_Proj4_Name]: '道路修繕',
  [ShowcaseStrings.Quad_Proj4_Desc]: '20万ドル',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 {VOTER}の予算（残り{REMAINING}クレジット）',
  [ShowcaseStrings.Quad_VotesTemplate]: '{VOTES}票（{COST}クレジットのコスト）',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    '次の票のコストは{NEXT_COST}クレジット（{CURRENT}から{NEXT_TOTAL}へ）',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    '合計コスト：{USED}/100クレジット',
  [ShowcaseStrings.Quad_SubmitTemplate]: '配分を提出（{CURRENT}/{TOTAL}）',
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 合計を計算！',
  [ShowcaseStrings.Quad_ResultsTitle]: '💰 予算配分の結果！',
  [ShowcaseStrings.Quad_TallyTitle]: '📊 二次投票の合計',
  [ShowcaseStrings.Quad_TallyExplain]:
    '各プロジェクトの総票数（クレジットではない）が資金優先順位を決定します：',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: '合計{TOTAL}票',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 最優先',
  [ShowcaseStrings.Quad_ExplanationTitle]: '💡 二次投票の仕組み',
  [ShowcaseStrings.Quad_ExplanationP1]:
    '二次コストにより、誰も単一のプロジェクトを支配できませんでした。10票を投じるには100クレジット（予算全額！）かかりますが、2つのプロジェクトに5票ずつ分散すると合計50クレジットしかかかりません。',
  [ShowcaseStrings.Quad_ExplanationResult]:
    '結果：幅広く強い支持を持つプロジェクトが、狭く極端な支持のプロジェクトに勝ちます。',
  [ShowcaseStrings.Quad_ResetBtn]: '新しい予算投票',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: 'コンセンサス意思決定！',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ シナリオ：小さな協同組合が重要な決定を下す必要があります。全員の声が大切です！',
  [ShowcaseStrings.Cons_IntroConsensus]:
    '🤝 コンセンサス投票：95%以上の合意が必要。1つか2つの反対で提案を阻止できます。',
  [ShowcaseStrings.Cons_IntroInsecure]:
    '⚠️ 安全でない方式：プライバシーなし - 誰が賛成/反対しているか全員に見えます！',
  [ShowcaseStrings.Cons_IntroWhyUse]:
    '🎯 なぜ使うのか？信頼と団結がプライバシーより重要な小グループ向け。',
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 協同組合、意図的コミュニティ、コンセンサスベースの組織で使用されています！',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 投票を開始！',
  [ShowcaseStrings.Cons_DemoTitle]: '🤝 コンセンサス投票 - 協同組合の決定',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    '🎯 {PERCENT}%の合意が必要（{REQUIRED}/{TOTAL}メンバー）',
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ 安全でない：プライバシーなし - コンセンサス構築のため全投票が見えます！',
  [ShowcaseStrings.Cons_Proposal]:
    '提案：ソーラーパネルに5万ドル投資すべきか？',
  [ShowcaseStrings.Cons_ProposalDesc]:
    'これはほぼ全会一致の支持を必要とする重要な財務決定です。',
  [ShowcaseStrings.Cons_TrackerTitle]: '📊 リアルタイムコンセンサストラッカー',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT}人が賛成',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ コンセンサス達成（{SUPPORT}/{TOTAL}）',
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    '❌ コンセンサスにあと{NEEDED}人必要',
  [ShowcaseStrings.Cons_MembersTemplate]:
    '協同組合メンバー（{VOTED}/{TOTAL}人が投票済み）',
  [ShowcaseStrings.Cons_Support]: '✅ 賛成',
  [ShowcaseStrings.Cons_Oppose]: '❌ 反対',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ 賛成',
  [ShowcaseStrings.Cons_BtnOppose]: '❌ 反対',
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 コンセンサスを確認！',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 コンセンサス結果！',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 最終集計',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    '必要：{REQUIRED}/{TOTAL}（{PERCENT}%）',
  [ShowcaseStrings.Cons_ActualTemplate]:
    '実際：{SUPPORT}/{VOTED}（{ACTUAL_PERCENT}%）',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT}人が賛成',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT}人が反対',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ {PERCENT}%の閾値',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ コンセンサス達成！',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ コンセンサス不成立！',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    '提案は{COUNT}人のメンバーの支持で可決されました（{PERCENT}%）',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    '{THRESHOLD}%の閾値に達しませんでした。{OPPOSE}人のメンバーが反対し、コンセンサスを阻止しました。',
  [ShowcaseStrings.Cons_FailNote]:
    '💡 コンセンサス意思決定では、1つか2つの反対でも重要です。グループは懸念に対処するか、提案を修正する必要があります。',
  [ShowcaseStrings.Cons_ResetBtn]: '新しい提案',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]: 'コンセント・ベースの意思決定！',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 ソシオクラシー：労働者協同組合が全員が受け入れられる決定を下す必要があります。',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    '🙋 コンセント・ベース：合意ではなく「強い反対がない」こと。これで生きていけますか？',
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ 安全でない方式：プライバシーなし - 異議は聞かれ、対処されなければなりません！',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 質問：「組織に害を与える原則的な異議がありますか？」',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    '🌍 ソシオクラシー組織、ホラクラシー、協働的な職場で使用されています！',
  [ShowcaseStrings.Consent_StartBtn]: '🙋 プロセスを開始！',
  [ShowcaseStrings.Consent_DemoTitle]: '🙋 コンセント・ベース - 労働者協同組合',
  [ShowcaseStrings.Consent_DemoTagline]: '🤝 強い異議なし = コンセント達成',
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ 安全でない：プライバシーなし - 異議は議論のためにオープンに共有されます！',
  [ShowcaseStrings.Consent_ProposalTitle]: '提案：来月から週4日勤務を導入する',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    '私たちの組織に害を与える原則的な異議がありますか？',
  [ShowcaseStrings.Consent_ProposalNote]:
    '「5日の方が好き」は原則的な異議ではありません。「これは私たちを破産させる」は原則的な異議です。',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ コンセント',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 異議',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ {COUNT}件の原則的異議が提起されました - 提案は修正または撤回が必要です',
  [ShowcaseStrings.Consent_MembersTemplate]:
    'サークルメンバー（{RESPONDED}/{TOTAL}人が回答済み）',
  [ShowcaseStrings.Consent_NoObjection]: '✅ 異議なし',
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 原則的異議',
  [ShowcaseStrings.Consent_BtnNoObjection]: '✅ 異議なし',
  [ShowcaseStrings.Consent_BtnObject]: '🚫 異議を唱える',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}さん、あなたの原則的な異議は何ですか？',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 コンセントを確認！',
  [ShowcaseStrings.Consent_ResultsTitle]: '🙋 コンセントプロセスの結果！',
  [ShowcaseStrings.Consent_ConsentCheckTitle]: '📊 コンセント確認',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    '原則的異議がゼロならコンセント達成\n提起された異議：{COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ 異議なし（{COUNT}）',
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    'これらのメンバーは提案を受け入れられます',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]: '🚫 原則的異議（{COUNT}）',
  [ShowcaseStrings.Consent_ObjectionRaised]: '異議が提起されました',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ コンセント達成！',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 コンセント阻止！',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    '全{COUNT}人のメンバーがコンセントを与えました（原則的異議なし）。提案は前進します。',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    '{COUNT}件の原則的異議が提起されました。サークルは続行前に懸念に対処する必要があります。',
  [ShowcaseStrings.Consent_NextStepsTitle]: '💡 ソシオクラシーの次のステップ：',
  [ShowcaseStrings.Consent_NextStep1]: '異議を完全に聞く',
  [ShowcaseStrings.Consent_NextStep2]: '懸念に対処するために提案を修正する',
  [ShowcaseStrings.Consent_NextStep3]:
    '更新された提案でコンセントを再テストする',
  [ShowcaseStrings.Consent_NextStep4]: '異議が続く場合、提案は撤回される',
  [ShowcaseStrings.Consent_ResetBtn]: '新しい提案',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'BrightChainブログ',
  [ShowcaseStrings.Blog_Subtitle]: '考察、チュートリアル、最新情報',
  [ShowcaseStrings.Blog_Loading]: '記事を読み込み中...',
  [ShowcaseStrings.Blog_NewPost]: '+ 新しい記事',
  [ShowcaseStrings.Blog_NoPosts]:
    'まだブログ記事がありません。近日中にご確認ください！',
  [ShowcaseStrings.Blog_NewBadge]: '✨ 新着',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: '{AUTHOR}著',
  [ShowcaseStrings.Blog_BackToHome]: '← ホームに戻る',

  // BlogPost.tsx
  [ShowcaseStrings.BlogPost_Loading]: '記事を読み込み中...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: '記事が見つかりません',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    'お探しのブログ記事は存在しません。',
  [ShowcaseStrings.BlogPost_BackToBlog]: '← ブログに戻る',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ この記事は公開されたばかりです！次のサイト更新後にブログ一覧に表示されます。',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: '{AUTHOR} 著',

  // Components.tsx feature cards
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    'オーナーフリーファイルシステムにデータを保存するMongoDB競合ドキュメントデータベース。すべてのドキュメントは、もっともらしい否認のためにTUPLEアーキテクチャでホワイトニングされたブロックとして透過的に保存されます。',
  [ShowcaseStrings.Feat_BrightDB_Cat]: 'ストレージ',
  [ShowcaseStrings.Feat_BrightDB_Tech1]: 'ドキュメントストア',
  [ShowcaseStrings.Feat_BrightDB_Tech2]: 'ACIDトランザクション',
  [ShowcaseStrings.Feat_BrightDB_Tech3]: '集約パイプライン',
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    'MongoDBライクAPI：コレクション、CRUD、クエリ、インデックス、トランザクション',
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    '15のクエリ演算子：$eq、$ne、$gt、$gte、$lt、$lte、$in、$nin、$regex、$exists、$and、$or、$not、$nor、$elemMatch',
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    '集約パイプライン：$match、$group、$sort、$limit、$skip、$project、$unwind、$count、$addFields、$lookup',
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    'B-tree構造を持つ単一フィールド、複合、およびユニークインデックス',
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    'コミット/アボートと楽観的並行性を備えたマルチドキュメントACIDトランザクション',
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    'リアルタイムの挿入/更新/削除イベントサブスクリプション用の変更ストリーム',
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    'コレクションへのプラグアンドプレイAPIアクセス用のExpress RESTミドルウェア',
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    'ドキュメントの自動有効期限切れのためのTTLインデックス',
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    '厳格/中程度レベルとデフォルト値を持つスキーマ検証',
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    '重み付けフィールドと$textオペレーターを使用した全文検索',
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    'コピーオンライトストレージ：ブロックは削除されず、マッピングのみが更新されます',
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    '各ドキュメントは、もっともらしい否認のために3ブロックTUPLE（データ+2ランダマイザー）として保存されます',
  [ShowcaseStrings.Feat_BrightDBPools_Title]: 'BrightDBプール',
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    '個別の物理ストレージなしでブロックを論理的に分割する軽量な名前空間分離ストレージプール。各プールは独自のACL、暗号化、ホワイトニング境界を適用し、単一のBrightChainノード上でマルチテナント、マルチアプリケーションのデータ分離を可能にします。',
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'ストレージ',
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: '名前空間分離',
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'プールACL',
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'ゴシップ検出',
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    '名前空間プレフィックス付きストレージキー（poolId:hash）— 物理的分離なしの論理的分離',
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    'ストレージレイヤーで適用される読み取り、書き込み、レプリケーション、管理権限を持つプールごとのACL',
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    'プールスコープのXORホワイトニング：タプルはプール境界を越えず、プールごとのもっともらしい否認を保持',
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    '設定可能なクエリタイムアウトとキャッシングを備えたピア間のゴシップベースのプール検出',
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    'プールブートストラップシーディング：新しいプールのホワイトニング素材として暗号学的ランダムブロックを生成',
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    '安全な削除検証 — プール削除前にクロスプールXOR依存関係をチェック',
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    '効率的なピア調整のためのプールスコープのBloomフィルターとマニフェスト',
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    'マルチ管理者クォーラムガバナンス：ACL更新には>50%の管理者署名が必要',
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    'オープンプール用のパブリック読み取り/書き込みフラグ、またはメンバー専用のロックダウンアクセス',
  [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
  [ShowcaseStrings.Feat_OFFS_Desc]:
    'ファイルをブロックに分割しランダムデータとXOR演算する革新的な分散型ストレージ。単一のブロックに識別可能なコンテンツは含まれず、ノードオペレーターに法的免責を提供しながら安全な分散型ファイルストレージを実現します。',
  [ShowcaseStrings.Feat_OFFS_Cat]: 'ストレージ',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'XOR暗号化',
  [ShowcaseStrings.Feat_OFFS_Tech2]: '分散型ストレージ',
  [ShowcaseStrings.Feat_OFFS_Tech3]: 'SHA-512',
  [ShowcaseStrings.Feat_OFFS_HL1]:
    'ファイルをソースブロックに分割し、XORによりランダムデータと結合',
  [ShowcaseStrings.Feat_OFFS_HL2]:
    '元のブロックは破棄され、ランダム化されたブロックのみが保存',
  [ShowcaseStrings.Feat_OFFS_HL3]:
    '構成ブロックリスト（CBL）がブロック間の関係を追跡',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'SHA-512ハッシュによるブロック識別 — 自動重複排除',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    'マルチユースブロックは複数のファイルに同時に属することが可能',
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'ノードオペレーターの法的保護 — 識別可能なコンテンツは保存されません',
  [ShowcaseStrings.Feat_Messaging_Title]: 'メッセージングシステム',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    '暗号化、ルーティング、配信追跡、エピデミック型伝播のためのゴシッププロトコルを備えた安全な分散型メッセージパッシング。WebSocketリアルタイム配信でブロックストア上に構築。',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'ゴシッププロトコル',
  [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
  [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Bloomフィルター',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    '受信者ごとまたは共有鍵暗号化による暗号化メッセージパッシング',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    '優先度ベースの配信によるエピデミック型ゴシップ伝播',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    '配信失敗時の指数バックオフによる自動リトライ',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    '効率的なブロック検索のためのBloomフィルターベースの検出プロトコル',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'メッセージ配信と確認応答のためのリアルタイムWebSocketイベント',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    '受信者ごとのステータスによる永続的な配信追跡',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    'スレッド化、BCC プライバシー、添付ファイル、受信トレイ操作、配信追跡を備えたRFC 5322/2045準拠の電子メール。メッセージングインフラストラクチャ上に構築された完全な電子メール作成、送信、取得。',
  [ShowcaseStrings.Feat_BrightMail_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
  [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
  [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
  [ShowcaseStrings.Feat_BrightMail_Tech4]: 'スレッド化',
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    'MIMEサポート付きRFC準拠インターネットメッセージフォーマット',
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    'In-Reply-ToおよびReferencesヘッダーによるスレッド化',
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    '受信者ごとに暗号的に分離されたコピーによるBCCプライバシー',
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    'インライン画像用のContent-IDサポート付き複数添付ファイル',
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    '受信トレイ操作：クエリ、フィルター、ソート、ページネーション付き検索',
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    'ゴシップ確認応答による受信者ごとの配信追跡',
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    '複数の暗号化スキーム：ECIES、共有鍵、S/MIME',
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    '送信者認証のためのデジタル署名',
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    'RFC準拠のResent-*ヘッダーによる転送/返信',
  [ShowcaseStrings.Feat_BrightCal_Desc]:
    'BrightMailと統合されたGoogle Calendar競合の共有カレンダーシステム。iCal/CalDAV互換、エンドツーエンド暗号化イベント、細粒度の共有権限、会議予約、競合検出。',
  [ShowcaseStrings.Feat_BrightCal_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_BrightCal_Tech1]: 'iCal/RFC 5545',
  [ShowcaseStrings.Feat_BrightCal_Tech2]: 'CalDAV',
  [ShowcaseStrings.Feat_BrightCal_Tech3]: 'ECIES暗号化',
  [ShowcaseStrings.Feat_BrightCal_Tech4]: 'iTIP/iMIP',
  [ShowcaseStrings.Feat_BrightCal_HL1]:
    'VEVENT、VTODO、VJOURNAL、VFREEBUSYを完全サポートするRFC 5545 iCalendarフォーマット',
  [ShowcaseStrings.Feat_BrightCal_HL2]:
    'Apple Calendar、Thunderbird、Androidとのネイティブ同期のためのCalDAVサーバープロトコル',
  [ShowcaseStrings.Feat_BrightCal_HL3]:
    'オーナーフリーファイルシステムにECIES暗号化ブロックとして保存されるエンドツーエンド暗号化イベント',
  [ShowcaseStrings.Feat_BrightCal_HL4]:
    '細粒度の共有：カレンダーごと・ユーザーごとに空き時間のみ表示、詳細表示、編集、委任',
  [ShowcaseStrings.Feat_BrightCal_HL5]:
    'BrightMail統合とRSVP追跡によるiTIP/iMIPでの会議招待',
  [ShowcaseStrings.Feat_BrightCal_HL6]:
    '共有カレンダー間の空き時間集約による競合検出と空き状況クエリ',
  [ShowcaseStrings.Feat_BrightCal_HL7]:
    '設定可能な空き時間枠、バッファ時間、確認フローを備えた予約ページ',
  [ShowcaseStrings.Feat_BrightCal_HL8]:
    'RRULE、EXDATE、および個別オカレンスのオーバーライド処理による繰り返しイベントサポート',
  [ShowcaseStrings.Feat_BrightCal_HL9]:
    '自動DST処理とイベントごとのタイムゾーン固定によるマルチタイムゾーン表示',
  [ShowcaseStrings.Feat_BrightCal_HL10]:
    'ドラッグ＆ドロップによるリスケジュールとインライン編集を備えた日/週/月/アジェンダUIウィジェット',
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Signal級のエンドツーエンド暗号化を備えたDiscord競合コミュニケーションプラットフォーム。ダイレクトメッセージ、グループチャット、チャンネルにリアルタイムプレゼンス、入力インジケーター、ロールベースの権限を搭載。',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'E2E暗号化',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightChat_Tech3]: '鍵ローテーション',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    '個人間の暗号化会話のためのダイレクトメッセージ',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    '共有暗号化と自動鍵ローテーションによるグループチャット',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'パブリック/プライベート/シークレット/インビジブルの4つの可視性モードを持つチャンネル',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'リアルタイムプレゼンスシステム：オンライン/オフライン/アイドル/DND',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'ロールベースの権限：オーナー/管理者/モデレーター/メンバー',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'WebSocketによる入力インジケーター、リアクション、メッセージ編集',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'チャンネル用の時間制限・使用回数制限付き招待トークン',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'チャンネル履歴内の全文メッセージ検索',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'DMからグループへのシームレスな会話昇格',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    '効率的な暗号化資格情報ストレージのためのVCBLアーキテクチャを備えた1Password競合パスワードキーチェーン。TOTP/2FA、侵害検出、緊急アクセス、主要パスワードマネージャーからのインポートに対応。',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'アイデンティティ',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
  [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
  [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Shamir秘密分散',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    '効率的な暗号化ストレージのためのVCBL（Vault構成ブロックリスト）',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    '複数のエントリタイプ：ログイン、セキュアノート、クレジットカード、アイデンティティ',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    '制約付きの暗号学的に安全なパスワード生成',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    '認証アプリ用QRコード生成によるTOTP/2FAサポート',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'Have I Been Pwned APIによるk-匿名性侵害検出',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'すべてのボールト操作の追記専用暗号化監査ログ',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    'リカバリのためのShamir秘密分散による緊急アクセス',
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'ECIES受信者ごとの暗号化によるマルチメンバーボールト共有',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    '1Password、LastPass、Bitwarden、Chrome、Firefox、KeePass、Dashlaneからのインポート',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'ブラウザ拡張機能オートフィルAPI対応',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'ECDH導出鍵によるPaillier準同型暗号を使用したプライバシー保護型選挙。単純多数決から複雑な順位選択まで15以上の投票方式をサポートし、政府準拠機能を搭載。',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'ガバナンス',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Paillier暗号',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
  [ShowcaseStrings.Feat_BrightVote_Tech3]: '準同型暗号',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'ECDSA/ECDH鍵から準同型鍵を導出するECDH-to-Paillierブリッジ',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    '準同型加算によるプライバシー保護型投票集約',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    '15以上の投票方式：多数決、承認、加重、ボルダ、スコア、順位選択、IRV、STAR、STV、二次投票、コンセンサスなど',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'セキュリティ分類：完全準同型、マルチラウンド、非セキュア',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    '政府準拠：不変監査ログ、公開掲示板、検証可能な受領証',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    '階層的集約：投票区 → 郡 → 州 → 全国',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    'Miller-Rabin素数判定テスト（256ラウンド）による128ビットセキュリティレベル',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'クロスプラットフォーム決定論（Node.jsおよびブラウザ環境）',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    '定数時間演算によるタイミング攻撃耐性',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    '独自のFontAwesomeアイコンマークアップ構文を備えたTwitter競合の分散型ソーシャルネットワーク。投稿、スレッド、DM、コネクションリスト、プライバシーのためのハブ、WebSocketによるリアルタイム通知。',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'リアルタイムメッセージング',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'コネクション管理',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    '280文字制限、マークダウン、FontAwesome用の独自{{icon}}構文を持つ投稿',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    '10レベルのネストと返信階層を持つスレッド会話',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    '関係を整理するためのコネクションリスト、カテゴリ、ハブ',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    '既読確認、入力インジケーター、リアクション付きダイレクトメッセージ',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    '管理者ロール付きグループ会話（最大50人参加）',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    '非フォロワーからの承認/拒否ワークフロー付きメッセージリクエスト',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'スマートグルーピングによるWebSocketリアルタイム通知',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    '通知設定：静かな時間、DNDモード、カテゴリごとの設定',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'フォローリクエスト承認ワークフロー付き保護アカウント',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'コネクションインサイト：強度計算、相互コネクション、提案',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'プライベートグループ共有のためのハブベースのコンテンツ可視性',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'XSS防止とEmoji対応のリッチテキストフォーマット',
  [ShowcaseStrings.Feat_Anonymity_Title]: '仲介匿名性とBrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    '説明責任を維持しながら匿名操作を可能にする高度なプライバシーメカニズム。アイデンティティ情報はShamir秘密分散を使用して暗号化・分割され、BrightTrustの多数決コンセンサスによってのみ再構築可能。',
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'ガバナンス',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: 'Shamir秘密分散',
  [ShowcaseStrings.Feat_Anonymity_Tech2]: '前方誤り訂正',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'BrightTrustコンセンサス',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    '暗号化されたアイデンティティバックアップ付きで匿名投稿',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'アイデンティティシャードが約24人のBrightTrustメンバーに分散',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'アイデンティティ情報の再構築には多数決が必要',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    '時限付き説明責任 — 時効後にデータが失効',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'FISA令状および裁判所命令のための法的準拠メカニズム',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    '失効期間後の永続的プライバシー保護',
  [ShowcaseStrings.Feat_Encryption_Title]: '高度な暗号化スタック',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    '鍵導出のためのECIESとファイルセキュリティのためのAES-256-GCMを組み合わせた最先端の暗号化。BIP39/32認証とSECP256k1楕円曲線暗号を備えた完全な暗号システム。',
  [ShowcaseStrings.Feat_Encryption_Cat]: '暗号技術',
  [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
  [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
  [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'ユーザー固有の鍵導出によるECIES暗号化',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    '認証付きファイル暗号化のためのAES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'BIP39/32ニーモニックベースの認証',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'SECP256k1楕円曲線（Ethereum互換キースペース）',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'XOR機能による検証済みブロックレベルのデータ整合性',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'クロスプラットフォーム暗号操作',
  [ShowcaseStrings.Feat_Storage_Title]: '分散型ストレージネットワーク',
  [ShowcaseStrings.Feat_Storage_Desc]:
    '個人デバイスの未使用ストレージを収益化するP2P分散型ファイルシステム。エネルギー効率の良いProof of Workとレピュテーションベースのインセンティブを備えたIPFS風アーキテクチャ。',
  [ShowcaseStrings.Feat_Storage_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'P2Pネットワーク',
  [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
  [ShowcaseStrings.Feat_Storage_Tech3]: 'ブロックレプリケーション',
  [ShowcaseStrings.Feat_Storage_HL1]:
    '個人のコンピューターやデバイスの未使用ストレージスペースを活用',
  [ShowcaseStrings.Feat_Storage_HL2]:
    '効率的なブロック追跡のための分散ハッシュテーブル（DHT）',
  [ShowcaseStrings.Feat_Storage_HL3]:
    '設定可能なブロック耐久性とアクセシビリティ要件',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'ブロックの有用性とアクセスパターンに基づく動的レプリケーション',
  [ShowcaseStrings.Feat_Storage_HL5]:
    '従来のProof of Workマイニングに代わるエネルギー効率の良い代替手段',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'ノードオペレーターへのストレージクレジットと帯域幅補償',
  [ShowcaseStrings.Feat_Sealing_Title]: 'BrightTrustベースのドキュメントシーリング',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'アクセス復元のためのカスタマイズ可能な閾値要件を備えた高度なドキュメント保護。グループは設定可能な多数決コンセンサスを必要とする機密情報をシールできます。',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'ガバナンス',
  [ShowcaseStrings.Feat_Sealing_Tech1]: '閾値暗号',
  [ShowcaseStrings.Feat_Sealing_Tech2]: '秘密分散',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'マルチパーティ計算',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    '設定可能なクォーラム閾値でドキュメントをシール（例：3-of-5、7-of-10）',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    '信頼されたBrightTrustメンバー間での分散シャードストレージ',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    '閾値に達するまでのセキュリティの数学的保証',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    '法的準拠またはグループ決定のための柔軟なアンシーリング',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    '組織ガバナンスとコンプライアンスワークフローをサポート',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    '自動プライバシー保護のための時間ベースの失効',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'ユーザーのプライバシーとコントロールを保証する高度なアイデンティティ管理。登録エイリアス、匿名投稿、暗号学的アイデンティティ検証をサポート。',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'アイデンティティ',
  [ShowcaseStrings.Feat_BrightID_Tech1]: '公開鍵基盤',
  [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'アイデンティティ管理',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'BIP39/32ニーモニックベースのアイデンティティ生成',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'ユーザーアカウントごとの複数の登録エイリアス',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'オプションのアイデンティティリカバリ付き匿名投稿',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    '公開鍵ベースの認証（SECP256k1）',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'アイデンティティバックアップのための前方誤り訂正',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'プライバシー保護型アイデンティティ検証',
  [ShowcaseStrings.Feat_Reputation_Title]: 'レピュテーション＆エネルギー追跡',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'ジュール単位でエネルギーコストを追跡する革新的なレピュテーションシステム。善良なアクターは最小限のProof of Work要件で済み、悪意あるアクターは増大する計算負荷に直面します。',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Proof of Work',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'レピュテーションシステム',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'エネルギー会計',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    '現実世界との相関のためにジュール単位で測定されるエネルギーコスト',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'ユーザーレピュテーションに基づく動的Proof of Work',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'コンテンツが消費されるとコンテンツ作成者に報酬',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    '悪意あるアクターは増大する計算要件でスロットリング',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'ストレージと帯域幅コストの追跡と補償',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'ポジティブな貢献と質の高いコンテンツにインセンティブ',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'ブロック温度＆ライフサイクル',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    'ホット/コールドストレージ階層によるインテリジェントなブロック管理。頻繁にアクセスされるブロックは高レプリケーションで「ホット」に保たれ、未使用のブロックは冷却して失効する場合があります。',
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'ストレージ',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'ストレージ階層化',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'ブロックライフサイクル',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'アクセスパターン',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    '最小ストレージ期間のための「Keep Until At Least」コントラクト',
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'アクセスによりブロックの有用性が増加し、陳腐化により減少',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'アクセスパターンと温度に基づく動的レプリケーション',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    '頻繁にアクセスされるブロックのコントラクト自動延長',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    '有用であることが証明されたブロックにエネルギークレジットを返還',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    '設定可能な耐久性とアクセシビリティ要件',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'ゼロマイニング廃棄',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    'Ethereumの基盤上に構築されながらもProof of Workの制約なしに設計。すべての計算作業がストレージ、検証、ネットワーク運用という有用な目的に使われます。',
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'ネットワーク',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Ethereumキースペース',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: '効率的コンセンサス',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'グリーンブロックチェーン',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    '無駄なマイニングなし — すべての計算が有用な目的に使われます',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Ethereum互換キースペースと暗号技術（SECP256k1）',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Proof of Workはトランザクションスロットリングにのみ使用',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'エネルギー効率の良いコンセンサスメカニズム',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    '環境への影響のない持続可能なブロックチェーン',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    '人工的希少性ではなくストレージと計算に焦点',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'クロスプラットフォーム決定論',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Node.jsとブラウザ環境で同一の暗号操作。決定論的鍵生成によりプラットフォームに関係なく一貫した結果を保証。',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: '暗号技術',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'ブラウザ暗号',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: '決定論的アルゴリズム',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'プラットフォーム間で統一された暗号操作',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    '決定論的ランダムビット生成（HMAC-DRBG）',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'ECDH鍵からの一貫したPaillier鍵導出',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'ブラウザとNode.jsの互換性',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    '再現可能な暗号結果',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'クロスプラットフォームテストと検証',
  [ShowcaseStrings.Feat_Contracts_Title]: 'デジタルコントラクト＆ガバナンス',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    '分散型アプリケーションのためのスマートコントラクト機能。ネットワーク決定とポリシー施行のための設定可能な投票閾値を備えたBrightTrustベースのガバナンス。',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'ガバナンス',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'スマートコントラクト',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'ガバナンス',
  [ShowcaseStrings.Feat_Contracts_Tech3]: '投票システム',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    '分散型ネットワーク上でのデジタルコントラクト実行',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'ネットワークガバナンスのためのBrightTrustベースの意思決定',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    '異なるアクションに対する設定可能な多数決要件',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'プライバシー保護型ガバナンスのための準同型投票',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'レピュテーション加重投票メカニズム',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    '透明で監査可能なガバナンスプロセス',
  [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js（フォーク）',
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    '安全なデータ分割と再構築のためのShamir秘密分散の強化実装。ネイティブブラウザサポート付きの純粋TypeScriptで、暗号監査済み、パスワード・鍵・ファイルなどあらゆる秘密を閾値回復可能なシェアに分割するために最適化。',
  [ShowcaseStrings.Feat_SecretsJS_Cat]: '暗号技術',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: 'Shamir秘密分散',
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'データセキュリティ',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    '設定可能なt-of-n閾値回復で秘密をnシェアに分割',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    '情報理論的に安全 — 閾値未満のシェアは情報を一切漏洩しません',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Cure53セキュリティ監査（2019年7月）で問題ゼロ',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'ポリフィル不要のネイティブブラウザサポート（crypto.getRandomValues）',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'クロスプラットフォーム決定論的操作（Node.jsおよびブラウザ）',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    '包括的な型定義による完全なTypeScriptサポート',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    '自動パディング付きでパスワード、ファイル、鍵をhexに変換',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    '既存のシェアから動的に新しいシェアを生成',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    '設定可能なガロア体（3-20ビット）で最大1,048,575シェアをサポート',
  [ShowcaseStrings.Feat_Burnbag_Desc]:
    'ゼロ知識の安全なストレージと自動フェイルセーフプロトコル。暗号学的消去によりレシピ（マップ＋鍵）を破壊し、散在する暗号化ブロックをトリガー時に永久に復元不可能にします。',
  [ShowcaseStrings.Feat_Burnbag_Cat]: '暗号技術',
  [ShowcaseStrings.Feat_Burnbag_Tech1]: '暗号学的消去',
  [ShowcaseStrings.Feat_Burnbag_Tech2]: 'デッドマンスイッチ',
  [ShowcaseStrings.Feat_Burnbag_Tech3]: 'カナリアプロトコル',
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    'ゼロ知識アーキテクチャ：通常の状況ではサービスプロバイダーがユーザーデータにアクセスできません',
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    '暗号学的消去：レシピの破壊により散在するブロックが永久に復元不可能になります',
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    'デッドマンスイッチ：ハートビート監視により非活動時にレシピの自動破壊をトリガーします',
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    'カナリアプロトコル：サードパーティAPI監視（Twitter、Fitbit、Google、GitHub）を備えたルールエンジン',
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    '脅迫検出：特別な脅迫コードが通常のアクセスの代わりに破壊プロトコルをトリガーします',
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    '設定可能なプロトコルアクション：ファイル削除、データ配布、公開開示、またはカスタム応答',
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    'デュアルキーアーキテクチャ：ユーザー管理のBIP39鍵とプロトコル実行用のオプションのシステムエスクロー鍵',
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    '承継クォーラム：安全なデータ公開または復旧のための事前承認された信頼できる連絡先',
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    '読み取り時変異：レシピへの不正アクセスが永久的で不変の台帳変異をトリガーします',
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    '設定可能な信頼レベル：ゼロトラスト、条件付き信頼、またはファイル感度ごとのハイブリッド',
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    '多言語サポート：英語、フランス語、スペイン語、ウクライナ語、中国語（普通話）',
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    'secp256k1鍵とAES-256-GCMによるECIES暗号化でファイルセキュリティを確保',

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    'BrightChain暗号技術で構築された患者所有の電子カルテ。あなたの健康データはあなたのもの——暗号化、分散化され、あなたの鍵でのみアクセス可能。',
  [ShowcaseStrings.Feat_BrightChart_Cat]: 'アイデンティティ',
  [ShowcaseStrings.Feat_BrightChart_Tech1]: 'オーナーフリーEMR',
  [ShowcaseStrings.Feat_BrightChart_Tech2]: 'エンドツーエンド暗号化',
  [ShowcaseStrings.Feat_BrightChart_Tech3]: '患者制御アクセス',
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    '患者が暗号鍵を通じてすべての医療記録を所有・管理',
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    'BrightChainに保存されたエンドツーエンド暗号化健康データ——侵害される中央サーバーなし',
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    '細粒度の同意：BrightTrust委任を使用して特定の記録をプロバイダーと共有',
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    'すべてのアクセス、編集、共有イベントの不変監査証跡',
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    'プロバイダー間で移植可能——ベンダーロックインなし、データの人質なし',
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    '設定可能な定足数によるShamir秘密分散を使用した緊急アクセス',
  [ShowcaseStrings.Feat_BrightChart_HL7]:
    '暗号学的整合性検証付きのバージョン管理された病歴',
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    'プロバイダー署名のエントリが診断と処方の真正性を保証',
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    'オフライン対応：暗号化された記録をローカルにキャッシュし、接続時に同期',
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    '保証された破壊が必要な機密記録のためのデジタルバーンバッグ内蔵',
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    'FHIR互換の健康記録交換のために設計された相互運用可能なデータレイヤー',
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    'ゼロ知識証明により、完全な病歴を公開せずに保険検証が可能',

  // Remaining
  [ShowcaseStrings.Soup_Time]: '時間',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'ファイルの取得に失敗しました：{ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: '.cblファイルをアップロードしてください',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    'CBLが読み込まれました！ファイル：{NAME}（{BLOCKS}ブロック）。すべてのブロックがスープにあれば、ファイルを取得できます。',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'CBLの解析に失敗しました：{ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    'ファイルの再構築に成功しました！サイズ：{SIZE}バイト。ファイルがダウンロードされました。',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'マグネットURLの処理に失敗しました：{ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: 'メッセージが送信され、スープに保存されました！',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'メッセージの送信に失敗しました：{ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'スープからメッセージを取得しました：{TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'メッセージの取得に失敗しました：{ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: 'マグネットURLがクリップボードにコピーされました！',
  [ShowcaseStrings.Anim_PauseBtn]: 'アニメーションを一時停止',
  [ShowcaseStrings.Anim_PlayBtn]: 'アニメーションを再生',
  [ShowcaseStrings.Anim_ResetBtn]: 'アニメーションをリセット',
  [ShowcaseStrings.Anim_SpeedLabel]: '速度：{SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 パフォーマンスモニター',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'フレームレート：',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'フレーム時間：',
  [ShowcaseStrings.Anim_PerfDropped]: 'ドロップフレーム：',
  [ShowcaseStrings.Anim_PerfMemory]: 'メモリ：',
  [ShowcaseStrings.Anim_PerfSequences]: 'シーケンス：',
  [ShowcaseStrings.Anim_PerfErrors]: 'エラー：',
  [ShowcaseStrings.Anim_WhatHappening]: '実行中の処理：',
  [ShowcaseStrings.Anim_DurationLabel]: '所要時間：',
  [ShowcaseStrings.Anim_SizeInfo]: 'サイズ：{SIZE}バイト | ブロック：{BLOCKS}',

  // Educational/Encoding
  [ShowcaseStrings.Edu_CloseTooltip]: 'ツールチップを閉じる',
  [ShowcaseStrings.Edu_WhatsHappening]: '🔍 何が起きているか',
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 なぜ重要か',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ 技術的詳細',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 関連概念',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ 視覚的手がかり',
  [ShowcaseStrings.Edu_GetHelp]: 'このステップのヘルプを取得',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ 理解しました - 続行',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ このステップをスキップ',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 BrightChain概念用語集',
  [ShowcaseStrings.Edu_CloseGlossary]: '用語集を閉じる',
  [ShowcaseStrings.Edu_BackToGlossary]: '← 用語集に戻る',
  [ShowcaseStrings.Edu_Definition]: '定義',
  [ShowcaseStrings.Edu_TechnicalDefinition]: '技術的定義',
  [ShowcaseStrings.Edu_Examples]: '例',
  [ShowcaseStrings.Edu_RelatedTerms]: '関連用語',
  [ShowcaseStrings.Edu_SearchPlaceholder]: '概念を検索...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'プロセス概要',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: '達成したこと',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: '技術的成果',
  [ShowcaseStrings.Edu_WhatsNext]: '次は何？',
  [ShowcaseStrings.Edu_LearningProgress]: '学習進捗',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED}/{TOTAL}ステップ完了',
  [ShowcaseStrings.Enc_Title]: '🎬 ファイルエンコーディングアニメーション',
  [ShowcaseStrings.Enc_Subtitle]:
    'ファイルがBrightChainブロックに変換される様子をご覧ください',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 ファイルチャンク（{COUNT}）',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    '各チャンクはスープ内の1ブロックになります',
  [ShowcaseStrings.Enc_EduWhatsHappening]: '🎓 今何が起きているか',
  [ShowcaseStrings.Enc_TechDetails]: '技術的詳細：',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'ブロックサイズ：{SIZE}バイト',
  [ShowcaseStrings.Enc_ExpectedChunks]: '予想チャンク数：{COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    '各チャンクはスープ内の1ブロックになります',
  [ShowcaseStrings.Enc_WhyPadding]: 'なぜパディングが必要？',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'すべてのブロックは同じサイズでなければなりません',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'ランダムパディングがデータ分析を防止します',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'パディングは再構築時に除去されます',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'チェックサムの目的：',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'データの整合性を保証します',
  [ShowcaseStrings.Enc_UniqueIdentifier]: '一意のブロック識別子として使用されます',
  [ShowcaseStrings.Enc_EnablesVerification]:
    '取得時の検証を可能にします',

  // ProcessCompletionSummary
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 重要な学習ポイント',
  [ShowcaseStrings.Edu_CloseSummary]: 'サマリーを閉じる',
  [ShowcaseStrings.Edu_Overview]: '概要',
  [ShowcaseStrings.Edu_Achievements]: '達成事項',
  [ShowcaseStrings.Edu_Technical]: '技術',
  [ShowcaseStrings.Edu_NextSteps]: '次のステップ',
  [ShowcaseStrings.Edu_Previous]: '← 前へ',
  [ShowcaseStrings.Edu_Next]: '次へ →',
  [ShowcaseStrings.Edu_Finish]: '完了',

  // EducationalModeControls
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 教育モード',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'アニメーション速度：',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x（非常に遅い）',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x（遅い）',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x（普通）',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x（通常）',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x（速い）',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x（非常に速い）',
  [ShowcaseStrings.Edu_StepByStep]: 'ステップバイステップモード',
  [ShowcaseStrings.Edu_ShowTooltips]: 'ツールチップを表示',
  [ShowcaseStrings.Edu_ShowExplanations]: '説明を表示',
  [ShowcaseStrings.Edu_AutoAdvance]: 'ステップを自動進行',

  // Privacy Policy Page
  [ShowcaseStrings.PP_Title]: 'プライバシーポリシー',
  [ShowcaseStrings.PP_LastUpdated]: '最終更新日：2026年4月20日',
  [ShowcaseStrings.PP_BackToHome]: '← ホームに戻る',

  // Section 1: Introduction
  [ShowcaseStrings.PP_S1_Title]: '1. はじめに',
  [ShowcaseStrings.PP_S1_P1]:
    'BrightChainは、501(c)(3)非営利団体であるDigital Defiance（「当社」）が運営するオープンソースの分散型プラットフォームです。本プライバシーポリシーは、BrightChainプラットフォーム、ウェブサイト、アプリケーション、および関連サービス（総称して「サービス」）をご利用の際に、当社がどのように情報を収集、使用、保存、開示するかを説明します。',
  [ShowcaseStrings.PP_S1_P2]:
    'サービスにアクセスまたは使用することにより、お客様は本プライバシーポリシーを読み、理解し、これに拘束されることに同意したものとみなされます。同意されない場合は、サービスを使用しないでください。',

  // Section 2: How BrightChain Works
  [ShowcaseStrings.PP_S2_Title]:
    '2. BrightChainの仕組み — アーキテクチャの背景',
  [ShowcaseStrings.PP_S2_P1]:
    'BrightChainは、オーナーフリーファイルシステム（OFF）モデルに基づいて構築されています。ネットワークに保存されるすべてのデータは固定サイズのブロックに分割され、暗号学的にランダムなブロックとXOR演算（「TUPLEホワイトニング」と呼ばれるプロセス）が行われ、参加ノード間に分散されます。その結果：',
  [ShowcaseStrings.PP_S2_Li1]:
    '個々のブロックはランダムデータと区別がつかず、構成ブロックの完全なセットと対応する構成ブロックリスト（CBL）がなければ読み取ることができません。',
  [ShowcaseStrings.PP_S2_Li2]:
    'データはオプションで楕円曲線統合暗号化方式（ECIES）とAES-256-GCMを使用して暗号化でき、TUPLEホワイトニングによる合理的否認性に加えて、受信者ごとの機密性を提供します。',
  [ShowcaseStrings.PP_S2_Li3]:
    'ノードオペレーター（Digital Defianceを含む）は、一般的にネットワークに保存された個々のブロックの内容、所有権、または性質を判断することができません。',
  [ShowcaseStrings.PP_S2_P2]:
    'このアーキテクチャは、本ポリシーに記載されているプライバシー保護が、多くの場合、ポリシーだけでなく数学によって強制されることを意味します。',

  // Section 3: Information We Collect
  [ShowcaseStrings.PP_S3_Title]: '3. 当社が収集する情報',
  [ShowcaseStrings.PP_S3_1_Title]: '3.1 アカウント情報',
  [ShowcaseStrings.PP_S3_1_P1]:
    'BrightChainアカウントを作成する際、ユーザー名、メールアドレス、および公開暗号鍵（BIP39ニーモニックから派生）を収集します。ニーモニックフレーズや秘密鍵は収集、保存、またはアクセスしません。',
  [ShowcaseStrings.PP_S3_2_Title]: '3.2 ユーザー生成コンテンツ',
  [ShowcaseStrings.PP_S3_2_P1]:
    'ネットワークに保存するファイル、メッセージ、資格情報、その他のコンテンツは、TUPLEホワイトニングされたブロックに分割されます。当社にはこのコンテンツを読み取り、再構築、または検査する能力がありません。オプションのECIES暗号化を使用する場合、コンテンツは特定の受信者向けにさらに暗号化され、対応する秘密鍵がなければ当社を含む誰もアクセスできません。',
  [ShowcaseStrings.PP_S3_3_Title]: '3.3 自動的に収集される情報',
  [ShowcaseStrings.PP_S3_3_P1]:
    '当社のウェブベースのサービスとやり取りする際、IPアドレス、ブラウザの種類、参照URL、訪問したページ、タイムスタンプなどの標準的なサーバーログデータを自動的に収集する場合があります。この情報は運用目的（セキュリティ監視、不正使用防止、サービスの信頼性）のみに使用され、90日以内に保持されます。',
  [ShowcaseStrings.PP_S3_4_Title]: '3.4 ブロックチェーン台帳エントリ',
  [ShowcaseStrings.PP_S3_4_P1]:
    '特定の操作（ボールト作成、ボールト読み取り、ボールト破棄、ガバナンス投票）は、追記専用のブロックチェーン台帳に記録されます。これらのエントリには、操作タイプ、タイムスタンプ、暗号ハッシュが含まれますが、基礎データの内容は含まれません。台帳エントリは設計上不変であり、削除できません。',

  // Section 4: How We Use Information
  [ShowcaseStrings.PP_S4_Title]: '4. 情報の使用方法',
  [ShowcaseStrings.PP_S4_P1]: '当社は収集した情報を以下の目的で使用します：',
  [ShowcaseStrings.PP_S4_Li1]: 'サービスの提供、維持、改善',
  [ShowcaseStrings.PP_S4_Li2]: 'ユーザーの認証とアカウント管理',
  [ShowcaseStrings.PP_S4_Li3]: '詐欺、不正使用、セキュリティインシデントの検出と防止',
  [ShowcaseStrings.PP_S4_Li4]: '適用される法的義務の遵守',
  [ShowcaseStrings.PP_S4_Li5]:
    'サービスに関するお客様とのコミュニケーション（例：サービスのお知らせ、セキュリティアラート）',
  [ShowcaseStrings.PP_S4_P2]:
    '当社はお客様の個人情報を第三者に販売、貸与、または取引しません。お客様のデータを広告やプロファイリングに使用しません。',

  // Section 5: Data Storage and Security
  [ShowcaseStrings.PP_S5_Title]: '5. データの保存とセキュリティ',
  [ShowcaseStrings.PP_S5_P1]:
    'ユーザー生成コンテンツは、分散型ネットワーク全体に分散されたTUPLEホワイトニングブロックとして保存されます。アカウントメタデータ（ユーザー名、メール、公開鍵）は、保存時および転送時の暗号化を含む業界標準のセキュリティ対策を備えた運用データベースに保存されます。',
  [ShowcaseStrings.PP_S5_P2]:
    'データがホワイトニングされたブロックとして保存されネットワークに分散されると、他の参加者のデータがXORホワイトニングプロセスを通じて同じブロックに依存する場合があります。これは、個々のブロックを削除すると他のユーザーのデータに影響を与える可能性があるため、技術的に不可能な場合があることを意味します。ただし、ファイルの再構築にはConstituent Block List（CBL）——ブロック識別子の順序付きレシピ——が必要です。CBLがなければ、分散ブロックは計算上ランダムデータと区別がつかず、再組み立てできません。CBLを削除または破壊するだけで、基礎となるデータを永久にアクセス不能にすることができます。',
  [ShowcaseStrings.PP_S5_P3]:
    'CBLはアプリケーションに応じてさまざまな場所に保存される場合があります。Digital BurnbagはBrightDBに裏付けられたボールトシステム内にCBLを保存します。ユーザーはMagnetURL参照としてCBLを保持することもできます。すべての場合において、CBLの破壊——保存場所に関係なく——が、基礎となるブロックがネットワーク上に残存していても、データ消去の有効なメカニズムです。',

  // Section 6: Cryptographic Protections
  [ShowcaseStrings.PP_S6_Title]: '6. 暗号保護と制限',
  [ShowcaseStrings.PP_S6_P1]:
    'BrightChainは、SHA3-512ハッシュ、secp256k1を使用したECIES、AES-256-GCM対称暗号化、HMAC-SHA3-512シール、プライバシー保護投票のためのPaillier準同型暗号化を含む強力な暗号保護を採用しています。これらの保護はプロトコルによって強制され、当社の協力や善意に依存しません。',
  [ShowcaseStrings.PP_S6_P2]:
    '正しく使用すれば、BrightChainは非常に強力なプライバシー保護を提供できます。ただし、特定の暗号アルゴリズムが無期限に安全であり続けることを保証するものではありません。コンピューティングの進歩（量子コンピューティングを含む）は、現在の暗号プリミティブのセキュリティに影響を与える可能性があります。ユーザーは、利用可能な保護を理解し、それに応じてサービスの使用を設定する責任があります。',

  // Section 7: Law Enforcement
  [ShowcaseStrings.PP_S7_Title]: '7. 法執行機関と法的要請',
  [ShowcaseStrings.PP_S7_P1]:
    'Digital Defianceはネットワークキャリアおよびインフラストラクチャプロバイダーとして運営しています。技術的に実行可能な範囲で、管轄裁判所が発行した召喚状、裁判所命令、捜索令状を含む有効な法的手続きに従います。',
  [ShowcaseStrings.PP_S7_P2]:
    'ただし、BrightChainのアーキテクチャ設計により：',
  [ShowcaseStrings.PP_S7_Li1]:
    'TUPLEホワイトニングされたブロックとして保存されたユーザー生成データの内容は、そのデータを再構築または復号するために必要なCBLまたは復号鍵を保有していないため、一般的に提供できません。',
  [ShowcaseStrings.PP_S7_Li2]:
    'アカウントメタデータ（ユーザー名、メール、公開鍵）およびサーバーログデータは、保持している範囲で提供できます。',
  [ShowcaseStrings.PP_S7_Li3]:
    'ブロックチェーン台帳エントリは不変であり、有効な法的手続きに応じて提供される場合があります。',
  [ShowcaseStrings.PP_S7_Li4]:
    'Digital Burnbagボールトが暗号学的に破棄された場合、破棄証明が唯一の残存アーティファクトです。これはデータが消失したことを証明するものであり、データの内容を証明するものではありません。',
  [ShowcaseStrings.PP_S7_P3]:
    '法律で許可される範囲で、影響を受けるユーザーに法的要請について通知します。過度に広範、法的に不十分、またはその他不適切と考える法的要請に異議を申し立てる権利を留保します。',

  // Section 8: Brokered Anonymity
  [ShowcaseStrings.PP_S8_Title]: '8. 仲介匿名性',
  [ShowcaseStrings.PP_S8_P1]:
    'BrightChainは「仲介匿名性」プロトコルをサポートしており、ユーザーの実際の身元をShamirの秘密分散を使用して封印し、BrightTrustガバナンスメンバー間に分散できます。身元の回復にはBrightTrustメンバーの閾値投票が必要であり、設定可能な時効の対象となります。時効後、身元の断片は永久に削除され、実際の身元は回復不能になります。このメカニズムは、集団ガバナンスの下でプライバシーと説明責任のバランスを取るように設計されています。',

  // Section 9: Third-Party Services
  [ShowcaseStrings.PP_S9_Title]: '9. サードパーティサービス',
  [ShowcaseStrings.PP_S9_P1]:
    '特定の機能（カナリアプロトコルのアクティビティ監視など）は、サードパーティサービス（GitHub、Fitbit、Slackなど）と統合される場合があります。これらの統合の使用は、それぞれのサードパーティのプライバシーポリシーに準拠します。要求された機能を提供するために必要な最小限の情報のみにアクセスし（例：デッドマンスイッチ監視のための最近のアクティビティタイムスタンプ）、サードパーティの資格情報をサーバーに保存しません。認証はいつでも取り消し可能なOAuthトークンを介して処理されます。',

  // Section 10: Children's Privacy
  [ShowcaseStrings.PP_S10_Title]: '10. 子供のプライバシー',
  [ShowcaseStrings.PP_S10_P1]:
    'サービスは13歳未満の子供（またはお客様の管轄区域で適用されるデジタル同意年齢）を対象としていません。子供から故意に個人情報を収集することはありません。子供の個人情報を収集したことが判明した場合、速やかにその情報を削除する措置を講じます。',

  // Section 11: International Users
  [ShowcaseStrings.PP_S11_Title]: '11. 海外ユーザー',
  [ShowcaseStrings.PP_S11_P1]:
    'Digital Defianceは米国に拠点を置いています。米国外からサービスにアクセスする場合、お客様の情報は米国または当社のインフラストラクチャが運用されている他の管轄区域に転送、保存、処理される場合があります。サービスを使用することにより、そのような転送と処理に同意したものとみなされます。',
  [ShowcaseStrings.PP_S11_1_Title]:
    '11.1 欧州経済領域（EEA）および英国',
  [ShowcaseStrings.PP_S11_1_P1]:
    'EEAまたは英国にお住まいの場合、一般データ保護規則（GDPR）または英国GDPRに基づく権利を有する場合があります。これには、個人データへのアクセス、訂正、消去、処理の制限、ポータビリティの権利、および処理に異議を唱える権利が含まれます。これらの権利を行使するには、以下の住所までお問い合わせください。特定のデータ（ブロックチェーン台帳エントリ、分散TUPLEブロック）は、システムの分散型で不変の性質により、技術的に消去が不可能な場合があることにご注意ください。BrightChainの証明可能な破棄機能（Digital Burnbagを介して）は、ユーザー管理データのGDPR第17条消去権コンプライアンスをサポートするように設計されています。',

  // Section 12: Data Retention
  [ShowcaseStrings.PP_S12_Title]: '12. データ保持',
  [ShowcaseStrings.PP_S12_P1]:
    'アカウントメタデータは、アカウントがアクティブである限り、またはサービスの提供に必要な限り保持されます。サーバーログは最大90日間保持されます。ブロックチェーン台帳エントリは、不変台帳の一部として無期限に保持されます。TUPLEホワイトニングされたブロックは、ストレージ契約条件とエネルギーバランス経済に従ってネットワーク上に保持されます。ストレージ契約が期限切れで更新されないブロックは、ノードによってガベージコレクションされる場合があります。',

  // Section 13: Disclaimer
  [ShowcaseStrings.PP_S13_Title]: '13. 保証の免責および責任の制限',
  [ShowcaseStrings.PP_S13_P1]:
    'サービスは、商品性、特定目的への適合性、権原、および非侵害の黙示的保証を含むがこれに限定されない、明示的、黙示的、または法定のいかなる種類の保証もなく、「現状のまま」および「利用可能な状態で」提供されます。',
  [ShowcaseStrings.PP_S13_P2]:
    'DIGITAL DEFIANCE、その役員、取締役、従業員、ボランティア、および貢献者（JESSICA MULEINを含む）は、（A）サービスへのアクセスもしくは使用またはアクセスもしくは使用の不能、（B）サービス上の第三者の行為またはコンテンツ、（C）サービスから取得したコンテンツ、（D）お客様の送信またはコンテンツへの不正アクセス、使用、または改変、または（E）暗号メカニズムの障害に起因する間接的、付随的、特別、結果的、または懲罰的損害、または利益、データ、使用、のれん、またはその他の無形の損失について、保証、契約、不法行為（過失を含む）、またはその他の法理論に基づくかどうかにかかわらず、そのような損害の可能性について通知されていたかどうかにかかわらず、責任を負いません。',
  [ShowcaseStrings.PP_S13_P3]:
    'いかなる場合も、サービスに関連するすべての請求に対するDIGITAL DEFIANCEおよびその役員、取締役、従業員、ボランティア、および貢献者の総責任は、100米ドル（100.00米ドル）または請求に先立つ12か月間にお客様が当社に支払った金額のいずれか大きい方を超えないものとします。',
  [ShowcaseStrings.PP_S13_P4]:
    '一部の管轄区域では、特定の保証または責任の除外または制限が認められていません。そのような管轄区域では、当社の責任は法律で許可される最大限の範囲に制限されます。',

  // Section 14: Indemnification
  [ShowcaseStrings.PP_S14_Title]: '14. 補償',
  [ShowcaseStrings.PP_S14_P1]:
    'お客様は、サービスへのアクセスまたは使用、本プライバシーポリシーの違反、または適用法もしくは第三者の権利の違反に起因するまたは何らかの形で関連するすべての請求、責任、損害、損失、費用、および経費（合理的な弁護士費用を含む）について、Digital Defiance、その役員、取締役、従業員、ボランティア、および貢献者（Jessica Muleinを含む）を補償し、防御し、免責することに同意します。',

  // Section 15: Governing Law
  [ShowcaseStrings.PP_S15_Title]: '15. 準拠法および紛争解決',
  [ShowcaseStrings.PP_S15_P1]:
    '本プライバシーポリシーは、法の抵触に関する規定にかかわらず、米国ワシントン州の法律に準拠し、これに従って解釈されます。本プライバシーポリシーまたはサービスに起因するまたは関連する紛争は、ワシントン州キング郡に所在する州または連邦裁判所で排他的に解決されるものとし、お客様はそのような裁判所の対人管轄権に同意します。',

  // Section 16: Open Source
  [ShowcaseStrings.PP_S16_Title]: '16. オープンソース',
  [ShowcaseStrings.PP_S16_P1_Before]:
    'BrightChainはオープンソースソフトウェアです。ソースコードは以下で公開されています：',
  [ShowcaseStrings.PP_S16_P1_LinkText]:
    'github.com/Digital-Defiance/BrightChain',
  [ShowcaseStrings.PP_S16_P1_After]:
    '。本ポリシーに記載されているプライバシー特性を検証するためにコードを確認することをお勧めします。本書に記載されている暗号保護はコードベースに実装されており、検査によって検証可能です。',

  // Section 17: Changes
  [ShowcaseStrings.PP_S17_Title]: '17. 本ポリシーの変更',
  [ShowcaseStrings.PP_S17_P1]:
    '当社は本プライバシーポリシーを随時更新する場合があります。重要な変更については、改訂された「最終更新日」とともに更新されたポリシーをサービスに掲載してお知らせします。変更の発効日以降もサービスを継続して使用することは、改訂されたポリシーへの同意を構成します。',

  // Section 18: Contact
  [ShowcaseStrings.PP_S18_Title]: '18. お問い合わせ',
  [ShowcaseStrings.PP_S18_P1]:
    '本プライバシーポリシーについてご質問がある場合、またはデータ保護の権利を行使したい場合は、以下までご連絡ください：',
  [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
  [ShowcaseStrings.PP_S18_EmailLabel]: 'メール：',
  [ShowcaseStrings.PP_S18_WebLabel]: 'ウェブ：',
};

export default ShowcaseJapaneseStrings;
