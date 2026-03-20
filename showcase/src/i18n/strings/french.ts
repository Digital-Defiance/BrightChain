import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// French translations - Complete
export const ShowcaseFrenchStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: 'Accueil',
  [ShowcaseStrings.Nav_SoupDemo]: 'Démo Soup',
  [ShowcaseStrings.Nav_Ledger]: 'Registre',
  [ShowcaseStrings.Nav_Blog]: 'Blog',
  [ShowcaseStrings.Nav_FAQ]: 'FAQ',
  [ShowcaseStrings.Nav_Docs]: 'Documentation',
  [ShowcaseStrings.Nav_Home_Description]: 'Page principale',
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    'Visualisation interactive des blocs',
  [ShowcaseStrings.Nav_Ledger_Description]:
    'Registre blockchain avec gouvernance',
  [ShowcaseStrings.Nav_Blog_Description]: 'Blog et actualités BrightChain',
  [ShowcaseStrings.Nav_FAQ_Description]: 'Questions fréquemment posées',
  [ShowcaseStrings.Nav_Docs_Description]: 'Documentation du projet',
  [ShowcaseStrings.Nav_ToggleMenu]: 'Basculer le menu',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: 'Langue',
  [ShowcaseStrings.Lang_EN_US]: 'Anglais (États-Unis)',
  [ShowcaseStrings.Lang_EN_GB]: 'Anglais (Royaume-Uni)',
  [ShowcaseStrings.Lang_ES]: 'Espagnol',
  [ShowcaseStrings.Lang_FR]: 'Français',
  [ShowcaseStrings.Lang_DE]: 'Allemand',
  [ShowcaseStrings.Lang_ZH_CN]: 'Chinois',
  [ShowcaseStrings.Lang_JA]: 'Japonais',
  [ShowcaseStrings.Lang_UK]: 'Ukrainien',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'Mode FAQ',
  [ShowcaseStrings.FAQ_Ohm_Character]: 'Personnage de Ohm',
  [ShowcaseStrings.FAQ_Volta_Character]: 'Personnage de Volta',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Passer au FAQ {MODE}',
  [ShowcaseStrings.FAQ_Title_Technical]: 'FAQ BrightChain',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: "L'Univers BrightChain",
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'Le Successeur Évolutif du Système de Fichiers Sans Propriétaire',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    "Découvrez les Mascottes, la Mission et l'Écosystème",
  [ShowcaseStrings.FAQ_Toggle_Technical]: 'Technique',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Écosystème',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Ohm garde les détails',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Volta révèle la vision',
  [ShowcaseStrings.FAQ_BackToHome]: "← Retour à l'Accueil",
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]:
    'Application décentralisée Top Secret',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'Logo de BrightChat',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'Logo de BrightHub',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'Logo de BrightID',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'Logo de BrightMail',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'Logo de BrightPass',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: "1. Qu'est-ce que BrightChain ?",
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    "BrightChain est une infrastructure de données décentralisée et haute performance « Sans Propriétaire ». C'est le successeur architectural du système de fichiers sans propriétaire (OFFSystem), modernisé pour les environnements matériels de 2026, y compris Apple Silicon et le stockage NVMe.",

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    "2. En quoi BrightChain diffère-t-il de l'OFFSystem original ?",
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChain honore la philosophie « Sans Propriétaire » de son prédécesseur tout en introduisant des modernisations critiques :',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: 'Redondance optionnelle',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    "Les utilisateurs peuvent demander que leurs blocs soient stockés avec une durabilité accrue en utilisant l'encodage Reed-Solomon.",
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
    'Performance de récupération',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    "En utilisant @digitaldefiance/node-rs-accelerate, le système exploite le matériel GPU/NPU pour effectuer des opérations de récupération Reed-Solomon à des vitesses allant jusqu'à 30+ Go/s.",
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'Évolutivité',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    "Grâce aux Super CBL (listes de blocs constitutifs), le système utilise l'indexation récursive pour prendre en charge des tailles de fichiers effectivement illimitées avec une efficacité de récupération O(log N).",
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'Identité',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    "L'intégration de BIP39/32 permet une identité sécurisée basée sur des mnémoniques et une gestion hiérarchique déterministe des clés.",
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: 'Chiffrement optionnel',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    "Les utilisateurs peuvent optionnellement ajouter un chiffrement ECIES par-dessus leurs données, en utilisant le système HDKey de l'espace de clés/identité Ethereum.",

  [ShowcaseStrings.FAQ_Tech_Q3_Title]:
    '3. Comment les données sont-elles « Sans Propriétaire » ?',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    "BrightChain utilise une approche cryptographique multicouche pour garantir qu'aucun nœud individuel n'« héberge » un fichier au sens juridique ou pratique :",
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'La base XOR',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    'Chaque bloc est traité par de simples opérations XOR, rendant les données au repos indiscernables du bruit aléatoire.',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'La Recette',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    "Pour reconstruire un fichier, un utilisateur a besoin de la Recette — la carte spatiale spécifique de l'ordre des blocs.",
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: 'Chiffrement optionnel',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    'Les utilisateurs peuvent optionnellement ajouter un chiffrement ECIES par-dessus leurs données. Sans la Recette, les données restent désordonnées et, si choisi, cryptographiquement verrouillées.',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    "4. Qu'est-ce que le « Compromis de Tuples » et qu'apporte-t-il ?",
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    "Le « Compromis de Tuples » est l'équilibre délibéré entre la surcharge du partitionnement « Sans Propriétaire » et les avantages juridiques et économiques inégalés qu'il procure au réseau.",
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    "L'avantage juridique : Déni plausible",
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    'En partitionnant les données en tuples (blocs) quasi aléatoires par mélange XOR, les utilisateurs qui contribuent du stockage hébergent des données mathématiquement indiscernables du bruit.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    "Le résultat : Parce qu'un seul nœud ne peut pas reconstruire un fichier cohérent sans la « Recette », il est techniquement et juridiquement impossible de prétendre qu'un opérateur de nœud spécifique « héberge » ou « distribue » un contenu spécifique. Cela fournit la couche ultime de déni plausible pour les participants.",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    "L'avantage économique : Efficacité vs. Preuve de Travail",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    "Bien que le partitionnement « Sans Propriétaire » introduise une surcharge de stockage mineure, elle est négligeable comparée aux coûts massifs en énergie et matériel des réseaux traditionnels de Preuve de Travail (PoW) ou de Preuve d'Enjeu (PoS).",
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    'Le résultat : BrightChain atteint une intégrité des données haute performance sans brûler des « Joules » dans des compétitions de hachage inutiles. Cela rend le réseau hautement compétitif, offrant des performances à faible latence pour une fraction du coût des blockchains héritées.',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: 'Résumé du compromis :',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    "Les utilisateurs acceptent une légère augmentation des « fragments » de données en échange d'un environnement d'hébergement sans responsabilité et d'une infrastructure à coût ultra-faible. Cela fait de BrightChain la plateforme la plus viable pour le stockage décentralisé dans des environnements hautement réglementés ou à ressources limitées.",

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    '5. En quoi BrightChain diffère-t-il des blockchains traditionnelles ?',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    "Techniquement, BrightChain est un magasin de blocs décentralisé plutôt qu'une blockchain unique et monolithique. Alors que les blockchains traditionnelles sont le registre, BrightChain fournit l'infrastructure sous-jacente pour héberger et prendre en charge simultanément plusieurs registres d'arbres de Merkle hybrides. Nous utilisons le chaînage de blocs comme méthode structurelle pour reconstruire les fichiers, mais le système est conçu comme une base haute performance pouvant alimenter de nombreuses blockchains et dApps différentes sur une couche de stockage unifiée « Sans Propriétaire ».",

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. Quel est le rôle de Reed-Solomon (RS) dans BrightChain ?',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    'Alors que XOR gère la confidentialité et le statut « Sans Propriétaire » des données, le codage par effacement Reed-Solomon est une couche optionnelle pour la récupérabilité.',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: 'Redondance',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    "RS permet de reconstruire un fichier même si plusieurs nœuds d'hébergement se déconnectent.",
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'Le compromis',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    "RS ajoute une surcharge computationnelle et des exigences de stockage par rapport au simple XOR. Les utilisateurs doivent choisir leur niveau de redondance en fonction de l'importance des données et de leurs « Joules » disponibles.",

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: "7. Qu'est-ce qu'un « Joule » ?",
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    "Un Joule est l'unité de compte pour le travail et la consommation de ressources au sein de l'écosystème BrightChain.",
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'Base de coût',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    'Chaque action — stocker des données, effectuer un mélange XOR ou encoder des fragments Reed-Solomon — a un coût projeté en Joules.',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]:
    'Gestion des ressources',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    'Les utilisateurs doivent peser le coût en Joules du stockage à haute redondance par rapport à la valeur de leurs données.',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. Comment obtient-on des Joules ?',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    'Les Joules sont gagnés grâce à un modèle de Travail pour Travail. Les utilisateurs obtiennent des Joules en contribuant des ressources au réseau :',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'Stockage',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    "Héberger des blocs chiffrés pour d'autres pairs.",
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: 'Calcul',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    "Fournir des cycles CPU/GPU/NPU pour effectuer des tâches d'encodage ou de récupération pour le collectif.",
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    'Cela garantit que le réseau reste une économie énergétique autosuffisante où la contribution égale la capacité.',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]:
    "9. Comment l'anonymat est-il maintenu ?",
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    "BrightChain emploie l'anonymat par intermédiation.",
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'Sur la chaîne',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    'Toutes les actions sont anonymes pour le réseau général.',
  [ShowcaseStrings.FAQ_Tech_Q9_Quorum_Label]: 'Le Quorum',
  [ShowcaseStrings.FAQ_Tech_Q9_Quorum]:
    "L'identité est cryptographiquement liée à un Quorum de Gouvernance. Cela garantit que, bien que les données et actions d'un utilisateur soient privées, la communauté maintient une « Couche Sociale » de responsabilité via le partage de secret de Shamir et le vote homomorphe.",

  [ShowcaseStrings.FAQ_Tech_Q10_Title]:
    "10. Qu'est-ce que BrightDB et comment fonctionne-t-il ?",
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    'BrightDB est la couche de magasin de documents de haut niveau construite directement sur le magasin de blocs BrightChain. Il fournit un moyen structuré de stocker, interroger et gérer des objets de données complexes sans serveur de base de données central.',
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: 'Comment ça fonctionne',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    'Stockage orienté documents',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    'Similaire aux bases de données NoSQL, BrightDB stocke les données sous forme de « Documents » partitionnés en blocs chiffrés et distribués à travers le réseau.',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    'Versionnage immuable',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    "Chaque modification d'un document est enregistrée comme une nouvelle entrée avec un historique cryptographiquement vérifiable.",
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    'Indexation décentralisée',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    "Un système d'indexation distribué permet aux nœuds de trouver et reconstruire des documents spécifiques à travers le DHT sans nœud « Maître » central.",
  [ShowcaseStrings.FAQ_Tech_Q10_QuorumBasedAccess_Label]:
    'Accès basé sur le quorum',
  [ShowcaseStrings.FAQ_Tech_Q10_QuorumBasedAccess]:
    "L'accès à des bases de données ou collections spécifiques peut être gouverné par un Quorum, nécessitant l'approbation cryptographique de signataires autorisés.",
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: "Pourquoi c'est important",
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    "La plupart des dApps peinent parce qu'elles stockent des données « lourdes » sur des serveurs centralisés. BrightDB garde les données décentralisées, sans propriétaire et haute performance — permettant des applications véritablement sans serveur aussi rapides que les applications web traditionnelles mais aussi sécurisées qu'une blockchain.",

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    '11. Quelles dApps ont été lancées avec BrightChain ?',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChain a été lancé avec une suite principale de « Bright-Apps » conçues pour remplacer les services centralisés de collecte de données par des alternatives sécurisées et souveraines.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: 'Communication souveraine',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    'Un système de messagerie entièrement conforme RFC reliant le SMTP traditionnel et le stockage décentralisé. Contrairement aux fournisseurs de messagerie standard, BrightMail partitionne chaque message dans le magasin de blocs « Sans Propriétaire » avec prise en charge de la messagerie chiffrée de bout en bout en « Mode Sombre ».',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
    'Réseau social et graphe souverain',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'Le concept',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    'Une plateforme de réseau social décentralisée et résistante à la censure qui reflète la fluidité des « Flux » hérités sans la surveillance centrale ni la manipulation algorithmique.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: 'La différence',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    "Chaque publication, « J'aime » et relation est stocké comme un document immuable et partitionné dans BrightDB. Grâce à l'économie des Joules, il n'y a pas de publicités — les utilisateurs contribuent une micro-fraction de calcul ou de stockage pour « amplifier » leur voix ou maintenir l'histoire de leur communauté.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Quorums_Label]:
    'Le pouvoir des quorums',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Quorums]:
    "La modération n'est pas gérée par une « Équipe de Sécurité » d'entreprise. Au lieu de cela, les communautés sont gouvernées par des Quorums de Gouvernance. Les règles sont appliquées cryptographiquement, et les standards communautaires sont votés via le vote homomorphe, garantissant que l'espace numérique d'un groupe reste véritablement « Sans Propriétaire » et autodéterminé.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]:
    'Coffre-fort à connaissance nulle',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    "Un système de gestion de mots de passe et d'identité où votre coffre-fort existe sous forme de blocs chiffrés distribués. L'accès est gouverné par votre mnémonique BIP39, et chaque changement d'identifiant est versionné et vérifiable via BrightDB.",
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'Communauté résiliente',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    "Une plateforme de communications en temps réel avec des canaux persistants, la voix et le partage de médias. La gouvernance communautaire est gérée via des Quorums, et la récupération accélérée par GPU garantit que l'historique de chat n'est jamais perdu.",
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Title]: 'Ultra Secret',
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Text]:
    'Une dApp Ultra Secrète arrive lors du lancement qui changera tout ce que vous savez et bouleversera complètement le jeu.',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    "12. Qu'est-ce que le chiffrement Paillier et comment permet-il le vote privé ?",
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    "Paillier est un schéma de chiffrement à clé publique avec une propriété spéciale appelée homomorphisme additif — vous pouvez additionner des valeurs chiffrées sans jamais les déchiffrer. Si vous chiffrez un « 1 » pour le Candidat A et que quelqu'un d'autre chiffre un « 1 » pour le Candidat A, vous pouvez multiplier ces textes chiffrés ensemble et le résultat, une fois déchiffré, est « 2 ». Personne ne voit jamais un bulletin individuel. Dans le système de vote de BrightChain, chaque vote est chiffré avec une clé publique Paillier, les bulletins chiffrés sont agrégés de manière homomorphe en un seul texte chiffré par candidat, et seul le décompte final est déchiffré — jamais aucun vote individuel. Pour une sécurité accrue, la clé privée Paillier peut être divisée entre plusieurs gardiens en utilisant la cryptographie à seuil, de sorte qu'aucune partie individuelle ne puisse déchiffrer le décompte seule. Cette approche fonctionne nativement pour les méthodes de vote courantes comme la pluralité, l'approbation et le vote par score, où le décompte n'est que de l'addition. Les méthodes nécessitant des tours d'élimination (comme le vote par classement) nécessitent des déchiffrements intermédiaires entre les tours, et certaines méthodes (comme le vote quadratique) ne peuvent pas être réalisées de manière homomorphe.",

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. Que fait le Pont Paillier ?',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    "Le Pont Paillier est une construction de dérivation de clés déterministe qui vous permet de dériver des clés de chiffrement homomorphe Paillier directement à partir de votre paire de clés ECDH (courbe elliptique Diffie-Hellman) existante. Au lieu de gérer deux paires de clés séparées — une pour l'identité/authentification (ECC) et une pour le chiffrement de vote homomorphe (Paillier) — le pont canalise votre secret partagé ECDH à travers HKDF et HMAC-DRBG pour générer de manière déterministe les grands nombres premiers nécessaires pour une clé Paillier de 3072 bits. Cela signifie que toute votre identité cryptographique, y compris vos clés de vote, peut être récupérée à partir d'une seule clé privée ECC de 32 octets. Le pont est unidirectionnel (vous ne pouvez pas inverser une clé Paillier vers la clé EC), entièrement déterministe (la même entrée produit toujours la même sortie), et atteint une sécurité de 128 bits conforme aux recommandations du NIST.",
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    "Consultez notre article sur le sujet pour plus d'informations.",

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    "🔗 Qu'est-ce que BrightChain, vraiment ?",
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    "BrightChain est une infrastructure pour un monde où vos données vous appartiennent — pas à une plateforme, pas à une entreprise, pas à quiconque gère le serveur. C'est une couche de stockage décentralisé où chaque fichier est partitionné, mélangé et dispersé à travers le réseau de sorte qu'aucun nœud individuel n'« héberge » jamais vos données de manière significative. Le résultat est un système où la confidentialité n'est pas une fonctionnalité que vous activez — c'est l'état par défaut de l'architecture. Nous l'appelons « Sans Propriétaire » parce qu'une fois que vos données entrent dans BrightChain, personne ne possède les morceaux. Seul vous détenez la Recette pour les rassembler.",

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'Rencontrez la troupe',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: "Volta — L'Étincelle",
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: "L'Architecte Haute Tension",
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    "Nommée d'après Alessandro Volta, inventeur de la batterie, Volta est une étincelle vivante — un renard géométrique dentelé, bleu néon, fait d'électricité pure et crépitante. Elle est la Fournisseuse : elle génère et pousse des Joules à travers le système, impatiente d'alimenter chaque opération à pleine puissance. Hyperactive, généreuse en énergie et légèrement imprudente, Volta pense que la conservation est ennuyeuse. « Vous voulez 20 térajoules ? C'est fait. Quoi d'autre ? » Dans l'interface, elle crépite près du compteur de Joules, et pendant les opérations lourdes elle brille d'un blanc incandescent, vibrant du désir d'exécuter. Elle représente le potentiel pur et chaotique — le désir d'agir.",
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    "Volta mascotte — un renard géométrique bleu néon fait d'électricité",

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: "Ohm — L'Ancre",
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: 'Le Moine Stoïque de la Résistance',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    "Nommé d'après Georg Ohm, qui a défini la résistance électrique, Ohm est le frein à l'accélérateur de Volta. Une tortue-paresseux lourde, semblable à la pierre, avec un symbole Oméga lumineux intégré dans sa carapace, il se déplace lentement et délibérément. Son mantra : « Ohm mani padme ohm. » Tandis que Volta zigzague comme un renard caféiné, Ohm s'assoit dans une position de lotus profonde et ancrée, vibrant à un bourdonnement parfait de 60Hz, centrant tout le système. Il est calme, sceptique et armé d'un humour sec — le comptable qui lit vraiment les reçus. Pas opposé aux dépenses, juste opposé au gaspillage. Quand les niveaux d'énergie s'emballent, il effectue une « Méditation Résistive », posant une lourde patte de pierre sur la barre de progression et changeant le courant du bleu à un ambre calme et profond. Il représente la sagesse ancrée — la discipline d'agir correctement.",
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    'Mascotte Ohm — une tortue-paresseux semblable à la pierre avec un symbole Oméga lumineux',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: "L'Économie",

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ Que sont les Joules ?',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    "Les Joules sont l'unité d'énergie de BrightChain — pas une cryptomonnaie spéculative, mais une mesure de travail réel et de contribution. Visuellement, ce sont de minuscules jetons d'éclair bleu néon qui coulent, s'accumulent et s'épuisent comme des pièces dans un jeu. Volta les génère, Ohm régule leur flux à travers sa porte, et les opérations les consomment. Chaque action dans BrightChain a un coût en Joules — d'un renommage de métadonnées quasi nul à un re-chiffrement de cycle complet d'un million de Joules. Les utilisateurs gagnent des Joules grâce à un modèle de Travail pour Travail : contribuez du stockage ou du calcul au réseau, et vous gagnez la capacité de l'utiliser. Le compteur de Joules dans l'interface montre votre budget énergétique, avec de petites étincelles coulant visiblement de Volta à travers la porte d'Ohm vers vos opérations.",

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: "💨 Qu'est-ce que la Suie ?",
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    "La Suie est la conséquence visible de chaque opération — l'« empreinte carbone » de vos actions numériques. Ce n'est pas une monnaie que vous dépensez ; c'est un coût que vous ne pouvez pas éviter. Chaque fois que de l'énergie est consommée, de la Suie est produite — une représentation visuelle du travail computationnel qui s'accumule au fil du temps. Plus vous en faites, plus la Suie s'accumule. Une utilisation légère laisse une trace ici et là ; une utilisation intensive crée une accumulation visible. La Suie représente le karma dans l'écosystème BrightChain : chaque action laisse une marque. Selon les mots d'Ohm : « Volta vous donne l'énergie, les opérations la transforment en chaleur, et le système suit les conséquences. Moi, je m'assure juste qu'on ne gaspille pas plus que nécessaire. »",

  [ShowcaseStrings.FAQ_Eco_BigPicture]: "La Vue d'ensemble",

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    "🌐 Comment tout s'assemble-t-il ?",
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    "L'écosystème fonctionne sur la tension dynamique entre Volta (le Dépensier) et Ohm (l'Épargnant), avec les Joules circulant entre eux comme monnaie d'énergie. Volta est impatiente d'alimenter chaque opération à pleine puissance, tandis qu'Ohm s'assure que les ressources ne sont pas gaspillées. Chaque action consomme des Joules et produit de la Suie — la trace visible du travail computationnel. Quand une opération se déclenche, Volta atteint les Joules, Ohm évalue le coût et les laisse passer à contrecœur, et le système suit la Suie résultante. Cela crée une économie auto-équilibrée où la contribution égale la capacité, et chaque action laisse sa marque sur le réseau.",

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 En quoi croit BrightChain ?',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    "L'énergie se conserve. Les actions ont des conséquences. Les données ont du poids. Chaque élément de l'écosystème BrightChain correspond à un principe plus profond : Volta est l'Étincelle — le potentiel pur et chaotique et le désir d'agir. Ohm est l'Ancre — la sagesse ancrée et la discipline d'agir correctement. Les Joules sont le Flux — l'esprit circulant entre eux. La Suie est le Karma — le coût visible qui ne peut être évité. Ensemble, ils forment une boucle fermée : Volta fournit l'énergie, Ohm s'assure qu'elle est dépensée sagement, et le système suit chaque conséquence. Rien n'est gratuit. Rien n'est gaspillé. Tout laisse une marque.",

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 Où puis-je voir les mascottes en action ?',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    "Les mascottes sont tissées à travers l'expérience produit. Volta et Ohm vivent dans le compteur de Joules de la plateforme, avec Volta crépitant près de la jauge d'énergie et Ohm intervenant lors des opérations coûteuses pour effectuer sa Méditation Résistive — changeant la barre de progression du bleu néon à un ambre calme. La Suie s'accumule visiblement tout au long de votre session, reflétant le travail computationnel effectué. Bientôt : apparitions des mascottes sur les pages d'erreur, écrans de chargement, dialogues de confirmation adaptés à la gravité de l'opération, et oui — du merchandising.",

  // Hero Section
  [ShowcaseStrings.Hero_Badge]:
    "🌟 La plateforme d'applications décentralisées",
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup ». Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite.',
  [ShowcaseStrings.Hero_Description_NotCrypto]: 'Pas une cryptomonnaie.',
  [ShowcaseStrings.Hero_Description_P2]:
    'Pas de jetons, pas de minage, pas de preuve de travail. BrightChain valorise les contributions réelles en stockage et en calcul, mesurées en Joules — une unité liée aux coûts énergétiques réels, pas à la spéculation du marché.',
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 Stockage sans propriétaire • ⚡ Économe en énergie • 🌐 Décentralisé • 🎭 Anonyme mais responsable • 🗳️ Vote homomorphe • 💾 Le stockage avant la puissance',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 Démo interactive',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 Démo BrightChain Soup',
  [ShowcaseStrings.Hero_CTA_GitHub]: 'Voir sur GitHub',
  [ShowcaseStrings.Hero_CTA_Blog]: 'Blog',

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: 'Fonctionnalités',
  [ShowcaseStrings.Comp_Title_Features]: 'révolutionnaires',
  [ShowcaseStrings.Comp_Title_Capabilities]: '& capacités',
  [ShowcaseStrings.Comp_Subtitle]:
    "La plateforme d'applications décentralisées — cryptographie avancée, stockage décentralisé et gouvernance démocratique",
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup » — alliant cryptographie avancée, stockage décentralisé et gouvernance démocratique.',
  [ShowcaseStrings.Comp_Intro_P1]:
    "Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite. Du vote homomorphe à l'anonymat par intermédiation, du stockage de fichiers distribué à la gouvernance par quorum, BrightChain offre tout le nécessaire pour la prochaine génération d'applications décentralisées.",
  [ShowcaseStrings.Comp_Problem_Title]:
    '❌ Les problèmes de la blockchain traditionnelle',
  [ShowcaseStrings.Comp_Problem_1]:
    'Gaspillage énergétique massif dû au minage par preuve de travail',
  [ShowcaseStrings.Comp_Problem_2]:
    "Capacité de stockage gaspillée sur des milliards d'appareils",
  [ShowcaseStrings.Comp_Problem_3]:
    'Aucun mécanisme de vote préservant la confidentialité',
  [ShowcaseStrings.Comp_Problem_4]:
    "L'anonymat sans responsabilité mène aux abus",
  [ShowcaseStrings.Comp_Problem_5]:
    'Le stockage on-chain coûteux limite les applications',
  [ShowcaseStrings.Comp_Problem_6]:
    'Les opérateurs de nœuds font face à une responsabilité juridique pour le contenu stocké',
  [ShowcaseStrings.Comp_Problem_Result]:
    "Une technologie blockchain destructrice pour l'environnement, juridiquement risquée et fonctionnellement limitée.",
  [ShowcaseStrings.Comp_Solution_Title]: '✅ La solution BrightChain',
  [ShowcaseStrings.Comp_Solution_P1]:
    "BrightChain élimine le gaspillage du minage en utilisant la preuve de travail uniquement pour la régulation, pas pour le consensus. Le système de fichiers sans propriétaire offre une immunité juridique en ne stockant que des blocs randomisés par XOR. Le vote homomorphe permet des élections préservant la confidentialité, tandis que l'anonymat par intermédiation équilibre vie privée et responsabilité.",
  [ShowcaseStrings.Comp_Solution_P2]:
    "Construit sur l'espace de clés d'Ethereum mais conçu sans les contraintes de la preuve de travail, BrightChain monétise le stockage inutilisé des appareils personnels, créant un réseau P2P durable. Le système de quorum assure une gouvernance démocratique avec des garanties de sécurité mathématiques.",
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 Stockage sans propriétaire',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    'Le caractère aléatoire cryptographique supprime la responsabilité du stockage — aucun bloc individuel ne contient de contenu identifiable',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ Économe en énergie',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    'Pas de minage par preuve de travail inutile — tout le calcul sert un objectif utile',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 Décentralisé',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    "Distribué à travers le réseau — stockage P2P de type IPFS exploitant l'espace inutilisé des appareils personnels",
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 Anonyme mais responsable',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    'Confidentialité avec capacités de modération — anonymat par intermédiation via consensus de quorum',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ Vote homomorphe',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    'Élections préservant la confidentialité avec un dépouillement qui ne révèle jamais les votes individuels',
  [ShowcaseStrings.Comp_VP_Quorum_Title]: '🔒 Gouvernance par quorum',
  [ShowcaseStrings.Comp_VP_Quorum_Desc]:
    'Prise de décision démocratique avec des seuils configurables et une sécurité mathématique',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 Développez avec BrightStack',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node — remplacez MongoDB par BrightDB, gardez tout le reste',
  [ShowcaseStrings.Comp_ProjectPage]: 'Page du projet',

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: 'Démo',
  [ShowcaseStrings.Demo_Title_Demo]: 'interactive',
  [ShowcaseStrings.Demo_Subtitle]:
    'Visualisation des capacités de chiffrement ECIES',
  [ShowcaseStrings.Demo_Disclaimer]:
    "Note : Cette visualisation utilise @digitaldefiance/ecies-lib (la bibliothèque navigateur) à des fins de démonstration. @digitaldefiance/node-ecies-lib offre des fonctionnalités identiques avec la même API pour les applications serveur Node.js. Les deux bibliothèques sont compatibles au niveau binaire : les données chiffrées par l'une peuvent être déchiffrées par l'autre.",
  [ShowcaseStrings.Demo_Alice_Title]: 'Alice (Expéditrice)',
  [ShowcaseStrings.Demo_Alice_PublicKey]: 'Clé publique :',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: 'Message à chiffrer :',
  [ShowcaseStrings.Demo_Alice_Placeholder]: 'Saisissez un message secret...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: 'Chiffrement en cours...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Chiffrer pour Bob',
  [ShowcaseStrings.Demo_Bob_Title]: 'Bob (Destinataire)',
  [ShowcaseStrings.Demo_Bob_PublicKey]: 'Clé publique :',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: 'Données chiffrées :',
  [ShowcaseStrings.Demo_Bob_Decrypting]: 'Déchiffrement en cours...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'Déchiffrer le message',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: 'Message déchiffré :',
  [ShowcaseStrings.Demo_Error]: 'Erreur :',

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: 'Conçu avec',
  [ShowcaseStrings.About_Title_By]: 'par Digital Defiance',
  [ShowcaseStrings.About_Subtitle]:
    "Innovation open source dans l'infrastructure décentralisée",
  [ShowcaseStrings.About_Vision_Title]: 'Notre vision',
  [ShowcaseStrings.About_Vision_P1]:
    "Chez Digital Defiance, nous croyons qu'il faut donner aux individus et aux organisations une infrastructure véritablement décentralisée qui respecte la vie privée, favorise la durabilité et permet la participation démocratique.",
  [ShowcaseStrings.About_Vision_P2]:
    "BrightChain révolutionne le stockage de données grâce au concept de « Bright Block Soup ». Vos fichiers sont découpés en blocs et mélangés avec des données aléatoires via des opérations XOR, les rendant totalement aléatoires en apparence tout en maintenant une sécurité parfaite. En éliminant le gaspillage du minage, en monétisant le stockage inutilisé et en implémentant des fonctionnalités comme le vote homomorphe et l'anonymat par intermédiation, nous avons créé une plateforme qui fonctionne pour tous.",
  [ShowcaseStrings.About_Vision_NotCrypto]:
    "Pas une cryptomonnaie. Quand vous entendez « blockchain », vous pensez probablement Bitcoin. BrightChain n'a pas de monnaie, pas de preuve de travail et pas de minage. Au lieu de brûler de l'énergie pour frapper des jetons, BrightChain valorise les contributions réelles en stockage et en calcul. Ces contributions sont mesurées dans une unité appelée le Joule, liée aux coûts énergétiques réels par formule — pas à la spéculation du marché. Vous ne pouvez ni miner ni échanger des Joules ; ils reflètent les coûts réels des ressources, et nous affinons cette formule au fil du temps.",
  [ShowcaseStrings.About_Vision_StorageDensity]:
    "L'avantage de la densité de stockage vs. puissance : Toute blockchain a du gaspillage quelque part. BrightChain réduit le gaspillage autant que possible, mais comporte une certaine surcharge liée à son mécanisme de stockage. Cependant, le stockage est l'un des domaines les plus rentables et où nous avons atteint une densité massive ces dernières années, alors que les centres de données peinent à atteindre la densité de puissance nécessaire pour les besoins CPU des blockchains et de l'IA. Le compromis d'une surcharge de stockage minimale en échange de l'anonymat et de l'absence de préoccupation concernant les poursuites pour droits d'auteur ou l'hébergement de contenu inapproprié permet à chacun de s'engager pleinement et de tirer le meilleur parti de nos vastes ressources de stockage réparties à travers le monde.",
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStack est le paradigme full-stack pour les applications décentralisées : BrightChain + Express + React + Node. Si vous connaissez la stack MERN, vous connaissez déjà BrightStack — il suffit de remplacer MongoDB par BrightDB.',
  [ShowcaseStrings.About_BrightStack_P2]:
    "BrightDB est une base de données documentaire de type MongoDB sur le système de fichiers sans propriétaire, avec CRUD complet, requêtes, index, transactions et pipelines d'agrégation. Les mêmes patterns que vous utilisez avec MongoDB — collections, find, insert, update — mais chaque document est stocké sous forme de blocs blanchis préservant la confidentialité.",
  [ShowcaseStrings.About_BrightStack_P3]:
    "BrightPass, BrightMail et BrightHub ont tous été construits sur BrightStack, prouvant que le développement d'applications décentralisées peut être aussi simple que le développement full-stack traditionnel.",
  [ShowcaseStrings.About_OpenSource]:
    "100 % Open Source. BrightChain est entièrement open source sous la licence MIT. Construisez vos propres dApps sur BrightStack et contribuez à l'avenir décentralisé.",
  [ShowcaseStrings.About_WorkInProgress]:
    "BrightChain est un travail en cours. Actuellement, nous visons à maintenir le build stable au quotidien, mais des problèmes peuvent passer entre les mailles du filet et BrightChain n'est pas encore mature. Nous nous excusons pour tout inconvénient ou instabilité.",
  [ShowcaseStrings.About_OtherImpl_Title]: 'Autres implémentations',
  [ShowcaseStrings.About_OtherImpl_P1]:
    'Bien que cette implémentation TypeScript/Node.js soit la version principale et la plus aboutie de BrightChain, une bibliothèque C++ avec interface macOS/iOS est en cours de développement. Cette implémentation native apporte les fonctionnalités de confidentialité et de sécurité de BrightChain aux plateformes Apple. Les deux dépôts sont en développement précoce et ne sont pas encore prêts pour la production.',
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: 'Stockage sans propriétaire',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    'Le caractère aléatoire cryptographique supprime la responsabilité du stockage. Aucun bloc individuel ne contient de contenu identifiable, offrant une immunité juridique aux opérateurs de nœuds.',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: 'Économe en énergie',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    'Pas de minage par preuve de travail inutile. Tout le calcul sert un objectif utile — stockage, vérification et opérations réseau.',
  [ShowcaseStrings.About_Feature_Anonymous_Title]: 'Anonyme mais responsable',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    "Confidentialité avec capacités de modération. L'anonymat par intermédiation équilibre vie privée et responsabilité via consensus de quorum.",
  [ShowcaseStrings.About_CTA_Title]: 'Rejoignez la révolution',
  [ShowcaseStrings.About_CTA_Desc]:
    "Aidez-nous à construire l'avenir de l'infrastructure décentralisée. Contribuez à BrightChain, signalez des problèmes ou ajoutez une étoile sur GitHub pour montrer votre soutien à une technologie blockchain durable.",
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 Démo interactive',
  [ShowcaseStrings.About_CTA_LearnMore]: 'En savoir plus',
  [ShowcaseStrings.About_CTA_GitHub]: 'Visitez BrightChain sur GitHub',
  [ShowcaseStrings.About_CTA_Docs]: 'Lire la documentation',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance. Fait avec ❤️ pour la communauté des développeurs.',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]:
    'Initialisation du système de vote cryptographique...',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 Déchiffrement des votes...',
  [ShowcaseStrings.Vote_LoadingDemo]: 'Chargement de la démo de vote...',
  [ShowcaseStrings.Vote_RunAnotherElection]: 'Lancer une autre élection',
  [ShowcaseStrings.Vote_StartElection]: "🎯 Lancer l'élection !",
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 Démo {METHOD}',
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    'Cette méthode de vote est entièrement implémentée dans la bibliothèque.',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 Citoyens votant ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    'Votes exprimés ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ A voté pour {CHOICE}',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 Résultats',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} votes ({PERCENT} %)',
  [ShowcaseStrings.Vote_ApprovalsTemplate]:
    '{COUNT} approbations ({PERCENT} %)',
  [ShowcaseStrings.Vote_ShowAuditLog]: "🔍 Afficher le journal d'audit",
  [ShowcaseStrings.Vote_HideAuditLog]: "🔍 Masquer le journal d'audit",
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 Afficher le journal des événements',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 Masquer le journal des événements',
  [ShowcaseStrings.Vote_AuditLogTitle]:
    "🔒 Journal d'audit immuable (Exigence 1.1)",
  [ShowcaseStrings.Vote_AuditLogDesc]:
    "Piste d'audit signée cryptographiquement et chaînée par hachage",
  [ShowcaseStrings.Vote_ChainIntegrity]: 'Intégrité de la chaîne :',
  [ShowcaseStrings.Vote_ChainValid]: '✅ Valide',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ Compromise',
  [ShowcaseStrings.Vote_EventLogTitle]:
    '📊 Journal des événements (Exigence 1.3)',
  [ShowcaseStrings.Vote_EventLogDesc]:
    'Suivi complet des événements avec horodatages à la microseconde et numéros de séquence',
  [ShowcaseStrings.Vote_SequenceIntegrity]: 'Intégrité de la séquence :',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ Valide',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ Lacunes détectées',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: 'Total des événements : {COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: 'Horodatage :',
  [ShowcaseStrings.Vote_VoterToken]: "Jeton de l'électeur :",

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ Système de vote de niveau gouvernemental',
  [ShowcaseStrings.Vote_TitleDesc]:
    "Explorez notre bibliothèque complète de vote cryptographique avec 15 méthodes de vote différentes. Chaque démo présente des cas d'utilisation réels avec un chiffrement homomorphe garantissant la confidentialité du vote.",
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ Chiffrement homomorphe',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 Reçus vérifiables',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ Séparation des rôles',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ tests',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: 'Sélectionner la méthode de vote',
  [ShowcaseStrings.VoteSel_SecureCategory]:
    '✅ Entièrement sécurisé (Tour unique, préservant la confidentialité)',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    '⚠️ Multi-tours (Nécessite un déchiffrement intermédiaire)',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ Non sécurisé (Pas de confidentialité — cas spéciaux uniquement)',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: 'Pluralité',
  [ShowcaseStrings.VoteMethod_Approval]: 'Approbation',
  [ShowcaseStrings.VoteMethod_Weighted]: 'Pondéré',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'Méthode Borda',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: 'Vote par score',
  [ShowcaseStrings.VoteMethod_YesNo]: 'Oui/Non',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: 'Oui/Non/Abstention',
  [ShowcaseStrings.VoteMethod_Supermajority]: 'Supermajorité',
  [ShowcaseStrings.VoteMethod_RankedChoice]: 'Vote par classement (IRV)',
  [ShowcaseStrings.VoteMethod_TwoRound]: 'Deux tours',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: 'Quadratique',
  [ShowcaseStrings.VoteMethod_Consensus]: 'Consensus',
  [ShowcaseStrings.VoteMethod_ConsentBased]: 'Par consentement',

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
    'Les défenseurs des transports poussent pour une nouvelle ligne de métro',
  [ShowcaseStrings.Plur_IntroHousing]:
    'La coalition pour le logement exige des logements abordables pour 500 familles',
  [ShowcaseStrings.Plur_IntroChallenge]:
    "Vous allez voter pour 5 citoyens. Chaque vote est chiffré — même les responsables électoraux ne peuvent pas voir les bulletins individuels avant le dépouillement final. C'est ainsi que les vraies démocraties devraient fonctionner !",
  [ShowcaseStrings.Plur_DemoTitle]:
    '🗳️ Vote à la pluralité — Budget de Riverside City',
  [ShowcaseStrings.Plur_DemoTagline]:
    "🏛️ Un vote par personne. Le plus de voix l'emporte. La démocratie en action !",
  [ShowcaseStrings.Plur_CandidatesTitle]: 'Priorités budgétaires de la ville',
  [ShowcaseStrings.Plur_VoterInstruction]:
    "Cliquez sur une proposition pour exprimer le vote de chaque citoyen. N'oubliez pas : leur choix est chiffré et confidentiel !",
  [ShowcaseStrings.Plur_ClosePollsBtn]:
    '📦 Fermer les bureaux de vote et compter les voix !',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 Le peuple a parlé !',
  [ShowcaseStrings.Plur_ResultsIntro]:
    'Après le déchiffrement de tous les votes, voici ce que Riverside a choisi :',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 Processus de dépouillement',
  [ShowcaseStrings.Plur_TallyExplain]:
    'Chaque vote chiffré a été additionné de manière homomorphe, puis déchiffré pour révéler les totaux :',
  [ShowcaseStrings.Plur_Cand1_Name]: 'Initiative énergie verte',
  [ShowcaseStrings.Plur_Cand1_Desc]:
    "Investir dans les infrastructures d'énergie renouvelable",
  [ShowcaseStrings.Plur_Cand2_Name]: 'Extension des transports en commun',
  [ShowcaseStrings.Plur_Cand2_Desc]:
    'Construire de nouvelles lignes de métro et de bus',
  [ShowcaseStrings.Plur_Cand3_Name]: 'Programme de logements abordables',
  [ShowcaseStrings.Plur_Cand3_Desc]:
    'Subventionner le logement pour les familles à faibles revenus',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: 'La grande décision de TechCorp !',
  [ShowcaseStrings.Appr_IntroStory]:
    "📢 Réunion d'équipe urgente : « Nous devons choisir notre stack technique pour les 5 prochaines années, mais tout le monde a un avis différent ! »",
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'Le CTO a une idée brillante : le Vote par approbation. Au lieu de se battre pour UN seul langage, chacun peut voter pour TOUS les langages avec lesquels il serait content de travailler.',
  [ShowcaseStrings.Appr_IntroStakes]:
    "🤔 Le twist : Vous pouvez approuver autant ou aussi peu que vous voulez. Vous adorez TypeScript ET Python ? Votez pour les deux ! Vous ne faites confiance qu'à Rust ? C'est votre vote !",
  [ShowcaseStrings.Appr_IntroWinner]:
    "🎯 Le gagnant : Le langage qui obtient le plus d'approbations devient le langage principal de l'équipe.",
  [ShowcaseStrings.Appr_IntroChallenge]:
    "C'est ainsi que l'ONU élit son Secrétaire général. Pas de division des votes, pas de jeux stratégiques — juste des préférences honnêtes !",
  [ShowcaseStrings.Appr_StartBtn]: '🚀 Votons !',
  [ShowcaseStrings.Appr_DemoTitle]:
    '✅ Vote par approbation - Sélection du stack TechCorp',
  [ShowcaseStrings.Appr_DemoTagline]:
    "👍 Votez pour TOUS les langages que vous approuvez. Le plus d'approbations gagne !",
  [ShowcaseStrings.Appr_CandidatesTitle]:
    "Langages de programmation préférés de l'équipe",
  [ShowcaseStrings.Appr_Cand1_Desc]: 'Sur-ensemble typé de JavaScript',
  [ShowcaseStrings.Appr_Cand2_Desc]: 'Langage de script polyvalent',
  [ShowcaseStrings.Appr_Cand3_Desc]: 'Langage système sûr en mémoire',
  [ShowcaseStrings.Appr_Cand4_Desc]: 'Langage concurrent rapide',
  [ShowcaseStrings.Appr_Cand5_Desc]: "Plateforme d'entreprise",
  [ShowcaseStrings.Appr_VotersTitle]:
    'Votes exprimés ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Appr_SubmitBtn]: 'Soumettre ({COUNT} sélectionnés)',
  [ShowcaseStrings.Appr_TallyBtn]:
    'Dépouiller les votes et révéler les résultats',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ A voté',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: 'Sélection de la ville hôte olympique !',
  [ShowcaseStrings.Borda_IntroStory]:
    '🌍 Salle du comité du CIO : Cinq nations doivent choisir la prochaine ville hôte olympique. Mais chacun a ses préférences !',
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 Le décompte de Borda attribue des points selon le classement : 1ère place = 3 points, 2ème = 2 points, 3ème = 1 point.',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 Cela récompense les choix consensuels plutôt que les choix polarisants. La ville avec le plus de points au total gagne !',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 Commencer le vote !',
  [ShowcaseStrings.Borda_DemoTitle]:
    "🏆 Décompte de Borda - Sélection de l'hôte olympique",
  [ShowcaseStrings.Borda_DemoTagline]:
    '📊 Classez toutes les villes. Points = consensus !',
  [ShowcaseStrings.Borda_CandidatesTitle]: 'Villes candidates',
  [ShowcaseStrings.Borda_Cand1_Desc]: 'Ville Lumière',
  [ShowcaseStrings.Borda_Cand2_Desc]: 'Soleil Levant',
  [ShowcaseStrings.Borda_Cand3_Desc]: 'Cité des Anges',
  [ShowcaseStrings.Borda_VotersTitle]:
    'Membres du CIO ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ Classé !',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 Compter les points !',
  [ShowcaseStrings.Borda_ResultsTitle]: '🎉 Ville hôte olympique annoncée !',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} points',
  [ShowcaseStrings.Borda_NewVoteBtn]: 'Nouveau vote',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 Démo de messagerie BrightChain',
  [ShowcaseStrings.Msg_Subtitle]:
    'Envoyez des messages stockés sous forme de blocs CBL dans la soup !',
  [ShowcaseStrings.Msg_Initializing]: 'Initialisation...',
  [ShowcaseStrings.Msg_SendTitle]: 'Envoyer un message',
  [ShowcaseStrings.Msg_FromLabel]: 'De :',
  [ShowcaseStrings.Msg_ToLabel]: 'À :',
  [ShowcaseStrings.Msg_Placeholder]: 'Saisissez votre message...',
  [ShowcaseStrings.Msg_SendBtn]: '📤 Envoyer le message',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 Messages ({COUNT})',
  [ShowcaseStrings.Msg_NoMessages]:
    "Aucun message pour l'instant. Envoyez votre premier message ! ✨",
  [ShowcaseStrings.Msg_From]: 'De :',
  [ShowcaseStrings.Msg_To]: 'À :',
  [ShowcaseStrings.Msg_Message]: 'Message :',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Récupérer depuis la Soup',
  [ShowcaseStrings.Msg_SendFailed]: "Échec de l'envoi du message :",
  [ShowcaseStrings.Msg_RetrieveFailed]: 'Échec de la récupération du message :',
  [ShowcaseStrings.Msg_ContentTemplate]: 'Contenu du message : {CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ Registre blockchain',
  [ShowcaseStrings.Ledger_Subtitle]:
    'Un registre en ajout seul, chaîné cryptographiquement, signé numériquement avec une gouvernance basée sur les rôles. Ajoutez des entrées, gérez les signataires et validez la chaîne.',
  [ShowcaseStrings.Ledger_Initializing]:
    'Génération des paires de clés SECP256k1 pour les signataires…',
  [ShowcaseStrings.Ledger_Entries]: 'Entrées',
  [ShowcaseStrings.Ledger_ActiveSigners]: 'Signataires actifs',
  [ShowcaseStrings.Ledger_Admins]: 'Administrateurs',
  [ShowcaseStrings.Ledger_Quorum]: 'Quorum',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 Valider la chaîne',
  [ShowcaseStrings.Ledger_Reset]: '🔄 Réinitialiser',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 Signataire actif',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 Ajouter une entrée',
  [ShowcaseStrings.Ledger_PayloadLabel]: 'Contenu (texte)',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'Saisissez les données…',
  [ShowcaseStrings.Ledger_AppendBtn]: 'Ajouter à la chaîne',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 Signataires autorisés',
  [ShowcaseStrings.Ledger_Suspend]: 'Suspendre',
  [ShowcaseStrings.Ledger_Reactivate]: 'Réactiver',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ Admin',
  [ShowcaseStrings.Ledger_ToWriter]: '→ Rédacteur',
  [ShowcaseStrings.Ledger_Retire]: 'Retirer',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: 'Nom du nouveau signataire',
  [ShowcaseStrings.Ledger_AddSigner]: '+ Ajouter un signataire',
  [ShowcaseStrings.Ledger_EventLog]: '📋 Journal des événements',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ Chaîne',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 Genèse',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ Gouvernance',
  [ShowcaseStrings.Ledger_Data]: '📄 Données',
  [ShowcaseStrings.Ledger_EntryDetails]: "Détails de l'entrée #{SEQ}",
  [ShowcaseStrings.Ledger_Type]: 'Type',
  [ShowcaseStrings.Ledger_Sequence]: 'Séquence',
  [ShowcaseStrings.Ledger_Timestamp]: 'Horodatage',
  [ShowcaseStrings.Ledger_EntryHash]: "Hash de l'entrée",
  [ShowcaseStrings.Ledger_PreviousHash]: 'Hash précédent',
  [ShowcaseStrings.Ledger_NullGenesis]: 'null (genèse)',
  [ShowcaseStrings.Ledger_Signer]: 'Signataire',
  [ShowcaseStrings.Ledger_SignerKey]: 'Clé du signataire',
  [ShowcaseStrings.Ledger_Signature]: 'Signature',
  [ShowcaseStrings.Ledger_PayloadSize]: 'Taille du contenu',
  [ShowcaseStrings.Ledger_Payload]: 'Contenu',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} octets',

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: 'Aller au contenu principal',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: 'Défiler pour explorer',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ Avis de compatibilité du navigateur',
  [ShowcaseStrings.Compat_DismissAriaLabel]: "Fermer l'avertissement",
  [ShowcaseStrings.Compat_BrowserNotice]:
    'Votre navigateur ({BROWSER} {VERSION}) peut ne pas prendre en charge toutes les fonctionnalités de cette démo.',
  [ShowcaseStrings.Compat_CriticalIssues]: 'Problèmes critiques :',
  [ShowcaseStrings.Compat_Warnings]: 'Avertissements :',
  [ShowcaseStrings.Compat_RecommendedActions]: 'Actions recommandées :',
  [ShowcaseStrings.Compat_Recommendation]:
    'Pour une expérience optimale, veuillez utiliser la dernière version de Chrome, Firefox, Safari ou Edge.',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: 'Panneau de débogage',
  [ShowcaseStrings.Debug_OpenTitle]: 'Ouvrir le panneau de débogage',
  [ShowcaseStrings.Debug_CloseTitle]: 'Fermer le panneau de débogage',
  [ShowcaseStrings.Debug_BlockStore]: 'Magasin de blocs',
  [ShowcaseStrings.Debug_SessionId]: 'ID de session :',
  [ShowcaseStrings.Debug_BlockCount]: 'Nombre de blocs :',
  [ShowcaseStrings.Debug_TotalSize]: 'Taille totale :',
  [ShowcaseStrings.Debug_LastOperation]: 'Dernière opération :',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: 'IDs de blocs ({COUNT})',
  [ShowcaseStrings.Debug_ClearSession]: 'Effacer la session',
  [ShowcaseStrings.Debug_AnimationState]: "État de l'animation",
  [ShowcaseStrings.Debug_Playing]: 'En lecture',
  [ShowcaseStrings.Debug_Paused]: 'En pause',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ En lecture',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ En pause',
  [ShowcaseStrings.Debug_Speed]: 'Vitesse :',
  [ShowcaseStrings.Debug_Frame]: 'Image :',
  [ShowcaseStrings.Debug_Sequence]: 'Séquence :',
  [ShowcaseStrings.Debug_Progress]: 'Progression :',
  [ShowcaseStrings.Debug_Performance]: 'Performance',
  [ShowcaseStrings.Debug_FrameRate]: "Fréquence d'images :",
  [ShowcaseStrings.Debug_FrameTime]: "Temps d'image :",
  [ShowcaseStrings.Debug_DroppedFrames]: 'Images perdues :',
  [ShowcaseStrings.Debug_Memory]: 'Mémoire :',
  [ShowcaseStrings.Debug_Sequences]: 'Séquences :',
  [ShowcaseStrings.Debug_Errors]: 'Erreurs :',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 Animation de reconstruction de fichier',
  [ShowcaseStrings.Recon_Subtitle]:
    'Observez comment les blocs sont réassemblés pour reconstituer votre fichier original',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: 'Traitement du CBL',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    'Lecture des métadonnées de la liste de blocs constitutifs',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: 'Sélection des blocs',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    'Identification des blocs requis dans la soup',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'Récupération des blocs',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
    'Collecte des blocs depuis le stockage',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]:
    'Validation des sommes de contrôle',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    "Vérification de l'intégrité des blocs",
  [ShowcaseStrings.Recon_Step_Reassemble]: 'Réassemblage du fichier',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    'Combinaison des blocs et suppression du remplissage',
  [ShowcaseStrings.Recon_Step_DownloadReady]: 'Prêt au téléchargement',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    'Reconstruction du fichier terminée',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 Liste de blocs constitutifs',
  [ShowcaseStrings.Recon_CBLSubtitle]: 'Références de blocs extraites du CBL',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 Blocs ({COUNT})',
  [ShowcaseStrings.Recon_BlocksSubtitle]:
    'Blocs en cours de récupération et de validation',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 Réassemblage du fichier',
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    'Combinaison des blocs et suppression du remplissage',
  [ShowcaseStrings.Recon_Complete]: 'Reconstruction du fichier terminée !',
  [ShowcaseStrings.Recon_ReadyForDownload]:
    'Votre fichier est prêt au téléchargement',
  [ShowcaseStrings.Recon_FileName]: 'Nom du fichier :',
  [ShowcaseStrings.Recon_Size]: 'Taille :',
  [ShowcaseStrings.Recon_Blocks]: 'Blocs :',
  [ShowcaseStrings.Recon_WhatsHappening]: 'Ce qui se passe maintenant',
  [ShowcaseStrings.Recon_TechDetails]: 'Détails techniques :',
  [ShowcaseStrings.Recon_CBLContainsRefs]:
    'Le CBL contient les références de tous les blocs',
  [ShowcaseStrings.Recon_BlockCountTemplate]: 'Nombre de blocs : {COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    'Taille du fichier original : {SIZE} octets',
  [ShowcaseStrings.Recon_BlockSelection]: 'Sélection des blocs :',
  [ShowcaseStrings.Recon_IdentifyingBlocks]:
    'Identification des blocs dans la soup',
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    'Les blocs sont sélectionnés par leurs sommes de contrôle',
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    'Tous les blocs doivent être présents pour la reconstruction',
  [ShowcaseStrings.Recon_ChecksumValidation]:
    'Validation des sommes de contrôle :',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    "Garantit que les blocs n'ont pas été corrompus",
  [ShowcaseStrings.Recon_ComparesChecksums]:
    'Compare la somme de contrôle stockée avec la somme de contrôle calculée',
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    'Des blocs invalides entraîneraient un échec de la reconstruction',
  [ShowcaseStrings.Recon_FileReassembly]: 'Réassemblage du fichier :',
  [ShowcaseStrings.Recon_CombinedInOrder]:
    'Les blocs sont combinés dans le bon ordre',
  [ShowcaseStrings.Recon_PaddingRemoved]:
    'Le remplissage aléatoire est supprimé',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    'Le fichier original est reconstruit octet par octet',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: 'Démo animée BrightChain Block Soup',
  [ShowcaseStrings.Anim_Subtitle]:
    'Découvrez le processus BrightChain avec des animations étape par étape et du contenu éducatif !',
  [ShowcaseStrings.Anim_Initializing]:
    'Initialisation de la démo animée BrightChain...',
  [ShowcaseStrings.Anim_PauseAnimation]: "Mettre l'animation en pause",
  [ShowcaseStrings.Anim_PlayAnimation]: "Lancer l'animation",
  [ShowcaseStrings.Anim_ResetAnimation]: "Réinitialiser l'animation",
  [ShowcaseStrings.Anim_SpeedTemplate]: 'Vitesse : {SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 Moniteur de performance',
  [ShowcaseStrings.Anim_FrameRate]: "Fréquence d'images :",
  [ShowcaseStrings.Anim_FrameTime]: "Temps d'image :",
  [ShowcaseStrings.Anim_DroppedFrames]: 'Images perdues :',
  [ShowcaseStrings.Anim_Memory]: 'Mémoire :',
  [ShowcaseStrings.Anim_Sequences]: 'Séquences :',
  [ShowcaseStrings.Anim_Errors]: 'Erreurs :',
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    'Déposez des fichiers ici ou cliquez pour téléverser',
  [ShowcaseStrings.Anim_ChooseFiles]: 'Choisir des fichiers',
  [ShowcaseStrings.Anim_StorageTemplate]:
    'Stockage Block Soup ({COUNT} fichiers)',
  [ShowcaseStrings.Anim_NoFilesYet]:
    'Aucun fichier stocké pour le moment. Téléversez des fichiers pour voir la magie animée ! ✨',
  [ShowcaseStrings.Anim_RetrieveFile]: 'Récupérer le fichier',
  [ShowcaseStrings.Anim_DownloadCBL]: 'Télécharger le CBL',
  [ShowcaseStrings.Anim_SizeTemplate]:
    'Taille : {SIZE} octets | Blocs : {BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: "Animation d'encodage",
  [ShowcaseStrings.Anim_ReconstructionAnimation]: 'Animation de reconstruction',
  [ShowcaseStrings.Anim_CurrentStep]: 'Étape actuelle',
  [ShowcaseStrings.Anim_DurationTemplate]: 'Durée : {DURATION} ms',
  [ShowcaseStrings.Anim_BlockDetails]: 'Détails du bloc',
  [ShowcaseStrings.Anim_Index]: 'Index :',
  [ShowcaseStrings.Anim_Size]: 'Taille :',
  [ShowcaseStrings.Anim_Id]: 'ID :',
  [ShowcaseStrings.Anim_Stats]: "Statistiques d'animation",
  [ShowcaseStrings.Anim_TotalFiles]: 'Total des fichiers :',
  [ShowcaseStrings.Anim_TotalBlocks]: 'Total des blocs :',
  [ShowcaseStrings.Anim_AnimationSpeed]: "Vitesse d'animation :",
  [ShowcaseStrings.Anim_Session]: 'Session :',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    '(Les données sont effacées au rafraîchissement de la page)',
  [ShowcaseStrings.Anim_WhatsHappening]: 'Ce qui se passe :',
  [ShowcaseStrings.Anim_Duration]: 'Durée :',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'Démo BrightChain',
  [ShowcaseStrings.Soup_Subtitle]:
    'Stockez des fichiers et des messages sous forme de blocs dans la block soup décentralisée. Tout devient de jolies boîtes de conserve colorées !',
  [ShowcaseStrings.Soup_Initializing]:
    'Initialisation de SessionIsolatedBrightChain...',
  [ShowcaseStrings.Soup_StoreInSoup]: 'Stocker des données dans la Block Soup',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 Stocker des fichiers',
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    'Déposez des fichiers ici ou cliquez pour téléverser',
  [ShowcaseStrings.Soup_ChooseFiles]: 'Choisir des fichiers',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 Stocker le CBL dans la soup avec URL magnet',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    'Stocke le CBL dans la block soup en utilisant le blanchiment XOR et génère une URL magnet partageable. Sans cela, vous obtenez le fichier CBL directement.',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 Stocker des messages',
  [ShowcaseStrings.Soup_From]: 'De :',
  [ShowcaseStrings.Soup_To]: 'À :',
  [ShowcaseStrings.Soup_Message]: 'Message :',
  [ShowcaseStrings.Soup_TypeMessage]: 'Saisissez votre message...',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 Envoyer le message dans la Soup',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL stocké dans la Soup',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 Super CBL utilisé',
  [ShowcaseStrings.Soup_HierarchyDepth]: 'Profondeur de hiérarchie :',
  [ShowcaseStrings.Soup_SubCBLs]: 'Sous-CBLs :',
  [ShowcaseStrings.Soup_LargeFileSplit]:
    'Fichier volumineux divisé en structure hiérarchique',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    'Votre CBL a été stocké dans la block soup sous forme de deux composants XOR. Utilisez cette URL magnet pour récupérer le fichier :',
  [ShowcaseStrings.Soup_Component1]: 'Composant 1 :',
  [ShowcaseStrings.Soup_Component2]: 'Composant 2 :',
  [ShowcaseStrings.Soup_Copy]: '📋 Copier',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Récupérer depuis la Soup',
  [ShowcaseStrings.Soup_UploadCBLFile]: 'Téléverser un fichier CBL',
  [ShowcaseStrings.Soup_UseMagnetURL]: 'Utiliser une URL Magnet',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    'Téléversez un fichier .cbl pour reconstruire le fichier original depuis la block soup. Les blocs doivent déjà être dans la soup pour que la reconstruction fonctionne.',
  [ShowcaseStrings.Soup_ChooseCBLFile]: 'Choisir un fichier CBL',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    "Collez une URL magnet pour récupérer le fichier. L'URL magnet référence les composants CBL blanchis stockés dans la soup.",
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: 'Charger',
  [ShowcaseStrings.Soup_MessagePassing]: 'Transmission de messages',
  [ShowcaseStrings.Soup_HideMessagePanel]: 'Masquer le panneau de messages',
  [ShowcaseStrings.Soup_ShowMessagePanel]: 'Afficher le panneau de messages',
  [ShowcaseStrings.Soup_SendMessage]: 'Envoyer le message',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 Messages ({COUNT})',
  [ShowcaseStrings.Soup_NoMessagesYet]:
    "Aucun message pour l'instant. Envoyez votre premier message ! ✨",
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Récupérer depuis la Soup',
  [ShowcaseStrings.Soup_StoredMessages]: 'Messages stockés',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]: 'Fichiers et messages stockés',
  [ShowcaseStrings.Soup_RemoveFromList]: 'Retirer de la liste',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    'Retirer « {NAME} » de la liste ? (Les blocs resteront dans la soup)',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 Récupérer le fichier',
  [ShowcaseStrings.Soup_DownloadCBL]: 'Télécharger le CBL',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 Récupérer le message',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 URL Magnet',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    'URL magnet du CBL blanchi (utilisez « Utiliser une URL Magnet » pour récupérer)',
  [ShowcaseStrings.Soup_ProcessingSteps]: 'Étapes de traitement',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'Étapes de stockage du CBL',
  [ShowcaseStrings.Soup_BlockDetails]: 'Détails du bloc',
  [ShowcaseStrings.Soup_Index]: 'Index :',
  [ShowcaseStrings.Soup_Size]: 'Taille :',
  [ShowcaseStrings.Soup_Id]: 'ID :',
  [ShowcaseStrings.Soup_Color]: 'Couleur :',
  [ShowcaseStrings.Soup_SoupStats]: 'Statistiques de la Soup',
  [ShowcaseStrings.Soup_TotalFiles]: 'Total des fichiers :',
  [ShowcaseStrings.Soup_TotalBlocks]: 'Total des blocs :',
  [ShowcaseStrings.Soup_BlockSize]: 'Taille de bloc :',
  [ShowcaseStrings.Soup_SessionDebug]: 'Débogage de session',
  [ShowcaseStrings.Soup_SessionId]: 'ID de session :',
  [ShowcaseStrings.Soup_BlocksInMemory]: 'Blocs en mémoire :',
  [ShowcaseStrings.Soup_BlockIds]: 'IDs de blocs :',
  [ShowcaseStrings.Soup_ClearSession]: 'Effacer la session',
  [ShowcaseStrings.Soup_Session]: 'Session :',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    '(Les données sont effacées au rafraîchissement de la page)',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]:
    'Sélectionnez un fichier pour mettre en surbrillance ses blocs :',
  [ShowcaseStrings.ESV_BlockSoup]: 'Soupe de blocs',
  [ShowcaseStrings.ESV_ShowingConnections]: 'Affichage des connexions pour :',
  [ShowcaseStrings.ESV_EmptySoup]: 'Soupe vide',
  [ShowcaseStrings.ESV_EmptySoupHint]:
    'Téléchargez des fichiers pour les voir transformés en boîtes de soupe colorées !',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} blocs • {size} octets',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]:
    'Soirée des prix des critiques de cinéma !',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    'Trois films sont nominés pour le meilleur film. Les critiques doivent noter chacun indépendamment.',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    'Notez chaque film de 0 à 10. Vous en adorez un, vous en détestez un autre ? Notez-les honnêtement ! La meilleure moyenne gagne.',
  [ShowcaseStrings.Score_IntroChallenge]:
    "Contrairement au classement, vous pouvez donner des notes élevées à plusieurs films s'ils sont tous excellents !",
  [ShowcaseStrings.Score_StartBtn]: '🎬 Commencer les notes !',
  [ShowcaseStrings.Score_DemoTitle]: '⭐ Vote par score - Meilleur film',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 Notez chaque film de 0 à 10. La meilleure moyenne gagne !',
  [ShowcaseStrings.Score_NominatedFilms]: 'Films nominés',
  [ShowcaseStrings.Score_Genre_SciFi]: 'Épopée de science-fiction',
  [ShowcaseStrings.Score_Genre_Romance]: 'Drame romantique',
  [ShowcaseStrings.Score_Genre_Thriller]: 'Thriller technologique',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 Notes de {VOTER}',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - Terrible',
  [ShowcaseStrings.Score_Label_Average]: '5 - Moyen',
  [ShowcaseStrings.Score_Label_Masterpiece]: "10 - Chef-d'œuvre",
  [ShowcaseStrings.Score_SubmitTemplate]:
    'Soumettre les notes ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 Chiffrement...',
  [ShowcaseStrings.Score_EncryptingVote]: 'Chiffrement du vote...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 Critiques ayant noté : {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 Calculer les moyennes !',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 Et le gagnant est...',
  [ShowcaseStrings.Score_TallyTitle]: '📊 Processus de calcul des moyennes',
  [ShowcaseStrings.Score_TallyExplain]:
    'Les scores de chaque film ont été additionnés et divisés par {COUNT} critiques :',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 de moyenne',
  [ShowcaseStrings.Score_ResetBtn]: 'Nouvelle cérémonie',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]:
    'Drame en salle de conseil chez StartupCo !',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    "C'est l'assemblée annuelle des actionnaires. L'entreprise vaut 100 M$ et tout le monde veut avoir son mot à dire.",
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    'Tous les votes ne sont pas égaux. Le fonds de capital-risque détient 45 % des parts. Les fondateurs détiennent 30 % et 15 %. Les employés et les investisseurs providentiels détiennent le reste.',
  [ShowcaseStrings.Weight_StakeExpand]:
    'Énorme potentiel de croissance, mais risqué',
  [ShowcaseStrings.Weight_StakeAcquire]:
    'Éliminer la concurrence, mais coûteux',
  [ShowcaseStrings.Weight_StakeIPO]:
    "L'introduction en bourse signifie liquidité, mais aussi surveillance",
  [ShowcaseStrings.Weight_IntroChallenge]:
    "Chaque vote est pondéré par les parts détenues. Le vote du fonds de capital-risque compte 18 fois plus que celui de l'investisseur providentiel. C'est la démocratie d'entreprise !",
  [ShowcaseStrings.Weight_StartBtn]: '📄 Entrer dans la salle de conseil',
  [ShowcaseStrings.Weight_DemoTitle]:
    "⚖️ Vote pondéré - Conseil d'administration de StartupCo",
  [ShowcaseStrings.Weight_DemoTagline]:
    "💰 Vos parts = Votre pouvoir de vote. Bienvenue dans la gouvernance d'entreprise !",
  [ShowcaseStrings.Weight_ProposalsTitle]: 'Propositions stratégiques',
  [ShowcaseStrings.Weight_Proposal1_Desc]:
    'Ouvrir des bureaux à Tokyo et Singapour',
  [ShowcaseStrings.Weight_Proposal2_Desc]: 'Fusionner avec TechStartup Inc.',
  [ShowcaseStrings.Weight_Proposal3_Desc]:
    'Entrer en bourse au NASDAQ le trimestre prochain',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    'Actionnaires ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} parts ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ A voté pour {EMOJI} {NAME}',
  [ShowcaseStrings.Weight_TallyBtn]: 'Décompte des votes pondérés',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 Résultats (par poids des parts)',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} parts ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 La proposition gagnante a reçu {PERCENT}% du total des parts',
  [ShowcaseStrings.Weight_ResetBtn]: 'Nouveau vote',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: 'Référendum national !',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ La question : « Notre pays devrait-il adopter la semaine de 4 jours ? »',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 Référendum Oui/Non : La forme la plus simple de démocratie. Une question, deux choix, la majorité décide.',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ Campagne OUI : Meilleur équilibre vie pro/perso, productivité accrue, citoyens plus heureux !',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ Campagne NON : Risque économique, perturbation des entreprises, politique non testée !',
  [ShowcaseStrings.YN_IntroChallenge]:
    "🗳️ Utilisé pour le Brexit, l'indépendance écossaise et les changements constitutionnels dans le monde.",
  [ShowcaseStrings.YN_StartBtn]: '🗳️ Votez maintenant !',
  [ShowcaseStrings.YN_DemoTitle]: '👍 Référendum Oui/Non - Semaine de 4 jours',
  [ShowcaseStrings.YN_DemoTagline]:
    '🗳️ Une question. Deux choix. La démocratie décide.',
  [ShowcaseStrings.YN_ReferendumQuestion]:
    'Devrions-nous adopter la semaine de 4 jours ?',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    'Citoyens votants ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.YN_VotedYes]: '✓ A voté 👍 OUI',
  [ShowcaseStrings.YN_VotedNo]: '✓ A voté 👎 NON',
  [ShowcaseStrings.YN_BtnYes]: '👍 OUI',
  [ShowcaseStrings.YN_BtnNo]: '👎 NON',
  [ShowcaseStrings.YN_TallyBtn]: '📊 Compter les votes !',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 Résultats du référendum !',
  [ShowcaseStrings.YN_LabelYes]: 'OUI',
  [ShowcaseStrings.YN_LabelNo]: 'NON',
  [ShowcaseStrings.YN_MotionPasses]: '✅ La motion est ADOPTÉE !',
  [ShowcaseStrings.YN_MotionFails]: '❌ La motion est REJETÉE !',
  [ShowcaseStrings.YN_OutcomePass]:
    'Le peuple a parlé : Nous adoptons la semaine de 4 jours !',
  [ShowcaseStrings.YN_OutcomeFail]:
    'Le peuple a parlé : Nous gardons la semaine de 5 jours.',
  [ShowcaseStrings.YN_ResetBtn]: 'Nouveau référendum',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]:
    "Résolution du Conseil de sécurité de l'ONU !",
  [ShowcaseStrings.YNA_IntroResolution]:
    "🌍 La résolution : « L'ONU devrait-elle imposer des sanctions au Pays X pour violations des droits de l'homme ? »",
  [ShowcaseStrings.YNA_IntroStory]:
    "🤷 Oui/Non/Abstention : Parfois on n'est pas prêt à décider. Les abstentions ne comptent pas dans le total mais sont enregistrées.",
  [ShowcaseStrings.YNA_IntroYes]:
    '✅ OUI : Imposer des sanctions immédiatement',
  [ShowcaseStrings.YNA_IntroNo]: '❌ NON : Rejeter la résolution',
  [ShowcaseStrings.YNA_IntroAbstain]:
    '🤷 ABSTENTION : Neutre - ne veut pas prendre parti',
  [ShowcaseStrings.YNA_IntroChallenge]:
    "🏛️ Utilisé dans les votes de l'ONU, les procédures parlementaires et les réunions de conseil dans le monde.",
  [ShowcaseStrings.YNA_StartBtn]: '🌎 Voter !',
  [ShowcaseStrings.YNA_DemoTitle]:
    "🤷 Oui/Non/Abstention - Résolution de l'ONU",
  [ShowcaseStrings.YNA_DemoTagline]:
    "🌍 Trois choix : Soutenir, S'opposer ou Rester neutre",
  [ShowcaseStrings.YNA_ReferendumQuestion]: 'Imposer des sanctions au Pays X ?',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    'Membres du Conseil de sécurité ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 OUI',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 NON',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 ABSTENTION',
  [ShowcaseStrings.YNA_BtnYes]: '👍 OUI',
  [ShowcaseStrings.YNA_BtnNo]: '👎 NON',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 ABSTENTION',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 Décompte de la résolution !',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 Résultats de la résolution !',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 Décompte des votes',
  [ShowcaseStrings.YNA_TallyExplain]:
    'Les abstentions sont enregistrées mais ne comptent pas dans la décision. Le gagnant a besoin de la majorité des votes OUI/NON :',
  [ShowcaseStrings.YNA_LabelYes]: 'OUI',
  [ShowcaseStrings.YNA_LabelNo]: 'NON',
  [ShowcaseStrings.YNA_LabelAbstain]: 'ABSTENTION',
  [ShowcaseStrings.YNA_AbstainNote]: 'Non compté dans la décision',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ La résolution est ADOPTÉE !',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ La résolution est REJETÉE !',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    'Votes décisifs : {DECIDING} | Abstentions : {ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: 'Nouvelle résolution',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: "Vote d'amendement constitutionnel !",
  [ShowcaseStrings.Super_IntroStakes]:
    "🏛️ Les enjeux : Modifier la Constitution nécessite plus qu'une simple majorité. Il faut une SUPERMAJORITÉ !",
  [ShowcaseStrings.Super_IntroThreshold]:
    "🎯 Seuil de 2/3 : Au moins 66,67 % doivent voter OUI pour que l'amendement passe. Cela protège contre les changements hâtifs.",
  [ShowcaseStrings.Super_IntroAmendment]:
    "📜 L'amendement : « Ajouter des limites de mandat pour tous les juges fédéraux »",
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ Barre haute : 6 des 9 États doivent ratifier (la majorité simple ne suffit pas !)',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 Utilisé pour les changements constitutionnels, les ratifications de traités et les procès en destitution.',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ Commencer la ratification !',
  [ShowcaseStrings.Super_DemoTitle]:
    '🎯 Supermajorité - Amendement constitutionnel',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 Nécessite {PERCENT}% pour passer ({REQUIRED}/{TOTAL} États)',
  [ShowcaseStrings.Super_TrackerTitle]: '📊 Suivi du seuil en direct',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} OUI',
  [ShowcaseStrings.Super_RequiredTemplate]: '{PERCENT}% requis',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ Actuellement ADOPTÉ ({YES}/{TOTAL} = {PERCENT}%)',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ Actuellement REJETÉ ({YES}/{TOTAL} = {PERCENT}%) - Besoin de {NEED} OUI supplémentaires',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    'Législatures des États ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ RATIFIER',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ REJETER',
  [ShowcaseStrings.Super_BtnRatify]: '✅ RATIFIER',
  [ShowcaseStrings.Super_BtnReject]: '❌ REJETER',
  [ShowcaseStrings.Super_TallyBtn]: '📜 Décompte final !',
  [ShowcaseStrings.Super_ResultsTitle]: "🏛️ Résultats de l'amendement !",
  [ShowcaseStrings.Super_CalcTitle]: '📊 Calcul de la supermajorité',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    'Requis : {REQUIRED}/{TOTAL} États ({PERCENT}%)',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    'Réel : {ACTUAL}/{VOTED} États ({PERCENT}%)',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} RATIFIER',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} REJETER',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ Seuil de {PERCENT}%',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ AMENDEMENT RATIFIÉ !',
  [ShowcaseStrings.Super_AmendmentFails]: "❌ L'AMENDEMENT ÉCHOUE !",
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    "L'amendement passe avec {COUNT} États ({PERCENT}%)",
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    "N'a pas atteint le seuil de {THRESHOLD}%. Seulement {ACTUAL} des {REQUIRED} États requis ont ratifié.",
  [ShowcaseStrings.Super_ResetBtn]: 'Nouvel amendement',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: 'Le Grand Duel Politique !',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ Soirée électorale spéciale : Quatre partis se battent pour le pouvoir. Mais voici le rebondissement - personne ne veut que le vote divisé donne la victoire à son candidat le moins aimé !',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 Le Vote par Classement à la rescousse ! Au lieu de choisir un seul candidat, vous classez TOUS les candidats du préféré au moins aimé.',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    "🔥 Comment ça marche : Si personne n'obtient 50%+ au premier tour, on élimine le dernier et on transfère ses votes aux 2èmes choix des électeurs. On répète jusqu'à ce qu'un candidat gagne !",
  [ShowcaseStrings.RC_IntroWhyCool]:
    "✨ Pourquoi c'est génial : Vous pouvez voter avec votre cœur au 1er tour sans « gaspiller » votre vote. Vos choix de secours entrent en jeu si votre favori est éliminé.",
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 Utilisé en Australie, dans le Maine, en Alaska et à New York ! Regardez le scrutin instantané se dérouler sous vos yeux.',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ Commencer le classement !',
  [ShowcaseStrings.RC_DemoTitle]: '🔄 Vote par Classement - Élection Nationale',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 Classez-les TOUS ! Pas de gâchis, pas de regrets, juste la démocratie.',
  [ShowcaseStrings.RC_PartiesTitle]: 'Partis Politiques',
  [ShowcaseStrings.RC_Cand1_Platform]: 'Santé universelle, action climatique',
  [ShowcaseStrings.RC_Cand2_Platform]:
    'Baisser les impôts, valeurs traditionnelles',
  [ShowcaseStrings.RC_Cand3_Platform]:
    'Liberté individuelle, petit gouvernement',
  [ShowcaseStrings.RC_Cand4_Platform]:
    "Protection de l'environnement, durabilité",
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    'Classez vos préférences ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.RC_VotedBadge]: '✓ A voté',
  [ShowcaseStrings.RC_AddToRanking]: 'Ajouter au classement :',
  [ShowcaseStrings.RC_SubmitBallot]: 'Soumettre le bulletin',
  [ShowcaseStrings.RC_RunInstantRunoff]: 'Lancer le scrutin instantané',
  [ShowcaseStrings.RC_ShowBulletinBoard]: "📜 Afficher le tableau d'affichage",
  [ShowcaseStrings.RC_HideBulletinBoard]: "📜 Masquer le tableau d'affichage",
  [ShowcaseStrings.RC_BulletinBoardTitle]:
    "📜 Tableau d'affichage public (Exigence 1.2)",
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    'Publication transparente des votes en ajout seul avec vérification par arbre de Merkle',
  [ShowcaseStrings.RC_EntryTemplate]: 'Entrée #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: 'Vote chiffré :',
  [ShowcaseStrings.RC_VoterHash]: "Hash de l'électeur :",
  [ShowcaseStrings.RC_Verified]: '✅ Vérifié',
  [ShowcaseStrings.RC_Invalid]: '❌ Invalide',
  [ShowcaseStrings.RC_MerkleTree]: 'Arbre de Merkle :',
  [ShowcaseStrings.RC_MerkleValid]: '✅ Valide',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ Compromis',
  [ShowcaseStrings.RC_TotalEntries]: 'Total des entrées :',
  [ShowcaseStrings.RC_ResultsTitle]: '🏆 Résultats du scrutin instantané',
  [ShowcaseStrings.RC_EliminationRounds]: "Tours d'élimination",
  [ShowcaseStrings.RC_RoundTemplate]: 'Tour {ROUND}',
  [ShowcaseStrings.RC_Eliminated]: 'Éliminé',
  [ShowcaseStrings.RC_Winner]: 'Gagnant !',
  [ShowcaseStrings.RC_FinalWinner]: 'Gagnant final',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]: 'A gagné après {COUNT} tour(s)',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: 'Élection Présidentielle - Deux Tours !',
  [ShowcaseStrings.TR_IntroSystem]:
    "🗳️ Le Système : Quatre candidats s'affrontent. Si personne n'obtient 50%+ au Tour 1, les 2 premiers s'affrontent au Tour 2 !",
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 Pourquoi deux tours ? Garantit que le gagnant a le soutien de la majorité. Utilisé en France, au Brésil et dans de nombreuses élections présidentielles.',
  [ShowcaseStrings.TR_IntroRound1]:
    '📊 Tour 1 : Votez pour votre favori parmi les 4 candidats',
  [ShowcaseStrings.TR_IntroRound2]:
    '🔄 Tour 2 : Si nécessaire, choisissez entre les 2 premiers',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ Cela nécessite un déchiffrement intermédiaire entre les tours - les votes ne sont pas privés entre les tours !',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ Commencer le Tour 1 !',
  [ShowcaseStrings.TR_DemoTitle]:
    '2️⃣ Vote à Deux Tours - Élection Présidentielle',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 Tour 1 : Choisissez votre favori',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 Tour 2 : Scrutin final !',
  [ShowcaseStrings.TR_Round1Candidates]: 'Candidats du Tour 1',
  [ShowcaseStrings.TR_Cand1_Party]: 'Parti Progressiste',
  [ShowcaseStrings.TR_Cand2_Party]: 'Parti Conservateur',
  [ShowcaseStrings.TR_Cand3_Party]: 'Tech en Avant',
  [ShowcaseStrings.TR_Cand4_Party]: 'Coalition pour la Justice',
  [ShowcaseStrings.TR_VotersTemplate]: 'Électeurs ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ A voté pour {EMOJI}',
  [ShowcaseStrings.TR_CountRound1]: '📊 Compter les votes du Tour 1 !',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ Résultats du Tour 1',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 Décompte du premier tour',
  [ShowcaseStrings.TR_Round1TallyExplain]:
    "Vérification si quelqu'un a obtenu 50%+ de majorité...",
  [ShowcaseStrings.TR_AdvanceRound2]: '→ Tour 2',
  [ShowcaseStrings.TR_EliminatedBadge]: 'Éliminé',
  [ShowcaseStrings.TR_NoMajority]:
    '🔄 Pas de majorité ! Ballottage nécessaire !',
  [ShowcaseStrings.TR_TopTwoAdvance]:
    'Les 2 premiers candidats passent au Tour 2 :',
  [ShowcaseStrings.TR_StartRound2]: '▶️ Commencer le ballottage du Tour 2 !',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 Ballottage du Tour 2',
  [ShowcaseStrings.TR_Round1ResultTemplate]: 'Tour 1 : {VOTES} votes',
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    'Vote final ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.TR_FinalCount]: '🏆 Décompte final !',
  [ShowcaseStrings.TR_ElectionWinner]: "🎉 Vainqueur de l'élection !",
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 Décompte final du Tour 2',
  [ShowcaseStrings.TR_Round2TallyExplain]:
    'Duel entre les 2 premiers candidats :',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME} gagne !',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    'A obtenu {VOTES} votes ({PERCENT}%) au ballottage',
  [ShowcaseStrings.TR_NewElection]: 'Nouvelle élection',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]:
    'Vote STAR - Le meilleur des deux mondes !',
  [ShowcaseStrings.STAR_IntroAcronym]:
    '🌟 STAR = Score puis Ballottage Automatique',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ Étape 1 : Notez tous les candidats de 0 à 5 étoiles (comme noter des films !)',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 Étape 2 : Les 2 premiers par score total passent au ballottage automatique. Vos notes déterminent votre préférence !',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 La Magie : Vous pouvez donner des notes élevées à plusieurs candidats, mais le ballottage garantit le soutien de la majorité',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 Exemple : Vous notez Alex=5, Jordan=4, Sam=2, Casey=1. Si Alex et Jordan sont les 2 premiers, votre vote va à Alex !',
  [ShowcaseStrings.STAR_IntroChallenge]:
    "⚠️ Combine l'expressivité du vote par score avec l'exigence de majorité du ballottage !",
  [ShowcaseStrings.STAR_StartBtn]: '⭐ Commencer à noter !',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 Vote STAR - Conseil Municipal',
  [ShowcaseStrings.STAR_DemoTagline]: '⭐ Notez, puis ballottage automatique !',
  [ShowcaseStrings.STAR_CandidatesTitle]: 'Candidats',
  [ShowcaseStrings.STAR_Cand1_Platform]: 'Arts et Culture',
  [ShowcaseStrings.STAR_Cand2_Platform]: 'Environnement',
  [ShowcaseStrings.STAR_Cand3_Platform]: 'Économie',
  [ShowcaseStrings.STAR_Cand4_Platform]: 'Santé',
  [ShowcaseStrings.STAR_RatingsTemplate]: '⭐ Notes de {VOTER} (0-5 étoiles)',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    'Soumettre les notes ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STAR_RunSTAR]: "⭐🔄 Lancer l'algorithme STAR !",
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ Phase 1 : Totaux des scores',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 Addition de tous les scores',
  [ShowcaseStrings.STAR_Phase1TallyExplain]:
    'Recherche des 2 meilleurs candidats par score total...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL} points ({AVG} moy.)',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ Ballottage',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 Phase de ballottage automatique',
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    'Les 2 premiers avancent ! Vérification des préférences en tête-à-tête...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ Lancer le ballottage automatique !',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 Gagnant STAR !',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 Phase 2 : Ballottage automatique',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    'Comparaison de {NAME1} contre {NAME2} selon les préférences des électeurs :',
  [ShowcaseStrings.STAR_VotersPreferred]: 'électeurs ont préféré',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME} gagne !',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    'A remporté le ballottage automatique {WINNER} à {LOSER}',
  [ShowcaseStrings.STAR_NewElection]: 'Nouvelle élection',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: 'VUT - Représentation Proportionnelle !',
  [ShowcaseStrings.STV_IntroGoal]:
    "🏛️ L'Objectif : Élire 3 représentants qui reflètent la diversité des préférences des électeurs !",
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 VUT (Vote Unique Transférable) : Classez les candidats. Les votes se transfèrent quand votre premier choix gagne ou est éliminé.',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 Quota : Il faut {QUOTA} votes pour gagner un siège (quota de Droop : {VOTERS}/(3+1) + 1)',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 Transferts : Les votes excédentaires des gagnants et les votes des candidats éliminés se transfèrent aux préférences suivantes',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 Utilisé en Irlande, au Sénat australien et dans de nombreux conseils municipaux pour une représentation équitable !',
  [ShowcaseStrings.STV_StartBtn]: '📊 Commencer le classement !',
  [ShowcaseStrings.STV_DemoTitle]:
    '📊 VUT - Conseil Municipal ({SEATS} sièges)',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 Quota : {QUOTA} votes nécessaires par siège',
  [ShowcaseStrings.STV_PartiesRunning]: 'Partis en lice',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 Classement de {VOTER}',
  [ShowcaseStrings.STV_RankingInstruction]:
    'Cliquez pour ajouter les candidats par ordre de préférence :',
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    'Soumettre le classement ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 Lancer le décompte VUT !',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ Conseil élu !',
  [ShowcaseStrings.STV_CountingTitle]: '📊 Processus de décompte VUT',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    'Quota : {QUOTA} votes | Sièges : {SEATS}\nLe décompte des premières préférences détermine les premiers gagnants',
  [ShowcaseStrings.STV_QuotaMet]: '(Quota atteint !)',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ ÉLU',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 Représentants élus',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 Ces {COUNT} partis ont chacun atteint le quota de {QUOTA} votes et ont remporté des sièges au conseil !',
  [ShowcaseStrings.STV_NewElection]: 'Nouvelle élection',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]:
    'Vote Quadratique - Allocation Budgétaire !',
  [ShowcaseStrings.Quad_IntroChallenge]:
    "💰 Le Défi : Budget de 1,4 M$, 4 projets. Comment mesurer l'intensité des préférences ?",
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² Vote Quadratique : Chaque vote coûte votes² crédits. 1 vote = 1 crédit, 2 votes = 4 crédits, 3 votes = 9 crédits !',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ MÉTHODE NON SÉCURISÉE : Nécessite des opérations non homomorphes (racine carrée). Les votes individuels sont visibles !',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    "🎯 Pourquoi l'utiliser ? Empêche les électeurs fortunés de dominer. Montre l'intensité des préférences, pas seulement oui/non.",
  [ShowcaseStrings.Quad_IntroUsedIn]:
    "💡 Utilisé à la Chambre du Colorado, la plateforme taïwanaise vTaiwan et des expériences de gouvernance d'entreprise !",
  [ShowcaseStrings.Quad_StartBtn]: "💰 Commencer l'allocation !",
  [ShowcaseStrings.Quad_DemoTitle]: '² Vote Quadratique - Budget Municipal',
  [ShowcaseStrings.Quad_DemoTagline]:
    '💰 100 crédits vocaux. Les votes coûtent votes² !',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ NON SÉCURISÉ : Cette méthode ne peut pas utiliser le chiffrement homomorphe. Les votes sont visibles !',
  [ShowcaseStrings.Quad_BudgetProjects]: 'Projets Budgétaires',
  [ShowcaseStrings.Quad_Proj1_Name]: 'Nouveau Parc',
  [ShowcaseStrings.Quad_Proj1_Desc]: '500 000 $',
  [ShowcaseStrings.Quad_Proj2_Name]: 'Rénovation de la Bibliothèque',
  [ShowcaseStrings.Quad_Proj2_Desc]: '300 000 $',
  [ShowcaseStrings.Quad_Proj3_Name]: 'Centre Communautaire',
  [ShowcaseStrings.Quad_Proj3_Desc]: '400 000 $',
  [ShowcaseStrings.Quad_Proj4_Name]: 'Réparation des Rues',
  [ShowcaseStrings.Quad_Proj4_Desc]: '200 000 $',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 Budget de {VOTER} ({REMAINING} crédits restants)',
  [ShowcaseStrings.Quad_VotesTemplate]: '{VOTES} votes (coûte {COST} crédits)',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    'Le prochain vote coûte {NEXT_COST} crédits (de {CURRENT} à {NEXT_TOTAL})',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    'Coût Total : {USED}/100 crédits',
  [ShowcaseStrings.Quad_SubmitTemplate]:
    "Soumettre l'allocation ({CURRENT}/{TOTAL})",
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 Calculer les Totaux !',
  [ShowcaseStrings.Quad_ResultsTitle]:
    "💰 Résultats de l'Allocation Budgétaire !",
  [ShowcaseStrings.Quad_TallyTitle]: '📊 Totaux des Votes Quadratiques',
  [ShowcaseStrings.Quad_TallyExplain]:
    'Le total des votes (pas les crédits) de chaque projet détermine la priorité de financement :',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: '{TOTAL} votes au total',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 Priorité Maximale',
  [ShowcaseStrings.Quad_ExplanationTitle]:
    '💡 Comment le Vote Quadratique a Fonctionné',
  [ShowcaseStrings.Quad_ExplanationP1]:
    'Le coût quadratique a empêché quiconque de dominer un seul projet. Donner 10 votes coûte 100 crédits (tout votre budget !), mais répartir 5 votes sur 2 projets ne coûte que 50 crédits au total.',
  [ShowcaseStrings.Quad_ExplanationResult]:
    "Résultat : Les projets avec un soutien large et intense l'emportent sur les projets avec un soutien étroit et extrême.",
  [ShowcaseStrings.Quad_ResetBtn]: 'Nouveau Vote Budgétaire',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: 'Prise de Décision par Consensus !',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ Le Scénario : Une petite coopérative doit prendre une décision importante. La voix de chacun compte !',
  [ShowcaseStrings.Cons_IntroConsensus]:
    "🤝 Vote par Consensus : Nécessite 95%+ d'accord. Une ou deux objections peuvent bloquer la proposition.",
  [ShowcaseStrings.Cons_IntroInsecure]:
    "⚠️ MÉTHODE NON SÉCURISÉE : Pas de confidentialité - tout le monde voit qui soutient/s'oppose !",
  [ShowcaseStrings.Cons_IntroWhyUse]:
    "🎯 Pourquoi l'utiliser ? Petits groupes où la confiance et l'unité sont plus importantes que la confidentialité.",
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 Utilisé dans les coopératives, les communautés intentionnelles et les organisations basées sur le consensus !',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 Commencer le Vote !',
  [ShowcaseStrings.Cons_DemoTitle]:
    '🤝 Vote par Consensus - Décision de Coopérative',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    "🎯 Nécessite {PERCENT}% d'accord ({REQUIRED}/{TOTAL} membres)",
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ NON SÉCURISÉ : Pas de confidentialité - tous les votes sont visibles pour construire le consensus !',
  [ShowcaseStrings.Cons_Proposal]:
    'Proposition : Devons-nous investir 50 000 $ dans des panneaux solaires ?',
  [ShowcaseStrings.Cons_ProposalDesc]:
    "C'est une décision financière majeure nécessitant un soutien quasi unanime.",
  [ShowcaseStrings.Cons_TrackerTitle]: '📊 Suivi du Consensus en Direct',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT} Soutien',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ CONSENSUS ATTEINT ({SUPPORT}/{TOTAL})',
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    '❌ Besoin de {NEEDED} de plus pour atteindre le consensus',
  [ShowcaseStrings.Cons_MembersTemplate]:
    'Membres de la Coopérative ({VOTED}/{TOTAL} ont voté)',
  [ShowcaseStrings.Cons_Support]: '✅ Soutien',
  [ShowcaseStrings.Cons_Oppose]: '❌ Opposition',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ Soutenir',
  [ShowcaseStrings.Cons_BtnOppose]: "❌ S'opposer",
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 Vérifier le Consensus !',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 Résultat du Consensus !',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 Décompte Final',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    'Requis : {REQUIRED}/{TOTAL} ({PERCENT}%)',
  [ShowcaseStrings.Cons_ActualTemplate]:
    'Réel : {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT} Soutien',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT} Opposition',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ Seuil de {PERCENT}%',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ CONSENSUS ATTEINT !',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ CONSENSUS ÉCHOUÉ !',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    'La proposition est adoptée avec {COUNT} membres en soutien ({PERCENT}%)',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    "N'a pas atteint le seuil de {THRESHOLD}%. {OPPOSE} membre(s) se sont opposés, bloquant le consensus.",
  [ShowcaseStrings.Cons_FailNote]:
    '💡 Dans la prise de décision par consensus, même une ou deux objections comptent. Le groupe doit répondre aux préoccupations ou modifier la proposition.',
  [ShowcaseStrings.Cons_ResetBtn]: 'Nouvelle Proposition',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]: 'Prise de Décision par Consentement !',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 Sociocratie : Une coopérative de travailleurs doit prendre des décisions avec lesquelles tout le monde peut vivre.',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    "🙋 Basé sur le Consentement : Il ne s'agit pas d'accord - c'est \"pas d'objections fortes\". Pouvez-vous vivre avec ça ?",
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ MÉTHODE NON SÉCURISÉE : Pas de confidentialité - les objections doivent être entendues et traitées !',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 La Question : "Avez-vous une objection de principe qui nuirait à l\'organisation ?"',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    "🌍 Utilisé dans les organisations sociocratiques, l'holacratie et les lieux de travail collaboratifs !",
  [ShowcaseStrings.Consent_StartBtn]: '🙋 Démarrer le Processus !',
  [ShowcaseStrings.Consent_DemoTitle]:
    '🙋 Basé sur le Consentement - Coopérative de Travailleurs',
  [ShowcaseStrings.Consent_DemoTagline]:
    "🤝 Pas d'objections fortes = consentement obtenu",
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ NON SÉCURISÉ : Pas de confidentialité - les objections sont partagées ouvertement pour discussion !',
  [ShowcaseStrings.Consent_ProposalTitle]:
    'Proposition : Mettre en place la semaine de 4 jours à partir du mois prochain',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    'Avez-vous une objection de principe qui nuirait à notre organisation ?',
  [ShowcaseStrings.Consent_ProposalNote]:
    '"Je préfère 5 jours" n\'est pas une objection de principe. "Cela nous mettrait en faillite" en est une.',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ Consentement',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 Objections',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ {COUNT} objection(s) de principe soulevée(s) - la proposition doit être modifiée ou retirée',
  [ShowcaseStrings.Consent_MembersTemplate]:
    'Membres du Cercle ({RESPONDED}/{TOTAL} ont répondu)',
  [ShowcaseStrings.Consent_NoObjection]: "✅ Pas d'Objection",
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 Objection de Principe',
  [ShowcaseStrings.Consent_BtnNoObjection]: "✅ Pas d'Objection",
  [ShowcaseStrings.Consent_BtnObject]: '🚫 Objecter',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}, quelle est votre objection de principe ?',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 Vérifier le Consentement !',
  [ShowcaseStrings.Consent_ResultsTitle]:
    '🙋 Résultat du Processus de Consentement !',
  [ShowcaseStrings.Consent_ConsentCheckTitle]:
    '📊 Vérification du Consentement',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    'Consentement obtenu si zéro objection de principe\nObjections soulevées : {COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: "✅ Pas d'Objections ({COUNT})",
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    'Ces membres peuvent vivre avec la proposition',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
    '🚫 Objections de Principe ({COUNT})',
  [ShowcaseStrings.Consent_ObjectionRaised]: 'Objection soulevée',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ CONSENTEMENT OBTENU !',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 CONSENTEMENT BLOQUÉ !',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    'Les {COUNT} membres ont donné leur consentement (aucune objection de principe). La proposition avance.',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    '{COUNT} objection(s) de principe soulevée(s). Le cercle doit répondre aux préoccupations avant de continuer.',
  [ShowcaseStrings.Consent_NextStepsTitle]:
    '💡 Prochaines Étapes en Sociocratie :',
  [ShowcaseStrings.Consent_NextStep1]: 'Écouter les objections en entier',
  [ShowcaseStrings.Consent_NextStep2]:
    'Modifier la proposition pour répondre aux préoccupations',
  [ShowcaseStrings.Consent_NextStep3]:
    'Re-tester le consentement avec la proposition mise à jour',
  [ShowcaseStrings.Consent_NextStep4]:
    'Si les objections persistent, la proposition est retirée',
  [ShowcaseStrings.Consent_ResetBtn]: 'Nouvelle Proposition',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'Blog BrightChain',
  [ShowcaseStrings.Blog_Subtitle]: 'Réflexions, tutoriels et mises à jour',
  [ShowcaseStrings.Blog_Loading]: 'Chargement des articles...',
  [ShowcaseStrings.Blog_NewPost]: '+ Nouvel Article',
  [ShowcaseStrings.Blog_NoPosts]:
    "Pas encore d'articles de blog. Revenez bientôt !",
  [ShowcaseStrings.Blog_NewBadge]: '✨ Nouveau',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: 'Par {AUTHOR}',
  [ShowcaseStrings.Blog_BackToHome]: "← Retour à l'Accueil",

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

export default ShowcaseFrenchStrings;
