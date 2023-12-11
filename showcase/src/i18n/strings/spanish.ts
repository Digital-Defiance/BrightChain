import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

export const ShowcaseSpanishStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: 'Inicio',
  [ShowcaseStrings.Nav_SoupDemo]: 'Demo Soup',
  [ShowcaseStrings.Nav_Ledger]: 'Libro Mayor',
  [ShowcaseStrings.Nav_Blog]: 'Blog',
  [ShowcaseStrings.Nav_FAQ]: 'Preguntas Frecuentes',
  [ShowcaseStrings.Nav_Docs]: 'Documentación',
  [ShowcaseStrings.Nav_Home_Description]: 'Página principal',
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    'Visualización interactiva de bloques',
  [ShowcaseStrings.Nav_Ledger_Description]:
    'Libro mayor blockchain con gobernanza',
  [ShowcaseStrings.Nav_Blog_Description]:
    'Blog y actualizaciones de BrightChain',
  [ShowcaseStrings.Nav_FAQ_Description]: 'Preguntas frecuentes',
  [ShowcaseStrings.Nav_Docs_Description]: 'Documentación del proyecto',
  [ShowcaseStrings.Nav_ToggleMenu]: 'Alternar menú',
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'Logo de BrightDB',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'dApp Alto Secreto',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'Logo de BrightChat',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'Logo de BrightID',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'Logo de BrightHub',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'Logo de BrightMail',
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'Logo de BrightVote',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'Logo de BrightPass',
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]: 'Logo del Protocolo Canario',
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: 'Logo del Burnbag Digital',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: 'Idioma',
  [ShowcaseStrings.Lang_EN_US]: 'Inglés (EE.UU.)',
  [ShowcaseStrings.Lang_EN_GB]: 'Inglés (Reino Unido)',
  [ShowcaseStrings.Lang_ES]: 'Español',
  [ShowcaseStrings.Lang_FR]: 'Francés',
  [ShowcaseStrings.Lang_DE]: 'Alemán',
  [ShowcaseStrings.Lang_ZH_CN]: 'Chino',
  [ShowcaseStrings.Lang_JA]: 'Japonés',
  [ShowcaseStrings.Lang_UK]: 'Ucraniano',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'Modo FAQ',
  [ShowcaseStrings.FAQ_Gild_Character]: 'Personaje de Gild',
  [ShowcaseStrings.FAQ_Phix_Character]: 'Personaje de Phix',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Cambiar a FAQ {MODE}',
  [ShowcaseStrings.FAQ_Title_Technical]: 'Preguntas Frecuentes de BrightChain',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'El Universo BrightChain',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'El Sucesor Evolutivo del Sistema de Archivos Sin Propietario',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'Conoce las Mascotas, la Misión y el Ecosistema',
  [ShowcaseStrings.FAQ_Toggle_Technical]: 'Técnico',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Ecosistema',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gild guarda los detalles',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phix revela la visión',
  [ShowcaseStrings.FAQ_BackToHome]: '← Volver al Inicio',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. ¿Qué es BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    'BrightChain es una infraestructura de datos descentralizada y de alto rendimiento "Sin Propietario". Es el sucesor arquitectónico del Sistema de Archivos Sin Propietario (OFFSystem), modernizado para entornos de hardware de 2026 incluyendo Apple Silicon y almacenamiento NVMe.',

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    '2. ¿En qué se diferencia BrightChain del OFFSystem original?',
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChain honra la filosofía "Sin Propietario" de su predecesor mientras introduce modernizaciones críticas:',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]: 'Redundancia Opcional',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    'Los usuarios pueden solicitar que sus bloques se almacenen con mayor durabilidad utilizando codificación Reed-Solomon.',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
    'Rendimiento de Recuperación',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    'Utilizando @digitaldefiance/node-rs-accelerate, el sistema aprovecha hardware GPU/NPU para realizar operaciones de recuperación Reed-Solomon a velocidades de hasta 30+ GB/s.',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'Escalabilidad',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    'A través de Super CBLs (Listas de Bloques Constituyentes), el sistema utiliza indexación recursiva para soportar tamaños de archivo efectivamente ilimitados con eficiencia de recuperación O(log N).',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'Identidad',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    'La integración de BIP39/32 permite una identidad segura basada en mnemónicos y gestión de claves deterministas jerárquicas.',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: 'Cifrado Opcional',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    'Los usuarios pueden opcionalmente agregar cifrado ECIES sobre sus datos, utilizando el sistema HDKey del espacio de claves/identidad de Ethereum.',

  [ShowcaseStrings.FAQ_Tech_Q3_Title]:
    '3. ¿Cómo son los datos "Sin Propietario"?',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    'BrightChain utiliza un enfoque criptográfico multicapa para asegurar que ningún nodo individual "aloje" un archivo en un sentido legal o práctico:',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'La Base XOR',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    'Cada bloque se procesa a través de operaciones XOR simples, haciendo que los datos en reposo sean indistinguibles del ruido aleatorio.',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'La Receta',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    'Para reconstruir un archivo, un usuario necesita la Receta — el mapa espacial específico del orden de los bloques.',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: 'Cifrado Opcional',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    'Los usuarios pueden opcionalmente agregar cifrado ECIES sobre sus datos. Sin la Receta, los datos permanecen desordenados y, si se optó, criptográficamente bloqueados.',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    '4. ¿Qué es el "Intercambio de Tuplas" y qué proporciona?',
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    'El "Intercambio de Tuplas" es el equilibrio deliberado entre la sobrecarga del fragmentado "Sin Propietario" y los beneficios legales y económicos incomparables que proporciona a la red.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    'La Ventaja Legal: Negación Plausible',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    'Al fragmentar datos en tuplas (bloques) casi aleatorias a través de mezcla XOR, los usuarios que contribuyen almacenamiento están alojando datos que son matemáticamente indistinguibles del ruido.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    'El Resultado: Debido a que un solo nodo no puede reconstruir un archivo coherente sin la "Receta", es técnica y legalmente imposible afirmar que un operador de nodo específico está "alojando" o "distribuyendo" cualquier contenido específico. Esto proporciona la capa definitiva de Negación Plausible para los participantes.',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    'La Ventaja Económica: Eficiencia vs. Prueba de Trabajo',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    'Aunque el fragmentado "Sin Propietario" introduce una sobrecarga de almacenamiento menor, es insignificante comparado con los costos masivos de energía y hardware de las redes tradicionales de Prueba de Trabajo (PoW) o Prueba de Participación (PoS).',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    'El Resultado: BrightChain logra integridad de datos de alto rendimiento sin quemar "Julios" en competencias de hash inútiles. Esto hace que la red sea altamente competitiva, ofreciendo rendimiento de baja latencia a una fracción del costo de las blockchains heredadas.',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: 'Resumen del Intercambio:',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    'Los usuarios aceptan un ligero aumento en "fragmentos" de datos a cambio de un entorno de alojamiento sin responsabilidad y una infraestructura de ultra bajo costo. Esto hace de BrightChain la plataforma más viable para almacenamiento descentralizado en entornos altamente regulados o con recursos limitados.',

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    '5. ¿En qué se diferencia BrightChain de las blockchains tradicionales?',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    'Técnicamente, BrightChain es un almacén de bloques descentralizado en lugar de una blockchain única y monolítica. Mientras que las blockchains tradicionales son el libro mayor, BrightChain proporciona la infraestructura subyacente para alojar y soportar múltiples libros mayores de árboles Merkle híbridos simultáneamente. Usamos encadenamiento de bloques como método estructural para reconstruir archivos, pero el sistema está diseñado para ser una base de alto rendimiento que puede impulsar muchas blockchains y dApps diferentes sobre una capa de almacenamiento unificada "Sin Propietario".',

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. ¿Cuál es el rol de Reed-Solomon (RS) en BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    'Mientras que XOR maneja la privacidad y el estado "Sin Propietario" de los datos, la Codificación de Borrado Reed-Solomon es una capa opcional para Recuperabilidad.',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: 'Redundancia',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    'RS permite que un archivo sea reconstruido incluso si múltiples nodos de alojamiento se desconectan.',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'El Intercambio',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    'RS agrega sobrecarga computacional y requisitos de almacenamiento comparado con XOR simple. Los usuarios deben elegir su nivel de redundancia basándose en la importancia de los datos y sus "Julios" disponibles.',

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. ¿Qué es un "Julio"?',
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    'Un Julio es la unidad de cuenta para trabajo y consumo de recursos dentro del ecosistema BrightChain.',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'Base de Costo',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    'Cada acción — almacenar datos, realizar mezcla XOR, o codificar fragmentos Reed-Solomon — tiene un costo proyectado en Julios.',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]: 'Gestión de Recursos',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    'Los usuarios deben sopesar el costo en Julios del almacenamiento de alta redundancia contra el valor de sus datos.',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. ¿Cómo se obtienen los Julios?',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    'Los Julios se ganan a través de un modelo de Trabajo por Trabajo. Los usuarios obtienen Julios contribuyendo recursos de vuelta a la red:',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'Almacenamiento',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    'Alojando bloques cifrados para otros pares.',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: 'Computación',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    'Proporcionando ciclos de CPU/GPU/NPU para realizar tareas de codificación o recuperación para el colectivo.',
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    'Esto asegura que la red permanezca como una economía energética autosostenible donde la contribución equivale a la capacidad.',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]: '9. ¿Cómo se mantiene el Anonimato?',
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    'BrightChain emplea Anonimato Intermediado.',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'En Cadena',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    'Todas las acciones son anónimas para la red general.',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: 'El Quórum',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    'La identidad está criptográficamente vinculada a un Quórum de Gobernanza. Esto asegura que mientras los datos y acciones de un usuario son privados, la comunidad mantiene una "Capa Social" de responsabilidad a través del Secreto Compartido de Shamir y Votación Homomórfica.',

  [ShowcaseStrings.FAQ_Tech_Q10_Title]: '10. ¿Qué es BrightDB y cómo funciona?',
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    'BrightDB es la capa de almacén de documentos de alto nivel construida directamente sobre el almacén de bloques de BrightChain. Proporciona una forma estructurada de almacenar, consultar y gestionar objetos de datos complejos sin un servidor de base de datos central.',
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: 'Cómo Funciona',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    'Almacenamiento Orientado a Documentos',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    'Similar a las bases de datos NoSQL, BrightDB almacena datos como "Documentos" fragmentados en bloques cifrados y distribuidos a través de la red.',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    'Versionado Inmutable',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    'Cada cambio a un documento se registra como una nueva entrada con un historial criptográficamente verificable.',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    'Indexación Descentralizada',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    'Un sistema de indexación distribuido permite a los nodos encontrar y reconstruir documentos específicos a través del DHT sin un nodo "Maestro" central.',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    'Acceso Basado en Quórum',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    'El acceso a bases de datos o colecciones específicas puede ser gobernado por un Quórum, requiriendo aprobación criptográfica de firmantes autorizados.',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'Por Qué Importa',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    'La mayoría de las dApps luchan porque almacenan datos "pesados" en servidores centralizados. BrightDB mantiene los datos descentralizados, sin propietario y de alto rendimiento — permitiendo aplicaciones verdaderamente sin servidor que son tan rápidas como las aplicaciones web tradicionales pero tan seguras como una blockchain.',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]:
    '11. ¿Qué dApps se lanzaron con BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChain se lanzó con un conjunto central de "Bright-Apps" diseñadas para reemplazar servicios centralizados de recolección de datos con alternativas seguras y soberanas.',
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'Logo de BrightChart',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]:
    'Expedientes médicos propiedad del paciente',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    'Un expediente médico electrónico donde el paciente posee las claves. BrightChart almacena datos médicos compatibles con FHIR R4 como bloques cifrados en BrightChain — sin base de datos central que vulnerar. Los pacientes otorgan acceso granular a proveedores mediante delegación BrightTrust, y cada evento de acceso se registra en un rastro de auditoría inmutable. Compatible con consultorios médicos, dentales y veterinarios desde una sola base de código.',
  [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: 'Logo de BrightCal',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]: 'Gestión de calendario compartido y personal',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
    'Un sistema de calendario donde el propietario posee las claves. BrightCal permite una programación segura y cifrada con control de acceso granular. Los eventos se almacenan como bloques cifrados. Todos los datos del calendario son inmutables y recuperables, con soporte para eventos recurrentes, recordatorios e integración con sistemas de calendario tradicionales.',
    [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: 'Comunicación Soberana',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    'Un sistema de correo electrónico totalmente compatible con RFC que conecta SMTP tradicional y almacenamiento descentralizado. A diferencia de los proveedores de correo estándar, BrightMail fragmenta cada mensaje en el almacén de bloques "Sin Propietario" con soporte para mensajería cifrada de extremo a extremo en "Modo Oscuro".',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]: 'Red Social y Grafo Soberano',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'El Concepto',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    'Una plataforma de redes sociales descentralizada y resistente a la censura que refleja la fluidez de los "Feeds" heredados sin la vigilancia central o manipulación algorítmica.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: 'La Diferencia',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    'Cada publicación, "Me gusta" y relación se almacena como un documento inmutable y fragmentado dentro de BrightDB. Debido a que aprovecha la Economía de Julios, no hay anuncios—los usuarios contribuyen una micro-fracción de computación o almacenamiento para "impulsar" su voz o sostener la historia de su comunidad.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]:
    'El Poder de los Quórums',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    'La moderación no es manejada por un "Equipo de Seguridad" corporativo. En cambio, las comunidades son gobernadas por Quórums de Gobernanza. Las reglas se aplican criptográficamente, y los estándares comunitarios se votan a través de Votación Homomórfica, asegurando que el espacio digital de un grupo permanezca verdaderamente "Sin Propietario" y autodeterminado.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]:
    'Bóveda de Conocimiento Cero',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    'Un sistema de gestión de contraseñas e identidad donde tu bóveda existe como bloques cifrados distribuidos. El acceso está gobernado por tu mnemónico BIP39, y cada cambio de credencial está versionado y verificable a través de BrightDB.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'Comunidad Resiliente',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    'Una plataforma de comunicaciones en tiempo real con canales persistentes, voz y compartición de medios. La gobernanza comunitaria se gestiona a través de Quórums, y la recuperación acelerada por GPU asegura que el historial de chat nunca se pierda.',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    'Burnbag Digital / Protocolo Canario',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    'Una plataforma especializada de intercambio de archivos y cifrado diseñada para datos de alto riesgo. Utiliza "Bóvedas Inteligentes" que pueden programarse para destruir permanentemente la "Receta" (el mapa y las claves) o liberarla a partes específicas bajo condiciones verificables, como un "Interruptor de Hombre Muerto", una liberación programada o un consenso de Quórum. Es la herramienta definitiva para denunciantes, profesionales del derecho y cualquier persona que requiera una expiración garantizada de los datos.',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    '12. ¿Qué es el cifrado Paillier y cómo permite la votación privada?',
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    'Paillier es un esquema de cifrado de clave pública con una propiedad especial llamada homomorfismo aditivo — puedes sumar valores cifrados sin descifrarlos nunca. Si cifras un "1" para el Candidato A y alguien más cifra un "1" para el Candidato A, puedes multiplicar esos textos cifrados juntos y el resultado, cuando se descifra, es "2". Nadie ve nunca una boleta individual. En el sistema de votación de BrightChain, cada voto se cifra con una clave pública Paillier, las boletas cifradas se agregan homomórficamente en un solo texto cifrado por candidato, y solo el conteo final se descifra — nunca ningún voto individual. Para mayor seguridad, la clave privada Paillier puede dividirse entre múltiples guardianes usando criptografía de umbral, para que ninguna parte individual pueda descifrar el conteo sola. Este enfoque funciona nativamente para métodos de votación comunes como pluralidad, aprobación y votación puntuada, donde el conteo es solo suma. Los métodos que requieren rondas de eliminación (como elección por ranking) necesitan descifrados intermedios entre rondas, y algunos métodos (como votación cuadrática) no pueden hacerse homomórficamente en absoluto.',

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. ¿Qué hace el Puente Paillier?',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    'El Puente Paillier es una construcción de derivación de claves determinista que te permite derivar claves de cifrado homomórfico Paillier directamente de tu par de claves ECDH (Curva Elíptica Diffie-Hellman) existente. En lugar de gestionar dos pares de claves separados — uno para identidad/autenticación (ECC) y uno para cifrado de voto homomórfico (Paillier) — el puente canaliza tu secreto compartido ECDH a través de HKDF y HMAC-DRBG para generar determinísticamente los números primos grandes necesarios para una clave Paillier de 3072 bits. Esto significa que toda tu identidad criptográfica, incluyendo tus claves de votación, puede recuperarse de una sola clave privada ECC de 32 bytes. El puente es unidireccional (no puedes revertir una clave Paillier de vuelta a la clave EC), completamente determinista (la misma entrada siempre produce la misma salida), y logra seguridad de 128 bits consistente con las recomendaciones NIST.',
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    'Consulta nuestro documento sobre el tema para más información.',

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    '14. ¿No es BrightChain simplemente otro Almacenamiento Descentralizado (dWS) como IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    'No. IPFS es una "Biblioteca Pública" diseñada para el descubrimiento y persistencia de contenido. BrightChain es una "Bóveda Soberana". Mientras IPFS se enfoca en encontrar datos a través de CIDs, BrightChain se enfoca en el Estado Sin Propietario y la Recuperación de Alta Velocidad. En BrightChain, los datos se fragmentan tan minuciosamente que ningún nodo individual "posee" o siquiera "sabe" lo que está alojando.',

  [ShowcaseStrings.FAQ_Tech_Q15_Title]:
    '15. ¿Cómo difiere el "Rendimiento" de IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    'IPFS funciona con "Mejor Esfuerzo" y a menudo tiene alta latencia. BrightChain está construido para la Era Apple Silicon (M4 Max). Usando @digitaldefiance/node-rs-accelerate, logramos velocidades de recuperación de 30+ GB/s. No solo "obtenemos" archivos; usamos Reed-Solomon acelerado por hardware para re-materializar datos desde fragmentos a velocidades de bus.',

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    '16. ¿Qué hay de la Privacidad en BrightChain vs IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    'IPFS es transparente por defecto; si tienes el hash, puedes ver el archivo. BrightChain usa una Línea Base XOR. Los datos son funcionalmente "Triturados" (como el logo de Digital Burnbag) antes de que toquen la red. La privacidad no es un "plugin" — es el estado mecánico de los datos.',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. ¿Cómo se comparan las Economías de BrightChain e IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFS depende de Filecoin (una blockchain externa pesada) para incentivos. BrightChain usa el Julio. Es una unidad de cuenta "Térmica" que mide el trabajo real (ciclos CPU/NPU) y el consumo de recursos. Está integrada, tiene bajo overhead, y está directamente vinculada a la "Energía" de la red.',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 ¿Qué es BrightChain, realmente?',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChain es infraestructura para un mundo donde tus datos te pertenecen — no a una plataforma, no a una corporación, no a cualquiera que maneje el servidor. Es una capa de almacenamiento descentralizado donde cada archivo se fragmenta, mezcla y dispersa a través de la red para que ningún nodo individual "aloje" tus datos en ningún sentido significativo. El resultado es un sistema donde la privacidad no es una característica que activas — es el estado predeterminado de la arquitectura. Lo llamamos "Sin Propietario" porque una vez que tus datos entran en BrightChain, nadie posee las piezas. Solo tú tienes la Receta para volver a unirlas.',

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]: '¿Qué es Digital Burnbag?',
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    'En las agencias de inteligencia, una "bolsa de quema" es un contenedor para documentos clasificados marcados para destrucción — los depositas, y se incineran con una cadena de custodia verificable. Digital Burnbag trae ese concepto a los datos. Cuando renombras, mueves o destruyes datos en BrightChain, el sistema realiza un "ciclo fénix": copia los datos a su nuevo estado, luego incinera criptográficamente el antiguo. Nada se elimina simplemente — renace. El estado antiguo está probablemente desaparecido, y el nuevo estado está probablemente intacto. Esta es la capa de producto de BrightChain, donde las mascotas Gild y Phix viven y trabajan.',

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]:
    '¿Qué es el Protocolo Canario?',
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    'El nombre viene del canario en la mina de carbón — el sistema de alerta temprana que canta cuando algo está mal. El Protocolo Canario vigila tus feeds, tus APIs — cualquier cosa que dé un latido sobre si estás vivo, si las cosas van según lo previsto. En el momento en que las cosas no salen según el plan y tu canario muere (¡lo siento, Gild!), el archivo o carpeta se destruye — verificablemente. También funciona a la inversa: inicia sesión con un código de coacción, o configura una regla a través de un proveedor preestablecido, y tus datos pueden destruirse bajo esas condiciones también. Todo se trata de reglas y condiciones. Si las cosas no salen según el plan, Gild lo paga. También puede monitorear la integridad de la red, pero su propósito central es la destrucción condicional: tus datos se queman cuando las reglas lo dictan. Nuestra mascota Gild es la encarnación viviente de este protocolo: un canario dorado que vigila tus datos con vigilancia obsesiva. El logo existente de Burnbag/Protocolo Canario — un canario dorado con cola de llama — son ambas mascotas en una marca. Gild es el cuerpo dorado; Phix es la llama.',

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'Conoce al Elenco',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Volta — La Chispa',
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: 'La Arquitecta de Alto Voltaje',
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    'Nombrada en honor a Alessandro Volta, inventor de la batería, Volta es una chispa viviente — un zorro geométrico dentado, azul neón hecho de electricidad pura y crepitante. Ella es la Proveedora: genera y empuja Julios a través del sistema, ansiosa por alimentar cada operación a máxima potencia. Hiperactiva, generosa con la energía y ligeramente imprudente, Volta piensa que la conservación es aburrida. "¿Quieres 20 terajulios? Hecho. ¿Qué más?" En la UI, crepita cerca del medidor de Julios, y durante operaciones pesadas brilla al blanco, vibrando con el deseo de ejecutar. Ella representa el potencial puro y caótico — el deseo de actuar.',
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    'Mascota Volta — un zorro geométrico azul neón hecho de electricidad',

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ohm — El Ancla',
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: 'El Monje Estoico de la Resistencia',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    'Nombrado en honor a Georg Ohm, quien definió la resistencia eléctrica, Ohm es el freno al acelerador de Volta. Una tortuga-perezoso pesada, como de piedra, con un símbolo Omega brillante integrado en su caparazón, se mueve lenta y deliberadamente. Su mantra: "Ohm mani padme ohm." Mientras Volta zumba como un zorro con cafeína, Ohm se sienta en una posición de loto profunda y arraigada, vibrando a un zumbido perfecto de 60Hz, centrando todo el sistema. Es calmado, escéptico y armado con ingenio seco — el contador que realmente lee los recibos. No se opone a gastar, solo se opone al desperdicio. Cuando los niveles de energía se disparan, realiza una "Meditación Resistiva", colocando una pesada pata de piedra en la barra de progreso y cambiando la corriente de azul a un ámbar calmado y profundo. Él representa la sabiduría arraigada — la disciplina para actuar correctamente.',
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    'Mascota Ohm — una tortuga-perezoso similar a la piedra con un símbolo Omega brillante',

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Gild — El Testigo',
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: 'El Guardián Canario Dorado',
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    'Un canario dorado vanidoso obsesionado con su prístino pelaje amarillo. Gild es el guardián — vigila tus datos, emite advertencias y mantiene las cosas seguras. Piensa en la energía del búho de Duolingo: alentador, ocasionalmente culpabilizador, pero fundamentalmente de tu lado. ¿El problema? Gild vive en una mina de carbón. Cada operación de archivo levanta Hollín, y se ensucia constantemente. ¿Subiendo 50 archivos? Está cubierto de ceniza, acicalándose frenéticamente, murmurando sobre sus plumas. Su nivel de hollín es un indicador pasivo de la actividad del sistema — sistema inactivo significa un Gild prístino y presumidamente acicalándose; uso pesado significa un canario sucio y furioso. Es meticuloso, dramático y sufrido. "¡Acabo de acicalarme! Ahora soy un deshollinador porque no puedes escribir Documentos." Él es el cuerpo dorado del logo de Burnbag/Protocolo Canario — el logo sin el fuego.',
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]:
    'Mascota Gild — un canario dorado guardián',

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Phix — El Renacimiento',
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: 'El Destructor-Creador',
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    '"Phix" = "fix" + "phoenix." El gemelo malvado de Gild. Misma silueta de pájaro, pero sus plumas brillan rojo brasa, sus ojos se estrechan como carbones calientes, y sonríe como si estuviera a punto de disfrutar esto demasiado. Phix es el Ejecutor — consume Julios para incinerar estados de datos antiguos y resurge con los nuevos. Donde Gild está molesto por el fuego, Phix ES fuego. Aparece durante operaciones de renombrado y cascadas activadas por canarios — cualquier cosa donde los datos mueren y renacen. Pero Phix también se trata de la destrucción pura y simple. Es el pirómano parado ahí con el fósforo cuando estás listo para quemar algo, feliz de echar una mano. ¿Eliminar un archivo? Phix está sonriendo. ¿Borrar una carpeta? Ya está encendido. Aunque se deleita con la destrucción, también encuentra orgullo en la creación — resurgir de las cenizas con algo nuevo es lo suyo. Alegre, caótico, el pirómano en el departamento de bomberos que ama su trabajo un poco demasiado. Cuando un usuario activa un renombrado, Gild se hace a un lado y Phix emerge — sonriendo, brillando, listo para quemar. Él es la llama del logo de Burnbag/Protocolo Canario — el logo sin el oro.',
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    'Mascota Phix — un fénix rojo brasa, el gemelo ardiente de Gild',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: 'La Economía',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ ¿Qué son los Julios?',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'Los Julios son la unidad de energía de BrightChain — no una criptomoneda especulativa, sino una medida de trabajo real y contribución. Visualmente, son pequeños tokens de rayo azul neón que fluyen, se acumulan y se agotan como monedas en un juego. Volta los genera, Ohm regula su flujo a través de su puerta, y las operaciones los consumen. Cada acción en BrightChain tiene un costo en Julios — desde un renombrado de metadatos casi cero hasta un re-cifrado de ciclo completo de un millón de Julios. Los usuarios ganan Julios a través de un modelo de Trabajo por Trabajo: contribuye almacenamiento o computación a la red, y ganas la capacidad de usarla. El medidor de Julios en la UI muestra tu presupuesto de energía, con pequeñas chispas fluyendo visiblemente desde Volta a través de la puerta de Ohm hacia tus operaciones.',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 ¿Qué es el Hollín?',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'El Hollín es la consecuencia visible de cada operación — la "huella de carbono" de tus acciones digitales. No es una moneda que gastas; es un costo que no puedes evitar. Cada vez que Phix quema datos, produce Hollín — partículas oscuras y nubes de humo que se acumulan en las plumas doradas de Gild. Cuanto más haces, más sucio se pone Gild. El uso ligero deja una mancha aquí y allá; el uso pesado lo vuelve negro como el carbón e indignado. El Hollín representa el karma en el ecosistema BrightChain: cada acción deja una marca, y alguien tiene que llevarla. En palabras de Ohm: "Volta te da la energía, Phix la convierte en calor, y Gild lleva las consecuencias. Yo solo me aseguro de que no desperdiciemos más de lo necesario."',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: 'El Panorama General',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]: '🌐 ¿Cómo encaja todo?',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'El ecosistema es un sistema de dos niveles. A nivel de plataforma, BrightChain funciona con la tensión entre Volta (el Gastador) y Ohm (el Ahorrador), con Julios fluyendo entre ellos como la moneda de energía. A nivel de producto, Digital Burnbag funciona con la tensión entre Phix (el Destructor-Creador) y Gild (el Guardián), con el Hollín como la consecuencia inevitable. Cuando se dispara una operación de burnbag, los cuatro personajes interactúan: Volta alcanza los Julios, Ohm evalúa el costo y reluctantemente los deja pasar, Phix atrapa la energía y erupciona, y Gild es golpeado con el hollín resultante. El Protocolo Canario es el hilo de integridad que atraviesa todo — el ojo vigilante de Gild asegurando que cada transformación sea legítima. El logo de Burnbag/Protocolo Canario cuenta la historia de origen: Gild y Phix son el mismo pájaro. Uno es el cuerpo, el otro es el fuego. El logo es el momento en que se superponen — el canario que ya está ardiendo, el fénix que aún no ha emergido completamente.',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 ¿En qué cree BrightChain?',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'La energía se conserva. Las acciones tienen consecuencias. Los datos tienen peso. Cada personaje en el ecosistema BrightChain mapea a un principio más profundo: Volta es la Chispa — potencial puro y caótico y el deseo de actuar. Ohm es el Ancla — sabiduría arraigada y la disciplina para actuar correctamente. Los Julios son el Flujo — el espíritu moviéndose entre ellos. Phix es el Renacimiento — el fuego transformador al final del camino. Gild es el Testigo — el que sufre el hollín terrenal de nuestros apegos (y nuestros errores tipográficos). El Hollín es el Karma — el costo visible que no puede evitarse. Juntos forman un ciclo cerrado: Volta proporciona la energía, Ohm asegura que se gaste sabiamente, Phix transforma el estado, y Gild lleva el peso. Nada es gratis. Nada se desperdicia. Todo deja una marca.',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 ¿Dónde puedo ver las mascotas en acción?',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    'Las mascotas están tejidas a lo largo de la experiencia del producto. Gild aparece durante la navegación de archivos, carga y compartición — su nivel de hollín reflejando pasivamente cuánta actividad está ocurriendo. Cuando activas una operación de renombrado o destrucción, Gild se hace a un lado y Phix emerge con el botón [ PHIX ]: arde oscuro con un tenue brillo ámbar, se enciende al pasar el cursor, prende fuego al hacer clic, y muestra una barra de progreso estilo horno mientras partículas de ceniza fluyen de origen a destino. Volta y Ohm viven en el medidor de Julios de toda la plataforma, con Volta crepitando cerca del indicador de energía y Ohm interviniendo durante operaciones costosas para realizar su Meditación Resistiva — cambiando la barra de progreso de azul neón a un ámbar calmado. El Hollín se acumula visiblemente en las plumas de Gild a lo largo de tu sesión. Próximamente: apariciones de mascotas en páginas de error, pantallas de carga, diálogos de confirmación escalados a la severidad de la operación, y sí — merchandising.',

  // Hero Section
  [ShowcaseStrings.Hero_Badge]: '🌟 La Plataforma de Apps Descentralizadas',
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChain revoluciona el almacenamiento de datos usando el concepto "Bright Block Soup". Tus archivos se dividen en bloques y se mezclan con datos aleatorios usando operaciones XOR, haciéndolos parecer completamente aleatorios mientras mantienen una seguridad perfecta.',
  [ShowcaseStrings.Hero_Description_NotCrypto]: 'No es una criptomoneda.',
  [ShowcaseStrings.Hero_Description_P2]:
    'Sin monedas, sin minería, sin prueba de trabajo. BrightChain valora las contribuciones reales de almacenamiento y cómputo, rastreadas en Julios — una unidad vinculada a costos energéticos reales, no a especulación de mercado.',
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 Almacenamiento Sin Propietario • ⚡ Eficiente Energéticamente • 🌐 Descentralizado • 🎭 Anónimo pero Responsable • 🗳️ Votación Homomórfica • 💾 Almacenamiento Sobre Potencia',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 Demo Interactiva',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 Demo BrightChain Soup',
  [ShowcaseStrings.Hero_CTA_GitHub]: 'Ver en GitHub',
  [ShowcaseStrings.Hero_CTA_Blog]: 'Blog',

  // Components Section
  [ShowcaseStrings.Comp_Title_Revolutionary]: 'Revolucionarias',
  [ShowcaseStrings.Comp_Title_Features]: 'Características',
  [ShowcaseStrings.Comp_Title_Capabilities]: 'y Capacidades',
  [ShowcaseStrings.Comp_Subtitle]:
    'La Plataforma de Apps Descentralizadas — criptografía avanzada, almacenamiento descentralizado y gobernanza democrática',
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChain revoluciona el almacenamiento de datos usando el concepto "Bright Block Soup" — combinando criptografía avanzada, almacenamiento descentralizado y gobernanza democrática.',
  [ShowcaseStrings.Comp_Intro_P1]:
    'Tus archivos se dividen en bloques y se mezclan con datos aleatorios usando operaciones XOR, haciéndolos parecer completamente aleatorios mientras mantienen una seguridad perfecta. Desde votación homomórfica hasta anonimato intermediado, desde almacenamiento distribuido hasta gobernanza basada en quórum, BrightChain ofrece todo lo necesario para la próxima generación de aplicaciones descentralizadas.',
  [ShowcaseStrings.Comp_Problem_Title]:
    '❌ Los Problemas del Blockchain Tradicional',
  [ShowcaseStrings.Comp_Problem_1]:
    'Desperdicio masivo de energía por minería de prueba de trabajo',
  [ShowcaseStrings.Comp_Problem_2]:
    'Capacidad de almacenamiento desperdiciada en miles de millones de dispositivos',
  [ShowcaseStrings.Comp_Problem_3]:
    'Sin mecanismos de votación que preserven la privacidad',
  [ShowcaseStrings.Comp_Problem_4]:
    'El anonimato sin responsabilidad lleva al abuso',
  [ShowcaseStrings.Comp_Problem_5]:
    'El costoso almacenamiento en cadena limita las aplicaciones',
  [ShowcaseStrings.Comp_Problem_6]:
    'Los operadores de nodos enfrentan responsabilidad legal por el contenido almacenado',
  [ShowcaseStrings.Comp_Problem_Result]:
    'Tecnología blockchain que es ambientalmente destructiva, legalmente riesgosa y funcionalmente limitada.',
  [ShowcaseStrings.Comp_Solution_Title]: '✅ La Solución BrightChain',
  [ShowcaseStrings.Comp_Solution_P1]:
    'BrightChain elimina el desperdicio de minería usando prueba de trabajo solo para limitación, no para consenso. El Sistema de Archivos Sin Propietario proporciona inmunidad legal almacenando solo bloques aleatorizados por XOR. La votación homomórfica permite elecciones que preservan la privacidad, mientras que el anonimato intermediado equilibra privacidad con responsabilidad.',
  [ShowcaseStrings.Comp_Solution_P2]:
    'Construido sobre el espacio de claves de Ethereum pero diseñado sin restricciones de prueba de trabajo, BrightChain monetiza el almacenamiento no utilizado en dispositivos personales, creando una red P2P sostenible. El sistema de quórum proporciona gobernanza democrática con garantías de seguridad matemática.',
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]:
    '🔒 Almacenamiento Sin Propietario',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    'La aleatoriedad criptográfica elimina la responsabilidad de almacenamiento — ningún bloque individual contiene contenido identificable',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]:
    '⚡ Eficiente Energéticamente',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    'Sin minería de prueba de trabajo desperdiciadora — toda la computación sirve propósitos útiles',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 Descentralizado',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    'Distribuido a través de la red — almacenamiento P2P tipo IPFS utilizando espacio desperdiciado en dispositivos personales',
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 Anónimo pero Responsable',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    'Privacidad con capacidades de moderación — anonimato intermediado vía consenso de quórum',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ Votación Homomórfica',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    'Elecciones que preservan la privacidad con conteo de votos que nunca revela votos individuales',
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 Gobernanza por Quórum',
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    'Toma de decisiones democrática con umbrales configurables y seguridad matemática',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 Construye con BrightStack',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node — cambia MongoDB por BrightDB, mantén todo lo demás',
  [ShowcaseStrings.Comp_ProjectPage]: 'Página del Proyecto',

  // Demo Section
  [ShowcaseStrings.Demo_Title_Interactive]: 'Demo',
  [ShowcaseStrings.Demo_Title_Demo]: 'Interactiva',
  [ShowcaseStrings.Demo_Subtitle]: 'Visualizando capacidades de cifrado ECIES',
  [ShowcaseStrings.Demo_Disclaimer]:
    'Nota: Esta visualización usa @digitaldefiance/ecies-lib (la biblioteca del navegador) con fines de demostración. @digitaldefiance/node-ecies-lib proporciona funcionalidad idéntica con la misma API para aplicaciones de servidor Node.js. Ambas bibliotecas son compatibles a nivel binario, por lo que los datos cifrados con una pueden ser descifrados por la otra.',
  [ShowcaseStrings.Demo_Alice_Title]: 'Alice (Remitente)',
  [ShowcaseStrings.Demo_Alice_PublicKey]: 'Clave Pública:',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: 'Mensaje a Cifrar:',
  [ShowcaseStrings.Demo_Alice_Placeholder]: 'Ingresa un mensaje secreto...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: 'Cifrando...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Cifrar para Bob',
  [ShowcaseStrings.Demo_Bob_Title]: 'Bob (Receptor)',
  [ShowcaseStrings.Demo_Bob_PublicKey]: 'Clave Pública:',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: 'Carga Cifrada:',
  [ShowcaseStrings.Demo_Bob_Decrypting]: 'Descifrando...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'Descifrar Mensaje',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: 'Mensaje Descifrado:',
  [ShowcaseStrings.Demo_Error]: 'Error:',

  // About Section
  [ShowcaseStrings.About_Title_BuiltWith]: 'Construido con',
  [ShowcaseStrings.About_Title_By]: 'por Digital Defiance',
  [ShowcaseStrings.About_Subtitle]:
    'Innovación de código abierto en infraestructura descentralizada',
  [ShowcaseStrings.About_Vision_Title]: 'Nuestra Visión',
  [ShowcaseStrings.About_Vision_P1]:
    'En Digital Defiance, creemos en empoderar a individuos y organizaciones con infraestructura verdaderamente descentralizada que respeta la privacidad, promueve la sostenibilidad y permite la participación democrática.',
  [ShowcaseStrings.About_Vision_P2]:
    'BrightChain revoluciona el almacenamiento de datos usando el concepto "Bright Block Soup". Tus archivos se dividen en bloques y se mezclan con datos aleatorios usando operaciones XOR, haciéndolos parecer completamente aleatorios mientras mantienen una seguridad perfecta. Al eliminar el desperdicio de minería, monetizar el almacenamiento no utilizado e implementar características como votación homomórfica y anonimato intermediado, hemos creado una plataforma que funciona para todos.',
  [ShowcaseStrings.About_Vision_NotCrypto]:
    'No es una Criptomoneda. Cuando escuchas "blockchain", probablemente piensas en Bitcoin. BrightChain no tiene moneda, ni prueba de trabajo, ni minería. En lugar de quemar energía para acuñar monedas, BrightChain valora las contribuciones reales de almacenamiento y cómputo. Esas contribuciones se rastrean en una unidad llamada Julio, que está vinculada a costos energéticos reales por fórmula — no a especulación de mercado. No puedes minar Julios ni intercambiarlos; reflejan costos reales de recursos, y refinamos esa fórmula con el tiempo.',
  [ShowcaseStrings.About_Vision_StorageDensity]:
    'La Ventaja de Densidad de Almacenamiento vs. Potencia: Cada blockchain tiene desperdicio en algún lugar. BrightChain reduce el desperdicio de todas las formas posibles, pero tiene algo de sobrecarga en su mecanismo de almacenamiento. Sin embargo, el almacenamiento es una de las áreas que ha sido más rentable y donde hemos logrado una densidad masiva en los últimos años, mientras que los centros de datos luchan por lograr la densidad de potencia necesaria para los requisitos de CPU de blockchains e IA. El intercambio de una sobrecarga mínima de almacenamiento por anonimato y absolución de preocupaciones por demandas de derechos de autor y similares, o alojar material inapropiado, permite que todos participen plenamente y aprovechen al máximo nuestros vastos recursos de almacenamiento distribuidos por todo el mundo.',
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStack es el paradigma full-stack para apps descentralizadas: BrightChain + Express + React + Node. Si conoces el stack MERN, ya conoces BrightStack — solo cambia MongoDB por BrightDB.',
  [ShowcaseStrings.About_BrightStack_P2]:
    'BrightDB es una base de datos de documentos tipo MongoDB en el Sistema de Archivos Sin Propietario con CRUD completo, consultas, índices, transacciones y pipelines de agregación. Los mismos patrones que usas con MongoDB — colecciones, find, insert, update — pero cada documento se almacena como bloques blanqueados que preservan la privacidad.',
  [ShowcaseStrings.About_BrightStack_P3]:
    'BrightPass, BrightMail y BrightHub fueron todos construidos sobre BrightStack, demostrando que el desarrollo de apps descentralizadas puede ser tan fácil como el full-stack tradicional.',
  [ShowcaseStrings.About_OpenSource]:
    '100% Código Abierto. BrightChain es completamente de código abierto bajo la Licencia MIT. Construye tus propias dApps en BrightStack y contribuye al futuro descentralizado.',
  [ShowcaseStrings.About_WorkInProgress]:
    'BrightChain es un trabajo en progreso. Actualmente, nuestro objetivo es dejar la compilación estable diariamente, pero las cosas pueden escaparse y BrightChain aún no es maduro. Nos disculpamos por cualquier inconveniente o inestabilidad.',
  [ShowcaseStrings.About_OtherImpl_Title]: 'Otras Implementaciones',
  [ShowcaseStrings.About_OtherImpl_P1]:
    'Aunque esta implementación en TypeScript/Node.js es la versión principal y más madura de BrightChain, una biblioteca central en C++ paralela con UI para macOS/iOS está en desarrollo. Esta implementación nativa trae las características de privacidad y seguridad de BrightChain a las plataformas Apple. Ambos repositorios están en desarrollo temprano y aún no están listos para uso en producción.',
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'Aunque esta implementación en TypeScript/Node.js es la versión principal y más madura, una ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'biblioteca central en C++',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'interfaz macOS/iOS',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    ' está en desarrollo. Esta implementación nativa lleva las capacidades de privacidad y rendimiento de BrightChain directamente a los dispositivos Apple.',
  [ShowcaseStrings.About_Feature_OwnerFree_Title]:
    'Almacenamiento Sin Propietario',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    'La aleatoriedad criptográfica elimina la responsabilidad de almacenamiento. Ningún bloque individual contiene contenido identificable, proporcionando inmunidad legal para los operadores de nodos.',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]:
    'Eficiente Energéticamente',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    'Sin minería de prueba de trabajo desperdiciadora. Toda la computación sirve propósitos útiles — almacenamiento, verificación y operaciones de red.',
  [ShowcaseStrings.About_Feature_Anonymous_Title]: 'Anónimo pero Responsable',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    'Privacidad con capacidades de moderación. El anonimato intermediado equilibra privacidad con responsabilidad vía consenso de quórum.',
  [ShowcaseStrings.About_CTA_Title]: 'Únete a la Revolución',
  [ShowcaseStrings.About_CTA_Desc]:
    'Ayúdanos a construir el futuro de la infraestructura descentralizada. Contribuye a BrightChain, reporta problemas o danos una estrella en GitHub para mostrar tu apoyo a la tecnología blockchain sostenible.',
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 Demo Interactiva',
  [ShowcaseStrings.About_CTA_LearnMore]: 'Saber Más',
  [ShowcaseStrings.About_CTA_GitHub]: 'Visitar BrightChain en GitHub',
  [ShowcaseStrings.About_CTA_Docs]: 'Leer la Documentación',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance. Hecho con ❤️ para la comunidad de desarrollo.',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]:
    'Inicializando sistema de votación criptográfico...',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 Descifrando votos...',
  [ShowcaseStrings.Vote_LoadingDemo]: 'Cargando demo de votación...',
  [ShowcaseStrings.Vote_RunAnotherElection]: 'Realizar Otra Elección',
  [ShowcaseStrings.Vote_StartElection]: '🎯 ¡Iniciar la Elección!',
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 Demo de {METHOD}',
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    'Este método de votación está completamente implementado en la biblioteca.',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 Ciudadanos Votando ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    'Votos Emitidos ({VOTED}/{TOTAL} votaron)',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ Votó por {CHOICE}',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 Resultados',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} votos ({PERCENT}%)',
  [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT} aprobaciones ({PERCENT}%)',
  [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 Mostrar Registro de Auditoría',
  [ShowcaseStrings.Vote_HideAuditLog]: '🔍 Ocultar Registro de Auditoría',
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 Mostrar Registro de Eventos',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 Ocultar Registro de Eventos',
  [ShowcaseStrings.Vote_AuditLogTitle]:
    '🔒 Registro de Auditoría Inmutable (Requisito 1.1)',
  [ShowcaseStrings.Vote_AuditLogDesc]:
    'Rastro de auditoría firmado criptográficamente y encadenado por hash',
  [ShowcaseStrings.Vote_ChainIntegrity]: 'Integridad de la Cadena:',
  [ShowcaseStrings.Vote_ChainValid]: '✅ Válida',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ Comprometida',
  [ShowcaseStrings.Vote_EventLogTitle]:
    '📊 Registro de Eventos (Requisito 1.3)',
  [ShowcaseStrings.Vote_EventLogDesc]:
    'Seguimiento integral de eventos con marcas de tiempo en microsegundos y números de secuencia',
  [ShowcaseStrings.Vote_SequenceIntegrity]: 'Integridad de Secuencia:',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ Válida',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ Brechas Detectadas',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: 'Total de Eventos: {COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: 'Marca de Tiempo:',
  [ShowcaseStrings.Vote_VoterToken]: 'Token del Votante:',

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ Sistema de Votación de Grado Gubernamental',
  [ShowcaseStrings.Vote_TitleDesc]:
    'Explora nuestra completa biblioteca de votación criptográfica con 15 métodos de votación diferentes. Cada demo muestra casos de uso reales con cifrado homomórfico que garantiza la privacidad del voto.',
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ Cifrado Homomórfico',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 Recibos Verificables',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ Separación de Roles',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ Pruebas',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: 'Seleccionar Método de Votación',
  [ShowcaseStrings.VoteSel_SecureCategory]:
    '✅ Totalmente Seguro (Una ronda, preserva la privacidad)',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    '⚠️ Múltiples Rondas (Requiere descifrado intermedio)',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ Inseguro (Sin privacidad — solo casos especiales)',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: 'Pluralidad',
  [ShowcaseStrings.VoteMethod_Approval]: 'Aprobación',
  [ShowcaseStrings.VoteMethod_Weighted]: 'Ponderado',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'Conteo Borda',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: 'Votación por Puntuación',
  [ShowcaseStrings.VoteMethod_YesNo]: 'Sí/No',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: 'Sí/No/Abstención',
  [ShowcaseStrings.VoteMethod_Supermajority]: 'Supermayoría',
  [ShowcaseStrings.VoteMethod_RankedChoice]: 'Elección por Ranking (IRV)',
  [ShowcaseStrings.VoteMethod_TwoRound]: 'Dos Rondas',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: 'Cuadrática',
  [ShowcaseStrings.VoteMethod_Consensus]: 'Consenso',
  [ShowcaseStrings.VoteMethod_ConsentBased]: 'Basado en Consentimiento',

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]:
    '¡Bienvenido a la Elección del Presupuesto de Riverside City!',
  [ShowcaseStrings.Plur_IntroStory]:
    'El concejo municipal ha asignado $50 millones para una gran iniciativa, pero no logran decidir qué proyecto financiar. ¡Ahí es donde entras TÚ!',
  [ShowcaseStrings.Plur_IntroSituation]:
    'Tres propuestas están en la boleta. Cada una tiene partidarios apasionados, pero solo UNA puede ganar.',
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    'El Equipo Verde quiere paneles solares en cada edificio público',
  [ShowcaseStrings.Plur_IntroTransit]:
    'Los Defensores del Transporte impulsan una nueva línea de metro',
  [ShowcaseStrings.Plur_IntroHousing]:
    'La Coalición de Vivienda exige hogares asequibles para 500 familias',
  [ShowcaseStrings.Plur_IntroChallenge]:
    'Emitirás votos por 5 ciudadanos. Cada voto está cifrado — ni siquiera los funcionarios electorales pueden ver las boletas individuales hasta el conteo final. ¡Así es como deberían funcionar las democracias reales!',
  [ShowcaseStrings.Plur_DemoTitle]:
    '🗳️ Votación por Pluralidad — Presupuesto de Riverside City',
  [ShowcaseStrings.Plur_DemoTagline]:
    '🏛️ Un voto por persona. Gana quien tenga más votos. ¡La democracia en acción!',
  [ShowcaseStrings.Plur_CandidatesTitle]:
    'Prioridades del Presupuesto Municipal',
  [ShowcaseStrings.Plur_VoterInstruction]:
    'Haz clic en una propuesta para emitir el voto de cada ciudadano. Recuerda: ¡su elección está cifrada y es privada!',
  [ShowcaseStrings.Plur_ClosePollsBtn]: '📦 ¡Cerrar Urnas y Contar Votos!',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 ¡El Pueblo Ha Hablado!',
  [ShowcaseStrings.Plur_ResultsIntro]:
    'Después de descifrar todos los votos, esto es lo que eligió Riverside:',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 Proceso de Conteo de Votos',
  [ShowcaseStrings.Plur_TallyExplain]:
    'Cada voto cifrado fue sumado homomórficamente, luego descifrado para revelar los totales:',
  [ShowcaseStrings.Plur_Cand1_Name]: 'Iniciativa de Energía Verde',
  [ShowcaseStrings.Plur_Cand1_Desc]:
    'Invertir en infraestructura de energía renovable',
  [ShowcaseStrings.Plur_Cand2_Name]: 'Expansión del Transporte Público',
  [ShowcaseStrings.Plur_Cand2_Desc]:
    'Construir nuevas líneas de metro y rutas de autobús',
  [ShowcaseStrings.Plur_Cand3_Name]: 'Programa de Vivienda Asequible',
  [ShowcaseStrings.Plur_Cand3_Desc]:
    'Subsidiar vivienda para familias de bajos ingresos',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: '¡La gran decisión de TechCorp!',
  [ShowcaseStrings.Appr_IntroStory]:
    '📢 Reunión de equipo de emergencia: "¡Necesitamos elegir nuestro stack tecnológico para los próximos 5 años, pero todos tienen opiniones diferentes!"',
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'El CTO tiene una idea brillante: Votación por aprobación. En lugar de pelear por UN solo lenguaje, todos pueden votar por TODOS los lenguajes con los que estarían contentos de trabajar.',
  [ShowcaseStrings.Appr_IntroStakes]:
    '🤔 El giro: Puedes aprobar tantos o tan pocos como quieras. ¿Te encantan TypeScript Y Python? ¡Vota por ambos! ¿Solo confías en Rust? ¡Ese es tu voto!',
  [ShowcaseStrings.Appr_IntroWinner]:
    '🎯 El ganador: El lenguaje que obtenga más aprobaciones se convierte en el lenguaje principal del equipo.',
  [ShowcaseStrings.Appr_IntroChallenge]:
    'Así es como la ONU elige a su Secretario General. Sin división de votos, sin juegos estratégicos — ¡solo preferencias honestas!',
  [ShowcaseStrings.Appr_StartBtn]: '🚀 ¡Votemos!',
  [ShowcaseStrings.Appr_DemoTitle]:
    '✅ Votación por aprobación - Selección de stack de TechCorp',
  [ShowcaseStrings.Appr_DemoTagline]:
    '👍 Vota por TODOS los lenguajes que apruebes. ¡El que más aprobaciones tenga gana!',
  [ShowcaseStrings.Appr_CandidatesTitle]:
    'Lenguajes de programación preferidos del equipo',
  [ShowcaseStrings.Appr_Cand1_Desc]: 'Superconjunto tipado de JavaScript',
  [ShowcaseStrings.Appr_Cand2_Desc]: 'Lenguaje de scripting versátil',
  [ShowcaseStrings.Appr_Cand3_Desc]:
    'Lenguaje de sistemas con seguridad de memoria',
  [ShowcaseStrings.Appr_Cand4_Desc]: 'Lenguaje concurrente rápido',
  [ShowcaseStrings.Appr_Cand5_Desc]: 'Plataforma empresarial',
  [ShowcaseStrings.Appr_VotersTitle]:
    'Emitir votos ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.Appr_SubmitBtn]: 'Enviar ({COUNT} seleccionados)',
  [ShowcaseStrings.Appr_TallyBtn]: 'Contar votos y revelar resultados',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ Votado',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: '¡Selección de la ciudad sede olímpica!',
  [ShowcaseStrings.Borda_IntroStory]:
    '🌍 Sala del comité del COI: Cinco naciones deben elegir la próxima ciudad sede olímpica. ¡Pero todos tienen preferencias!',
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 El conteo de Borda otorga puntos según el ranking: 1er lugar = 3 puntos, 2do = 2 puntos, 3ro = 1 punto.',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 Esto premia las opciones de consenso sobre las polarizantes. ¡La ciudad con más puntos totales gana!',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 ¡Comenzar la votación!',
  [ShowcaseStrings.Borda_DemoTitle]:
    '🏆 Conteo de Borda - Selección de sede olímpica',
  [ShowcaseStrings.Borda_DemoTagline]:
    '📊 Clasifica todas las ciudades. ¡Puntos = consenso!',
  [ShowcaseStrings.Borda_CandidatesTitle]: 'Ciudades candidatas',
  [ShowcaseStrings.Borda_Cand1_Desc]: 'Ciudad de la Luz',
  [ShowcaseStrings.Borda_Cand2_Desc]: 'Sol Naciente',
  [ShowcaseStrings.Borda_Cand3_Desc]: 'Ciudad de los Ángeles',
  [ShowcaseStrings.Borda_VotersTitle]:
    'Miembros del COI ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ ¡Clasificado!',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 ¡Contar puntos!',
  [ShowcaseStrings.Borda_ResultsTitle]: '🎉 ¡Ciudad sede olímpica anunciada!',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} puntos',
  [ShowcaseStrings.Borda_NewVoteBtn]: 'Nueva votación',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 Demo de Paso de Mensajes de BrightChain',
  [ShowcaseStrings.Msg_Subtitle]:
    '¡Envía mensajes almacenados como bloques CBL en el soup!',
  [ShowcaseStrings.Msg_Initializing]: 'Inicializando...',
  [ShowcaseStrings.Msg_SendTitle]: 'Enviar Mensaje',
  [ShowcaseStrings.Msg_FromLabel]: 'De:',
  [ShowcaseStrings.Msg_ToLabel]: 'Para:',
  [ShowcaseStrings.Msg_Placeholder]: 'Escribe tu mensaje...',
  [ShowcaseStrings.Msg_SendBtn]: '📤 Enviar Mensaje',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 Mensajes ({COUNT})',
  [ShowcaseStrings.Msg_NoMessages]:
    'Aún no hay mensajes. ¡Envía tu primer mensaje! ✨',
  [ShowcaseStrings.Msg_From]: 'De:',
  [ShowcaseStrings.Msg_To]: 'Para:',
  [ShowcaseStrings.Msg_Message]: 'Mensaje:',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Recuperar del Soup',
  [ShowcaseStrings.Msg_SendFailed]: 'Error al enviar mensaje:',
  [ShowcaseStrings.Msg_RetrieveFailed]: 'Error al recuperar mensaje:',
  [ShowcaseStrings.Msg_ContentTemplate]: 'Contenido del mensaje: {CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ Libro Mayor Blockchain',
  [ShowcaseStrings.Ledger_Subtitle]:
    'Un libro mayor de solo adición, encadenado criptográficamente, firmado digitalmente con gobernanza basada en roles. Agrega entradas, gestiona firmantes y valida la cadena.',
  [ShowcaseStrings.Ledger_Initializing]:
    'Generando pares de claves SECP256k1 para firmantes…',
  [ShowcaseStrings.Ledger_Entries]: 'Entradas',
  [ShowcaseStrings.Ledger_ActiveSigners]: 'Firmantes Activos',
  [ShowcaseStrings.Ledger_Admins]: 'Administradores',
  [ShowcaseStrings.Ledger_BrightTrust]: 'Quórum',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 Validar Cadena',
  [ShowcaseStrings.Ledger_Reset]: '🔄 Reiniciar',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 Firmante Activo',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 Agregar Entrada',
  [ShowcaseStrings.Ledger_PayloadLabel]: 'Carga útil (texto)',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'Ingresa datos…',
  [ShowcaseStrings.Ledger_AppendBtn]: 'Agregar a la Cadena',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 Firmantes Autorizados',
  [ShowcaseStrings.Ledger_Suspend]: 'Suspender',
  [ShowcaseStrings.Ledger_Reactivate]: 'Reactivar',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ Admin',
  [ShowcaseStrings.Ledger_ToWriter]: '→ Escritor',
  [ShowcaseStrings.Ledger_Retire]: 'Retirar',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: 'Nombre del nuevo firmante',
  [ShowcaseStrings.Ledger_AddSigner]: '+ Agregar Firmante',
  [ShowcaseStrings.Ledger_EventLog]: '📋 Registro de Eventos',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ Cadena',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 Génesis',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ Gobernanza',
  [ShowcaseStrings.Ledger_Data]: '📄 Datos',
  [ShowcaseStrings.Ledger_EntryDetails]: 'Detalles de la Entrada #{SEQ}',
  [ShowcaseStrings.Ledger_Type]: 'Tipo',
  [ShowcaseStrings.Ledger_Sequence]: 'Secuencia',
  [ShowcaseStrings.Ledger_Timestamp]: 'Marca de Tiempo',
  [ShowcaseStrings.Ledger_EntryHash]: 'Hash de la Entrada',
  [ShowcaseStrings.Ledger_PreviousHash]: 'Hash Anterior',
  [ShowcaseStrings.Ledger_NullGenesis]: 'nulo (génesis)',
  [ShowcaseStrings.Ledger_Signer]: 'Firmante',
  [ShowcaseStrings.Ledger_SignerKey]: 'Clave del Firmante',
  [ShowcaseStrings.Ledger_Signature]: 'Firma',
  [ShowcaseStrings.Ledger_PayloadSize]: 'Tamaño de la Carga Útil',
  [ShowcaseStrings.Ledger_Payload]: 'Carga Útil',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} bytes',
  // Note: "bytes" is the standard technical term in Spanish

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: 'Saltar al contenido principal',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: 'Desplázate para explorar',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ Aviso de compatibilidad del navegador',
  [ShowcaseStrings.Compat_DismissAriaLabel]: 'Descartar aviso',
  [ShowcaseStrings.Compat_BrowserNotice]:
    'Tu navegador ({BROWSER} {VERSION}) puede no ser compatible con todas las funciones de esta demostración.',
  [ShowcaseStrings.Compat_CriticalIssues]: 'Problemas críticos:',
  [ShowcaseStrings.Compat_Warnings]: 'Advertencias:',
  [ShowcaseStrings.Compat_RecommendedActions]: 'Acciones recomendadas:',
  [ShowcaseStrings.Compat_Recommendation]:
    'Para la mejor experiencia, utiliza la última versión de Chrome, Firefox, Safari o Edge.',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: 'Panel de depuración',
  [ShowcaseStrings.Debug_OpenTitle]: 'Abrir panel de depuración',
  [ShowcaseStrings.Debug_CloseTitle]: 'Cerrar panel de depuración',
  [ShowcaseStrings.Debug_BlockStore]: 'Almacén de bloques',
  [ShowcaseStrings.Debug_SessionId]: 'ID de sesión:',
  [ShowcaseStrings.Debug_BlockCount]: 'Cantidad de bloques:',
  [ShowcaseStrings.Debug_TotalSize]: 'Tamaño total:',
  [ShowcaseStrings.Debug_LastOperation]: 'Última operación:',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: 'IDs de bloques ({COUNT})',
  [ShowcaseStrings.Debug_ClearSession]: 'Limpiar sesión',
  [ShowcaseStrings.Debug_AnimationState]: 'Estado de animación',
  [ShowcaseStrings.Debug_Playing]: 'Reproduciendo',
  [ShowcaseStrings.Debug_Paused]: 'Pausado',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ Reproduciendo',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ Pausado',
  [ShowcaseStrings.Debug_Speed]: 'Velocidad:',
  [ShowcaseStrings.Debug_Frame]: 'Fotograma:',
  [ShowcaseStrings.Debug_Sequence]: 'Secuencia:',
  [ShowcaseStrings.Debug_Progress]: 'Progreso:',
  [ShowcaseStrings.Debug_Performance]: 'Rendimiento',
  [ShowcaseStrings.Debug_FrameRate]: 'Tasa de fotogramas:',
  [ShowcaseStrings.Debug_FrameTime]: 'Tiempo de fotograma:',
  [ShowcaseStrings.Debug_DroppedFrames]: 'Fotogramas perdidos:',
  [ShowcaseStrings.Debug_Memory]: 'Memoria:',
  [ShowcaseStrings.Debug_Sequences]: 'Secuencias:',
  [ShowcaseStrings.Debug_Errors]: 'Errores:',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 Animación de reconstrucción de archivo',
  [ShowcaseStrings.Recon_Subtitle]:
    'Observa cómo los bloques se reensamblan en tu archivo original',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: 'Procesando CBL',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    'Leyendo metadatos de la Lista de Bloques Constituyentes',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: 'Seleccionando bloques',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    'Identificando bloques requeridos de la sopa',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'Recuperando bloques',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]:
    'Recopilando bloques del almacenamiento',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]:
    'Validando sumas de verificación',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    'Verificando integridad de bloques',
  [ShowcaseStrings.Recon_Step_Reassemble]: 'Reensamblando archivo',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    'Combinando bloques y eliminando relleno',
  [ShowcaseStrings.Recon_Step_DownloadReady]: 'Descarga lista',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    'Reconstrucción de archivo completa',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 Lista de Bloques Constituyentes',
  [ShowcaseStrings.Recon_CBLSubtitle]:
    'Referencias de bloques extraídas del CBL',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 Bloques ({COUNT})',
  [ShowcaseStrings.Recon_BlocksSubtitle]:
    'Bloques siendo recuperados y validados',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 Reensamblaje de archivo',
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    'Combinando bloques y eliminando relleno',
  [ShowcaseStrings.Recon_Complete]: '¡Reconstrucción de archivo completa!',
  [ShowcaseStrings.Recon_ReadyForDownload]:
    'Tu archivo está listo para descargar',
  [ShowcaseStrings.Recon_FileName]: 'Nombre de archivo:',
  [ShowcaseStrings.Recon_Size]: 'Tamaño:',
  [ShowcaseStrings.Recon_Blocks]: 'Bloques:',
  [ShowcaseStrings.Recon_WhatsHappening]: 'Qué está pasando ahora',
  [ShowcaseStrings.Recon_TechDetails]: 'Detalles técnicos:',
  [ShowcaseStrings.Recon_CBLContainsRefs]:
    'El CBL contiene referencias a todos los bloques',
  [ShowcaseStrings.Recon_BlockCountTemplate]: 'Cantidad de bloques: {COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    'Tamaño original del archivo: {SIZE} bytes',
  [ShowcaseStrings.Recon_BlockSelection]: 'Selección de bloques:',
  [ShowcaseStrings.Recon_IdentifyingBlocks]: 'Identificando bloques en la sopa',
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    'Los bloques se seleccionan por sus sumas de verificación',
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    'Todos los bloques deben estar presentes para la reconstrucción',
  [ShowcaseStrings.Recon_ChecksumValidation]:
    'Validación de sumas de verificación:',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    'Asegura que los bloques no se hayan corrompido',
  [ShowcaseStrings.Recon_ComparesChecksums]:
    'Compara la suma almacenada con la suma calculada',
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    'Los bloques inválidos causarían que la reconstrucción falle',
  [ShowcaseStrings.Recon_FileReassembly]: 'Reensamblaje de archivo:',
  [ShowcaseStrings.Recon_CombinedInOrder]:
    'Los bloques se combinan en el orden correcto',
  [ShowcaseStrings.Recon_PaddingRemoved]: 'Se elimina el relleno aleatorio',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    'El archivo original se reconstruye byte por byte',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]:
    'Demostración animada de BrightChain Block Soup',
  [ShowcaseStrings.Anim_Subtitle]:
    '¡Experimenta el proceso de BrightChain con animaciones paso a paso y contenido educativo!',
  [ShowcaseStrings.Anim_Initializing]:
    'Inicializando demostración animada de BrightChain...',
  [ShowcaseStrings.Anim_PauseAnimation]: 'Pausar animación',
  [ShowcaseStrings.Anim_PlayAnimation]: 'Reproducir animación',
  [ShowcaseStrings.Anim_ResetAnimation]: 'Reiniciar animación',
  [ShowcaseStrings.Anim_SpeedTemplate]: 'Velocidad: {SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 Monitor de rendimiento',
  [ShowcaseStrings.Anim_FrameRate]: 'Tasa de fotogramas:',
  [ShowcaseStrings.Anim_FrameTime]: 'Tiempo de fotograma:',
  [ShowcaseStrings.Anim_DroppedFrames]: 'Fotogramas perdidos:',
  [ShowcaseStrings.Anim_Memory]: 'Memoria:',
  [ShowcaseStrings.Anim_Sequences]: 'Secuencias:',
  [ShowcaseStrings.Anim_Errors]: 'Errores:',
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    'Arrastra archivos aquí o haz clic para subir',
  [ShowcaseStrings.Anim_ChooseFiles]: 'Elegir archivos',
  [ShowcaseStrings.Anim_StorageTemplate]:
    'Almacenamiento Block Soup ({COUNT} archivos)',
  [ShowcaseStrings.Anim_NoFilesYet]:
    'Aún no hay archivos almacenados. ¡Sube algunos archivos para ver la magia animada! ✨',
  [ShowcaseStrings.Anim_RetrieveFile]: 'Recuperar archivo',
  [ShowcaseStrings.Anim_DownloadCBL]: 'Descargar CBL',
  [ShowcaseStrings.Anim_SizeTemplate]:
    'Tamaño: {SIZE} bytes | Bloques: {BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: 'Animación de codificación',
  [ShowcaseStrings.Anim_ReconstructionAnimation]: 'Animación de reconstrucción',
  [ShowcaseStrings.Anim_CurrentStep]: 'Paso actual',
  [ShowcaseStrings.Anim_DurationTemplate]: 'Duración: {DURATION}ms',
  [ShowcaseStrings.Anim_BlockDetails]: 'Detalles del bloque',
  [ShowcaseStrings.Anim_Index]: 'Índice:',
  [ShowcaseStrings.Anim_Size]: 'Tamaño:',
  [ShowcaseStrings.Anim_Id]: 'ID:',
  [ShowcaseStrings.Anim_Stats]: 'Estadísticas de animación',
  [ShowcaseStrings.Anim_TotalFiles]: 'Total de archivos:',
  [ShowcaseStrings.Anim_TotalBlocks]: 'Total de bloques:',
  [ShowcaseStrings.Anim_AnimationSpeed]: 'Velocidad de animación:',
  [ShowcaseStrings.Anim_Session]: 'Sesión:',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    '(Los datos se borran al actualizar la página)',
  [ShowcaseStrings.Anim_WhatsHappening]: 'Qué está pasando:',
  [ShowcaseStrings.Anim_Duration]: 'Duración:',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'Demostración de BrightChain',
  [ShowcaseStrings.Soup_Subtitle]:
    'Almacena archivos y mensajes como bloques en la sopa de bloques descentralizada. ¡Todo se convierte en coloridas latas de sopa!',
  [ShowcaseStrings.Soup_Initializing]:
    'Inicializando SessionIsolatedBrightChain...',
  [ShowcaseStrings.Soup_StoreInSoup]: 'Almacenar datos en Block Soup',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 Almacenar archivos',
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    'Arrastra archivos aquí o haz clic para subir',
  [ShowcaseStrings.Soup_ChooseFiles]: 'Elegir archivos',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 Almacenar CBL en la sopa con URL magnética',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    'Almacena el CBL en la sopa de bloques usando blanqueamiento XOR y genera una URL magnética compartible. Sin esto, obtienes el archivo CBL directamente.',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 Almacenar mensajes',
  [ShowcaseStrings.Soup_From]: 'De:',
  [ShowcaseStrings.Soup_To]: 'Para:',
  [ShowcaseStrings.Soup_Message]: 'Mensaje:',
  [ShowcaseStrings.Soup_TypeMessage]: 'Escribe tu mensaje...',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 Enviar mensaje a la sopa',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL almacenado en la sopa',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 Super CBL utilizado',
  [ShowcaseStrings.Soup_HierarchyDepth]: 'Profundidad de jerarquía:',
  [ShowcaseStrings.Soup_SubCBLs]: 'Sub-CBLs:',
  [ShowcaseStrings.Soup_LargeFileSplit]:
    'Archivo grande dividido en estructura jerárquica',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    'Tu CBL ha sido almacenado en la sopa de bloques como dos componentes XOR. Usa esta URL magnética para recuperar el archivo:',
  [ShowcaseStrings.Soup_Component1]: 'Componente 1:',
  [ShowcaseStrings.Soup_Component2]: 'Componente 2:',
  [ShowcaseStrings.Soup_Copy]: '📋 Copiar',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Recuperar de la sopa',
  [ShowcaseStrings.Soup_UploadCBLFile]: 'Subir archivo CBL',
  [ShowcaseStrings.Soup_UseMagnetURL]: 'Usar URL magnética',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    'Sube un archivo .cbl para reconstruir el archivo original de la sopa de bloques. Los bloques ya deben estar en la sopa para que la reconstrucción funcione.',
  [ShowcaseStrings.Soup_ChooseCBLFile]: 'Elegir archivo CBL',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    'Pega una URL magnética para recuperar el archivo. La URL magnética referencia los componentes CBL blanqueados almacenados en la sopa.',
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: 'Cargar',
  [ShowcaseStrings.Soup_MessagePassing]: 'Paso de mensajes',
  [ShowcaseStrings.Soup_HideMessagePanel]: 'Ocultar panel de mensajes',
  [ShowcaseStrings.Soup_ShowMessagePanel]: 'Mostrar panel de mensajes',
  [ShowcaseStrings.Soup_SendMessage]: 'Enviar mensaje',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 Mensajes ({COUNT})',
  [ShowcaseStrings.Soup_NoMessagesYet]:
    'Aún no hay mensajes. ¡Envía tu primer mensaje! ✨',
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Recuperar de la sopa',
  [ShowcaseStrings.Soup_StoredMessages]: 'Mensajes almacenados',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]:
    'Archivos y mensajes almacenados',
  [ShowcaseStrings.Soup_RemoveFromList]: 'Eliminar de la lista',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    '¿Eliminar "{NAME}" de la lista? (Los bloques permanecerán en la sopa)',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 Recuperar archivo',
  [ShowcaseStrings.Soup_DownloadCBL]: 'Descargar CBL',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 Recuperar mensaje',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 URL magnética',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    'URL magnética de CBL blanqueado (usa "Usar URL magnética" para recuperar)',
  [ShowcaseStrings.Soup_ProcessingSteps]: 'Pasos de procesamiento',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'Pasos de almacenamiento CBL',
  [ShowcaseStrings.Soup_BlockDetails]: 'Detalles del bloque',
  [ShowcaseStrings.Soup_Index]: 'Índice:',
  [ShowcaseStrings.Soup_Size]: 'Tamaño:',
  [ShowcaseStrings.Soup_Id]: 'ID:',
  [ShowcaseStrings.Soup_Color]: 'Color:',
  // Note: "Color" is the same word in Spanish
  [ShowcaseStrings.Soup_SoupStats]: 'Estadísticas de la sopa',
  [ShowcaseStrings.Soup_TotalFiles]: 'Total de archivos:',
  [ShowcaseStrings.Soup_TotalBlocks]: 'Total de bloques:',
  [ShowcaseStrings.Soup_BlockSize]: 'Tamaño de bloque:',
  [ShowcaseStrings.Soup_SessionDebug]: 'Depuración de sesión',
  [ShowcaseStrings.Soup_SessionId]: 'ID de sesión:',
  [ShowcaseStrings.Soup_BlocksInMemory]: 'Bloques en memoria:',
  [ShowcaseStrings.Soup_BlockIds]: 'IDs de bloques:',
  [ShowcaseStrings.Soup_ClearSession]: 'Limpiar sesión',
  [ShowcaseStrings.Soup_Session]: 'Sesión:',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    '(Los datos se borran al actualizar la página)',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]:
    'Selecciona un archivo para resaltar sus bloques:',
  [ShowcaseStrings.ESV_BlockSoup]: 'Sopa de bloques',
  [ShowcaseStrings.ESV_ShowingConnections]: 'Mostrando conexiones para:',
  [ShowcaseStrings.ESV_EmptySoup]: 'Sopa vacía',
  [ShowcaseStrings.ESV_EmptySoupHint]:
    '¡Sube archivos para verlos transformados en coloridas latas de sopa!',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} bloques • {size} bytes',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]:
    '¡Noche de premios de los críticos de cine!',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    'Tres películas están nominadas a Mejor Película. Los críticos deben calificar cada una de forma independiente.',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    '¡Califica cada película de 0 a 10. ¿Te encanta una, odias otra? ¡Puntúa con honestidad! El promedio más alto gana.',
  [ShowcaseStrings.Score_IntroChallenge]:
    'A diferencia del ranking, ¡puedes dar puntuaciones altas a varias películas si todas son geniales!',
  [ShowcaseStrings.Score_StartBtn]: '🎬 ¡Comenzar a calificar!',
  [ShowcaseStrings.Score_DemoTitle]:
    '⭐ Votación por puntuación - Mejor Película',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 ¡Califica cada película de 0 a 10. El promedio más alto gana!',
  [ShowcaseStrings.Score_NominatedFilms]: 'Películas nominadas',
  [ShowcaseStrings.Score_Genre_SciFi]: 'Épica de ciencia ficción',
  [ShowcaseStrings.Score_Genre_Romance]: 'Drama romántico',
  [ShowcaseStrings.Score_Genre_Thriller]: 'Thriller tecnológico',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 Calificaciones de {VOTER}',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - Terrible',
  [ShowcaseStrings.Score_Label_Average]: '5 - Promedio',
  [ShowcaseStrings.Score_Label_Masterpiece]: '10 - Obra maestra',
  [ShowcaseStrings.Score_SubmitTemplate]:
    'Enviar calificaciones ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 Cifrando...',
  [ShowcaseStrings.Score_EncryptingVote]: 'Cifrando voto...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 Críticos que calificaron: {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 ¡Calcular promedios!',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 Y el ganador es...',
  [ShowcaseStrings.Score_TallyTitle]:
    '📊 Proceso de promediado de puntuaciones',
  [ShowcaseStrings.Score_TallyExplain]:
    'Las puntuaciones de cada película se sumaron y dividieron entre {COUNT} críticos:',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 promedio',
  [ShowcaseStrings.Score_ResetBtn]: 'Nueva ceremonia',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]:
    '¡Drama en la sala de juntas de StartupCo!',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    'Es la reunión anual de accionistas. La empresa vale $100M y todos quieren opinar sobre lo que viene.',
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    'No todos los votos son iguales. El fondo de capital riesgo posee el 45% de las acciones. Los fundadores poseen el 30% y el 15%. Los empleados y los inversores ángeles poseen el resto.',
  [ShowcaseStrings.Weight_StakeExpand]:
    'Enorme potencial de crecimiento, pero arriesgado',
  [ShowcaseStrings.Weight_StakeAcquire]:
    'Eliminar la competencia, pero costoso',
  [ShowcaseStrings.Weight_StakeIPO]:
    'La OPI significa liquidez, pero también escrutinio',
  [ShowcaseStrings.Weight_IntroChallenge]:
    '¡Cada voto se pondera por las acciones poseídas. El voto del fondo de capital riesgo cuenta 18 veces más que el del inversor ángel. ¡Eso es democracia corporativa!',
  [ShowcaseStrings.Weight_StartBtn]: '📄 Entrar a la sala de juntas',
  [ShowcaseStrings.Weight_DemoTitle]:
    '⚖️ Votación ponderada - Junta directiva de StartupCo',
  [ShowcaseStrings.Weight_DemoTagline]:
    '💰 Tus acciones = Tu poder de voto. ¡Bienvenido al gobierno corporativo!',
  [ShowcaseStrings.Weight_ProposalsTitle]: 'Propuestas estratégicas',
  [ShowcaseStrings.Weight_Proposal1_Desc]: 'Abrir oficinas en Tokio y Singapur',
  [ShowcaseStrings.Weight_Proposal2_Desc]: 'Fusionarse con TechStartup Inc.',
  [ShowcaseStrings.Weight_Proposal3_Desc]:
    'Cotizar en NASDAQ el próximo trimestre',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    'Accionistas ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} acciones ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ Votó por {EMOJI} {NAME}',
  [ShowcaseStrings.Weight_TallyBtn]: 'Contar votos ponderados',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 Resultados (por peso de acciones)',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} acciones ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 La propuesta ganadora recibió el {PERCENT}% del total de acciones',
  [ShowcaseStrings.Weight_ResetBtn]: 'Nueva votación',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: '¡Referéndum nacional!',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ La pregunta: «¿Debería nuestro país adoptar la semana laboral de 4 días?»',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 Referéndum Sí/No: La forma más simple de democracia. Una pregunta, dos opciones, la mayoría decide.',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ Campaña SÍ: ¡Mejor equilibrio vida-trabajo, mayor productividad, ciudadanos más felices!',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ Campaña NO: ¡Riesgo económico, interrupción empresarial, política no probada!',
  [ShowcaseStrings.YN_IntroChallenge]:
    '🗳️ Usado para el Brexit, la independencia escocesa y cambios constitucionales en todo el mundo.',
  [ShowcaseStrings.YN_StartBtn]: '🗳️ ¡Vota ahora!',
  [ShowcaseStrings.YN_DemoTitle]: '👍 Referéndum Sí/No - Semana de 4 días',
  [ShowcaseStrings.YN_DemoTagline]:
    '🗳️ Una pregunta. Dos opciones. La democracia decide.',
  [ShowcaseStrings.YN_ReferendumQuestion]:
    '¿Deberíamos adoptar la semana laboral de 4 días?',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    'Ciudadanos votando ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.YN_VotedYes]: '✓ Votó 👍 SÍ',
  [ShowcaseStrings.YN_VotedNo]: '✓ Votó 👎 NO',
  [ShowcaseStrings.YN_BtnYes]: '👍 SÍ',
  [ShowcaseStrings.YN_BtnNo]: '👎 NO',
  [ShowcaseStrings.YN_TallyBtn]: '📊 ¡Contar los votos!',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 ¡Resultados del referéndum!',
  [ShowcaseStrings.YN_LabelYes]: 'SÍ',
  [ShowcaseStrings.YN_LabelNo]: 'NO',
  [ShowcaseStrings.YN_MotionPasses]: '✅ ¡La moción se APRUEBA!',
  [ShowcaseStrings.YN_MotionFails]: '❌ ¡La moción se RECHAZA!',
  [ShowcaseStrings.YN_OutcomePass]:
    'El pueblo ha hablado: ¡Adoptamos la semana laboral de 4 días!',
  [ShowcaseStrings.YN_OutcomeFail]:
    'El pueblo ha hablado: Mantenemos la semana laboral de 5 días.',
  [ShowcaseStrings.YN_ResetBtn]: 'Nuevo referéndum',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]:
    '¡Resolución del Consejo de Seguridad de la ONU!',
  [ShowcaseStrings.YNA_IntroResolution]:
    '🌍 La resolución: «¿Debería la ONU imponer sanciones al País X por violaciones de derechos humanos?»',
  [ShowcaseStrings.YNA_IntroStory]:
    '🤷 Sí/No/Abstención: A veces no estás listo para decidir. Las abstenciones no cuentan en el total pero se registran.',
  [ShowcaseStrings.YNA_IntroYes]: '✅ SÍ: Imponer sanciones inmediatamente',
  [ShowcaseStrings.YNA_IntroNo]: '❌ NO: Rechazar la resolución',
  [ShowcaseStrings.YNA_IntroAbstain]:
    '🤷 ABSTENCIÓN: Neutral - no quiere tomar partido',
  [ShowcaseStrings.YNA_IntroChallenge]:
    '🏛️ Usado en votaciones de la ONU, procedimientos parlamentarios y reuniones de juntas en todo el mundo.',
  [ShowcaseStrings.YNA_StartBtn]: '🌎 ¡Emitir votos!',
  [ShowcaseStrings.YNA_DemoTitle]: '🤷 Sí/No/Abstención - Resolución de la ONU',
  [ShowcaseStrings.YNA_DemoTagline]:
    '🌍 Tres opciones: Apoyar, Oponerse o Mantenerse neutral',
  [ShowcaseStrings.YNA_ReferendumQuestion]: '¿Imponer sanciones al País X?',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    'Miembros del Consejo de Seguridad ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 SÍ',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 NO',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 ABSTENCIÓN',
  [ShowcaseStrings.YNA_BtnYes]: '👍 SÍ',
  [ShowcaseStrings.YNA_BtnNo]: '👎 NO',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 ABSTENCIÓN',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 ¡Recuento de la resolución!',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 ¡Resultados de la resolución!',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 Recuento de votos',
  [ShowcaseStrings.YNA_TallyExplain]:
    'Las abstenciones se registran pero no cuentan para la decisión. El ganador necesita la mayoría de los votos SÍ/NO:',
  [ShowcaseStrings.YNA_LabelYes]: 'SÍ',
  [ShowcaseStrings.YNA_LabelNo]: 'NO',
  [ShowcaseStrings.YNA_LabelAbstain]: 'ABSTENCIÓN',
  [ShowcaseStrings.YNA_AbstainNote]: 'No contado en la decisión',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ ¡La resolución se APRUEBA!',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ ¡La resolución se RECHAZA!',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    'Votos decisivos: {DECIDING} | Abstenciones: {ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: 'Nueva resolución',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: '¡Votación de enmienda constitucional!',
  [ShowcaseStrings.Super_IntroStakes]:
    '🏛️ Lo que está en juego: Enmendar la Constitución requiere más que una mayoría simple. ¡Necesitamos una SUPERMAYORÍA!',
  [ShowcaseStrings.Super_IntroThreshold]:
    '🎯 Umbral de 2/3: Al menos el 66,67% debe votar SÍ para que la enmienda pase. Esto protege contra cambios apresurados.',
  [ShowcaseStrings.Super_IntroAmendment]:
    '📜 La enmienda: «Añadir límites de mandato para todos los jueces federales»',
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ Barra alta: 6 de 9 estados deben ratificar (¡la mayoría simple no es suficiente!)',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 Usado para cambios constitucionales, ratificaciones de tratados y juicios de destitución.',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ ¡Iniciar ratificación!',
  [ShowcaseStrings.Super_DemoTitle]:
    '🎯 Supermayoría - Enmienda constitucional',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 Requiere {PERCENT}% para aprobar ({REQUIRED}/{TOTAL} estados)',
  [ShowcaseStrings.Super_TrackerTitle]: '📊 Seguimiento del umbral en vivo',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} SÍ',
  [ShowcaseStrings.Super_RequiredTemplate]: '{PERCENT}% requerido',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ Actualmente APROBADO ({YES}/{TOTAL} = {PERCENT}%)',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ Actualmente RECHAZADO ({YES}/{TOTAL} = {PERCENT}%) - Necesita {NEED} SÍ más',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    'Legislaturas estatales ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ RATIFICAR',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ RECHAZAR',
  [ShowcaseStrings.Super_BtnRatify]: '✅ RATIFICAR',
  [ShowcaseStrings.Super_BtnReject]: '❌ RECHAZAR',
  [ShowcaseStrings.Super_TallyBtn]: '📜 ¡Recuento final!',
  [ShowcaseStrings.Super_ResultsTitle]: '🏛️ ¡Resultados de la enmienda!',
  [ShowcaseStrings.Super_CalcTitle]: '📊 Cálculo de supermayoría',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    'Requerido: {REQUIRED}/{TOTAL} estados ({PERCENT}%)',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    'Real: {ACTUAL}/{VOTED} estados ({PERCENT}%)',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} RATIFICAR',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} RECHAZAR',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ Umbral de {PERCENT}%',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ ¡ENMIENDA RATIFICADA!',
  [ShowcaseStrings.Super_AmendmentFails]: '❌ ¡LA ENMIENDA FRACASA!',
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    'La enmienda pasa con {COUNT} estados ({PERCENT}%)',
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    'No alcanzó el umbral de {THRESHOLD}%. Solo {ACTUAL} de los {REQUIRED} estados requeridos ratificaron.',
  [ShowcaseStrings.Super_ResetBtn]: 'Nueva enmienda',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: '¡El Gran Duelo Político!',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ Especial de noche electoral: Cuatro partidos luchan por el control. Pero aquí está el giro: ¡nadie quiere que la división del voto le dé la victoria a su candidato menos favorito!',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 ¡El Voto por Orden de Preferencia al rescate! En lugar de elegir solo uno, ordenas TODOS los candidatos del favorito al menos preferido.',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    '🔥 Cómo funciona: Si nadie obtiene 50%+ en la ronda 1, eliminamos al último y transferimos sus votos a las 2das opciones de los votantes. ¡Se repite hasta que alguien gane!',
  [ShowcaseStrings.RC_IntroWhyCool]:
    '✨ Por qué es genial: Puedes votar con el corazón en la ronda 1 sin "desperdiciar" tu voto. Tus opciones de respaldo entran en juego si tu favorito es eliminado.',
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 ¡Usado en Australia, Maine, Alaska y NYC! Observa el escrutinio instantáneo ante tus ojos.',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ ¡Comenzar a ordenar!',
  [ShowcaseStrings.RC_DemoTitle]:
    '🔄 Voto por Orden de Preferencia - Elección Nacional',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 ¡Ordénalos TODOS! Sin spoilers, sin arrepentimientos, solo democracia.',
  [ShowcaseStrings.RC_PartiesTitle]: 'Partidos Políticos',
  [ShowcaseStrings.RC_Cand1_Platform]: 'Salud universal, acción climática',
  [ShowcaseStrings.RC_Cand2_Platform]:
    'Impuestos más bajos, valores tradicionales',
  [ShowcaseStrings.RC_Cand3_Platform]: 'Libertad individual, gobierno pequeño',
  [ShowcaseStrings.RC_Cand4_Platform]: 'Protección ambiental, sostenibilidad',
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    'Ordena tus preferencias ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.RC_VotedBadge]: '✓ Votó',
  [ShowcaseStrings.RC_AddToRanking]: 'Agregar al orden:',
  [ShowcaseStrings.RC_SubmitBallot]: 'Enviar papeleta',
  [ShowcaseStrings.RC_RunInstantRunoff]: 'Ejecutar escrutinio instantáneo',
  [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 Mostrar tablón de anuncios',
  [ShowcaseStrings.RC_HideBulletinBoard]: '📜 Ocultar tablón de anuncios',
  [ShowcaseStrings.RC_BulletinBoardTitle]:
    '📜 Tablón de anuncios público (Requisito 1.2)',
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    'Publicación transparente de votos solo-agregar con verificación de árbol de Merkle',
  [ShowcaseStrings.RC_EntryTemplate]: 'Entrada #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: 'Voto cifrado:',
  [ShowcaseStrings.RC_VoterHash]: 'Hash del votante:',
  [ShowcaseStrings.RC_Verified]: '✅ Verificado',
  [ShowcaseStrings.RC_Invalid]: '❌ Inválido',
  [ShowcaseStrings.RC_MerkleTree]: 'Árbol de Merkle:',
  [ShowcaseStrings.RC_MerkleValid]: '✅ Válido',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ Comprometido',
  [ShowcaseStrings.RC_TotalEntries]: 'Total de entradas:',
  [ShowcaseStrings.RC_ResultsTitle]: '🏆 Resultados del escrutinio instantáneo',
  [ShowcaseStrings.RC_EliminationRounds]: 'Rondas de eliminación',
  [ShowcaseStrings.RC_RoundTemplate]: 'Ronda {ROUND}',
  [ShowcaseStrings.RC_Eliminated]: 'Eliminado',
  [ShowcaseStrings.RC_Winner]: '¡Ganador!',
  [ShowcaseStrings.RC_FinalWinner]: 'Ganador final',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]:
    'Ganó después de {COUNT} ronda(s)',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: '¡Elección Presidencial - Dos Rondas!',
  [ShowcaseStrings.TR_IntroSystem]:
    '🗳️ El Sistema: Cuatro candidatos compiten. ¡Si nadie obtiene 50%+ en la Ronda 1, los 2 primeros se enfrentan en la Ronda 2!',
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 ¿Por qué dos rondas? Asegura que el ganador tenga apoyo mayoritario. Usado en Francia, Brasil y muchas elecciones presidenciales.',
  [ShowcaseStrings.TR_IntroRound1]:
    '📊 Ronda 1: Vota por tu favorito entre los 4 candidatos',
  [ShowcaseStrings.TR_IntroRound2]:
    '🔄 Ronda 2: Si es necesario, elige entre los 2 primeros',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ Esto requiere descifrado intermedio entre rondas - ¡los votos no son privados entre rondas!',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ ¡Comenzar Ronda 1!',
  [ShowcaseStrings.TR_DemoTitle]:
    '2️⃣ Votación a Dos Rondas - Elección Presidencial',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 Ronda 1: Elige tu favorito',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 Ronda 2: ¡Balotaje final!',
  [ShowcaseStrings.TR_Round1Candidates]: 'Candidatos Ronda 1',
  [ShowcaseStrings.TR_Cand1_Party]: 'Partido Progresista',
  [ShowcaseStrings.TR_Cand2_Party]: 'Partido Conservador',
  [ShowcaseStrings.TR_Cand3_Party]: 'Tech Adelante',
  [ShowcaseStrings.TR_Cand4_Party]: 'Coalición por la Justicia',
  [ShowcaseStrings.TR_VotersTemplate]: 'Votantes ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ Votó por {EMOJI}',
  [ShowcaseStrings.TR_CountRound1]: '📊 ¡Contar votos de la Ronda 1!',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ Resultados de la Ronda 1',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 Recuento de la primera ronda',
  [ShowcaseStrings.TR_Round1TallyExplain]:
    'Verificando si alguien obtuvo 50%+ de mayoría...',
  [ShowcaseStrings.TR_AdvanceRound2]: '→ Ronda 2',
  [ShowcaseStrings.TR_EliminatedBadge]: 'Eliminado',
  [ShowcaseStrings.TR_NoMajority]: '🔄 ¡Sin mayoría! ¡Se requiere balotaje!',
  [ShowcaseStrings.TR_TopTwoAdvance]:
    'Los 2 primeros candidatos avanzan a la Ronda 2:',
  [ShowcaseStrings.TR_StartRound2]: '▶️ ¡Iniciar balotaje de la Ronda 2!',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 Balotaje de la Ronda 2',
  [ShowcaseStrings.TR_Round1ResultTemplate]: 'Ronda 1: {VOTES} votos',
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    'Voto final ({VOTED}/{TOTAL} han votado)',
  [ShowcaseStrings.TR_FinalCount]: '🏆 ¡Recuento final!',
  [ShowcaseStrings.TR_ElectionWinner]: '🎉 ¡Ganador de la elección!',
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 Recuento final de la Ronda 2',
  [ShowcaseStrings.TR_Round2TallyExplain]:
    'Duelo directo entre los 2 primeros candidatos:',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 ¡{NAME} gana!',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    'Obtuvo {VOTES} votos ({PERCENT}%) en el balotaje',
  [ShowcaseStrings.TR_NewElection]: 'Nueva elección',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]:
    '¡Votación STAR - Lo mejor de ambos mundos!',
  [ShowcaseStrings.STAR_IntroAcronym]:
    '🌟 STAR = Puntuación luego Balotaje Automático',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ Paso 1: Puntúa a todos los candidatos de 0 a 5 estrellas (¡como puntuar películas!)',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 Paso 2: Los 2 primeros por puntuación total van al balotaje automático. ¡Tus puntuaciones determinan tu preferencia!',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 La Magia: Puedes dar puntuaciones altas a múltiples candidatos, pero el balotaje asegura apoyo mayoritario',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 Ejemplo: Puntúas Alex=5, Jordan=4, Sam=2, Casey=1. Si Alex y Jordan son los 2 primeros, ¡tu voto va para Alex!',
  [ShowcaseStrings.STAR_IntroChallenge]:
    '⚠️ ¡Combina la expresividad del voto por puntuación con el requisito de mayoría del balotaje!',
  [ShowcaseStrings.STAR_StartBtn]: '⭐ ¡Comenzar a puntuar!',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 Votación STAR - Concejo Municipal',
  [ShowcaseStrings.STAR_DemoTagline]: '⭐ ¡Puntúa, luego balotaje automático!',
  [ShowcaseStrings.STAR_CandidatesTitle]: 'Candidatos',
  [ShowcaseStrings.STAR_Cand1_Platform]: 'Artes y Cultura',
  [ShowcaseStrings.STAR_Cand2_Platform]: 'Medio Ambiente',
  [ShowcaseStrings.STAR_Cand3_Platform]: 'Economía',
  [ShowcaseStrings.STAR_Cand4_Platform]: 'Salud',
  [ShowcaseStrings.STAR_RatingsTemplate]:
    '⭐ Puntuaciones de {VOTER} (0-5 estrellas)',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    'Enviar puntuaciones ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 ¡Ejecutar algoritmo STAR!',
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ Fase 1: Totales de puntuación',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 Sumando todas las puntuaciones',
  [ShowcaseStrings.STAR_Phase1TallyExplain]:
    'Buscando los 2 mejores candidatos por puntuación total...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL} puntos ({AVG} prom.)',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ Balotaje',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 Fase de balotaje automático',
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    'Los 2 primeros avanzan. Verificando preferencias directas...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ ¡Ejecutar balotaje automático!',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 ¡Ganador STAR!',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 Fase 2: Balotaje automático',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    'Comparando {NAME1} vs {NAME2} usando preferencias de los votantes:',
  [ShowcaseStrings.STAR_VotersPreferred]: 'votantes prefirieron',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 ¡{NAME} gana!',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    'Ganó el balotaje automático {WINNER} a {LOSER}',
  [ShowcaseStrings.STAR_NewElection]: 'Nueva elección',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: '¡VUT - Representación Proporcional!',
  [ShowcaseStrings.STV_IntroGoal]:
    '🏛️ El Objetivo: ¡Elegir 3 representantes que reflejen la diversidad de preferencias de los votantes!',
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 VUT (Voto Único Transferible): Ordena candidatos. Los votos se transfieren cuando tu primera opción gana o es eliminada.',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 Cuota: Se necesitan {QUOTA} votos para ganar un escaño (cuota Droop: {VOTERS}/(3+1) + 1)',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 Transferencias: Los votos excedentes de ganadores y votos de candidatos eliminados se transfieren a las siguientes preferencias',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 ¡Usado en Irlanda, el Senado de Australia y muchos concejos municipales para representación justa!',
  [ShowcaseStrings.STV_StartBtn]: '📊 ¡Comenzar a ordenar!',
  [ShowcaseStrings.STV_DemoTitle]:
    '📊 VUT - Concejo Municipal ({SEATS} escaños)',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 Cuota: {QUOTA} votos necesarios por escaño',
  [ShowcaseStrings.STV_PartiesRunning]: 'Partidos en competencia',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 Orden de {VOTER}',
  [ShowcaseStrings.STV_RankingInstruction]:
    'Haz clic para agregar candidatos en orden de preferencia:',
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    'Enviar orden ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 ¡Ejecutar recuento VUT!',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ ¡Concejo elegido!',
  [ShowcaseStrings.STV_CountingTitle]: '📊 Proceso de recuento VUT',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    'Cuota: {QUOTA} votos | Escaños: {SEATS}\nEl recuento de primeras preferencias determina los ganadores iniciales',
  [ShowcaseStrings.STV_QuotaMet]: '(¡Cuota alcanzada!)',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ ELEGIDO',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 Representantes elegidos',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 ¡Estos {COUNT} partidos alcanzaron la cuota de {QUOTA} votos y ganaron escaños en el concejo!',
  [ShowcaseStrings.STV_NewElection]: 'Nueva elección',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]:
    '¡Votación Cuadrática - Asignación Presupuestaria!',
  [ShowcaseStrings.Quad_IntroChallenge]:
    '💰 El Desafío: Presupuesto de $1.4M, 4 proyectos. ¿Cómo medimos la intensidad de las preferencias?',
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² Votación Cuadrática: Cada voto cuesta votos² créditos. 1 voto = 1 crédito, 2 votos = 4 créditos, 3 votos = 9 créditos!',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ MÉTODO INSEGURO: Requiere operaciones no homomórficas (raíz cuadrada). ¡Los votos individuales son visibles!',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    '🎯 ¿Por qué usarlo? Evita que los votantes adinerados dominen. Muestra la intensidad de preferencia, no solo sí/no.',
  [ShowcaseStrings.Quad_IntroUsedIn]:
    '💡 ¡Usado en la Cámara de Colorado, la plataforma taiwanesa vTaiwan y experimentos de gobernanza corporativa!',
  [ShowcaseStrings.Quad_StartBtn]: '💰 ¡Comenzar Asignación!',
  [ShowcaseStrings.Quad_DemoTitle]:
    '² Votación Cuadrática - Presupuesto Municipal',
  [ShowcaseStrings.Quad_DemoTagline]:
    '💰 100 créditos de voz. ¡Los votos cuestan votos²!',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ INSEGURO: Este método no puede usar cifrado homomórfico. ¡Los votos son visibles!',
  [ShowcaseStrings.Quad_BudgetProjects]: 'Proyectos Presupuestarios',
  [ShowcaseStrings.Quad_Proj1_Name]: 'Nuevo Parque',
  [ShowcaseStrings.Quad_Proj1_Desc]: '$500k',
  [ShowcaseStrings.Quad_Proj2_Name]: 'Renovación de Biblioteca',
  [ShowcaseStrings.Quad_Proj2_Desc]: '$300k',
  [ShowcaseStrings.Quad_Proj3_Name]: 'Centro Comunitario',
  [ShowcaseStrings.Quad_Proj3_Desc]: '$400k',
  [ShowcaseStrings.Quad_Proj4_Name]: 'Reparación de Calles',
  [ShowcaseStrings.Quad_Proj4_Desc]: '$200k',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 Presupuesto de {VOTER} ({REMAINING} créditos restantes)',
  [ShowcaseStrings.Quad_VotesTemplate]:
    '{VOTES} votos (cuesta {COST} créditos)',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    'El siguiente voto cuesta {NEXT_COST} créditos (de {CURRENT} a {NEXT_TOTAL})',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    'Costo Total: {USED}/100 créditos',
  [ShowcaseStrings.Quad_SubmitTemplate]:
    'Enviar Asignación ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 ¡Calcular Totales!',
  [ShowcaseStrings.Quad_ResultsTitle]:
    '💰 ¡Resultados de Asignación Presupuestaria!',
  [ShowcaseStrings.Quad_TallyTitle]: '📊 Totales de Votación Cuadrática',
  [ShowcaseStrings.Quad_TallyExplain]:
    'El total de votos (no créditos) de cada proyecto determina la prioridad de financiamiento:',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: '{TOTAL} votos en total',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 Máxima Prioridad',
  [ShowcaseStrings.Quad_ExplanationTitle]:
    '💡 Cómo Funcionó la Votación Cuadrática',
  [ShowcaseStrings.Quad_ExplanationP1]:
    'El costo cuadrático evitó que alguien dominara un solo proyecto. Emitir 10 votos cuesta 100 créditos (¡todo tu presupuesto!), pero distribuir 5 votos en 2 proyectos solo cuesta 50 créditos en total.',
  [ShowcaseStrings.Quad_ExplanationResult]:
    'Resultado: Los proyectos con apoyo amplio e intenso ganan sobre los proyectos con apoyo estrecho y extremo.',
  [ShowcaseStrings.Quad_ResetBtn]: 'Nueva Votación Presupuestaria',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: '¡Toma de Decisiones por Consenso!',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ El Escenario: Una pequeña cooperativa necesita tomar una decisión importante. ¡La voz de todos importa!',
  [ShowcaseStrings.Cons_IntroConsensus]:
    '🤝 Votación por Consenso: Requiere 95%+ de acuerdo. Una o dos objeciones pueden bloquear la propuesta.',
  [ShowcaseStrings.Cons_IntroInsecure]:
    '⚠️ MÉTODO INSEGURO: Sin privacidad - ¡todos ven quién apoya/se opone!',
  [ShowcaseStrings.Cons_IntroWhyUse]:
    '🎯 ¿Por qué usarlo? Grupos pequeños donde la confianza y la unidad son más importantes que la privacidad.',
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 ¡Usado en cooperativas, comunidades intencionales y organizaciones basadas en consenso!',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 ¡Comenzar Votación!',
  [ShowcaseStrings.Cons_DemoTitle]:
    '🤝 Votación por Consenso - Decisión de Cooperativa',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    '🎯 Requiere {PERCENT}% de acuerdo ({REQUIRED}/{TOTAL} miembros)',
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ INSEGURO: Sin privacidad - ¡todos los votos son visibles para construir consenso!',
  [ShowcaseStrings.Cons_Proposal]:
    '¿Propuesta: Deberíamos invertir $50k en paneles solares?',
  [ShowcaseStrings.Cons_ProposalDesc]:
    'Esta es una decisión financiera importante que requiere apoyo casi unánime.',
  [ShowcaseStrings.Cons_TrackerTitle]: '📊 Rastreador de Consenso en Vivo',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT} Apoyo',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ CONSENSO ALCANZADO ({SUPPORT}/{TOTAL})',
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    '❌ Se necesitan {NEEDED} más para alcanzar el consenso',
  [ShowcaseStrings.Cons_MembersTemplate]:
    'Miembros de la Cooperativa ({VOTED}/{TOTAL} votaron)',
  [ShowcaseStrings.Cons_Support]: '✅ Apoyo',
  [ShowcaseStrings.Cons_Oppose]: '❌ Oposición',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ Apoyar',
  [ShowcaseStrings.Cons_BtnOppose]: '❌ Oponerse',
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 ¡Verificar Consenso!',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 ¡Resultado del Consenso!',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 Conteo Final',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    'Requerido: {REQUIRED}/{TOTAL} ({PERCENT}%)',
  [ShowcaseStrings.Cons_ActualTemplate]:
    'Real: {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT} Apoyo',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT} Oposición',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ Umbral del {PERCENT}%',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ ¡CONSENSO ALCANZADO!',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ ¡CONSENSO FALLIDO!',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    'La propuesta pasa con {COUNT} miembros apoyando ({PERCENT}%)',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    'No se alcanzó el umbral del {THRESHOLD}%. {OPPOSE} miembro(s) se opusieron, bloqueando el consenso.',
  [ShowcaseStrings.Cons_FailNote]:
    '💡 En la toma de decisiones por consenso, incluso una o dos objeciones importan. El grupo debe abordar las preocupaciones o modificar la propuesta.',
  [ShowcaseStrings.Cons_ResetBtn]: 'Nueva Propuesta',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]:
    '¡Toma de Decisiones Basada en Consentimiento!',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 Sociocracia: Una cooperativa de trabajadores necesita tomar decisiones con las que todos puedan vivir.',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    '🙋 Basado en Consentimiento: No se trata de acuerdo - se trata de "sin objeciones fuertes". ¿Puedes vivir con esto?',
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ MÉTODO INSEGURO: Sin privacidad - ¡las objeciones deben ser escuchadas y abordadas!',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 La Pregunta: "¿Tienes una objeción de principio que dañaría a la organización?"',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    '🌍 ¡Usado en organizaciones sociocráticas, holacracia y lugares de trabajo colaborativos!',
  [ShowcaseStrings.Consent_StartBtn]: '🙋 ¡Iniciar Proceso!',
  [ShowcaseStrings.Consent_DemoTitle]:
    '🙋 Basado en Consentimiento - Cooperativa de Trabajadores',
  [ShowcaseStrings.Consent_DemoTagline]:
    '🤝 Sin objeciones fuertes = consentimiento logrado',
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ INSEGURO: Sin privacidad - ¡las objeciones se comparten abiertamente para discusión!',
  [ShowcaseStrings.Consent_ProposalTitle]:
    'Propuesta: Implementar semana laboral de 4 días a partir del próximo mes',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    '¿Tienes una objeción de principio que dañaría a nuestra organización?',
  [ShowcaseStrings.Consent_ProposalNote]:
    '"Prefiero 5 días" no es una objeción de principio. "Esto nos llevaría a la bancarrota" sí lo es.',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ Consentimiento',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 Objeciones',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ {COUNT} objeción(es) de principio planteada(s) - la propuesta debe ser modificada o retirada',
  [ShowcaseStrings.Consent_MembersTemplate]:
    'Miembros del Círculo ({RESPONDED}/{TOTAL} respondieron)',
  [ShowcaseStrings.Consent_NoObjection]: '✅ Sin Objeción',
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 Objeción de Principio',
  [ShowcaseStrings.Consent_BtnNoObjection]: '✅ Sin Objeción',
  [ShowcaseStrings.Consent_BtnObject]: '🚫 Objetar',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}, ¿cuál es tu objeción de principio?',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 ¡Verificar Consentimiento!',
  [ShowcaseStrings.Consent_ResultsTitle]:
    '🙋 ¡Resultado del Proceso de Consentimiento!',
  [ShowcaseStrings.Consent_ConsentCheckTitle]:
    '📊 Verificación de Consentimiento',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    'Consentimiento logrado si cero objeciones de principio\nObjeciones planteadas: {COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ Sin Objeciones ({COUNT})',
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    'Estos miembros pueden vivir con la propuesta',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
    '🚫 Objeciones de Principio ({COUNT})',
  [ShowcaseStrings.Consent_ObjectionRaised]: 'Objeción planteada',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ ¡CONSENTIMIENTO LOGRADO!',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 ¡CONSENTIMIENTO BLOQUEADO!',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    'Los {COUNT} miembros dieron su consentimiento (sin objeciones de principio). La propuesta avanza.',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    '{COUNT} objeción(es) de principio planteada(s). El círculo debe abordar las preocupaciones antes de continuar.',
  [ShowcaseStrings.Consent_NextStepsTitle]: '💡 Próximos Pasos en Sociocracia:',
  [ShowcaseStrings.Consent_NextStep1]: 'Escuchar las objeciones completamente',
  [ShowcaseStrings.Consent_NextStep2]:
    'Modificar la propuesta para abordar las preocupaciones',
  [ShowcaseStrings.Consent_NextStep3]:
    'Re-probar el consentimiento con la propuesta actualizada',
  [ShowcaseStrings.Consent_NextStep4]:
    'Si las objeciones persisten, la propuesta se retira',
  [ShowcaseStrings.Consent_ResetBtn]: 'Nueva Propuesta',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'Blog de BrightChain',
  [ShowcaseStrings.Blog_Subtitle]: 'Reflexiones, tutoriales y actualizaciones',
  [ShowcaseStrings.Blog_Loading]: 'Cargando publicaciones...',
  [ShowcaseStrings.Blog_NewPost]: '+ Nueva Publicación',
  [ShowcaseStrings.Blog_NoPosts]:
    '¡Aún no hay publicaciones en el blog. Vuelve pronto!',
  [ShowcaseStrings.Blog_NewBadge]: '✨ Nuevo',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: 'Por {AUTHOR}',
  [ShowcaseStrings.Blog_BackToHome]: '← Volver al Inicio',

  // BlogPost.tsx (TODO: translate)
  [ShowcaseStrings.BlogPost_Loading]: 'Cargando publicación...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Publicación no encontrada',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    'La publicación que buscas no existe.',
  [ShowcaseStrings.BlogPost_BackToBlog]: '← Volver al Blog',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ ¡Esta publicación acaba de ser publicada! Aparecerá en la lista del blog después de la próxima actualización del sitio.',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'Por {AUTHOR}',

  // Components.tsx feature cards (TODO: translate)
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    'Base de datos de documentos competitiva con MongoDB que almacena datos en el sistema de archivos sin propietario. Cada documento almacenado de forma transparente como bloques blanqueados con arquitectura TUPLE para negación plausible.',
  [ShowcaseStrings.Feat_BrightDB_Cat]: 'Almacenamiento',
  [ShowcaseStrings.Feat_BrightDB_Tech1]: 'Almacén de documentos',
  [ShowcaseStrings.Feat_BrightDB_Tech2]: 'Transacciones ACID',
  [ShowcaseStrings.Feat_BrightDB_Tech3]: 'Pipeline de agregación',
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    'API tipo MongoDB: colecciones, CRUD, consultas, índices, transacciones',
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    '15 operadores de consulta: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch',
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    'Pipeline de agregación: $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup',
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    'Índices de campo único, compuestos y únicos con estructuras B-tree',
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    'Transacciones ACID multi-documento con commit/abort y concurrencia optimista',
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    'Flujos de cambios para suscripciones de eventos de inserción/actualización/eliminación en tiempo real',
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    'Middleware REST Express para acceso API plug-and-play a colecciones',
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    'Índices TTL para expiración automática de documentos',
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    'Validación de esquema con niveles estricto/moderado y valores predeterminados',
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    'Búsqueda de texto completo con campos ponderados y operador $text',
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    'Almacenamiento copy-on-write: los bloques nunca se eliminan, solo se actualizan los mapeos',
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    'Cada documento almacenado como TUPLE de 3 bloques (datos + 2 aleatorizadores) para negación plausible',
  [ShowcaseStrings.Feat_BrightDBPools_Title]: 'Pools de BrightDB',
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    'Pools de almacenamiento ligeros aislados por espacio de nombres que particionan lógicamente bloques sin almacenamiento físico separado. Cada pool aplica sus propios límites de ACL, cifrado y blanqueamiento — permitiendo aislamiento de datos multi-inquilino y multi-aplicación en un solo nodo BrightChain.',
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'Almacenamiento',
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: 'Aislamiento de espacio de nombres',
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'ACL de pool',
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'Descubrimiento Gossip',
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    'Claves de almacenamiento con prefijo de espacio de nombres (poolId:hash) — aislamiento lógico sin separación física',
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    'ACL por pool con permisos de Lectura, Escritura, Replicación y Admin aplicados en la capa de almacenamiento',
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    'Blanqueamiento XOR limitado al pool: los tuplas nunca cruzan límites de pool, preservando la negación plausible por pool',
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    'Descubrimiento de pool basado en gossip entre pares con tiempos de espera de consulta configurables y almacenamiento en caché',
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    'Inicialización de pool: generación de bloques aleatorios criptográficos como material de blanqueamiento para nuevos pools',
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    'Validación de eliminación segura — verifica dependencias XOR entre pools antes de eliminar un pool',
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    'Filtros Bloom y manifiestos limitados al pool para reconciliación eficiente entre pares',
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    'Gobernanza de quórum multi-admin: las actualizaciones de ACL requieren >50% de firmas de admin',
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    'Banderas de lectura/escritura públicas para pools abiertos, o acceso bloqueado solo para miembros',
  [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
  [ShowcaseStrings.Feat_OFFS_Desc]:
    'Almacenamiento distribuido revolucionario que divide archivos en bloques y los combina con datos aleatorios mediante XOR. Ningún bloque individual contiene contenido identificable, proporcionando inmunidad legal a los operadores de nodos mientras permite almacenamiento de archivos seguro y descentralizado.',
  [ShowcaseStrings.Feat_OFFS_Cat]: 'Almacenamiento',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'Cifrado XOR',
  [ShowcaseStrings.Feat_OFFS_Tech2]: 'Almacenamiento distribuido',
  [ShowcaseStrings.Feat_OFFS_Tech3]: 'SHA-512',
  [ShowcaseStrings.Feat_OFFS_HL1]:
    'Los archivos se dividen en bloques fuente y se combinan con datos aleatorios mediante XOR',
  [ShowcaseStrings.Feat_OFFS_HL2]:
    'Los bloques originales se descartan — solo se almacenan bloques aleatorizados',
  [ShowcaseStrings.Feat_OFFS_HL3]:
    'Las Listas de Bloques Constituyentes (CBL) rastrean las relaciones entre bloques',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'Los bloques se identifican por hash SHA-512 — deduplicación automática',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    'Los bloques multiuso pueden ser parte de múltiples archivos simultáneamente',
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'Protección legal para operadores de nodos — no se almacena contenido identificable',
  [ShowcaseStrings.Feat_Messaging_Title]: 'Sistema de mensajería',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    'Paso de mensajes seguro y descentralizado con cifrado, enrutamiento, seguimiento de entrega y protocolo gossip para propagación estilo epidémico. Construido sobre el almacén de bloques con entrega en tiempo real por WebSocket.',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'Red',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'Protocolo Gossip',
  [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
  [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Filtros Bloom',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    'Paso de mensajes cifrados con cifrado por destinatario o clave compartida',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    'Propagación gossip estilo epidémico con entrega basada en prioridad',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    'Reintento automático con retroceso exponencial para entregas fallidas',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    'Protocolo de descubrimiento basado en filtros Bloom para localización eficiente de bloques',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'Eventos WebSocket en tiempo real para entrega de mensajes y confirmaciones',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    'Seguimiento de entrega persistente con estado por destinatario',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    'Correo electrónico conforme con RFC 5322/2045 con hilos, privacidad BCC, archivos adjuntos, operaciones de bandeja de entrada y seguimiento de entrega. Composición, envío y recuperación completa de correo electrónico construida sobre infraestructura de mensajería.',
  [ShowcaseStrings.Feat_BrightMail_Cat]: 'Red',
  [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
  [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
  [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
  [ShowcaseStrings.Feat_BrightMail_Tech4]: 'Hilos',
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    'Formato de mensaje de Internet conforme con RFC con soporte MIME',
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    'Hilos mediante encabezados In-Reply-To y References',
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    'Privacidad BCC con copias criptográficamente separadas por destinatario',
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    'Múltiples archivos adjuntos con soporte Content-ID para imágenes en línea',
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    'Operaciones de bandeja de entrada: consulta, filtro, ordenación, búsqueda con paginación',
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    'Seguimiento de entrega por destinatario mediante confirmaciones gossip',
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    'Múltiples esquemas de cifrado: ECIES, clave compartida, S/MIME',
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    'Firmas digitales para autenticación del remitente',
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    'Reenvío/respuesta con encabezados Resent-* conformes con RFC',
  [ShowcaseStrings.Feat_BrightCal_Desc]: 'Calendario cifrado con control de acceso granular, eventos recurrentes, recordatorios e integración con sistemas de calendario tradicionales a través de CalDAV.',
  [ShowcaseStrings.Feat_BrightCal_Cat]: 'Red',
  [ShowcaseStrings.Feat_BrightCal_Tech1]: 'iCal/RFC 5545',
  [ShowcaseStrings.Feat_BrightCal_Tech2]: 'CalDAV',
  [ShowcaseStrings.Feat_BrightCal_Tech3]: 'Cifrado ECIES',
  [ShowcaseStrings.Feat_BrightCal_Tech4]: 'iTIP/iMIP',
  [ShowcaseStrings.Feat_BrightCal_HL1]: 'Eventos almacenados como bloques cifrados en BrightChain',
  [ShowcaseStrings.Feat_BrightCal_HL2]: 'Control de acceso granular mediante delegación BrightTrust',
  [ShowcaseStrings.Feat_BrightCal_HL3]: 'Soporte completo para eventos recurrentes con reglas RRULE',
  [ShowcaseStrings.Feat_BrightCal_HL4]: 'Recordatorios y notificaciones con entrega cifrada',
  [ShowcaseStrings.Feat_BrightCal_HL5]: 'Integración CalDAV para clientes de calendario tradicionales',
  [ShowcaseStrings.Feat_BrightCal_HL6]: 'Programación de invitaciones con protocolo iTIP/iMIP',
  [ShowcaseStrings.Feat_BrightCal_HL7]: 'Historial de versiones inmutable para todos los cambios de eventos',
  [ShowcaseStrings.Feat_BrightCal_HL8]: 'Calendarios compartidos con permisos por usuario',
  [ShowcaseStrings.Feat_BrightCal_HL9]: 'Detección de conflictos y resolución automática',
  [ShowcaseStrings.Feat_BrightCal_HL10]: 'Exportación e importación en formato iCalendar estándar',
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Plataforma de comunicación competitiva con Discord con cifrado de extremo a extremo de grado Signal. Mensajería directa, chats grupales y canales con presencia en tiempo real, indicadores de escritura y permisos basados en roles.',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'Red',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'Cifrado E2E',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Rotación de claves',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    'Mensajería directa para conversaciones cifradas persona a persona',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    'Chats grupales con cifrado compartido y rotación automática de claves',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'Canales con cuatro modos de visibilidad: público/privado/secreto/invisible',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'Sistema de presencia en tiempo real: en línea/desconectado/inactivo/no molestar',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'Permisos basados en roles: Propietario/Admin/Moderador/Miembro',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'Indicadores de escritura, reacciones y edición de mensajes vía WebSocket',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'Tokens de invitación con límite de tiempo y uso para canales',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'Búsqueda de texto completo en el historial de mensajes del canal',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'Promoción fluida de conversaciones de mensajes directos a grupos',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    'Llavero de contraseñas competitivo con 1Password con arquitectura VCBL para almacenamiento eficiente de credenciales cifradas. TOTP/2FA, detección de brechas, acceso de emergencia e importación desde los principales gestores de contraseñas.',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'Identidad',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
  [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
  [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Secreto compartido de Shamir',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    'VCBL (Lista de Bloques Constituyentes de Bóveda) para almacenamiento cifrado eficiente',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    'Múltiples tipos de entrada: inicio de sesión, nota segura, tarjeta de crédito, identidad',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    'Generación de contraseñas criptográficamente seguras con restricciones',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    'Soporte TOTP/2FA con generación de código QR para autenticadores',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'Detección de brechas por k-anonimato vía API de Have I Been Pwned',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'Registro de auditoría cifrado de solo adición para todas las operaciones de bóveda',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    'Acceso de emergencia mediante secreto compartido de Shamir para recuperación',
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'Compartición de bóveda multi-miembro con cifrado ECIES por destinatario',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    'Importación desde 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'API de autocompletado para extensión de navegador lista',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'Elecciones que preservan la privacidad usando cifrado homomórfico Paillier con claves derivadas de ECDH. Soporta más de 15 métodos de votación desde pluralidad simple hasta elección por ranking compleja con características de cumplimiento gubernamental.',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'Gobernanza',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Cifrado Paillier',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
  [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Criptografía homomórfica',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'Puente ECDH-a-Paillier deriva claves homomórficas de claves ECDSA/ECDH',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    'Agregación de votos que preserva la privacidad mediante adición homomórfica',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    'Más de 15 métodos de votación: Pluralidad, Aprobación, Ponderado, Borda, Puntuación, Elección por Ranking, IRV, STAR, VUT, Cuadrática, Consenso, etc.',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'Clasificaciones de seguridad: totalmente homomórfico, multi-ronda, inseguro',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    'Cumplimiento gubernamental: registros de auditoría inmutables, tablón público, recibos verificables',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    'Agregación jerárquica: Distrito → Condado → Estado → Nacional',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    'Nivel de seguridad de 128 bits con prueba de primalidad Miller-Rabin (256 rondas)',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'Determinismo multiplataforma (entornos Node.js y navegador)',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    'Resistencia a ataques de temporización con operaciones de tiempo constante',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    'Red social descentralizada competitiva con Twitter con sintaxis única de marcado de iconos FontAwesome. Publicaciones, hilos, mensajes directos, listas de conexiones, hubs para privacidad y notificaciones en tiempo real vía WebSocket.',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'Red',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Mensajería en tiempo real',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Gestión de conexiones',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    'Publicaciones con límite de 280 caracteres, markdown y sintaxis única {{icon}} para FontAwesome',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    'Conversaciones en hilos con anidamiento de 10 niveles y jerarquías de respuesta',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    'Listas de conexiones, categorías y hubs para organizar relaciones',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    'Mensajería directa con confirmaciones de lectura, indicadores de escritura y reacciones',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    'Conversaciones grupales (hasta 50 participantes) con roles de administrador',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    'Solicitudes de mensaje para no seguidores con flujo de aceptar/rechazar',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'Notificaciones en tiempo real vía WebSocket con agrupación inteligente',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    'Preferencias de notificación: horas silenciosas, modo no molestar, configuración por categoría',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'Cuentas protegidas con flujo de aprobación de solicitudes de seguimiento',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'Información de conexiones: cálculo de fortaleza, conexiones mutuas, sugerencias',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'Visibilidad de contenido basada en hubs para compartición privada en grupo',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'Formato de texto enriquecido con prevención de XSS y soporte de emojis',
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Anonimato intermediado y BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    'Mecanismo de privacidad sofisticado que permite operaciones anónimas manteniendo la responsabilidad. La información de identidad se cifra y divide usando el secreto compartido de Shamir, reconstruible solo mediante consenso mayoritario de BrightTrust.',
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Gobernanza',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: 'Secreto compartido de Shamir',
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Corrección de errores hacia adelante',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'Consenso BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Publica anónimamente con respaldo de identidad cifrado',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Fragmentos de identidad distribuidos entre ~24 miembros de BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'Se requiere voto mayoritario para reconstruir la información de identidad',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    'Responsabilidad con límite de tiempo — los datos expiran después del plazo de prescripción',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'Mecanismo de cumplimiento legal para órdenes FISA y órdenes judiciales',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    'Protección de privacidad permanente después del período de expiración',
  [ShowcaseStrings.Feat_Encryption_Title]: 'Stack de cifrado avanzado',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    'Cifrado de última generación que combina ECIES para derivación de claves con AES-256-GCM para seguridad de archivos. Criptosistema completo con autenticación BIP39/32 y criptografía de curva elíptica SECP256k1.',
  [ShowcaseStrings.Feat_Encryption_Cat]: 'Criptografía',
  [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
  [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
  [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'Cifrado ECIES con derivación de claves específica por usuario',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    'AES-256-GCM para cifrado autenticado de archivos',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'Autenticación basada en mnemónicos BIP39/32',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'Curva elíptica SECP256k1 (espacio de claves compatible con Ethereum)',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'Integridad de datos verificada a nivel de bloque con funcionalidad XOR',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'Operaciones criptográficas multiplataforma',
  [ShowcaseStrings.Feat_Storage_Title]: 'Red de almacenamiento descentralizado',
  [ShowcaseStrings.Feat_Storage_Desc]:
    'Sistema de archivos distribuido peer-to-peer que monetiza el almacenamiento no utilizado en dispositivos personales. Arquitectura tipo IPFS con prueba de trabajo eficiente energéticamente e incentivos basados en reputación.',
  [ShowcaseStrings.Feat_Storage_Cat]: 'Red',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'Redes P2P',
  [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
  [ShowcaseStrings.Feat_Storage_Tech3]: 'Replicación de bloques',
  [ShowcaseStrings.Feat_Storage_HL1]:
    'Utiliza el espacio de almacenamiento desperdiciado en computadoras y dispositivos personales',
  [ShowcaseStrings.Feat_Storage_HL2]:
    'Tabla de hash distribuida (DHT) para seguimiento eficiente de bloques',
  [ShowcaseStrings.Feat_Storage_HL3]:
    'Requisitos configurables de durabilidad y accesibilidad de bloques',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'Replicación dinámica basada en utilidad de bloques y patrones de acceso',
  [ShowcaseStrings.Feat_Storage_HL5]:
    'Alternativa eficiente energéticamente a la minería tradicional de prueba de trabajo',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'Créditos de almacenamiento y compensación de ancho de banda para operadores de nodos',
  [ShowcaseStrings.Feat_Sealing_Title]: 'Sellado de documentos basado en BrightTrust',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Protección avanzada de documentos con requisitos de umbral personalizables para restauración de acceso. Los grupos pueden sellar información sensible requiriendo consenso mayoritario configurable para dessellar.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Gobernanza',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Criptografía de umbral',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Secreto compartido',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Computación multipartita',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Sella documentos con umbrales de quórum configurables (ej., 3-de-5, 7-de-10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Almacenamiento distribuido de fragmentos entre miembros de BrightTrust de confianza',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    'Garantía matemática de seguridad hasta alcanzar el umbral',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    'Dessellado flexible para cumplimiento legal o decisiones grupales',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    'Soporta flujos de gobernanza organizacional y cumplimiento',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    'Expiración basada en tiempo para protección automática de privacidad',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'Gestión de identidad sofisticada que garantiza la privacidad y el control del usuario. Soporte para alias registrados, publicación anónima y verificación criptográfica de identidad.',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'Identidad',
  [ShowcaseStrings.Feat_BrightID_Tech1]: 'Infraestructura de clave pública',
  [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'Gestión de identidad',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'Generación de identidad basada en mnemónicos BIP39/32',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'Múltiples alias registrados por cuenta de usuario',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'Publicación anónima con recuperación de identidad opcional',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    'Autenticación basada en clave pública (SECP256k1)',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'Corrección de errores hacia adelante para respaldo de identidad',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'Verificación de identidad que preserva la privacidad',
  [ShowcaseStrings.Feat_Reputation_Title]: 'Reputación y seguimiento de energía',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'Sistema de reputación revolucionario que rastrea costos energéticos en Julios. Los buenos actores disfrutan de requisitos mínimos de prueba de trabajo mientras que los malos actores enfrentan cargas computacionales mayores.',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'Red',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Prueba de trabajo',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'Sistemas de reputación',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'Contabilidad energética',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    'Costos energéticos medidos en Julios reales para correlación con el mundo real',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'Prueba de trabajo dinámica basada en la reputación del usuario',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'Los creadores de contenido son recompensados cuando su contenido es consumido',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    'Los malos actores son limitados con requisitos computacionales mayores',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'Costos de almacenamiento y ancho de banda rastreados y compensados',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'Incentiva contribuciones positivas y contenido de calidad',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'Temperatura de bloques y ciclo de vida',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    'Gestión inteligente de bloques con niveles de almacenamiento caliente/frío. Los bloques accedidos frecuentemente permanecen "calientes" con alta replicación, mientras que los bloques no utilizados se enfrían y pueden expirar.',
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Almacenamiento',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Niveles de almacenamiento',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Ciclo de vida de bloques',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Patrones de acceso',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    'Contratos "Mantener hasta al menos" para duración mínima de almacenamiento',
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'La utilidad del bloque aumenta con el acceso, la obsolescencia disminuye',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'Replicación dinámica basada en patrones de acceso y temperatura',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    'Auto-extensión de contratos para bloques accedidos frecuentemente',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    'Créditos de energía devueltos por bloques que demuestran ser útiles',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    'Requisitos configurables de durabilidad y accesibilidad',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'Cero desperdicio de minería',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    'Construido sobre la base de Ethereum pero diseñado sin restricciones de prueba de trabajo. Todo el trabajo computacional sirve propósitos útiles — almacenamiento, verificación y operaciones de red.',
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Red',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Espacio de claves Ethereum',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Consenso eficiente',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Blockchain verde',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    'Sin minería desperdiciadora — toda la computación sirve propósitos útiles',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Espacio de claves y criptografía compatible con Ethereum (SECP256k1)',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Prueba de trabajo usada solo para limitación de transacciones',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'Mecanismos de consenso eficientes energéticamente',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    'Blockchain sostenible sin impacto ambiental',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    'Enfoque en almacenamiento y computación, no en escasez artificial',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Determinismo multiplataforma',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Operaciones criptográficas idénticas en entornos Node.js y navegador. La generación determinista de claves garantiza resultados consistentes independientemente de la plataforma.',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Criptografía',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Crypto del navegador',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Algoritmos deterministas',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'Operaciones criptográficas unificadas entre plataformas',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    'Generación determinista de bits aleatorios (HMAC-DRBG)',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'Derivación consistente de claves Paillier desde claves ECDH',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'Compatibilidad con navegador y Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    'Resultados criptográficos reproducibles',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'Pruebas y verificación multiplataforma',
  [ShowcaseStrings.Feat_Contracts_Title]: 'Contratos digitales y gobernanza',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    'Capacidades de contratos inteligentes para aplicaciones descentralizadas. Gobernanza basada en BrightTrust con umbrales de votación configurables para decisiones de red y aplicación de políticas.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Gobernanza',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Contratos inteligentes',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Gobernanza',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Sistemas de votación',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Ejecución de contratos digitales en red descentralizada',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'Toma de decisiones basada en BrightTrust para gobernanza de red',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    'Requisitos de mayoría configurables para diferentes acciones',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'Votación homomórfica para gobernanza que preserva la privacidad',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'Mecanismos de votación ponderados por reputación',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    'Procesos de gobernanza transparentes y auditables',
  [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js (fork)',
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    'Implementación mejorada del secreto compartido de Shamir para división y reconstrucción segura de datos. TypeScript puro con soporte nativo de navegador, auditado criptográficamente y optimizado para dividir cualquier secreto (contraseñas, claves, archivos) en fragmentos recuperables por umbral.',
  [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Criptografía',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: 'Secreto compartido de Shamir',
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Seguridad de datos',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    'Divide secretos en n fragmentos con recuperación de umbral t-de-n configurable',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    'Seguridad teórica de la información — los fragmentos por debajo del umbral no revelan información',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Auditoría de seguridad de Cure53 (julio 2019) sin problemas encontrados',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'Soporte nativo de navegador sin polyfills (crypto.getRandomValues)',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'Operaciones deterministas multiplataforma (Node.js y navegador)',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    'Soporte completo de TypeScript con definiciones de tipos exhaustivas',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    'Convierte contraseñas, archivos y claves a/desde hex con relleno automático',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    'Genera nuevos fragmentos dinámicamente a partir de fragmentos existentes',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    'Campo de Galois configurable (3-20 bits) soportando hasta 1.048.575 fragmentos',
  [ShowcaseStrings.Feat_Burnbag_Desc]:
    'Almacenamiento seguro de conocimiento cero con protocolos de seguridad automatizados. El borrado criptográfico destruye la Receta (mapa + claves), haciendo que los bloques cifrados dispersos sean permanentemente irrecuperables al activarse.',
  [ShowcaseStrings.Feat_Burnbag_Cat]: 'Criptografía',
  [ShowcaseStrings.Feat_Burnbag_Tech1]: 'Borrado criptográfico',
  [ShowcaseStrings.Feat_Burnbag_Tech2]: 'Interruptor de hombre muerto',
  [ShowcaseStrings.Feat_Burnbag_Tech3]: 'Protocolo Canario',
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    'Arquitectura de conocimiento cero: el proveedor de servicios no puede acceder a los datos del usuario en circunstancias normales',
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    'Borrado criptográfico: la destrucción de la Receta hace que los bloques dispersos sean permanentemente irrecuperables',
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    'Interruptor de hombre muerto: la monitorización del latido activa la destrucción automática de la Receta por inactividad',
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    'Protocolo Canario: motor de reglas con monitorización de API de terceros (Twitter, Fitbit, Google, GitHub)',
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    'Detección de coacción: códigos de coacción especiales activan protocolos de destrucción en lugar del acceso normal',
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    'Acciones de protocolo configurables: eliminación de archivos, distribución de datos, divulgación pública o respuestas personalizadas',
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    'Arquitectura de doble clave: claves BIP39 controladas por el usuario más claves de custodia del sistema opcionales para la ejecución del protocolo',
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    'Quórum de sucesión: contactos de confianza preautorizados para la liberación o recuperación segura de datos',
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    'Mutación en lectura: cualquier acceso no autorizado a la Receta activa una mutación permanente e inmutable del libro mayor',
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    'Niveles de confianza configurables: confianza cero, confianza condicional o híbrido por sensibilidad de archivo',
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    'Soporte multilingüe: inglés, francés, español, ucraniano y chino mandarín',
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    'Cifrado ECIES con claves secp256k1 y AES-256-GCM para la seguridad de archivos',

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    'Un expediente médico electrónico propiedad del paciente, construido sobre la criptografía de BrightChain. Tus datos de salud son tuyos — cifrados, descentralizados y accesibles solo con tus claves.',
  [ShowcaseStrings.Feat_BrightChart_Cat]: 'Identidad',
  [ShowcaseStrings.Feat_BrightChart_Tech1]: 'EMR sin propietario',
  [ShowcaseStrings.Feat_BrightChart_Tech2]: 'Cifrado de extremo a extremo',
  [ShowcaseStrings.Feat_BrightChart_Tech3]: 'Acceso controlado por el paciente',
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    'El paciente posee y controla todos los expedientes médicos mediante claves criptográficas',
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    'Datos de salud cifrados de extremo a extremo almacenados en BrightChain — sin servidor central que vulnerar',
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    'Consentimiento granular: comparte registros específicos con proveedores usando delegación BrightTrust',
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    'Registro de auditoría inmutable para cada acceso, edición y evento de compartición',
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    'Portátil entre proveedores — sin dependencia de proveedor, sin datos como rehén',
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    'Acceso de emergencia mediante secreto compartido de Shamir con quórum configurable',
  [ShowcaseStrings.Feat_BrightChart_HL7]:
    'Historial médico versionado con verificación de integridad criptográfica',
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    'Entradas firmadas por el proveedor garantizan la autenticidad de diagnósticos y prescripciones',
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    'Funciona sin conexión: registros cifrados en caché local, sincronizados al reconectar',
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    'Burnbag Digital integrado para registros sensibles que requieren destrucción garantizada',
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    'Capa de datos interoperable diseñada para intercambio de registros de salud compatible con FHIR',
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    'Pruebas de conocimiento cero permiten verificación de seguros sin exponer el historial médico completo',

  // Remaining (TODO: translate)
  [ShowcaseStrings.Soup_Time]: 'Hora',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'Error al recuperar archivo: {ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Por favor sube un archivo .cbl',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    '¡CBL cargado! Archivo: {NAME} ({BLOCKS} bloques). Ahora puedes recuperar el archivo si todos los bloques están en la sopa.',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'Error al analizar CBL: {ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    '¡Archivo reconstruido exitosamente! Tamaño: {SIZE} bytes. El archivo ha sido descargado.',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'Error al procesar URL magnet: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: '¡Mensaje enviado y almacenado en la sopa!',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'Error al enviar mensaje: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'Mensaje recuperado de la sopa: {TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'Error al recuperar mensaje: {ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: '¡URL Magnet copiada al portapapeles!',
  [ShowcaseStrings.Anim_PauseBtn]: 'Pausar animación',
  [ShowcaseStrings.Anim_PlayBtn]: 'Reproducir animación',
  [ShowcaseStrings.Anim_ResetBtn]: 'Reiniciar animación',
  [ShowcaseStrings.Anim_SpeedLabel]: 'Velocidad: {SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 Monitor de rendimiento',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'Tasa de cuadros:',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'Tiempo de cuadro:',
  [ShowcaseStrings.Anim_PerfDropped]: 'Cuadros perdidos:',
  [ShowcaseStrings.Anim_PerfMemory]: 'Memoria:',
  [ShowcaseStrings.Anim_PerfSequences]: 'Secuencias:',
  [ShowcaseStrings.Anim_PerfErrors]: 'Errores:',
  [ShowcaseStrings.Anim_WhatHappening]: 'Lo que está pasando:',
  [ShowcaseStrings.Anim_DurationLabel]: 'Duración:',
  [ShowcaseStrings.Anim_SizeInfo]: 'Tamaño: {SIZE} bytes | Bloques: {BLOCKS}',

  // Educational/Encoding (TODO: translate)
  [ShowcaseStrings.Edu_CloseTooltip]: 'Cerrar información',
  [ShowcaseStrings.Edu_WhatsHappening]: '🔍 Qué está pasando',
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 Por qué importa',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Detalles técnicos',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Conceptos relacionados',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ Señales visuales',
  [ShowcaseStrings.Edu_GetHelp]: 'Obtener ayuda con este paso',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ Entendido - Continuar',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ Saltar este paso',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 Glosario de conceptos de BrightChain',
  [ShowcaseStrings.Edu_CloseGlossary]: 'Cerrar glosario',
  [ShowcaseStrings.Edu_BackToGlossary]: '← Volver al glosario',
  [ShowcaseStrings.Edu_Definition]: 'Definición',
  [ShowcaseStrings.Edu_TechnicalDefinition]: 'Definición técnica',
  [ShowcaseStrings.Edu_Examples]: 'Ejemplos',
  [ShowcaseStrings.Edu_RelatedTerms]: 'Términos relacionados',
  [ShowcaseStrings.Edu_SearchPlaceholder]: 'Buscar conceptos...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'Resumen del proceso',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: 'Lo que logramos',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Resultados técnicos',
  [ShowcaseStrings.Edu_WhatsNext]: '¿Qué sigue?',
  [ShowcaseStrings.Edu_LearningProgress]: 'Progreso de aprendizaje',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED} de {TOTAL} pasos completados',
  [ShowcaseStrings.Enc_Title]: '🎬 Animación de codificación de archivos',
  [ShowcaseStrings.Enc_Subtitle]:
    'Observa cómo tu archivo se transforma en bloques de BrightChain',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 Fragmentos de archivo ({COUNT})',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    'Cada fragmento se convertirá en un bloque en la sopa',
  [ShowcaseStrings.Enc_EduWhatsHappening]: '🎓 Qué está pasando ahora',
  [ShowcaseStrings.Enc_TechDetails]: 'Detalles técnicos:',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'Tamaño de bloque: {SIZE} bytes',
  [ShowcaseStrings.Enc_ExpectedChunks]: 'Fragmentos esperados: {COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    'Cada fragmento se convierte en un bloque en la sopa',
  [ShowcaseStrings.Enc_WhyPadding]: '¿Por qué relleno?',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'Todos los bloques deben tener el mismo tamaño',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'El relleno aleatorio previene el análisis de datos',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'El relleno se elimina durante la reconstrucción',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'Propósito del checksum:',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Garantiza la integridad de los datos',
  [ShowcaseStrings.Enc_UniqueIdentifier]: 'Se usa como identificador único de bloque',
  [ShowcaseStrings.Enc_EnablesVerification]:
    'Permite la verificación durante la recuperación',

  // ProcessCompletionSummary (TODO)
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Puntos clave de aprendizaje',
  [ShowcaseStrings.Edu_CloseSummary]: 'Cerrar resumen',
  [ShowcaseStrings.Edu_Overview]: 'Resumen',
  [ShowcaseStrings.Edu_Achievements]: 'Logros',
  [ShowcaseStrings.Edu_Technical]: 'Técnico',
  [ShowcaseStrings.Edu_NextSteps]: 'Próximos pasos',
  [ShowcaseStrings.Edu_Previous]: '← Anterior',
  [ShowcaseStrings.Edu_Next]: 'Siguiente →',
  [ShowcaseStrings.Edu_Finish]: 'Finalizar',

  // EducationalModeControls (TODO)
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 Modo educativo',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'Velocidad de animación:',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Muy lento)',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Lento)',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Moderado)',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x (Normal)',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Rápido)',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Muy rápido)',
  [ShowcaseStrings.Edu_StepByStep]: 'Modo paso a paso',
  [ShowcaseStrings.Edu_ShowTooltips]: 'Mostrar información',
  [ShowcaseStrings.Edu_ShowExplanations]: 'Mostrar explicaciones',
  [ShowcaseStrings.Edu_AutoAdvance]: 'Avanzar pasos automáticamente',

  // Privacy Policy Page
  [ShowcaseStrings.PP_Title]: 'Política de Privacidad',
  [ShowcaseStrings.PP_LastUpdated]: 'Última actualización: 20 de abril de 2026',
  [ShowcaseStrings.PP_BackToHome]: '← Volver al inicio',

  // Section 1: Introduction
  [ShowcaseStrings.PP_S1_Title]: '1. Introducción',
  [ShowcaseStrings.PP_S1_P1]:
    'BrightChain es una plataforma descentralizada de código abierto operada por Digital Defiance, una organización sin fines de lucro 501(c)(3) ("nosotros" o "nuestro"). Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y divulgamos información cuando usted utiliza la plataforma BrightChain, el sitio web, las aplicaciones y los servicios relacionados (colectivamente, los "Servicios").',
  [ShowcaseStrings.PP_S1_P2]:
    'Al acceder o utilizar los Servicios, usted reconoce que ha leído, comprendido y acepta estar sujeto a esta Política de Privacidad. Si no está de acuerdo, no debe utilizar los Servicios.',

  // Section 2: How BrightChain Works
  [ShowcaseStrings.PP_S2_Title]:
    '2. Cómo funciona BrightChain — Contexto arquitectónico',
  [ShowcaseStrings.PP_S2_P1]:
    'BrightChain se basa en el modelo de Sistema de Archivos Libre de Propietario (OFF). Todos los datos almacenados en la red se dividen en bloques de tamaño fijo, se aplica XOR con bloques criptográficamente aleatorios (un proceso llamado "blanqueamiento TUPLE") y se distribuyen entre los nodos participantes. Como resultado:',
  [ShowcaseStrings.PP_S2_Li1]:
    'Los bloques individuales son indistinguibles de datos aleatorios y no pueden leerse sin el conjunto completo de bloques constituyentes y la Lista de Bloques Constituyentes (CBL) correspondiente.',
  [ShowcaseStrings.PP_S2_Li2]:
    'Los datos pueden cifrarse opcionalmente con el Esquema de Cifrado Integrado de Curva Elíptica (ECIES) usando AES-256-GCM, proporcionando confidencialidad por destinatario además de la negación plausible proporcionada por el blanqueamiento TUPLE.',
  [ShowcaseStrings.PP_S2_Li3]:
    'Los operadores de nodos — incluido Digital Defiance — generalmente no pueden determinar el contenido, la propiedad o la naturaleza de ningún bloque individual almacenado en la red.',
  [ShowcaseStrings.PP_S2_P2]:
    'Esta arquitectura significa que las protecciones de privacidad descritas en esta política son, en muchos casos, aplicadas por las matemáticas en lugar de solo por la política.',

  // Section 3: Information We Collect
  [ShowcaseStrings.PP_S3_Title]: '3. Información que recopilamos',
  [ShowcaseStrings.PP_S3_1_Title]: '3.1 Información de la cuenta',
  [ShowcaseStrings.PP_S3_1_P1]:
    'Cuando crea una cuenta de BrightChain, recopilamos un nombre de usuario, dirección de correo electrónico y su clave criptográfica pública (derivada de su mnemónico BIP39). No recopilamos, almacenamos ni tenemos acceso a su frase mnemónica ni a sus claves privadas.',
  [ShowcaseStrings.PP_S3_2_Title]: '3.2 Contenido generado por el usuario',
  [ShowcaseStrings.PP_S3_2_P1]:
    'Los archivos, mensajes, credenciales y otro contenido que almacena en la red se dividen en bloques blanqueados por TUPLE. No tenemos la capacidad de leer, reconstruir o inspeccionar este contenido. Si utiliza el cifrado ECIES opcional, el contenido se cifra adicionalmente para destinatarios específicos y es inaccesible para cualquiera — incluidos nosotros — sin la clave privada correspondiente.',
  [ShowcaseStrings.PP_S3_3_Title]: '3.3 Información recopilada automáticamente',
  [ShowcaseStrings.PP_S3_3_P1]:
    'Cuando interactúa con nuestros Servicios basados en web, podemos recopilar automáticamente datos estándar de registro del servidor, incluidas direcciones IP, tipo de navegador, URLs de referencia, páginas visitadas y marcas de tiempo. Esta información se utiliza únicamente con fines operativos (monitoreo de seguridad, prevención de abusos y fiabilidad del servicio) y se conserva por no más de 90 días.',
  [ShowcaseStrings.PP_S3_4_Title]: '3.4 Entradas del libro mayor blockchain',
  [ShowcaseStrings.PP_S3_4_P1]:
    'Ciertas operaciones (creación de bóvedas, lecturas de bóvedas, destrucción de bóvedas, votos de gobernanza) se registran en un libro mayor blockchain de solo adición. Estas entradas contienen tipo de operación, marca de tiempo y hashes criptográficos — no el contenido de los datos subyacentes. Las entradas del libro mayor son inmutables por diseño y no pueden eliminarse.',

  // Section 4: How We Use Information
  [ShowcaseStrings.PP_S4_Title]: '4. Cómo usamos la información',
  [ShowcaseStrings.PP_S4_P1]: 'Usamos la información que recopilamos para:',
  [ShowcaseStrings.PP_S4_Li1]:
    'Proporcionar, mantener y mejorar los Servicios',
  [ShowcaseStrings.PP_S4_Li2]:
    'Autenticar usuarios y gestionar cuentas',
  [ShowcaseStrings.PP_S4_Li3]:
    'Detectar y prevenir fraude, abuso e incidentes de seguridad',
  [ShowcaseStrings.PP_S4_Li4]:
    'Cumplir con las obligaciones legales aplicables',
  [ShowcaseStrings.PP_S4_Li5]:
    'Comunicarnos con usted sobre los Servicios (por ejemplo, anuncios de servicio, alertas de seguridad)',
  [ShowcaseStrings.PP_S4_P2]:
    'No vendemos, alquilamos ni intercambiamos su información personal con terceros. No utilizamos sus datos para publicidad ni elaboración de perfiles.',

  // Section 5: Data Storage and Security
  [ShowcaseStrings.PP_S5_Title]: '5. Almacenamiento y seguridad de datos',
  [ShowcaseStrings.PP_S5_P1]:
    'El contenido generado por el usuario se almacena como bloques blanqueados por TUPLE distribuidos en la red descentralizada. Los metadatos de la cuenta (nombre de usuario, correo electrónico, clave pública) se almacenan en nuestras bases de datos operativas con medidas de seguridad estándar de la industria, incluido el cifrado en reposo y en tránsito.',
  [ShowcaseStrings.PP_S5_P2]:
    'Una vez que los datos se almacenan como bloques blanqueados y se distribuyen en la red, los datos de otros participantes pueden depender de esos mismos bloques a través del proceso de blanqueo XOR. Esto significa que eliminar bloques individuales puede ser técnicamente imposible sin afectar los datos de otros usuarios. Sin embargo, reconstruir un archivo requiere la Lista de Bloques Constituyentes (CBL): la receta ordenada de identificadores de bloques. Sin la CBL, los bloques distribuidos son computacionalmente indistinguibles de datos aleatorios y no pueden reensamblarse. Eliminar o destruir la CBL es suficiente para hacer que los datos subyacentes sean permanentemente inaccesibles.',
  [ShowcaseStrings.PP_S5_P3]:
    'Las CBL pueden almacenarse en varias ubicaciones según la aplicación. Digital Burnbag almacena las CBL dentro de su sistema de bóvedas respaldado por BrightDB. Los usuarios también pueden conservar las CBL como referencias MagnetURL. En todos los casos, destruir la CBL — independientemente de dónde esté almacenada — es el mecanismo efectivo para la eliminación de datos, incluso cuando los bloques subyacentes persisten en la red.',

  // Section 6: Cryptographic Protections
  [ShowcaseStrings.PP_S6_Title]:
    '6. Protecciones criptográficas y limitaciones',
  [ShowcaseStrings.PP_S6_P1]:
    'BrightChain emplea fuertes protecciones criptográficas que incluyen hash SHA3-512, ECIES con secp256k1, cifrado simétrico AES-256-GCM, sellos HMAC-SHA3-512 y cifrado homomórfico de Paillier para votación que preserva la privacidad. Estas protecciones son aplicadas por el protocolo y no dependen de nuestra cooperación o buena voluntad.',
  [ShowcaseStrings.PP_S6_P2]:
    'Cuando se usa correctamente, BrightChain puede proporcionar protecciones de privacidad muy fuertes. Sin embargo, no garantizamos que ningún algoritmo criptográfico específico permanezca seguro indefinidamente. Los avances en computación (incluida la computación cuántica) pueden afectar la seguridad de las primitivas criptográficas actuales. Los usuarios son responsables de comprender las protecciones disponibles para ellos y configurar su uso de los Servicios en consecuencia.',

  // Section 7: Law Enforcement
  [ShowcaseStrings.PP_S7_Title]:
    '7. Fuerzas del orden y solicitudes legales',
  [ShowcaseStrings.PP_S7_P1]:
    'Digital Defiance opera como operador de red y proveedor de infraestructura. Cumplimos con procesos legales válidos, incluidas citaciones, órdenes judiciales y órdenes de registro emitidas por tribunales de jurisdicción competente, en la medida en que sea técnicamente factible.',
  [ShowcaseStrings.PP_S7_P2]:
    'Sin embargo, debido al diseño arquitectónico de BrightChain:',
  [ShowcaseStrings.PP_S7_Li1]:
    'Generalmente no podemos producir el contenido de los datos generados por el usuario almacenados como bloques blanqueados por TUPLE, porque no poseemos las CBL ni las claves de descifrado necesarias para reconstruir o descifrar esos datos.',
  [ShowcaseStrings.PP_S7_Li2]:
    'Podemos producir metadatos de la cuenta (nombre de usuario, correo electrónico, clave pública) y datos de registro del servidor en la medida en que los conservemos.',
  [ShowcaseStrings.PP_S7_Li3]:
    'Las entradas del libro mayor blockchain son inmutables y pueden producirse en respuesta a procesos legales válidos.',
  [ShowcaseStrings.PP_S7_Li4]:
    'Si una bóveda Digital Burnbag ha sido destruida criptográficamente, la prueba de destrucción es el único artefacto restante — demuestra que los datos han desaparecido, no lo que contenían.',
  [ShowcaseStrings.PP_S7_P3]:
    'Notificaremos a los usuarios afectados sobre solicitudes legales en la medida permitida por la ley. Nos reservamos el derecho de impugnar solicitudes legales que consideremos excesivas, legalmente deficientes o de otro modo improcedentes.',

  // Section 8: Brokered Anonymity
  [ShowcaseStrings.PP_S8_Title]: '8. Anonimato intermediado',
  [ShowcaseStrings.PP_S8_P1]:
    'BrightChain admite un protocolo de "Anonimato Intermediado" en el que la identidad real de un usuario puede sellarse utilizando el Secreto Compartido de Shamir y distribuirse entre los miembros de gobernanza de BrightTrust. La recuperación de identidad requiere un voto de umbral de los miembros de BrightTrust y está sujeta a un plazo de prescripción configurable, después del cual los fragmentos de identidad se eliminan permanentemente y la identidad real se vuelve irrecuperable. Este mecanismo está diseñado para equilibrar la privacidad con la responsabilidad bajo gobernanza colectiva.',

  // Section 9: Third-Party Services
  [ShowcaseStrings.PP_S9_Title]: '9. Servicios de terceros',
  [ShowcaseStrings.PP_S9_P1]:
    'Ciertas funciones (como el monitoreo de actividad del protocolo canario) pueden integrarse con servicios de terceros (por ejemplo, GitHub, Fitbit, Slack). Su uso de esas integraciones se rige por las respectivas políticas de privacidad de terceros. Accedemos solo a la información mínima necesaria para proporcionar la funcionalidad solicitada (por ejemplo, marcas de tiempo de actividad reciente para el monitoreo del interruptor de hombre muerto) y no almacenamos credenciales de terceros en nuestros servidores — la autenticación se maneja mediante tokens OAuth que puede revocar en cualquier momento.',

  // Section 10: Children's Privacy
  [ShowcaseStrings.PP_S10_Title]: '10. Privacidad de los niños',
  [ShowcaseStrings.PP_S10_P1]:
    'Los Servicios no están dirigidos a niños menores de 13 años (o la edad aplicable de consentimiento digital en su jurisdicción). No recopilamos intencionalmente información personal de niños. Si descubrimos que hemos recopilado información personal de un niño, tomaremos medidas para eliminar esa información de inmediato.',

  // Section 11: International Users
  [ShowcaseStrings.PP_S11_Title]: '11. Usuarios internacionales',
  [ShowcaseStrings.PP_S11_P1]:
    'Digital Defiance tiene su sede en los Estados Unidos. Si accede a los Servicios desde fuera de los Estados Unidos, su información puede transferirse, almacenarse y procesarse en los Estados Unidos u otras jurisdicciones donde opera nuestra infraestructura. Al utilizar los Servicios, usted consiente dicha transferencia y procesamiento.',
  [ShowcaseStrings.PP_S11_1_Title]:
    '11.1 Espacio Económico Europeo (EEE) y Reino Unido',
  [ShowcaseStrings.PP_S11_1_P1]:
    'Si se encuentra en el EEE o el Reino Unido, puede tener derechos en virtud del Reglamento General de Protección de Datos (RGPD) o el RGPD del Reino Unido, incluido el derecho de acceso, rectificación, supresión, restricción del procesamiento y portabilidad de sus datos personales, y el derecho a oponerse al procesamiento. Para ejercer estos derechos, contáctenos en la dirección que se indica a continuación. Tenga en cuenta que ciertos datos (entradas del libro mayor blockchain, bloques TUPLE distribuidos) pueden ser técnicamente imposibles de borrar debido a la naturaleza descentralizada e inmutable del sistema. La capacidad de destrucción demostrable de BrightChain (a través de Digital Burnbag) está diseñada para respaldar el cumplimiento del derecho de supresión del Artículo 17 del RGPD para datos controlados por el usuario.',

  // Section 12: Data Retention
  [ShowcaseStrings.PP_S12_Title]: '12. Retención de datos',
  [ShowcaseStrings.PP_S12_P1]:
    'Los metadatos de la cuenta se conservan mientras su cuenta esté activa o según sea necesario para proporcionar los Servicios. Los registros del servidor se conservan hasta 90 días. Las entradas del libro mayor blockchain se conservan indefinidamente como parte del libro mayor inmutable. Los bloques blanqueados por TUPLE se conservan en la red según los términos del contrato de almacenamiento y la economía del balance energético; los bloques cuyos contratos de almacenamiento expiran y no se renuevan pueden ser recolectados por los nodos.',

  // Section 13: Disclaimer
  [ShowcaseStrings.PP_S13_Title]:
    '13. Descargo de garantías y limitación de responsabilidad',
  [ShowcaseStrings.PP_S13_P1]:
    'LOS SERVICIOS SE PROPORCIONAN "TAL CUAL" Y "SEGÚN DISPONIBILIDAD" SIN GARANTÍAS DE NINGÚN TIPO, YA SEAN EXPRESAS, IMPLÍCITAS O LEGALES, INCLUIDAS, ENTRE OTRAS, LAS GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN PARTICULAR, TÍTULO Y NO INFRACCIÓN.',
  [ShowcaseStrings.PP_S13_P2]:
    'DIGITAL DEFIANCE, SUS FUNCIONARIOS, DIRECTORES, EMPLEADOS, VOLUNTARIOS Y COLABORADORES (INCLUIDA JESSICA MULEIN) NO SERÁN RESPONSABLES DE NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL, CONSECUENTE O PUNITIVO, NI DE NINGUNA PÉRDIDA DE BENEFICIOS, DATOS, USO, FONDO DE COMERCIO U OTRAS PÉRDIDAS INTANGIBLES, RESULTANTES DE (A) SU ACCESO O USO O INCAPACIDAD DE ACCEDER O USAR LOS SERVICIOS; (B) CUALQUIER CONDUCTA O CONTENIDO DE TERCEROS EN LOS SERVICIOS; (C) CUALQUIER CONTENIDO OBTENIDO DE LOS SERVICIOS; (D) ACCESO NO AUTORIZADO, USO O ALTERACIÓN DE SUS TRANSMISIONES O CONTENIDO; O (E) EL FALLO DE CUALQUIER MECANISMO CRIPTOGRÁFICO, YA SEA BASADO EN GARANTÍA, CONTRATO, AGRAVIO (INCLUIDA NEGLIGENCIA) O CUALQUIER OTRA TEORÍA LEGAL, HAYAMOS SIDO INFORMADOS O NO DE LA POSIBILIDAD DE DICHO DAÑO.',
  [ShowcaseStrings.PP_S13_P3]:
    'EN NINGÚN CASO LA RESPONSABILIDAD AGREGADA DE DIGITAL DEFIANCE Y SUS FUNCIONARIOS, DIRECTORES, EMPLEADOS, VOLUNTARIOS Y COLABORADORES POR TODAS LAS RECLAMACIONES RELACIONADAS CON LOS SERVICIOS EXCEDERÁ EL MAYOR DE CIEN DÓLARES ESTADOUNIDENSES (US $100,00) O LA CANTIDAD QUE NOS HAYA PAGADO EN LOS DOCE (12) MESES ANTERIORES A LA RECLAMACIÓN.',
  [ShowcaseStrings.PP_S13_P4]:
    'ALGUNAS JURISDICCIONES NO PERMITEN LA EXCLUSIÓN O LIMITACIÓN DE CIERTAS GARANTÍAS O RESPONSABILIDADES. EN DICHAS JURISDICCIONES, NUESTRA RESPONSABILIDAD SE LIMITARÁ EN LA MAYOR MEDIDA PERMITIDA POR LA LEY.',

  // Section 14: Indemnification
  [ShowcaseStrings.PP_S14_Title]: '14. Indemnización',
  [ShowcaseStrings.PP_S14_P1]:
    'Usted acepta indemnizar, defender y eximir de responsabilidad a Digital Defiance, sus funcionarios, directores, empleados, voluntarios y colaboradores (incluida Jessica Mulein) de y contra todas y cada una de las reclamaciones, responsabilidades, daños, pérdidas, costos y gastos (incluidos los honorarios razonables de abogados) que surjan de o estén de alguna manera relacionados con su acceso o uso de los Servicios, su violación de esta Política de Privacidad o su violación de cualquier ley aplicable o los derechos de cualquier tercero.',

  // Section 15: Governing Law
  [ShowcaseStrings.PP_S15_Title]:
    '15. Ley aplicable y resolución de disputas',
  [ShowcaseStrings.PP_S15_P1]:
    'Esta Política de Privacidad se regirá e interpretará de acuerdo con las leyes del Estado de Washington, Estados Unidos, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja de o esté relacionada con esta Política de Privacidad o los Servicios se resolverá exclusivamente en los tribunales estatales o federales ubicados en el Condado de King, Washington, y usted consiente la jurisdicción personal de dichos tribunales.',

  // Section 16: Open Source
  [ShowcaseStrings.PP_S16_Title]: '16. Código abierto',
  [ShowcaseStrings.PP_S16_P1_Before]:
    'BrightChain es software de código abierto. El código fuente está disponible públicamente en ',
  [ShowcaseStrings.PP_S16_P1_LinkText]:
    'github.com/Digital-Defiance/BrightChain',
  [ShowcaseStrings.PP_S16_P1_After]:
    '. Le animamos a revisar el código para verificar las propiedades de privacidad descritas en esta política. Las protecciones criptográficas descritas en este documento están implementadas en el código fuente y son verificables mediante inspección.',

  // Section 17: Changes
  [ShowcaseStrings.PP_S17_Title]: '17. Cambios a esta política',
  [ShowcaseStrings.PP_S17_P1]:
    'Podemos actualizar esta Política de Privacidad de vez en cuando. Le notificaremos los cambios materiales publicando la política actualizada en los Servicios con una fecha de "Última actualización" revisada. Su uso continuado de los Servicios después de la fecha de entrada en vigor de cualquier cambio constituye su aceptación de la política revisada.',

  // Section 18: Contact
  [ShowcaseStrings.PP_S18_Title]: '18. Contáctenos',
  [ShowcaseStrings.PP_S18_P1]:
    'Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos de protección de datos, por favor contacte:',
  [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
  [ShowcaseStrings.PP_S18_EmailLabel]: 'Correo electrónico:',
  [ShowcaseStrings.PP_S18_WebLabel]: 'Web:',
};

export default ShowcaseSpanishStrings;
