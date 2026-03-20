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
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'トップシークレット dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChatのロゴ',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHubのロゴ',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightIDのロゴ',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMailのロゴ',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPassのロゴ',

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
  [ShowcaseStrings.FAQ_Ohm_Character]: 'オームキャラクター',
  [ShowcaseStrings.FAQ_Volta_Character]: 'ボルタキャラクター',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: '{MODE}FAQに切り替え',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain FAQ',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'BrightChainユニバース',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'オーナーフリーファイルシステムの進化的後継者',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'マスコット、ミッション、エコシステムを紹介',
  [ShowcaseStrings.FAQ_Toggle_Technical]: '技術',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'エコシステム',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Ohmが詳細を守る',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Voltaがビジョンを明かす',
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
  [ShowcaseStrings.FAQ_Tech_Q9_Quorum_Label]: 'クォーラム',
  [ShowcaseStrings.FAQ_Tech_Q9_Quorum]:
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
  [ShowcaseStrings.FAQ_Tech_Q10_QuorumBasedAccess_Label]:
    'クォーラムベースのアクセス',
  [ShowcaseStrings.FAQ_Tech_Q10_QuorumBasedAccess]:
    '特定のデータベースやコレクションへのアクセスはクォーラムによって管理でき、承認された署名者からの暗号的承認が必要です。',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'なぜ重要か',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    'ほとんどのdAppは「重い」データを中央集権サーバーに保存するため苦戦しています。BrightDBはデータを分散型、オーナーフリー、高性能に保ちます——従来のWebアプリと同じくらい高速でありながら、ブロックチェーンと同じくらい安全な、真にサーバーレスなアプリケーションを可能にします。',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    '11. BrightChainと共にローンチしたdAppは何ですか？',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChainは、中央集権的なデータ収集サービスを安全で主権的な代替手段に置き換えるために設計されたコア「Bright-Apps」スイートと共にローンチしました。',
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
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Quorums_Label]: 'クォーラムの力',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Quorums]:
    'モデレーションは企業の「セーフティチーム」によって処理されません。代わりに、コミュニティはガバナンスクォーラムによって統治されます。ルールは暗号的に施行され、コミュニティ基準は準同型投票を通じて投票され、グループのデジタルスペースが真に「オーナーフリー」で自己決定的であることを保証します。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: 'ゼロ知識ボールト',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    'ボールトが分散暗号化ブロックとして存在するパスワードとアイデンティティ管理システム。アクセスはBIP39ニーモニックによって管理され、すべての資格情報の変更はBrightDBを通じてバージョン管理され検証可能です。',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'レジリエントコミュニティ',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    '永続的なチャンネル、音声、メディア共有を備えたリアルタイムコミュニケーションプラットフォーム。コミュニティガバナンスはクォーラムを通じて管理され、GPU加速リカバリによりチャット履歴が失われることはありません。',
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Title]: 'トップシークレット',
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Text]:
    'リリース時に登場するトップシークレットdAppは、あなたが知っているすべてを変え、ゲームを完全に覆すでしょう。',

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

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: '経済',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ ジュールとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'ジュールはBrightChainのエネルギー単位です——投機的な暗号通貨ではなく、実際の作業と貢献の尺度です。視覚的には、ゲームのコインのように流れ、蓄積し、消耗する小さなネオンブルーの稲妻トークンです。Voltaがそれらを生成し、Ohmがゲートを通じてフローを調整し、操作がそれらを消費します。BrightChainのすべてのアクションにはジュールコストがあります——ほぼゼロのメタデータ名前変更から百万ジュールのフルサイクル再暗号化まで。ユーザーはWork-for-Workモデルを通じてジュールを獲得します：ネットワークにストレージまたは計算を提供すれば、それを使用する能力を獲得します。UIのジュールメーターはエネルギー予算を表示し、小さなスパークがVoltaからOhmのゲートを通じて操作に流れるのが見えます。',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 ススとは何ですか？',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'ススはすべての操作の目に見える結果——デジタルアクションの「カーボンフットプリント」です。使う通貨ではありません；避けられないコストです。エネルギーが消費されるたびに、ススが生成されます——時間とともに蓄積する計算作業の視覚的表現です。やればやるほど、ススが蓄積します。軽い使用はあちこちに痕跡を残します；ヘビーユースは目に見える蓄積を生み出します。ススはBrightChainエコシステムにおけるカルマを表しています：すべてのアクションは痕跡を残します。Ohmの言葉で：「Voltaがエネルギーを与え、操作がそれを熱に変え、システムが結果を追跡する。私はただ必要以上に無駄にしないようにするだけだ。」',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: '全体像',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    '🌐 すべてはどのように組み合わさりますか？',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'エコシステムはVolta（消費者）とOhm（節約者）の間の動的な緊張で動き、ジュールがエネルギー通貨として両者の間を流れます。Voltaはすべての操作をフルパワーで動かすことに熱心で、Ohmはリソースが無駄にならないようにします。すべてのアクションはジュールを消費し、ススを生成します——計算作業の目に見える痕跡です。操作が発動すると、Voltaがジュールに手を伸ばし、Ohmがコストを評価して渋々通し、システムが結果のススを追跡します。これにより、貢献が容量に等しく、すべてのアクションがネットワークに痕跡を残す自己バランス経済が生まれます。',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]:
    '🧘 BrightChainは何を信じていますか？',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'エネルギーは保存されます。行動には結果があります。データには重さがあります。BrightChainエコシステムのすべての要素はより深い原則にマッピングされます：Voltaはスパーク——純粋で混沌としたポテンシャルと行動への欲求。Ohmはアンカー——根を張った知恵と正しく行動する規律。ジュールはフロー——両者の間を移動するスピリット。ススはカルマ——避けられない目に見えるコスト。一緒に閉じたループを形成します：Voltaがエネルギーを提供し、Ohmがそれが賢く使われることを保証し、システムがすべての結果を追跡します。無料のものはありません。無駄にされるものはありません。すべてが痕跡を残します。',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 マスコットはどこで見られますか？',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    'マスコットはプロダクト体験全体に織り込まれています。VoltaとOhmはプラットフォーム全体のジュールメーターに住んでおり、Voltaがエネルギーゲージの近くでパチパチと音を立て、Ohmが高コストの操作中に介入して抵抗瞑想を行います——プログレスバーをネオンブルーから落ち着いたアンバーに変えます。ススはセッション中に目に見えて蓄積し、行われている計算作業を反映します。近日公開：エラーページ、ローディング画面、操作の重大度に応じたスケールの確認ダイアログでのマスコット登場、そしてはい——グッズも。',

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
  [ShowcaseStrings.Comp_VP_Quorum_Title]: '🔒 クォーラムガバナンス',
  [ShowcaseStrings.Comp_VP_Quorum_Desc]:
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
  [ShowcaseStrings.About_Title_By]: 'by Digital Defiance',
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
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
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
  [ShowcaseStrings.Ledger_Quorum]: 'クォーラム',
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
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Brokered Anonymity & Quorum',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    "Sophisticated privacy mechanism enabling anonymous operations while maintaining accountability. Identity information encrypted and split using Shamir's Secret Sharing, reconstructable only through majority quorum consensus.",
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: "Shamir's Secret Sharing",
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Forward Error Correction',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'Quorum Consensus',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Post anonymously with encrypted identity backup',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Identity shards distributed across ~24 quorum members',
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
  [ShowcaseStrings.Feat_Sealing_Title]: 'Quorum-Based Document Sealing',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Advanced document protection with customizable threshold requirements for access restoration. Groups can seal sensitive information requiring configurable majority consensus to unseal.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Threshold Cryptography',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Secret Sharing',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Multi-Party Computation',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Seal documents with configurable quorum thresholds (e.g., 3-of-5, 7-of-10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Distributed shard storage across trusted quorum members',
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
    'Smart contract capabilities for decentralized applications. Quorum-based governance with configurable voting thresholds for network decisions and policy enforcement.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Governance',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Smart Contracts',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Governance',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Voting Systems',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Digital contract execution on decentralized network',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'Quorum-based decision making for network governance',
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

export default ShowcaseJapaneseStrings;
