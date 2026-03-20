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
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'Top Secret dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'BrightChat-Logo',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'BrightHub-Logo',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'BrightID-Logo',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'BrightMail-Logo',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'BrightPass-Logo',

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
  [ShowcaseStrings.FAQ_Ohm_Character]: 'Ohm-Charakter',
  [ShowcaseStrings.FAQ_Volta_Character]: 'Volta-Charakter',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Zu {MODE} FAQ wechseln',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain FAQ',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'Das BrightChain Universum',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'Der evolutionäre Nachfolger des Owner-Free FileSystems',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'Lernen Sie die Maskottchen, die Mission und das Ökosystem kennen',
  [ShowcaseStrings.FAQ_Toggle_Technical]: 'Technisch',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Ökosystem',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Ohm bewacht die Details',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Volta enthüllt die Vision',
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
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Title]: 'Streng Geheim',
  [ShowcaseStrings.FAQ_Tech_Q11_TopSecret_Text]:
    'Eine streng geheime dApp kommt bei der Veröffentlichung, die alles verändern wird, was Sie wissen, und das Spiel komplett umkrempeln wird.',

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
    'IPFS ist standardmäßig transparent; wenn Sie den Hash haben, können Sie die Datei sehen. BrightChain verwendet eine XOR-Basislinie. Daten werden funktional „geschreddert" bevor sie jemals das Netzwerk berühren. Datenschutz ist kein „Plugin" — es ist der mechanische Zustand der Daten.',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. Wie vergleichen sich die Wirtschaftsmodelle von BrightChain und IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFS verlässt sich auf Filecoin (eine schwere, externe Blockchain) für Anreize. BrightChain verwendet den Joule. Es ist eine „thermische" Rechnungseinheit, die tatsächliche Arbeit (CPU/NPU-Zyklen) und Ressourcenverbrauch misst. Sie ist eingebaut, hat geringen Overhead und ist direkt mit der „Energie" des Netzwerks verbunden.',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 Was ist BrightChain wirklich?',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChain ist Infrastruktur für eine Welt, in der Ihre Daten Ihnen gehören — nicht einer Plattform, nicht einem Unternehmen, nicht irgendjemandem, der zufällig den Server betreibt. Es ist eine dezentralisierte Speicherschicht, in der jede Datei aufgeteilt, gemischt und über das Netzwerk verstreut wird, sodass kein einzelner Knoten jemals Ihre Daten in irgendeinem bedeutsamen Sinne „hostet". Das Ergebnis ist ein System, in dem Privatsphäre keine Funktion ist, die Sie einschalten — es ist der Standardzustand der Architektur. Wir nennen es „eigentümerfrei", weil, sobald Ihre Daten in BrightChain eintreten, niemand die Teile besitzt. Nur Sie haben das Rezept, um sie wieder zusammenzusetzen.',

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

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: 'Die Wirtschaft',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ Was sind Joules?',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'Joules sind die Energieeinheit von BrightChain — keine spekulative Kryptowährung, sondern ein Maß für echte Arbeit und Beitrag. Visuell sind sie winzige neonblaue Blitz-Token, die fließen, sich ansammeln und erschöpfen wie Münzen in einem Spiel. Volta erzeugt sie, Ohm reguliert ihren Fluss durch sein Tor, und Operationen verbrauchen sie. Jede Aktion in BrightChain hat Joule-Kosten — von einer nahezu kostenlosen Metadaten-Umbenennung bis zu einer Millionen-Joule-Vollzyklus-Neuverschlüsselung. Benutzer verdienen Joules durch ein Arbeit-für-Arbeit-Modell: Tragen Sie Speicher oder Berechnung zum Netzwerk bei, und Sie verdienen die Kapazität, es zu nutzen. Das Joule-Messgerät in der Benutzeroberfläche zeigt Ihr Energiebudget, mit kleinen Funken, die sichtbar von Volta durch Ohms Tor in Ihre Operationen fließen.',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 Was ist Ruß?',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'Ruß ist die sichtbare Konsequenz jeder Operation — der „CO2-Fußabdruck" Ihrer digitalen Aktionen. Es ist keine Währung, die Sie ausgeben; es sind Kosten, die Sie nicht vermeiden können. Jedes Mal, wenn Energie verbraucht wird, wird Ruß produziert — eine visuelle Darstellung der Rechenarbeit, die sich im Laufe der Zeit ansammelt. Je mehr Sie tun, desto mehr Ruß sammelt sich an. Leichte Nutzung hinterlässt hier und da eine Spur; starke Nutzung erzeugt sichtbare Ansammlung. Ruß repräsentiert Karma im BrightChain-Ökosystem: Jede Aktion hinterlässt eine Spur. In Ohms Worten: „Volta gibt dir die Energie, Operationen verwandeln sie in Hitze, und das System verfolgt die Konsequenzen. Ich stelle nur sicher, dass wir nicht mehr verschwenden als nötig."',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: 'Das große Ganze',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]:
    '🌐 Wie passt alles zusammen?',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'Das Ökosystem läuft auf der dynamischen Spannung zwischen Volta (dem Ausgeber) und Ohm (dem Sparer), wobei Joules als Energiewährung zwischen ihnen fließen. Volta ist begierig darauf, jede Operation mit voller Kraft zu betreiben, während Ohm sicherstellt, dass Ressourcen nicht verschwendet werden. Jede Aktion verbraucht Joules und produziert Ruß — die sichtbare Spur der Rechenarbeit. Wenn eine Operation ausgelöst wird, greift Volta nach Joules, Ohm bewertet die Kosten und lässt sie widerwillig durch, und das System verfolgt den resultierenden Ruß. Dies schafft eine selbstbalancierende Wirtschaft, in der Beitrag gleich Kapazität ist und jede Aktion ihre Spur im Netzwerk hinterlässt.',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 Woran glaubt BrightChain?',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'Energie wird erhalten. Aktionen haben Konsequenzen. Daten haben Gewicht. Jedes Element im BrightChain-Ökosystem entspricht einem tieferen Prinzip: Volta ist der Funke — reines, chaotisches Potenzial und der Wunsch zu handeln. Ohm ist der Anker — geerdete Weisheit und die Disziplin, richtig zu handeln. Joules sind der Fluss — der Geist, der zwischen ihnen fließt. Ruß ist das Karma — die sichtbaren Kosten, die nicht vermieden werden können. Zusammen bilden sie einen geschlossenen Kreislauf: Volta liefert die Energie, Ohm stellt sicher, dass sie weise ausgegeben wird, und das System verfolgt jede Konsequenz. Nichts ist umsonst. Nichts wird verschwendet. Alles hinterlässt eine Spur.',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 Wo kann ich die Maskottchen in Aktion sehen?',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    'Die Maskottchen sind in die gesamte Produkterfahrung eingewoben. Volta und Ohm leben im plattformweiten Joule-Messgerät, wobei Volta in der Nähe der Energieanzeige knistert und Ohm bei teuren Operationen eingreift, um seine Resistive Meditation durchzuführen — den Fortschrittsbalken von Neonblau zu einem ruhigen Bernstein ändernd. Ruß sammelt sich während Ihrer Sitzung sichtbar an und spiegelt die geleistete Rechenarbeit wider. Demnächst: Maskottchen-Auftritte auf Fehlerseiten, Ladebildschirmen, Bestätigungsdialogen skaliert nach Operationsschwere, und ja — Merchandise.',

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
    'Ihre Dateien werden in Blöcke aufgeteilt und mithilfe von XOR-Operationen mit Zufallsdaten gemischt, sodass sie völlig zufällig erscheinen und gleichzeitig perfekte Sicherheit gewährleisten. Von homomorpher Abstimmung bis hin zu vermittelter Anonymität, von verteilter Dateispeicherung bis hin zu brightTrustbasierter Governance — BrightChain bietet alles, was für die nächste Generation dezentralisierter Anwendungen benötigt wird.',
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
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
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

export default ShowcaseGermanStrings;
