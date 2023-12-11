import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// French translations - Complete
export const ShowcaseFrenchStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: "Accueil",
  [ShowcaseStrings.Nav_SoupDemo]: "Démo Soup",
  [ShowcaseStrings.Nav_Ledger]: "Registre",
  [ShowcaseStrings.Nav_Blog]: "Blog",
  [ShowcaseStrings.Nav_FAQ]: "FAQ",
  [ShowcaseStrings.Nav_Docs]: "Documentation",
  [ShowcaseStrings.Nav_Home_Description]: "Page principale",
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    "Visualisation interactive des blocs",
  [ShowcaseStrings.Nav_Ledger_Description]:
    "Registre blockchain avec gouvernance",
  [ShowcaseStrings.Nav_Blog_Description]: "Blog et actualités BrightChain",
  [ShowcaseStrings.Nav_FAQ_Description]: "Questions fréquemment posées",
  [ShowcaseStrings.Nav_Docs_Description]: "Documentation du projet",
  [ShowcaseStrings.Nav_ToggleMenu]: "Basculer le menu",

  // Language Selector
  [ShowcaseStrings.Lang_Select]: "Langue",
  [ShowcaseStrings.Lang_EN_US]: "Anglais (États-Unis)",
  [ShowcaseStrings.Lang_EN_GB]: "Anglais (Royaume-Uni)",
  [ShowcaseStrings.Lang_ES]: "Espagnol",
  [ShowcaseStrings.Lang_FR]: "Français",
  [ShowcaseStrings.Lang_DE]: "Allemand",
  [ShowcaseStrings.Lang_ZH_CN]: "Chinois",
  [ShowcaseStrings.Lang_JA]: "Japonais",
  [ShowcaseStrings.Lang_UK]: "Ukrainien",

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: "Mode FAQ",
  [ShowcaseStrings.FAQ_Gild_Character]: "Personnage de Gild",
  [ShowcaseStrings.FAQ_Phix_Character]: "Personnage de Phix",
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: "Passer au FAQ {MODE}",
  [ShowcaseStrings.FAQ_Title_Technical]: "FAQ BrightChain",
  [ShowcaseStrings.FAQ_Title_Ecosystem]: "L'Univers BrightChain",
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    "Le Successeur Évolutif du Système de Fichiers Sans Propriétaire",
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    "Découvrez les Mascottes, la Mission et l'Écosystème",
  [ShowcaseStrings.FAQ_Toggle_Technical]: "Technique",
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: "Écosystème",
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: "Gild garde les détails",
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: "Phix révèle la vision",
  [ShowcaseStrings.FAQ_BackToHome]: "← Retour à l'Accueil",
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]:
    "Application décentralisée Top Secret",
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: "Logo de BrightDB",
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: "Logo de BrightChat",
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: "Logo de BrightHub",
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: "Logo de BrightID",
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: "Logo de BrightMail",
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: "Logo de BrightVote",
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: "Logo de BrightPass",
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: "Logo du Protocole Canari",
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: "Logo du Burnbag Numérique",

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: "1. Qu'est-ce que BrightChain ?",
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    "BrightChain est une infrastructure de données décentralisée et haute performance « Sans Propriétaire ». C'est le successeur architectural du système de fichiers sans propriétaire (OFFSystem), modernisé pour les environnements matériels de 2026, y compris Apple Silicon et le stockage NVMe.",

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    "2. En quoi BrightChain diffère-t-il de l'OFFSystem original ?",
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    "BrightChain honore la philosophie « Sans Propriétaire » de son prédécesseur tout en introduisant des modernisations critiques :",
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: "Redondance optionnelle",
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    "Les utilisateurs peuvent demander que leurs blocs soient stockés avec une durabilité accrue en utilisant l'encodage Reed-Solomon.",
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
    "Performance de récupération",
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    "En utilisant @digitaldefiance/node-rs-accelerate, le système exploite le matériel GPU/NPU pour effectuer des opérations de récupération Reed-Solomon à des vitesses allant jusqu'à 30+ Go/s.",
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: "Évolutivité",
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    "Grâce aux Super CBL (listes de blocs constitutifs), le système utilise l'indexation récursive pour prendre en charge des tailles de fichiers effectivement illimitées avec une efficacité de récupération O(log N).",
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: "Identité",
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    "L'intégration de BIP39/32 permet une identité sécurisée basée sur des mnémoniques et une gestion hiérarchique déterministe des clés.",
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: "Chiffrement optionnel",
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    "Les utilisateurs peuvent optionnellement ajouter un chiffrement ECIES par-dessus leurs données, en utilisant le système HDKey de l'espace de clés/identité Ethereum.",

  [ShowcaseStrings.FAQ_Tech_Q3_Title]:
    "3. Comment les données sont-elles « Sans Propriétaire » ?",
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    "BrightChain utilise une approche cryptographique multicouche pour garantir qu'aucun nœud individuel n'« héberge » un fichier au sens juridique ou pratique :",
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: "La base XOR",
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    "Chaque bloc est traité par de simples opérations XOR, rendant les données au repos indiscernables du bruit aléatoire.",
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: "La Recette",
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    "Pour reconstruire un fichier, un utilisateur a besoin de la Recette — la carte spatiale spécifique de l'ordre des blocs.",
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: "Chiffrement optionnel",
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    "Les utilisateurs peuvent optionnellement ajouter un chiffrement ECIES par-dessus leurs données. Sans la Recette, les données restent désordonnées et, si choisi, cryptographiquement verrouillées.",

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    "4. Qu'est-ce que le « Compromis de Tuples » et qu'apporte-t-il ?",
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    "Le « Compromis de Tuples » est l'équilibre délibéré entre la surcharge du partitionnement « Sans Propriétaire » et les avantages juridiques et économiques inégalés qu'il procure au réseau.",
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    "L'avantage juridique : Déni plausible",
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    "En partitionnant les données en tuples (blocs) quasi aléatoires par mélange XOR, les utilisateurs qui contribuent du stockage hébergent des données mathématiquement indiscernables du bruit.",
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    "Le résultat : Parce qu'un seul nœud ne peut pas reconstruire un fichier cohérent sans la « Recette », il est techniquement et juridiquement impossible de prétendre qu'un opérateur de nœud spécifique « héberge » ou « distribue » un contenu spécifique. Cela fournit la couche ultime de déni plausible pour les participants.",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    "L'avantage économique : Efficacité vs. Preuve de Travail",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    "Bien que le partitionnement « Sans Propriétaire » introduise une surcharge de stockage mineure, elle est négligeable comparée aux coûts massifs en énergie et matériel des réseaux traditionnels de Preuve de Travail (PoW) ou de Preuve d'Enjeu (PoS).",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    "Le résultat : BrightChain atteint une intégrité des données haute performance sans brûler des « Joules » dans des compétitions de hachage inutiles. Cela rend le réseau hautement compétitif, offrant des performances à faible latence pour une fraction du coût des blockchains héritées.",
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: "Résumé du compromis :",
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    "Les utilisateurs acceptent une légère augmentation des « fragments » de données en échange d'un environnement d'hébergement sans responsabilité et d'une infrastructure à coût ultra-faible. Cela fait de BrightChain la plateforme la plus viable pour le stockage décentralisé dans des environnements hautement réglementés ou à ressources limitées.",

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    "5. En quoi BrightChain diffère-t-il des blockchains traditionnelles ?",
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    "Techniquement, BrightChain est un magasin de blocs décentralisé plutôt qu'une blockchain unique et monolithique. Alors que les blockchains traditionnelles sont le registre, BrightChain fournit l'infrastructure sous-jacente pour héberger et prendre en charge simultanément plusieurs registres d'arbres de Merkle hybrides. Nous utilisons le chaînage de blocs comme méthode structurelle pour reconstruire les fichiers, mais le système est conçu comme une base haute performance pouvant alimenter de nombreuses blockchains et dApps différentes sur une couche de stockage unifiée « Sans Propriétaire ».",

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    "6. Quel est le rôle de Reed-Solomon (RS) dans BrightChain ?",
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    "Alors que XOR gère la confidentialité et le statut « Sans Propriétaire » des données, le codage par effacement Reed-Solomon est une couche optionnelle pour la récupérabilité.",
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: "Redondance",
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    "RS permet de reconstruire un fichier même si plusieurs nœuds d'hébergement se déconnectent.",
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: "Le compromis",
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    "RS ajoute une surcharge computationnelle et des exigences de stockage par rapport au simple XOR. Les utilisateurs doivent choisir leur niveau de redondance en fonction de l'importance des données et de leurs « Joules » disponibles.",

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: "7. Qu'est-ce qu'un « Joule » ?",
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    "Un Joule est l'unité de compte pour le travail et la consommation de ressources au sein de l'écosystème BrightChain.",
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: "Base de coût",
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    "Chaque action — stocker des données, effectuer un mélange XOR ou encoder des fragments Reed-Solomon — a un coût projeté en Joules.",
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]:
    "Gestion des ressources",
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    "Les utilisateurs doivent peser le coût en Joules du stockage à haute redondance par rapport à la valeur de leurs données.",

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: "8. Comment obtient-on des Joules ?",
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    "Les Joules sont gagnés grâce à un modèle de Travail pour Travail. Les utilisateurs obtiennent des Joules en contribuant des ressources au réseau :",
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: "Stockage",
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    "Héberger des blocs chiffrés pour d'autres pairs.",
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: "Calcul",
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    "Fournir des cycles CPU/GPU/NPU pour effectuer des tâches d'encodage ou de récupération pour le collectif.",
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    "Cela garantit que le réseau reste une économie énergétique autosuffisante où la contribution égale la capacité.",

  [ShowcaseStrings.FAQ_Tech_Q9_Title]:
    "9. Comment l'anonymat est-il maintenu ?",
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    "BrightChain emploie l'anonymat par intermédiation.",
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: "Sur la chaîne",
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    "Toutes les actions sont anonymes pour le réseau général.",
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: "Le BrightTrust",
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    "L'identité est cryptographiquement liée à un BrightTrust de Gouvernance. Cela garantit que, bien que les données et actions d'un utilisateur soient privées, la communauté maintient une « Couche Sociale » de responsabilité via le partage de secret de Shamir et le vote homomorphe.",

  [ShowcaseStrings.FAQ_Tech_Q10_Title]:
    "10. Qu'est-ce que BrightDB et comment fonctionne-t-il ?",
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    "BrightDB est la couche de magasin de documents de haut niveau construite directement sur le magasin de blocs BrightChain. Il fournit un moyen structuré de stocker, interroger et gérer des objets de données complexes sans serveur de base de données central.",
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: "Comment ça fonctionne",
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    "Stockage orienté documents",
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    "Similaire aux bases de données NoSQL, BrightDB stocke les données sous forme de « Documents » partitionnés en blocs chiffrés et distribués à travers le réseau.",
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    "Versionnage immuable",
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    "Chaque modification d'un document est enregistrée comme une nouvelle entrée avec un historique cryptographiquement vérifiable.",
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    "Indexation décentralisée",
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    "Un système d'indexation distribué permet aux nœuds de trouver et reconstruire des documents spécifiques à travers le DHT sans nœud « Maître » central.",
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    "Accès basé sur le brightTrust",
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    "L'accès à des bases de données ou collections spécifiques peut être gouverné par un BrightTrust, nécessitant l'approbation cryptographique de signataires autorisés.",
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: "Pourquoi c'est important",
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    "La plupart des dApps peinent parce qu'elles stockent des données « lourdes » sur des serveurs centralisés. BrightDB garde les données décentralisées, sans propriétaire et haute performance — permettant des applications véritablement sans serveur aussi rapides que les applications web traditionnelles mais aussi sécurisées qu'une blockchain.",

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    "11. Quelles dApps ont été lancées avec BrightChain ?",
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    "BrightChain a été lancé avec une suite principale de « Bright-Apps » conçues pour remplacer les services centralisés de collecte de données par des alternatives sécurisées et souveraines.",
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: "Logo BrightChart",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]:
    "Dossiers médicaux appartenant au patient",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    "Un dossier médical électronique où le patient détient les clés. BrightChart stocke les données médicales conformes FHIR R4 sous forme de blocs chiffrés sur BrightChain — aucune base de données centrale à pirater. Les patients accordent un accès granulaire aux prestataires via la délégation BrightTrust, et chaque événement d'accès est enregistré dans une piste d'audit immuable. Compatible avec les cabinets médicaux, dentaires et vétérinaires à partir d'une seule base de code.",
  [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: "Logo BrightCal",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]: "Gestion de calendrier partagé et personnel",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
    "Un système de calendrier où le propriétaire détient les clés. BrightCal permet une planification sécurisée et chiffrée avec un contrôle d'accès granulaire. Les événements sont stockés sous forme de blocs chiffrés. Toutes les données de calendrier sont immuables et récupérables, avec prise en charge des événements récurrents, des rappels et de l'intégration avec les systèmes de calendrier traditionnels.",
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: "Communication souveraine",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    "Un système de messagerie entièrement conforme RFC reliant le SMTP traditionnel et le stockage décentralisé. Contrairement aux fournisseurs de messagerie standard, BrightMail partitionne chaque message dans le magasin de blocs « Sans Propriétaire » avec prise en charge de la messagerie chiffrée de bout en bout en « Mode Sombre ».",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
    "Réseau social et graphe souverain",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: "Le concept",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    "Une plateforme de réseau social décentralisée et résistante à la censure qui reflète la fluidité des « Flux » hérités sans la surveillance centrale ni la manipulation algorithmique.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: "La différence",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    "Chaque publication, « J'aime » et relation est stocké comme un document immuable et partitionné dans BrightDB. Grâce à l'économie des Joules, il n'y a pas de publicités — les utilisateurs contribuent une micro-fraction de calcul ou de stockage pour « amplifier » leur voix ou maintenir l'histoire de leur communauté.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]:
    "Le pouvoir des brightTrusts",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    "La modération n'est pas gérée par une « Équipe de Sécurité » d'entreprise. Au lieu de cela, les communautés sont gouvernées par des BrightTrusts de Gouvernance. Les règles sont appliquées cryptographiquement, et les standards communautaires sont votés via le vote homomorphe, garantissant que l'espace numérique d'un groupe reste véritablement « Sans Propriétaire » et autodéterminé.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]:
    "Coffre-fort à connaissance nulle",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    "Un système de gestion de mots de passe et d'identité où votre coffre-fort existe sous forme de blocs chiffrés distribués. L'accès est gouverné par votre mnémonique BIP39, et chaque changement d'identifiant est versionné et vérifiable via BrightDB.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: "Communauté résiliente",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    "Une plateforme de communications en temps réel avec des canaux persistants, la voix et le partage de médias. La gouvernance communautaire est gérée via des Quorums, et la récupération accélérée par GPU garantit que l'historique de chat n'est jamais perdu.",
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    "Burnbag Numérique / Protocole Canari",
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    "Une plateforme spécialisée de partage de fichiers et de chiffrement conçue pour les données à haut risque. Elle utilise des « Coffres Intelligents » qui peuvent être programmés pour détruire définitivement la « Recette » (la carte et les clés) ou la transmettre à des parties spécifiques sous des conditions vérifiables — comme un « Interrupteur d'Homme Mort », une diffusion programmée ou un consensus de Quorum. C'est l'outil ultime pour les lanceurs d'alerte, les professionnels du droit et toute personne nécessitant une expiration garantie des données.",

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    "12. Qu'est-ce que le chiffrement Paillier et comment permet-il le vote privé ?",
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    "Paillier est un schéma de chiffrement à clé publique avec une propriété spéciale appelée homomorphisme additif — vous pouvez additionner des valeurs chiffrées sans jamais les déchiffrer. Si vous chiffrez un « 1 » pour le Candidat A et que quelqu'un d'autre chiffre un « 1 » pour le Candidat A, vous pouvez multiplier ces textes chiffrés ensemble et le résultat, une fois déchiffré, est « 2 ». Personne ne voit jamais un bulletin individuel. Dans le système de vote de BrightChain, chaque vote est chiffré avec une clé publique Paillier, les bulletins chiffrés sont agrégés de manière homomorphe en un seul texte chiffré par candidat, et seul le décompte final est déchiffré — jamais aucun vote individuel. Pour une sécurité accrue, la clé privée Paillier peut être divisée entre plusieurs gardiens en utilisant la cryptographie à seuil, de sorte qu'aucune partie individuelle ne puisse déchiffrer le décompte seule. Cette approche fonctionne nativement pour les méthodes de vote courantes comme la pluralité, l'approbation et le vote par score, où le décompte n'est que de l'addition. Les méthodes nécessitant des tours d'élimination (comme le vote par classement) nécessitent des déchiffrements intermédiaires entre les tours, et certaines méthodes (comme le vote quadratique) ne peuvent pas être réalisées de manière homomorphe.",

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: "13. Que fait le Pont Paillier ?",
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    "Le Pont Paillier est une construction de dérivation de clés déterministe qui vous permet de dériver des clés de chiffrement homomorphe Paillier directement à partir de votre paire de clés ECDH (courbe elliptique Diffie-Hellman) existante. Au lieu de gérer deux paires de clés séparées — une pour l'identité/authentification (ECC) et une pour le chiffrement de vote homomorphe (Paillier) — le pont canalise votre secret partagé ECDH à travers HKDF et HMAC-DRBG pour générer de manière déterministe les grands nombres premiers nécessaires pour une clé Paillier de 3072 bits. Cela signifie que toute votre identité cryptographique, y compris vos clés de vote, peut être récupérée à partir d'une seule clé privée ECC de 32 octets. Le pont est unidirectionnel (vous ne pouvez pas inverser une clé Paillier vers la clé EC), entièrement déterministe (la même entrée produit toujours la même sortie), et atteint une sécurité de 128 bits conforme aux recommandations du NIST.",
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    "Consultez notre article sur le sujet pour plus d'informations.",

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    "14. BrightChain n'est-il pas juste un autre stockage décentralisé (dWS) comme IPFS ?",
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    "Non. IPFS est une « Bibliothèque Publique » conçue pour la découverte et la persistance de contenu. BrightChain est un « Coffre-fort Souverain ». Alors qu'IPFS se concentre sur la recherche de données via les CID, BrightChain se concentre sur le Statut Sans Propriétaire et la Récupération à Haute Vitesse. Dans BrightChain, les données sont fragmentées si minutieusement qu'aucun nœud individuel ne « possède » ou même ne « sait » ce qu'il héberge.",

  [ShowcaseStrings.FAQ_Tech_Q15_Title]:
    "15. En quoi la « Performance » diffère-t-elle d'IPFS ?",
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    "IPFS fonctionne au « Mieux Possible » et souvent avec une latence élevée. BrightChain est conçu pour l'ère Apple Silicon (M4 Max). En utilisant @digitaldefiance/node-rs-accelerate, nous atteignons des vitesses de récupération de 30+ Go/s. Nous ne faisons pas que « récupérer » des fichiers ; nous utilisons Reed-Solomon accéléré par matériel pour re-matérialiser les données à partir des fragments à la vitesse du bus.",

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    "16. Qu'en est-il de la confidentialité dans BrightChain vs IPFS ?",
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    "IPFS est transparent par défaut ; si vous avez le hash, vous pouvez voir le fichier. BrightChain utilise une Base XOR. Les données sont fonctionnellement « Déchiquetées » (comme le logo Digital Burnbag) avant même de toucher le réseau. La confidentialité n'est pas un « plugin » — c'est l'état mécanique des données.",

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    "17. Comment les économies de BrightChain et IPFS se comparent-elles ?",
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    "IPFS repose sur Filecoin (une blockchain externe lourde) pour les incitations. BrightChain utilise le Joule. C'est une unité de compte « Thermique » qui mesure le travail réel (cycles CPU/NPU) et la consommation de ressources. Elle est intégrée, à faible surcharge, et directement liée à l'« Énergie » du réseau.",

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    "🔗 Qu'est-ce que BrightChain, vraiment ?",
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    "BrightChain est une infrastructure pour un monde où vos données vous appartiennent — pas à une plateforme, pas à une entreprise, pas à quiconque gère le serveur. C'est une couche de stockage décentralisé où chaque fichier est partitionné, mélangé et dispersé à travers le réseau de sorte qu'aucun nœud individuel n'« héberge » jamais vos données de manière significative. Le résultat est un système où la confidentialité n'est pas une fonctionnalité que vous activez — c'est l'état par défaut de l'architecture. Nous l'appelons « Sans Propriétaire » parce qu'une fois que vos données entrent dans BrightChain, personne ne possède les morceaux. Seul vous détenez la Recette pour les rassembler.",

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]:
    "Qu'est-ce que Digital Burnbag ?",
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    "Dans les agences de renseignement, un « sac de destruction » est un conteneur pour les documents classifiés destinés à la destruction — vous les déposez, et ils sont incinérés avec une chaîne de traçabilité vérifiable. Digital Burnbag apporte ce concept aux données. Lorsque vous renommez, déplacez ou détruisez des données dans BrightChain, le système effectue un « cycle phénix » : il copie les données dans leur nouvel état, puis incinère cryptographiquement l'ancien. Rien n'est simplement supprimé — il renaît. L'ancien état est prouvablement disparu, et le nouvel état est prouvablement intact. C'est la couche produit de BrightChain, où les mascottes Gild et Phix vivent et travaillent.",

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]:
    "Qu'est-ce que le Protocole Canari ?",
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    "Le nom vient du canari dans la mine de charbon — le système d'alerte précoce qui chante quand quelque chose ne va pas. Le Protocole Canari surveille vos flux, vos API — tout ce qui donne un battement de cœur indiquant si vous êtes en vie, si les choses se déroulent comme prévu. Dès que les choses ne se passent pas comme prévu et que votre canari meurt (désolé, Gild !), le fichier ou dossier est grillé — de manière vérifiable. Cela fonctionne aussi en sens inverse : connectez-vous avec un code de contrainte, ou configurez une règle via un fournisseur préétabli, et vos données peuvent aussi s'autodétruire sous ces conditions. Tout est question de règles et de conditions. Si les choses ne se passent pas comme prévu, Gild y passe. Il peut aussi surveiller l'intégrité du réseau, mais son objectif principal est la destruction conditionnelle : vos données brûlent quand les règles le dictent. Notre mascotte Gild est l'incarnation vivante de ce protocole : un canari doré qui veille sur vos données avec une vigilance obsessionnelle. Le logo existant Burnbag/Protocole Canari — un canari doré avec une queue de flamme — représente les deux mascottes en une seule marque. Gild est le corps doré ; Phix est la flamme.",

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: "Rencontrez la troupe",

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: "Volta — L'Étincelle",
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: "L'Architecte Haute Tension",
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    "Nommée d'après Alessandro Volta, inventeur de la batterie, Volta est une étincelle vivante — un renard géométrique dentelé, bleu néon, fait d'électricité pure et crépitante. Elle est la Fournisseuse : elle génère et pousse des Joules à travers le système, impatiente d'alimenter chaque opération à pleine puissance. Hyperactive, généreuse en énergie et légèrement imprudente, Volta pense que la conservation est ennuyeuse. « Vous voulez 20 térajoules ? C'est fait. Quoi d'autre ? » Dans l'interface, elle crépite près du compteur de Joules, et pendant les opérations lourdes elle brille d'un blanc incandescent, vibrant du désir d'exécuter. Elle représente le potentiel pur et chaotique — le désir d'agir.",
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    "Volta mascotte — un renard géométrique bleu néon fait d'électricité",

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: "Ohm — L'Ancre",
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: "Le Moine Stoïque de la Résistance",
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    "Nommé d'après Georg Ohm, qui a défini la résistance électrique, Ohm est le frein à l'accélérateur de Volta. Une tortue-paresseux lourde, semblable à la pierre, avec un symbole Oméga lumineux intégré dans sa carapace, il se déplace lentement et délibérément. Son mantra : « Ohm mani padme ohm. » Tandis que Volta zigzague comme un renard caféiné, Ohm s'assoit dans une position de lotus profonde et ancrée, vibrant à un bourdonnement parfait de 60Hz, centrant tout le système. Il est calme, sceptique et armé d'un humour sec — le comptable qui lit vraiment les reçus. Pas opposé aux dépenses, juste opposé au gaspillage. Quand les niveaux d'énergie s'emballent, il effectue une « Méditation Résistive », posant une lourde patte de pierre sur la barre de progression et changeant le courant du bleu à un ambre calme et profond. Il représente la sagesse ancrée — la discipline d'agir correctement.",
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    "Mascotte Ohm — une tortue-paresseux semblable à la pierre avec un symbole Oméga lumineux",

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: "Gild — Le Témoin",
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: "Le Gardien Canari Doré",
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    "Un canari doré vaniteux obsédé par son plumage jaune immaculé. Gild est le gardien — il surveille vos données, émet des avertissements et garde les choses en sécurité. Pensez à l'énergie du hibou Duolingo : encourageant, occasionnellement culpabilisant, mais fondamentalement de votre côté. Le hic ? Gild vit dans une mine de charbon. Chaque opération de fichier soulève de la Suie, et il se salit constamment. Télécharger 50 fichiers ? Il est couvert de cendres, se lissant frénétiquement les plumes, marmonnant à propos de son plumage. Son niveau de suie est un indicateur passif de l'activité du système — système inactif signifie un Gild immaculé et fièrement toiletté ; utilisation intensive signifie un canari sale et furieux. Il est méticuleux, dramatique et résigné. « Je viens de me lisser ! Maintenant je suis ramoneur parce que vous ne savez pas écrire Documents. » Il est le corps doré du logo Burnbag/Protocole Canari — le logo sans le feu.",
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]: "Mascotte Gild — un canari doré gardien",

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: "Phix — La Renaissance",
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: "Le Destructeur-Créateur",
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    "« Phix » = « fix » + « phoenix ». Le jumeau maléfique de Gild. Même silhouette d'oiseau, mais ses plumes brillent rouge braise, ses yeux se rétrécissent comme des charbons ardents, et il sourit comme s'il allait apprécier ça un peu trop. Phix est l'Exécuteur — il consomme des Joules pour incinérer les anciens états de données et renaît avec les nouveaux. Là où Gild est agacé par le feu, Phix EST le feu. Il apparaît lors des opérations de renommage et des cascades déclenchées par le canari — tout ce où les données meurent et renaissent. Mais Phix, c'est aussi la destruction pure et simple. C'est le pyromane debout avec l'allumette quand vous êtes prêt à tout brûler, heureux de donner un coup de main. Supprimer un fichier ? Phix sourit. Effacer un dossier ? Il est déjà allumé. Bien qu'il prenne un plaisir jubilatoire dans la destruction, il trouve aussi de la fierté dans la création — renaître des cendres avec quelque chose de nouveau, c'est toute son essence. Joyeux, chaotique, le pyromane du département des pompiers qui aime un peu trop son travail. Quand un utilisateur déclenche un renommage, Gild s'écarte et Phix émerge — souriant, brillant, prêt à brûler. Il est la flamme du logo Burnbag/Protocole Canari — le logo sans l'or.",
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    "Phix mascotte — un phénix rouge braise, le jumeau feu de Gild",

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: "L'Économie",

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: "⚡ Que sont les Joules ?",
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    "Les Joules sont l'unité d'énergie de BrightChain — pas une cryptomonnaie spéculative, mais une mesure de travail réel et de contribution. Visuellement, ce sont de minuscules jetons d'éclair bleu néon qui coulent, s'accumulent et s'épuisent comme des pièces dans un jeu. Volta les génère, Ohm régule leur flux à travers sa porte, et les opérations les consomment. Chaque action dans BrightChain a un coût en Joules — d'un renommage de métadonnées quasi nul à un re-chiffrement de cycle complet d'un million de Joules. Les utilisateurs gagnent des Joules grâce à un modèle de Travail pour Travail : contribuez du stockage ou du calcul au réseau, et vous gagnez la capacité de l'utiliser. Le compteur de Joules dans l'interface montre votre budget énergétique, avec de petites étincelles coulant visiblement de Volta à travers la porte d'Ohm vers vos opérations.",

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: "💨 Qu'est-ce que la Suie ?",
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    "La Suie est la conséquence visible de chaque opération — l'« empreinte carbone » de vos actions numériques. Ce n'est pas une monnaie que vous dépensez ; c'est un coût que vous ne pouvez pas éviter. Chaque fois que Phix brûle des données, il produit de la Suie — des particules sombres et des nuages de fumée qui s'accumulent sur les plumes dorées de Gild. Plus vous en faites, plus Gild se salit. Une utilisation légère laisse une tache ici et là ; une utilisation intensive le rend noir comme du charbon et indigné. La Suie représente le karma dans l'écosystème BrightChain : chaque action laisse une marque, et quelqu'un doit la porter. Selon les mots d'Ohm : « Volta vous donne l'énergie, Phix la transforme en chaleur, et Gild en porte les conséquences. Moi, je m'assure juste qu'on ne gaspille pas plus que nécessaire. »",

  [ShowcaseStrings.FAQ_Eco_BigPicture]: "La Vue d'ensemble",

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    "🌐 Comment tout s'assemble-t-il ?",
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    "L'écosystème est un système à deux niveaux. Au niveau de la plateforme, BrightChain fonctionne sur la tension entre Volta (le Dépensier) et Ohm (l'Épargnant), avec les Joules circulant entre eux comme monnaie d'énergie. Au niveau du produit, Digital Burnbag fonctionne sur la tension entre Phix (le Destructeur-Créateur) et Gild (le Gardien), avec la Suie comme conséquence inévitable. Quand une opération burnbag se déclenche, les quatre personnages interagissent : Volta atteint les Joules, Ohm évalue le coût et les laisse passer à contrecœur, Phix attrape l'énergie et érupte, et Gild est frappé par la suie résultante. Le Protocole Canari est le fil d'intégrité qui traverse tout — l'œil vigilant de Gild garantissant que chaque transformation est légitime. Le logo Burnbag/Protocole Canari raconte l'histoire des origines : Gild et Phix sont le même oiseau. L'un est le corps, l'autre est le feu. Le logo est le moment où ils se superposent — le canari qui brûle déjà, le phénix qui n'a pas encore complètement émergé.",

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: "🧘 En quoi croit BrightChain ?",
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    "L'énergie se conserve. Les actions ont des conséquences. Les données ont du poids. Chaque personnage de l'écosystème BrightChain correspond à un principe plus profond : Volta est l'Étincelle — le potentiel pur et chaotique et le désir d'agir. Ohm est l'Ancre — la sagesse ancrée et la discipline d'agir correctement. Les Joules sont le Flux — l'esprit circulant entre eux. Phix est la Renaissance — le feu transformateur au bout du chemin. Gild est le Témoin — celui qui souffre la suie terrestre de nos attachements (et de nos fautes de frappe). La Suie est le Karma — le coût visible qui ne peut être évité. Ensemble, ils forment une boucle fermée : Volta fournit l'énergie, Ohm s'assure qu'elle est dépensée sagement, Phix transforme l'état, et Gild porte le poids. Rien n'est gratuit. Rien n'est gaspillé. Tout laisse une marque.",

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    "🎨 Où puis-je voir les mascottes en action ?",
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    "Les mascottes sont tissées à travers l'expérience produit. Gild apparaît lors de la navigation de fichiers, du téléchargement et du partage — son niveau de suie reflétant passivement l'activité en cours. Quand vous déclenchez une opération de renommage ou de destruction, Gild s'écarte et Phix émerge avec le bouton [ Phix ] : il couve sombrement avec une faible lueur ambrée, s'enflamme au survol, prend feu au clic, et montre une barre de progression style fournaise tandis que des particules de cendres coulent de la source à la destination. Volta et Ohm vivent dans le compteur de Joules de la plateforme, avec Volta crépitant près de la jauge d'énergie et Ohm intervenant lors des opérations coûteuses pour effectuer sa Méditation Résistive — changeant la barre de progression du bleu néon à un ambre calme. La Suie s'accumule visiblement sur les plumes de Gild tout au long de votre session. Bientôt : apparitions des mascottes sur les pages d'erreur, écrans de chargement, dialogues de confirmation adaptés à la gravité de l'opération, et oui — du merchandising.",

  // Hero Section
  [ShowcaseStrings.Hero_Badge]:
    "🌟 La plateforme d'applications décentralisées",
  [ShowcaseStrings.Hero_Description_P1]:
    "BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup ». Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite.",
  [ShowcaseStrings.Hero_Description_NotCrypto]: "Pas une cryptomonnaie.",
  [ShowcaseStrings.Hero_Description_P2]:
    "Pas de jetons, pas de minage, pas de preuve de travail. BrightChain valorise les contributions réelles en stockage et en calcul, mesurées en Joules — une unité liée aux coûts énergétiques réels, pas à la spéculation du marché.",
  [ShowcaseStrings.Hero_Highlight]:
    "🔒 Stockage sans propriétaire • ⚡ Économe en énergie • 🌐 Décentralisé • 🎭 Anonyme mais responsable • 🗳️ Vote homomorphe • 💾 Le stockage avant la puissance",
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: "🧪 Démo interactive",
  [ShowcaseStrings.Hero_CTA_SoupDemo]: "🥫 Démo BrightChain Soup",
  [ShowcaseStrings.Hero_CTA_GitHub]: "Voir sur GitHub",
  [ShowcaseStrings.Hero_CTA_Blog]: "Blog",

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: "Fonctionnalités",
  [ShowcaseStrings.Comp_Title_Features]: "révolutionnaires",
  [ShowcaseStrings.Comp_Title_Capabilities]: "& capacités",
  [ShowcaseStrings.Comp_Subtitle]:
    "La plateforme d'applications décentralisées — cryptographie avancée, stockage décentralisé et gouvernance démocratique",
  [ShowcaseStrings.Comp_Intro_Heading]:
    "BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup » — alliant cryptographie avancée, stockage décentralisé et gouvernance démocratique.",
  [ShowcaseStrings.Comp_Intro_P1]:
    "Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite. Du vote homomorphe à l'anonymat par intermédiation, du stockage de fichiers distribué à la gouvernance par brightTrust, BrightChain offre tout le nécessaire pour la prochaine génération d'applications décentralisées.",
  [ShowcaseStrings.Comp_Problem_Title]:
    "❌ Les problèmes de la blockchain traditionnelle",
  [ShowcaseStrings.Comp_Problem_1]:
    "Gaspillage énergétique massif dû au minage par preuve de travail",
  [ShowcaseStrings.Comp_Problem_2]:
    "Capacité de stockage gaspillée sur des milliards d'appareils",
  [ShowcaseStrings.Comp_Problem_3]:
    "Aucun mécanisme de vote préservant la confidentialité",
  [ShowcaseStrings.Comp_Problem_4]:
    "L'anonymat sans responsabilité mène aux abus",
  [ShowcaseStrings.Comp_Problem_5]:
    "Le stockage on-chain coûteux limite les applications",
  [ShowcaseStrings.Comp_Problem_6]:
    "Les opérateurs de nœuds font face à une responsabilité juridique pour le contenu stocké",
  [ShowcaseStrings.Comp_Problem_Result]:
    "Une technologie blockchain destructrice pour l'environnement, juridiquement risquée et fonctionnellement limitée.",
  [ShowcaseStrings.Comp_Solution_Title]: "✅ La solution BrightChain",
  [ShowcaseStrings.Comp_Solution_P1]:
    "BrightChain élimine le gaspillage du minage en utilisant la preuve de travail uniquement pour la régulation, pas pour le consensus. Le système de fichiers sans propriétaire offre une immunité juridique en ne stockant que des blocs randomisés par XOR. Le vote homomorphe permet des élections préservant la confidentialité, tandis que l'anonymat par intermédiation équilibre vie privée et responsabilité.",
  [ShowcaseStrings.Comp_Solution_P2]:
    "Construit sur l'espace de clés d'Ethereum mais conçu sans les contraintes de la preuve de travail, BrightChain monétise le stockage inutilisé des appareils personnels, créant un réseau P2P durable. Le système de BrightTrust assure une gouvernance démocratique avec des garanties de sécurité mathématiques.",
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: "🔒 Stockage sans propriétaire",
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    "Le caractère aléatoire cryptographique supprime la responsabilité du stockage — aucun bloc individuel ne contient de contenu identifiable",
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: "⚡ Économe en énergie",
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    "Pas de minage par preuve de travail inutile — tout le calcul sert un objectif utile",
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: "🌐 Décentralisé",
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    "Distribué à travers le réseau — stockage P2P de type IPFS exploitant l'espace inutilisé des appareils personnels",
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: "🎭 Anonyme mais responsable",
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    "Confidentialité avec capacités de modération — anonymat par intermédiation via consensus de BrightTrust",
  [ShowcaseStrings.Comp_VP_Voting_Title]: "🗳️ Vote homomorphe",
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    "Élections préservant la confidentialité avec un dépouillement qui ne révèle jamais les votes individuels",
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: "🔒 Gouvernance par brightTrust",
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    "Prise de décision démocratique avec des seuils configurables et une sécurité mathématique",
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: "🚀 Développez avec BrightStack",
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    "BrightChain + Express + React + Node — remplacez MongoDB par BrightDB, gardez tout le reste",
  [ShowcaseStrings.Comp_ProjectPage]: "Page du projet",

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: "Démo",
  [ShowcaseStrings.Demo_Title_Demo]: "interactive",
  [ShowcaseStrings.Demo_Subtitle]:
    "Visualisation des capacités de chiffrement ECIES",
  [ShowcaseStrings.Demo_Disclaimer]:
    "Note : Cette visualisation utilise @digitaldefiance/ecies-lib (la bibliothèque navigateur) à des fins de démonstration. @digitaldefiance/node-ecies-lib offre des fonctionnalités identiques avec la même API pour les applications serveur Node.js. Les deux bibliothèques sont compatibles au niveau binaire : les données chiffrées par l'une peuvent être déchiffrées par l'autre.",
  [ShowcaseStrings.Demo_Alice_Title]: "Alice (Expéditrice)",
  [ShowcaseStrings.Demo_Alice_PublicKey]: "Clé publique :",
  [ShowcaseStrings.Demo_Alice_MessageLabel]: "Message à chiffrer :",
  [ShowcaseStrings.Demo_Alice_Placeholder]: "Saisissez un message secret...",
  [ShowcaseStrings.Demo_Alice_Encrypting]: "Chiffrement en cours...",
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: "Chiffrer pour Bob",
  [ShowcaseStrings.Demo_Bob_Title]: "Bob (Destinataire)",
  [ShowcaseStrings.Demo_Bob_PublicKey]: "Clé publique :",
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: "Données chiffrées :",
  [ShowcaseStrings.Demo_Bob_Decrypting]: "Déchiffrement en cours...",
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: "Déchiffrer le message",
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: "Message déchiffré :",
  [ShowcaseStrings.Demo_Error]: "Erreur :",

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: "Conçu avec",
  [ShowcaseStrings.About_Title_By]: "par Digital Defiance",
  [ShowcaseStrings.About_Subtitle]:
    "Innovation open source dans l'infrastructure décentralisée",
  [ShowcaseStrings.About_Vision_Title]: "Notre vision",
  [ShowcaseStrings.About_Vision_P1]:
    "Chez Digital Defiance, nous croyons qu'il faut donner aux individus et aux organisations une infrastructure véritablement décentralisée qui respecte la vie privée, favorise la durabilité et permet la participation démocratique.",
  [ShowcaseStrings.About_Vision_P2]:
    "BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup ». Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite. En éliminant le gaspillage du minage, en monétisant le stockage inutilisé et en implémentant des fonctionnalités comme le vote homomorphe et l'anonymat par intermédiation, nous avons créé une plateforme qui fonctionne pour tous.",
  [ShowcaseStrings.About_Vision_NotCrypto]:
    "Pas une cryptomonnaie. Quand vous entendez « blockchain », vous pensez probablement Bitcoin. BrightChain n'a pas de monnaie, pas de preuve de travail et pas de minage. Au lieu de brûler de l'énergie pour frapper des jetons, BrightChain valorise les contributions réelles en stockage et en calcul. Ces contributions sont mesurées dans une unité appelée le Joule, liée aux coûts énergétiques réels par formule — pas à la spéculation du marché. Vous ne pouvez ni miner ni échanger des Joules ; ils reflètent les coûts réels des ressources, et nous affinons cette formule au fil du temps.",
  [ShowcaseStrings.About_Vision_StorageDensity]:
    "L'avantage de la densité de stockage vs. puissance : Toute blockchain a du gaspillage quelque part. BrightChain réduit le gaspillage autant que possible, mais comporte une certaine surcharge liée à son mécanisme de stockage. Cependant, le stockage est l'un des domaines les plus rentables et où nous avons atteint une densité massive ces dernières années, alors que les centres de données peinent à atteindre la densité de puissance nécessaire pour les besoins CPU des blockchains et de l'IA. Le compromis d'une surcharge de stockage minimale en échange de l'anonymat et de l'absence de préoccupation concernant les poursuites pour droits d'auteur ou l'hébergement de contenu inapproprié permet à chacun de s'engager pleinement et de tirer le meilleur parti de nos vastes ressources de stockage réparties à travers le monde.",
  [ShowcaseStrings.About_BrightStack_P1]:
    "BrightStack est le paradigme full-stack pour les applications décentralisées : BrightChain + Express + React + Node. Si vous connaissez la stack MERN, vous connaissez déjà BrightStack — il suffit de remplacer MongoDB par BrightDB.",
  [ShowcaseStrings.About_BrightStack_P2]:
    "BrightDB est une base de données documentaire de type MongoDB sur le système de fichiers sans propriétaire, avec CRUD complet, requêtes, index, transactions et pipelines d'agrégation. Les mêmes patterns que vous utilisez avec MongoDB — collections, find, insert, update — mais chaque document est stocké sous forme de blocs blanchis préservant la confidentialité.",
  [ShowcaseStrings.About_BrightStack_P3]:
    "BrightPass, BrightMail et BrightHub ont tous été construits sur BrightStack, prouvant que le développement d'applications décentralisées peut être aussi simple que le développement full-stack traditionnel.",
  [ShowcaseStrings.About_OpenSource]:
    "100 % Open Source. BrightChain est entièrement open source sous la licence MIT. Construisez vos propres dApps sur BrightStack et contribuez à l'avenir décentralisé.",
  [ShowcaseStrings.About_WorkInProgress]:
    "BrightChain est un travail en cours. Actuellement, nous visons à maintenir le build stable au quotidien, mais des problèmes peuvent passer entre les mailles du filet et BrightChain n'est pas encore mature. Nous nous excusons pour tout inconvénient ou instabilité.",
  [ShowcaseStrings.About_OtherImpl_Title]: "Autres implémentations",
  [ShowcaseStrings.About_OtherImpl_P1]:
    "Bien que cette implémentation TypeScript/Node.js soit la version principale et la plus aboutie de BrightChain, une bibliothèque C++ avec interface macOS/iOS est en cours de développement. Cette implémentation native apporte les fonctionnalités de confidentialité et de sécurité de BrightChain aux plateformes Apple. Les deux dépôts sont en développement précoce et ne sont pas encore prêts pour la production.",
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'Bien que cette implémentation TypeScript/Node.js soit la version principale et la plus mature, une ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'bibliothèque C++ de base',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'interface macOS/iOS',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    ' est en développement. Cette implémentation native apporte les capacités de confidentialité et de performance de BrightChain directement aux appareils Apple.',
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: "Stockage sans propriétaire",
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    "Le caractère aléatoire cryptographique supprime la responsabilité du stockage. Aucun bloc individuel ne contient de contenu identifiable, offrant une immunité juridique aux opérateurs de nœuds.",
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: "Économe en énergie",
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    "Pas de minage par preuve de travail inutile. Tout le calcul sert un objectif utile — stockage, vérification et opérations réseau.",
  [ShowcaseStrings.About_Feature_Anonymous_Title]: "Anonyme mais responsable",
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    "Confidentialité avec capacités de modération. L'anonymat par intermédiation équilibre vie privée et responsabilité via consensus de BrightTrust.",
  [ShowcaseStrings.About_CTA_Title]: "Rejoignez la révolution",
  [ShowcaseStrings.About_CTA_Desc]:
    "Aidez-nous à construire l'avenir de l'infrastructure décentralisée. Contribuez à BrightChain, signalez des problèmes ou ajoutez une étoile sur GitHub pour montrer votre soutien à une technologie blockchain durable.",
  [ShowcaseStrings.About_CTA_InteractiveDemo]: "🥫 Démo interactive",
  [ShowcaseStrings.About_CTA_LearnMore]: "En savoir plus",
  [ShowcaseStrings.About_CTA_GitHub]: "Visitez BrightChain sur GitHub",
  [ShowcaseStrings.About_CTA_Docs]: "Lire la documentation",
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    "© {YEAR} Digital Defiance. Fait avec ❤️ pour la communauté des développeurs.",

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]:
    "Initialisation du système de vote cryptographique...",
  [ShowcaseStrings.Vote_DecryptingVotes]: "🔓 Déchiffrement des votes...",
  [ShowcaseStrings.Vote_LoadingDemo]: "Chargement de la démo de vote...",
  [ShowcaseStrings.Vote_RunAnotherElection]: "Lancer une autre élection",
  [ShowcaseStrings.Vote_StartElection]: "🎯 Lancer l'élection !",
  [ShowcaseStrings.Vote_ComingSoon]: "🚧 Démo {METHOD}",
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    "Cette méthode de vote est entièrement implémentée dans la bibliothèque.",
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    "👥 Citoyens votant ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    "Votes exprimés ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Vote_VotedTemplate]: "✓ A voté pour {CHOICE}",
  [ShowcaseStrings.Vote_ResultsTitle]: "🏆 Résultats",
  [ShowcaseStrings.Vote_VotesTemplate]: "{COUNT} votes ({PERCENT} %)",
  [ShowcaseStrings.Vote_ApprovalsTemplate]:
    "{COUNT} approbations ({PERCENT} %)",
  [ShowcaseStrings.Vote_ShowAuditLog]: "🔍 Afficher le journal d'audit",
  [ShowcaseStrings.Vote_HideAuditLog]: "🔍 Masquer le journal d'audit",
  [ShowcaseStrings.Vote_ShowEventLog]: "📊 Afficher le journal des événements",
  [ShowcaseStrings.Vote_HideEventLog]: "📊 Masquer le journal des événements",
  [ShowcaseStrings.Vote_AuditLogTitle]:
    "🔒 Journal d'audit immuable (Exigence 1.1)",
  [ShowcaseStrings.Vote_AuditLogDesc]:
    "Piste d'audit signée cryptographiquement et chaînée par hachage",
  [ShowcaseStrings.Vote_ChainIntegrity]: "Intégrité de la chaîne :",
  [ShowcaseStrings.Vote_ChainValid]: "✅ Valide",
  [ShowcaseStrings.Vote_ChainCompromised]: "❌ Compromise",
  [ShowcaseStrings.Vote_EventLogTitle]:
    "📊 Journal des événements (Exigence 1.3)",
  [ShowcaseStrings.Vote_EventLogDesc]:
    "Suivi complet des événements avec horodatages à la microseconde et numéros de séquence",
  [ShowcaseStrings.Vote_SequenceIntegrity]: "Intégrité de la séquence :",
  [ShowcaseStrings.Vote_SequenceValid]: "✅ Valide",
  [ShowcaseStrings.Vote_SequenceGaps]: "❌ Lacunes détectées",
  [ShowcaseStrings.Vote_TotalEventsTemplate]: "Total des événements : {COUNT}",
  [ShowcaseStrings.Vote_Timestamp]: "Horodatage :",
  [ShowcaseStrings.Vote_VoterToken]: "Jeton de l'électeur :",

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: "🗳️ Système de vote de niveau gouvernemental",
  [ShowcaseStrings.Vote_TitleDesc]:
    "Explorez notre bibliothèque complète de vote cryptographique avec 15 méthodes de vote différentes. Chaque démo présente des cas d'utilisation réels avec un chiffrement homomorphe garantissant la confidentialité du vote.",
  [ShowcaseStrings.Vote_BadgeHomomorphic]: "✅ Chiffrement homomorphe",
  [ShowcaseStrings.Vote_BadgeReceipts]: "🔐 Reçus vérifiables",
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: "🛡️ Séparation des rôles",
  [ShowcaseStrings.Vote_BadgeTests]: "🧪 900+ tests",

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: "Sélectionner la méthode de vote",
  [ShowcaseStrings.VoteSel_SecureCategory]:
    "✅ Entièrement sécurisé (Tour unique, préservant la confidentialité)",
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    "⚠️ Multi-tours (Nécessite un déchiffrement intermédiaire)",
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    "❌ Non sécurisé (Pas de confidentialité — cas spéciaux uniquement)",

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: "Pluralité",
  [ShowcaseStrings.VoteMethod_Approval]: "Approbation",
  [ShowcaseStrings.VoteMethod_Weighted]: "Pondéré",
  [ShowcaseStrings.VoteMethod_BordaCount]: "Méthode Borda",
  [ShowcaseStrings.VoteMethod_ScoreVoting]: "Vote par score",
  [ShowcaseStrings.VoteMethod_YesNo]: "Oui/Non",
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: "Oui/Non/Abstention",
  [ShowcaseStrings.VoteMethod_Supermajority]: "Supermajorité",
  [ShowcaseStrings.VoteMethod_RankedChoice]: "Vote par classement (IRV)",
  [ShowcaseStrings.VoteMethod_TwoRound]: "Deux tours",
  [ShowcaseStrings.VoteMethod_STAR]: "STAR",
  [ShowcaseStrings.VoteMethod_STV]: "STV",
  [ShowcaseStrings.VoteMethod_Quadratic]: "Quadratique",
  [ShowcaseStrings.VoteMethod_Consensus]: "Consensus",
  [ShowcaseStrings.VoteMethod_ConsentBased]: "Par consentement",

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]:
    "Bienvenue à l'élection budgétaire de Riverside City !",
  [ShowcaseStrings.Plur_IntroStory]:
    "Le conseil municipal a alloué 50 millions de dollars pour une initiative majeure, mais il n'arrive pas à décider quel projet financer. C'est là que VOUS intervenez !",
  [ShowcaseStrings.Plur_IntroSituation]:
    "Trois propositions sont sur le bulletin. Chacune a des partisans passionnés, mais UNE SEULE peut l'emporter.",
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    "L'équipe Verte veut des panneaux solaires sur chaque bâtiment public",
  [ShowcaseStrings.Plur_IntroTransit]:
    "Les défenseurs des transports poussent pour une nouvelle ligne de métro",
  [ShowcaseStrings.Plur_IntroHousing]:
    "La coalition pour le logement exige des logements abordables pour 500 familles",
  [ShowcaseStrings.Plur_IntroChallenge]:
    "Vous allez voter pour 5 citoyens. Chaque vote est chiffré — même les responsables électoraux ne peuvent pas voir les bulletins individuels avant le dépouillement final. C'est ainsi que les vraies démocraties devraient fonctionner !",
  [ShowcaseStrings.Plur_DemoTitle]:
    "🗳️ Vote à la pluralité — Budget de Riverside City",
  [ShowcaseStrings.Plur_DemoTagline]:
    "🏛️ Un vote par personne. Le plus de voix l'emporte. La démocratie en action !",
  [ShowcaseStrings.Plur_CandidatesTitle]: "Priorités budgétaires de la ville",
  [ShowcaseStrings.Plur_VoterInstruction]:
    "Cliquez sur une proposition pour exprimer le vote de chaque citoyen. N'oubliez pas : leur choix est chiffré et confidentiel !",
  [ShowcaseStrings.Plur_ClosePollsBtn]:
    "📦 Fermer les bureaux de vote et compter les voix !",
  [ShowcaseStrings.Plur_ResultsTitle]: "🎉 Le peuple a parlé !",
  [ShowcaseStrings.Plur_ResultsIntro]:
    "Après le déchiffrement de tous les votes, voici ce que Riverside a choisi :",
  [ShowcaseStrings.Plur_TallyTitle]: "📊 Processus de dépouillement",
  [ShowcaseStrings.Plur_TallyExplain]:
    "Chaque vote chiffré a été additionné de manière homomorphe, puis déchiffré pour révéler les totaux :",
  [ShowcaseStrings.Plur_Cand1_Name]: "Initiative énergie verte",
  [ShowcaseStrings.Plur_Cand1_Desc]:
    "Investir dans les infrastructures d'énergie renouvelable",
  [ShowcaseStrings.Plur_Cand2_Name]: "Extension des transports en commun",
  [ShowcaseStrings.Plur_Cand2_Desc]:
    "Construire de nouvelles lignes de métro et de bus",
  [ShowcaseStrings.Plur_Cand3_Name]: "Programme de logements abordables",
  [ShowcaseStrings.Plur_Cand3_Desc]:
    "Subventionner le logement pour les familles à faibles revenus",

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: "La grande décision de TechCorp !",
  [ShowcaseStrings.Appr_IntroStory]:
    "📢 Réunion d'équipe urgente : « Nous devons choisir notre stack technique pour les 5 prochaines années, mais tout le monde a un avis différent ! »",
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    "Le CTO a une idée brillante : le Vote par approbation. Au lieu de se battre pour UN seul langage, chacun peut voter pour TOUS les langages avec lesquels il serait content de travailler.",
  [ShowcaseStrings.Appr_IntroStakes]:
    "🤔 Le twist : Vous pouvez approuver autant ou aussi peu que vous voulez. Vous adorez TypeScript ET Python ? Votez pour les deux ! Vous ne faites confiance qu'à Rust ? C'est votre vote !",
  [ShowcaseStrings.Appr_IntroWinner]:
    "🎯 Le gagnant : Le langage qui obtient le plus d'approbations devient le langage principal de l'équipe.",
  [ShowcaseStrings.Appr_IntroChallenge]:
    "C'est ainsi que l'ONU élit son Secrétaire général. Pas de division des votes, pas de jeux stratégiques — juste des préférences honnêtes !",
  [ShowcaseStrings.Appr_StartBtn]: "🚀 Votons !",
  [ShowcaseStrings.Appr_DemoTitle]:
    "✅ Vote par approbation - Sélection du stack TechCorp",
  [ShowcaseStrings.Appr_DemoTagline]:
    "👍 Votez pour TOUS les langages que vous approuvez. Le plus d'approbations gagne !",
  [ShowcaseStrings.Appr_CandidatesTitle]:
    "Langages de programmation préférés de l'équipe",
  [ShowcaseStrings.Appr_Cand1_Desc]: "Sur-ensemble typé de JavaScript",
  [ShowcaseStrings.Appr_Cand2_Desc]: "Langage de script polyvalent",
  [ShowcaseStrings.Appr_Cand3_Desc]: "Langage système sûr en mémoire",
  [ShowcaseStrings.Appr_Cand4_Desc]: "Langage concurrent rapide",
  [ShowcaseStrings.Appr_Cand5_Desc]: "Plateforme d'entreprise",
  [ShowcaseStrings.Appr_VotersTitle]:
    "Votes exprimés ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Appr_SubmitBtn]: "Soumettre ({COUNT} sélectionnés)",
  [ShowcaseStrings.Appr_TallyBtn]:
    "Dépouiller les votes et révéler les résultats",
  [ShowcaseStrings.Appr_VotedBadge]: "✓ A voté",

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: "Sélection de la ville hôte olympique !",
  [ShowcaseStrings.Borda_IntroStory]:
    "🌍 Salle du comité du CIO : Cinq nations doivent choisir la prochaine ville hôte olympique. Mais chacun a ses préférences !",
  [ShowcaseStrings.Borda_IntroPoints]:
    "🎯 Le décompte de Borda attribue des points selon le classement : 1ère place = 3 points, 2ème = 2 points, 3ème = 1 point.",
  [ShowcaseStrings.Borda_IntroChallenge]:
    "💡 Cela récompense les choix consensuels plutôt que les choix polarisants. La ville avec le plus de points au total gagne !",
  [ShowcaseStrings.Borda_StartBtn]: "🏅 Commencer le vote !",
  [ShowcaseStrings.Borda_DemoTitle]:
    "🏆 Décompte de Borda - Sélection de l'hôte olympique",
  [ShowcaseStrings.Borda_DemoTagline]:
    "📊 Classez toutes les villes. Points = consensus !",
  [ShowcaseStrings.Borda_CandidatesTitle]: "Villes candidates",
  [ShowcaseStrings.Borda_Cand1_Desc]: "Ville Lumière",
  [ShowcaseStrings.Borda_Cand2_Desc]: "Soleil Levant",
  [ShowcaseStrings.Borda_Cand3_Desc]: "Cité des Anges",
  [ShowcaseStrings.Borda_VotersTitle]:
    "Membres du CIO ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Borda_RankedBadge]: "✓ Classé !",
  [ShowcaseStrings.Borda_TallyBtn]: "🏅 Compter les points !",
  [ShowcaseStrings.Borda_ResultsTitle]: "🎉 Ville hôte olympique annoncée !",
  [ShowcaseStrings.Borda_PointsTemplate]: "{COUNT} points",
  [ShowcaseStrings.Borda_NewVoteBtn]: "Nouveau vote",

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: "💬 Démo de messagerie BrightChain",
  [ShowcaseStrings.Msg_Subtitle]:
    "Envoyez des messages stockés sous forme de blocs CBL dans la soup !",
  [ShowcaseStrings.Msg_Initializing]: "Initialisation...",
  [ShowcaseStrings.Msg_SendTitle]: "Envoyer un message",
  [ShowcaseStrings.Msg_FromLabel]: "De :",
  [ShowcaseStrings.Msg_ToLabel]: "À :",
  [ShowcaseStrings.Msg_Placeholder]: "Saisissez votre message...",
  [ShowcaseStrings.Msg_SendBtn]: "📤 Envoyer le message",
  [ShowcaseStrings.Msg_ListTitleTemplate]: "📬 Messages ({COUNT})",
  [ShowcaseStrings.Msg_NoMessages]:
    "Aucun message pour l'instant. Envoyez votre premier message ! ✨",
  [ShowcaseStrings.Msg_From]: "De :",
  [ShowcaseStrings.Msg_To]: "À :",
  [ShowcaseStrings.Msg_Message]: "Message :",
  [ShowcaseStrings.Msg_RetrieveBtn]: "📥 Récupérer depuis la Soup",
  [ShowcaseStrings.Msg_SendFailed]: "Échec de l'envoi du message :",
  [ShowcaseStrings.Msg_RetrieveFailed]: "Échec de la récupération du message :",
  [ShowcaseStrings.Msg_ContentTemplate]: "Contenu du message : {CONTENT}",

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: "⛓️ Registre blockchain",
  [ShowcaseStrings.Ledger_Subtitle]:
    "Un registre en ajout seul, chaîné cryptographiquement, signé numériquement avec une gouvernance basée sur les rôles. Ajoutez des entrées, gérez les signataires et validez la chaîne.",
  [ShowcaseStrings.Ledger_Initializing]:
    "Génération des paires de clés SECP256k1 pour les signataires…",
  [ShowcaseStrings.Ledger_Entries]: "Entrées",
  [ShowcaseStrings.Ledger_ActiveSigners]: "Signataires actifs",
  [ShowcaseStrings.Ledger_Admins]: "Administrateurs",
  [ShowcaseStrings.Ledger_BrightTrust]: "BrightTrust",
  [ShowcaseStrings.Ledger_ValidateChain]: "🔍 Valider la chaîne",
  [ShowcaseStrings.Ledger_Reset]: "🔄 Réinitialiser",
  [ShowcaseStrings.Ledger_ActiveSigner]: "🔑 Signataire actif",
  [ShowcaseStrings.Ledger_AppendEntry]: "📝 Ajouter une entrée",
  [ShowcaseStrings.Ledger_PayloadLabel]: "Contenu (texte)",
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: "Saisissez les données…",
  [ShowcaseStrings.Ledger_AppendBtn]: "Ajouter à la chaîne",
  [ShowcaseStrings.Ledger_AuthorizedSigners]: "👥 Signataires autorisés",
  [ShowcaseStrings.Ledger_Suspend]: "Suspendre",
  [ShowcaseStrings.Ledger_Reactivate]: "Réactiver",
  [ShowcaseStrings.Ledger_ToAdmin]: "→ Admin",
  [ShowcaseStrings.Ledger_ToWriter]: "→ Rédacteur",
  [ShowcaseStrings.Ledger_Retire]: "Retirer",
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: "Nom du nouveau signataire",
  [ShowcaseStrings.Ledger_AddSigner]: "+ Ajouter un signataire",
  [ShowcaseStrings.Ledger_EventLog]: "📋 Journal des événements",
  [ShowcaseStrings.Ledger_Chain]: "⛓️ Chaîne",
  [ShowcaseStrings.Ledger_Genesis]: "🌱 Genèse",
  [ShowcaseStrings.Ledger_Governance]: "⚖️ Gouvernance",
  [ShowcaseStrings.Ledger_Data]: "📄 Données",
  [ShowcaseStrings.Ledger_EntryDetails]: "Détails de l'entrée #{SEQ}",
  [ShowcaseStrings.Ledger_Type]: "Type",
  [ShowcaseStrings.Ledger_Sequence]: "Séquence",
  [ShowcaseStrings.Ledger_Timestamp]: "Horodatage",
  [ShowcaseStrings.Ledger_EntryHash]: "Hash de l'entrée",
  [ShowcaseStrings.Ledger_PreviousHash]: "Hash précédent",
  [ShowcaseStrings.Ledger_NullGenesis]: "null (genèse)",
  [ShowcaseStrings.Ledger_Signer]: "Signataire",
  [ShowcaseStrings.Ledger_SignerKey]: "Clé du signataire",
  [ShowcaseStrings.Ledger_Signature]: "Signature",
  [ShowcaseStrings.Ledger_PayloadSize]: "Taille du contenu",
  [ShowcaseStrings.Ledger_Payload]: "Contenu",
  [ShowcaseStrings.Ledger_BytesTemplate]: "{COUNT} octets",

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: "Aller au contenu principal",

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: "Défiler pour explorer",

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: "⚠️ Avis de compatibilité du navigateur",
  [ShowcaseStrings.Compat_DismissAriaLabel]: "Fermer l'avertissement",
  [ShowcaseStrings.Compat_BrowserNotice]:
    "Votre navigateur ({BROWSER} {VERSION}) peut ne pas prendre en charge toutes les fonctionnalités de cette démo.",
  [ShowcaseStrings.Compat_CriticalIssues]: "Problèmes critiques :",
  [ShowcaseStrings.Compat_Warnings]: "Avertissements :",
  [ShowcaseStrings.Compat_RecommendedActions]: "Actions recommandées :",
  [ShowcaseStrings.Compat_Recommendation]:
    "Pour une expérience optimale, veuillez utiliser la dernière version de Chrome, Firefox, Safari ou Edge.",

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: "Panneau de débogage",
  [ShowcaseStrings.Debug_OpenTitle]: "Ouvrir le panneau de débogage",
  [ShowcaseStrings.Debug_CloseTitle]: "Fermer le panneau de débogage",
  [ShowcaseStrings.Debug_BlockStore]: "Magasin de blocs",
  [ShowcaseStrings.Debug_SessionId]: "ID de session :",
  [ShowcaseStrings.Debug_BlockCount]: "Nombre de blocs :",
  [ShowcaseStrings.Debug_TotalSize]: "Taille totale :",
  [ShowcaseStrings.Debug_LastOperation]: "Dernière opération :",
  [ShowcaseStrings.Debug_BlockIdsTemplate]: "IDs de blocs ({COUNT})",
  [ShowcaseStrings.Debug_ClearSession]: "Effacer la session",
  [ShowcaseStrings.Debug_AnimationState]: "État de l'animation",
  [ShowcaseStrings.Debug_Playing]: "En lecture",
  [ShowcaseStrings.Debug_Paused]: "En pause",
  [ShowcaseStrings.Debug_StatusPlaying]: "▶️ En lecture",
  [ShowcaseStrings.Debug_StatusPaused]: "⏸️ En pause",
  [ShowcaseStrings.Debug_Speed]: "Vitesse :",
  [ShowcaseStrings.Debug_Frame]: "Image :",
  [ShowcaseStrings.Debug_Sequence]: "Séquence :",
  [ShowcaseStrings.Debug_Progress]: "Progression :",
  [ShowcaseStrings.Debug_Performance]: "Performance",
  [ShowcaseStrings.Debug_FrameRate]: "Fréquence d'images :",
  [ShowcaseStrings.Debug_FrameTime]: "Temps d'image :",
  [ShowcaseStrings.Debug_DroppedFrames]: "Images perdues :",
  [ShowcaseStrings.Debug_Memory]: "Mémoire :",
  [ShowcaseStrings.Debug_Sequences]: "Séquences :",
  [ShowcaseStrings.Debug_Errors]: "Erreurs :",

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: "🔄 Animation de reconstruction de fichier",
  [ShowcaseStrings.Recon_Subtitle]:
    "Observez comment les blocs sont réassemblés pour reconstituer votre fichier original",
  [ShowcaseStrings.Recon_Step_ProcessCBL]: "Traitement du CBL",
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    "Lecture des métadonnées de la liste de blocs constitutifs",
  [ShowcaseStrings.Recon_Step_SelectBlocks]: "Sélection des blocs",
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    "Identification des blocs requis dans la soup",
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: "Récupération des blocs",
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
    "Collecte des blocs depuis le stockage",
  [ShowcaseStrings.Recon_Step_ValidateChecksums]:
    "Validation des sommes de contrôle",
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    "Vérification de l'intégrité des blocs",
  [ShowcaseStrings.Recon_Step_Reassemble]: "Réassemblage du fichier",
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    "Combinaison des blocs et suppression du remplissage",
  [ShowcaseStrings.Recon_Step_DownloadReady]: "Prêt au téléchargement",
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    "Reconstruction du fichier terminée",
  [ShowcaseStrings.Recon_CBLTitle]: "📋 Liste de blocs constitutifs",
  [ShowcaseStrings.Recon_CBLSubtitle]: "Références de blocs extraites du CBL",
  [ShowcaseStrings.Recon_BlocksTemplate]: "🥫 Blocs ({COUNT})",
  [ShowcaseStrings.Recon_BlocksSubtitle]:
    "Blocs en cours de récupération et de validation",
  [ShowcaseStrings.Recon_ReassemblyTitle]: "🔧 Réassemblage du fichier",
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    "Combinaison des blocs et suppression du remplissage",
  [ShowcaseStrings.Recon_Complete]: "Reconstruction du fichier terminée !",
  [ShowcaseStrings.Recon_ReadyForDownload]:
    "Votre fichier est prêt au téléchargement",
  [ShowcaseStrings.Recon_FileName]: "Nom du fichier :",
  [ShowcaseStrings.Recon_Size]: "Taille :",
  [ShowcaseStrings.Recon_Blocks]: "Blocs :",
  [ShowcaseStrings.Recon_WhatsHappening]: "Ce qui se passe maintenant",
  [ShowcaseStrings.Recon_TechDetails]: "Détails techniques :",
  [ShowcaseStrings.Recon_CBLContainsRefs]:
    "Le CBL contient les références de tous les blocs",
  [ShowcaseStrings.Recon_BlockCountTemplate]: "Nombre de blocs : {COUNT}",
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    "Taille du fichier original : {SIZE} octets",
  [ShowcaseStrings.Recon_BlockSelection]: "Sélection des blocs :",
  [ShowcaseStrings.Recon_IdentifyingBlocks]:
    "Identification des blocs dans la soup",
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    "Les blocs sont sélectionnés par leurs sommes de contrôle",
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    "Tous les blocs doivent être présents pour la reconstruction",
  [ShowcaseStrings.Recon_ChecksumValidation]:
    "Validation des sommes de contrôle :",
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    "Garantit que les blocs n'ont pas été corrompus",
  [ShowcaseStrings.Recon_ComparesChecksums]:
    "Compare la somme de contrôle stockée avec la somme de contrôle calculée",
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    "Des blocs invalides entraîneraient un échec de la reconstruction",
  [ShowcaseStrings.Recon_FileReassembly]: "Réassemblage du fichier :",
  [ShowcaseStrings.Recon_CombinedInOrder]:
    "Les blocs sont combinés dans le bon ordre",
  [ShowcaseStrings.Recon_PaddingRemoved]:
    "Le remplissage aléatoire est supprimé",
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    "Le fichier original est reconstruit octet par octet",

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: "Démo animée BrightChain Block Soup",
  [ShowcaseStrings.Anim_Subtitle]:
    "Découvrez le processus BrightChain avec des animations étape par étape et du contenu éducatif !",
  [ShowcaseStrings.Anim_Initializing]:
    "Initialisation de la démo animée BrightChain...",
  [ShowcaseStrings.Anim_PauseAnimation]: "Mettre l'animation en pause",
  [ShowcaseStrings.Anim_PlayAnimation]: "Lancer l'animation",
  [ShowcaseStrings.Anim_ResetAnimation]: "Réinitialiser l'animation",
  [ShowcaseStrings.Anim_SpeedTemplate]: "Vitesse : {SPEED}x",
  [ShowcaseStrings.Anim_PerfMonitor]: "🔧 Moniteur de performance",
  [ShowcaseStrings.Anim_FrameRate]: "Fréquence d'images :",
  [ShowcaseStrings.Anim_FrameTime]: "Temps d'image :",
  [ShowcaseStrings.Anim_DroppedFrames]: "Images perdues :",
  [ShowcaseStrings.Anim_Memory]: "Mémoire :",
  [ShowcaseStrings.Anim_Sequences]: "Séquences :",
  [ShowcaseStrings.Anim_Errors]: "Erreurs :",
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    "Déposez des fichiers ici ou cliquez pour téléverser",
  [ShowcaseStrings.Anim_ChooseFiles]: "Choisir des fichiers",
  [ShowcaseStrings.Anim_StorageTemplate]:
    "Stockage Block Soup ({COUNT} fichiers)",
  [ShowcaseStrings.Anim_NoFilesYet]:
    "Aucun fichier stocké pour le moment. Téléversez des fichiers pour voir la magie animée ! ✨",
  [ShowcaseStrings.Anim_RetrieveFile]: "Récupérer le fichier",
  [ShowcaseStrings.Anim_DownloadCBL]: "Télécharger le CBL",
  [ShowcaseStrings.Anim_SizeTemplate]:
    "Taille : {SIZE} octets | Blocs : {BLOCKS}",
  [ShowcaseStrings.Anim_EncodingAnimation]: "Animation d'encodage",
  [ShowcaseStrings.Anim_ReconstructionAnimation]: "Animation de reconstruction",
  [ShowcaseStrings.Anim_CurrentStep]: "Étape actuelle",
  [ShowcaseStrings.Anim_DurationTemplate]: "Durée : {DURATION} ms",
  [ShowcaseStrings.Anim_BlockDetails]: "Détails du bloc",
  [ShowcaseStrings.Anim_Index]: "Index :",
  [ShowcaseStrings.Anim_Size]: "Taille :",
  [ShowcaseStrings.Anim_Id]: "ID :",
  [ShowcaseStrings.Anim_Stats]: "Statistiques d'animation",
  [ShowcaseStrings.Anim_TotalFiles]: "Total des fichiers :",
  [ShowcaseStrings.Anim_TotalBlocks]: "Total des blocs :",
  [ShowcaseStrings.Anim_AnimationSpeed]: "Vitesse d'animation :",
  [ShowcaseStrings.Anim_Session]: "Session :",
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    "(Les données sont effacées au rafraîchissement de la page)",
  [ShowcaseStrings.Anim_WhatsHappening]: "Ce qui se passe :",
  [ShowcaseStrings.Anim_Duration]: "Durée :",

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: "Démo BrightChain",
  [ShowcaseStrings.Soup_Subtitle]:
    "Stockez des fichiers et des messages sous forme de blocs dans la block soup décentralisée. Tout devient de jolies boîtes de conserve colorées !",
  [ShowcaseStrings.Soup_Initializing]:
    "Initialisation de SessionIsolatedBrightChain...",
  [ShowcaseStrings.Soup_StoreInSoup]: "Stocker des données dans la Block Soup",
  [ShowcaseStrings.Soup_StoreFiles]: "📁 Stocker des fichiers",
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    "Déposez des fichiers ici ou cliquez pour téléverser",
  [ShowcaseStrings.Soup_ChooseFiles]: "Choisir des fichiers",
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    "🔐 Stocker le CBL dans la soup avec URL magnet",
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    "Stocke le CBL dans la block soup en utilisant le blanchiment XOR et génère une URL magnet partageable. Sans cela, vous obtenez le fichier CBL directement.",
  [ShowcaseStrings.Soup_StoreMessages]: "💬 Stocker des messages",
  [ShowcaseStrings.Soup_From]: "De :",
  [ShowcaseStrings.Soup_To]: "À :",
  [ShowcaseStrings.Soup_Message]: "Message :",
  [ShowcaseStrings.Soup_TypeMessage]: "Saisissez votre message...",
  [ShowcaseStrings.Soup_SendToSoup]: "📤 Envoyer le message dans la Soup",
  [ShowcaseStrings.Soup_CBLStoredInSoup]: "🔐 CBL stocké dans la Soup",
  [ShowcaseStrings.Soup_SuperCBLUsed]: "📊 Super CBL utilisé",
  [ShowcaseStrings.Soup_HierarchyDepth]: "Profondeur de hiérarchie :",
  [ShowcaseStrings.Soup_SubCBLs]: "Sous-CBLs :",
  [ShowcaseStrings.Soup_LargeFileSplit]:
    "Fichier volumineux divisé en structure hiérarchique",
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    "Votre CBL a été stocké dans la block soup sous forme de deux composants XOR. Utilisez cette URL magnet pour récupérer le fichier :",
  [ShowcaseStrings.Soup_Component1]: "Composant 1 :",
  [ShowcaseStrings.Soup_Component2]: "Composant 2 :",
  [ShowcaseStrings.Soup_Copy]: "📋 Copier",
  [ShowcaseStrings.Soup_RetrieveFromSoup]: "Récupérer depuis la Soup",
  [ShowcaseStrings.Soup_UploadCBLFile]: "Téléverser un fichier CBL",
  [ShowcaseStrings.Soup_UseMagnetURL]: "Utiliser une URL Magnet",
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    "Téléversez un fichier .cbl pour reconstruire le fichier original depuis la block soup. Les blocs doivent déjà être dans la soup pour que la reconstruction fonctionne.",
  [ShowcaseStrings.Soup_ChooseCBLFile]: "Choisir un fichier CBL",
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    "Collez une URL magnet pour récupérer le fichier. L'URL magnet référence les composants CBL blanchis stockés dans la soup.",
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    "magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...",
  [ShowcaseStrings.Soup_Load]: "Charger",
  [ShowcaseStrings.Soup_MessagePassing]: "Transmission de messages",
  [ShowcaseStrings.Soup_HideMessagePanel]: "Masquer le panneau de messages",
  [ShowcaseStrings.Soup_ShowMessagePanel]: "Afficher le panneau de messages",
  [ShowcaseStrings.Soup_SendMessage]: "Envoyer le message",
  [ShowcaseStrings.Soup_MessagesTemplate]: "📬 Messages ({COUNT})",
  [ShowcaseStrings.Soup_NoMessagesYet]:
    "Aucun message pour l'instant. Envoyez votre premier message ! ✨",
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: "📥 Récupérer depuis la Soup",
  [ShowcaseStrings.Soup_StoredMessages]: "Messages stockés",
  [ShowcaseStrings.Soup_StoredFilesAndMessages]: "Fichiers et messages stockés",
  [ShowcaseStrings.Soup_RemoveFromList]: "Retirer de la liste",
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    "Retirer « {NAME} » de la liste ? (Les blocs resteront dans la soup)",
  [ShowcaseStrings.Soup_RetrieveFile]: "📥 Récupérer le fichier",
  [ShowcaseStrings.Soup_DownloadCBL]: "Télécharger le CBL",
  [ShowcaseStrings.Soup_RetrieveMessage]: "📥 Récupérer le message",
  [ShowcaseStrings.Soup_MagnetURL]: "🧲 URL Magnet",
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    "URL magnet du CBL blanchi (utilisez « Utiliser une URL Magnet » pour récupérer)",
  [ShowcaseStrings.Soup_ProcessingSteps]: "Étapes de traitement",
  [ShowcaseStrings.Soup_CBLStorageSteps]: "Étapes de stockage du CBL",
  [ShowcaseStrings.Soup_BlockDetails]: "Détails du bloc",
  [ShowcaseStrings.Soup_Index]: "Index :",
  [ShowcaseStrings.Soup_Size]: "Taille :",
  [ShowcaseStrings.Soup_Id]: "ID :",
  [ShowcaseStrings.Soup_Color]: "Couleur :",
  [ShowcaseStrings.Soup_SoupStats]: "Statistiques de la Soup",
  [ShowcaseStrings.Soup_TotalFiles]: "Total des fichiers :",
  [ShowcaseStrings.Soup_TotalBlocks]: "Total des blocs :",
  [ShowcaseStrings.Soup_BlockSize]: "Taille de bloc :",
  [ShowcaseStrings.Soup_SessionDebug]: "Débogage de session",
  [ShowcaseStrings.Soup_SessionId]: "ID de session :",
  [ShowcaseStrings.Soup_BlocksInMemory]: "Blocs en mémoire :",
  [ShowcaseStrings.Soup_BlockIds]: "IDs de blocs :",
  [ShowcaseStrings.Soup_ClearSession]: "Effacer la session",
  [ShowcaseStrings.Soup_Session]: "Session :",
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    "(Les données sont effacées au rafraîchissement de la page)",

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]:
    "Sélectionnez un fichier pour mettre en surbrillance ses blocs :",
  [ShowcaseStrings.ESV_BlockSoup]: "Soupe de blocs",
  [ShowcaseStrings.ESV_ShowingConnections]: "Affichage des connexions pour :",
  [ShowcaseStrings.ESV_EmptySoup]: "Soupe vide",
  [ShowcaseStrings.ESV_EmptySoupHint]:
    "Téléchargez des fichiers pour les voir transformés en boîtes de soupe colorées !",
  [ShowcaseStrings.ESV_FileStats]: "{blocks} blocs • {size} octets",

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]:
    "Soirée des prix des critiques de cinéma !",
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    "Trois films sont nominés pour le meilleur film. Les critiques doivent noter chacun indépendamment.",
  [ShowcaseStrings.Score_IntroStoryScoring]:
    "Notez chaque film de 0 à 10. Vous en adorez un, vous en détestez un autre ? Notez-les honnêtement ! La meilleure moyenne gagne.",
  [ShowcaseStrings.Score_IntroChallenge]:
    "Contrairement au classement, vous pouvez donner des notes élevées à plusieurs films s'ils sont tous excellents !",
  [ShowcaseStrings.Score_StartBtn]: "🎬 Commencer les notes !",
  [ShowcaseStrings.Score_DemoTitle]: "⭐ Vote par score - Meilleur film",
  [ShowcaseStrings.Score_DemoTagline]:
    "🎬 Notez chaque film de 0 à 10. La meilleure moyenne gagne !",
  [ShowcaseStrings.Score_NominatedFilms]: "Films nominés",
  [ShowcaseStrings.Score_Genre_SciFi]: "Épopée de science-fiction",
  [ShowcaseStrings.Score_Genre_Romance]: "Drame romantique",
  [ShowcaseStrings.Score_Genre_Thriller]: "Thriller technologique",
  [ShowcaseStrings.Score_VoterRatingsTemplate]: "🎭 Notes de {VOTER}",
  [ShowcaseStrings.Score_Label_Terrible]: "0 - Terrible",
  [ShowcaseStrings.Score_Label_Average]: "5 - Moyen",
  [ShowcaseStrings.Score_Label_Masterpiece]: "10 - Chef-d'œuvre",
  [ShowcaseStrings.Score_SubmitTemplate]:
    "Soumettre les notes ({CURRENT}/{TOTAL})",
  [ShowcaseStrings.Score_Encrypting]: "🔐 Chiffrement...",
  [ShowcaseStrings.Score_EncryptingVote]: "Chiffrement du vote...",
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    "📋 Critiques ayant noté : {COUNT}/{TOTAL}",
  [ShowcaseStrings.Score_TallyBtn]: "🏆 Calculer les moyennes !",
  [ShowcaseStrings.Score_ResultsTitle]: "🎉 Et le gagnant est...",
  [ShowcaseStrings.Score_TallyTitle]: "📊 Processus de calcul des moyennes",
  [ShowcaseStrings.Score_TallyExplain]:
    "Les scores de chaque film ont été additionnés et divisés par {COUNT} critiques :",
  [ShowcaseStrings.Score_AverageTemplate]: "{AVG}/10 de moyenne",
  [ShowcaseStrings.Score_ResetBtn]: "Nouvelle cérémonie",

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]:
    "Drame en salle de conseil chez StartupCo !",
  [ShowcaseStrings.Weight_IntroStoryScene]:
    "C'est l'assemblée annuelle des actionnaires. L'entreprise vaut 100 M$ et tout le monde veut avoir son mot à dire.",
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    "Tous les votes ne sont pas égaux. Le fonds de capital-risque détient 45 % des parts. Les fondateurs détiennent 30 % et 15 %. Les employés et les investisseurs providentiels détiennent le reste.",
  [ShowcaseStrings.Weight_StakeExpand]:
    "Énorme potentiel de croissance, mais risqué",
  [ShowcaseStrings.Weight_StakeAcquire]:
    "Éliminer la concurrence, mais coûteux",
  [ShowcaseStrings.Weight_StakeIPO]:
    "L'introduction en bourse signifie liquidité, mais aussi surveillance",
  [ShowcaseStrings.Weight_IntroChallenge]:
    "Chaque vote est pondéré par les parts détenues. Le vote du fonds de capital-risque compte 18 fois plus que celui de l'investisseur providentiel. C'est la démocratie d'entreprise !",
  [ShowcaseStrings.Weight_StartBtn]: "📄 Entrer dans la salle de conseil",
  [ShowcaseStrings.Weight_DemoTitle]:
    "⚖️ Vote pondéré - Conseil d'administration de StartupCo",
  [ShowcaseStrings.Weight_DemoTagline]:
    "💰 Vos parts = Votre pouvoir de vote. Bienvenue dans la gouvernance d'entreprise !",
  [ShowcaseStrings.Weight_ProposalsTitle]: "Propositions stratégiques",
  [ShowcaseStrings.Weight_Proposal1_Desc]:
    "Ouvrir des bureaux à Tokyo et Singapour",
  [ShowcaseStrings.Weight_Proposal2_Desc]: "Fusionner avec TechStartup Inc.",
  [ShowcaseStrings.Weight_Proposal3_Desc]:
    "Entrer en bourse au NASDAQ le trimestre prochain",
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    "Actionnaires ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Weight_ShareInfoTemplate]: "{SHARES} parts ({PERCENT}%)",
  [ShowcaseStrings.Weight_VoteCastTemplate]: "✓ A voté pour {EMOJI} {NAME}",
  [ShowcaseStrings.Weight_TallyBtn]: "Décompte des votes pondérés",
  [ShowcaseStrings.Weight_ResultsTitle]: "🏆 Résultats (par poids des parts)",
  [ShowcaseStrings.Weight_SharesTemplate]: "{TALLY} parts ({PERCENT}%)",
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    "💡 La proposition gagnante a reçu {PERCENT}% du total des parts",
  [ShowcaseStrings.Weight_ResetBtn]: "Nouveau vote",

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: "Référendum national !",
  [ShowcaseStrings.YN_IntroQuestion]:
    "🏛️ La question : « Notre pays devrait-il adopter la semaine de 4 jours ? »",
  [ShowcaseStrings.YN_IntroStory]:
    "📊 Référendum Oui/Non : La forme la plus simple de démocratie. Une question, deux choix, la majorité décide.",
  [ShowcaseStrings.YN_IntroYesCampaign]:
    "✅ Campagne OUI : Meilleur équilibre vie pro/perso, productivité accrue, citoyens plus heureux !",
  [ShowcaseStrings.YN_IntroNoCampaign]:
    "❌ Campagne NON : Risque économique, perturbation des entreprises, politique non testée !",
  [ShowcaseStrings.YN_IntroChallenge]:
    "🗳️ Utilisé pour le Brexit, l'indépendance écossaise et les changements constitutionnels dans le monde.",
  [ShowcaseStrings.YN_StartBtn]: "🗳️ Votez maintenant !",
  [ShowcaseStrings.YN_DemoTitle]: "👍 Référendum Oui/Non - Semaine de 4 jours",
  [ShowcaseStrings.YN_DemoTagline]:
    "🗳️ Une question. Deux choix. La démocratie décide.",
  [ShowcaseStrings.YN_ReferendumQuestion]:
    "Devrions-nous adopter la semaine de 4 jours ?",
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    "Citoyens votants ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.YN_VotedYes]: "✓ A voté 👍 OUI",
  [ShowcaseStrings.YN_VotedNo]: "✓ A voté 👎 NON",
  [ShowcaseStrings.YN_BtnYes]: "👍 OUI",
  [ShowcaseStrings.YN_BtnNo]: "👎 NON",
  [ShowcaseStrings.YN_TallyBtn]: "📊 Compter les votes !",
  [ShowcaseStrings.YN_ResultsTitle]: "🎉 Résultats du référendum !",
  [ShowcaseStrings.YN_LabelYes]: "OUI",
  [ShowcaseStrings.YN_LabelNo]: "NON",
  [ShowcaseStrings.YN_MotionPasses]: "✅ La motion est ADOPTÉE !",
  [ShowcaseStrings.YN_MotionFails]: "❌ La motion est REJETÉE !",
  [ShowcaseStrings.YN_OutcomePass]:
    "Le peuple a parlé : Nous adoptons la semaine de 4 jours !",
  [ShowcaseStrings.YN_OutcomeFail]:
    "Le peuple a parlé : Nous gardons la semaine de 5 jours.",
  [ShowcaseStrings.YN_ResetBtn]: "Nouveau référendum",

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]:
    "Résolution du Conseil de sécurité de l'ONU !",
  [ShowcaseStrings.YNA_IntroResolution]:
    "🌍 La résolution : « L'ONU devrait-elle imposer des sanctions au Pays X pour violations des droits de l'homme ? »",
  [ShowcaseStrings.YNA_IntroStory]:
    "🤷 Oui/Non/Abstention : Parfois on n'est pas prêt à décider. Les abstentions ne comptent pas dans le total mais sont enregistrées.",
  [ShowcaseStrings.YNA_IntroYes]:
    "✅ OUI : Imposer des sanctions immédiatement",
  [ShowcaseStrings.YNA_IntroNo]: "❌ NON : Rejeter la résolution",
  [ShowcaseStrings.YNA_IntroAbstain]:
    "🤷 ABSTENTION : Neutre - ne veut pas prendre parti",
  [ShowcaseStrings.YNA_IntroChallenge]:
    "🏛️ Utilisé dans les votes de l'ONU, les procédures parlementaires et les réunions de conseil dans le monde.",
  [ShowcaseStrings.YNA_StartBtn]: "🌎 Voter !",
  [ShowcaseStrings.YNA_DemoTitle]:
    "🤷 Oui/Non/Abstention - Résolution de l'ONU",
  [ShowcaseStrings.YNA_DemoTagline]:
    "🌍 Trois choix : Soutenir, S'opposer ou Rester neutre",
  [ShowcaseStrings.YNA_ReferendumQuestion]: "Imposer des sanctions au Pays X ?",
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    "Membres du Conseil de sécurité ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.YNA_VotedYes]: "✓ 👍 OUI",
  [ShowcaseStrings.YNA_VotedNo]: "✓ 👎 NON",
  [ShowcaseStrings.YNA_VotedAbstain]: "✓ 🤷 ABSTENTION",
  [ShowcaseStrings.YNA_BtnYes]: "👍 OUI",
  [ShowcaseStrings.YNA_BtnNo]: "👎 NON",
  [ShowcaseStrings.YNA_BtnAbstain]: "🤷 ABSTENTION",
  [ShowcaseStrings.YNA_TallyBtn]: "📊 Décompte de la résolution !",
  [ShowcaseStrings.YNA_ResultsTitle]: "🌎 Résultats de la résolution !",
  [ShowcaseStrings.YNA_TallyTitle]: "📊 Décompte des votes",
  [ShowcaseStrings.YNA_TallyExplain]:
    "Les abstentions sont enregistrées mais ne comptent pas dans la décision. Le gagnant a besoin de la majorité des votes OUI/NON :",
  [ShowcaseStrings.YNA_LabelYes]: "OUI",
  [ShowcaseStrings.YNA_LabelNo]: "NON",
  [ShowcaseStrings.YNA_LabelAbstain]: "ABSTENTION",
  [ShowcaseStrings.YNA_AbstainNote]: "Non compté dans la décision",
  [ShowcaseStrings.YNA_ResolutionPasses]: "✅ La résolution est ADOPTÉE !",
  [ShowcaseStrings.YNA_ResolutionFails]: "❌ La résolution est REJETÉE !",
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    "Votes décisifs : {DECIDING} | Abstentions : {ABSTENTIONS}",
  [ShowcaseStrings.YNA_ResetBtn]: "Nouvelle résolution",

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: "Vote d'amendement constitutionnel !",
  [ShowcaseStrings.Super_IntroStakes]:
    "🏛️ Les enjeux : Modifier la Constitution nécessite plus qu'une simple majorité. Il faut une SUPERMAJORITÉ !",
  [ShowcaseStrings.Super_IntroThreshold]:
    "🎯 Seuil de 2/3 : Au moins 66,67 % doivent voter OUI pour que l'amendement passe. Cela protège contre les changements hâtifs.",
  [ShowcaseStrings.Super_IntroAmendment]:
    "📜 L'amendement : « Ajouter des limites de mandat pour tous les juges fédéraux »",
  [ShowcaseStrings.Super_IntroHighBar]:
    "⚠️ Barre haute : 6 des 9 États doivent ratifier (la majorité simple ne suffit pas !)",
  [ShowcaseStrings.Super_IntroChallenge]:
    "🌎 Utilisé pour les changements constitutionnels, les ratifications de traités et les procès en destitution.",
  [ShowcaseStrings.Super_StartBtn]: "🗳️ Commencer la ratification !",
  [ShowcaseStrings.Super_DemoTitle]:
    "🎯 Supermajorité - Amendement constitutionnel",
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    "📊 Nécessite {PERCENT}% pour passer ({REQUIRED}/{TOTAL} États)",
  [ShowcaseStrings.Super_TrackerTitle]: "📊 Suivi du seuil en direct",
  [ShowcaseStrings.Super_YesCountTemplate]: "{COUNT} OUI",
  [ShowcaseStrings.Super_RequiredTemplate]: "{PERCENT}% requis",
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    "✅ Actuellement ADOPTÉ ({YES}/{TOTAL} = {PERCENT}%)",
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    "❌ Actuellement REJETÉ ({YES}/{TOTAL} = {PERCENT}%) - Besoin de {NEED} OUI supplémentaires",
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    "Législatures des États ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Super_VotedRatify]: "✓ ✅ RATIFIER",
  [ShowcaseStrings.Super_VotedReject]: "✓ ❌ REJETER",
  [ShowcaseStrings.Super_BtnRatify]: "✅ RATIFIER",
  [ShowcaseStrings.Super_BtnReject]: "❌ REJETER",
  [ShowcaseStrings.Super_TallyBtn]: "📜 Décompte final !",
  [ShowcaseStrings.Super_ResultsTitle]: "🏛️ Résultats de l'amendement !",
  [ShowcaseStrings.Super_CalcTitle]: "📊 Calcul de la supermajorité",
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    "Requis : {REQUIRED}/{TOTAL} États ({PERCENT}%)",
  [ShowcaseStrings.Super_CalcActualTemplate]:
    "Réel : {ACTUAL}/{VOTED} États ({PERCENT}%)",
  [ShowcaseStrings.Super_RatifyCountTemplate]: "✅ {COUNT} RATIFIER",
  [ShowcaseStrings.Super_RejectCountTemplate]: "❌ {COUNT} REJETER",
  [ShowcaseStrings.Super_ThresholdTemplate]: "⬆️ Seuil de {PERCENT}%",
  [ShowcaseStrings.Super_AmendmentRatified]: "✅ AMENDEMENT RATIFIÉ !",
  [ShowcaseStrings.Super_AmendmentFails]: "❌ L'AMENDEMENT ÉCHOUE !",
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    "L'amendement passe avec {COUNT} États ({PERCENT}%)",
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    "N'a pas atteint le seuil de {THRESHOLD}%. Seulement {ACTUAL} des {REQUIRED} États requis ont ratifié.",
  [ShowcaseStrings.Super_ResetBtn]: "Nouvel amendement",

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: "Le Grand Duel Politique !",
  [ShowcaseStrings.RC_IntroStory]:
    "🏛️ Soirée électorale spéciale : Quatre partis se battent pour le pouvoir. Mais voici le rebondissement - personne ne veut que le vote divisé donne la victoire à son candidat le moins aimé !",
  [ShowcaseStrings.RC_IntroRCV]:
    "🧠 Le Vote par Classement à la rescousse ! Au lieu de choisir un seul candidat, vous classez TOUS les candidats du préféré au moins aimé.",
  [ShowcaseStrings.RC_IntroHowItWorks]:
    "🔥 Comment ça marche : Si personne n'obtient 50%+ au premier tour, on élimine le dernier et on transfère ses votes aux 2èmes choix des électeurs. On répète jusqu'à ce qu'un candidat gagne !",
  [ShowcaseStrings.RC_IntroWhyCool]:
    "✨ Pourquoi c'est génial : Vous pouvez voter avec votre cœur au 1er tour sans « gaspiller » votre vote. Vos choix de secours entrent en jeu si votre favori est éliminé.",
  [ShowcaseStrings.RC_IntroChallenge]:
    "🌎 Utilisé en Australie, dans le Maine, en Alaska et à New York ! Regardez le scrutin instantané se dérouler sous vos yeux.",
  [ShowcaseStrings.RC_StartBtn]: "🗳️ Commencer le classement !",
  [ShowcaseStrings.RC_DemoTitle]: "🔄 Vote par Classement - Élection Nationale",
  [ShowcaseStrings.RC_DemoTagline]:
    "🎯 Classez-les TOUS ! Pas de gâchis, pas de regrets, juste la démocratie.",
  [ShowcaseStrings.RC_PartiesTitle]: "Partis Politiques",
  [ShowcaseStrings.RC_Cand1_Platform]: "Santé universelle, action climatique",
  [ShowcaseStrings.RC_Cand2_Platform]:
    "Baisser les impôts, valeurs traditionnelles",
  [ShowcaseStrings.RC_Cand3_Platform]:
    "Liberté individuelle, petit gouvernement",
  [ShowcaseStrings.RC_Cand4_Platform]:
    "Protection de l'environnement, durabilité",
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    "Classez vos préférences ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.RC_VotedBadge]: "✓ A voté",
  [ShowcaseStrings.RC_AddToRanking]: "Ajouter au classement :",
  [ShowcaseStrings.RC_SubmitBallot]: "Soumettre le bulletin",
  [ShowcaseStrings.RC_RunInstantRunoff]: "Lancer le scrutin instantané",
  [ShowcaseStrings.RC_ShowBulletinBoard]: "📜 Afficher le tableau d'affichage",
  [ShowcaseStrings.RC_HideBulletinBoard]: "📜 Masquer le tableau d'affichage",
  [ShowcaseStrings.RC_BulletinBoardTitle]:
    "📜 Tableau d'affichage public (Exigence 1.2)",
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    "Publication transparente des votes en ajout seul avec vérification par arbre de Merkle",
  [ShowcaseStrings.RC_EntryTemplate]: "Entrée #{SEQ}",
  [ShowcaseStrings.RC_EncryptedVote]: "Vote chiffré :",
  [ShowcaseStrings.RC_VoterHash]: "Hash de l'électeur :",
  [ShowcaseStrings.RC_Verified]: "✅ Vérifié",
  [ShowcaseStrings.RC_Invalid]: "❌ Invalide",
  [ShowcaseStrings.RC_MerkleTree]: "Arbre de Merkle :",
  [ShowcaseStrings.RC_MerkleValid]: "✅ Valide",
  [ShowcaseStrings.RC_MerkleCompromised]: "❌ Compromis",
  [ShowcaseStrings.RC_TotalEntries]: "Total des entrées :",
  [ShowcaseStrings.RC_ResultsTitle]: "🏆 Résultats du scrutin instantané",
  [ShowcaseStrings.RC_EliminationRounds]: "Tours d'élimination",
  [ShowcaseStrings.RC_RoundTemplate]: "Tour {ROUND}",
  [ShowcaseStrings.RC_Eliminated]: "Éliminé",
  [ShowcaseStrings.RC_Winner]: "Gagnant !",
  [ShowcaseStrings.RC_FinalWinner]: "Gagnant final",
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]: "A gagné après {COUNT} tour(s)",
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: "Élection Présidentielle - Deux Tours !",
  [ShowcaseStrings.TR_IntroSystem]:
    "🗳️ Le Système : Quatre candidats s'affrontent. Si personne n'obtient 50%+ au Tour 1, les 2 premiers s'affrontent au Tour 2 !",
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    "🎯 Pourquoi deux tours ? Garantit que le gagnant a le soutien de la majorité. Utilisé en France, au Brésil et dans de nombreuses élections présidentielles.",
  [ShowcaseStrings.TR_IntroRound1]:
    "📊 Tour 1 : Votez pour votre favori parmi les 4 candidats",
  [ShowcaseStrings.TR_IntroRound2]:
    "🔄 Tour 2 : Si nécessaire, choisissez entre les 2 premiers",
  [ShowcaseStrings.TR_IntroChallenge]:
    "⚠️ Cela nécessite un déchiffrement intermédiaire entre les tours - les votes ne sont pas privés entre les tours !",
  [ShowcaseStrings.TR_StartBtn]: "🗳️ Commencer le Tour 1 !",
  [ShowcaseStrings.TR_DemoTitle]:
    "2️⃣ Vote à Deux Tours - Élection Présidentielle",
  [ShowcaseStrings.TR_TaglineRound1]: "🔄 Tour 1 : Choisissez votre favori",
  [ShowcaseStrings.TR_TaglineRound2]: "🔄 Tour 2 : Scrutin final !",
  [ShowcaseStrings.TR_Round1Candidates]: "Candidats du Tour 1",
  [ShowcaseStrings.TR_Cand1_Party]: "Parti Progressiste",
  [ShowcaseStrings.TR_Cand2_Party]: "Parti Conservateur",
  [ShowcaseStrings.TR_Cand3_Party]: "Tech en Avant",
  [ShowcaseStrings.TR_Cand4_Party]: "Coalition pour la Justice",
  [ShowcaseStrings.TR_VotersTemplate]: "Électeurs ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.TR_VotedForTemplate]: "✓ A voté pour {EMOJI}",
  [ShowcaseStrings.TR_CountRound1]: "📊 Compter les votes du Tour 1 !",
  [ShowcaseStrings.TR_Round1Results]: "🗳️ Résultats du Tour 1",
  [ShowcaseStrings.TR_Round1TallyTitle]: "📊 Décompte du premier tour",
  [ShowcaseStrings.TR_Round1TallyExplain]:
    "Vérification si quelqu'un a obtenu 50%+ de majorité...",
  [ShowcaseStrings.TR_AdvanceRound2]: "→ Tour 2",
  [ShowcaseStrings.TR_EliminatedBadge]: "Éliminé",
  [ShowcaseStrings.TR_NoMajority]:
    "🔄 Pas de majorité ! Ballottage nécessaire !",
  [ShowcaseStrings.TR_TopTwoAdvance]:
    "Les 2 premiers candidats passent au Tour 2 :",
  [ShowcaseStrings.TR_StartRound2]: "▶️ Commencer le ballottage du Tour 2 !",
  [ShowcaseStrings.TR_Round2Runoff]: "🔥 Ballottage du Tour 2",
  [ShowcaseStrings.TR_Round1ResultTemplate]: "Tour 1 : {VOTES} votes",
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    "Vote final ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.TR_FinalCount]: "🏆 Décompte final !",
  [ShowcaseStrings.TR_ElectionWinner]: "🎉 Vainqueur de l'élection !",
  [ShowcaseStrings.TR_Round2TallyTitle]: "📊 Décompte final du Tour 2",
  [ShowcaseStrings.TR_Round2TallyExplain]:
    "Duel entre les 2 premiers candidats :",
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: "🏆 {NAME} gagne !",
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    "A obtenu {VOTES} votes ({PERCENT}%) au ballottage",
  [ShowcaseStrings.TR_NewElection]: "Nouvelle élection",
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]:
    "Vote STAR - Le meilleur des deux mondes !",
  [ShowcaseStrings.STAR_IntroAcronym]:
    "🌟 STAR = Score puis Ballottage Automatique",
  [ShowcaseStrings.STAR_IntroStep1]:
    "⭐ Étape 1 : Notez tous les candidats de 0 à 5 étoiles (comme noter des films !)",
  [ShowcaseStrings.STAR_IntroStep2]:
    "🔄 Étape 2 : Les 2 premiers par score total passent au ballottage automatique. Vos notes déterminent votre préférence !",
  [ShowcaseStrings.STAR_IntroMagic]:
    "🎯 La Magie : Vous pouvez donner des notes élevées à plusieurs candidats, mais le ballottage garantit le soutien de la majorité",
  [ShowcaseStrings.STAR_IntroExample]:
    "💡 Exemple : Vous notez Alex=5, Jordan=4, Sam=2, Casey=1. Si Alex et Jordan sont les 2 premiers, votre vote va à Alex !",
  [ShowcaseStrings.STAR_IntroChallenge]:
    "⚠️ Combine l'expressivité du vote par score avec l'exigence de majorité du ballottage !",
  [ShowcaseStrings.STAR_StartBtn]: "⭐ Commencer à noter !",
  [ShowcaseStrings.STAR_DemoTitle]: "⭐🔄 Vote STAR - Conseil Municipal",
  [ShowcaseStrings.STAR_DemoTagline]: "⭐ Notez, puis ballottage automatique !",
  [ShowcaseStrings.STAR_CandidatesTitle]: "Candidats",
  [ShowcaseStrings.STAR_Cand1_Platform]: "Arts et Culture",
  [ShowcaseStrings.STAR_Cand2_Platform]: "Environnement",
  [ShowcaseStrings.STAR_Cand3_Platform]: "Économie",
  [ShowcaseStrings.STAR_Cand4_Platform]: "Santé",
  [ShowcaseStrings.STAR_RatingsTemplate]: "⭐ Notes de {VOTER} (0-5 étoiles)",
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    "Soumettre les notes ({CURRENT}/{TOTAL})",
  [ShowcaseStrings.STAR_RunSTAR]: "⭐🔄 Lancer l'algorithme STAR !",
  [ShowcaseStrings.STAR_Phase1Title]: "⭐ Phase 1 : Totaux des scores",
  [ShowcaseStrings.STAR_Phase1TallyTitle]: "📊 Addition de tous les scores",
  [ShowcaseStrings.STAR_Phase1TallyExplain]:
    "Recherche des 2 meilleurs candidats par score total...",
  [ShowcaseStrings.STAR_PointsTemplate]: "{TOTAL} points ({AVG} moy.)",
  [ShowcaseStrings.STAR_RunoffBadge]: "→ Ballottage",
  [ShowcaseStrings.STAR_AutoRunoffPhase]: "🔄 Phase de ballottage automatique",
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    "Les 2 premiers avancent ! Vérification des préférences en tête-à-tête...",
  [ShowcaseStrings.STAR_RunAutoRunoff]: "▶️ Lancer le ballottage automatique !",
  [ShowcaseStrings.STAR_WinnerTitle]: "🎉 Gagnant STAR !",
  [ShowcaseStrings.STAR_Phase2Title]: "🔄 Phase 2 : Ballottage automatique",
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    "Comparaison de {NAME1} contre {NAME2} selon les préférences des électeurs :",
  [ShowcaseStrings.STAR_VotersPreferred]: "électeurs ont préféré",
  [ShowcaseStrings.STAR_VS]: "VS",
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: "🏆 {NAME} gagne !",
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    "A remporté le ballottage automatique {WINNER} à {LOSER}",
  [ShowcaseStrings.STAR_NewElection]: "Nouvelle élection",
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: "VUT - Représentation Proportionnelle !",
  [ShowcaseStrings.STV_IntroGoal]:
    "🏛️ L'Objectif : Élire 3 représentants qui reflètent la diversité des préférences des électeurs !",
  [ShowcaseStrings.STV_IntroSTV]:
    "📊 VUT (Vote Unique Transférable) : Classez les candidats. Les votes se transfèrent quand votre premier choix gagne ou est éliminé.",
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    "🎯 Quota : Il faut {QUOTA} votes pour gagner un siège (quota de Droop : {VOTERS}/(3+1) + 1)",
  [ShowcaseStrings.STV_IntroTransfers]:
    "🔄 Transferts : Les votes excédentaires des gagnants et les votes des candidats éliminés se transfèrent aux préférences suivantes",
  [ShowcaseStrings.STV_IntroChallenge]:
    "🌍 Utilisé en Irlande, au Sénat australien et dans de nombreux conseils municipaux pour une représentation équitable !",
  [ShowcaseStrings.STV_StartBtn]: "📊 Commencer le classement !",
  [ShowcaseStrings.STV_DemoTitle]:
    "📊 VUT - Conseil Municipal ({SEATS} sièges)",
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    "🎯 Quota : {QUOTA} votes nécessaires par siège",
  [ShowcaseStrings.STV_PartiesRunning]: "Partis en lice",
  [ShowcaseStrings.STV_RankingTemplate]: "📝 Classement de {VOTER}",
  [ShowcaseStrings.STV_RankingInstruction]:
    "Cliquez pour ajouter les candidats par ordre de préférence :",
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    "Soumettre le classement ({CURRENT}/{TOTAL})",
  [ShowcaseStrings.STV_RunSTVCount]: "📊 Lancer le décompte VUT !",
  [ShowcaseStrings.STV_CouncilElected]: "🏛️ Conseil élu !",
  [ShowcaseStrings.STV_CountingTitle]: "📊 Processus de décompte VUT",
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    "Quota : {QUOTA} votes | Sièges : {SEATS}\nLe décompte des premières préférences détermine les premiers gagnants",
  [ShowcaseStrings.STV_QuotaMet]: "(Quota atteint !)",
  [ShowcaseStrings.STV_ElectedBadge]: "✓ ÉLU",
  [ShowcaseStrings.STV_ElectedReps]: "🎉 Représentants élus",
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    "💡 Ces {COUNT} partis ont chacun atteint le quota de {QUOTA} votes et ont remporté des sièges au conseil !",
  [ShowcaseStrings.STV_NewElection]: "Nouvelle élection",

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]:
    "Vote Quadratique - Allocation Budgétaire !",
  [ShowcaseStrings.Quad_IntroChallenge]:
    "💰 Le Défi : Budget de 1,4 M$, 4 projets. Comment mesurer l'intensité des préférences ?",
  [ShowcaseStrings.Quad_IntroQuadratic]:
    "² Vote Quadratique : Chaque vote coûte votes² crédits. 1 vote = 1 crédit, 2 votes = 4 crédits, 3 votes = 9 crédits !",
  [ShowcaseStrings.Quad_IntroInsecure]:
    "⚠️ MÉTHODE NON SÉCURISÉE : Nécessite des opérations non homomorphes (racine carrée). Les votes individuels sont visibles !",
  [ShowcaseStrings.Quad_IntroWhyUse]:
    "🎯 Pourquoi l'utiliser ? Empêche les électeurs fortunés de dominer. Montre l'intensité des préférences, pas seulement oui/non.",
  [ShowcaseStrings.Quad_IntroUsedIn]:
    "💡 Utilisé à la Chambre du Colorado, la plateforme taïwanaise vTaiwan et des expériences de gouvernance d'entreprise !",
  [ShowcaseStrings.Quad_StartBtn]: "💰 Commencer l'allocation !",
  [ShowcaseStrings.Quad_DemoTitle]: "² Vote Quadratique - Budget Municipal",
  [ShowcaseStrings.Quad_DemoTagline]:
    "💰 100 crédits vocaux. Les votes coûtent votes² !",
  [ShowcaseStrings.Quad_InsecureBanner]:
    "⚠️ NON SÉCURISÉ : Cette méthode ne peut pas utiliser le chiffrement homomorphe. Les votes sont visibles !",
  [ShowcaseStrings.Quad_BudgetProjects]: "Projets Budgétaires",
  [ShowcaseStrings.Quad_Proj1_Name]: "Nouveau Parc",
  [ShowcaseStrings.Quad_Proj1_Desc]: "500 000 $",
  [ShowcaseStrings.Quad_Proj2_Name]: "Rénovation de la Bibliothèque",
  [ShowcaseStrings.Quad_Proj2_Desc]: "300 000 $",
  [ShowcaseStrings.Quad_Proj3_Name]: "Centre Communautaire",
  [ShowcaseStrings.Quad_Proj3_Desc]: "400 000 $",
  [ShowcaseStrings.Quad_Proj4_Name]: "Réparation des Rues",
  [ShowcaseStrings.Quad_Proj4_Desc]: "200 000 $",
  [ShowcaseStrings.Quad_BudgetTemplate]:
    "💰 Budget de {VOTER} ({REMAINING} crédits restants)",
  [ShowcaseStrings.Quad_VotesTemplate]: "{VOTES} votes (coûte {COST} crédits)",
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    "Le prochain vote coûte {NEXT_COST} crédits (de {CURRENT} à {NEXT_TOTAL})",
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    "Coût Total : {USED}/100 crédits",
  [ShowcaseStrings.Quad_SubmitTemplate]:
    "Soumettre l'allocation ({CURRENT}/{TOTAL})",
  [ShowcaseStrings.Quad_CalculateTotals]: "💰 Calculer les Totaux !",
  [ShowcaseStrings.Quad_ResultsTitle]:
    "💰 Résultats de l'Allocation Budgétaire !",
  [ShowcaseStrings.Quad_TallyTitle]: "📊 Totaux des Votes Quadratiques",
  [ShowcaseStrings.Quad_TallyExplain]:
    "Le total des votes (pas les crédits) de chaque projet détermine la priorité de financement :",
  [ShowcaseStrings.Quad_TotalVotesTemplate]: "{TOTAL} votes au total",
  [ShowcaseStrings.Quad_TopPriority]: "🏆 Priorité Maximale",
  [ShowcaseStrings.Quad_ExplanationTitle]:
    "💡 Comment le Vote Quadratique a Fonctionné",
  [ShowcaseStrings.Quad_ExplanationP1]:
    "Le coût quadratique a empêché quiconque de dominer un seul projet. Donner 10 votes coûte 100 crédits (tout votre budget !), mais répartir 5 votes sur 2 projets ne coûte que 50 crédits au total.",
  [ShowcaseStrings.Quad_ExplanationResult]:
    "Résultat : Les projets avec un soutien large et intense l'emportent sur les projets avec un soutien étroit et extrême.",
  [ShowcaseStrings.Quad_ResetBtn]: "Nouveau Vote Budgétaire",

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: "Prise de Décision par Consensus !",
  [ShowcaseStrings.Cons_IntroScenario]:
    "🏕️ Le Scénario : Une petite coopérative doit prendre une décision importante. La voix de chacun compte !",
  [ShowcaseStrings.Cons_IntroConsensus]:
    "🤝 Vote par Consensus : Nécessite 95%+ d'accord. Une ou deux objections peuvent bloquer la proposition.",
  [ShowcaseStrings.Cons_IntroInsecure]:
    "⚠️ MÉTHODE NON SÉCURISÉE : Pas de confidentialité - tout le monde voit qui soutient/s'oppose !",
  [ShowcaseStrings.Cons_IntroWhyUse]:
    "🎯 Pourquoi l'utiliser ? Petits groupes où la confiance et l'unité sont plus importantes que la confidentialité.",
  [ShowcaseStrings.Cons_IntroUsedIn]:
    "🌍 Utilisé dans les coopératives, les communautés intentionnelles et les organisations basées sur le consensus !",
  [ShowcaseStrings.Cons_StartBtn]: "🤝 Commencer le Vote !",
  [ShowcaseStrings.Cons_DemoTitle]:
    "🤝 Vote par Consensus - Décision de Coopérative",
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    "🎯 Nécessite {PERCENT}% d'accord ({REQUIRED}/{TOTAL} membres)",
  [ShowcaseStrings.Cons_InsecureBanner]:
    "⚠️ NON SÉCURISÉ : Pas de confidentialité - tous les votes sont visibles pour construire le consensus !",
  [ShowcaseStrings.Cons_Proposal]:
    "Proposition : Devons-nous investir 50 000 $ dans des panneaux solaires ?",
  [ShowcaseStrings.Cons_ProposalDesc]:
    "C'est une décision financière majeure nécessitant un soutien quasi unanime.",
  [ShowcaseStrings.Cons_TrackerTitle]: "📊 Suivi du Consensus en Direct",
  [ShowcaseStrings.Cons_SupportTemplate]: "{COUNT} Soutien",
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    "✅ CONSENSUS ATTEINT ({SUPPORT}/{TOTAL})",
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    "❌ Besoin de {NEEDED} de plus pour atteindre le consensus",
  [ShowcaseStrings.Cons_MembersTemplate]:
    "Membres de la Coopérative ({VOTED}/{TOTAL} ont voté)",
  [ShowcaseStrings.Cons_Support]: "✅ Soutien",
  [ShowcaseStrings.Cons_Oppose]: "❌ Opposition",
  [ShowcaseStrings.Cons_BtnSupport]: "✅ Soutenir",
  [ShowcaseStrings.Cons_BtnOppose]: "❌ S'opposer",
  [ShowcaseStrings.Cons_CheckConsensus]: "🤝 Vérifier le Consensus !",
  [ShowcaseStrings.Cons_ResultsTitle]: "🤝 Résultat du Consensus !",
  [ShowcaseStrings.Cons_FinalCountTitle]: "📊 Décompte Final",
  [ShowcaseStrings.Cons_RequiredTemplate]:
    "Requis : {REQUIRED}/{TOTAL} ({PERCENT}%)",
  [ShowcaseStrings.Cons_ActualTemplate]:
    "Réel : {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)",
  [ShowcaseStrings.Cons_SupportCountTemplate]: "✅ {COUNT} Soutien",
  [ShowcaseStrings.Cons_OpposeCountTemplate]: "❌ {COUNT} Opposition",
  [ShowcaseStrings.Cons_ThresholdTemplate]: "⬆️ Seuil de {PERCENT}%",
  [ShowcaseStrings.Cons_ConsensusAchieved]: "✅ CONSENSUS ATTEINT !",
  [ShowcaseStrings.Cons_ConsensusFailed]: "❌ CONSENSUS ÉCHOUÉ !",
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    "La proposition est adoptée avec {COUNT} membres en soutien ({PERCENT}%)",
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    "N'a pas atteint le seuil de {THRESHOLD}%. {OPPOSE} membre(s) se sont opposés, bloquant le consensus.",
  [ShowcaseStrings.Cons_FailNote]:
    "💡 Dans la prise de décision par consensus, même une ou deux objections comptent. Le groupe doit répondre aux préoccupations ou modifier la proposition.",
  [ShowcaseStrings.Cons_ResetBtn]: "Nouvelle Proposition",

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]: "Prise de Décision par Consentement !",
  [ShowcaseStrings.Consent_IntroSociocracy]:
    "🏢 Sociocratie : Une coopérative de travailleurs doit prendre des décisions avec lesquelles tout le monde peut vivre.",
  [ShowcaseStrings.Consent_IntroConsentBased]:
    "🙋 Basé sur le Consentement : Il ne s'agit pas d'accord - c'est \"pas d'objections fortes\". Pouvez-vous vivre avec ça ?",
  [ShowcaseStrings.Consent_IntroInsecure]:
    "⚠️ MÉTHODE NON SÉCURISÉE : Pas de confidentialité - les objections doivent être entendues et traitées !",
  [ShowcaseStrings.Consent_IntroQuestion]:
    "🎯 La Question : \"Avez-vous une objection de principe qui nuirait à l\'organisation ?\"",
  [ShowcaseStrings.Consent_IntroUsedIn]:
    "🌍 Utilisé dans les organisations sociocratiques, l'holacratie et les lieux de travail collaboratifs !",
  [ShowcaseStrings.Consent_StartBtn]: "🙋 Démarrer le Processus !",
  [ShowcaseStrings.Consent_DemoTitle]:
    "🙋 Basé sur le Consentement - Coopérative de Travailleurs",
  [ShowcaseStrings.Consent_DemoTagline]:
    "🤝 Pas d'objections fortes = consentement obtenu",
  [ShowcaseStrings.Consent_InsecureBanner]:
    "⚠️ NON SÉCURISÉ : Pas de confidentialité - les objections sont partagées ouvertement pour discussion !",
  [ShowcaseStrings.Consent_ProposalTitle]:
    "Proposition : Mettre en place la semaine de 4 jours à partir du mois prochain",
  [ShowcaseStrings.Consent_ProposalQuestion]:
    "Avez-vous une objection de principe qui nuirait à notre organisation ?",
  [ShowcaseStrings.Consent_ProposalNote]:
    "\"Je préfère 5 jours\" n\'est pas une objection de principe. \"Cela nous mettrait en faillite\" en est une.",
  [ShowcaseStrings.Consent_ConsentCount]: "✅ Consentement",
  [ShowcaseStrings.Consent_ObjectionCount]: "🚫 Objections",
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    "⚠️ {COUNT} objection(s) de principe soulevée(s) - la proposition doit être modifiée ou retirée",
  [ShowcaseStrings.Consent_MembersTemplate]:
    "Membres du Cercle ({RESPONDED}/{TOTAL} ont répondu)",
  [ShowcaseStrings.Consent_NoObjection]: "✅ Pas d'Objection",
  [ShowcaseStrings.Consent_PrincipledObjection]: "🚫 Objection de Principe",
  [ShowcaseStrings.Consent_BtnNoObjection]: "✅ Pas d'Objection",
  [ShowcaseStrings.Consent_BtnObject]: "🚫 Objecter",
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    "{VOTER}, quelle est votre objection de principe ?",
  [ShowcaseStrings.Consent_CheckConsent]: "🙋 Vérifier le Consentement !",
  [ShowcaseStrings.Consent_ResultsTitle]:
    "🙋 Résultat du Processus de Consentement !",
  [ShowcaseStrings.Consent_ConsentCheckTitle]:
    "📊 Vérification du Consentement",
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    "Consentement obtenu si zéro objection de principe\nObjections soulevées : {COUNT}",
  [ShowcaseStrings.Consent_NoObjectionsGroup]: "✅ Pas d'Objections ({COUNT})",
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    "Ces membres peuvent vivre avec la proposition",
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
    "🚫 Objections de Principe ({COUNT})",
  [ShowcaseStrings.Consent_ObjectionRaised]: "Objection soulevée",
  [ShowcaseStrings.Consent_ConsentAchieved]: "✅ CONSENTEMENT OBTENU !",
  [ShowcaseStrings.Consent_ConsentBlocked]: "🚫 CONSENTEMENT BLOQUÉ !",
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    "Les {COUNT} membres ont donné leur consentement (aucune objection de principe). La proposition avance.",
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    "{COUNT} objection(s) de principe soulevée(s). Le cercle doit répondre aux préoccupations avant de continuer.",
  [ShowcaseStrings.Consent_NextStepsTitle]:
    "💡 Prochaines Étapes en Sociocratie :",
  [ShowcaseStrings.Consent_NextStep1]: "Écouter les objections en entier",
  [ShowcaseStrings.Consent_NextStep2]:
    "Modifier la proposition pour répondre aux préoccupations",
  [ShowcaseStrings.Consent_NextStep3]:
    "Re-tester le consentement avec la proposition mise à jour",
  [ShowcaseStrings.Consent_NextStep4]:
    "Si les objections persistent, la proposition est retirée",
  [ShowcaseStrings.Consent_ResetBtn]: "Nouvelle Proposition",

  // Blog
  [ShowcaseStrings.Blog_Title]: "Blog BrightChain",
  [ShowcaseStrings.Blog_Subtitle]: "Réflexions, tutoriels et mises à jour",
  [ShowcaseStrings.Blog_Loading]: "Chargement des articles...",
  [ShowcaseStrings.Blog_NewPost]: "+ Nouvel Article",
  [ShowcaseStrings.Blog_NoPosts]:
    "Pas encore d'articles de blog. Revenez bientôt !",
  [ShowcaseStrings.Blog_NewBadge]: "✨ Nouveau",
  [ShowcaseStrings.Blog_ByAuthorTemplate]: "Par {AUTHOR}",
  [ShowcaseStrings.Blog_BackToHome]: "← Retour à l'Accueil",

  // BlogPost.tsx
  [ShowcaseStrings.BlogPost_Loading]: 'Chargement de l\'article...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Article non trouvé',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    'L\'article que vous recherchez n\'existe pas.',
  [ShowcaseStrings.BlogPost_BackToBlog]: '← Retour au Blog',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ Cet article vient d\'être publié ! Il apparaîtra dans la liste du blog après la prochaine mise à jour du site.',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'Par {AUTHOR}',

  // Components.tsx feature cards
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    "Base de données documentaire compétitive avec MongoDB stockant les données sur le système de fichiers sans propriétaire. Chaque document stocké de manière transparente sous forme de blocs blanchis avec l'architecture TUPLE pour un déni plausible.",
  [ShowcaseStrings.Feat_BrightDB_Cat]: "Stockage",
  [ShowcaseStrings.Feat_BrightDB_Tech1]: "Magasin de documents",
  [ShowcaseStrings.Feat_BrightDB_Tech2]: "Transactions ACID",
  [ShowcaseStrings.Feat_BrightDB_Tech3]: "Pipeline d'agrégation",
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    "API de type MongoDB : collections, CRUD, requêtes, index, transactions",
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    "15 opérateurs de requête : $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch",
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    "Pipeline d'agrégation : $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup",
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    "Index à champ unique, composés et uniques avec structures B-tree",
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    "Transactions ACID multi-documents avec commit/abort et concurrence optimiste",
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    "Flux de modifications pour les abonnements aux événements d'insertion/mise à jour/suppression en temps réel",
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    "Middleware REST Express pour un accès API plug-and-play aux collections",
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    "Index TTL pour l'expiration automatique des documents",
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    "Validation de schéma avec niveaux strict/modéré et valeurs par défaut",
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    "Recherche en texte intégral avec champs pondérés et opérateur $text",
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    "Stockage copy-on-write : les blocs ne sont jamais supprimés, seuls les mappages sont mis à jour",
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    "Chaque document stocké sous forme de TUPLE à 3 blocs (données + 2 randomiseurs) pour un déni plausible",
  [ShowcaseStrings.Feat_BrightDBPools_Title]: "Pools BrightDB",
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    "Pools de stockage légers isolés par espace de noms qui partitionnent logiquement les blocs sans stockage physique séparé. Chaque pool applique ses propres limites ACL, de chiffrement et de blanchiment — permettant l'isolation des données multi-locataires et multi-applications sur un seul nœud BrightChain.",
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: "Stockage",
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: "Isolation d'espace de noms",
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: "ACL de pool",
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: "Découverte Gossip",
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    "Clés de stockage préfixées par espace de noms (poolId:hash) — isolation logique sans séparation physique",
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    "ACL par pool avec permissions Lecture, Écriture, Réplication et Admin appliquées au niveau de la couche de stockage",
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    "Blanchiment XOR limité au pool : les tuples ne franchissent jamais les limites du pool, préservant le déni plausible par pool",
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    "Découverte de pool basée sur gossip entre pairs avec délais de requête configurables et mise en cache",
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    "Amorçage de pool : génération de blocs aléatoires cryptographiques comme matériel de blanchiment pour les nouveaux pools",
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    "Validation de suppression sécurisée — vérifie les dépendances XOR inter-pools avant de supprimer un pool",
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    "Filtres Bloom et manifestes limités au pool pour une réconciliation efficace entre pairs",
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    "Gouvernance par quorum multi-admin : les mises à jour ACL nécessitent >50% de signatures d'admin",
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    "Drapeaux de lecture/écriture publics pour les pools ouverts, ou accès verrouillé réservé aux membres",
  [ShowcaseStrings.Feat_OFFS_Title]: "Owner-Free File System (OFFS)",
  [ShowcaseStrings.Feat_OFFS_Desc]:
    "S'appuyant sur le concept original du Système de Fichiers sans Propriétaire, BrightChain propulse OFFS vers de nouveaux sommets. Nous avons ajouté le chiffrement asymétrique ECIES, des blocs de parité Reed-Solomon pour la redondance et la durabilité, ainsi qu'un registre blockchain numérique. Sur cette base, Digital Burnbag exploite les propriétés uniques d'OFFS pour garantir la destruction de fichiers sans que leur contenu n'ait jamais été lu. Consultez notre livre blanc Digital Burnbag Vault pour les fondements mathématiques complets.",
  [ShowcaseStrings.Feat_OFFS_Cat]: 'Stockage',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'Chiffrement ECIES',
  [ShowcaseStrings.Feat_OFFS_Tech2]: 'FEC Reed-Solomon',
  [ShowcaseStrings.Feat_OFFS_Tech3]: "Registre blockchain",
  [ShowcaseStrings.Feat_OFFS_HL1]:
    "Fondé sur le concept OFFS original — fichiers mélangés par XOR avec des données aléatoires pour qu'aucun bloc ne contienne de contenu identifiable",
  [ShowcaseStrings.Feat_OFFS_HL2]:
    "Renforcé par le chiffrement asymétrique ECIES pour une couche de sécurité cryptographique au-delà de l'obscurcissement XOR",
  [ShowcaseStrings.Feat_OFFS_HL3]:
    'Les blocs de parité FEC Reed-Solomon assurent redondance et durabilité même si des nœuds se déconnectent',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'Le registre blockchain numérique maintient des enregistrements infalsifiables de toutes les opérations sur les blocs',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    "Digital Burnbag garantit la destruction de fichiers sans que le contenu n'ait jamais été accédé — prouvable via le registre",
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'Mathématiques novatrices détaillées dans le livre blanc Digital Burnbag Vault — https://github.brightchain.org/docs/papers/digital-burnbag-vault/',
  [ShowcaseStrings.Feat_Messaging_Title]: 'Système de messagerie',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    'Transmission de messages sécurisée et décentralisée avec chiffrement, routage, suivi de livraison et protocole gossip pour une propagation de type épidémique. Construit sur le magasin de blocs avec livraison en temps réel par WebSocket.',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'Protocole Gossip',
  [ShowcaseStrings.Feat_Messaging_Tech2]: "ECIES",
  [ShowcaseStrings.Feat_Messaging_Tech3]: "WebSocket",
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Filtres de Bloom',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    'Transmission de messages chiffrés avec chiffrement par destinataire ou clé partagée',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    'Propagation gossip de type épidémique avec livraison basée sur la priorité',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    'Réessai automatique avec backoff exponentiel pour les livraisons échouées',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    'Protocole de découverte basé sur les filtres de Bloom pour une localisation efficace des blocs',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'Événements WebSocket en temps réel pour la livraison et les accusés de réception des messages',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    'Suivi de livraison persistant avec statut par destinataire',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    "Email conforme RFC 5322/2045 avec threading, confidentialité BCC, pièces jointes, opérations de boîte de réception et suivi de livraison. Composition, envoi et récupération d'emails complets basés sur l'infrastructure de messagerie.",
  [ShowcaseStrings.Feat_BrightMail_Cat]: "Réseau",
  [ShowcaseStrings.Feat_BrightMail_Tech1]: "RFC 5322",
  [ShowcaseStrings.Feat_BrightMail_Tech2]: "RFC 2045",
  [ShowcaseStrings.Feat_BrightMail_Tech3]: "MIME",
  [ShowcaseStrings.Feat_BrightMail_Tech4]: "Threading",
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    "Format de message Internet conforme RFC avec support MIME",
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    "Threading via les en-têtes In-Reply-To et References",
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    "Confidentialité BCC avec copies cryptographiquement séparées par destinataire",
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    "Plusieurs pièces jointes avec support Content-ID pour les images intégrées",
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    "Opérations de boîte de réception : requête, filtre, tri, recherche avec pagination",
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    "Suivi de livraison par destinataire via les accusés de réception gossip",
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    "Plusieurs schémas de chiffrement : ECIES, clé partagée, S/MIME",
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    "Signatures numériques pour l'authentification de l'expéditeur",
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    "Transfert/réponse avec en-têtes Resent-* conformes RFC",
  [ShowcaseStrings.Feat_BrightCal_Desc]:
    "Système de calendrier partagé compatible avec Google Calendar, intégré à BrightMail. Compatible iCal/CalDAV, événements chiffrés de bout en bout, permissions de partage granulaires, réservation de réunions et détection de conflits.",
  [ShowcaseStrings.Feat_BrightCal_Cat]: "Réseau",
  [ShowcaseStrings.Feat_BrightCal_Tech1]: "iCal/RFC 5545",
  [ShowcaseStrings.Feat_BrightCal_Tech2]: "CalDAV",
  [ShowcaseStrings.Feat_BrightCal_Tech3]: "Chiffrement ECIES",
  [ShowcaseStrings.Feat_BrightCal_Tech4]: "iTIP/iMIP",
  [ShowcaseStrings.Feat_BrightCal_HL1]:
    "Format iCalendar RFC 5545 avec prise en charge complète de VEVENT, VTODO, VJOURNAL et VFREEBUSY",
  [ShowcaseStrings.Feat_BrightCal_HL2]:
    "Protocole serveur CalDAV pour la synchronisation native avec Apple Calendar, Thunderbird et Android",
  [ShowcaseStrings.Feat_BrightCal_HL3]:
    "Événements chiffrés de bout en bout stockés sous forme de blocs ECIES dans le système de fichiers sans propriétaire",
  [ShowcaseStrings.Feat_BrightCal_HL4]:
    "Partage granulaire : voir disponibilité seulement, voir les détails, modifier ou déléguer par calendrier et par utilisateur",
  [ShowcaseStrings.Feat_BrightCal_HL5]:
    "Invitations aux réunions via iTIP/iMIP avec intégration BrightMail et suivi des réponses RSVP",
  [ShowcaseStrings.Feat_BrightCal_HL6]:
    "Détection de conflits et requêtes de disponibilité sur les calendriers partagés avec agrégation des plages libres/occupées",
  [ShowcaseStrings.Feat_BrightCal_HL7]:
    "Pages de réservation avec fenêtres de disponibilité configurables, temps tampon et flux de confirmation",
  [ShowcaseStrings.Feat_BrightCal_HL8]:
    "Prise en charge des événements récurrents avec RRULE, EXDATE et gestion des remplacements par occurrence",
  [ShowcaseStrings.Feat_BrightCal_HL9]:
    "Affichage multi-fuseaux horaires avec gestion automatique de l\'heure d\'été et ancrage du fuseau horaire par événement",
  [ShowcaseStrings.Feat_BrightCal_HL10]:
    "Widgets d\'interface jour/semaine/mois/agenda avec reprogrammation par glisser-déposer et édition en ligne",
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Plateforme de communication compétitive avec Discord avec un chiffrement de bout en bout de niveau Signal. Messagerie directe, discussions de groupe et canaux avec présence en temps réel, indicateurs de saisie et permissions basées sur les rôles.',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'Chiffrement E2E',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: "WebSocket",
  [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Rotation des clés',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: "RBAC",
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    'Messagerie directe pour les conversations chiffrées de personne à personne',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    'Discussions de groupe avec chiffrement partagé et rotation automatique des clés',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'Canaux avec quatre modes de visibilité : public/privé/secret/invisible',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'Système de présence en temps réel : en ligne/hors ligne/inactif/ne pas déranger',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'Permissions basées sur les rôles : Propriétaire/Admin/Modérateur/Membre',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'Indicateurs de saisie, réactions et modifications de messages via WebSocket',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'Jetons d\'invitation à durée et utilisation limitées pour les canaux',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'Recherche en texte intégral dans l\'historique des canaux',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'Promotion transparente des conversations de la messagerie directe aux groupes',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    'Trousseau de mots de passe compétitif avec 1Password avec architecture VCBL pour un stockage chiffré efficace des identifiants. TOTP/2FA, détection de fuites, accès d\'urgence et importation depuis les principaux gestionnaires de mots de passe.',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'Identité',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: "VCBL",
  [ShowcaseStrings.Feat_BrightPass_Tech2]: "TOTP",
  [ShowcaseStrings.Feat_BrightPass_Tech3]: "AES-256-GCM",
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Partage de Shamir',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    'VCBL (Vault Constituent Block List) pour un stockage chiffré efficace',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    'Plusieurs types d\'entrées : identifiant, note sécurisée, carte de crédit, identité',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    'Génération de mots de passe cryptographiquement sécurisée avec contraintes',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    'Support TOTP/2FA avec génération de QR code pour les authentificateurs',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'Détection de fuites par k-anonymat via l\'API Have I Been Pwned',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'Journal d\'audit chiffré en ajout seul pour toutes les opérations du coffre-fort',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    'Accès d\'urgence via le partage de secret de Shamir pour la récupération',
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'Partage de coffre-fort multi-membres avec chiffrement ECIES par destinataire',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    'Importation depuis 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'API de remplissage automatique prête pour les extensions de navigateur',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'Élections préservant la confidentialité utilisant le chiffrement homomorphe Paillier avec des clés dérivées par ECDH. Prend en charge plus de 15 méthodes de vote, de la pluralité simple au vote par classement complexe, avec des fonctionnalités de conformité gouvernementale.',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'Gouvernance',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Chiffrement Paillier',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: "ECDH",
  [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Cryptographie homomorphe',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'Pont ECDH-vers-Paillier dérivant les clés homomorphes à partir des clés ECDSA/ECDH',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    'Agrégation des votes préservant la confidentialité via l\'addition homomorphe',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    'Plus de 15 méthodes de vote : Pluralité, Approbation, Pondéré, Borda, Score, Vote par classement, IRV, STAR, VUT, Quadratique, Consensus, etc.',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'Classifications de sécurité : entièrement homomorphe, multi-tours, non sécurisé',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    'Conformité gouvernementale : journaux d\'audit immuables, tableau d\'affichage public, reçus vérifiables',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    'Agrégation hiérarchique : Bureau de vote → Comté → État → National',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    'Niveau de sécurité 128 bits avec test de primalité Miller-Rabin (256 tours)',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'Déterminisme multiplateforme (environnements Node.js et navigateur)',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    'Résistance aux attaques temporelles avec opérations à temps constant',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    'Réseau social décentralisé compétitif avec Twitter avec une syntaxe de balisage d\'icônes FontAwesome unique. Publications, fils de discussion, messages directs, listes de connexions, hubs pour la confidentialité et notifications en temps réel via WebSocket.',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: "WebSocket",
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Messagerie en temps réel',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Gestion des connexions',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    'Publications avec limite de 280 caractères, markdown et syntaxe {{icon}} unique pour FontAwesome',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    'Conversations en fils avec imbrication sur 10 niveaux et hiérarchies de réponses',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    'Listes de connexions, catégories et hubs pour organiser les relations',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    'Messagerie directe avec accusés de lecture, indicateurs de saisie et réactions',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    'Conversations de groupe (jusqu\'à 50 participants) avec rôles d\'administrateur',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    'Demandes de messages pour les non-abonnés avec flux d\'acceptation/refus',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'Notifications en temps réel via WebSocket avec regroupement intelligent',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    'Préférences de notification : heures calmes, mode ne pas déranger, paramètres par catégorie',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'Comptes protégés avec flux d\'approbation des demandes d\'abonnement',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'Aperçus de connexion : calcul de force, connexions mutuelles, suggestions',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'Visibilité du contenu basée sur les hubs pour le partage de groupe privé',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'Formatage de texte enrichi avec prévention XSS et support des emojis',
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Anonymat par intermédiation et BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    'Mécanisme de confidentialité sophistiqué permettant des opérations anonymes tout en maintenant la responsabilité. Les informations d\'identité sont chiffrées et divisées via le partage de secret de Shamir, reconstructibles uniquement par consensus majoritaire du BrightTrust.',
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Gouvernance',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: 'Partage de secret de Shamir',
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Correction d\'erreur directe',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'Consensus BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Publiez anonymement avec sauvegarde d\'identité chiffrée',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Fragments d\'identité distribués parmi ~24 membres du BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'Vote majoritaire requis pour reconstruire les informations d\'identité',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    'Responsabilité limitée dans le temps — les données expirent après le délai de prescription',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'Mécanisme de conformité juridique pour les mandats FISA et les ordonnances judiciaires',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    'Protection permanente de la vie privée après la période d\'expiration',
  [ShowcaseStrings.Feat_Encryption_Title]: 'Pile de chiffrement avancée',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    'Chiffrement de pointe combinant ECIES pour la dérivation de clés avec AES-256-GCM pour la sécurité des fichiers. Cryptosystème complet avec authentification BIP39/32 et cryptographie sur courbe elliptique SECP256k1.',
  [ShowcaseStrings.Feat_Encryption_Cat]: 'Cryptographie',
  [ShowcaseStrings.Feat_Encryption_Tech1]: "ECIES",
  [ShowcaseStrings.Feat_Encryption_Tech2]: "AES-256-GCM",
  [ShowcaseStrings.Feat_Encryption_Tech3]: "BIP39/32",
  [ShowcaseStrings.Feat_Encryption_Tech4]: "SECP256k1",
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'Chiffrement ECIES avec dérivation de clés spécifique à l\'utilisateur',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    'AES-256-GCM pour le chiffrement authentifié des fichiers',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'Authentification basée sur les mnémoniques BIP39/32',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'Courbe elliptique SECP256k1 (espace de clés compatible Ethereum)',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'Intégrité des données vérifiée au niveau des blocs avec fonctionnalité XOR',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'Opérations cryptographiques multiplateformes',
  [ShowcaseStrings.Feat_Storage_Title]: 'Réseau de stockage décentralisé',
  [ShowcaseStrings.Feat_Storage_Desc]:
    'Système de fichiers distribué pair-à-pair qui monétise le stockage inutilisé des appareils personnels. Architecture de type IPFS avec preuve de travail économe en énergie et incitations basées sur la réputation.',
  [ShowcaseStrings.Feat_Storage_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'Réseaux P2P',
  [ShowcaseStrings.Feat_Storage_Tech2]: "DHT",
  [ShowcaseStrings.Feat_Storage_Tech3]: 'Réplication de blocs',
  [ShowcaseStrings.Feat_Storage_HL1]:
    'Utilisation de l\'espace de stockage gaspillé sur les ordinateurs et appareils personnels',
  [ShowcaseStrings.Feat_Storage_HL2]:
    'Table de hachage distribuée (DHT) pour un suivi efficace des blocs',
  [ShowcaseStrings.Feat_Storage_HL3]:
    'Exigences configurables de durabilité et d\'accessibilité des blocs',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'Réplication dynamique basée sur l\'utilité des blocs et les schémas d\'accès',
  [ShowcaseStrings.Feat_Storage_HL5]:
    'Alternative économe en énergie au minage traditionnel par preuve de travail',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'Crédits de stockage et compensation de bande passante pour les opérateurs de nœuds',
  [ShowcaseStrings.Feat_Sealing_Title]: 'Scellement de documents basé sur le BrightTrust',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Protection avancée des documents avec des exigences de seuil personnalisables pour la restauration de l\'accès. Les groupes peuvent sceller des informations sensibles nécessitant un consensus majoritaire configurable pour le descellement.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Gouvernance',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Cryptographie à seuil',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Partage de secret',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Calcul multipartite',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Scellement de documents avec seuils de quorum configurables (ex. : 3 sur 5, 7 sur 10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Stockage distribué des fragments parmi les membres de confiance du BrightTrust',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    'Garantie mathématique de sécurité jusqu\'à ce que le seuil soit atteint',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    'Descellement flexible pour la conformité juridique ou les décisions de groupe',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    'Prend en charge les flux de gouvernance organisationnelle et de conformité',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    'Expiration basée sur le temps pour une protection automatique de la vie privée',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'Gestion d\'identité sophistiquée garantissant la confidentialité et le contrôle de l\'utilisateur. Prise en charge des alias enregistrés, de la publication anonyme et de la vérification d\'identité cryptographique.',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'Identité',
  [ShowcaseStrings.Feat_BrightID_Tech1]: 'Infrastructure à clé publique',
  [ShowcaseStrings.Feat_BrightID_Tech2]: "BIP39/32",
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'Gestion d\'identité',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'Génération d\'identité basée sur les mnémoniques BIP39/32',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'Plusieurs alias enregistrés par compte utilisateur',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'Publication anonyme avec récupération d\'identité optionnelle',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    'Authentification basée sur la clé publique (SECP256k1)',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'Correction d\'erreur directe pour la sauvegarde d\'identité',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'Vérification d\'identité préservant la vie privée',
  [ShowcaseStrings.Feat_Reputation_Title]: 'Réputation et suivi énergétique',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'Système de réputation révolutionnaire qui suit les coûts énergétiques en Joules. Les bons acteurs bénéficient d\'exigences minimales de preuve de travail tandis que les mauvais acteurs font face à des charges computationnelles accrues.',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Preuve de travail',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'Systèmes de réputation',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'Comptabilité énergétique',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    'Coûts énergétiques mesurés en Joules réels pour une corrélation avec le monde réel',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'Preuve de travail dynamique basée sur la réputation de l\'utilisateur',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'Les créateurs de contenu sont récompensés lorsque leur contenu est consommé',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    'Les mauvais acteurs sont ralentis par des exigences computationnelles accrues',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'Les coûts de stockage et de bande passante sont suivis et compensés',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'Encourage les contributions positives et le contenu de qualité',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'Température des blocs et cycle de vie',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    'Gestion intelligente des blocs avec niveaux de stockage chaud/froid. Les blocs fréquemment accédés restent « chauds » avec une réplication élevée, tandis que les blocs inutilisés refroidissent et peuvent expirer.',
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Stockage',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Niveaux de stockage',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Cycle de vie des blocs',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Schémas d\'accès',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    'Contrats « Conserver jusqu\'à au moins » pour une durée minimale de stockage',
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'L\'utilité des blocs augmente avec l\'accès, l\'obsolescence diminue',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'Réplication dynamique basée sur les schémas d\'accès et la température',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    'Extension automatique des contrats pour les blocs fréquemment accédés',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    'Crédits d\'énergie retournés pour les blocs qui s\'avèrent utiles',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    'Exigences configurables de durabilité et d\'accessibilité',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'Zéro gaspillage de minage',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    'Construit sur les fondations d\'Ethereum mais conçu sans les contraintes de la preuve de travail. Tout le travail computationnel sert des objectifs utiles — stockage, vérification et opérations réseau.',
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Réseau',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Espace de clés Ethereum',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Consensus efficace',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Blockchain verte',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    'Pas de minage inutile — tout le calcul sert des objectifs utiles',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Espace de clés et cryptographie compatibles Ethereum (SECP256k1)',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Preuve de travail utilisée uniquement pour la régulation des transactions',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'Mécanismes de consensus économes en énergie',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    'Blockchain durable sans impact environnemental',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    'Accent sur le stockage et le calcul, pas sur la rareté artificielle',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Déterminisme multiplateforme',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Opérations cryptographiques identiques dans les environnements Node.js et navigateur. La génération déterministe de clés garantit des résultats cohérents quelle que soit la plateforme.',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Cryptographie',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: "Node.js",
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Crypto navigateur',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Algorithmes déterministes',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'Opérations cryptographiques unifiées entre les plateformes',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    'Génération de bits aléatoires déterministe (HMAC-DRBG)',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'Dérivation cohérente des clés Paillier à partir des clés ECDH',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'Compatibilité navigateur et Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    'Résultats cryptographiques reproductibles',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'Tests et vérification multiplateformes',
  [ShowcaseStrings.Feat_Contracts_Title]: 'Contrats numériques et gouvernance',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    'Capacités de contrats intelligents pour les applications décentralisées. Gouvernance basée sur le BrightTrust avec des seuils de vote configurables pour les décisions réseau et l\'application des politiques.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Gouvernance',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Contrats intelligents',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Gouvernance',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Systèmes de vote',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Exécution de contrats numériques sur un réseau décentralisé',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'Prise de décision basée sur le BrightTrust pour la gouvernance du réseau',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    'Exigences de majorité configurables pour différentes actions',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'Vote homomorphe pour une gouvernance préservant la confidentialité',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'Mécanismes de vote pondérés par la réputation',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    'Processus de gouvernance transparents et auditables',
  [ShowcaseStrings.Feat_SecretsJS_Title]: "Secrets.js (fork)",
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    'Implémentation améliorée du partage de secret de Shamir pour le découpage et la reconstruction sécurisés de données. TypeScript pur avec support navigateur natif, audité cryptographiquement et optimisé pour diviser tout secret (mots de passe, clés, fichiers) en parts récupérables par seuil.',
  [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Cryptographie',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: 'Partage de secret de Shamir',
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Sécurité des données',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: "TypeScript",
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: "CSPRNG",
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    'Division des secrets en n parts avec récupération par seuil t-sur-n configurable',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    'Sécurité théorique de l\'information — les parts en dessous du seuil ne révèlent aucune information',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Audit de sécurité Cure53 (juillet 2019) avec zéro problème trouvé',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'Support navigateur natif sans polyfills (crypto.getRandomValues)',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'Opérations déterministes multiplateformes (Node.js et navigateur)',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    'Support TypeScript complet avec définitions de types exhaustives',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    'Conversion de mots de passe, fichiers et clés vers/depuis l\'hexadécimal avec remplissage automatique',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    'Génération dynamique de nouvelles parts à partir de parts existantes',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    'Champ de Galois configurable (3-20 bits) supportant jusqu\'à 1 048 575 parts',
  [ShowcaseStrings.Feat_Burnbag_Desc]:
    "Stockage sécurisé à connaissance nulle avec protocoles de sécurité automatisés. L'effacement cryptographique détruit la Recette (carte + clés), rendant les blocs chiffrés dispersés définitivement irrécupérables sur déclenchement.",
  [ShowcaseStrings.Feat_Burnbag_Cat]: "Cryptographie",
  [ShowcaseStrings.Feat_Burnbag_Tech1]: "Effacement cryptographique",
  [ShowcaseStrings.Feat_Burnbag_Tech2]: "Interrupteur d'homme mort",
  [ShowcaseStrings.Feat_Burnbag_Tech3]: "Protocole Canari",
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    "Architecture à connaissance nulle : le fournisseur de services ne peut pas accéder aux données utilisateur en conditions normales",
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    "Effacement cryptographique : la destruction de la Recette rend les blocs dispersés définitivement irrécupérables",
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    "Interrupteur d'homme mort : la surveillance du battement de cœur déclenche la destruction automatique de la Recette en cas d'inactivité",
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    "Protocole Canari : moteur de règles avec surveillance d'API tierces (Twitter, Fitbit, Google, GitHub)",
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    "Détection de contrainte : des codes de contrainte spéciaux déclenchent les protocoles de destruction au lieu de l'accès normal",
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    "Actions de protocole configurables : suppression de fichiers, distribution de données, divulgation publique ou réponses personnalisées",
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    "Architecture à double clé : clés BIP39 contrôlées par l'utilisateur plus clés de séquestre système optionnelles pour l'exécution du protocole",
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    "Quorum de succession : contacts de confiance pré-autorisés pour la libération ou la récupération sécurisée des données",
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    "Mutation à la lecture : tout accès non autorisé à la Recette déclenche une mutation permanente et immuable du registre",
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    "Niveaux de confiance configurables : confiance zéro, confiance conditionnelle ou hybride par sensibilité de fichier",
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    "Support multilingue : anglais, français, espagnol, ukrainien et chinois mandarin",
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    "Chiffrement ECIES avec clés secp256k1 et AES-256-GCM pour la sécurité des fichiers",

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    "Un dossier médical électronique appartenant au patient, construit sur la cryptographie BrightChain. Vos données de santé restent les vôtres — chiffrées, décentralisées et accessibles uniquement avec vos clés.",
  [ShowcaseStrings.Feat_BrightChart_Cat]: "Identité",
  [ShowcaseStrings.Feat_BrightChart_Tech1]: "DME sans propriétaire",
  [ShowcaseStrings.Feat_BrightChart_Tech2]: "Chiffrement de bout en bout",
  [ShowcaseStrings.Feat_BrightChart_Tech3]: "Accès contrôlé par le patient",
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    "Le patient possède et contrôle tous les dossiers médicaux via des clés cryptographiques",
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    "Données de santé chiffrées de bout en bout stockées sur BrightChain — aucun serveur central à pirater",
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    "Consentement granulaire : partagez des dossiers spécifiques avec les prestataires via la délégation BrightTrust",
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    "Piste d'audit immuable pour chaque accès, modification et événement de partage",
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    "Portable entre prestataires — pas de verrouillage fournisseur, pas de données en otage",
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    "Accès d'urgence via le partage de secret de Shamir avec quorum configurable",
  [ShowcaseStrings.Feat_BrightChart_HL7]:
    "Historique médical versionné avec vérification d'intégrité cryptographique",
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    "Les entrées signées par le prestataire garantissent l'authenticité des diagnostics et prescriptions",
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    "Fonctionne hors ligne : dossiers chiffrés en cache local, synchronisés à la reconnexion",
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    "Burnbag Digital intégré pour les dossiers sensibles nécessitant une destruction garantie",
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    "Couche de données interopérable conçue pour l'échange de dossiers de santé compatible FHIR",
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    "Les preuves à connaissance nulle permettent la vérification d'assurance sans exposer l'historique médical complet",

  // Soup Alerts
  [ShowcaseStrings.Soup_Time]: 'Heure',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'Échec de la récupération du fichier : {ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Veuillez télécharger un fichier .cbl',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    'CBL chargé ! Fichier : {NAME} ({BLOCKS} blocs). Vous pouvez maintenant récupérer le fichier si tous les blocs sont dans la soupe.',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'Échec de l\'analyse du CBL : {ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    'Fichier reconstruit avec succès ! Taille : {SIZE} octets. Le fichier a été téléchargé.',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'Échec du traitement de l\'URL magnet : {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: 'Message envoyé et stocké dans la soupe !',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'Échec de l\'envoi du message : {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'Message récupéré de la soupe : {TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'Échec de la récupération du message : {ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: 'URL Magnet copiée dans le presse-papiers !',
  [ShowcaseStrings.Anim_PauseBtn]: 'Mettre en pause l\'animation',
  [ShowcaseStrings.Anim_PlayBtn]: 'Lancer l\'animation',
  [ShowcaseStrings.Anim_ResetBtn]: 'Réinitialiser l\'animation',
  [ShowcaseStrings.Anim_SpeedLabel]: 'Vitesse : {SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 Moniteur de performance',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'Fréquence d\'images :',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'Temps d\'image :',
  [ShowcaseStrings.Anim_PerfDropped]: 'Images perdues :',
  [ShowcaseStrings.Anim_PerfMemory]: 'Mémoire :',
  [ShowcaseStrings.Anim_PerfSequences]: 'Séquences :',
  [ShowcaseStrings.Anim_PerfErrors]: 'Erreurs :',
  [ShowcaseStrings.Anim_WhatHappening]: 'Ce qui se passe :',
  [ShowcaseStrings.Anim_DurationLabel]: 'Durée :',
  [ShowcaseStrings.Anim_SizeInfo]: 'Taille : {SIZE} octets | Blocs : {BLOCKS}',

  // Educational/Encoding
  [ShowcaseStrings.Edu_CloseTooltip]: 'Fermer l\'info-bulle',
  [ShowcaseStrings.Edu_WhatsHappening]: '🔍 Ce qui se passe',
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 Pourquoi c\'est important',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Détails techniques',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Concepts associés',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ Indices visuels',
  [ShowcaseStrings.Edu_GetHelp]: 'Obtenir de l\'aide pour cette étape',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ J\'ai compris - Continuer',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ Passer cette étape',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 Glossaire des concepts BrightChain',
  [ShowcaseStrings.Edu_CloseGlossary]: 'Fermer le glossaire',
  [ShowcaseStrings.Edu_BackToGlossary]: '← Retour au glossaire',
  [ShowcaseStrings.Edu_Definition]: 'Définition',
  [ShowcaseStrings.Edu_TechnicalDefinition]: 'Définition technique',
  [ShowcaseStrings.Edu_Examples]: 'Exemples',
  [ShowcaseStrings.Edu_RelatedTerms]: 'Termes associés',
  [ShowcaseStrings.Edu_SearchPlaceholder]: 'Rechercher des concepts...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'Aperçu du processus',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: 'Ce que nous avons accompli',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Résultats techniques',
  [ShowcaseStrings.Edu_WhatsNext]: 'Et ensuite ?',
  [ShowcaseStrings.Edu_LearningProgress]: 'Progression d\'apprentissage',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED} sur {TOTAL} étapes terminées',
  [ShowcaseStrings.Enc_Title]: '🎬 Animation d\'encodage de fichier',
  [ShowcaseStrings.Enc_Subtitle]:
    'Regardez votre fichier se transformer en blocs BrightChain',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 Fragments de fichier ({COUNT})',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    'Chaque fragment deviendra un bloc dans la soupe',
  [ShowcaseStrings.Enc_EduWhatsHappening]: '🎓 Ce qui se passe maintenant',
  [ShowcaseStrings.Enc_TechDetails]: 'Détails techniques :',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'Taille de bloc : {SIZE} octets',
  [ShowcaseStrings.Enc_ExpectedChunks]: 'Fragments attendus : {COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    'Chaque fragment devient un bloc dans la soupe',
  [ShowcaseStrings.Enc_WhyPadding]: 'Pourquoi le remplissage ?',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'Tous les blocs doivent avoir la même taille',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'Le remplissage aléatoire empêche l\'analyse des données',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'Le remplissage est supprimé lors de la reconstruction',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'Objectif du checksum :',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Garantit l\'intégrité des données',
  [ShowcaseStrings.Enc_UniqueIdentifier]: 'Utilisé comme identifiant unique de bloc',
  [ShowcaseStrings.Enc_EnablesVerification]:
    'Permet la vérification lors de la récupération',

  // ProcessCompletionSummary
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Points clés d\'apprentissage',
  [ShowcaseStrings.Edu_CloseSummary]: 'Fermer le résumé',
  [ShowcaseStrings.Edu_Overview]: 'Aperçu',
  [ShowcaseStrings.Edu_Achievements]: 'Réalisations',
  [ShowcaseStrings.Edu_Technical]: 'Technique',
  [ShowcaseStrings.Edu_NextSteps]: 'Prochaines étapes',
  [ShowcaseStrings.Edu_Previous]: '← Précédent',
  [ShowcaseStrings.Edu_Next]: 'Suivant →',
  [ShowcaseStrings.Edu_Finish]: 'Terminer',

  // EducationalModeControls
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 Mode éducatif',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'Vitesse d\'animation :',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Très lent)',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Lent)',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Modéré)',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x (Normal)',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Rapide)',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Très rapide)',
  [ShowcaseStrings.Edu_StepByStep]: 'Mode pas à pas',
  [ShowcaseStrings.Edu_ShowTooltips]: 'Afficher les info-bulles',
  [ShowcaseStrings.Edu_ShowExplanations]: 'Afficher les explications',
  [ShowcaseStrings.Edu_AutoAdvance]: 'Avancer automatiquement',

  // Privacy Policy Page
  [ShowcaseStrings.PP_Title]: 'Politique de confidentialité',
  [ShowcaseStrings.PP_LastUpdated]: 'Dernière mise à jour : 20 avril 2026',
  [ShowcaseStrings.PP_BackToHome]: '← Retour à l\'accueil',

  // Section 1: Introduction
  [ShowcaseStrings.PP_S1_Title]: '1. Introduction',
  [ShowcaseStrings.PP_S1_P1]:
    'BrightChain est une plateforme décentralisée open source exploitée par Digital Defiance, une organisation à but non lucratif 501(c)(3) (« nous » ou « notre »). Cette Politique de confidentialité décrit comment nous collectons, utilisons, stockons et divulguons les informations lorsque vous utilisez la plateforme BrightChain, le site web, les applications et les services associés (collectivement, les « Services »).',
  [ShowcaseStrings.PP_S1_P2]:
    'En accédant aux Services ou en les utilisant, vous reconnaissez avoir lu, compris et accepté d\'être lié par cette Politique de confidentialité. Si vous n\'êtes pas d\'accord, vous ne devez pas utiliser les Services.',

  // Section 2: How BrightChain Works
  [ShowcaseStrings.PP_S2_Title]:
    '2. Comment fonctionne BrightChain — Contexte architectural',
  [ShowcaseStrings.PP_S2_P1]:
    'BrightChain est construit sur le modèle de système de fichiers sans propriétaire (OFF). Toutes les données stockées sur le réseau sont divisées en blocs de taille fixe, soumises à un XOR avec des blocs cryptographiquement aléatoires (un processus appelé « blanchiment TUPLE ») et distribuées entre les nœuds participants. En conséquence :',
  [ShowcaseStrings.PP_S2_Li1]:
    'Les blocs individuels sont indiscernables de données aléatoires et ne peuvent être lus sans l\'ensemble complet des blocs constitutifs et la Liste de Blocs Constitutifs (CBL) correspondante.',
  [ShowcaseStrings.PP_S2_Li2]:
    'Les données peuvent optionnellement être chiffrées avec le Schéma de Chiffrement Intégré à Courbe Elliptique (ECIES) utilisant AES-256-GCM, fournissant une confidentialité par destinataire en plus du déni plausible fourni par le blanchiment TUPLE.',
  [ShowcaseStrings.PP_S2_Li3]:
    'Les opérateurs de nœuds — y compris Digital Defiance — ne peuvent généralement pas déterminer le contenu, la propriété ou la nature de tout bloc individuel stocké sur le réseau.',
  [ShowcaseStrings.PP_S2_P2]:
    'Cette architecture signifie que les protections de la vie privée décrites dans cette politique sont, dans de nombreux cas, appliquées par les mathématiques plutôt que par la seule politique.',

  // Section 3: Information We Collect
  [ShowcaseStrings.PP_S3_Title]: '3. Informations que nous collectons',
  [ShowcaseStrings.PP_S3_1_Title]: '3.1 Informations de compte',
  [ShowcaseStrings.PP_S3_1_P1]:
    'Lorsque vous créez un compte BrightChain, nous collectons un nom d\'utilisateur, une adresse e-mail et votre clé cryptographique publique (dérivée de votre mnémonique BIP39). Nous ne collectons, ne stockons ni n\'avons accès à votre phrase mnémonique ou à vos clés privées.',
  [ShowcaseStrings.PP_S3_2_Title]: '3.2 Contenu généré par l\'utilisateur',
  [ShowcaseStrings.PP_S3_2_P1]:
    'Les fichiers, messages, identifiants et autres contenus que vous stockez sur le réseau sont divisés en blocs blanchis par TUPLE. Nous n\'avons pas la capacité de lire, reconstruire ou inspecter ce contenu. Si vous utilisez le chiffrement ECIES optionnel, le contenu est en outre chiffré pour des destinataires spécifiques et est inaccessible à quiconque — y compris nous — sans la clé privée correspondante.',
  [ShowcaseStrings.PP_S3_3_Title]: '3.3 Informations collectées automatiquement',
  [ShowcaseStrings.PP_S3_3_P1]:
    'Lorsque vous interagissez avec nos Services web, nous pouvons automatiquement collecter des données standard de journaux serveur, y compris les adresses IP, le type de navigateur, les URL de référence, les pages visitées et les horodatages. Ces informations sont utilisées uniquement à des fins opérationnelles (surveillance de la sécurité, prévention des abus et fiabilité du service) et sont conservées pendant 90 jours maximum.',
  [ShowcaseStrings.PP_S3_4_Title]: '3.4 Entrées du registre blockchain',
  [ShowcaseStrings.PP_S3_4_P1]:
    'Certaines opérations (création de coffres, lectures de coffres, destruction de coffres, votes de gouvernance) sont enregistrées sur un registre blockchain en ajout seul. Ces entrées contiennent le type d\'opération, l\'horodatage et les hachages cryptographiques — pas le contenu des données sous-jacentes. Les entrées du registre sont immuables par conception et ne peuvent pas être supprimées.',

  // Section 4: How We Use Information
  [ShowcaseStrings.PP_S4_Title]: '4. Comment nous utilisons les informations',
  [ShowcaseStrings.PP_S4_P1]: 'Nous utilisons les informations que nous collectons pour :',
  [ShowcaseStrings.PP_S4_Li1]:
    'Fournir, maintenir et améliorer les Services',
  [ShowcaseStrings.PP_S4_Li2]:
    'Authentifier les utilisateurs et gérer les comptes',
  [ShowcaseStrings.PP_S4_Li3]:
    'Détecter et prévenir la fraude, les abus et les incidents de sécurité',
  [ShowcaseStrings.PP_S4_Li4]:
    'Respecter les obligations légales applicables',
  [ShowcaseStrings.PP_S4_Li5]:
    'Communiquer avec vous au sujet des Services (par exemple, annonces de service, alertes de sécurité)',
  [ShowcaseStrings.PP_S4_P2]:
    'Nous ne vendons, ne louons ni n\'échangeons vos informations personnelles avec des tiers. Nous n\'utilisons pas vos données à des fins publicitaires ou de profilage.',

  // Section 5: Data Storage and Security
  [ShowcaseStrings.PP_S5_Title]: '5. Stockage et sécurité des données',
  [ShowcaseStrings.PP_S5_P1]:
    'Le contenu généré par l\'utilisateur est stocké sous forme de blocs blanchis par TUPLE distribués sur le réseau décentralisé. Les métadonnées de compte (nom d\'utilisateur, e-mail, clé publique) sont stockées dans nos bases de données opérationnelles avec des mesures de sécurité conformes aux normes de l\'industrie, y compris le chiffrement au repos et en transit.',
  [ShowcaseStrings.PP_S5_P2]:
    'Une fois les données stockées sous forme de blocs blanchis et distribuées sur le réseau, les données d\'autres participants peuvent dépendre de ces mêmes blocs via le processus de blanchiment XOR. Cela signifie que la suppression de blocs individuels peut être techniquement impossible sans impacter les données d\'autres utilisateurs. Cependant, la reconstruction d\'un fichier nécessite la Liste de Blocs Constituants (CBL) — la recette ordonnée des identifiants de blocs. Sans la CBL, les blocs distribués sont informatiquement indiscernables de données aléatoires et ne peuvent pas être réassemblés. Supprimer ou détruire la CBL suffit à rendre les données sous-jacentes définitivement inaccessibles.',
  [ShowcaseStrings.PP_S5_P3]:
    'Les CBL peuvent être stockées à divers endroits selon l\'application. Digital Burnbag stocke les CBL dans son système de coffres-forts adossé à BrightDB. Les utilisateurs peuvent également conserver les CBL sous forme de références MagnetURL. Dans tous les cas, détruire la CBL — quel que soit son emplacement de stockage — est le mécanisme effectif d\'effacement des données, même lorsque les blocs sous-jacents persistent sur le réseau.',

  // Section 6: Cryptographic Protections
  [ShowcaseStrings.PP_S6_Title]:
    '6. Protections cryptographiques et limitations',
  [ShowcaseStrings.PP_S6_P1]:
    'BrightChain utilise de fortes protections cryptographiques comprenant le hachage SHA3-512, ECIES avec secp256k1, le chiffrement symétrique AES-256-GCM, les sceaux HMAC-SHA3-512 et le chiffrement homomorphe de Paillier pour le vote préservant la vie privée. Ces protections sont appliquées par le protocole et ne dépendent pas de notre coopération ou bonne volonté.',
  [ShowcaseStrings.PP_S6_P2]:
    'Lorsqu\'il est utilisé correctement, BrightChain peut fournir de très fortes protections de la vie privée. Cependant, nous ne garantissons pas qu\'un algorithme cryptographique spécifique restera sécurisé indéfiniment. Les avancées en informatique (y compris l\'informatique quantique) peuvent affecter la sécurité des primitives cryptographiques actuelles. Les utilisateurs sont responsables de comprendre les protections qui leur sont disponibles et de configurer leur utilisation des Services en conséquence.',

  // Section 7: Law Enforcement
  [ShowcaseStrings.PP_S7_Title]:
    '7. Forces de l\'ordre et demandes légales',
  [ShowcaseStrings.PP_S7_P1]:
    'Digital Defiance opère en tant qu\'opérateur de réseau et fournisseur d\'infrastructure. Nous nous conformons aux procédures légales valides, y compris les assignations, les ordonnances judiciaires et les mandats de perquisition émis par des tribunaux compétents, dans la mesure où cela est techniquement faisable.',
  [ShowcaseStrings.PP_S7_P2]:
    'Cependant, en raison de la conception architecturale de BrightChain :',
  [ShowcaseStrings.PP_S7_Li1]:
    'Nous ne pouvons généralement pas produire le contenu des données générées par l\'utilisateur stockées sous forme de blocs blanchis par TUPLE, car nous ne possédons pas les CBL ni les clés de déchiffrement nécessaires pour reconstruire ou déchiffrer ces données.',
  [ShowcaseStrings.PP_S7_Li2]:
    'Nous pouvons produire les métadonnées de compte (nom d\'utilisateur, e-mail, clé publique) et les données de journaux serveur dans la mesure où nous les conservons.',
  [ShowcaseStrings.PP_S7_Li3]:
    'Les entrées du registre blockchain sont immuables et peuvent être produites en réponse à une procédure légale valide.',
  [ShowcaseStrings.PP_S7_Li4]:
    'Si un coffre Digital Burnbag a été détruit cryptographiquement, la preuve de destruction est le seul artefact restant — elle prouve que les données ont disparu, pas ce qu\'elles contenaient.',
  [ShowcaseStrings.PP_S7_P3]:
    'Nous informerons les utilisateurs concernés des demandes légales dans la mesure permise par la loi. Nous nous réservons le droit de contester les demandes légales que nous estimons excessives, juridiquement insuffisantes ou autrement inappropriées.',

  // Section 8: Brokered Anonymity
  [ShowcaseStrings.PP_S8_Title]: '8. Anonymat négocié',
  [ShowcaseStrings.PP_S8_P1]:
    'BrightChain prend en charge un protocole d\'« Anonymat Négocié » dans lequel l\'identité réelle d\'un utilisateur peut être scellée à l\'aide du Partage de Secret de Shamir et distribuée parmi les membres de gouvernance BrightTrust. La récupération d\'identité nécessite un vote à seuil des membres BrightTrust et est soumise à un délai de prescription configurable, après lequel les fragments d\'identité sont définitivement supprimés et l\'identité réelle devient irrécupérable. Ce mécanisme est conçu pour équilibrer la vie privée avec la responsabilité sous gouvernance collective.',

  // Section 9: Third-Party Services
  [ShowcaseStrings.PP_S9_Title]: '9. Services tiers',
  [ShowcaseStrings.PP_S9_P1]:
    'Certaines fonctionnalités (telles que la surveillance d\'activité du protocole canari) peuvent s\'intégrer à des services tiers (par exemple, GitHub, Fitbit, Slack). Votre utilisation de ces intégrations est régie par les politiques de confidentialité respectives des tiers. Nous n\'accédons qu\'aux informations minimales nécessaires pour fournir la fonctionnalité demandée (par exemple, les horodatages d\'activité récente pour la surveillance de l\'interrupteur d\'homme mort) et ne stockons pas les identifiants tiers sur nos serveurs — l\'authentification est gérée via des jetons OAuth que vous pouvez révoquer à tout moment.',

  // Section 10: Children's Privacy
  [ShowcaseStrings.PP_S10_Title]: '10. Vie privée des enfants',
  [ShowcaseStrings.PP_S10_P1]:
    'Les Services ne sont pas destinés aux enfants de moins de 13 ans (ou l\'âge applicable du consentement numérique dans votre juridiction). Nous ne collectons pas sciemment d\'informations personnelles auprès d\'enfants. Si nous apprenons que nous avons collecté des informations personnelles d\'un enfant, nous prendrons des mesures pour supprimer ces informations rapidement.',

  // Section 11: International Users
  [ShowcaseStrings.PP_S11_Title]: '11. Utilisateurs internationaux',
  [ShowcaseStrings.PP_S11_P1]:
    'Digital Defiance est basé aux États-Unis. Si vous accédez aux Services depuis l\'extérieur des États-Unis, vos informations peuvent être transférées, stockées et traitées aux États-Unis ou dans d\'autres juridictions où notre infrastructure opère. En utilisant les Services, vous consentez à ce transfert et traitement.',
  [ShowcaseStrings.PP_S11_1_Title]:
    '11.1 Espace économique européen (EEE) et Royaume-Uni',
  [ShowcaseStrings.PP_S11_1_P1]:
    'Si vous êtes situé dans l\'EEE ou au Royaume-Uni, vous pouvez avoir des droits en vertu du Règlement Général sur la Protection des Données (RGPD) ou du RGPD britannique, y compris le droit d\'accès, de rectification, d\'effacement, de limitation du traitement et de portabilité de vos données personnelles, et le droit de vous opposer au traitement. Pour exercer ces droits, contactez-nous à l\'adresse ci-dessous. Notez que certaines données (entrées du registre blockchain, blocs TUPLE distribués) peuvent être techniquement impossibles à effacer en raison de la nature décentralisée et immuable du système. La capacité de destruction prouvable de BrightChain (via Digital Burnbag) est conçue pour soutenir la conformité au droit à l\'effacement de l\'Article 17 du RGPD pour les données contrôlées par l\'utilisateur.',

  // Section 12: Data Retention
  [ShowcaseStrings.PP_S12_Title]: '12. Conservation des données',
  [ShowcaseStrings.PP_S12_P1]:
    'Les métadonnées de compte sont conservées tant que votre compte est actif ou selon les besoins pour fournir les Services. Les journaux serveur sont conservés jusqu\'à 90 jours. Les entrées du registre blockchain sont conservées indéfiniment dans le cadre du registre immuable. Les blocs blanchis par TUPLE sont conservés sur le réseau selon les termes du contrat de stockage et l\'économie du bilan énergétique ; les blocs dont les contrats de stockage expirent et ne sont pas renouvelés peuvent être collectés par les nœuds.',

  // Section 13: Disclaimer
  [ShowcaseStrings.PP_S13_Title]:
    '13. Exclusion de garanties et limitation de responsabilité',
  [ShowcaseStrings.PP_S13_P1]:
    'LES SERVICES SONT FOURNIS « EN L\'ÉTAT » ET « SELON DISPONIBILITÉ » SANS GARANTIE D\'AUCUNE SORTE, QU\'ELLE SOIT EXPRESSE, IMPLICITE OU LÉGALE, Y COMPRIS MAIS SANS S\'Y LIMITER LES GARANTIES IMPLICITES DE QUALITÉ MARCHANDE, D\'ADÉQUATION À UN USAGE PARTICULIER, DE TITRE ET DE NON-CONTREFAÇON.',
  [ShowcaseStrings.PP_S13_P2]:
    'DIGITAL DEFIANCE, SES DIRIGEANTS, ADMINISTRATEURS, EMPLOYÉS, BÉNÉVOLES ET CONTRIBUTEURS (Y COMPRIS JESSICA MULEIN) NE SERONT PAS RESPONSABLES DE TOUT DOMMAGE INDIRECT, ACCESSOIRE, SPÉCIAL, CONSÉCUTIF OU PUNITIF, OU DE TOUTE PERTE DE BÉNÉFICES, DE DONNÉES, D\'UTILISATION, DE CLIENTÈLE OU D\'AUTRES PERTES IMMATÉRIELLES, RÉSULTANT DE (A) VOTRE ACCÈS OU UTILISATION OU INCAPACITÉ D\'ACCÉDER OU D\'UTILISER LES SERVICES ; (B) TOUTE CONDUITE OU CONTENU DE TIERS SUR LES SERVICES ; (C) TOUT CONTENU OBTENU DES SERVICES ; (D) L\'ACCÈS NON AUTORISÉ, L\'UTILISATION OU LA MODIFICATION DE VOS TRANSMISSIONS OU CONTENUS ; OU (E) LA DÉFAILLANCE DE TOUT MÉCANISME CRYPTOGRAPHIQUE, QUE CE SOIT SUR LA BASE D\'UNE GARANTIE, D\'UN CONTRAT, D\'UN DÉLIT (Y COMPRIS LA NÉGLIGENCE) OU DE TOUTE AUTRE THÉORIE JURIDIQUE, QUE NOUS AYONS ÉTÉ INFORMÉS OU NON DE LA POSSIBILITÉ D\'UN TEL DOMMAGE.',
  [ShowcaseStrings.PP_S13_P3]:
    'EN AUCUN CAS LA RESPONSABILITÉ GLOBALE DE DIGITAL DEFIANCE ET DE SES DIRIGEANTS, ADMINISTRATEURS, EMPLOYÉS, BÉNÉVOLES ET CONTRIBUTEURS POUR TOUTES LES RÉCLAMATIONS LIÉES AUX SERVICES NE DÉPASSERA LE PLUS ÉLEVÉ DE CENT DOLLARS AMÉRICAINS (100,00 $ US) OU LE MONTANT QUE VOUS NOUS AVEZ PAYÉ AU COURS DES DOUZE (12) MOIS PRÉCÉDANT LA RÉCLAMATION.',
  [ShowcaseStrings.PP_S13_P4]:
    'CERTAINES JURIDICTIONS N\'AUTORISENT PAS L\'EXCLUSION OU LA LIMITATION DE CERTAINES GARANTIES OU RESPONSABILITÉS. DANS CES JURIDICTIONS, NOTRE RESPONSABILITÉ SERA LIMITÉE DANS LA PLUS GRANDE MESURE PERMISE PAR LA LOI.',

  // Section 14: Indemnification
  [ShowcaseStrings.PP_S14_Title]: '14. Indemnisation',
  [ShowcaseStrings.PP_S14_P1]:
    'Vous acceptez d\'indemniser, de défendre et de dégager de toute responsabilité Digital Defiance, ses dirigeants, administrateurs, employés, bénévoles et contributeurs (y compris Jessica Mulein) de et contre toutes réclamations, responsabilités, dommages, pertes, coûts et dépenses (y compris les honoraires raisonnables d\'avocats) découlant de ou liés de quelque manière que ce soit à votre accès ou utilisation des Services, votre violation de cette Politique de confidentialité, ou votre violation de toute loi applicable ou des droits de tout tiers.',

  // Section 15: Governing Law
  [ShowcaseStrings.PP_S15_Title]:
    '15. Droit applicable et résolution des litiges',
  [ShowcaseStrings.PP_S15_P1]:
    'Cette Politique de confidentialité sera régie et interprétée conformément aux lois de l\'État de Washington, États-Unis, sans tenir compte de ses dispositions relatives aux conflits de lois. Tout litige découlant de ou lié à cette Politique de confidentialité ou aux Services sera résolu exclusivement devant les tribunaux étatiques ou fédéraux situés dans le comté de King, Washington, et vous consentez à la compétence personnelle de ces tribunaux.',

  // Section 16: Open Source
  [ShowcaseStrings.PP_S16_Title]: '16. Open Source',
  [ShowcaseStrings.PP_S16_P1_Before]:
    'BrightChain est un logiciel open source. Le code source est publiquement disponible sur ',
  [ShowcaseStrings.PP_S16_P1_LinkText]:
    'github.com/Digital-Defiance/BrightChain',
  [ShowcaseStrings.PP_S16_P1_After]:
    '. Vous êtes encouragé à examiner le code pour vérifier les propriétés de confidentialité décrites dans cette politique. Les protections cryptographiques décrites dans ce document sont implémentées dans le code source et sont vérifiables par inspection.',

  // Section 17: Changes
  [ShowcaseStrings.PP_S17_Title]: '17. Modifications de cette politique',
  [ShowcaseStrings.PP_S17_P1]:
    'Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. Nous vous informerons des modifications importantes en publiant la politique mise à jour sur les Services avec une date de « Dernière mise à jour » révisée. Votre utilisation continue des Services après la date d\'entrée en vigueur de toute modification constitue votre acceptation de la politique révisée.',

  // Section 18: Contact
  [ShowcaseStrings.PP_S18_Title]: '18. Nous contacter',
  [ShowcaseStrings.PP_S18_P1]:
    'Si vous avez des questions sur cette Politique de confidentialité ou souhaitez exercer vos droits en matière de protection des données, veuillez contacter :',
  [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
  [ShowcaseStrings.PP_S18_EmailLabel]: 'E-mail :',
  [ShowcaseStrings.PP_S18_WebLabel]: 'Web :',
};

export default ShowcaseFrenchStrings;
