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
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'dApp Alto Secreto',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'Logo de BrightChat',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'Logo de BrightID',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'Logo de BrightHub',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'Logo de BrightMail',
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
    'Volta mascot — a neon-blue geometric fox made of electricity',

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
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
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

export default ShowcaseSpanishStrings;
