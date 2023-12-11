import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// German translations - Complete
export const ShowcaseGermanStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: 'Startseite',
  [ShowcaseStrings.Nav_SoupDemo]: 'Soup Demo',
  [ShowcaseStrings.Nav_Ledger]: 'Hauptbuch',
  [ShowcaseStrings.Nav_Blog]: 'Blog',
  [ShowcaseStrings.Nav_FAQ]: 'FAQ',
  [ShowcaseStrings.Nav_Docs]: 'Dokumentation',
  [ShowcaseStrings.Nav_Home_Description]: 'Hauptseite',
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    'Interaktive Block-Visualisierung',
  [ShowcaseStrings.Nav_Ledger_Description]:
    'Blockchain-Hauptbuch mit Governance',
  [ShowcaseStrings.Nav_Blog_Description]: 'BrightChain Blog und Updates',
  [ShowcaseStrings.Nav_FAQ_Description]: 'Häufig gestellte Fragen',
  [ShowcaseStrings.Nav_Docs_Description]: 'Projektdokumentation',
  [ShowcaseStrings.Nav_ToggleMenu]: 'Menü umschalten',
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'BrightDB-Logo',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'Top Secret dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChat-Logo',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHub-Logo',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightID-Logo',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMail-Logo',
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'BrightVote-Logo',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPass-Logo',
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: 'Kanarienvogel-Protokoll-Logo',
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: 'Digitaler Burnbag-Logo',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: 'Sprache',
  [ShowcaseStrings.Lang_EN_US]: 'Englisch (USA)',
  [ShowcaseStrings.Lang_EN_GB]: 'Englisch (UK)',
  [ShowcaseStrings.Lang_ES]: 'Spanisch',
  [ShowcaseStrings.Lang_FR]: 'Französisch',
  [ShowcaseStrings.Lang_DE]: 'Deutsch',
  [ShowcaseStrings.Lang_ZH_CN]: 'Chinesisch',
  [ShowcaseStrings.Lang_JA]: 'Japanisch',
  [ShowcaseStrings.Lang_UK]: 'Ukrainisch',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'FAQ-Modus',
  [ShowcaseStrings.FAQ_Gild_Character]: 'Gild-Charakter',
  [ShowcaseStrings.FAQ_Phix_Character]: 'Phix-Charakter',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Zu {MODE} FAQ wechseln',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain Häufige Fragen',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'Das BrightChain Universum',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'Der evolutionäre Nachfolger des Owner-Free FileSystems',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'Lernen Sie die Maskottchen, die Mission und das Ökosystem kennen',
  [ShowcaseStrings.FAQ_Toggle_Technical]: 'Technisch',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Ökosystem',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gild bewacht die Details',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phix enthüllt die Vision',
  [ShowcaseStrings.FAQ_BackToHome]: '← Zurück zur Startseite',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. Was ist BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    'BrightChain ist eine dezentralisierte, hochleistungsfähige „eigentümerfreie" Dateninfrastruktur. Es ist der architektonische Nachfolger des Owner-Free File Systems (OFFSystem), modernisiert für Hardware-Umgebungen von 2026, einschließlich Apple Silicon und NVMe-Speicher.',

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    '2. Wie unterscheidet sich BrightChain vom ursprünglichen OFFSystem?',
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChain ehrt die „eigentümerfreie" Philosophie seines Vorgängers und führt gleichzeitig kritische Modernisierungen ein:',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: 'Optionale Redundanz',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    'Benutzer können anfordern, dass ihre Blöcke mit höherer Haltbarkeit unter Verwendung von Reed-Solomon-Kodierung gespeichert werden.',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
    'Wiederherstellungsleistung',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    'Unter Verwendung von @digitaldefiance/node-rs-accelerate nutzt das System GPU/NPU-Hardware, um Reed-Solomon-Wiederherstellungsoperationen mit Geschwindigkeiten von bis zu 30+ GB/s durchzuführen.',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'Skalierbarkeit',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    'Durch Super-CBLs (Constituent Block Lists) verwendet das System rekursive Indizierung, um effektiv unbegrenzte Dateigrößen mit O(log N) Abrufeffizienz zu unterstützen.',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'Identität',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    'Die Integration von BIP39/32 ermöglicht sichere, mnemonikbasierte Identität und hierarchisch deterministische Schlüsselverwaltung.',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]:
    'Optionale Verschlüsselung',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    'Benutzer können optional ECIES-Verschlüsselung über ihre Daten legen, unter Nutzung des Ethereum-Schlüsselraum/Identitäts-HDKey-Systems.',

  [ShowcaseStrings.FAQ_Tech_Q3_Title]: '3. Wie sind Daten „eigentümerfrei"?',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    'BrightChain verwendet einen mehrschichtigen kryptographischen Ansatz, um sicherzustellen, dass kein einzelner Knoten eine Datei im rechtlichen oder praktischen Sinne „hostet":',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'Die XOR-Basislinie',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    'Jeder Block wird durch einfache XOR-Operationen verarbeitet, wodurch Rohdaten im Ruhezustand von zufälligem Rauschen nicht zu unterscheiden sind.',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'Das Rezept',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    'Um eine Datei zu rekonstruieren, benötigt ein Benutzer das Rezept — die spezifische räumliche Karte der Blockreihenfolge.',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]:
    'Optionale Verschlüsselung',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    'Benutzer können optional ECIES-Verschlüsselung über ihre Daten legen. Ohne das Rezept bleiben die Daten ungeordnet und, falls gewählt, kryptographisch gesperrt.',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    '4. Was ist der „Tupel-Kompromiss" und was bietet er?',
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    'Der „Tupel-Kompromiss" ist das bewusste Gleichgewicht zwischen dem Overhead des „eigentümerfreien" Shardings und den unvergleichlichen rechtlichen und wirtschaftlichen Vorteilen, die es dem Netzwerk bietet.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    'Der rechtliche Vorteil: Glaubhafte Abstreitbarkeit',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    'Durch das Aufteilen von Daten in nahezu zufällige Tupel (Blöcke) durch XOR-Mischung hosten Benutzer, die Speicher beitragen, Daten, die mathematisch von Rauschen nicht zu unterscheiden sind.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    'Das Ergebnis: Da ein einzelner Knoten ohne das „Rezept" keine kohärente Datei rekonstruieren kann, ist es technisch und rechtlich unmöglich zu behaupten, dass ein bestimmter Knotenbetreiber bestimmte Inhalte „hostet" oder „verteilt". Dies bietet die ultimative Schicht glaubhafter Abstreitbarkeit für Teilnehmer.',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    'Der wirtschaftliche Vorteil: Effizienz vs. Proof-of-Work',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    'Obwohl „eigentümerfreies" Sharding einen geringfügigen Speicher-Overhead einführt, ist dieser im Vergleich zu den massiven Energie- und Hardwarekosten traditioneller Proof-of-Work (PoW) oder Proof-of-Stake (PoS) Netzwerke vernachlässigbar.',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    'Das Ergebnis: BrightChain erreicht hochleistungsfähige Datenintegrität, ohne „Joules" für verschwenderische Hashing-Wettbewerbe zu verbrennen. Dies macht das Netzwerk hochgradig wettbewerbsfähig und bietet Niedriglatenz-Leistung zu einem Bruchteil der Kosten älterer Blockchains.',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]:
    'Zusammenfassung des Kompromisses:',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    'Benutzer akzeptieren eine leichte Zunahme der Daten-„Shards" im Austausch für eine haftungsfreie Hosting-Umgebung und eine Ultra-Niedrigkosten-Infrastruktur. Dies macht BrightChain zur praktikabelsten Plattform für dezentralisierten Speicher in stark regulierten oder ressourcenbeschränkten Umgebungen.',

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    '5. Wie unterscheidet sich BrightChain von traditionellen Blockchains?',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    'Technisch gesehen ist BrightChain ein dezentralisierter Block-Store und keine einzelne, monolithische Blockchain. Während traditionelle Blockchains das Hauptbuch sind, bietet BrightChain die zugrunde liegende Infrastruktur, um mehrere hybride Merkle-Baum-Hauptbücher gleichzeitig zu hosten und zu unterstützen. Wir verwenden Block-Verkettung als strukturelle Methode zur Rekonstruktion von Dateien, aber das System ist als hochleistungsfähige Grundlage konzipiert, die viele verschiedene Blockchains und dApps auf einer einheitlichen, „eigentümerfreien" Speicherschicht betreiben kann.',

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. Welche Rolle spielt Reed-Solomon (RS) in BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    'Während XOR die Privatsphäre und den „eigentümerfreien" Status der Daten handhabt, ist Reed-Solomon-Löschkodierung eine optionale Schicht für Wiederherstellbarkeit.',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: 'Redundanz',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    'RS ermöglicht die Rekonstruktion einer Datei, selbst wenn mehrere Hosting-Knoten offline gehen.',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'Der Kompromiss',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    'RS fügt Rechenaufwand und Speicheranforderungen im Vergleich zu einfachem XOR hinzu. Benutzer müssen ihr Redundanzniveau basierend auf der Wichtigkeit der Daten und ihren verfügbaren „Joules" wählen.',

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. Was ist ein „Joule"?',
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    'Ein Joule ist die Rechnungseinheit für Arbeit und Ressourcenverbrauch innerhalb des BrightChain-Ökosystems.',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'Kostenbasis',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    'Jede Aktion — Daten speichern, XOR-Mischung durchführen oder Reed-Solomon-Shards kodieren — hat projizierte Kosten in Joules.',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]:
    'Ressourcenmanagement',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    'Benutzer müssen die Joule-Kosten für hochredundanten Speicher gegen den Wert ihrer Daten abwägen.',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. Wie erhält man Joules?',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    'Joules werden durch ein Arbeit-für-Arbeit-Modell verdient. Benutzer erhalten Joules, indem sie Ressourcen an das Netzwerk zurückgeben:',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'Speicher',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    'Verschlüsselte Blöcke für andere Peers hosten.',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: 'Berechnung',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    'CPU/GPU/NPU-Zyklen bereitstellen, um Kodierungs- oder Wiederherstellungsaufgaben für das Kollektiv durchzuführen.',
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    'Dies stellt sicher, dass das Netzwerk eine selbsttragende Energiewirtschaft bleibt, in der Beitrag gleich Kapazität ist.',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]:
    '9. Wie wird Anonymität aufrechterhalten?',
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    'BrightChain verwendet vermittelte Anonymität.',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'On-Chain',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    'Alle Aktionen sind für das allgemeine Netzwerk anonym.',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: 'Das BrightTrust',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    'Die Identität ist kryptographisch an ein Governance-BrightTrust gebunden. Dies stellt sicher, dass, obwohl die Daten und Aktionen eines Benutzers privat sind, die Gemeinschaft eine „Soziale Schicht" der Verantwortlichkeit über Shamirs Secret Sharing und homomorphe Abstimmung aufrechterhält.',

  [ShowcaseStrings.FAQ_Tech_Q10_Title]:
    '10. Was ist BrightDB und wie funktioniert es?',
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    'BrightDB ist die hochrangige Dokumentenspeicherschicht, die direkt auf dem BrightChain-Block-Store aufgebaut ist. Sie bietet eine strukturierte Möglichkeit, komplexe Datenobjekte ohne zentralen Datenbankserver zu speichern, abzufragen und zu verwalten.',
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: 'Wie es funktioniert',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    'Dokumentenorientierter Speicher',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    'Ähnlich wie NoSQL-Datenbanken speichert BrightDB Daten als „Dokumente", die in verschlüsselte Blöcke aufgeteilt und über das Netzwerk verteilt werden.',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    'Unveränderliche Versionierung',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    'Jede Änderung an einem Dokument wird als neuer Eintrag mit einer kryptographisch überprüfbaren Historie aufgezeichnet.',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    'Dezentralisierte Indizierung',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    'Ein verteiltes Indizierungssystem ermöglicht es Knoten, spezifische Dokumente über das DHT zu finden und zu rekonstruieren, ohne einen zentralen „Master"-Knoten.',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    'BrightTrust-basierter Zugang',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    'Der Zugang zu bestimmten Datenbanken oder Sammlungen kann durch ein BrightTrust gesteuert werden, das kryptographische Genehmigung von autorisierten Unterzeichnern erfordert.',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'Warum es wichtig ist',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    'Die meisten dApps kämpfen, weil sie „schwere" Daten auf zentralisierten Servern speichern. BrightDB hält Daten dezentralisiert, eigentümerfrei und hochleistungsfähig — und ermöglicht wirklich serverlose Anwendungen, die so schnell wie traditionelle Web-Apps, aber so sicher wie eine Blockchain sind.',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    '11. Welche dApps wurden mit BrightChain gestartet?',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChain wurde mit einer Kernsuite von „Bright-Apps" gestartet, die darauf ausgelegt sind, zentralisierte, datensammelnde Dienste durch sichere, souveräne Alternativen zu ersetzen.',
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'BrightChart-Logo',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]:
    'Patienteneigene Krankenakten',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    'Eine elektronische Krankenakte, bei der der Patient die Schlüssel hält. BrightChart speichert FHIR R4-konforme medizinische Daten als verschlüsselte Blöcke auf BrightChain — keine zentrale Datenbank zum Hacken. Patienten gewähren Anbietern granularen Zugang über BrightTrust-Delegation, und jedes Zugriffsereignis wird in einem unveränderlichen Prüfpfad aufgezeichnet. Unterstützt Arzt-, Zahnarzt- und Tierarztpraxen aus einer einzigen Codebasis.',
  [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: 'BrightCal-Logo',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]: 'Gemeinsame und persönliche Kalenderverwaltung',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
    'Ein Kalendersystem, bei dem der Eigentümer die Schlüssel hält. BrightCal ermöglicht sichere, verschlüsselte Terminplanung mit feingranularer Zugriffskontrolle. Ereignisse werden als verschlüsselte Blöcke gespeichert. Alle Kalenderdaten sind unveränderlich und wiederherstellbar, mit Unterstützung für wiederkehrende Ereignisse, Erinnerungen und Integration mit herkömmlichen Kalendersystemen.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: 'Souveräne Kommunikation',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    'Ein vollständig RFC-konformes E-Mail-System, das traditionelles SMTP und dezentralisierten Speicher verbindet. Im Gegensatz zu Standard-E-Mail-Anbietern teilt BrightMail jede Nachricht in den „eigentümerfreien" Block-Store mit Unterstützung für Ende-zu-Ende-verschlüsselte „Dark Mode"-Nachrichten.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
    'Soziales Netzwerk und souveräner Graph',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'Das Konzept',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    'Eine dezentralisierte, zensurresistente Social-Networking-Plattform, die die Fluidität älterer „Feeds" widerspiegelt, ohne die zentrale Überwachung oder algorithmische Manipulation.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: 'Der Unterschied',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    'Jeder Beitrag, jedes „Like" und jede Beziehung wird als unveränderliches, geteiltes Dokument in BrightDB gespeichert. Da es die Joule-Wirtschaft nutzt, gibt es keine Werbung — Benutzer tragen einen Mikrobruchteil an Berechnung oder Speicher bei, um ihre Stimme zu „verstärken" oder die Geschichte ihrer Gemeinschaft zu erhalten.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]:
    'Die Macht der Quoren',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    'Moderation wird nicht von einem „Sicherheitsteam" eines Unternehmens gehandhabt. Stattdessen werden Gemeinschaften von Governance-Quoren regiert. Regeln werden kryptographisch durchgesetzt, und Gemeinschaftsstandards werden über homomorphe Abstimmung abgestimmt, um sicherzustellen, dass der digitale Raum einer Gruppe wirklich „eigentümerfrei" und selbstbestimmt bleibt.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: 'Zero-Knowledge-Tresor',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    'Ein Passwort- und Identitätsmanagementsystem, bei dem Ihr Tresor als verteilte verschlüsselte Blöcke existiert. Der Zugang wird durch Ihre BIP39-Mnemonik gesteuert, und jede Änderung der Anmeldedaten wird über BrightDB versioniert und überprüfbar.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]:
    'Widerstandsfähige Gemeinschaft',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    'Eine Echtzeit-Kommunikationsplattform mit persistenten Kanälen, Sprache und Medienfreigabe. Die Gemeinschaftsgovernance wird über Quoren verwaltet, und GPU-beschleunigte Wiederherstellung stellt sicher, dass der Chat-Verlauf nie verloren geht.',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    'Digitaler Burnbag / Kanarienvogel-Protokoll',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    'Eine spezialisierte Plattform für Dateiaustausch und Verschlüsselung, die für hochsensible Daten konzipiert ist. Sie nutzt „Intelligente Tresore", die so programmiert werden können, dass sie das „Rezept" (die Karte und Schlüssel) dauerhaft vernichten oder es unter überprüfbaren Bedingungen an bestimmte Parteien freigeben — wie ein „Totmannschalter", eine zeitgesteuerte Freigabe oder ein Quorum-Konsens. Es ist das ultimative Werkzeug für Whistleblower, Juristen und alle, die eine garantierte Datenablaufzeit benötigen.',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    '12. Was ist Paillier-Verschlüsselung und wie ermöglicht sie private Abstimmungen?',
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    'Paillier ist ein Public-Key-Verschlüsselungsschema mit einer speziellen Eigenschaft namens additiver Homomorphismus — Sie können verschlüsselte Werte addieren, ohne sie jemals zu entschlüsseln. Wenn Sie eine „1" für Kandidat A verschlüsseln und jemand anderes eine „1" für Kandidat A verschlüsselt, können Sie diese Chiffretexte miteinander multiplizieren und das Ergebnis ist, wenn entschlüsselt, „2". Niemand sieht jemals einen einzelnen Stimmzettel. Im Abstimmungssystem von BrightChain wird jede Stimme mit einem Paillier-Public-Key verschlüsselt, die verschlüsselten Stimmzettel werden homomorph zu einem einzigen Chiffretext pro Kandidat aggregiert, und nur die endgültige Auszählung wird entschlüsselt — nie eine einzelne Stimme. Für zusätzliche Sicherheit kann der Paillier-Private-Key mithilfe von Schwellenwert-Kryptographie auf mehrere Wächter aufgeteilt werden, sodass keine einzelne Partei die Auszählung allein entschlüsseln kann. Dieser Ansatz funktioniert nativ für gängige Abstimmungsmethoden wie Pluralität, Zustimmung und bewertete Abstimmung, bei denen die Auszählung nur Addition ist. Methoden, die Eliminierungsrunden erfordern (wie Rangfolgewahl), benötigen Zwischenentschlüsselungen zwischen den Runden, und einige Methoden (wie quadratische Abstimmung) können überhaupt nicht homomorph durchgeführt werden.',

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. Was macht die Paillier-Brücke?',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    'Die Paillier-Brücke ist eine deterministische Schlüsselableitungskonstruktion, die es Ihnen ermöglicht, Paillier-homomorphe Verschlüsselungsschlüssel direkt aus Ihrem bestehenden ECDH-Schlüsselpaar (Elliptic Curve Diffie-Hellman) abzuleiten. Anstatt zwei separate Schlüsselpaare zu verwalten — eines für Identität/Authentifizierung (ECC) und eines für homomorphe Stimmverschlüsselung (Paillier) — leitet die Brücke Ihr ECDH-Shared-Secret durch HKDF und HMAC-DRBG, um deterministisch die großen Primzahlen zu generieren, die für einen 3072-Bit-Paillier-Schlüssel benötigt werden. Das bedeutet, dass Ihre gesamte kryptographische Identität, einschließlich Ihrer Abstimmungsschlüssel, aus einem einzigen 32-Byte-ECC-Private-Key wiederhergestellt werden kann. Die Brücke ist unidirektional (Sie können einen Paillier-Schlüssel nicht zurück zum EC-Schlüssel umkehren), vollständig deterministisch (gleiche Eingabe ergibt immer gleiche Ausgabe) und erreicht 128-Bit-Sicherheit gemäß NIST-Empfehlungen.',
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    'Lesen Sie unser Paper zum Thema für weitere Informationen.',

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    '14. Ist BrightChain nicht einfach ein weiterer dezentraler Speicher (dWS) wie IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    'Nein. IPFS ist eine „Öffentliche Bibliothek", die für Inhaltsentdeckung und Persistenz konzipiert ist. BrightChain ist ein „Souveräner Tresor". Während IPFS sich auf das Finden von Daten über CIDs konzentriert, konzentriert sich BrightChain auf den Eigentümerfreien Status und Hochgeschwindigkeits-Wiederherstellung. In BrightChain werden Daten so gründlich fragmentiert, dass kein einzelner Knoten „besitzt" oder auch nur „weiß", was er hostet.',

  [ShowcaseStrings.FAQ_Tech_Q15_Title]:
    '15. Wie unterscheidet sich die „Leistung" von IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    'IPFS arbeitet nach dem „Best-Effort"-Prinzip und hat oft hohe Latenz. BrightChain ist für die Apple Silicon (M4 Max) Ära gebaut. Durch die Verwendung von @digitaldefiance/node-rs-accelerate erreichen wir Wiederherstellungsgeschwindigkeiten von 30+ GB/s. Wir „holen" nicht nur Dateien; wir verwenden hardwarebeschleunigtes Reed-Solomon, um Daten aus Fragmenten mit Bus-Geschwindigkeit zu re-materialisieren.',

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    '16. Was ist mit Datenschutz bei BrightChain vs IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    'IPFS ist standardmäßig transparent; wenn Sie den Hash haben, können Sie die Datei sehen. BrightChain verwendet eine XOR-Basislinie. Daten werden funktional „geschreddert" (wie das Digital Burnbag-Logo), bevor sie jemals das Netzwerk berühren. Datenschutz ist kein „Plugin" — es ist der mechanische Zustand der Daten.',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. Wie vergleichen sich die Wirtschaftsmodelle von BrightChain und IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFS verlässt sich auf Filecoin (eine schwere, externe Blockchain) für Anreize. BrightChain verwendet den Joule. Es ist eine „thermische" Rechnungseinheit, die tatsächliche Arbeit (CPU/NPU-Zyklen) und Ressourcenverbrauch misst. Sie ist eingebaut, hat geringen Overhead und ist direkt mit der „Energie" des Netzwerks verbunden.',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 Was ist BrightChain wirklich?',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChain ist Infrastruktur für eine Welt, in der Ihre Daten Ihnen gehören — nicht einer Plattform, nicht einem Unternehmen, nicht irgendjemandem, der zufällig den Server betreibt. Es ist eine dezentralisierte Speicherschicht, in der jede Datei aufgeteilt, gemischt und über das Netzwerk verstreut wird, sodass kein einzelner Knoten jemals Ihre Daten in irgendeinem bedeutsamen Sinne „hostet". Das Ergebnis ist ein System, in dem Privatsphäre keine Funktion ist, die Sie einschalten — es ist der Standardzustand der Architektur. Wir nennen es „eigentümerfrei", weil, sobald Ihre Daten in BrightChain eintreten, niemand die Teile besitzt. Nur Sie haben das Rezept, um sie wieder zusammenzusetzen.',

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]: 'Was ist Digital Burnbag?',
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    'In Geheimdiensten ist ein „Verbrennungsbeutel" ein Behälter für klassifizierte Dokumente, die zur Vernichtung bestimmt sind — Sie werfen sie hinein, und sie werden mit einer überprüfbaren Aufbewahrungskette verbrannt. Digital Burnbag bringt dieses Konzept zu Daten. Wenn Sie Daten in BrightChain umbenennen, verschieben oder zerstören, führt das System einen „Phönix-Zyklus" durch: Es kopiert die Daten in ihren neuen Zustand und verbrennt dann kryptographisch den alten. Nichts wird einfach gelöscht — es wird wiedergeboren. Der alte Zustand ist nachweislich verschwunden, und der neue Zustand ist nachweislich intakt. Dies ist die Produktschicht von BrightChain, wo die Maskottchen Gild und Phix leben und arbeiten.',

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]:
    'Was ist das Kanarienvogel-Protokoll?',
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    'Der Name kommt vom Kanarienvogel in der Kohlenmine — dem Frühwarnsystem, das zwitschert, wenn etwas nicht stimmt. Das Kanarienvogel-Protokoll überwacht Ihre Feeds, Ihre APIs — alles, was einen Herzschlag darüber gibt, ob Sie am Leben sind, ob die Dinge wie geplant verlaufen. Sobald die Dinge nicht nach Plan laufen und Ihr Kanarienvogel stirbt (tut uns leid, Gild!), ist die Datei oder der Ordner erledigt — nachweisbar zerstört. Es funktioniert auch umgekehrt: Melden Sie sich mit einem Zwangscode an, oder richten Sie über einen vorbestimmten Anbieter eine Regel ein, und Ihre Daten können auch unter diesen Bedingungen zerstört werden. Es dreht sich alles um Regeln und Bedingungen. Wenn die Dinge nicht nach Plan laufen, trifft es Gild. Es kann auch die Netzwerkintegrität überwachen, aber sein Kernzweck ist bedingte Zerstörung: Ihre Daten brennen, wenn die Regeln es verlangen. Unser Maskottchen Gild ist die lebende Verkörperung dieses Protokolls: ein goldener Kanarienvogel, der Ihre Daten mit obsessiver Wachsamkeit bewacht. Das bestehende Burnbag/Kanarienvogel-Protokoll-Logo — ein goldener Kanarienvogel mit Flammenschwanz — sind beide Maskottchen in einer Marke. Gild ist der goldene Körper; Phix ist die Flamme.',

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'Lernen Sie die Besetzung kennen',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Volta — Der Funke',
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: 'Die Hochspannungs-Architektin',
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    'Benannt nach Alessandro Volta, dem Erfinder der Batterie, ist Volta ein lebender Funke — ein gezackter, neonblauer geometrischer Fuchs aus reiner, knisternder Elektrizität. Sie ist die Versorgerin: Sie erzeugt und drückt Joules durch das System, begierig darauf, jede Operation mit voller Kraft zu betreiben. Hyperaktiv, großzügig mit Energie und leicht rücksichtslos, findet Volta Energiesparen langweilig. „Du willst 20 Terajoule? Erledigt. Was noch?" In der Benutzeroberfläche knistert sie in der Nähe des Joule-Messgeräts, und bei schweren Operationen glüht sie weißheiß und vibriert vor dem Wunsch auszuführen. Sie repräsentiert das reine, chaotische Potenzial — den Wunsch zu handeln.',
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    'Volta Maskottchen — ein neonblaues geometrisches Fuchs aus Elektrizität',

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ohm — Der Anker',
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: 'Der stoische Mönch des Widerstands',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    'Benannt nach Georg Ohm, der den elektrischen Widerstand definierte, ist Ohm die Bremse zu Voltas Gaspedal. Eine schwere, steinartige Faultier-Schildkröte mit einem leuchtenden Omega-Symbol in seinem Panzer, bewegt er sich langsam und bedächtig. Sein Mantra: „Ohm mani padme ohm." Während Volta wie ein koffeinierter Fuchs herumzischt, sitzt Ohm in einer tiefen, geerdeten Lotusposition, vibriert bei einem perfekten 60Hz-Brummen und zentriert das gesamte System. Er ist ruhig, skeptisch und mit trockenem Witz bewaffnet — der Buchhalter, der tatsächlich die Quittungen liest. Nicht gegen Ausgaben, nur gegen Verschwendung. Wenn die Energieniveaus in den roten Bereich gehen, führt er eine „Resistive Meditation" durch, legt eine schwere Steinpfote auf den Fortschrittsbalken und ändert den Strom von Blau zu einem ruhigen, tiefen Bernstein. Er repräsentiert geerdete Weisheit — die Disziplin, richtig zu handeln.',
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    'Ohm Mascotte — eine schildkröte aus Stein mit einem leuchtenden Omegasymbol',

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Gild — Der Zeuge',
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: 'Der goldene Kanarienvogel-Wächter',
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    'Ein eitler, goldener Kanarienvogel, besessen von seinem makellosen gelben Fell. Gild ist der Wächter — er bewacht Ihre Daten, zwitschert Warnungen und hält die Dinge sicher. Denken Sie an die Duolingo-Eulen-Energie: ermutigend, gelegentlich schuldbewusst machend, aber grundsätzlich auf Ihrer Seite. Der Haken? Gild lebt in einer Kohlenmine. Jede Dateioperation wirbelt Ruß auf, und er wird ständig schmutzig. 50 Dateien hochladen? Er ist mit Asche bedeckt, putzt sich hektisch und murmelt über seine Federn. Sein Rußniveau ist ein passiver Indikator für Systemaktivität — inaktives System bedeutet einen makellosen, selbstgefällig putzenden Gild; starke Nutzung bedeutet einen schmutzigen, wütenden Kanarienvogel. Er ist penibel, dramatisch und leidgeprüft. „Ich habe mich gerade geputzt! Jetzt bin ich ein Schornsteinfeger, weil du Dokumente nicht buchstabieren kannst." Er ist der goldene Körper des Burnbag/Kanarienvogel-Protokoll-Logos — das Logo ohne das Feuer.',
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]:
    'Maskottchen Gild — ein goldener Kanarienvogel-Wächter',

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Phix — Die Wiedergeburt',
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: 'Der Zerstörer-Schöpfer',
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    '„Phix" = „fix" + „phoenix". Gilds böser Zwilling. Gleiche Vogelsilhouette, aber seine Federn glühen glutrot, seine Augen verengen sich wie heiße Kohlen, und er grinst, als würde er das gleich viel zu sehr genießen. Phix ist der Vollstrecker — er verbraucht Joules, um alte Datenzustände zu verbrennen und mit den neuen aufzuerstehen. Wo Gild vom Feuer genervt ist, IST Phix Feuer. Er erscheint bei Umbenennungsoperationen und kanarienausgelösten Kaskaden — allem, wo Daten sterben und wiedergeboren werden. Aber Phix steht auch einfach für pure Zerstörung. Er ist der Pyromane, der mit dem Streichholz dasteht, wann immer Sie bereit sind, etwas abzufackeln, und gerne mithilft. Eine Datei löschen? Phix grinst. Einen Ordner auslöschen? Er brennt schon. Obwohl er diebische Freude an der Zerstörung hat, findet er auch Stolz in der Schöpfung — aus der Asche mit etwas Neuem aufzuerstehen ist sein ganzes Ding. Fröhlich, chaotisch, der Brandstifter in der Feuerwehr, der seinen Job ein bisschen zu sehr liebt. Wenn ein Benutzer eine Umbenennung auslöst, tritt Gild zur Seite und Phix taucht auf — grinsend, glühend, bereit zu brennen. Er ist die Flamme des Burnbag/Kanarienvogel-Protokoll-Logos — das Logo ohne das Gold.',
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    'Phix Maskottchen — ein glutroter Phönix, der böse Zwilling von Gild',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: 'Die Wirtschaft',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ Was sind Joules?',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'Joules sind die Energieeinheit von BrightChain — keine spekulative Kryptowährung, sondern ein Maß für echte Arbeit und Beitrag. Visuell sind sie winzige neonblaue Blitz-Token, die fließen, sich ansammeln und erschöpfen wie Münzen in einem Spiel. Volta erzeugt sie, Ohm reguliert ihren Fluss durch sein Tor, und Operationen verbrauchen sie. Jede Aktion in BrightChain hat Joule-Kosten — von einer nahezu kostenlosen Metadaten-Umbenennung bis zu einer Millionen-Joule-Vollzyklus-Neuverschlüsselung. Benutzer verdienen Joules durch ein Arbeit-für-Arbeit-Modell: Tragen Sie Speicher oder Berechnung zum Netzwerk bei, und Sie verdienen die Kapazität, es zu nutzen. Das Joule-Messgerät in der Benutzeroberfläche zeigt Ihr Energiebudget, mit kleinen Funken, die sichtbar von Volta durch Ohms Tor in Ihre Operationen fließen.',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 Was ist Ruß?',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'Ruß ist die sichtbare Konsequenz jeder Operation — der „CO2-Fußabdruck" Ihrer digitalen Aktionen. Es ist keine Währung, die Sie ausgeben; es sind Kosten, die Sie nicht vermeiden können. Jedes Mal, wenn Phix Daten verbrennt, produziert er Ruß — dunkle Partikel und Rauchwolken, die sich auf Gilds goldenen Federn ansammeln. Je mehr Sie tun, desto schmutziger wird Gild. Leichte Nutzung hinterlässt hier und da einen Fleck; starke Nutzung macht ihn pechschwarz und empört. Ruß repräsentiert Karma im BrightChain-Ökosystem: Jede Aktion hinterlässt eine Spur, und jemand muss sie tragen. In Ohms Worten: „Volta gibt dir die Energie, Phix verwandelt sie in Hitze, und Gild trägt die Konsequenzen. Ich stelle nur sicher, dass wir nicht mehr verschwenden als nötig."',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: 'Das große Ganze',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    '🌐 Wie passt alles zusammen?',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'Das Ökosystem ist ein zweistufiges System. Auf Plattformebene läuft BrightChain auf der Spannung zwischen Volta (dem Ausgeber) und Ohm (dem Sparer), wobei Joules als Energiewährung zwischen ihnen fließen. Auf Produktebene läuft Digital Burnbag auf der Spannung zwischen Phix (dem Zerstörer-Schöpfer) und Gild (dem Wächter), mit Ruß als unvermeidlicher Konsequenz. Wenn eine Burnbag-Operation ausgelöst wird, interagieren alle vier Charaktere: Volta greift nach Joules, Ohm bewertet die Kosten und lässt sie widerwillig durch, Phix fängt die Energie und bricht aus, und Gild wird vom resultierenden Ruß getroffen. Das Kanarienvogel-Protokoll ist der Integritätsfaden, der durch alles läuft — Gilds wachsames Auge, das sicherstellt, dass jede Transformation legitim ist. Das Burnbag/Kanarienvogel-Protokoll-Logo erzählt die Ursprungsgeschichte: Gild und Phix sind derselbe Vogel. Einer ist der Körper, der andere ist das Feuer. Das Logo ist der Moment, in dem sie sich überlappen — der Kanarienvogel, der bereits brennt, der Phönix, der noch nicht vollständig aufgetaucht ist.',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 Woran glaubt BrightChain?',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'Energie wird erhalten. Aktionen haben Konsequenzen. Daten haben Gewicht. Jeder Charakter im BrightChain-Ökosystem entspricht einem tieferen Prinzip: Volta ist der Funke — reines, chaotisches Potenzial und der Wunsch zu handeln. Ohm ist der Anker — geerdete Weisheit und die Disziplin, richtig zu handeln. Joules sind der Fluss — der Geist, der zwischen ihnen fließt. Phix ist die Wiedergeburt — das transformative Feuer am Ende des Weges. Gild ist der Zeuge — derjenige, der den irdischen Ruß unserer Anhaftungen (und unserer Tippfehler) erleidet. Ruß ist das Karma — die sichtbaren Kosten, die nicht vermieden werden können. Zusammen bilden sie einen geschlossenen Kreislauf: Volta liefert die Energie, Ohm stellt sicher, dass sie weise ausgegeben wird, Phix transformiert den Zustand, und Gild trägt das Gewicht. Nichts ist umsonst. Nichts wird verschwendet. Alles hinterlässt eine Spur.',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 Wo kann ich die Maskottchen in Aktion sehen?',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    'Die Maskottchen sind in die gesamte Produkterfahrung eingewoben. Gild erscheint beim Durchsuchen, Hochladen und Teilen von Dateien — sein Rußniveau spiegelt passiv wider, wie viel Aktivität stattfindet. Wenn Sie eine Umbenennungs- oder Zerstörungsoperation auslösen, tritt Gild zur Seite und Phix taucht mit dem [ Phix ]-Button auf: Er glimmt dunkel mit einem schwachen Bernsteinschein, entzündet sich beim Überfahren, fängt Feuer beim Klicken und zeigt einen Fortschrittsbalken im Ofenstil, während Aschepartikel von der Quelle zum Ziel strömen. Volta und Ohm leben im plattformweiten Joule-Messgerät, wobei Volta in der Nähe der Energieanzeige knistert und Ohm bei teuren Operationen eingreift, um seine Resistive Meditation durchzuführen — den Fortschrittsbalken von Neonblau zu einem ruhigen Bernstein ändernd. Ruß sammelt sich während Ihrer Sitzung sichtbar auf Gilds Federn an. Demnächst: Maskottchen-Auftritte auf Fehlerseiten, Ladebildschirmen, Bestätigungsdialogen skaliert nach Operationsschwere, und ja — Merchandise.',

  // Hero Section
  [ShowcaseStrings.Hero_Badge]: '🌟 Die dezentralisierte App-Plattform',
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChain revolutioniert die Datenspeicherung mit dem „Bright Block Soup"-Konzept. Ihre Dateien werden in Blöcke aufgeteilt und mithilfe von XOR-Operationen mit Zufallsdaten gemischt, sodass sie völlig zufällig erscheinen und gleichzeitig perfekte Sicherheit gewährleisten.',
  [ShowcaseStrings.Hero_Description_NotCrypto]: 'Keine Kryptowährung.',
  [ShowcaseStrings.Hero_Description_P2]:
    'Keine Coins, kein Mining, kein Proof of Work. BrightChain schätzt echte Beiträge an Speicher und Rechenleistung, gemessen in Joules — einer Einheit, die an reale Energiekosten gebunden ist, nicht an Marktspekulation.',
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 Eigentümerfreier Speicher • ⚡ Energieeffizient • 🌐 Dezentralisiert • 🎭 Anonym und dennoch rechenschaftspflichtig • 🗳️ Homomorphe Abstimmung • 💾 Speicher statt Rechenleistung',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 Interaktive Demo',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 BrightChain Soup Demo',
  [ShowcaseStrings.Hero_CTA_GitHub]: 'Auf GitHub ansehen',
  [ShowcaseStrings.Hero_CTA_Blog]: 'Blog',

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: 'Revolutionäre',
  [ShowcaseStrings.Comp_Title_Features]: 'Funktionen',
  [ShowcaseStrings.Comp_Title_Capabilities]: '& Fähigkeiten',
  [ShowcaseStrings.Comp_Subtitle]:
    'Die dezentralisierte App-Plattform — fortschrittliche Kryptographie, dezentraler Speicher und demokratische Governance',
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChain revolutioniert die Datenspeicherung mit dem „Bright Block Soup"-Konzept — einer Kombination aus fortschrittlicher Kryptographie, dezentralem Speicher und demokratischer Governance.',
  [ShowcaseStrings.Comp_Intro_P1]:
    'Ihre Dateien werden in Blöcke aufgeteilt und mithilfe von XOR-Operationen mit Zufallsdaten gemischt, sodass sie völlig zufällig erscheinen und gleichzeitig perfekte Sicherheit gewährleisten. Von homomorpher Abstimmung bis hin zu vermittelter Anonymität, von verteilter Dateispeicherung bis hin zu quorumbasierter Governance — BrightChain bietet alles, was für die nächste Generation dezentralisierter Anwendungen benötigt wird.',
  [ShowcaseStrings.Comp_Problem_Title]:
    '❌ Die Probleme traditioneller Blockchains',
  [ShowcaseStrings.Comp_Problem_1]:
    'Massive Energieverschwendung durch Proof-of-Work-Mining',
  [ShowcaseStrings.Comp_Problem_2]:
    'Verschwendete Speicherkapazität auf Milliarden von Geräten',
  [ShowcaseStrings.Comp_Problem_3]:
    'Keine datenschutzwahrenden Abstimmungsmechanismen',
  [ShowcaseStrings.Comp_Problem_4]:
    'Anonymität ohne Rechenschaftspflicht führt zu Missbrauch',
  [ShowcaseStrings.Comp_Problem_5]:
    'Teure On-Chain-Speicherung schränkt Anwendungen ein',
  [ShowcaseStrings.Comp_Problem_6]:
    'Knotenbetreiber tragen die rechtliche Haftung für gespeicherte Inhalte',
  [ShowcaseStrings.Comp_Problem_Result]:
    'Blockchain-Technologie, die umweltschädlich, rechtlich riskant und funktional eingeschränkt ist.',
  [ShowcaseStrings.Comp_Solution_Title]: '✅ Die BrightChain-Lösung',
  [ShowcaseStrings.Comp_Solution_P1]:
    'BrightChain eliminiert Mining-Verschwendung, indem Proof of Work nur zur Drosselung eingesetzt wird, nicht zum Konsens. Das Owner-Free File System bietet rechtliche Immunität, da nur XOR-randomisierte Blöcke gespeichert werden. Homomorphe Abstimmung ermöglicht datenschutzwahrende Wahlen, während vermittelte Anonymität Privatsphäre und Rechenschaftspflicht in Einklang bringt.',
  [ShowcaseStrings.Comp_Solution_P2]:
    'Aufgebaut auf dem Schlüsselraum von Ethereum, aber ohne Proof-of-Work-Einschränkungen entwickelt, monetarisiert BrightChain ungenutzten Speicher auf persönlichen Geräten und schafft ein nachhaltiges P2P-Netzwerk. Das BrightTrust-System bietet demokratische Governance mit mathematischen Sicherheitsgarantien.',
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 Eigentümerfreier Speicher',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    'Kryptographische Zufälligkeit beseitigt die Speicherhaftung — kein einzelner Block enthält identifizierbare Inhalte',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ Energieeffizient',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    'Kein verschwenderisches Proof-of-Work-Mining — alle Berechnungen dienen nützlichen Zwecken',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 Dezentralisiert',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    'Über das Netzwerk verteilt — IPFS-ähnlicher P2P-Speicher, der ungenutzten Platz auf persönlichen Geräten nutzt',
  [ShowcaseStrings.Comp_VP_Anonymous_Title]:
    '🎭 Anonym und dennoch rechenschaftspflichtig',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    'Privatsphäre mit Moderationsmöglichkeiten — vermittelte Anonymität durch BrightTrust-Konsens',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ Homomorphe Abstimmung',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    'Datenschutzwahrende Wahlen mit Stimmenauszählung, die niemals einzelne Stimmen offenlegt',
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 BrightTrust-Governance',
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    'Demokratische Entscheidungsfindung mit konfigurierbaren Schwellenwerten und mathematischer Sicherheit',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 Entwickeln mit BrightStack',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node — tauschen Sie MongoDB gegen BrightDB, behalten Sie alles andere',
  [ShowcaseStrings.Comp_ProjectPage]: 'Projektseite',

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: 'Interaktive',
  [ShowcaseStrings.Demo_Title_Demo]: 'Demo',
  [ShowcaseStrings.Demo_Subtitle]:
    'Visualisierung der ECIES-Verschlüsselungsfähigkeiten',
  [ShowcaseStrings.Demo_Disclaimer]:
    'Hinweis: Diese Visualisierung verwendet @digitaldefiance/ecies-lib (die Browser-Bibliothek) zu Demonstrationszwecken. @digitaldefiance/node-ecies-lib bietet identische Funktionalität mit derselben API für Node.js-Serveranwendungen. Beide Bibliotheken sind binärkompatibel, sodass mit einer verschlüsselte Daten von der anderen entschlüsselt werden können.',
  [ShowcaseStrings.Demo_Alice_Title]: 'Alice (Absenderin)',
  [ShowcaseStrings.Demo_Alice_PublicKey]: 'Öffentlicher Schlüssel:',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: 'Nachricht zum Verschlüsseln:',
  [ShowcaseStrings.Demo_Alice_Placeholder]: 'Geheime Nachricht eingeben...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: 'Verschlüsselt...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Für Bob verschlüsseln',
  [ShowcaseStrings.Demo_Bob_Title]: 'Bob (Empfänger)',
  [ShowcaseStrings.Demo_Bob_PublicKey]: 'Öffentlicher Schlüssel:',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: 'Verschlüsselte Nutzlast:',
  [ShowcaseStrings.Demo_Bob_Decrypting]: 'Entschlüsselt...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'Nachricht entschlüsseln',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: 'Entschlüsselte Nachricht:',
  [ShowcaseStrings.Demo_Error]: 'Fehler:',

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: 'Entwickelt mit',
  [ShowcaseStrings.About_Title_By]: 'von Digital Defiance',
  [ShowcaseStrings.About_Subtitle]:
    'Open-Source-Innovation in dezentralisierter Infrastruktur',
  [ShowcaseStrings.About_Vision_Title]: 'Unsere Vision',
  [ShowcaseStrings.About_Vision_P1]:
    'Bei Digital Defiance glauben wir daran, Einzelpersonen und Organisationen mit wirklich dezentralisierter Infrastruktur zu stärken, die Privatsphäre respektiert, Nachhaltigkeit fördert und demokratische Teilhabe ermöglicht.',
  [ShowcaseStrings.About_Vision_P2]:
    'BrightChain revolutioniert die Datenspeicherung mit dem „Bright Block Soup"-Konzept. Ihre Dateien werden in Blöcke aufgeteilt und mithilfe von XOR-Operationen mit Zufallsdaten gemischt, sodass sie völlig zufällig erscheinen und gleichzeitig perfekte Sicherheit gewährleisten. Durch die Beseitigung von Mining-Verschwendung, die Monetarisierung ungenutzten Speichers und die Implementierung von Funktionen wie homomorpher Abstimmung und vermittelter Anonymität haben wir eine Plattform geschaffen, die für alle funktioniert.',
  [ShowcaseStrings.About_Vision_NotCrypto]:
    'Keine Kryptowährung. Wenn Sie „Blockchain" hören, denken Sie wahrscheinlich an Bitcoin. BrightChain hat keine Währung, kein Proof of Work und kein Mining. Anstatt Energie zu verbrennen, um Coins zu prägen, schätzt BrightChain echte Beiträge an Speicher und Rechenleistung. Diese Beiträge werden in einer Einheit namens Joule erfasst, die durch eine Formel an reale Energiekosten gebunden ist — nicht an Marktspekulation. Man kann Joules weder schürfen noch handeln; sie spiegeln tatsächliche Ressourcenkosten wider, und wir verfeinern diese Formel im Laufe der Zeit.',
  [ShowcaseStrings.About_Vision_StorageDensity]:
    'Der Vorteil von Speicher- vs. Leistungsdichte: Jede Blockchain hat irgendwo Verschwendung. BrightChain reduziert Verschwendung auf jede erdenkliche Weise, hat aber einen gewissen Overhead durch seinen Speichermechanismus. Allerdings ist Speicher einer der Bereiche, der am kosteneffektivsten war und in dem wir in den letzten Jahren massive Dichte erreicht haben, während Rechenzentren Schwierigkeiten haben, die benötigte Leistungsdichte für CPU-Anforderungen von Blockchains und KI zu erreichen. Der Kompromiss aus minimalem Speicher-Overhead für Anonymität und Befreiung von Sorgen über Urheberrechtsklagen und Ähnliches oder das Hosten unangemessener Inhalte ermöglicht es jedem, voll dabei zu sein und das Beste aus unseren riesigen, weltweit verteilten Speicherressourcen herauszuholen.',
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStack ist das Full-Stack-Paradigma für dezentralisierte Apps: BrightChain + Express + React + Node. Wenn Sie den MERN-Stack kennen, kennen Sie bereits BrightStack — tauschen Sie einfach MongoDB gegen BrightDB.',
  [ShowcaseStrings.About_BrightStack_P2]:
    'BrightDB ist eine MongoDB-ähnliche Dokumentendatenbank auf dem Owner-Free Filesystem mit vollem CRUD, Abfragen, Indizes, Transaktionen und Aggregations-Pipelines. Dieselben Muster, die Sie mit MongoDB verwenden — Collections, find, insert, update — aber jedes Dokument wird als datenschutzwahrende, geweißte Blöcke gespeichert.',
  [ShowcaseStrings.About_BrightStack_P3]:
    'BrightPass, BrightMail und BrightHub wurden alle mit BrightStack entwickelt und beweisen, dass dezentralisierte App-Entwicklung genauso einfach sein kann wie traditionelle Full-Stack-Entwicklung.',
  [ShowcaseStrings.About_OpenSource]:
    '100 % Open Source. BrightChain ist vollständig quelloffen unter der MIT-Lizenz. Erstellen Sie Ihre eigenen dApps auf BrightStack und tragen Sie zur dezentralisierten Zukunft bei.',
  [ShowcaseStrings.About_WorkInProgress]:
    'BrightChain befindet sich in aktiver Entwicklung. Derzeit streben wir an, den Build täglich stabil zu halten, aber es kann etwas durchrutschen und BrightChain ist noch nicht ausgereift. Wir entschuldigen uns für etwaige Unannehmlichkeiten oder Instabilitäten.',
  [ShowcaseStrings.About_OtherImpl_Title]: 'Weitere Implementierungen',
  [ShowcaseStrings.About_OtherImpl_P1]:
    'Während diese TypeScript/Node.js-Implementierung die primäre und ausgereifteste Version von BrightChain ist, befindet sich eine parallele C++-Kernbibliothek mit macOS/iOS-Benutzeroberfläche in Entwicklung. Diese native Implementierung bringt die Datenschutz- und Sicherheitsfunktionen von BrightChain auf Apple-Plattformen. Beide Repositories befinden sich in einem frühen Entwicklungsstadium und sind noch nicht für den Produktiveinsatz bereit.',
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'Während diese TypeScript/Node.js-Implementierung die primäre und ausgereifteste Version ist, befindet sich eine ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++-Kernbibliothek',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS-Oberfläche',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    ' in Entwicklung. Diese native Implementierung bringt BrightChains Datenschutz- und Leistungsfähigkeiten direkt auf Apple-Geräte.',
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: 'Eigentümerfreier Speicher',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    'Kryptographische Zufälligkeit beseitigt die Speicherhaftung. Kein einzelner Block enthält identifizierbare Inhalte und bietet so rechtliche Immunität für Knotenbetreiber.',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: 'Energieeffizient',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    'Kein verschwenderisches Proof-of-Work-Mining. Alle Berechnungen dienen nützlichen Zwecken — Speicherung, Verifizierung und Netzwerkoperationen.',
  [ShowcaseStrings.About_Feature_Anonymous_Title]:
    'Anonym und dennoch rechenschaftspflichtig',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    'Privatsphäre mit Moderationsmöglichkeiten. Vermittelte Anonymität bringt Privatsphäre und Rechenschaftspflicht durch BrightTrust-Konsens in Einklang.',
  [ShowcaseStrings.About_CTA_Title]: 'Schließen Sie sich der Revolution an',
  [ShowcaseStrings.About_CTA_Desc]:
    'Helfen Sie uns, die Zukunft der dezentralisierten Infrastruktur aufzubauen. Tragen Sie zu BrightChain bei, melden Sie Probleme oder geben Sie uns einen Stern auf GitHub, um Ihre Unterstützung für nachhaltige Blockchain-Technologie zu zeigen.',
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 Interaktive Demo',
  [ShowcaseStrings.About_CTA_LearnMore]: 'Mehr erfahren',
  [ShowcaseStrings.About_CTA_GitHub]: 'BrightChain auf GitHub besuchen',
  [ShowcaseStrings.About_CTA_Docs]: 'Dokumentation lesen',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance. Mit ❤️ für die Entwickler-Community erstellt.',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]:
    'Kryptographisches Abstimmungssystem wird initialisiert...',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 Stimmen werden entschlüsselt...',
  [ShowcaseStrings.Vote_LoadingDemo]: 'Abstimmungs-Demo wird geladen...',
  [ShowcaseStrings.Vote_RunAnotherElection]: 'Weitere Wahl durchführen',
  [ShowcaseStrings.Vote_StartElection]: '🎯 Wahl starten!',
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 {METHOD} Demo',
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    'Diese Abstimmungsmethode ist vollständig in der Bibliothek implementiert.',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 Bürger stimmen ab ({VOTED}/{TOTAL} haben abgestimmt)',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    'Abgegebene Stimmen ({VOTED}/{TOTAL} abgestimmt)',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ Gestimmt für {CHOICE}',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 Ergebnisse',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} Stimmen ({PERCENT}%)',
  [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT} Zustimmungen ({PERCENT}%)',
  [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 Prüfprotokoll anzeigen',
  [ShowcaseStrings.Vote_HideAuditLog]: '🔍 Prüfprotokoll ausblenden',
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 Ereignisprotokoll anzeigen',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 Ereignisprotokoll ausblenden',
  [ShowcaseStrings.Vote_AuditLogTitle]:
    '🔒 Unveränderliches Prüfprotokoll (Anforderung 1.1)',
  [ShowcaseStrings.Vote_AuditLogDesc]:
    'Kryptographisch signierter, hash-verketteter Prüfpfad',
  [ShowcaseStrings.Vote_ChainIntegrity]: 'Kettenintegrität:',
  [ShowcaseStrings.Vote_ChainValid]: '✅ Gültig',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ Kompromittiert',
  [ShowcaseStrings.Vote_EventLogTitle]:
    '📊 Ereignisprotokoll (Anforderung 1.3)',
  [ShowcaseStrings.Vote_EventLogDesc]:
    'Umfassende Ereignisverfolgung mit Mikrosekunden-Zeitstempeln und Sequenznummern',
  [ShowcaseStrings.Vote_SequenceIntegrity]: 'Sequenzintegrität:',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ Gültig',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ Lücken erkannt',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: 'Ereignisse gesamt: {COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: 'Zeitstempel:',
  [ShowcaseStrings.Vote_VoterToken]: 'Wähler-Token:',

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ Abstimmungssystem auf Regierungsniveau',
  [ShowcaseStrings.Vote_TitleDesc]:
    'Entdecken Sie unsere umfassende kryptographische Abstimmungsbibliothek mit 15 verschiedenen Abstimmungsmethoden. Jede Demo zeigt praxisnahe Anwendungsfälle mit homomorpher Verschlüsselung zum Schutz der Stimmabgabe.',
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ Homomorphe Verschlüsselung',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 Verifizierbare Quittungen',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ Rollentrennung',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ Tests',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: 'Abstimmungsmethode auswählen',
  [ShowcaseStrings.VoteSel_SecureCategory]:
    '✅ Vollständig sicher (Einzelrunde, datenschutzwahrend)',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    '⚠️ Mehrrundig (Erfordert Zwischenentschlüsselung)',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ Unsicher (Kein Datenschutz – nur für Sonderfälle)',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: 'Mehrheitswahl',
  [ShowcaseStrings.VoteMethod_Approval]: 'Zustimmungswahl',
  [ShowcaseStrings.VoteMethod_Weighted]: 'Gewichtete Wahl',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'Borda-Zählung',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: 'Bewertungswahl',
  [ShowcaseStrings.VoteMethod_YesNo]: 'Ja/Nein',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: 'Ja/Nein/Enthaltung',
  [ShowcaseStrings.VoteMethod_Supermajority]: 'Supermehrheit',
  [ShowcaseStrings.VoteMethod_RankedChoice]: 'Rangfolgewahl (IRV)',
  [ShowcaseStrings.VoteMethod_TwoRound]: 'Zwei-Runden-Wahl',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: 'Quadratische Wahl',
  [ShowcaseStrings.VoteMethod_Consensus]: 'Konsenswahl',
  [ShowcaseStrings.VoteMethod_ConsentBased]: 'Einwilligungsbasiert',

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]:
    'Willkommen zur Haushaltswahl der Stadt Riverside!',
  [ShowcaseStrings.Plur_IntroStory]:
    'Der Stadtrat hat 50 Millionen Dollar für ein großes Vorhaben bereitgestellt, kann sich aber nicht einigen, welches Projekt finanziert werden soll. Hier kommen SIE ins Spiel!',
  [ShowcaseStrings.Plur_IntroSituation]:
    'Drei Vorschläge stehen zur Wahl. Jeder hat leidenschaftliche Unterstützer, aber nur EINER kann gewinnen.',
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    'Team Grün will Solarpanele auf jedem öffentlichen Gebäude',
  [ShowcaseStrings.Plur_IntroTransit]:
    'Nahverkehrs-Befürworter setzen sich für eine neue U-Bahn-Linie ein',
  [ShowcaseStrings.Plur_IntroHousing]:
    'Die Wohnungsbau-Koalition fordert bezahlbare Wohnungen für 500 Familien',
  [ShowcaseStrings.Plur_IntroChallenge]:
    'Sie geben Stimmen für 5 Bürger ab. Jede Stimme wird verschlüsselt – nicht einmal die Wahlbeamten können einzelne Stimmzettel vor der endgültigen Auszählung einsehen. So sollte echte Demokratie funktionieren!',
  [ShowcaseStrings.Plur_DemoTitle]:
    '🗳️ Mehrheitswahl – Haushalt der Stadt Riverside',
  [ShowcaseStrings.Plur_DemoTagline]:
    '🏛️ Eine Stimme pro Person. Die meisten Stimmen gewinnen. Demokratie in Aktion!',
  [ShowcaseStrings.Plur_CandidatesTitle]: 'Haushaltsprioritäten der Stadt',
  [ShowcaseStrings.Plur_VoterInstruction]:
    'Klicken Sie auf einen Vorschlag, um die Stimme jedes Bürgers abzugeben. Denken Sie daran: Die Wahl ist verschlüsselt und privat!',
  [ShowcaseStrings.Plur_ClosePollsBtn]:
    '📦 Wahllokale schließen & Stimmen auszählen!',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 Das Volk hat gesprochen!',
  [ShowcaseStrings.Plur_ResultsIntro]:
    'Nach der Entschlüsselung aller Stimmen hat Riverside gewählt:',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 Stimmauszählungsprozess',
  [ShowcaseStrings.Plur_TallyExplain]:
    'Jede verschlüsselte Stimme wurde homomorph addiert und dann entschlüsselt, um die Gesamtzahlen zu ermitteln:',
  [ShowcaseStrings.Plur_Cand1_Name]: 'Grüne-Energie-Initiative',
  [ShowcaseStrings.Plur_Cand1_Desc]:
    'Investition in erneuerbare Energieinfrastruktur',
  [ShowcaseStrings.Plur_Cand2_Name]: 'Ausbau des öffentlichen Nahverkehrs',
  [ShowcaseStrings.Plur_Cand2_Desc]: 'Neue U-Bahn-Linien und Busrouten bauen',
  [ShowcaseStrings.Plur_Cand3_Name]: 'Programm für bezahlbaren Wohnraum',
  [ShowcaseStrings.Plur_Cand3_Desc]:
    'Wohnraum für einkommensschwache Familien subventionieren',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: 'TechCorps große Entscheidung!',
  [ShowcaseStrings.Appr_IntroStory]:
    '📢 Notfall-Teammeeting: „Wir müssen unseren Tech-Stack für die nächsten 5 Jahre auswählen, aber jeder hat eine andere Meinung!"',
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'Der CTO hat eine brillante Idee: Zustimmungswahl. Statt um EINE Sprache zu streiten, kann jeder für ALLE Sprachen stimmen, mit denen er gerne arbeiten würde.',
  [ShowcaseStrings.Appr_IntroStakes]:
    '🤔 Der Clou: Sie können so viele oder so wenige genehmigen, wie Sie möchten. Sie lieben TypeScript UND Python? Stimmen Sie für beide! Sie vertrauen nur Rust? Das ist Ihre Stimme!',
  [ShowcaseStrings.Appr_IntroWinner]:
    '🎯 Der Gewinner: Die Sprache mit den meisten Zustimmungen wird zur Hauptsprache des Teams.',
  [ShowcaseStrings.Appr_IntroChallenge]:
    'So wählt die UN ihren Generalsekretär. Keine Stimmenspaltung, keine strategischen Spiele — nur ehrliche Präferenzen!',
  [ShowcaseStrings.Appr_StartBtn]: '🚀 Lasst uns abstimmen!',
  [ShowcaseStrings.Appr_DemoTitle]:
    '✅ Zustimmungswahl - TechCorp Stack-Auswahl',
  [ShowcaseStrings.Appr_DemoTagline]:
    '👍 Stimmen Sie für ALLE Sprachen, die Sie befürworten. Die meisten Zustimmungen gewinnen!',
  [ShowcaseStrings.Appr_CandidatesTitle]:
    'Bevorzugte Programmiersprachen des Teams',
  [ShowcaseStrings.Appr_Cand1_Desc]: 'Typsichere JavaScript-Erweiterung',
  [ShowcaseStrings.Appr_Cand2_Desc]: 'Vielseitige Skriptsprache',
  [ShowcaseStrings.Appr_Cand3_Desc]: 'Speichersichere Systemsprache',
  [ShowcaseStrings.Appr_Cand4_Desc]: 'Schnelle nebenläufige Sprache',
  [ShowcaseStrings.Appr_Cand5_Desc]: 'Unternehmensplattform',
  [ShowcaseStrings.Appr_VotersTitle]:
    'Stimmen abgeben ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.Appr_SubmitBtn]: 'Absenden ({COUNT} ausgewählt)',
  [ShowcaseStrings.Appr_TallyBtn]: 'Stimmen auszählen & Ergebnisse enthüllen',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ Gewählt',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: 'Auswahl der olympischen Gastgeberstadt!',
  [ShowcaseStrings.Borda_IntroStory]:
    '🌍 IOC-Sitzungssaal: Fünf Nationen müssen die nächste olympische Gastgeberstadt wählen. Aber jeder hat Präferenzen!',
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 Die Borda-Zählung vergibt Punkte nach Rangfolge: 1. Platz = 3 Punkte, 2. = 2 Punkte, 3. = 1 Punkt.',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 Dies belohnt Konsensentscheidungen gegenüber polarisierenden Wahlen. Die Stadt mit den meisten Gesamtpunkten gewinnt!',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 Abstimmung starten!',
  [ShowcaseStrings.Borda_DemoTitle]:
    '🏆 Borda-Zählung - Olympische Gastgeberwahl',
  [ShowcaseStrings.Borda_DemoTagline]:
    '📊 Alle Städte ranken. Punkte = Konsens!',
  [ShowcaseStrings.Borda_CandidatesTitle]: 'Kandidatenstädte',
  [ShowcaseStrings.Borda_Cand1_Desc]: 'Stadt des Lichts',
  [ShowcaseStrings.Borda_Cand2_Desc]: 'Land der aufgehenden Sonne',
  [ShowcaseStrings.Borda_Cand3_Desc]: 'Stadt der Engel',
  [ShowcaseStrings.Borda_VotersTitle]:
    'IOC-Mitglieder ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ Gerankt!',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 Punkte zählen!',
  [ShowcaseStrings.Borda_ResultsTitle]:
    '🎉 Olympische Gastgeberstadt verkündet!',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} Punkte',
  [ShowcaseStrings.Borda_NewVoteBtn]: 'Neue Abstimmung',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 BrightChain Nachrichtenübermittlungs-Demo',
  [ShowcaseStrings.Msg_Subtitle]:
    'Senden Sie Nachrichten, die als CBL-Blöcke in der Soup gespeichert werden!',
  [ShowcaseStrings.Msg_Initializing]: 'Wird initialisiert...',
  [ShowcaseStrings.Msg_SendTitle]: 'Nachricht senden',
  [ShowcaseStrings.Msg_FromLabel]: 'Von:',
  [ShowcaseStrings.Msg_ToLabel]: 'An:',
  [ShowcaseStrings.Msg_Placeholder]: 'Nachricht eingeben...',
  [ShowcaseStrings.Msg_SendBtn]: '📤 Nachricht senden',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 Nachrichten ({COUNT})',
  [ShowcaseStrings.Msg_NoMessages]:
    'Noch keine Nachrichten. Senden Sie Ihre erste Nachricht! ✨',
  [ShowcaseStrings.Msg_From]: 'Von:',
  [ShowcaseStrings.Msg_To]: 'An:',
  [ShowcaseStrings.Msg_Message]: 'Nachricht:',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Aus der Soup abrufen',
  [ShowcaseStrings.Msg_SendFailed]: 'Nachricht konnte nicht gesendet werden:',
  [ShowcaseStrings.Msg_RetrieveFailed]:
    'Nachricht konnte nicht abgerufen werden:',
  [ShowcaseStrings.Msg_ContentTemplate]: 'Nachrichteninhalt: {CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ Blockchain-Hauptbuch',
  [ShowcaseStrings.Ledger_Subtitle]:
    'Ein nur-anhängendes, kryptographisch verkettetes, digital signiertes Hauptbuch mit rollenbasierter Governance. Einträge hinzufügen, Unterzeichner verwalten und die Kette validieren.',
  [ShowcaseStrings.Ledger_Initializing]:
    'SECP256k1-Schlüsselpaare für Unterzeichner werden generiert…',
  [ShowcaseStrings.Ledger_Entries]: 'Einträge',
  [ShowcaseStrings.Ledger_ActiveSigners]: 'Aktive Unterzeichner',
  [ShowcaseStrings.Ledger_Admins]: 'Administratoren',
  [ShowcaseStrings.Ledger_BrightTrust]: 'BrightTrust',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 Kette validieren',
  [ShowcaseStrings.Ledger_Reset]: '🔄 Zurücksetzen',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 Aktiver Unterzeichner',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 Eintrag anhängen',
  [ShowcaseStrings.Ledger_PayloadLabel]: 'Nutzlast (Text)',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'Daten eingeben…',
  [ShowcaseStrings.Ledger_AppendBtn]: 'An Kette anhängen',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 Autorisierte Unterzeichner',
  [ShowcaseStrings.Ledger_Suspend]: 'Sperren',
  [ShowcaseStrings.Ledger_Reactivate]: 'Reaktivieren',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ Admin',
  [ShowcaseStrings.Ledger_ToWriter]: '→ Schreiber',
  [ShowcaseStrings.Ledger_Retire]: 'Stilllegen',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]:
    'Name des neuen Unterzeichners',
  [ShowcaseStrings.Ledger_AddSigner]: '+ Unterzeichner hinzufügen',
  [ShowcaseStrings.Ledger_EventLog]: '📋 Ereignisprotokoll',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ Kette',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 Genesis',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ Governance',
  [ShowcaseStrings.Ledger_Data]: '📄 Daten',
  [ShowcaseStrings.Ledger_EntryDetails]: 'Details zu Eintrag #{SEQ}',
  [ShowcaseStrings.Ledger_Type]: 'Typ',
  [ShowcaseStrings.Ledger_Sequence]: 'Sequenz',
  [ShowcaseStrings.Ledger_Timestamp]: 'Zeitstempel',
  [ShowcaseStrings.Ledger_EntryHash]: 'Eintrags-Hash',
  [ShowcaseStrings.Ledger_PreviousHash]: 'Vorheriger Hash',
  [ShowcaseStrings.Ledger_NullGenesis]: 'null (Genesis)',
  [ShowcaseStrings.Ledger_Signer]: 'Unterzeichner',
  [ShowcaseStrings.Ledger_SignerKey]: 'Unterzeichner-Schlüssel',
  [ShowcaseStrings.Ledger_Signature]: 'Signatur',
  [ShowcaseStrings.Ledger_PayloadSize]: 'Nutzlastgröße',
  [ShowcaseStrings.Ledger_Payload]: 'Nutzlast',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} Bytes',

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: 'Zum Hauptinhalt springen',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: 'Scrollen zum Erkunden',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ Browser-Kompatibilitätshinweis',
  [ShowcaseStrings.Compat_DismissAriaLabel]: 'Warnung schließen',
  [ShowcaseStrings.Compat_BrowserNotice]:
    'Ihr Browser ({BROWSER} {VERSION}) unterstützt möglicherweise nicht alle Funktionen dieser Demo.',
  [ShowcaseStrings.Compat_CriticalIssues]: 'Kritische Probleme:',
  [ShowcaseStrings.Compat_Warnings]: 'Warnungen:',
  [ShowcaseStrings.Compat_RecommendedActions]: 'Empfohlene Maßnahmen:',
  [ShowcaseStrings.Compat_Recommendation]:
    'Für das beste Erlebnis verwenden Sie bitte die neueste Version von Chrome, Firefox, Safari oder Edge.',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: 'Debug-Panel',
  [ShowcaseStrings.Debug_OpenTitle]: 'Debug-Panel öffnen',
  [ShowcaseStrings.Debug_CloseTitle]: 'Debug-Panel schließen',
  [ShowcaseStrings.Debug_BlockStore]: 'Block-Speicher',
  [ShowcaseStrings.Debug_SessionId]: 'Sitzungs-ID:',
  [ShowcaseStrings.Debug_BlockCount]: 'Blockanzahl:',
  [ShowcaseStrings.Debug_TotalSize]: 'Gesamtgröße:',
  [ShowcaseStrings.Debug_LastOperation]: 'Letzte Operation:',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: 'Block-IDs ({COUNT})',
  [ShowcaseStrings.Debug_ClearSession]: 'Sitzung löschen',
  [ShowcaseStrings.Debug_AnimationState]: 'Animationszustand',
  [ShowcaseStrings.Debug_Playing]: 'Wiedergabe',
  [ShowcaseStrings.Debug_Paused]: 'Pausiert',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ Wiedergabe',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ Pausiert',
  [ShowcaseStrings.Debug_Speed]: 'Geschwindigkeit:',
  [ShowcaseStrings.Debug_Frame]: 'Frame:',
  [ShowcaseStrings.Debug_Sequence]: 'Sequenz:',
  [ShowcaseStrings.Debug_Progress]: 'Fortschritt:',
  [ShowcaseStrings.Debug_Performance]: 'Leistung',
  [ShowcaseStrings.Debug_FrameRate]: 'Bildrate:',
  [ShowcaseStrings.Debug_FrameTime]: 'Frame-Zeit:',
  [ShowcaseStrings.Debug_DroppedFrames]: 'Verlorene Frames:',
  [ShowcaseStrings.Debug_Memory]: 'Speicher:',
  [ShowcaseStrings.Debug_Sequences]: 'Sequenzen:',
  [ShowcaseStrings.Debug_Errors]: 'Fehler:',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 Dateirekonstruktions-Animation',
  [ShowcaseStrings.Recon_Subtitle]:
    'Beobachten Sie, wie Blöcke zu Ihrer Originaldatei zusammengesetzt werden',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: 'CBL verarbeiten',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    'Constituent Block List-Metadaten werden gelesen',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: 'Blöcke auswählen',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    'Erforderliche Blöcke aus der Soup identifizieren',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'Blöcke abrufen',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
    'Blöcke aus dem Speicher sammeln',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]: 'Prüfsummen validieren',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    'Blockintegrität überprüfen',
  [ShowcaseStrings.Recon_Step_Reassemble]: 'Datei zusammensetzen',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    'Blöcke kombinieren und Padding entfernen',
  [ShowcaseStrings.Recon_Step_DownloadReady]: 'Download bereit',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    'Dateirekonstruktion abgeschlossen',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 Constituent Block List',
  [ShowcaseStrings.Recon_CBLSubtitle]:
    'Aus der CBL extrahierte Blockreferenzen',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 Blöcke ({COUNT})',
  [ShowcaseStrings.Recon_BlocksSubtitle]:
    'Blöcke werden abgerufen und validiert',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 Dateizusammensetzung',
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    'Blöcke kombinieren und Padding entfernen',
  [ShowcaseStrings.Recon_Complete]: 'Dateirekonstruktion abgeschlossen!',
  [ShowcaseStrings.Recon_ReadyForDownload]:
    'Ihre Datei steht zum Download bereit',
  [ShowcaseStrings.Recon_FileName]: 'Dateiname:',
  [ShowcaseStrings.Recon_Size]: 'Größe:',
  [ShowcaseStrings.Recon_Blocks]: 'Blöcke:',
  [ShowcaseStrings.Recon_WhatsHappening]: 'Was gerade passiert',
  [ShowcaseStrings.Recon_TechDetails]: 'Technische Details:',
  [ShowcaseStrings.Recon_CBLContainsRefs]:
    'CBL enthält Referenzen zu allen Blöcken',
  [ShowcaseStrings.Recon_BlockCountTemplate]: 'Blockanzahl: {COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    'Originaldateigröße: {SIZE} Bytes',
  [ShowcaseStrings.Recon_BlockSelection]: 'Blockauswahl:',
  [ShowcaseStrings.Recon_IdentifyingBlocks]:
    'Blöcke in der Soup identifizieren',
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    'Blöcke werden anhand ihrer Prüfsummen ausgewählt',
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    'Alle Blöcke müssen für die Rekonstruktion vorhanden sein',
  [ShowcaseStrings.Recon_ChecksumValidation]: 'Prüfsummenvalidierung:',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    'Stellt sicher, dass Blöcke nicht beschädigt wurden',
  [ShowcaseStrings.Recon_ComparesChecksums]:
    'Vergleicht gespeicherte Prüfsumme mit berechneter Prüfsumme',
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    'Ungültige Blöcke würden die Rekonstruktion fehlschlagen lassen',
  [ShowcaseStrings.Recon_FileReassembly]: 'Dateizusammensetzung:',
  [ShowcaseStrings.Recon_CombinedInOrder]:
    'Blöcke werden in der richtigen Reihenfolge kombiniert',
  [ShowcaseStrings.Recon_PaddingRemoved]: 'Zufälliges Padding wird entfernt',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    'Originaldatei wird Byte für Byte rekonstruiert',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: 'Animierte BrightChain Block Soup Demo',
  [ShowcaseStrings.Anim_Subtitle]:
    'Erleben Sie den BrightChain-Prozess mit Schritt-für-Schritt-Animationen und Lerninhalten!',
  [ShowcaseStrings.Anim_Initializing]:
    'Animierte BrightChain-Demo wird initialisiert...',
  [ShowcaseStrings.Anim_PauseAnimation]: 'Animation pausieren',
  [ShowcaseStrings.Anim_PlayAnimation]: 'Animation abspielen',
  [ShowcaseStrings.Anim_ResetAnimation]: 'Animation zurücksetzen',
  [ShowcaseStrings.Anim_SpeedTemplate]: 'Geschwindigkeit: {SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 Leistungsmonitor',
  [ShowcaseStrings.Anim_FrameRate]: 'Bildrate:',
  [ShowcaseStrings.Anim_FrameTime]: 'Frame-Zeit:',
  [ShowcaseStrings.Anim_DroppedFrames]: 'Verlorene Frames:',
  [ShowcaseStrings.Anim_Memory]: 'Speicher:',
  [ShowcaseStrings.Anim_Sequences]: 'Sequenzen:',
  [ShowcaseStrings.Anim_Errors]: 'Fehler:',
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    'Dateien hierher ziehen oder klicken zum Hochladen',
  [ShowcaseStrings.Anim_ChooseFiles]: 'Dateien auswählen',
  [ShowcaseStrings.Anim_StorageTemplate]:
    'Block Soup-Speicher ({COUNT} Dateien)',
  [ShowcaseStrings.Anim_NoFilesYet]:
    'Noch keine Dateien gespeichert. Laden Sie Dateien hoch, um die animierte Magie zu sehen! ✨',
  [ShowcaseStrings.Anim_RetrieveFile]: 'Datei abrufen',
  [ShowcaseStrings.Anim_DownloadCBL]: 'CBL herunterladen',
  [ShowcaseStrings.Anim_SizeTemplate]: 'Größe: {SIZE} Bytes | Blöcke: {BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: 'Kodierungs-Animation',
  [ShowcaseStrings.Anim_ReconstructionAnimation]: 'Rekonstruktions-Animation',
  [ShowcaseStrings.Anim_CurrentStep]: 'Aktueller Schritt',
  [ShowcaseStrings.Anim_DurationTemplate]: 'Dauer: {DURATION}ms',
  [ShowcaseStrings.Anim_BlockDetails]: 'Blockdetails',
  [ShowcaseStrings.Anim_Index]: 'Index:',
  [ShowcaseStrings.Anim_Size]: 'Größe:',
  [ShowcaseStrings.Anim_Id]: 'ID:',
  [ShowcaseStrings.Anim_Stats]: 'Animationsstatistiken',
  [ShowcaseStrings.Anim_TotalFiles]: 'Dateien gesamt:',
  [ShowcaseStrings.Anim_TotalBlocks]: 'Blöcke gesamt:',
  [ShowcaseStrings.Anim_AnimationSpeed]: 'Animationsgeschwindigkeit:',
  [ShowcaseStrings.Anim_Session]: 'Sitzung:',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    '(Daten werden beim Seitenaktualisieren gelöscht)',
  [ShowcaseStrings.Anim_WhatsHappening]: 'Was passiert:',
  [ShowcaseStrings.Anim_Duration]: 'Dauer:',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'BrightChain Demo',
  [ShowcaseStrings.Soup_Subtitle]:
    'Speichern Sie Dateien und Nachrichten als Blöcke in der dezentralisierten Block Soup. Alles wird zu bunten Suppendosen!',
  [ShowcaseStrings.Soup_Initializing]:
    'SessionIsolatedBrightChain wird initialisiert...',
  [ShowcaseStrings.Soup_StoreInSoup]: 'Daten in Block Soup speichern',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 Dateien speichern',
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    'Dateien hierher ziehen oder klicken zum Hochladen',
  [ShowcaseStrings.Soup_ChooseFiles]: 'Dateien auswählen',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 CBL in der Soup mit Magnet-URL speichern',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    'Speichert die CBL in der Block Soup mittels XOR-Weißung und erzeugt eine teilbare Magnet-URL. Ohne dies erhalten Sie die CBL-Datei direkt.',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 Nachrichten speichern',
  [ShowcaseStrings.Soup_From]: 'Von:',
  [ShowcaseStrings.Soup_To]: 'An:',
  [ShowcaseStrings.Soup_Message]: 'Nachricht:',
  [ShowcaseStrings.Soup_TypeMessage]: 'Nachricht eingeben...',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 Nachricht an Soup senden',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL in der Soup gespeichert',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 Super-CBL verwendet',
  [ShowcaseStrings.Soup_HierarchyDepth]: 'Hierarchietiefe:',
  [ShowcaseStrings.Soup_SubCBLs]: 'Unter-CBLs:',
  [ShowcaseStrings.Soup_LargeFileSplit]:
    'Große Datei in hierarchische Struktur aufgeteilt',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    'Ihre CBL wurde als zwei XOR-Komponenten in der Block Soup gespeichert. Verwenden Sie diese Magnet-URL, um die Datei abzurufen:',
  [ShowcaseStrings.Soup_Component1]: 'Komponente 1:',
  [ShowcaseStrings.Soup_Component2]: 'Komponente 2:',
  [ShowcaseStrings.Soup_Copy]: '📋 Kopieren',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Aus der Soup abrufen',
  [ShowcaseStrings.Soup_UploadCBLFile]: 'CBL-Datei hochladen',
  [ShowcaseStrings.Soup_UseMagnetURL]: 'Magnet-URL verwenden',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    'Laden Sie eine .cbl-Datei hoch, um die Originaldatei aus der Block Soup zu rekonstruieren. Die Blöcke müssen bereits in der Soup vorhanden sein, damit die Rekonstruktion funktioniert.',
  [ShowcaseStrings.Soup_ChooseCBLFile]: 'CBL-Datei auswählen',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    'Fügen Sie eine Magnet-URL ein, um die Datei abzurufen. Die Magnet-URL verweist auf die geweißten CBL-Komponenten in der Soup.',
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: 'Laden',
  [ShowcaseStrings.Soup_MessagePassing]: 'Nachrichtenübermittlung',
  [ShowcaseStrings.Soup_HideMessagePanel]: 'Nachrichtenpanel ausblenden',
  [ShowcaseStrings.Soup_ShowMessagePanel]: 'Nachrichtenpanel anzeigen',
  [ShowcaseStrings.Soup_SendMessage]: 'Nachricht senden',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 Nachrichten ({COUNT})',
  [ShowcaseStrings.Soup_NoMessagesYet]:
    'Noch keine Nachrichten. Senden Sie Ihre erste Nachricht! ✨',
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Aus der Soup abrufen',
  [ShowcaseStrings.Soup_StoredMessages]: 'Gespeicherte Nachrichten',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]:
    'Gespeicherte Dateien & Nachrichten',
  [ShowcaseStrings.Soup_RemoveFromList]: 'Aus der Liste entfernen',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    '„{NAME}" aus der Liste entfernen? (Blöcke bleiben in der Soup)',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 Datei abrufen',
  [ShowcaseStrings.Soup_DownloadCBL]: 'CBL herunterladen',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 Nachricht abrufen',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 Magnet-URL',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    'Geweißte CBL-Magnet-URL (verwenden Sie „Magnet-URL verwenden" zum Abrufen)',
  [ShowcaseStrings.Soup_ProcessingSteps]: 'Verarbeitungsschritte',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'CBL-Speicherschritte',
  [ShowcaseStrings.Soup_BlockDetails]: 'Blockdetails',
  [ShowcaseStrings.Soup_Index]: 'Index:',
  [ShowcaseStrings.Soup_Size]: 'Größe:',
  [ShowcaseStrings.Soup_Id]: 'ID:',
  [ShowcaseStrings.Soup_Color]: 'Farbe:',
  [ShowcaseStrings.Soup_SoupStats]: 'Soup-Statistiken',
  [ShowcaseStrings.Soup_TotalFiles]: 'Dateien gesamt:',
  [ShowcaseStrings.Soup_TotalBlocks]: 'Blöcke gesamt:',
  [ShowcaseStrings.Soup_BlockSize]: 'Blockgröße:',
  [ShowcaseStrings.Soup_SessionDebug]: 'Sitzungs-Debug',
  [ShowcaseStrings.Soup_SessionId]: 'Sitzungs-ID:',
  [ShowcaseStrings.Soup_BlocksInMemory]: 'Blöcke im Speicher:',
  [ShowcaseStrings.Soup_BlockIds]: 'Block-IDs:',
  [ShowcaseStrings.Soup_ClearSession]: 'Sitzung löschen',
  [ShowcaseStrings.Soup_Session]: 'Sitzung:',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    '(Daten werden beim Seitenaktualisieren gelöscht)',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]:
    'Wählen Sie eine Datei aus, um ihre Blöcke hervorzuheben:',
  [ShowcaseStrings.ESV_BlockSoup]: 'Block-Suppe',
  [ShowcaseStrings.ESV_ShowingConnections]: 'Verbindungen anzeigen für:',
  [ShowcaseStrings.ESV_EmptySoup]: 'Leere Suppe',
  [ShowcaseStrings.ESV_EmptySoupHint]:
    'Laden Sie Dateien hoch, um sie in bunte Suppendosen verwandelt zu sehen!',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} Blöcke • {size} Bytes',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]: 'Filmkritiker-Preisverleihung!',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    'Drei Filme sind für den besten Film nominiert. Kritiker müssen jeden einzeln bewerten.',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    'Bewerten Sie jeden Film von 0-10. Lieben Sie einen, hassen Sie einen anderen? Bewerten Sie ehrlich! Der höchste Durchschnitt gewinnt.',
  [ShowcaseStrings.Score_IntroChallenge]:
    'Im Gegensatz zum Ranking können Sie mehreren Filmen hohe Bewertungen geben, wenn sie alle großartig sind!',
  [ShowcaseStrings.Score_StartBtn]: '🎬 Bewertung starten!',
  [ShowcaseStrings.Score_DemoTitle]: '⭐ Bewertungswahl - Bester Film',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 Bewerten Sie jeden Film 0-10. Der höchste Durchschnitt gewinnt!',
  [ShowcaseStrings.Score_NominatedFilms]: 'Nominierte Filme',
  [ShowcaseStrings.Score_Genre_SciFi]: 'Science-Fiction-Epos',
  [ShowcaseStrings.Score_Genre_Romance]: 'Romantisches Drama',
  [ShowcaseStrings.Score_Genre_Thriller]: 'Tech-Thriller',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 Bewertungen von {VOTER}',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - Schrecklich',
  [ShowcaseStrings.Score_Label_Average]: '5 - Durchschnittlich',
  [ShowcaseStrings.Score_Label_Masterpiece]: '10 - Meisterwerk',
  [ShowcaseStrings.Score_SubmitTemplate]:
    'Bewertungen abgeben ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 Verschlüsselung...',
  [ShowcaseStrings.Score_EncryptingVote]: 'Stimme wird verschlüsselt...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 Kritiker die bewertet haben: {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 Durchschnitte berechnen!',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 Und der Gewinner ist...',
  [ShowcaseStrings.Score_TallyTitle]: '📊 Durchschnittsberechnung',
  [ShowcaseStrings.Score_TallyExplain]:
    'Die Bewertungen jedes Films wurden addiert und durch {COUNT} Kritiker geteilt:',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 Durchschnitt',
  [ShowcaseStrings.Score_ResetBtn]: 'Neue Preisverleihung',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]: 'Vorstandsdrama bei StartupCo!',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    'Es ist die jährliche Aktionärsversammlung. Das Unternehmen ist 100 Mio. $ wert und jeder will mitbestimmen.',
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    'Nicht alle Stimmen sind gleich. Der VC-Fonds besitzt 45% der Anteile. Die Gründer besitzen 30% und 15%. Mitarbeiter und Business Angels besitzen den Rest.',
  [ShowcaseStrings.Weight_StakeExpand]:
    'Enormes Wachstumspotenzial, aber riskant',
  [ShowcaseStrings.Weight_StakeAcquire]: 'Konkurrenz eliminieren, aber teuer',
  [ShowcaseStrings.Weight_StakeIPO]:
    'Börsengang bedeutet Liquidität, aber auch Kontrolle',
  [ShowcaseStrings.Weight_IntroChallenge]:
    'Jede Stimme wird nach Anteilsbesitz gewichtet. Die Stimme des VC-Fonds zählt 18-mal mehr als die des Business Angels. Das ist Unternehmensdemokratie!',
  [ShowcaseStrings.Weight_StartBtn]: '📄 Den Vorstandsraum betreten',
  [ShowcaseStrings.Weight_DemoTitle]:
    '⚖️ Gewichtete Abstimmung - StartupCo Vorstandssitzung',
  [ShowcaseStrings.Weight_DemoTagline]:
    '💰 Ihre Anteile = Ihre Stimmkraft. Willkommen in der Unternehmensführung!',
  [ShowcaseStrings.Weight_ProposalsTitle]: 'Strategische Vorschläge',
  [ShowcaseStrings.Weight_Proposal1_Desc]:
    'Büros in Tokio und Singapur eröffnen',
  [ShowcaseStrings.Weight_Proposal2_Desc]: 'Mit TechStartup Inc. fusionieren',
  [ShowcaseStrings.Weight_Proposal3_Desc]:
    'Nächstes Quartal an der NASDAQ listen',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    'Aktionäre ({VOTED}/{TOTAL} haben abgestimmt)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} Anteile ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ Gestimmt für {EMOJI} {NAME}',
  [ShowcaseStrings.Weight_TallyBtn]: 'Gewichtete Stimmen auszählen',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 Ergebnisse (nach Anteilsgewicht)',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} Anteile ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 Der Gewinnervorschlag erhielt {PERCENT}% der Gesamtanteile',
  [ShowcaseStrings.Weight_ResetBtn]: 'Neue Abstimmung',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: 'Nationales Referendum!',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ Die Frage: „Soll unser Land die 4-Tage-Woche einführen?"',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 Ja/Nein-Referendum: Die einfachste Form der Demokratie. Eine Frage, zwei Möglichkeiten, die Mehrheit entscheidet.',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ JA-Kampagne: Bessere Work-Life-Balance, höhere Produktivität, glücklichere Bürger!',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ NEIN-Kampagne: Wirtschaftliches Risiko, Geschäftsstörungen, unerprobte Politik!',
  [ShowcaseStrings.YN_IntroChallenge]:
    '🗳️ Verwendet für den Brexit, die schottische Unabhängigkeit und Verfassungsänderungen weltweit.',
  [ShowcaseStrings.YN_StartBtn]: '🗳️ Jetzt abstimmen!',
  [ShowcaseStrings.YN_DemoTitle]: '👍 Ja/Nein-Referendum - 4-Tage-Woche',
  [ShowcaseStrings.YN_DemoTagline]:
    '🗳️ Eine Frage. Zwei Möglichkeiten. Die Demokratie entscheidet.',
  [ShowcaseStrings.YN_ReferendumQuestion]:
    'Sollen wir die 4-Tage-Woche einführen?',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    'Abstimmende Bürger ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.YN_VotedYes]: '✓ Gewählt 👍 JA',
  [ShowcaseStrings.YN_VotedNo]: '✓ Gewählt 👎 NEIN',
  [ShowcaseStrings.YN_BtnYes]: '👍 JA',
  [ShowcaseStrings.YN_BtnNo]: '👎 NEIN',
  [ShowcaseStrings.YN_TallyBtn]: '📊 Stimmen auszählen!',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 Ergebnisse des Referendums!',
  [ShowcaseStrings.YN_LabelYes]: 'JA',
  [ShowcaseStrings.YN_LabelNo]: 'NEIN',
  [ShowcaseStrings.YN_MotionPasses]: '✅ Antrag ANGENOMMEN!',
  [ShowcaseStrings.YN_MotionFails]: '❌ Antrag ABGELEHNT!',
  [ShowcaseStrings.YN_OutcomePass]:
    'Das Volk hat gesprochen: Wir führen die 4-Tage-Woche ein!',
  [ShowcaseStrings.YN_OutcomeFail]:
    'Das Volk hat gesprochen: Wir behalten die 5-Tage-Woche.',
  [ShowcaseStrings.YN_ResetBtn]: 'Neues Referendum',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]: 'Resolution des UN-Sicherheitsrats!',
  [ShowcaseStrings.YNA_IntroResolution]:
    '🌍 Die Resolution: „Soll die UN Sanktionen gegen Land X wegen Menschenrechtsverletzungen verhängen?"',
  [ShowcaseStrings.YNA_IntroStory]:
    '🤷 Ja/Nein/Enthaltung: Manchmal ist man nicht bereit zu entscheiden. Enthaltungen zählen nicht zur Gesamtzahl, werden aber erfasst.',
  [ShowcaseStrings.YNA_IntroYes]: '✅ JA: Sofort Sanktionen verhängen',
  [ShowcaseStrings.YNA_IntroNo]: '❌ NEIN: Die Resolution ablehnen',
  [ShowcaseStrings.YNA_IntroAbstain]:
    '🤷 ENTHALTUNG: Neutral - möchte keine Seite wählen',
  [ShowcaseStrings.YNA_IntroChallenge]:
    '🏛️ Verwendet bei UN-Abstimmungen, parlamentarischen Verfahren und Vorstandssitzungen weltweit.',
  [ShowcaseStrings.YNA_StartBtn]: '🌎 Stimmen abgeben!',
  [ShowcaseStrings.YNA_DemoTitle]: '🤷 Ja/Nein/Enthaltung - UN-Resolution',
  [ShowcaseStrings.YNA_DemoTagline]:
    '🌍 Drei Möglichkeiten: Unterstützen, Ablehnen oder Neutral bleiben',
  [ShowcaseStrings.YNA_ReferendumQuestion]:
    'Sanktionen gegen Land X verhängen?',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    'Mitglieder des Sicherheitsrats ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 JA',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 NEIN',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 ENTHALTUNG',
  [ShowcaseStrings.YNA_BtnYes]: '👍 JA',
  [ShowcaseStrings.YNA_BtnNo]: '👎 NEIN',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 ENTHALTUNG',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 Resolution auszählen!',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 Ergebnisse der Resolution!',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 Stimmenauszählung',
  [ShowcaseStrings.YNA_TallyExplain]:
    'Enthaltungen werden erfasst, zählen aber nicht für die Entscheidung. Der Gewinner braucht die Mehrheit der JA/NEIN-Stimmen:',
  [ShowcaseStrings.YNA_LabelYes]: 'JA',
  [ShowcaseStrings.YNA_LabelNo]: 'NEIN',
  [ShowcaseStrings.YNA_LabelAbstain]: 'ENTHALTUNG',
  [ShowcaseStrings.YNA_AbstainNote]: 'Nicht in der Entscheidung gezählt',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ Resolution ANGENOMMEN!',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ Resolution ABGELEHNT!',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    'Entscheidende Stimmen: {DECIDING} | Enthaltungen: {ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: 'Neue Resolution',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: 'Abstimmung über Verfassungsänderung!',
  [ShowcaseStrings.Super_IntroStakes]:
    '🏛️ Was auf dem Spiel steht: Eine Verfassungsänderung erfordert mehr als eine einfache Mehrheit. Wir brauchen eine SUPERMEHRHEIT!',
  [ShowcaseStrings.Super_IntroThreshold]:
    '🎯 2/3-Schwelle: Mindestens 66,67 % müssen mit JA stimmen, damit die Änderung angenommen wird. Dies schützt vor übereilten Änderungen.',
  [ShowcaseStrings.Super_IntroAmendment]:
    '📜 Die Änderung: „Amtszeitbegrenzungen für alle Bundesrichter einführen"',
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ Hohe Hürde: 6 von 9 Staaten müssen ratifizieren (einfache Mehrheit reicht nicht!)',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 Verwendet für Verfassungsänderungen, Vertragsratifizierungen und Amtsenthebungsverfahren.',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ Ratifizierung starten!',
  [ShowcaseStrings.Super_DemoTitle]: '🎯 Supermehrheit - Verfassungsänderung',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 Erfordert {PERCENT}% zum Bestehen ({REQUIRED}/{TOTAL} Staaten)',
  [ShowcaseStrings.Super_TrackerTitle]: '📊 Live-Schwellen-Tracker',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} JA',
  [ShowcaseStrings.Super_RequiredTemplate]: '{PERCENT}% erforderlich',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ Derzeit ANGENOMMEN ({YES}/{TOTAL} = {PERCENT}%)',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ Derzeit ABGELEHNT ({YES}/{TOTAL} = {PERCENT}%) - Brauche {NEED} weitere JA',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    'Staatliche Parlamente ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ RATIFIZIEREN',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ ABLEHNEN',
  [ShowcaseStrings.Super_BtnRatify]: '✅ RATIFIZIEREN',
  [ShowcaseStrings.Super_BtnReject]: '❌ ABLEHNEN',
  [ShowcaseStrings.Super_TallyBtn]: '📜 Endauszählung!',
  [ShowcaseStrings.Super_ResultsTitle]: '🏛️ Ergebnisse der Änderung!',
  [ShowcaseStrings.Super_CalcTitle]: '📊 Supermehrheits-Berechnung',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    'Erforderlich: {REQUIRED}/{TOTAL} Staaten ({PERCENT}%)',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    'Tatsächlich: {ACTUAL}/{VOTED} Staaten ({PERCENT}%)',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} RATIFIZIEREN',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} ABLEHNEN',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ {PERCENT}%-Schwelle',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ ÄNDERUNG RATIFIZIERT!',
  [ShowcaseStrings.Super_AmendmentFails]: '❌ ÄNDERUNG GESCHEITERT!',
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    'Die Änderung wird mit {COUNT} Staaten angenommen ({PERCENT}%)',
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    'Die {THRESHOLD}%-Schwelle wurde nicht erreicht. Nur {ACTUAL} von {REQUIRED} erforderlichen Staaten haben ratifiziert.',
  [ShowcaseStrings.Super_ResetBtn]: 'Neue Änderung',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: 'Das große politische Duell!',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ Wahlabend-Spezial: Vier Parteien kämpfen um die Macht. Aber hier ist der Clou - niemand will, dass Stimmensplitting dem unbeliebtesten Kandidaten den Sieg beschert!',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 Rangfolgewahl zur Rettung! Statt nur einen zu wählen, ordnen Sie ALLE Kandidaten vom Lieblings- zum am wenigsten bevorzugten.',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    '🔥 So funktioniert es: Wenn niemand 50%+ in Runde 1 erreicht, eliminieren wir den Letzten und übertragen seine Stimmen auf die 2. Wahl der Wähler. Wiederholen bis jemand gewinnt!',
  [ShowcaseStrings.RC_IntroWhyCool]:
    '✨ Warum es cool ist: Sie können in Runde 1 mit dem Herzen wählen, ohne Ihre Stimme zu „verschwenden". Ihre Ersatzwahlen greifen, wenn Ihr Favorit ausscheidet.',
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 Verwendet in Australien, Maine, Alaska und NYC! Beobachten Sie die sofortige Stichwahl vor Ihren Augen.',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ Rangfolge starten!',
  [ShowcaseStrings.RC_DemoTitle]: '🔄 Rangfolgewahl - Nationale Wahl',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 Ordnen Sie ALLE! Keine Spoiler, kein Bedauern, nur Demokratie.',
  [ShowcaseStrings.RC_PartiesTitle]: 'Politische Parteien',
  [ShowcaseStrings.RC_Cand1_Platform]:
    'Universelle Gesundheitsversorgung, Klimaschutz',
  [ShowcaseStrings.RC_Cand2_Platform]:
    'Niedrigere Steuern, traditionelle Werte',
  [ShowcaseStrings.RC_Cand3_Platform]: 'Individuelle Freiheit, kleiner Staat',
  [ShowcaseStrings.RC_Cand4_Platform]: 'Umweltschutz, Nachhaltigkeit',
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    'Ordnen Sie Ihre Präferenzen ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.RC_VotedBadge]: '✓ Gewählt',
  [ShowcaseStrings.RC_AddToRanking]: 'Zur Rangfolge hinzufügen:',
  [ShowcaseStrings.RC_SubmitBallot]: 'Stimmzettel abgeben',
  [ShowcaseStrings.RC_RunInstantRunoff]: 'Sofortige Stichwahl starten',
  [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 Aushang anzeigen',
  [ShowcaseStrings.RC_HideBulletinBoard]: '📜 Aushang ausblenden',
  [ShowcaseStrings.RC_BulletinBoardTitle]:
    '📜 Öffentlicher Aushang (Anforderung 1.2)',
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    'Transparente, nur-anhängende Stimmveröffentlichung mit Merkle-Baum-Verifizierung',
  [ShowcaseStrings.RC_EntryTemplate]: 'Eintrag #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: 'Verschlüsselte Stimme:',
  [ShowcaseStrings.RC_VoterHash]: 'Wähler-Hash:',
  [ShowcaseStrings.RC_Verified]: '✅ Verifiziert',
  [ShowcaseStrings.RC_Invalid]: '❌ Ungültig',
  [ShowcaseStrings.RC_MerkleTree]: 'Merkle-Baum:',
  [ShowcaseStrings.RC_MerkleValid]: '✅ Gültig',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ Kompromittiert',
  [ShowcaseStrings.RC_TotalEntries]: 'Einträge gesamt:',
  [ShowcaseStrings.RC_ResultsTitle]: '🏆 Ergebnisse der sofortigen Stichwahl',
  [ShowcaseStrings.RC_EliminationRounds]: 'Eliminierungsrunden',
  [ShowcaseStrings.RC_RoundTemplate]: 'Runde {ROUND}',
  [ShowcaseStrings.RC_Eliminated]: 'Ausgeschieden',
  [ShowcaseStrings.RC_Winner]: 'Gewinner!',
  [ShowcaseStrings.RC_FinalWinner]: 'Endgültiger Gewinner',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]: 'Gewonnen nach {COUNT} Runde(n)',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: 'Präsidentschaftswahl - Zwei Runden!',
  [ShowcaseStrings.TR_IntroSystem]:
    '🗳️ Das System: Vier Kandidaten treten an. Wenn niemand 50%+ in Runde 1 erreicht, treten die Top 2 in Runde 2 gegeneinander an!',
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 Warum zwei Runden? Stellt sicher, dass der Gewinner Mehrheitsunterstützung hat. Verwendet in Frankreich, Brasilien und vielen Präsidentschaftswahlen.',
  [ShowcaseStrings.TR_IntroRound1]:
    '📊 Runde 1: Wählen Sie Ihren Favoriten unter allen 4 Kandidaten',
  [ShowcaseStrings.TR_IntroRound2]:
    '🔄 Runde 2: Falls nötig, wählen Sie zwischen den Top 2',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ Dies erfordert eine Zwischenentschlüsselung zwischen den Runden - Stimmen sind zwischen den Runden nicht privat!',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ Runde 1 starten!',
  [ShowcaseStrings.TR_DemoTitle]: '2️⃣ Zwei-Runden-Wahl - Präsidentschaftswahl',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 Runde 1: Wählen Sie Ihren Favoriten',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 Runde 2: Finale Stichwahl!',
  [ShowcaseStrings.TR_Round1Candidates]: 'Kandidaten Runde 1',
  [ShowcaseStrings.TR_Cand1_Party]: 'Progressive Partei',
  [ShowcaseStrings.TR_Cand2_Party]: 'Konservative Partei',
  [ShowcaseStrings.TR_Cand3_Party]: 'Tech Vorwärts',
  [ShowcaseStrings.TR_Cand4_Party]: 'Justiz-Koalition',
  [ShowcaseStrings.TR_VotersTemplate]: 'Wähler ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ Gewählt für {EMOJI}',
  [ShowcaseStrings.TR_CountRound1]: '📊 Stimmen der Runde 1 zählen!',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ Ergebnisse Runde 1',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 Auszählung der ersten Runde',
  [ShowcaseStrings.TR_Round1TallyExplain]:
    'Prüfung ob jemand 50%+ Mehrheit erreicht hat...',
  [ShowcaseStrings.TR_AdvanceRound2]: '→ Runde 2',
  [ShowcaseStrings.TR_EliminatedBadge]: 'Ausgeschieden',
  [ShowcaseStrings.TR_NoMajority]: '🔄 Keine Mehrheit! Stichwahl erforderlich!',
  [ShowcaseStrings.TR_TopTwoAdvance]: 'Die Top 2 Kandidaten kommen in Runde 2:',
  [ShowcaseStrings.TR_StartRound2]: '▶️ Stichwahl Runde 2 starten!',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 Stichwahl Runde 2',
  [ShowcaseStrings.TR_Round1ResultTemplate]: 'Runde 1: {VOTES} Stimmen',
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    'Finale Abstimmung ({VOTED}/{TOTAL} haben gewählt)',
  [ShowcaseStrings.TR_FinalCount]: '🏆 Endauszählung!',
  [ShowcaseStrings.TR_ElectionWinner]: '🎉 Wahlsieger!',
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 Finale Auszählung Runde 2',
  [ShowcaseStrings.TR_Round2TallyExplain]:
    'Direktes Duell zwischen den Top 2 Kandidaten:',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME} gewinnt!',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    'Sicherte sich {VOTES} Stimmen ({PERCENT}%) in der Stichwahl',
  [ShowcaseStrings.TR_NewElection]: 'Neue Wahl',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]: 'STAR-Wahl - Das Beste aus beiden Welten!',
  [ShowcaseStrings.STAR_IntroAcronym]:
    '🌟 STAR = Bewertung dann automatische Stichwahl',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ Schritt 1: Bewerten Sie alle Kandidaten mit 0-5 Sternen (wie Filme bewerten!)',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 Schritt 2: Die Top 2 nach Gesamtpunktzahl kommen in die automatische Stichwahl. Ihre Bewertungen bestimmen Ihre Präferenz!',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 Die Magie: Sie können mehreren Kandidaten hohe Bewertungen geben, aber die Stichwahl sichert Mehrheitsunterstützung',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 Beispiel: Sie bewerten Alex=5, Jordan=4, Sam=2, Casey=1. Wenn Alex & Jordan die Top 2 sind, geht Ihre Stimme an Alex!',
  [ShowcaseStrings.STAR_IntroChallenge]:
    '⚠️ Kombiniert die Ausdruckskraft der Bewertungswahl mit der Mehrheitsanforderung der Stichwahl!',
  [ShowcaseStrings.STAR_StartBtn]: '⭐ Bewertung starten!',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 STAR-Wahl - Stadtrat',
  [ShowcaseStrings.STAR_DemoTagline]:
    '⭐ Bewerten, dann automatische Stichwahl!',
  [ShowcaseStrings.STAR_CandidatesTitle]: 'Kandidaten',
  [ShowcaseStrings.STAR_Cand1_Platform]: 'Kunst & Kultur',
  [ShowcaseStrings.STAR_Cand2_Platform]: 'Umwelt',
  [ShowcaseStrings.STAR_Cand3_Platform]: 'Wirtschaft',
  [ShowcaseStrings.STAR_Cand4_Platform]: 'Gesundheitswesen',
  [ShowcaseStrings.STAR_RatingsTemplate]:
    '⭐ Bewertungen von {VOTER} (0-5 Sterne)',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    'Bewertungen abgeben ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 STAR-Algorithmus starten!',
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ Phase 1: Punktesummen',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 Alle Punkte zusammenzählen',
  [ShowcaseStrings.STAR_Phase1TallyExplain]:
    'Die Top 2 Kandidaten nach Gesamtpunktzahl finden...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL} Punkte ({AVG} Durchschn.)',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ Stichwahl',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 Automatische Stichwahl-Phase',
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    'Die Top 2 kommen weiter! Jetzt werden die direkten Präferenzen geprüft...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ Automatische Stichwahl starten!',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 STAR-Gewinner!',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 Phase 2: Automatische Stichwahl',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    'Vergleich von {NAME1} gegen {NAME2} anhand der Wählerpräferenzen:',
  [ShowcaseStrings.STAR_VotersPreferred]: 'Wähler bevorzugten',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME} gewinnt!',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    'Gewann die automatische Stichwahl {WINNER} zu {LOSER}',
  [ShowcaseStrings.STAR_NewElection]: 'Neue Wahl',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: 'STV - Verhältniswahl!',
  [ShowcaseStrings.STV_IntroGoal]:
    '🏛️ Das Ziel: 3 Vertreter wählen, die die Vielfalt der Wählerpräferenzen widerspiegeln!',
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 STV (Übertragbare Einzelstimmgebung): Ordnen Sie Kandidaten. Stimmen werden übertragen, wenn Ihre erste Wahl gewinnt oder ausscheidet.',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 Quote: {QUOTA} Stimmen nötig für einen Sitz (Droop-Quote: {VOTERS}/(3+1) + 1)',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 Übertragungen: Überschüssige Stimmen von Gewinnern und Stimmen von ausgeschiedenen Kandidaten werden auf nächste Präferenzen übertragen',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 Verwendet in Irland, im australischen Senat und vielen Stadträten für faire Vertretung!',
  [ShowcaseStrings.STV_StartBtn]: '📊 Rangfolge starten!',
  [ShowcaseStrings.STV_DemoTitle]: '📊 STV - Stadtrat ({SEATS} Sitze)',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 Quote: {QUOTA} Stimmen pro Sitz nötig',
  [ShowcaseStrings.STV_PartiesRunning]: 'Antretende Parteien',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 Rangfolge von {VOTER}',
  [ShowcaseStrings.STV_RankingInstruction]:
    'Klicken Sie, um Kandidaten in Präferenzreihenfolge hinzuzufügen:',
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    'Rangfolge abgeben ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 STV-Auszählung starten!',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ Rat gewählt!',
  [ShowcaseStrings.STV_CountingTitle]: '📊 STV-Auszählungsprozess',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    'Quote: {QUOTA} Stimmen | Sitze: {SEATS}\nDie Erstpräferenz-Auszählung bestimmt die ersten Gewinner',
  [ShowcaseStrings.STV_QuotaMet]: '(Quote erreicht!)',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ GEWÄHLT',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 Gewählte Vertreter',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 Diese {COUNT} Parteien haben jeweils die Quote von {QUOTA} Stimmen erreicht und Sitze im Rat gewonnen!',
  [ShowcaseStrings.STV_NewElection]: 'Neue Wahl',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]:
    'Quadratische Abstimmung - Budgetzuweisung!',
  [ShowcaseStrings.Quad_IntroChallenge]:
    '💰 Die Herausforderung: 1,4 Mio. $ Budget, 4 Projekte. Wie messen wir die Intensität der Präferenzen?',
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² Quadratische Abstimmung: Jede Stimme kostet Stimmen² Credits. 1 Stimme = 1 Credit, 2 Stimmen = 4 Credits, 3 Stimmen = 9 Credits!',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ UNSICHERE METHODE: Erfordert nicht-homomorphe Operationen (Quadratwurzel). Einzelne Stimmen sind sichtbar!',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    '🎯 Warum verwenden? Verhindert, dass wohlhabende Wähler dominieren. Zeigt Präferenzintensität, nicht nur Ja/Nein.',
  [ShowcaseStrings.Quad_IntroUsedIn]:
    '💡 Verwendet im Colorado House, der taiwanesischen vTaiwan-Plattform und Experimenten zur Unternehmensführung!',
  [ShowcaseStrings.Quad_StartBtn]: '💰 Zuweisung starten!',
  [ShowcaseStrings.Quad_DemoTitle]: '² Quadratische Abstimmung - Stadtbudget',
  [ShowcaseStrings.Quad_DemoTagline]:
    '💰 100 Stimm-Credits. Stimmen kosten Stimmen²!',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ UNSICHER: Diese Methode kann keine homomorphe Verschlüsselung verwenden. Stimmen sind sichtbar!',
  [ShowcaseStrings.Quad_BudgetProjects]: 'Budgetprojekte',
  [ShowcaseStrings.Quad_Proj1_Name]: 'Neuer Park',
  [ShowcaseStrings.Quad_Proj1_Desc]: '500.000 $',
  [ShowcaseStrings.Quad_Proj2_Name]: 'Bibliotheksrenovierung',
  [ShowcaseStrings.Quad_Proj2_Desc]: '300.000 $',
  [ShowcaseStrings.Quad_Proj3_Name]: 'Gemeindezentrum',
  [ShowcaseStrings.Quad_Proj3_Desc]: '400.000 $',
  [ShowcaseStrings.Quad_Proj4_Name]: 'Straßenreparaturen',
  [ShowcaseStrings.Quad_Proj4_Desc]: '200.000 $',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 {VOTER}s Budget ({REMAINING} Credits übrig)',
  [ShowcaseStrings.Quad_VotesTemplate]:
    '{VOTES} Stimmen (kostet {COST} Credits)',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    'Nächste Stimme kostet {NEXT_COST} Credits (von {CURRENT} auf {NEXT_TOTAL})',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    'Gesamtkosten: {USED}/100 Credits',
  [ShowcaseStrings.Quad_SubmitTemplate]:
    'Zuweisung einreichen ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 Summen berechnen!',
  [ShowcaseStrings.Quad_ResultsTitle]: '💰 Ergebnisse der Budgetzuweisung!',
  [ShowcaseStrings.Quad_TallyTitle]: '📊 Quadratische Stimmensummen',
  [ShowcaseStrings.Quad_TallyExplain]:
    'Die Gesamtstimmen (nicht Credits) jedes Projekts bestimmen die Finanzierungspriorität:',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: '{TOTAL} Stimmen insgesamt',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 Höchste Priorität',
  [ShowcaseStrings.Quad_ExplanationTitle]:
    '💡 Wie die Quadratische Abstimmung funktionierte',
  [ShowcaseStrings.Quad_ExplanationP1]:
    'Die quadratischen Kosten verhinderten, dass jemand ein einzelnes Projekt dominiert. 10 Stimmen kosten 100 Credits (Ihr gesamtes Budget!), aber 5 Stimmen auf 2 Projekte verteilt kosten nur 50 Credits insgesamt.',
  [ShowcaseStrings.Quad_ExplanationResult]:
    'Ergebnis: Projekte mit breiter, intensiver Unterstützung gewinnen gegenüber Projekten mit enger, extremer Unterstützung.',
  [ShowcaseStrings.Quad_ResetBtn]: 'Neue Budgetabstimmung',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: 'Konsensentscheidung!',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ Das Szenario: Eine kleine Genossenschaft muss eine wichtige Entscheidung treffen. Jede Stimme zählt!',
  [ShowcaseStrings.Cons_IntroConsensus]:
    '🤝 Konsensabstimmung: Erfordert 95%+ Zustimmung. Ein oder zwei Einwände können den Vorschlag blockieren.',
  [ShowcaseStrings.Cons_IntroInsecure]:
    '⚠️ UNSICHERE METHODE: Keine Privatsphäre - jeder sieht, wer unterstützt/ablehnt!',
  [ShowcaseStrings.Cons_IntroWhyUse]:
    '🎯 Warum verwenden? Kleine Gruppen, in denen Vertrauen und Einheit wichtiger sind als Privatsphäre.',
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 Verwendet in Genossenschaften, intentionalen Gemeinschaften und konsensbasierten Organisationen!',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 Abstimmung starten!',
  [ShowcaseStrings.Cons_DemoTitle]:
    '🤝 Konsensabstimmung - Genossenschaftsentscheidung',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    '🎯 Erfordert {PERCENT}% Zustimmung ({REQUIRED}/{TOTAL} Mitglieder)',
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ UNSICHER: Keine Privatsphäre - alle Stimmen sind sichtbar, um Konsens aufzubauen!',
  [ShowcaseStrings.Cons_Proposal]:
    'Vorschlag: Sollen wir 50.000 $ in Solarpanele investieren?',
  [ShowcaseStrings.Cons_ProposalDesc]:
    'Dies ist eine wichtige finanzielle Entscheidung, die nahezu einstimmige Unterstützung erfordert.',
  [ShowcaseStrings.Cons_TrackerTitle]: '📊 Live-Konsens-Tracker',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT} Unterstützung',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ KONSENS ERREICHT ({SUPPORT}/{TOTAL})',
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    '❌ Noch {NEEDED} mehr nötig für Konsens',
  [ShowcaseStrings.Cons_MembersTemplate]:
    'Genossenschaftsmitglieder ({VOTED}/{TOTAL} haben abgestimmt)',
  [ShowcaseStrings.Cons_Support]: '✅ Unterstützung',
  [ShowcaseStrings.Cons_Oppose]: '❌ Ablehnung',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ Unterstützen',
  [ShowcaseStrings.Cons_BtnOppose]: '❌ Ablehnen',
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 Konsens prüfen!',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 Konsensergebnis!',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 Endauszählung',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    'Erforderlich: {REQUIRED}/{TOTAL} ({PERCENT}%)',
  [ShowcaseStrings.Cons_ActualTemplate]:
    'Tatsächlich: {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT} Unterstützung',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT} Ablehnung',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ {PERCENT}% Schwelle',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ KONSENS ERREICHT!',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ KONSENS GESCHEITERT!',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    'Der Vorschlag wird mit {COUNT} unterstützenden Mitgliedern angenommen ({PERCENT}%)',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    'Die {THRESHOLD}%-Schwelle wurde nicht erreicht. {OPPOSE} Mitglied(er) haben abgelehnt und den Konsens blockiert.',
  [ShowcaseStrings.Cons_FailNote]:
    '💡 Bei der Konsensentscheidung zählen selbst ein oder zwei Einwände. Die Gruppe muss Bedenken ansprechen oder den Vorschlag ändern.',
  [ShowcaseStrings.Cons_ResetBtn]: 'Neuer Vorschlag',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]:
    'Konsent-basierte Entscheidungsfindung!',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 Soziokratie: Eine Arbeitergenossenschaft muss Entscheidungen treffen, mit denen alle leben können.',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    '🙋 Konsent-basiert: Es geht nicht um Zustimmung - es geht um "keine starken Einwände". Können Sie damit leben?',
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ UNSICHERE METHODE: Keine Privatsphäre - Einwände müssen gehört und behandelt werden!',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 Die Frage: "Haben Sie einen prinzipiellen Einwand, der der Organisation schaden würde?"',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    '🌍 Verwendet in soziokratischen Organisationen, Holakratie und kollaborativen Arbeitsplätzen!',
  [ShowcaseStrings.Consent_StartBtn]: '🙋 Prozess starten!',
  [ShowcaseStrings.Consent_DemoTitle]:
    '🙋 Konsent-basiert - Arbeitergenossenschaft',
  [ShowcaseStrings.Consent_DemoTagline]:
    '🤝 Keine starken Einwände = Konsent erreicht',
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ UNSICHER: Keine Privatsphäre - Einwände werden offen zur Diskussion geteilt!',
  [ShowcaseStrings.Consent_ProposalTitle]:
    'Vorschlag: 4-Tage-Woche ab nächstem Monat einführen',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    'Haben Sie einen prinzipiellen Einwand, der unserer Organisation schaden würde?',
  [ShowcaseStrings.Consent_ProposalNote]:
    '"Ich bevorzuge 5 Tage" ist kein prinzipieller Einwand. "Das würde uns in den Bankrott treiben" ist einer.',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ Konsent',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 Einwände',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ {COUNT} prinzipielle(r) Einwand/Einwände erhoben - Vorschlag muss geändert oder zurückgezogen werden',
  [ShowcaseStrings.Consent_MembersTemplate]:
    'Kreismitglieder ({RESPONDED}/{TOTAL} haben geantwortet)',
  [ShowcaseStrings.Consent_NoObjection]: '✅ Kein Einwand',
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 Prinzipieller Einwand',
  [ShowcaseStrings.Consent_BtnNoObjection]: '✅ Kein Einwand',
  [ShowcaseStrings.Consent_BtnObject]: '🚫 Einwand erheben',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}, was ist Ihr prinzipieller Einwand?',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 Konsent prüfen!',
  [ShowcaseStrings.Consent_ResultsTitle]: '🙋 Ergebnis des Konsent-Prozesses!',
  [ShowcaseStrings.Consent_ConsentCheckTitle]: '📊 Konsent-Prüfung',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    'Konsent erreicht bei null prinzipiellen Einwänden\nErhobene Einwände: {COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ Keine Einwände ({COUNT})',
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    'Diese Mitglieder können mit dem Vorschlag leben',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
    '🚫 Prinzipielle Einwände ({COUNT})',
  [ShowcaseStrings.Consent_ObjectionRaised]: 'Einwand erhoben',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ KONSENT ERREICHT!',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 KONSENT BLOCKIERT!',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    'Alle {COUNT} Mitglieder haben Konsent gegeben (keine prinzipiellen Einwände). Der Vorschlag geht weiter.',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    '{COUNT} prinzipielle(r) Einwand/Einwände erhoben. Der Kreis muss Bedenken ansprechen, bevor fortgefahren wird.',
  [ShowcaseStrings.Consent_NextStepsTitle]:
    '💡 Nächste Schritte in der Soziokratie:',
  [ShowcaseStrings.Consent_NextStep1]: 'Einwände vollständig anhören',
  [ShowcaseStrings.Consent_NextStep2]:
    'Vorschlag ändern, um Bedenken zu berücksichtigen',
  [ShowcaseStrings.Consent_NextStep3]:
    'Konsent mit aktualisiertem Vorschlag erneut testen',
  [ShowcaseStrings.Consent_NextStep4]:
    'Wenn Einwände bestehen bleiben, wird der Vorschlag zurückgezogen',
  [ShowcaseStrings.Consent_ResetBtn]: 'Neuer Vorschlag',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'BrightChain Blog',
  [ShowcaseStrings.Blog_Subtitle]: 'Gedanken, Tutorials und Neuigkeiten',
  [ShowcaseStrings.Blog_Loading]: 'Beiträge werden geladen...',
  [ShowcaseStrings.Blog_NewPost]: '+ Neuer Beitrag',
  [ShowcaseStrings.Blog_NoPosts]:
    'Noch keine Blogbeiträge. Schauen Sie bald wieder vorbei!',
  [ShowcaseStrings.Blog_NewBadge]: '✨ Neu',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: 'Von {AUTHOR}',
  [ShowcaseStrings.Blog_BackToHome]: '← Zurück zur Startseite',

  // BlogPost.tsx
  [ShowcaseStrings.BlogPost_Loading]: 'Beitrag wird geladen...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Beitrag nicht gefunden',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    'Der gesuchte Blogbeitrag existiert nicht.',
  [ShowcaseStrings.BlogPost_BackToBlog]: '← Zurück zum Blog',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ Dieser Beitrag wurde gerade veröffentlicht! Er erscheint nach der nächsten Seitenaktualisierung in der Blogliste.',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'Von {AUTHOR}',

  // Components.tsx feature cards
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    'MongoDB-konkurrierende Dokumentendatenbank, die Daten im eigentümerfreien Dateisystem speichert. Jedes Dokument wird transparent als geweißte Blöcke mit TUPLE-Architektur für plausible Abstreitbarkeit gespeichert.',
  [ShowcaseStrings.Feat_BrightDB_Cat]: 'Speicher',
  [ShowcaseStrings.Feat_BrightDB_Tech1]: 'Dokumentenspeicher',
  [ShowcaseStrings.Feat_BrightDB_Tech2]: 'ACID-Transaktionen',
  [ShowcaseStrings.Feat_BrightDB_Tech3]: 'Aggregations-Pipeline',
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    'MongoDB-ähnliche API: Sammlungen, CRUD, Abfragen, Indizes, Transaktionen',
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    '15 Abfrageoperatoren: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch',
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    'Aggregations-Pipeline: $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup',
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    'Einfeld-, zusammengesetzte und eindeutige Indizes mit B-Baum-Strukturen',
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    'Multi-Dokument-ACID-Transaktionen mit Commit/Abort und optimistischer Nebenläufigkeit',
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    'Änderungsströme für Echtzeit-Abonnements von Einfüge-/Aktualisierungs-/Löschereignissen',
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    'Express REST-Middleware für Plug-and-Play-API-Zugriff auf Sammlungen',
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    'TTL-Indizes für automatisches Dokumentenablauf',
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    'Schema-Validierung mit strikten/moderaten Ebenen und Standardwerten',
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    'Volltextsuche mit gewichteten Feldern und $text-Operator',
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    'Copy-on-Write-Speicher: Blöcke werden nie gelöscht, nur Zuordnungen aktualisiert',
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    'Jedes Dokument als 3-Block-TUPLE gespeichert (Daten + 2 Randomisierer) für plausible Abstreitbarkeit',
  [ShowcaseStrings.Feat_BrightDBPools_Title]: 'BrightDB-Pools',
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    'Leichte, namespace-isolierte Speicherpools, die Blöcke logisch partitionieren ohne separaten physischen Speicher. Jeder Pool erzwingt seine eigenen ACL-, Verschlüsselungs- und Whitening-Grenzen — ermöglicht Multi-Tenant-, Multi-Anwendungs-Datenisolation auf einem einzelnen BrightChain-Knoten.',
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'Speicher',
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: 'Namespace-Isolierung',
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'Pool-ACLs',
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'Gossip-Erkennung',
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    'Namespace-präfixierte Speicherschlüssel (poolId:hash) — logische Isolierung ohne physische Trennung',
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    'Pool-spezifische ACLs mit Lese-, Schreib-, Replikations- und Admin-Berechtigungen auf Speicherebene durchgesetzt',
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    'Pool-beschränktes XOR-Whitening: Tupel überschreiten niemals Pool-Grenzen, bewahren Pool-spezifische plausible Abstreitbarkeit',
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    'Gossip-basierte Pool-Erkennung über Peers mit konfigurierbaren Abfrage-Timeouts und Caching',
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    'Pool-Bootstrap-Seeding: Generierung kryptographischer Zufallsblöcke als Whitening-Material für neue Pools',
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    'Sichere Löschvalidierung — prüft Pool-übergreifende XOR-Abhängigkeiten vor dem Entfernen eines Pools',
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    'Pool-beschränkte Bloom-Filter und Manifeste für effiziente Peer-Abgleichung',
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    'Multi-Admin-Quorum-Governance: ACL-Updates erfordern >50% Admin-Signaturen',
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    'Öffentliche Lese-/Schreibflags für offene Pools oder gesperrter Nur-Mitglieder-Zugriff',
  [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
  [ShowcaseStrings.Feat_OFFS_Desc]:
    'Aufbauend auf dem ursprünglichen Owner-Free File System Konzept hebt BrightChain OFFS auf ein neues Niveau. Wir haben asymmetrische ECIES-Verschlüsselung, Reed-Solomon-FEC-Paritätsblöcke für Redundanz und Langlebigkeit sowie ein digitales Blockchain-Hauptbuch hinzugefügt. Auf dieser Grundlage nutzt Digital Burnbag die einzigartigen Eigenschaften von OFFS, um die garantierte Dateivernichtung ohne jemals gelesene Inhalte zu ermöglichen. Die vollständigen mathematischen Grundlagen finden Sie in unserem Digital Burnbag Vault Whitepaper.',
  [ShowcaseStrings.Feat_OFFS_Cat]: 'Speicher',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'ECIES-Verschlüsselung',
  [ShowcaseStrings.Feat_OFFS_Tech2]: 'Reed-Solomon-FEC',
  [ShowcaseStrings.Feat_OFFS_Tech3]: 'Blockchain-Hauptbuch',
  [ShowcaseStrings.Feat_OFFS_HL1]:
    'Basierend auf dem ursprünglichen OFFS-Konzept — Dateien per XOR mit Zufallsdaten gemischt, sodass kein Block identifizierbare Inhalte enthält',
  [ShowcaseStrings.Feat_OFFS_HL2]:
    'Erweitert um asymmetrische ECIES-Verschlüsselung für eine kryptografische Sicherheitsschicht über XOR-Verschleierung hinaus',
  [ShowcaseStrings.Feat_OFFS_HL3]:
    'Reed-Solomon-FEC-Paritätsblöcke bieten Redundanz und Langlebigkeit, auch wenn Knoten offline gehen',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'Das digitale Blockchain-Hauptbuch führt manipulationssichere Aufzeichnungen aller Blockoperationen',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    'Digital Burnbag garantiert Dateivernichtung, ohne dass Inhalte jemals zugegriffen wurden — über das Hauptbuch nachweisbar',
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'Mathematische Grundlagen im Detail im Digital Burnbag Vault Whitepaper — https://github.brightchain.org/docs/papers/digital-burnbag-vault/',
  [ShowcaseStrings.Feat_Messaging_Title]: 'Nachrichtensystem',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    'Sichere, dezentralisierte Nachrichtenübermittlung mit Verschlüsselung, Routing, Zustellverfolgung und Gossip-Protokoll für epidemische Verbreitung. Aufgebaut auf dem Block-Store mit WebSocket-Echtzeitzustellung.',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'Gossip-Protokoll',
  [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
  [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Bloom-Filter',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    'Verschlüsselte Nachrichtenübermittlung mit empfängerspezifischer oder gemeinsamer Schlüsselverschlüsselung',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    'Epidemische Gossip-Verbreitung mit prioritätsbasierter Zustellung',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    'Automatische Wiederholung mit exponentiellem Backoff bei fehlgeschlagenen Zustellungen',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    'Bloom-Filter-basiertes Erkennungsprotokoll für effiziente Blocklokalisierung',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'Echtzeit-WebSocket-Ereignisse für Nachrichtenzustellung und Bestätigungen',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    'Persistente Zustellverfolgung mit empfängerspezifischem Status',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    'RFC 5322/2045-konforme E-Mail mit Threading, BCC-Datenschutz, Anhängen, Posteingangsoperationen und Zustellverfolgung. Vollständige E-Mail-Komposition, -Versand und -Abruf auf Messaging-Infrastruktur aufgebaut.',
  [ShowcaseStrings.Feat_BrightMail_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
  [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
  [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
  [ShowcaseStrings.Feat_BrightMail_Tech4]: 'Threading',
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    'RFC-konformes Internet-Nachrichtenformat mit MIME-Unterstützung',
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    'Threading über In-Reply-To- und References-Header',
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    'BCC-Datenschutz mit kryptographisch getrennten Kopien pro Empfänger',
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    'Mehrere Anhänge mit Content-ID-Unterstützung für eingebettete Bilder',
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    'Posteingangsoperationen: Abfrage, Filter, Sortierung, Suche mit Paginierung',
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    'Zustellverfolgung pro Empfänger über Gossip-Bestätigungen',
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    'Mehrere Verschlüsselungsschemata: ECIES, gemeinsamer Schlüssel, S/MIME',
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    'Digitale Signaturen zur Absenderauthentifizierung',
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    'Weiterleitung/Antwort mit RFC-konformen Resent-*-Headern',
  [ShowcaseStrings.Feat_BrightCal_Desc]:
    'Google Calendar-konkurrenzfähiges gemeinsames Kalendersystem, integriert mit BrightMail. iCal/CalDAV-kompatibel, Ende-zu-Ende-verschlüsselte Ereignisse, granulare Freigabeberechtigungen, Terminbuchung und Konflikterkennung.',
  [ShowcaseStrings.Feat_BrightCal_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_BrightCal_Tech1]: 'iCal/RFC 5545',
  [ShowcaseStrings.Feat_BrightCal_Tech2]: 'CalDAV',
  [ShowcaseStrings.Feat_BrightCal_Tech3]: 'ECIES-Verschlüsselung',
  [ShowcaseStrings.Feat_BrightCal_Tech4]: 'iTIP/iMIP',
  [ShowcaseStrings.Feat_BrightCal_HL1]:
    'RFC 5545 iCalendar-Format mit vollständiger VEVENT-, VTODO-, VJOURNAL- und VFREEBUSY-Unterstützung',
  [ShowcaseStrings.Feat_BrightCal_HL2]:
    'CalDAV-Serverprotokoll für native Synchronisation mit Apple Calendar, Thunderbird und Android',
  [ShowcaseStrings.Feat_BrightCal_HL3]:
    'Ende-zu-Ende-verschlüsselte Ereignisse als ECIES-verschlüsselte Blöcke im Owner-Free Filesystem gespeichert',
  [ShowcaseStrings.Feat_BrightCal_HL4]:
    'Granulare Freigabe: nur Frei/Belegt anzeigen, Details anzeigen, bearbeiten oder delegieren pro Kalender pro Benutzer',
  [ShowcaseStrings.Feat_BrightCal_HL5]:
    'Termineinladungen über iTIP/iMIP mit BrightMail-Integration und RSVP-Verfolgung',
  [ShowcaseStrings.Feat_BrightCal_HL6]:
    'Konflikterkennung und Verfügbarkeitsabfragen über gemeinsame Kalender mit Frei/Belegt-Aggregation',
  [ShowcaseStrings.Feat_BrightCal_HL7]:
    'Buchungsseiten mit konfigurierbaren Verfügbarkeitsfenstern, Pufferzeiten und Bestätigungsabläufen',
  [ShowcaseStrings.Feat_BrightCal_HL8]:
    'Unterstützung wiederkehrender Ereignisse mit RRULE, EXDATE und Überschreibung einzelner Vorkommen',
  [ShowcaseStrings.Feat_BrightCal_HL9]:
    'Mehrzeitzonen-Anzeige mit automatischer Sommerzeit-Behandlung und ereignisspezifischer Zeitzonenfixierung',
  [ShowcaseStrings.Feat_BrightCal_HL10]:
    'Tag/Woche/Monat/Agenda-UI-Widgets mit Drag-and-Drop-Umplanung und Inline-Bearbeitung',
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Discord-konkurrenzfähige Kommunikationsplattform mit Signal-Niveau Ende-zu-Ende-Verschlüsselung. Direktnachrichten, Gruppenchats und Kanäle mit Echtzeit-Präsenz, Tippindikatoren und rollenbasierten Berechtigungen.',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'E2E-Verschlüsselung',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Schlüsselrotation',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    'Direktnachrichten für verschlüsselte Einzelgespräche',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    'Gruppenchats mit gemeinsamer Verschlüsselung und automatischer Schlüsselrotation',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'Kanäle mit vier Sichtbarkeitsmodi: öffentlich/privat/geheim/unsichtbar',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'Echtzeit-Präsenzsystem: online/offline/inaktiv/nicht stören',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'Rollenbasierte Berechtigungen: Eigentümer/Admin/Moderator/Mitglied',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'Tippindikatoren, Reaktionen und Nachrichtenbearbeitungen über WebSocket',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'Zeitlich und nutzungsbegrenzte Einladungs-Token für Kanäle',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'Volltextsuche in Nachrichten innerhalb der Kanalhistorie',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'Nahtlose Konversationsbeförderung von Direktnachrichten zu Gruppen',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    '1Password-konkurrenzfähiger Passwort-Schlüsselbund mit VCBL-Architektur für effiziente verschlüsselte Anmeldedatenspeicherung. TOTP/2FA, Datenleck-Erkennung, Notfallzugang und Import von großen Passwort-Managern.',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'Identität',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
  [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
  [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Shamir-Geheimnisteilung',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    'VCBL (Vault Constituent Block List) für effiziente verschlüsselte Speicherung',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    'Mehrere Eintragstypen: Anmeldung, sichere Notiz, Kreditkarte, Identität',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    'Kryptographisch sichere Passwortgenerierung mit Einschränkungen',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    'TOTP/2FA-Unterstützung mit QR-Code-Generierung für Authenticator-Apps',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'k-Anonymitäts-Datenleck-Erkennung über Have I Been Pwned API',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'Nur-Anhängen verschlüsselte Prüfprotokollierung für alle Tresor-Operationen',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    'Notfallzugang über Shamirs Geheimnisteilung zur Wiederherstellung',
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'Mehrmitglieder-Tresorfreigabe mit ECIES-Verschlüsselung pro Empfänger',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    'Import von 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'Browser-Erweiterung Autofill-API bereit',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'Datenschutzwahrende Wahlen mit Paillier homomorpher Verschlüsselung und ECDH-abgeleiteten Schlüsseln. Unterstützt 15+ Abstimmungsmethoden von einfacher Mehrheitswahl bis komplexer Rangfolgewahl mit Regierungskonformitätsfunktionen.',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'Regierungsführung',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Paillier-Verschlüsselung',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
  [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Homomorphe Kryptographie',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'ECDH-zu-Paillier-Brücke leitet homomorphe Schlüssel aus ECDSA/ECDH-Schlüsseln ab',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    'Datenschutzwahrende Stimmenaggregation über homomorphe Addition',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    '15+ Abstimmungsmethoden: Mehrheitswahl, Zustimmung, Gewichtet, Borda, Bewertung, Rangfolge, IRV, STAR, STV, Quadratisch, Konsens usw.',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'Sicherheitsklassifikationen: vollständig homomorph, mehrrundig, unsicher',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    'Regierungskonformität: unveränderliche Prüfprotokolle, öffentlicher Aushang, verifizierbare Quittungen',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    'Hierarchische Aggregation: Wahlbezirk → Landkreis → Bundesland → National',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    '128-Bit-Sicherheitsniveau mit Miller-Rabin-Primzahltest (256 Runden)',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'Plattformübergreifender Determinismus (Node.js- und Browser-Umgebungen)',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    'Timing-Angriffsresistenz mit konstantzeitigen Operationen',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    'Twitter-konkurrenzfähiges dezentralisiertes soziales Netzwerk mit einzigartiger FontAwesome-Icon-Markup-Syntax. Beiträge, Threads, Direktnachrichten, Verbindungslisten, Hubs für Privatsphäre und Echtzeit-Benachrichtigungen über WebSocket.',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Echtzeit-Messaging',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Verbindungsverwaltung',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    'Beiträge mit 280-Zeichen-Limit, Markdown und einzigartiger {{icon}}-Syntax für FontAwesome',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    'Thread-Konversationen mit 10-Ebenen-Verschachtelung und Antwortketten',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    'Verbindungslisten, Kategorien und Hubs zur Organisation von Beziehungen',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    'Direktnachrichten mit Lesebestätigungen, Tippindikatoren und Reaktionen',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    'Gruppenkonversationen (bis zu 50 Teilnehmer) mit Admin-Rollen',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    'Nachrichtenanfragen für Nicht-Follower mit Akzeptieren/Ablehnen-Workflow',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'Echtzeit-Benachrichtigungen über WebSocket mit intelligenter Gruppierung',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    'Benachrichtigungseinstellungen: Ruhezeiten, Nicht-Stören-Modus, kategoriebasierte Einstellungen',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'Geschützte Konten mit Folgeanfrage-Genehmigungsworkflow',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'Verbindungseinblicke: Stärkeberechnung, gemeinsame Verbindungen, Vorschläge',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'Hub-basierte Inhaltssichtbarkeit für private Gruppenfreigabe',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'Rich-Text-Formatierung mit XSS-Prävention und Emoji-Unterstützung',
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Vermittelte Anonymität & BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    'Ausgefeilter Datenschutzmechanismus, der anonyme Operationen ermöglicht und gleichzeitig Rechenschaftspflicht aufrechterhält. Identitätsinformationen werden verschlüsselt und mittels Shamirs Geheimnisteilung aufgeteilt, nur durch Mehrheitskonsens des BrightTrust rekonstruierbar.',
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Regierungsführung',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: 'Shamirs Geheimnisteilung',
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Vorwärtsfehlerkorrektur',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'BrightTrust-Konsens',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Anonym posten mit verschlüsselter Identitätssicherung',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Identitätsfragmente über ~24 BrightTrust-Mitglieder verteilt',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'Mehrheitsabstimmung erforderlich zur Rekonstruktion von Identitätsinformationen',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    'Zeitlich begrenzte Rechenschaftspflicht — Daten verfallen nach Verjährungsfrist',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'Rechtskonformitätsmechanismus für FISA-Beschlüsse und Gerichtsbeschlüsse',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    'Permanenter Datenschutz nach Ablauf der Aufbewahrungsfrist',
  [ShowcaseStrings.Feat_Encryption_Title]: 'Fortschrittlicher Verschlüsselungs-Stack',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    'Modernste Verschlüsselung, die ECIES für Schlüsselableitung mit AES-256-GCM für Dateisicherheit kombiniert. Vollständiges Kryptosystem mit BIP39/32-Authentifizierung und SECP256k1 Elliptische-Kurven-Kryptographie.',
  [ShowcaseStrings.Feat_Encryption_Cat]: 'Kryptographie',
  [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
  [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
  [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'ECIES-Verschlüsselung mit benutzerspezifischer Schlüsselableitung',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    'AES-256-GCM für authentifizierte Dateiverschlüsselung',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'BIP39/32 mnemonikbasierte Authentifizierung',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'SECP256k1 Elliptische Kurve (Ethereum-kompatibler Schlüsselraum)',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'Verifizierte Datenintegrität auf Blockebene mit XOR-Funktionalität',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'Plattformübergreifende kryptographische Operationen',
  [ShowcaseStrings.Feat_Storage_Title]: 'Dezentralisiertes Speichernetzwerk',
  [ShowcaseStrings.Feat_Storage_Desc]:
    'Peer-to-Peer verteiltes Dateisystem, das ungenutzten Speicher auf persönlichen Geräten monetarisiert. IPFS-ähnliche Architektur mit energieeffizientem Proof-of-Work und reputationsbasierten Anreizen.',
  [ShowcaseStrings.Feat_Storage_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'P2P-Netzwerke',
  [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
  [ShowcaseStrings.Feat_Storage_Tech3]: 'Block-Replikation',
  [ShowcaseStrings.Feat_Storage_HL1]:
    'Ungenutzten Speicherplatz auf persönlichen Computern und Geräten nutzen',
  [ShowcaseStrings.Feat_Storage_HL2]:
    'Verteilte Hash-Tabelle (DHT) für effiziente Blockverfolgung',
  [ShowcaseStrings.Feat_Storage_HL3]:
    'Konfigurierbare Blockhaltbarkeit und Zugänglichkeitsanforderungen',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'Dynamische Replikation basierend auf Blocknützlichkeit und Zugriffsmustern',
  [ShowcaseStrings.Feat_Storage_HL5]:
    'Energieeffiziente Alternative zum traditionellen Proof-of-Work-Mining',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'Speicher-Credits und Bandbreitenkompensation für Knotenbetreiber',
  [ShowcaseStrings.Feat_Sealing_Title]: 'BrightTrust-basierte Dokumentenversiegelung',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Fortschrittlicher Dokumentenschutz mit anpassbaren Schwellenwertanforderungen für die Zugriffswiederherstellung. Gruppen können sensible Informationen versiegeln, die konfigurierbaren Mehrheitskonsens zum Entsiegeln erfordern.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Regierungsführung',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Schwellenwert-Kryptographie',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Geheimnisteilung',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Mehrparteienberechnung',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Dokumente mit konfigurierbaren Quorum-Schwellenwerten versiegeln (z.B. 3-von-5, 7-von-10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Verteilte Fragmentspeicherung über vertrauenswürdige BrightTrust-Mitglieder',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    'Mathematische Sicherheitsgarantie bis zum Erreichen des Schwellenwerts',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    'Flexible Entsiegelung für Rechtskonformität oder Gruppenentscheidungen',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    'Unterstützt organisatorische Governance- und Compliance-Workflows',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    'Zeitbasierter Ablauf für automatischen Datenschutz',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'Ausgefeiltes Identitätsmanagement, das Benutzerdatenschutz und -kontrolle gewährleistet. Unterstützung für registrierte Aliase, anonymes Posten und kryptographische Identitätsverifizierung.',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'Identität',
  [ShowcaseStrings.Feat_BrightID_Tech1]: 'Public-Key-Infrastruktur',
  [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'Identitätsmanagement',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'BIP39/32 mnemonikbasierte Identitätsgenerierung',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'Mehrere registrierte Aliase pro Benutzerkonto',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'Anonymes Posten mit optionaler Identitätswiederherstellung',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    'Public-Key-basierte Authentifizierung (SECP256k1)',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'Vorwärtsfehlerkorrektur für Identitätssicherung',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'Datenschutzwahrende Identitätsverifizierung',
  [ShowcaseStrings.Feat_Reputation_Title]: 'Reputation & Energieverfolgung',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'Revolutionäres Reputationssystem, das Energiekosten in Joules verfolgt. Gute Akteure genießen minimale Proof-of-Work-Anforderungen, während schlechte Akteure erhöhte Rechenlasten tragen.',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Proof of Work',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'Reputationssysteme',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'Energiebuchhaltung',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    'Energiekosten in tatsächlichen Joules gemessen für reale Korrelation',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'Dynamisches Proof-of-Work basierend auf Benutzerreputation',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'Inhaltsersteller werden belohnt, wenn ihre Inhalte konsumiert werden',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    'Schlechte Akteure werden durch erhöhte Rechenanforderungen gedrosselt',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'Speicher- und Bandbreitenkosten werden verfolgt und kompensiert',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'Fördert positive Beiträge und qualitativ hochwertige Inhalte',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'Blocktemperatur & Lebenszyklus',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    'Intelligentes Blockmanagement mit Hot/Cold-Speicherebenen. Häufig abgerufene Blöcke bleiben „heiß" mit hoher Replikation, während ungenutzte Blöcke abkühlen und ablaufen können.',
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Speicher',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Speicher-Tiering',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Block-Lebenszyklus',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Zugriffsmuster',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    '„Mindestens aufbewahren bis"-Verträge für minimale Speicherdauer',
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'Blocknützlichkeit steigt mit Zugriff, Veralterung nimmt ab',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'Dynamische Replikation basierend auf Zugriffsmustern und Temperatur',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    'Automatische Vertragsverlängerung für häufig abgerufene Blöcke',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    'Energie-Credits werden für Blöcke zurückgegeben, die sich als nützlich erweisen',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    'Konfigurierbare Haltbarkeits- und Zugänglichkeitsanforderungen',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'Null Mining-Verschwendung',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    'Auf Ethereums Grundlage aufgebaut, aber ohne Proof-of-Work-Einschränkungen entwickelt. Alle Rechenarbeit dient nützlichen Zwecken — Speicherung, Verifizierung und Netzwerkoperationen.',
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Netzwerk',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Ethereum-Schlüsselraum',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Effizienter Konsens',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Grüne Blockchain',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    'Kein verschwenderisches Mining — alle Berechnungen dienen nützlichen Zwecken',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Ethereum-kompatibler Schlüsselraum und Kryptographie (SECP256k1)',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Proof-of-Work wird nur zur Transaktionsdrosselung verwendet',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'Energieeffiziente Konsensmechanismen',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    'Nachhaltige Blockchain ohne Umweltauswirkungen',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    'Fokus auf Speicher und Berechnung, nicht auf künstliche Knappheit',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Plattformübergreifender Determinismus',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Identische kryptographische Operationen in Node.js- und Browser-Umgebungen. Deterministische Schlüsselgenerierung gewährleistet konsistente Ergebnisse unabhängig von der Plattform.',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Kryptographie',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Browser Crypto',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Deterministische Algorithmen',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'Einheitliche kryptographische Operationen über Plattformen hinweg',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    'Deterministische Zufallsbitgenerierung (HMAC-DRBG)',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'Konsistente Paillier-Schlüsselableitung aus ECDH-Schlüsseln',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'Browser- und Node.js-Kompatibilität',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    'Reproduzierbare kryptographische Ergebnisse',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'Plattformübergreifende Tests und Verifizierung',
  [ShowcaseStrings.Feat_Contracts_Title]: 'Digitale Verträge & Governance',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    'Smart-Contract-Fähigkeiten für dezentralisierte Anwendungen. BrightTrust-basierte Governance mit konfigurierbaren Abstimmungsschwellenwerten für Netzwerkentscheidungen und Richtliniendurchsetzung.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Regierungsführung',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Smart Contracts',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Regierungsführung',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Abstimmungssysteme',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Digitale Vertragsausführung im dezentralisierten Netzwerk',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'BrightTrust-basierte Entscheidungsfindung für Netzwerk-Governance',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    'Konfigurierbare Mehrheitsanforderungen für verschiedene Aktionen',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'Homomorphe Abstimmung für datenschutzwahrende Governance',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'Reputationsgewichtete Abstimmungsmechanismen',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    'Transparente und überprüfbare Governance-Prozesse',
  [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js (Fork)',
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    'Erweiterte Implementierung von Shamirs Geheimnisteilung für sichere Datenaufteilung und -rekonstruktion. Reines TypeScript mit nativer Browser-Unterstützung, kryptographisch geprüft und optimiert für die Aufteilung beliebiger Geheimnisse (Passwörter, Schlüssel, Dateien) in schwellenwertwiederherstellbare Anteile.',
  [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Kryptographie',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: 'Shamirs Geheimnisteilung',
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Datensicherheit',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    'Geheimnisse in n Anteile aufteilen mit konfigurierbarer t-von-n Schwellenwertwiederherstellung',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    'Informationstheoretisch sicher — Anteile unterhalb des Schwellenwerts offenbaren keine Informationen',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Cure53-Sicherheitsaudit (Juli 2019) ohne gefundene Probleme',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'Native Browser-Unterstützung ohne Polyfills (crypto.getRandomValues)',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'Plattformübergreifende deterministische Operationen (Node.js und Browser)',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    'Vollständige TypeScript-Unterstützung mit umfassenden Typdefinitionen',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    'Passwörter, Dateien und Schlüssel in/aus Hex konvertieren mit automatischem Padding',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    'Neue Anteile dynamisch aus bestehenden Anteilen generieren',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    'Konfigurierbares Galois-Feld (3-20 Bit) mit Unterstützung für bis zu 1.048.575 Anteile',
  [ShowcaseStrings.Feat_Burnbag_Desc]:
    'Zero-Knowledge-Sicherheitsspeicher mit automatisierten Ausfallsicherungsprotokollen. Kryptographische Löschung zerstört das Rezept (Karte + Schlüssel) und macht verstreute verschlüsselte Blöcke bei Auslösung dauerhaft unwiederbringlich.',
  [ShowcaseStrings.Feat_Burnbag_Cat]: 'Kryptographie',
  [ShowcaseStrings.Feat_Burnbag_Tech1]: 'Kryptographische Löschung',
  [ShowcaseStrings.Feat_Burnbag_Tech2]: 'Totmannschalter',
  [ShowcaseStrings.Feat_Burnbag_Tech3]: 'Kanarienvogel-Protokoll',
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    'Zero-Knowledge-Architektur: Der Dienstanbieter kann unter normalen Umständen nicht auf Benutzerdaten zugreifen',
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    'Kryptographische Löschung: Die Zerstörung des Rezepts macht verstreute Blöcke dauerhaft unwiederbringlich',
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    'Totmannschalter: Herzschlagüberwachung löst bei Inaktivität die automatische Rezeptzerstörung aus',
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    'Kanarienvogel-Protokoll: Regelwerk mit Drittanbieter-API-Überwachung (Twitter, Fitbit, Google, GitHub)',
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    'Zwangserkennung: Spezielle Zwangscodes lösen Zerstörungsprotokolle anstelle des normalen Zugriffs aus',
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    'Konfigurierbare Protokollaktionen: Dateilöschung, Datenverteilung, öffentliche Offenlegung oder benutzerdefinierte Reaktionen',
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    'Duale Schlüsselarchitektur: Benutzergesteuerte BIP39-Schlüssel plus optionale System-Treuhandschlüssel für die Protokollausführung',
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    'Nachfolgequorum: Vorab autorisierte vertrauenswürdige Kontakte für sichere Datenfreigabe oder -wiederherstellung',
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    'Mutation beim Lesen: Jeder unbefugte Rezeptzugriff löst eine permanente, unveränderliche Ledger-Mutation aus',
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    'Konfigurierbare Vertrauensstufen: Zero-Trust, bedingtes Vertrauen oder Hybrid je nach Dateisensibilität',
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    'Mehrsprachige Unterstützung: Englisch, Französisch, Spanisch, Ukrainisch und Mandarin-Chinesisch',
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    'ECIES-Verschlüsselung mit secp256k1-Schlüsseln und AES-256-GCM für Dateisicherheit',

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    'Eine patienteneigene elektronische Krankenakte, aufgebaut auf BrightChain-Kryptographie. Ihre Gesundheitsdaten bleiben Ihre — verschlüsselt, dezentralisiert und nur mit Ihren Schlüsseln zugänglich.',
  [ShowcaseStrings.Feat_BrightChart_Cat]: 'Identität',
  [ShowcaseStrings.Feat_BrightChart_Tech1]: 'Eigentümerfreie EKA',
  [ShowcaseStrings.Feat_BrightChart_Tech2]: 'Ende-zu-Ende-Verschlüsselung',
  [ShowcaseStrings.Feat_BrightChart_Tech3]: 'Patientenkontrollierter Zugang',
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    'Der Patient besitzt und kontrolliert alle Krankenakten über kryptographische Schlüssel',
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    'Ende-zu-Ende verschlüsselte Gesundheitsdaten auf BrightChain gespeichert — kein zentraler Server zum Hacken',
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    'Granulare Einwilligung: Teilen Sie bestimmte Akten mit Anbietern über BrightTrust-Delegation',
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    'Unveränderlicher Prüfpfad für jeden Zugriff, jede Bearbeitung und jedes Freigabeereignis',
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    'Portabel zwischen Anbietern — keine Herstellerbindung, keine Daten als Geisel',
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    'Notfallzugang über Shamir-Geheimnisteilung mit konfigurierbarem Quorum',
  [ShowcaseStrings.Feat_BrightChart_HL7]:
    'Versionierte Krankengeschichte mit kryptographischer Integritätsverifizierung',
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    'Vom Anbieter signierte Einträge gewährleisten die Authentizität von Diagnosen und Verschreibungen',
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    'Offline-fähig: verschlüsselte Akten lokal zwischengespeichert, bei Verbindung synchronisiert',
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    'Integrierter Digital Burnbag für sensible Akten, die garantierte Vernichtung erfordern',
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    'Interoperable Datenschicht für FHIR-kompatiblen Austausch von Gesundheitsakten',
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    'Zero-Knowledge-Beweise ermöglichen Versicherungsverifizierung ohne Offenlegung der vollständigen Krankengeschichte',

  // Remaining
  [ShowcaseStrings.Soup_Time]: 'Zeit',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'Datei konnte nicht abgerufen werden: {ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Bitte laden Sie eine .cbl-Datei hoch',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    'CBL geladen! Datei: {NAME} ({BLOCKS} Blöcke). Sie können die Datei jetzt abrufen, wenn alle Blöcke in der Suppe sind.',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'CBL konnte nicht analysiert werden: {ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    'Datei erfolgreich rekonstruiert! Größe: {SIZE} Bytes. Die Datei wurde heruntergeladen.',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'Magnet-URL konnte nicht verarbeitet werden: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: 'Nachricht gesendet und in der Suppe gespeichert!',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'Nachricht konnte nicht gesendet werden: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'Nachricht aus der Suppe abgerufen: {TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'Nachricht konnte nicht abgerufen werden: {ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: 'Magnet-URL in die Zwischenablage kopiert!',
  [ShowcaseStrings.Anim_PauseBtn]: 'Animation pausieren',
  [ShowcaseStrings.Anim_PlayBtn]: 'Animation abspielen',
  [ShowcaseStrings.Anim_ResetBtn]: 'Animation zurücksetzen',
  [ShowcaseStrings.Anim_SpeedLabel]: 'Geschwindigkeit: {SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 Leistungsmonitor',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'Bildrate:',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'Bildzeit:',
  [ShowcaseStrings.Anim_PerfDropped]: 'Verlorene Bilder:',
  [ShowcaseStrings.Anim_PerfMemory]: 'Speicher:',
  [ShowcaseStrings.Anim_PerfSequences]: 'Sequenzen:',
  [ShowcaseStrings.Anim_PerfErrors]: 'Fehler:',
  [ShowcaseStrings.Anim_WhatHappening]: 'Was passiert:',
  [ShowcaseStrings.Anim_DurationLabel]: 'Dauer:',
  [ShowcaseStrings.Anim_SizeInfo]: 'Größe: {SIZE} Bytes | Blöcke: {BLOCKS}',

  // Educational/Encoding
  [ShowcaseStrings.Edu_CloseTooltip]: 'Tooltip schließen',
  [ShowcaseStrings.Edu_WhatsHappening]: '🔍 Was passiert',
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 Warum es wichtig ist',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Technische Details',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Verwandte Konzepte',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ Visuelle Hinweise',
  [ShowcaseStrings.Edu_GetHelp]: 'Hilfe zu diesem Schritt',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ Verstanden - Weiter',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ Diesen Schritt überspringen',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 BrightChain-Konzeptglossar',
  [ShowcaseStrings.Edu_CloseGlossary]: 'Glossar schließen',
  [ShowcaseStrings.Edu_BackToGlossary]: '← Zurück zum Glossar',
  [ShowcaseStrings.Edu_Definition]: 'Definition',
  [ShowcaseStrings.Edu_TechnicalDefinition]: 'Technische Definition',
  [ShowcaseStrings.Edu_Examples]: 'Beispiele',
  [ShowcaseStrings.Edu_RelatedTerms]: 'Verwandte Begriffe',
  [ShowcaseStrings.Edu_SearchPlaceholder]: 'Konzepte suchen...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'Prozessübersicht',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: 'Was wir erreicht haben',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Technische Ergebnisse',
  [ShowcaseStrings.Edu_WhatsNext]: 'Was kommt als Nächstes?',
  [ShowcaseStrings.Edu_LearningProgress]: 'Lernfortschritt',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED} von {TOTAL} Schritten abgeschlossen',
  [ShowcaseStrings.Enc_Title]: '🎬 Datei-Kodierungsanimation',
  [ShowcaseStrings.Enc_Subtitle]:
    'Beobachten Sie, wie Ihre Datei in BrightChain-Blöcke umgewandelt wird',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 Dateifragmente ({COUNT})',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    'Jedes Fragment wird zu einem Block in der Suppe',
  [ShowcaseStrings.Enc_EduWhatsHappening]: '🎓 Was gerade passiert',
  [ShowcaseStrings.Enc_TechDetails]: 'Technische Details:',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'Blockgröße: {SIZE} Bytes',
  [ShowcaseStrings.Enc_ExpectedChunks]: 'Erwartete Fragmente: {COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    'Jedes Fragment wird zu einem Block in der Suppe',
  [ShowcaseStrings.Enc_WhyPadding]: 'Warum Auffüllung?',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'Alle Blöcke müssen die gleiche Größe haben',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'Zufällige Auffüllung verhindert Datenanalyse',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'Auffüllung wird bei der Rekonstruktion entfernt',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'Zweck der Prüfsumme:',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Gewährleistet Datenintegrität',
  [ShowcaseStrings.Enc_UniqueIdentifier]: 'Wird als eindeutiger Blockidentifikator verwendet',
  [ShowcaseStrings.Enc_EnablesVerification]:
    'Ermöglicht Verifizierung beim Abruf',

  // ProcessCompletionSummary
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Wichtige Lernpunkte',
  [ShowcaseStrings.Edu_CloseSummary]: 'Zusammenfassung schließen',
  [ShowcaseStrings.Edu_Overview]: 'Übersicht',
  [ShowcaseStrings.Edu_Achievements]: 'Erfolge',
  [ShowcaseStrings.Edu_Technical]: 'Technisch',
  [ShowcaseStrings.Edu_NextSteps]: 'Nächste Schritte',
  [ShowcaseStrings.Edu_Previous]: '← Zurück',
  [ShowcaseStrings.Edu_Next]: 'Weiter →',
  [ShowcaseStrings.Edu_Finish]: 'Fertig',

  // EducationalModeControls
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 Lernmodus',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'Animationsgeschwindigkeit:',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Sehr langsam)',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Langsam)',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Moderat)',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x (Normal)',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Schnell)',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Sehr schnell)',
  [ShowcaseStrings.Edu_StepByStep]: 'Schritt-für-Schritt-Modus',
  [ShowcaseStrings.Edu_ShowTooltips]: 'Tooltips anzeigen',
  [ShowcaseStrings.Edu_ShowExplanations]: 'Erklärungen anzeigen',
  [ShowcaseStrings.Edu_AutoAdvance]: 'Schritte automatisch fortsetzen',

  // Privacy Policy Page
  [ShowcaseStrings.PP_Title]: 'Datenschutzrichtlinie',
  [ShowcaseStrings.PP_LastUpdated]: 'Letzte Aktualisierung: 20. April 2026',
  [ShowcaseStrings.PP_BackToHome]: '← Zurück zur Startseite',

  // Section 1: Introduction
  [ShowcaseStrings.PP_S1_Title]: '1. Einleitung',
  [ShowcaseStrings.PP_S1_P1]:
    'BrightChain ist eine dezentrale Open-Source-Plattform, die von Digital Defiance betrieben wird, einer gemeinnützigen Organisation nach 501(c)(3) („wir", „uns" oder „unser"). Diese Datenschutzrichtlinie beschreibt, wie wir Informationen erfassen, verwenden, speichern und offenlegen, wenn Sie die BrightChain-Plattform, die Website, die Anwendungen und die zugehörigen Dienste (zusammen die „Dienste") nutzen.',
  [ShowcaseStrings.PP_S1_P2]:
    'Durch den Zugriff auf die Dienste oder deren Nutzung bestätigen Sie, dass Sie diese Datenschutzrichtlinie gelesen und verstanden haben und sich an sie gebunden fühlen. Wenn Sie nicht einverstanden sind, dürfen Sie die Dienste nicht nutzen.',

  // Section 2: How BrightChain Works
  [ShowcaseStrings.PP_S2_Title]:
    '2. Wie BrightChain funktioniert — Architektonischer Kontext',
  [ShowcaseStrings.PP_S2_P1]:
    'BrightChain basiert auf dem Owner-Free Filesystem (OFF)-Modell. Alle im Netzwerk gespeicherten Daten werden in Blöcke fester Größe aufgeteilt, mit kryptographisch zufälligen Blöcken XOR-verknüpft (ein Prozess namens „TUPLE-Whitening") und auf teilnehmende Knoten verteilt. Daraus ergibt sich:',
  [ShowcaseStrings.PP_S2_Li1]:
    'Einzelne Blöcke sind von Zufallsdaten nicht zu unterscheiden und können ohne den vollständigen Satz der konstituierenden Blöcke und die entsprechende Constituent Block List (CBL) nicht gelesen werden.',
  [ShowcaseStrings.PP_S2_Li2]:
    'Daten können optional mit dem Elliptic Curve Integrated Encryption Scheme (ECIES) unter Verwendung von AES-256-GCM verschlüsselt werden, was eine empfängerspezifische Vertraulichkeit zusätzlich zur plausiblen Abstreitbarkeit durch TUPLE-Whitening bietet.',
  [ShowcaseStrings.PP_S2_Li3]:
    'Knotenbetreiber — einschließlich Digital Defiance — können im Allgemeinen den Inhalt, die Eigentümerschaft oder die Art eines einzelnen im Netzwerk gespeicherten Blocks nicht bestimmen.',
  [ShowcaseStrings.PP_S2_P2]:
    'Diese Architektur bedeutet, dass die in dieser Richtlinie beschriebenen Datenschutzmaßnahmen in vielen Fällen durch Mathematik und nicht nur durch Richtlinien durchgesetzt werden.',

  // Section 3: Information We Collect
  [ShowcaseStrings.PP_S3_Title]: '3. Informationen, die wir erfassen',
  [ShowcaseStrings.PP_S3_1_Title]: '3.1 Kontoinformationen',
  [ShowcaseStrings.PP_S3_1_P1]:
    'Wenn Sie ein BrightChain-Konto erstellen, erfassen wir einen Benutzernamen, eine E-Mail-Adresse und Ihren öffentlichen kryptographischen Schlüssel (abgeleitet von Ihrem BIP39-Mnemonic). Wir erfassen, speichern oder haben keinen Zugang zu Ihrer Mnemonic-Phrase oder Ihren privaten Schlüsseln.',
  [ShowcaseStrings.PP_S3_2_Title]: '3.2 Nutzergenerierte Inhalte',
  [ShowcaseStrings.PP_S3_2_P1]:
    'Dateien, Nachrichten, Anmeldedaten und andere Inhalte, die Sie im Netzwerk speichern, werden in TUPLE-gebleichte Blöcke aufgeteilt. Wir haben nicht die Möglichkeit, diese Inhalte zu lesen, zu rekonstruieren oder zu inspizieren. Wenn Sie die optionale ECIES-Verschlüsselung verwenden, werden die Inhalte zusätzlich für bestimmte Empfänger verschlüsselt und sind für niemanden — einschließlich uns — ohne den entsprechenden privaten Schlüssel zugänglich.',
  [ShowcaseStrings.PP_S3_3_Title]: '3.3 Automatisch erfasste Informationen',
  [ShowcaseStrings.PP_S3_3_P1]:
    'Wenn Sie mit unseren webbasierten Diensten interagieren, können wir automatisch Standard-Serverprotokolldaten erfassen, einschließlich IP-Adressen, Browsertyp, verweisende URLs, besuchte Seiten und Zeitstempel. Diese Informationen werden ausschließlich für betriebliche Zwecke verwendet (Sicherheitsüberwachung, Missbrauchsprävention und Dienstzuverlässigkeit) und werden nicht länger als 90 Tage aufbewahrt.',
  [ShowcaseStrings.PP_S3_4_Title]: '3.4 Blockchain-Ledger-Einträge',
  [ShowcaseStrings.PP_S3_4_P1]:
    'Bestimmte Operationen (Tresorerstellung, Tresorlesungen, Tresorvernichtung, Governance-Abstimmungen) werden in einem Append-Only-Blockchain-Ledger aufgezeichnet. Diese Einträge enthalten Operationstyp, Zeitstempel und kryptographische Hashes — nicht den Inhalt der zugrunde liegenden Daten. Ledger-Einträge sind konstruktionsbedingt unveränderlich und können nicht gelöscht werden.',

  // Section 4: How We Use Information
  [ShowcaseStrings.PP_S4_Title]: '4. Wie wir Informationen verwenden',
  [ShowcaseStrings.PP_S4_P1]: 'Wir verwenden die erfassten Informationen, um:',
  [ShowcaseStrings.PP_S4_Li1]:
    'Die Dienste bereitzustellen, zu warten und zu verbessern',
  [ShowcaseStrings.PP_S4_Li2]:
    'Benutzer zu authentifizieren und Konten zu verwalten',
  [ShowcaseStrings.PP_S4_Li3]:
    'Betrug, Missbrauch und Sicherheitsvorfälle zu erkennen und zu verhindern',
  [ShowcaseStrings.PP_S4_Li4]:
    'Geltende gesetzliche Verpflichtungen einzuhalten',
  [ShowcaseStrings.PP_S4_Li5]:
    'Mit Ihnen über die Dienste zu kommunizieren (z. B. Dienstankündigungen, Sicherheitswarnungen)',
  [ShowcaseStrings.PP_S4_P2]:
    'Wir verkaufen, vermieten oder handeln Ihre persönlichen Daten nicht an Dritte. Wir verwenden Ihre Daten nicht für Werbung oder Profilerstellung.',

  // Section 5: Data Storage and Security
  [ShowcaseStrings.PP_S5_Title]: '5. Datenspeicherung und Sicherheit',
  [ShowcaseStrings.PP_S5_P1]:
    'Nutzergenerierte Inhalte werden als TUPLE-gebleichte Blöcke gespeichert, die über das dezentrale Netzwerk verteilt sind. Kontometadaten (Benutzername, E-Mail, öffentlicher Schlüssel) werden in unseren Betriebsdatenbanken mit branchenüblichen Sicherheitsmaßnahmen gespeichert, einschließlich Verschlüsselung im Ruhezustand und bei der Übertragung.',
  [ShowcaseStrings.PP_S5_P2]:
    'Sobald Daten als gebleichte Blöcke gespeichert und im Netzwerk verteilt sind, können die Daten anderer Teilnehmer durch den XOR-Bleichungsprozess von denselben Blöcken abhängig werden. Das bedeutet, dass das Löschen einzelner Blöcke technisch unmöglich sein kann, ohne die Daten anderer Benutzer zu beeinträchtigen. Die Rekonstruktion einer Datei erfordert jedoch die Constituent Block List (CBL) — das geordnete Rezept der Block-Identifikatoren. Ohne die CBL sind die verteilten Blöcke rechnerisch nicht von Zufallsdaten zu unterscheiden und können nicht wieder zusammengesetzt werden. Das Löschen oder Zerstören der CBL reicht aus, um die zugrunde liegenden Daten dauerhaft unzugänglich zu machen.',
  [ShowcaseStrings.PP_S5_P3]:
    'CBLs können je nach Anwendung an verschiedenen Orten gespeichert werden. Digital Burnbag speichert CBLs in seinem Tresor-System, das von BrightDB unterstützt wird. Benutzer können CBLs auch als MagnetURL-Referenzen aufbewahren. In allen Fällen ist die Zerstörung der CBL — unabhängig davon, wo sie gespeichert ist — der wirksame Mechanismus zur Datenlöschung, selbst wenn die zugrunde liegenden Blöcke im Netzwerk bestehen bleiben.',

  // Section 6: Cryptographic Protections
  [ShowcaseStrings.PP_S6_Title]:
    '6. Kryptographische Schutzmaßnahmen und Einschränkungen',
  [ShowcaseStrings.PP_S6_P1]:
    'BrightChain verwendet starke kryptographische Schutzmaßnahmen, darunter SHA3-512-Hashing, ECIES mit secp256k1, AES-256-GCM symmetrische Verschlüsselung, HMAC-SHA3-512-Siegel und Paillier homomorphe Verschlüsselung für datenschutzwahrende Abstimmungen. Diese Schutzmaßnahmen werden durch das Protokoll durchgesetzt und sind nicht von unserer Kooperation oder unserem guten Willen abhängig.',
  [ShowcaseStrings.PP_S6_P2]:
    'Bei korrekter Verwendung kann BrightChain sehr starke Datenschutzmaßnahmen bieten. Wir garantieren jedoch nicht, dass ein bestimmter kryptographischer Algorithmus auf unbestimmte Zeit sicher bleibt. Fortschritte in der Informatik (einschließlich Quantencomputing) können die Sicherheit aktueller kryptographischer Primitive beeinträchtigen. Benutzer sind dafür verantwortlich, die ihnen zur Verfügung stehenden Schutzmaßnahmen zu verstehen und ihre Nutzung der Dienste entsprechend zu konfigurieren.',

  // Section 7: Law Enforcement
  [ShowcaseStrings.PP_S7_Title]:
    '7. Strafverfolgung und rechtliche Anfragen',
  [ShowcaseStrings.PP_S7_P1]:
    'Digital Defiance agiert als Netzwerkbetreiber und Infrastrukturanbieter. Wir kommen gültigen Rechtsverfahren nach, einschließlich Vorladungen, Gerichtsbeschlüssen und Durchsuchungsbefehlen, die von zuständigen Gerichten ausgestellt wurden, soweit dies technisch machbar ist.',
  [ShowcaseStrings.PP_S7_P2]:
    'Aufgrund des architektonischen Designs von BrightChain gilt jedoch:',
  [ShowcaseStrings.PP_S7_Li1]:
    'Wir können im Allgemeinen den Inhalt von nutzergenerierten Daten, die als TUPLE-gebleichte Blöcke gespeichert sind, nicht herausgeben, da wir nicht über die CBLs oder Entschlüsselungsschlüssel verfügen, die zur Rekonstruktion oder Entschlüsselung dieser Daten erforderlich sind.',
  [ShowcaseStrings.PP_S7_Li2]:
    'Wir können Kontometadaten (Benutzername, E-Mail, öffentlicher Schlüssel) und Serverprotokolldaten herausgeben, soweit wir sie aufbewahren.',
  [ShowcaseStrings.PP_S7_Li3]:
    'Blockchain-Ledger-Einträge sind unveränderlich und können als Reaktion auf gültige Rechtsverfahren herausgegeben werden.',
  [ShowcaseStrings.PP_S7_Li4]:
    'Wenn ein Digital Burnbag-Tresor kryptographisch zerstört wurde, ist der Vernichtungsnachweis das einzige verbleibende Artefakt — er beweist, dass die Daten verschwunden sind, nicht was die Daten enthielten.',
  [ShowcaseStrings.PP_S7_P3]:
    'Wir werden betroffene Benutzer über rechtliche Anfragen informieren, soweit dies gesetzlich zulässig ist. Wir behalten uns das Recht vor, rechtliche Anfragen anzufechten, die wir für übermäßig, rechtlich mangelhaft oder anderweitig unangemessen halten.',

  // Section 8: Brokered Anonymity
  [ShowcaseStrings.PP_S8_Title]: '8. Vermittelte Anonymität',
  [ShowcaseStrings.PP_S8_P1]:
    'BrightChain unterstützt ein Protokoll der „Vermittelten Anonymität", bei dem die wahre Identität eines Benutzers mit Shamirs Secret Sharing versiegelt und unter BrightTrust-Governance-Mitgliedern verteilt werden kann. Die Identitätswiederherstellung erfordert eine Schwellenwertabstimmung der BrightTrust-Mitglieder und unterliegt einer konfigurierbaren Verjährungsfrist, nach deren Ablauf die Identitätsfragmente dauerhaft gelöscht werden und die wahre Identität unwiederbringlich wird. Dieser Mechanismus ist darauf ausgelegt, Datenschutz und Verantwortlichkeit unter kollektiver Governance auszubalancieren.',

  // Section 9: Third-Party Services
  [ShowcaseStrings.PP_S9_Title]: '9. Dienste Dritter',
  [ShowcaseStrings.PP_S9_P1]:
    'Bestimmte Funktionen (wie die Aktivitätsüberwachung des Canary-Protokolls) können sich mit Diensten Dritter integrieren (z. B. GitHub, Fitbit, Slack). Ihre Nutzung dieser Integrationen unterliegt den jeweiligen Datenschutzrichtlinien der Drittanbieter. Wir greifen nur auf die minimal erforderlichen Informationen zu, um die angeforderte Funktionalität bereitzustellen (z. B. aktuelle Aktivitätszeitstempel für die Dead-Man\'s-Switch-Überwachung) und speichern keine Drittanbieter-Anmeldedaten auf unseren Servern — die Authentifizierung erfolgt über OAuth-Token, die Sie jederzeit widerrufen können.',

  // Section 10: Children's Privacy
  [ShowcaseStrings.PP_S10_Title]: '10. Datenschutz für Kinder',
  [ShowcaseStrings.PP_S10_P1]:
    'Die Dienste richten sich nicht an Kinder unter 13 Jahren (oder dem geltenden Alter der digitalen Einwilligung in Ihrer Gerichtsbarkeit). Wir erfassen wissentlich keine persönlichen Daten von Kindern. Wenn wir erfahren, dass wir persönliche Daten eines Kindes erfasst haben, werden wir Maßnahmen ergreifen, um diese Informationen umgehend zu löschen.',

  // Section 11: International Users
  [ShowcaseStrings.PP_S11_Title]: '11. Internationale Benutzer',
  [ShowcaseStrings.PP_S11_P1]:
    'Digital Defiance hat seinen Sitz in den Vereinigten Staaten. Wenn Sie von außerhalb der Vereinigten Staaten auf die Dienste zugreifen, können Ihre Informationen in die Vereinigten Staaten oder andere Gerichtsbarkeiten übertragen, dort gespeichert und verarbeitet werden, in denen unsere Infrastruktur betrieben wird. Durch die Nutzung der Dienste stimmen Sie einer solchen Übertragung und Verarbeitung zu.',
  [ShowcaseStrings.PP_S11_1_Title]:
    '11.1 Europäischer Wirtschaftsraum (EWR) und Vereinigtes Königreich',
  [ShowcaseStrings.PP_S11_1_P1]:
    'Wenn Sie sich im EWR oder im Vereinigten Königreich befinden, haben Sie möglicherweise Rechte gemäß der Datenschutz-Grundverordnung (DSGVO) oder der britischen DSGVO, einschließlich des Rechts auf Zugang, Berichtigung, Löschung, Einschränkung der Verarbeitung und Übertragbarkeit Ihrer personenbezogenen Daten sowie des Rechts auf Widerspruch gegen die Verarbeitung. Um diese Rechte auszuüben, kontaktieren Sie uns unter der unten angegebenen Adresse. Beachten Sie, dass bestimmte Daten (Blockchain-Ledger-Einträge, verteilte TUPLE-Blöcke) aufgrund der dezentralen und unveränderlichen Natur des Systems technisch möglicherweise nicht löschbar sind. Die nachweisbare Vernichtungsfähigkeit von BrightChain (über Digital Burnbag) ist darauf ausgelegt, die Einhaltung des Rechts auf Löschung gemäß Artikel 17 DSGVO für benutzerkontrollierte Daten zu unterstützen.',

  // Section 12: Data Retention
  [ShowcaseStrings.PP_S12_Title]: '12. Datenaufbewahrung',
  [ShowcaseStrings.PP_S12_P1]:
    'Kontometadaten werden aufbewahrt, solange Ihr Konto aktiv ist oder zur Bereitstellung der Dienste erforderlich ist. Serverprotokolle werden bis zu 90 Tage aufbewahrt. Blockchain-Ledger-Einträge werden als Teil des unveränderlichen Ledgers auf unbestimmte Zeit aufbewahrt. TUPLE-gebleichte Blöcke werden im Netzwerk gemäß den Speichervertragsbedingungen und der Energiebilanzökonomie aufbewahrt; Blöcke, deren Speicherverträge ablaufen und nicht erneuert werden, können von Knoten bereinigt werden.',

  // Section 13: Disclaimer
  [ShowcaseStrings.PP_S13_Title]:
    '13. Gewährleistungsausschluss und Haftungsbeschränkung',
  [ShowcaseStrings.PP_S13_P1]:
    'DIE DIENSTE WERDEN „WIE BESEHEN" UND „WIE VERFÜGBAR" OHNE JEGLICHE GEWÄHRLEISTUNG BEREITGESTELLT, SEI SIE AUSDRÜCKLICH, STILLSCHWEIGEND ODER GESETZLICH, EINSCHLIESSLICH, ABER NICHT BESCHRÄNKT AUF STILLSCHWEIGENDE GEWÄHRLEISTUNGEN DER MARKTGÄNGIGKEIT, EIGNUNG FÜR EINEN BESTIMMTEN ZWECK, DES EIGENTUMS UND DER NICHTVERLETZUNG.',
  [ShowcaseStrings.PP_S13_P2]:
    'DIGITAL DEFIANCE, SEINE LEITENDEN ANGESTELLTEN, DIREKTOREN, MITARBEITER, FREIWILLIGEN UND MITWIRKENDEN (EINSCHLIESSLICH JESSICA MULEIN) HAFTEN NICHT FÜR INDIREKTE, ZUFÄLLIGE, BESONDERE, FOLGE- ODER STRAFSCHÄDEN ODER FÜR ENTGANGENE GEWINNE, DATEN, NUTZUNG, GESCHÄFTSWERT ODER ANDERE IMMATERIELLE VERLUSTE, DIE SICH ERGEBEN AUS (A) IHREM ZUGANG ZU ODER IHRER NUTZUNG ODER UNFÄHIGKEIT, AUF DIE DIENSTE ZUZUGREIFEN ODER SIE ZU NUTZEN; (B) JEGLICHEM VERHALTEN ODER INHALT DRITTER IN DEN DIENSTEN; (C) JEGLICHEM AUS DEN DIENSTEN ERHALTENEN INHALT; (D) UNBEFUGTEM ZUGANG, NUTZUNG ODER ÄNDERUNG IHRER ÜBERTRAGUNGEN ODER INHALTE; ODER (E) DEM VERSAGEN EINES KRYPTOGRAPHISCHEN MECHANISMUS, UNABHÄNGIG DAVON, OB AUF GEWÄHRLEISTUNG, VERTRAG, UNERLAUBTER HANDLUNG (EINSCHLIESSLICH FAHRLÄSSIGKEIT) ODER EINER ANDEREN RECHTSTHEORIE BASIEREND, UNABHÄNGIG DAVON, OB WIR ÜBER DIE MÖGLICHKEIT EINES SOLCHEN SCHADENS INFORMIERT WURDEN.',
  [ShowcaseStrings.PP_S13_P3]:
    'IN KEINEM FALL ÜBERSTEIGT DIE GESAMTHAFTUNG VON DIGITAL DEFIANCE UND SEINEN LEITENDEN ANGESTELLTEN, DIREKTOREN, MITARBEITERN, FREIWILLIGEN UND MITWIRKENDEN FÜR ALLE ANSPRÜCHE IM ZUSAMMENHANG MIT DEN DIENSTEN DEN HÖHEREN BETRAG VON EINHUNDERT US-DOLLAR (100,00 US$) ODER DEN BETRAG, DEN SIE UNS IN DEN ZWÖLF (12) MONATEN VOR DEM ANSPRUCH GEZAHLT HABEN.',
  [ShowcaseStrings.PP_S13_P4]:
    'EINIGE GERICHTSBARKEITEN ERLAUBEN DEN AUSSCHLUSS ODER DIE BESCHRÄNKUNG BESTIMMTER GEWÄHRLEISTUNGEN ODER HAFTUNGEN NICHT. IN SOLCHEN GERICHTSBARKEITEN IST UNSERE HAFTUNG AUF DAS GESETZLICH ZULÄSSIGE HÖCHSTMASS BESCHRÄNKT.',

  // Section 14: Indemnification
  [ShowcaseStrings.PP_S14_Title]: '14. Freistellung',
  [ShowcaseStrings.PP_S14_P1]:
    'Sie erklären sich damit einverstanden, Digital Defiance, seine leitenden Angestellten, Direktoren, Mitarbeiter, Freiwilligen und Mitwirkenden (einschließlich Jessica Mulein) von und gegen alle Ansprüche, Verbindlichkeiten, Schäden, Verluste, Kosten und Ausgaben (einschließlich angemessener Anwaltsgebühren) freizustellen, zu verteidigen und schadlos zu halten, die sich aus oder in irgendeiner Weise im Zusammenhang mit Ihrem Zugang zu oder Ihrer Nutzung der Dienste, Ihrer Verletzung dieser Datenschutzrichtlinie oder Ihrer Verletzung geltender Gesetze oder der Rechte Dritter ergeben.',

  // Section 15: Governing Law
  [ShowcaseStrings.PP_S15_Title]:
    '15. Anwendbares Recht und Streitbeilegung',
  [ShowcaseStrings.PP_S15_P1]:
    'Diese Datenschutzrichtlinie unterliegt den Gesetzen des Staates Washington, Vereinigte Staaten, und wird in Übereinstimmung mit diesen ausgelegt, ohne Berücksichtigung seiner Kollisionsnormen. Jeder Streit, der sich aus oder im Zusammenhang mit dieser Datenschutzrichtlinie oder den Diensten ergibt, wird ausschließlich vor den staatlichen oder bundesstaatlichen Gerichten im King County, Washington, beigelegt, und Sie stimmen der persönlichen Zuständigkeit dieser Gerichte zu.',

  // Section 16: Open Source
  [ShowcaseStrings.PP_S16_Title]: '16. Open Source',
  [ShowcaseStrings.PP_S16_P1_Before]:
    'BrightChain ist Open-Source-Software. Der Quellcode ist öffentlich verfügbar unter ',
  [ShowcaseStrings.PP_S16_P1_LinkText]:
    'github.com/Digital-Defiance/BrightChain',
  [ShowcaseStrings.PP_S16_P1_After]:
    '. Sie sind eingeladen, den Code zu überprüfen, um die in dieser Richtlinie beschriebenen Datenschutzeigenschaften zu verifizieren. Die hierin beschriebenen kryptographischen Schutzmaßnahmen sind im Quellcode implementiert und durch Inspektion überprüfbar.',

  // Section 17: Changes
  [ShowcaseStrings.PP_S17_Title]: '17. Änderungen dieser Richtlinie',
  [ShowcaseStrings.PP_S17_P1]:
    'Wir können diese Datenschutzrichtlinie von Zeit zu Zeit aktualisieren. Wir werden Sie über wesentliche Änderungen informieren, indem wir die aktualisierte Richtlinie in den Diensten mit einem überarbeiteten Datum der „Letzten Aktualisierung" veröffentlichen. Ihre fortgesetzte Nutzung der Dienste nach dem Inkrafttreten von Änderungen stellt Ihre Zustimmung zur überarbeiteten Richtlinie dar.',

  // Section 18: Contact
  [ShowcaseStrings.PP_S18_Title]: '18. Kontakt',
  [ShowcaseStrings.PP_S18_P1]:
    'Wenn Sie Fragen zu dieser Datenschutzrichtlinie haben oder Ihre Datenschutzrechte ausüben möchten, kontaktieren Sie bitte:',
  [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
  [ShowcaseStrings.PP_S18_EmailLabel]: 'E-Mail:',
  [ShowcaseStrings.PP_S18_WebLabel]: 'Web:',
};

export default ShowcaseGermanStrings;
