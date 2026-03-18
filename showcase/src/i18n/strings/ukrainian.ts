import { ComponentStrings } from '@digitaldefiance/i18n-lib';
import { ShowcaseStringKey, ShowcaseStrings } from '../showcaseStrings';

// Ukrainian translations
export const ShowcaseUkrainianStrings: Partial<
  ComponentStrings<ShowcaseStringKey>
> = {
  // Navigation
  [ShowcaseStrings.Nav_Home]: 'Головна',
  [ShowcaseStrings.Nav_SoupDemo]: 'Демо Soup',
  [ShowcaseStrings.Nav_Ledger]: 'Реєстр',
  [ShowcaseStrings.Nav_Blog]: 'Блог',
  [ShowcaseStrings.Nav_FAQ]: 'Питання',
  [ShowcaseStrings.Nav_Docs]: 'Документація',
  [ShowcaseStrings.Nav_Home_Description]: 'Головна сторінка',
  [ShowcaseStrings.Nav_SoupDemo_Description]:
    'Інтерактивна візуалізація блоків',
  [ShowcaseStrings.Nav_Ledger_Description]: 'Блокчейн реєстр з управлінням',
  [ShowcaseStrings.Nav_Blog_Description]: 'Блог та оновлення BrightChain',
  [ShowcaseStrings.Nav_FAQ_Description]: 'Часті запитання',
  [ShowcaseStrings.Nav_Docs_Description]: 'Документація проекту',
  [ShowcaseStrings.Nav_ToggleMenu]: 'Перемкнути меню',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'Цілком таємний dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'Логотип BrightChat',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'Логотип BrightID',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'Логотип BrightHub',
  [ShowcaseStrings.FAQ_BrightMail_Logo_Alt]: 'Логотип BrightMail',
  [ShowcaseStrings.FAQ_BrightPass_Logo_Alt]: 'Логотип BrightPass',
  [ShowcaseStrings.FAQ_CanaryProtocol_Logo_Alt]:
    'Логотип Канарейкового Протоколу',
  [ShowcaseStrings.FAQ_DigitalBurnbag_Logo_Alt]: 'Логотип Цифрового Burnbag',

  // Language Selector
  [ShowcaseStrings.Lang_Select]: 'Мова',
  [ShowcaseStrings.Lang_EN_US]: 'Англійська (США)',
  [ShowcaseStrings.Lang_EN_GB]: 'Англійська (Велика Британія)',
  [ShowcaseStrings.Lang_ES]: 'Іспанська',
  [ShowcaseStrings.Lang_FR]: 'Французька',
  [ShowcaseStrings.Lang_DE]: 'Німецька',
  [ShowcaseStrings.Lang_ZH_CN]: 'Китайська',
  [ShowcaseStrings.Lang_JA]: 'Японська',
  [ShowcaseStrings.Lang_UK]: 'Українська',

  // FAQ Page
  [ShowcaseStrings.FAQ_ModeAriaLabel]: 'Режим FAQ',
  [ShowcaseStrings.FAQ_Gild_Character]: 'Персонаж Gild',
  [ShowcaseStrings.FAQ_Phix_Character]: 'Персонаж Phix',
  [ShowcaseStrings.FAQ_SwitchToModeTemplate]: 'Перемкнути на {MODE} FAQ',
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain FAQ',
  [ShowcaseStrings.FAQ_Title_Ecosystem]: 'Всесвіт BrightChain',
  [ShowcaseStrings.FAQ_Subtitle_Technical]:
    'Еволюційний наступник файлової системи без власника',
  [ShowcaseStrings.FAQ_Subtitle_Ecosystem]:
    'Познайомтеся з талісманами, місією та екосистемою',
  [ShowcaseStrings.FAQ_Toggle_Technical]: 'Технічний',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem]: 'Екосистема',
  [ShowcaseStrings.FAQ_Toggle_Technical_Sublabel]: 'Gild охороняє деталі',
  [ShowcaseStrings.FAQ_Toggle_Ecosystem_Sublabel]: 'Phix розкриває бачення',
  [ShowcaseStrings.FAQ_BackToHome]: '← Назад на головну',

  // FAQ Technical Questions
  [ShowcaseStrings.FAQ_Tech_Q1_Title]: '1. Що таке BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q1_Answer]:
    'BrightChain — це децентралізована, високопродуктивна інфраструктура даних "без власника". Це архітектурний наступник файлової системи без власника (OFFSystem), модернізований для апаратних середовищ 2026 року, включаючи Apple Silicon та NVMe сховища.',

  [ShowcaseStrings.FAQ_Tech_Q2_Title]:
    '2. Чим BrightChain відрізняється від оригінальної OFFSystem?',
  [ShowcaseStrings.FAQ_Tech_Q2_Intro]:
    'BrightChain поважає філософію "без власника" свого попередника, водночас впроваджуючи критичні модернізації:',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy_Label]:
    'Опціональна надлишковість',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInRedundancy]:
    'Користувачі можуть запитувати зберігання своїх блоків з вищою надійністю за допомогою кодування Ріда-Соломона.',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance_Label]:
    'Продуктивність відновлення',
  [ShowcaseStrings.FAQ_Tech_Q2_RecoveryPerformance]:
    'Використовуючи @digitaldefiance/node-rs-accelerate, система використовує апаратне забезпечення GPU/NPU для виконання операцій відновлення Ріда-Соломона зі швидкістю до 30+ ГБ/с.',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability_Label]: 'Масштабованість',
  [ShowcaseStrings.FAQ_Tech_Q2_Scalability]:
    'Через Super CBL (списки складових блоків) система використовує рекурсивну індексацію для підтримки практично необмежених розмірів файлів з ефективністю отримання O(log N).',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity_Label]: 'Ідентичність',
  [ShowcaseStrings.FAQ_Tech_Q2_Identity]:
    'Інтеграція BIP39/32 дозволяє безпечну ідентичність на основі мнемоніки та ієрархічне детерміноване управління ключами.',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption_Label]: 'Опціональне шифрування',
  [ShowcaseStrings.FAQ_Tech_Q2_OptInEncryption]:
    'Користувачі можуть опціонально додати шифрування ECIES поверх своїх даних, використовуючи систему HDKey простору ключів/ідентичності Ethereum.',

  [ShowcaseStrings.FAQ_Tech_Q3_Title]: '3. Як дані є "без власника"?',
  [ShowcaseStrings.FAQ_Tech_Q3_Intro]:
    'BrightChain використовує багаторівневий криптографічний підхід, щоб гарантувати, що жоден окремий вузол не "розміщує" файл у юридичному чи практичному сенсі:',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline_Label]: 'Базова лінія XOR',
  [ShowcaseStrings.FAQ_Tech_Q3_XORBaseline]:
    'Кожен блок обробляється через прості операції XOR, роблячи необроблені дані в стані спокою невідрізненними від випадкового шуму.',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe_Label]: 'Рецепт',
  [ShowcaseStrings.FAQ_Tech_Q3_Recipe]:
    'Для реконструкції файлу користувачу потрібен Рецепт — конкретна просторова карта порядку блоків.',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption_Label]: 'Опціональне шифрування',
  [ShowcaseStrings.FAQ_Tech_Q3_OptInEncryption]:
    'Користувачі можуть опціонально додати шифрування ECIES поверх своїх даних. Без Рецепту дані залишаються невпорядкованими і, якщо обрано, криптографічно заблокованими.',

  [ShowcaseStrings.FAQ_Tech_Q4_Title]:
    '4. Що таке "Компроміс кортежів" і що він забезпечує?',
  [ShowcaseStrings.FAQ_Tech_Q4_Intro]:
    '"Компроміс кортежів" — це навмисний баланс між накладними витратами шардингу "без власника" та неперевершеними юридичними та економічними перевагами, які він надає мережі.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantage]:
    'Юридична перевага: Правдоподібне заперечення',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalAdvantageText]:
    'Шардуючи дані на майже випадкові кортежі (блоки) через змішування XOR, користувачі, які надають сховище, розміщують дані, які математично невідрізненні від шуму.',
  [ShowcaseStrings.FAQ_Tech_Q4_LegalResult]:
    'Результат: Оскільки один вузол не може реконструювати цілісний файл без "Рецепту", технічно та юридично неможливо стверджувати, що конкретний оператор вузла "розміщує" або "розповсюджує" будь-який конкретний контент. Це забезпечує найвищий рівень правдоподібного заперечення для учасників.',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantage]:
    'Економічна перевага: Ефективність проти Proof-of-Work',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicAdvantageText]:
    'Хоча шардинг "без власника" дійсно вводить незначні накладні витрати на зберігання, вони незначні порівняно з масивними витратами енергії та обладнання традиційних мереж Proof-of-Work (PoW) або Proof-of-Stake (PoS).',
  [ShowcaseStrings.FAQ_Tech_Q4_EconomicResult]:
    'Результат: BrightChain досягає високопродуктивної цілісності даних без спалювання "Джоулів" на марнотратні змагання хешування. Це робить мережу висококонкурентною, пропонуючи низьколатентну продуктивність за частку вартості застарілих блокчейнів.',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummary]: 'Підсумок компромісу:',
  [ShowcaseStrings.FAQ_Tech_Q4_TradeoffSummaryText]:
    'Користувачі приймають незначне збільшення "шардів" даних в обмін на середовище розміщення без відповідальності та інфраструктуру з наднизькою вартістю. Це робить BrightChain найбільш життєздатною платформою для децентралізованого зберігання у високорегульованих або обмежених ресурсами середовищах.',

  [ShowcaseStrings.FAQ_Tech_Q5_Title]:
    '5. Чим BrightChain відрізняється від традиційних блокчейнів?',
  [ShowcaseStrings.FAQ_Tech_Q5_Answer]:
    'Технічно BrightChain — це децентралізоване сховище блоків, а не єдиний монолітний блокчейн. Тоді як традиційні блокчейни є реєстром, BrightChain забезпечує базову інфраструктуру для розміщення та підтримки кількох гібридних реєстрів дерев Меркла одночасно. Ми використовуємо ланцюжок блоків як структурний метод для реконструкції файлів, але система розроблена як високопродуктивна основа, яка може живити багато різних блокчейнів та dApps поверх уніфікованого рівня зберігання "без власника".',

  [ShowcaseStrings.FAQ_Tech_Q6_Title]:
    '6. Яка роль Ріда-Соломона (RS) у BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q6_Intro]:
    'Тоді як XOR обробляє конфіденційність та статус "без власника" даних, кодування стирання Ріда-Соломона є опціональним рівнем для відновлюваності.',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy_Label]: 'Надлишковість',
  [ShowcaseStrings.FAQ_Tech_Q6_Redundancy]:
    'RS дозволяє реконструювати файл, навіть якщо кілька вузлів розміщення виходять з мережі.',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff_Label]: 'Компроміс',
  [ShowcaseStrings.FAQ_Tech_Q6_Tradeoff]:
    'RS додає обчислювальні накладні витрати та вимоги до зберігання порівняно з простим XOR. Користувачі повинні обирати рівень надлишковості на основі важливості даних та доступних "Джоулів".',

  [ShowcaseStrings.FAQ_Tech_Q7_Title]: '7. Що таке "Джоуль"?',
  [ShowcaseStrings.FAQ_Tech_Q7_Intro]:
    'Джоуль — це одиниця обліку роботи та споживання ресурсів в екосистемі BrightChain.',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis_Label]: 'Основа вартості',
  [ShowcaseStrings.FAQ_Tech_Q7_CostBasis]:
    'Кожна дія — зберігання даних, виконання змішування XOR або кодування шардів Ріда-Соломона — має прогнозовану вартість у Джоулях.',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement_Label]:
    'Управління ресурсами',
  [ShowcaseStrings.FAQ_Tech_Q7_ResourceManagement]:
    'Користувачі повинні зважувати вартість у Джоулях високонадлишкового зберігання проти цінності своїх даних.',

  [ShowcaseStrings.FAQ_Tech_Q8_Title]: '8. Як отримати Джоулі?',
  [ShowcaseStrings.FAQ_Tech_Q8_Intro]:
    'Джоулі заробляються через модель "Робота за роботу". Користувачі отримують Джоулі, надаючи ресурси назад мережі:',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage_Label]: 'Зберігання',
  [ShowcaseStrings.FAQ_Tech_Q8_Storage]:
    'Розміщення зашифрованих блоків для інших учасників.',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation_Label]: 'Обчислення',
  [ShowcaseStrings.FAQ_Tech_Q8_Computation]:
    'Надання циклів CPU/GPU/NPU для виконання завдань кодування або відновлення для колективу.',
  [ShowcaseStrings.FAQ_Tech_Q8_Conclusion]:
    'Це гарантує, що мережа залишається самопідтримуваною енергетичною економікою, де внесок дорівнює потужності.',

  [ShowcaseStrings.FAQ_Tech_Q9_Title]: '9. Як підтримується анонімність?',
  [ShowcaseStrings.FAQ_Tech_Q9_Intro]:
    'BrightChain використовує посередницьку анонімність.',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain_Label]: 'У ланцюзі',
  [ShowcaseStrings.FAQ_Tech_Q9_OnChain]:
    'Всі дії анонімні для загальної мережі.',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust_Label]: 'Кворум',
  [ShowcaseStrings.FAQ_Tech_Q9_BrightTrust]:
    'Ідентичність криптографічно прив\'язана до Кворуму управління. Це гарантує, що хоча дані та дії користувача є приватними, спільнота підтримує "Соціальний рівень" відповідальності через секретний обмін Шаміра та гомоморфне голосування.',

  [ShowcaseStrings.FAQ_Tech_Q10_Title]: '10. Що таке BrightDB і як він працює?',
  [ShowcaseStrings.FAQ_Tech_Q10_Intro]:
    "BrightDB — це високорівневий рівень сховища документів, побудований безпосередньо поверх сховища блоків BrightChain. Він забезпечує структурований спосіб зберігання, запитів та управління складними об'єктами даних без центрального сервера бази даних.",
  [ShowcaseStrings.FAQ_Tech_Q10_HowItWorks]: 'Як це працює',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented_Label]:
    'Документо-орієнтоване зберігання',
  [ShowcaseStrings.FAQ_Tech_Q10_DocumentOriented]:
    'Подібно до баз даних NoSQL, BrightDB зберігає дані як "Документи", шардовані на зашифровані блоки та розподілені по мережі.',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning_Label]:
    'Незмінне версіонування',
  [ShowcaseStrings.FAQ_Tech_Q10_ImmutableVersioning]:
    'Кожна зміна документа записується як новий запис з криптографічно перевіряємою історією.',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing_Label]:
    'Децентралізована індексація',
  [ShowcaseStrings.FAQ_Tech_Q10_DecentralizedIndexing]:
    'Розподілена система індексації дозволяє вузлам знаходити та реконструювати конкретні документи через DHT без центрального "Головного" вузла.',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess_Label]:
    'Доступ на основі кворуму',
  [ShowcaseStrings.FAQ_Tech_Q10_BrightTrustBasedAccess]:
    'Доступ до конкретних баз даних або колекцій може керуватися Кворумом, вимагаючи криптографічного схвалення від авторизованих підписантів.',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMatters]: 'Чому це важливо',
  [ShowcaseStrings.FAQ_Tech_Q10_WhyItMattersText]:
    'Більшість dApps борються, тому що зберігають "важкі" дані на централізованих серверах. BrightDB зберігає дані децентралізованими, без власника та високопродуктивними — дозволяючи справді безсерверні додатки, які такі ж швидкі, як традиційні веб-додатки, але такі ж безпечні, як блокчейн.',

  [ShowcaseStrings.FAQ_Tech_Q11_Title]: '11. Які dApps запущені з BrightChain?',
  [ShowcaseStrings.FAQ_Tech_Q11_Intro]:
    'BrightChain запущено з основним набором "Bright-Apps", розроблених для заміни централізованих сервісів збору даних безпечними, суверенними альтернативами.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Title]: 'Суверенна комунікація',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightMail_Text]:
    'Повністю RFC-сумісна система електронної пошти, що з\'єднує традиційний SMTP та децентралізоване зберігання. На відміну від стандартних провайдерів електронної пошти, BrightMail шардує кожне повідомлення у сховище блоків "без власника" з підтримкою наскрізного зашифрованого обміну повідомленнями "Темного режиму".',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Title]:
    'Соціальна мережа та суверенний граф',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept_Label]: 'Концепція',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Concept]:
    'Децентралізована, стійка до цензури платформа соціальних мереж, яка відображає плинність застарілих "Стрічок" без центрального спостереження або алгоритмічної маніпуляції.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference_Label]: 'Різниця',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_Difference]:
    'Кожен пост, "Лайк" та відносини зберігаються як незмінний, шардований документ у BrightDB. Оскільки він використовує економіку Джоулів, реклами немає — користувачі вносять мікрочастку обчислень або зберігання, щоб "підсилити" свій голос або підтримати історію своєї спільноти.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts_Label]: 'Сила кворумів',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightHub_BrightTrusts]:
    'Модерація не обробляється корпоративною "Командою безпеки". Натомість спільноти керуються Кворумами управління. Правила криптографічно застосовуються, а стандарти спільноти голосуються через гомоморфне голосування, гарантуючи, що цифровий простір групи залишається справді "без власника" та самовизначеним.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Title]: 'Сховище з нульовим знанням',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightPass_Text]:
    'Система управління паролями та ідентичністю, де ваше сховище існує як розподілені зашифровані блоки. Доступ керується вашою мнемонікою BIP39, і кожна зміна облікових даних версіонується та перевіряється через BrightDB.',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Title]: 'Стійка спільнота',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChat_Text]:
    'Платформа комунікацій у реальному часі з постійними каналами, голосом та обміном медіа. Управління спільнотою здійснюється через Кворуми, а прискорене GPU відновлення гарантує, що історія чату ніколи не втрачається.',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Title]:
    'Цифровий Бернбег / Канарковий Протокол',
  [ShowcaseStrings.FAQ_Tech_Q11_DigitalBurnbag_Text]:
    'Спеціалізована платформа для обміну файлами та шифрування, розроблена для даних високого ризику. Вона використовує «Розумні Сховища», які можна запрограмувати на остаточне знищення «Рецепту» (карти та ключів) або його передачу конкретним сторонам за перевірюваних умов — таких як «Перемикач Мертвої Руки», відкладений випуск або консенсус Кворуму. Це найкращий інструмент для викривачів, юристів та будь-кого, хто потребує гарантованого закінчення терміну дії даних.',

  [ShowcaseStrings.FAQ_Tech_Q12_Title]:
    '12. Що таке шифрування Пайє і як воно забезпечує приватне голосування?',
  [ShowcaseStrings.FAQ_Tech_Q12_Answer]:
    'Пайє — це схема шифрування з відкритим ключем зі спеціальною властивістю, яка називається адитивним гомоморфізмом — ви можете додавати зашифровані значення разом, ніколи не розшифровуючи їх. Якщо ви зашифруєте "1" для Кандидата А і хтось інший зашифрує "1" для Кандидата А, ви можете помножити ці шифротексти разом, і результат, коли розшифрований, буде "2". Ніхто ніколи не бачить індивідуальний бюлетень. У системі голосування BrightChain кожен голос шифрується відкритим ключем Пайє, зашифровані бюлетені гомоморфно агрегуються в один шифротекст на кандидата, і лише остаточний підрахунок розшифровується — ніколи жоден індивідуальний голос.',

  [ShowcaseStrings.FAQ_Tech_Q13_Title]: '13. Що робить міст Пайє?',
  [ShowcaseStrings.FAQ_Tech_Q13_Answer]:
    'Міст Пайє — це детерміністична конструкція виведення ключів, яка дозволяє виводити ключі гомоморфного шифрування Пайє безпосередньо з вашої існуючої пари ключів ECDH (еліптична крива Діффі-Хеллмана). Замість управління двома окремими парами ключів — однією для ідентичності/автентифікації (ECC) і однією для гомоморфного шифрування голосів (Пайє) — міст пропускає ваш спільний секрет ECDH через HKDF та HMAC-DRBG для детерміністичної генерації великих простих чисел, необхідних для 3072-бітного ключа Пайє.',
  [ShowcaseStrings.FAQ_Tech_Q13_PaperLink]:
    'Дивіться нашу статтю на цю тему для отримання додаткової інформації.',

  [ShowcaseStrings.FAQ_Tech_Q14_Title]:
    '14. Чи не є BrightChain просто ще одним децентралізованим сховищем (dWS) як IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q14_Answer]:
    'Ні. IPFS — це "Публічна бібліотека", розроблена для виявлення та збереження контенту. BrightChain — це "Суверенне сховище". Тоді як IPFS фокусується на пошуку даних через CID, BrightChain фокусується на статусі "без власника" та високошвидкісному відновленні. У BrightChain дані шардуються настільки ретельно, що жоден окремий вузол не "володіє" і навіть не "знає", що він розміщує.',

  [ShowcaseStrings.FAQ_Tech_Q15_Title]:
    '15. Як "Продуктивність" відрізняється від IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q15_Answer]:
    'IPFS працює за принципом "найкращих зусиль" і часто має високу затримку. BrightChain побудований для ери Apple Silicon (M4 Max). Використовуючи @digitaldefiance/node-rs-accelerate, ми досягаємо швидкості відновлення 30+ ГБ/с. Ми не просто "отримуємо" файли; ми використовуємо апаратно-прискорений Рід-Соломон для рематеріалізації даних з шардів на швидкості шини.',

  [ShowcaseStrings.FAQ_Tech_Q16_Title]:
    '16. Як щодо конфіденційності в BrightChain порівняно з IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q16_Answer]:
    'IPFS за замовчуванням прозорий; якщо у вас є хеш, ви можете бачити файл. BrightChain використовує базову лінію XOR. Дані функціонально "подрібнюються" (як логотип Digital Burnbag) перш ніж потрапити в мережу. Конфіденційність — це не "плагін" — це механічний стан даних.',

  [ShowcaseStrings.FAQ_Tech_Q17_Title]:
    '17. Як порівнюються економіки BrightChain та IPFS?',
  [ShowcaseStrings.FAQ_Tech_Q17_Answer]:
    'IPFS покладається на Filecoin (важкий, зовнішній блокчейн) для стимулів. BrightChain використовує Джоуль. Це "термічна" одиниця обліку, яка вимірює фактичну роботу (цикли CPU/NPU) та споживання ресурсів. Вона вбудована, має низькі накладні витрати та безпосередньо пов\'язана з "Енергією" мережі.',

  // FAQ Ecosystem Questions
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Title]:
    '🔗 Що таке BrightChain насправді?',
  [ShowcaseStrings.FAQ_Eco_WhatIsBrightChain_Answer]:
    'BrightChain — це інфраструктура для світу, де ваші дані належать вам — не платформі, не корпорації, не будь-кому, хто керує сервером. Це децентралізований рівень зберігання, де кожен файл шардується, змішується та розкидається по мережі так, що жоден окремий вузол ніколи не "розміщує" ваші дані в будь-якому значущому сенсі. Результат — система, де конфіденційність не є функцією, яку ви вмикаєте — це стан архітектури за замовчуванням. Ми називаємо це "без власника", тому що як тільки ваші дані потрапляють у BrightChain, ніхто не володіє частинами. Тільки ви маєте Рецепт, щоб зібрати їх назад.',

  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Title]: 'Що таке Digital Burnbag?',
  [ShowcaseStrings.FAQ_Eco_DigitalBurnbag_Answer]:
    'У розвідувальних агентствах "мішок для спалювання" — це контейнер для секретних документів, позначених для знищення — ви кидаєте їх туди, і вони спалюються з перевіряємим ланцюгом зберігання. Digital Burnbag приносить цю концепцію до даних. Коли ви перейменовуєте, переміщуєте або знищуєте дані в BrightChain, система виконує "цикл фенікса": копіює дані в їх новий стан, потім криптографічно спалює старий. Нічого просто не видаляється — воно відроджується.',

  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Title]: 'Що таке Протокол Канарки?',
  [ShowcaseStrings.FAQ_Eco_CanaryProtocol_Answer]:
    'Назва походить від канарки у вугільній шахті — системи раннього попередження, яка співає, коли щось не так. Протокол Канарки стежить за вашими стрічками, вашими API — за всім, що дає серцебиття про те, чи ви живі, чи все йде за планом. Щойно щось іде не так і ваша канарка гине (вибач, Gild!), файл або папка знищується — верифіковано. Це також працює у зворотному напрямку: увійдіть з кодом примусу, або налаштуйте правило через заздалегідь визначеного провайдера, і ваші дані можуть самознищитися за цих умов також. Все зводиться до правил і умов. Якщо щось іде не за планом, Gild отримує своє. Він також може моніторити цілісність мережі, але його основна мета — умовне знищення: ваші дані згорають, коли правила так вимагають.',

  [ShowcaseStrings.FAQ_Eco_MeetTheCast]: 'Познайомтеся з командою',

  [ShowcaseStrings.FAQ_Eco_Volta_Title]: 'Вольта — Іскра',
  [ShowcaseStrings.FAQ_Eco_Volta_Tagline]: 'Високовольтний архітектор',
  [ShowcaseStrings.FAQ_Eco_Volta_Description]:
    'Названа на честь Алессандро Вольта, винахідника батареї, Вольта — це жива іскра — зубчаста, неоново-синя геометрична лисиця з чистої, тріскучої електрики. Вона Постачальник: генерує та проштовхує Джоулі через систему, прагнучи живити кожну операцію на повну потужність.',
  [ShowcaseStrings.FAQ_Eco_Volta_Alt]:
    'Вольта — це іскра, яка зроблена з електрики, геометрична лисиця у неоново-синьому кольорі',

  [ShowcaseStrings.FAQ_Eco_Ohm_Title]: 'Ом — Якір',
  [ShowcaseStrings.FAQ_Eco_Ohm_Tagline]: 'Стоїчний монах опору',
  [ShowcaseStrings.FAQ_Eco_Ohm_Description]:
    "Названий на честь Георга Ома, який визначив електричний опір, Ом — це гальмо до акселератора Вольти. Важка, кам'яниста черепаха-лінивець зі світним символом Омега, інтегрованим у його панцир, він рухається повільно та обдумано.",
  [ShowcaseStrings.FAQ_Eco_Ohm_Alt]:
    "Талісман Ом — кам'яноподібна черепаха-лінивець зі світним символом Омега",

  [ShowcaseStrings.FAQ_Eco_Gild_Title]: 'Гілд — Свідок',
  [ShowcaseStrings.FAQ_Eco_Gild_Tagline]: 'Золотий канарковий охоронець',
  [ShowcaseStrings.FAQ_Eco_Gild_Description]:
    "Марнославна золота канарка, одержима своїм бездоганним жовтим пір'ям. Гілд — охоронець — він стежить за вашими даними, видає попередження та зберігає речі в безпеці.",
  [ShowcaseStrings.FAQ_Eco_Gild_Alt]: 'Гілд — це золота канарка-охоронець',

  [ShowcaseStrings.FAQ_Eco_Phix_Title]: 'Фікс — Відродження',
  [ShowcaseStrings.FAQ_Eco_Phix_Tagline]: 'Руйнівник-Творець',
  [ShowcaseStrings.FAQ_Eco_Phix_Description]:
    '"Phix" = "fix" + "phoenix." Злий близнюк Гілда. Той самий силует птаха, але його пір\'я світиться вугільно-червоним, його очі звужуються як гарячі вугілля, і він посміхається, ніби збирається насолоджуватися цим занадто сильно. Phix — це Виконавець — він споживає Джоулі, щоб спалити старі стани даних і відродитися з новими. Там, де Gild дратується від вогню, Phix І Є вогонь. Він з\'являється під час операцій перейменування та каскадів, запущених канаркою — всюди, де дані вмирають і відроджуються. Але Phix — це також просто чисте знищення. Він той піроман, що стоїть з сірником, коли ви готові щось спалити, і радий допомогти. Видалити файл? Phix посміхається. Стерти папку? Він вже горить. Хоча він отримує радість від руйнування, він також пишається створенням — відродитися з попелу з чимось новим — це вся його суть.',
  [ShowcaseStrings.FAQ_Eco_Phix_Alt]:
    'Фікс — це вогняний фенікс, жарящийся близнюк Гілда',

  [ShowcaseStrings.FAQ_Eco_TheEconomy]: 'Економіка',

  [ShowcaseStrings.FAQ_Eco_Joules_Title]: '⚡ Що таке Джоулі?',
  [ShowcaseStrings.FAQ_Eco_Joules_Answer]:
    'Джоулі — це одиниця енергії BrightChain — не спекулятивна криптовалюта, а міра реальної роботи та внеску. Візуально це крихітні неоново-сині токени блискавки, які течуть, накопичуються та виснажуються як монети в грі.',

  [ShowcaseStrings.FAQ_Eco_Soot_Title]: '💨 Що таке Сажа?',
  [ShowcaseStrings.FAQ_Eco_Soot_Answer]:
    'Сажа — це видимий наслідок кожної операції — "вуглецевий слід" ваших цифрових дій. Це не валюта, яку ви витрачаєте; це вартість, якої ви не можете уникнути.',

  [ShowcaseStrings.FAQ_Eco_BigPicture]: 'Загальна картина',

  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Title]: '🌐 Як все це поєднується?',
  [ShowcaseStrings.FAQ_Eco_HowFitsTogether_Answer]:
    'Екосистема — це дворівнева система. На рівні платформи BrightChain працює на напрузі між Вольтою (Витратником) та Омом (Заощаджувачем), з Джоулями, що течуть між ними як енергетична валюта.',

  [ShowcaseStrings.FAQ_Eco_Beliefs_Title]: '🧘 У що вірить BrightChain?',
  [ShowcaseStrings.FAQ_Eco_Beliefs_Answer]:
    'Енергія зберігається. Дії мають наслідки. Дані мають вагу. Кожен персонаж в екосистемі BrightChain відображає глибший принцип.',

  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Title]:
    '🎨 Де я можу побачити талісманів у дії?',
  [ShowcaseStrings.FAQ_Eco_MascotsInAction_Answer]:
    "Талісмани вплетені в досвід продукту. Гілд з'являється під час перегляду файлів, завантаження та обміну — його рівень сажі пасивно відображає, скільки активності відбувається.",

  // Hero Section
  [ShowcaseStrings.Hero_Badge]: '🌟 Децентралізована платформа додатків',
  [ShowcaseStrings.Hero_Description_P1]:
    'BrightChain революціонізує зберігання даних, використовуючи концепцію "Bright Block Soup". Ваші файли розбиваються на блоки та змішуються з випадковими даними за допомогою операцій XOR, роблячи їх повністю випадковими, зберігаючи при цьому ідеальну безпеку.',
  [ShowcaseStrings.Hero_Description_NotCrypto]: 'Не криптовалюта.',
  [ShowcaseStrings.Hero_Description_P2]:
    "Без монет, без майнінгу, без доказу роботи. BrightChain цінує реальні внески сховища та обчислень, відстежувані в Джоулях — одиниці, прив'язаній до реальних енергетичних витрат, а не ринкових спекуляцій.",
  [ShowcaseStrings.Hero_Highlight]:
    '🔒 Зберігання без власника • ⚡ Енергоефективний • 🌐 Децентралізований • 🎭 Анонімний, але відповідальний • 🗳️ Гомоморфне голосування • 💾 Зберігання замість потужності',
  [ShowcaseStrings.Hero_CTA_InteractiveDemo]: '🧪 Інтерактивна демонстрація',
  [ShowcaseStrings.Hero_CTA_SoupDemo]: '🥫 Демо BrightChain Soup',
  [ShowcaseStrings.Hero_CTA_GitHub]: 'Переглянути на GitHub',
  [ShowcaseStrings.Hero_CTA_Blog]: 'Блог',
  [ShowcaseStrings.Comp_Title_Revolutionary]: 'Революційні',
  [ShowcaseStrings.Comp_Title_Features]: 'Можливості',
  [ShowcaseStrings.Comp_Title_Capabilities]: 'та функціонал',
  [ShowcaseStrings.Comp_Subtitle]:
    'Децентралізована платформа додатків — передова криптографія, децентралізоване зберігання та демократичне управління',
  [ShowcaseStrings.Comp_Intro_Heading]:
    'BrightChain революціонізує зберігання даних, використовуючи концепцію "Bright Block Soup" — поєднуючи передову криптографію, децентралізоване зберігання та демократичне управління.',
  [ShowcaseStrings.Comp_Intro_P1]:
    'Ваші файли розбиваються на блоки та змішуються з випадковими даними за допомогою операцій XOR, роблячи їх повністю випадковими, зберігаючи при цьому ідеальну безпеку. Від гомоморфного голосування до посередницької анонімності, від розподіленого зберігання файлів до управління на основі кворуму, BrightChain пропонує все необхідне для наступного покоління децентралізованих додатків.',
  [ShowcaseStrings.Comp_Problem_Title]: '❌ Проблеми традиційного блокчейну',
  [ShowcaseStrings.Comp_Problem_1]:
    'Масивні витрати енергії від майнінгу з доказом роботи',
  [ShowcaseStrings.Comp_Problem_2]:
    'Марна ємність зберігання на мільярдах пристроїв',
  [ShowcaseStrings.Comp_Problem_3]:
    'Відсутність механізмів голосування, що зберігають конфіденційність',
  [ShowcaseStrings.Comp_Problem_4]:
    'Анонімність без відповідальності призводить до зловживань',
  [ShowcaseStrings.Comp_Problem_5]:
    'Дороге зберігання в ланцюзі обмежує додатки',
  [ShowcaseStrings.Comp_Problem_6]:
    'Оператори вузлів несуть юридичну відповідальність за збережений контент',
  [ShowcaseStrings.Comp_Problem_Result]:
    'Технологія блокчейн, яка є екологічно руйнівною, юридично ризикованою та функціонально обмеженою.',
  [ShowcaseStrings.Comp_Solution_Title]: '✅ Рішення BrightChain',
  [ShowcaseStrings.Comp_Solution_P1]:
    'BrightChain усуває марнотратство майнінгу, використовуючи доказ роботи лише для обмеження, а не для консенсусу. Файлова система без власника забезпечує юридичний імунітет, зберігаючи лише XOR-рандомізовані блоки. Гомоморфне голосування забезпечує вибори зі збереженням конфіденційності, тоді як посередницька анонімність балансує конфіденційність з відповідальністю.',
  [ShowcaseStrings.Comp_Solution_P2]:
    'Побудований на просторі ключів Ethereum, але спроектований без обмежень доказу роботи, BrightChain монетизує невикористане сховище на персональних пристроях, створюючи стійку P2P мережу. Система кворуму забезпечує демократичне управління з математичними гарантіями безпеки.',
  [ShowcaseStrings.Comp_VP_OwnerFree_Title]: '🔒 Зберігання без власника',
  [ShowcaseStrings.Comp_VP_OwnerFree_Desc]:
    'Криптографічна випадковість усуває відповідальність за зберігання — жоден окремий блок не містить ідентифікованого контенту',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Title]: '⚡ Енергоефективний',
  [ShowcaseStrings.Comp_VP_EnergyEfficient_Desc]:
    'Без марнотратного майнінгу з доказом роботи — всі обчислення служать корисним цілям',
  [ShowcaseStrings.Comp_VP_Decentralized_Title]: '🌐 Децентралізований',
  [ShowcaseStrings.Comp_VP_Decentralized_Desc]:
    'Розподілений по мережі — P2P зберігання типу IPFS, що використовує марний простір на персональних пристроях',
  [ShowcaseStrings.Comp_VP_Anonymous_Title]: '🎭 Анонімний, але відповідальний',
  [ShowcaseStrings.Comp_VP_Anonymous_Desc]:
    'Конфіденційність з можливостями модерації — посередницька анонімність через консенсус кворуму',
  [ShowcaseStrings.Comp_VP_Voting_Title]: '🗳️ Гомоморфне голосування',
  [ShowcaseStrings.Comp_VP_Voting_Desc]:
    'Вибори зі збереженням конфіденційності з підрахунком голосів, який ніколи не розкриває індивідуальні голоси',
  [ShowcaseStrings.Comp_VP_BrightTrust_Title]: '🔒 Управління кворумом',
  [ShowcaseStrings.Comp_VP_BrightTrust_Desc]:
    'Демократичне прийняття рішень з налаштовуваними порогами та математичною безпекою',
  [ShowcaseStrings.Comp_VP_BrightStack_Title]: '🚀 Будуйте з BrightStack',
  [ShowcaseStrings.Comp_VP_BrightStack_Desc]:
    'BrightChain + Express + React + Node — замініть MongoDB на BrightDB, залиште все інше',
  [ShowcaseStrings.Comp_ProjectPage]: 'Сторінка проекту',
  [ShowcaseStrings.Demo_Title_Interactive]: 'Інтерактивна',
  [ShowcaseStrings.Demo_Title_Demo]: 'Демонстрація',
  [ShowcaseStrings.Demo_Subtitle]: 'Візуалізація можливостей шифрування ECIES',
  [ShowcaseStrings.Demo_Disclaimer]:
    'Примітка: Ця візуалізація використовує @digitaldefiance/ecies-lib (бібліотеку браузера) для демонстраційних цілей. @digitaldefiance/node-ecies-lib надає ідентичну функціональність з тим самим API для серверних додатків Node.js. Обидві бібліотеки бінарно сумісні, тому дані, зашифровані однією, можуть бути розшифровані іншою.',
  [ShowcaseStrings.Demo_Alice_Title]: 'Аліса (Відправник)',
  [ShowcaseStrings.Demo_Alice_PublicKey]: 'Публічний ключ:',
  [ShowcaseStrings.Demo_Alice_MessageLabel]: 'Повідомлення для шифрування:',
  [ShowcaseStrings.Demo_Alice_Placeholder]: 'Введіть секретне повідомлення...',
  [ShowcaseStrings.Demo_Alice_Encrypting]: 'Шифрування...',
  [ShowcaseStrings.Demo_Alice_EncryptForBob]: 'Зашифрувати для Боба',
  [ShowcaseStrings.Demo_Bob_Title]: 'Боб (Отримувач)',
  [ShowcaseStrings.Demo_Bob_PublicKey]: 'Публічний ключ:',
  [ShowcaseStrings.Demo_Bob_EncryptedPayload]: 'Зашифроване навантаження:',
  [ShowcaseStrings.Demo_Bob_Decrypting]: 'Розшифрування...',
  [ShowcaseStrings.Demo_Bob_DecryptMessage]: 'Розшифрувати повідомлення',
  [ShowcaseStrings.Demo_Bob_DecryptedMessage]: 'Розшифроване повідомлення:',
  [ShowcaseStrings.Demo_Error]: 'Помилка:',
  [ShowcaseStrings.About_Title_BuiltWith]: 'Створено з',
  [ShowcaseStrings.About_Title_By]: 'від Digital Defiance',
  [ShowcaseStrings.About_Subtitle]:
    'Інновації з відкритим кодом у децентралізованій інфраструктурі',
  [ShowcaseStrings.About_Vision_Title]: 'Наше бачення',
  [ShowcaseStrings.About_Vision_P1]:
    'У Digital Defiance ми віримо в надання індивідуумам та організаціям справді децентралізованої інфраструктури, яка поважає конфіденційність, сприяє сталому розвитку та забезпечує демократичну участь.',
  [ShowcaseStrings.About_Vision_P2]:
    'BrightChain революціонізує зберігання даних, використовуючи концепцію "Bright Block Soup". Ваші файли розбиваються на блоки та змішуються з випадковими даними за допомогою операцій XOR, роблячи їх повністю випадковими, зберігаючи при цьому ідеальну безпеку. Усунувши марнотратство майнінгу, монетизувавши невикористане сховище та впровадивши такі функції, як гомоморфне голосування та посередницька анонімність, ми створили платформу, яка працює для всіх.',
  [ShowcaseStrings.About_Vision_NotCrypto]:
    'Не криптовалюта. Коли ви чуєте "блокчейн", ви, ймовірно, думаєте про Bitcoin. BrightChain не має валюти, доказу роботи чи майнінгу. Замість спалювання енергії для карбування монет, BrightChain цінує реальні внески сховища та обчислень. Ці внески відстежуються в одиниці, що називається Джоуль, яка прив\'язана до реальних енергетичних витрат за формулою — а не ринковою спекуляцією. Ви не можете майнити Джоулі чи торгувати ними; вони відображають фактичні витрати ресурсів, і ми вдосконалюємо цю формулу з часом.',
  [ShowcaseStrings.About_Vision_StorageDensity]:
    'Перевага щільності зберігання проти потужності: Кожен блокчейн має марнотратство десь. BrightChain скорочує марнотратство всіма можливими способами, але має деякі накладні витрати у вигляді механізму зберігання. Однак зберігання є однією з областей, яка була найбільш економічно ефективною і де ми досягли масивної щільності за останні роки, тоді як центри обробки даних борються за досягнення необхідної щільності потужності для вимог CPU блокчейнів та ШІ. Компроміс мінімальних накладних витрат на зберігання за анонімність та звільнення від занепокоєння щодо позовів про авторські права та подібного, або розміщення неприйнятного матеріалу, дозволяє всім повністю брати участь та максимально використовувати наші величезні ресурси зберігання, розподілені по всьому світу.',
  [ShowcaseStrings.About_BrightStack_P1]:
    'BrightStack — це повностекова парадигма для децентралізованих додатків: BrightChain + Express + React + Node. Якщо ви знаєте стек MERN, ви вже знаєте BrightStack — просто замініть MongoDB на BrightDB.',
  [ShowcaseStrings.About_BrightStack_P2]:
    'BrightDB — це документна база даних типу MongoDB на файловій системі без власника з повним CRUD, запитами, індексами, транзакціями та конвеєрами агрегації. Ті самі патерни, що ви використовуєте з MongoDB — колекції, find, insert, update — але кожен документ зберігається як блоки, що зберігають конфіденційність.',
  [ShowcaseStrings.About_BrightStack_P3]:
    'BrightPass, BrightMail та BrightHub були побудовані на BrightStack, доводячи, що розробка децентралізованих додатків може бути такою ж простою, як традиційна повностекова розробка.',
  [ShowcaseStrings.About_OpenSource]:
    '100% відкритий код. BrightChain повністю відкритий під ліцензією MIT. Створюйте власні dApps на BrightStack та робіть внесок у децентралізоване майбутнє.',
  [ShowcaseStrings.About_WorkInProgress]:
    'BrightChain — це робота в процесі. Наразі ми прагнемо залишати збірку стабільною щодня, але речі можуть прослизнути, і BrightChain ще не зрілий. Ми вибачаємося за будь-які незручності або нестабільність.',
  [ShowcaseStrings.About_OtherImpl_Title]: 'Інші реалізації',
  [ShowcaseStrings.About_OtherImpl_P1]:
    'Хоча ця реалізація на TypeScript/Node.js є основною та найбільш зрілою версією BrightChain, паралельна основна бібліотека на C++ з UI для macOS/iOS знаходиться в розробці. Ця нативна реалізація приносить функції конфіденційності та безпеки BrightChain на платформи Apple. Обидва репозиторії знаходяться на ранній стадії розробки і ще не готові для виробничого використання.',
  // TODO: translate
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'While this TypeScript/Node.js implementation is the primary and most mature version of BrightChain, a parallel ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'C++ core library',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'macOS/iOS UI',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    " is in development. This native implementation brings BrightChain's privacy and security features to Apple platforms. Both repositories are in early development and not yet ready for production use.",
  [ShowcaseStrings.About_Feature_OwnerFree_Title]: 'Зберігання без власника',
  [ShowcaseStrings.About_Feature_OwnerFree_Desc]:
    'Криптографічна випадковість усуває відповідальність за зберігання. Жоден окремий блок не містить ідентифікованого контенту, забезпечуючи юридичний імунітет для операторів вузлів.',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Title]: 'Енергоефективний',
  [ShowcaseStrings.About_Feature_EnergyEfficient_Desc]:
    'Без марнотратного майнінгу з доказом роботи. Всі обчислення служать корисним цілям — зберігання, верифікація та мережеві операції.',
  [ShowcaseStrings.About_Feature_Anonymous_Title]:
    'Анонімний, але відповідальний',
  [ShowcaseStrings.About_Feature_Anonymous_Desc]:
    'Конфіденційність з можливостями модерації. Посередницька анонімність балансує конфіденційність з відповідальністю через консенсус кворуму.',
  [ShowcaseStrings.About_CTA_Title]: 'Приєднуйтесь до революції',
  [ShowcaseStrings.About_CTA_Desc]:
    'Допоможіть нам побудувати майбутнє децентралізованої інфраструктури. Робіть внесок у BrightChain, повідомляйте про проблеми або поставте зірку на GitHub, щоб показати вашу підтримку сталої технології блокчейн.',
  [ShowcaseStrings.About_CTA_InteractiveDemo]: '🥫 Інтерактивна демонстрація',
  [ShowcaseStrings.About_CTA_LearnMore]: 'Дізнатися більше',
  [ShowcaseStrings.About_CTA_GitHub]: 'Відвідати BrightChain на GitHub',
  [ShowcaseStrings.About_CTA_Docs]: 'Читати документацію',
  [ShowcaseStrings.About_Footer_CopyrightTemplate]:
    '© {YEAR} Digital Defiance. Зроблено з ❤️ для спільноти розробників.',

  // Voting Demo - Common
  [ShowcaseStrings.Vote_InitializingCrypto]:
    'Ініціалізація криптографічної системи голосування...',
  [ShowcaseStrings.Vote_DecryptingVotes]: '🔓 Розшифрування голосів...',
  [ShowcaseStrings.Vote_LoadingDemo]: 'Завантаження демо голосування...',
  [ShowcaseStrings.Vote_RunAnotherElection]: 'Провести ще одні вибори',
  [ShowcaseStrings.Vote_StartElection]: '🎯 Розпочати вибори!',
  [ShowcaseStrings.Vote_ComingSoon]: '🚧 Демо {METHOD}',
  [ShowcaseStrings.Vote_ComingSoonDesc]:
    'Цей метод голосування повністю реалізований у бібліотеці.',
  [ShowcaseStrings.Vote_CitizensVotingTemplate]:
    '👥 Громадяни голосують ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Vote_CastVotesTemplate]:
    'Подані голоси ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Vote_VotedTemplate]: '✓ Проголосував за {CHOICE}',
  [ShowcaseStrings.Vote_ResultsTitle]: '🏆 Результати',
  [ShowcaseStrings.Vote_VotesTemplate]: '{COUNT} голосів ({PERCENT}%)',
  [ShowcaseStrings.Vote_ApprovalsTemplate]: '{COUNT} схвалень ({PERCENT}%)',
  [ShowcaseStrings.Vote_ShowAuditLog]: '🔍 Показати журнал аудиту',
  [ShowcaseStrings.Vote_HideAuditLog]: '🔍 Сховати журнал аудиту',
  [ShowcaseStrings.Vote_ShowEventLog]: '📊 Показати журнал подій',
  [ShowcaseStrings.Vote_HideEventLog]: '📊 Сховати журнал подій',
  [ShowcaseStrings.Vote_AuditLogTitle]:
    '🔒 Незмінний журнал аудиту (Вимога 1.1)',
  [ShowcaseStrings.Vote_AuditLogDesc]:
    'Криптографічно підписаний, хеш-ланцюговий аудиторський слід',
  [ShowcaseStrings.Vote_ChainIntegrity]: 'Цілісність ланцюга:',
  [ShowcaseStrings.Vote_ChainValid]: '✅ Дійсний',
  [ShowcaseStrings.Vote_ChainCompromised]: '❌ Скомпрометований',
  [ShowcaseStrings.Vote_EventLogTitle]: '📊 Реєстратор подій (Вимога 1.3)',
  [ShowcaseStrings.Vote_EventLogDesc]:
    'Комплексне відстеження подій з мікросекундними мітками часу та порядковими номерами',
  [ShowcaseStrings.Vote_SequenceIntegrity]: 'Цілісність послідовності:',
  [ShowcaseStrings.Vote_SequenceValid]: '✅ Дійсна',
  [ShowcaseStrings.Vote_SequenceGaps]: '❌ Виявлено розриви',
  [ShowcaseStrings.Vote_TotalEventsTemplate]: 'Всього подій: {COUNT}',
  [ShowcaseStrings.Vote_Timestamp]: 'Мітка часу:',
  [ShowcaseStrings.Vote_VoterToken]: 'Токен виборця:',

  // Voting Demo - Wrapper
  [ShowcaseStrings.Vote_Title]: '🗳️ Система голосування державного рівня',
  [ShowcaseStrings.Vote_TitleDesc]:
    'Ознайомтеся з нашою комплексною криптографічною бібліотекою голосування з 15 різними методами. Кожне демо показує реальні сценарії використання з гомоморфним шифруванням, що забезпечує конфіденційність голосів.',
  [ShowcaseStrings.Vote_BadgeHomomorphic]: '✅ Гомоморфне шифрування',
  [ShowcaseStrings.Vote_BadgeReceipts]: '🔐 Верифіковані квитанції',
  [ShowcaseStrings.Vote_BadgeRoleSeparation]: '🛡️ Розділення ролей',
  [ShowcaseStrings.Vote_BadgeTests]: '🧪 900+ тестів',

  // Voting Selector
  [ShowcaseStrings.VoteSel_Title]: 'Оберіть метод голосування',
  [ShowcaseStrings.VoteSel_SecureCategory]:
    '✅ Повністю безпечний (Однораундовий, зі збереженням конфіденційності)',
  [ShowcaseStrings.VoteSel_MultiRoundCategory]:
    '⚠️ Багатораундовий (Потребує проміжного розшифрування)',
  [ShowcaseStrings.VoteSel_InsecureCategory]:
    '❌ Небезпечний (Без конфіденційності — лише для спеціальних випадків)',

  // Voting Method Names
  [ShowcaseStrings.VoteMethod_Plurality]: 'Плюральне',
  [ShowcaseStrings.VoteMethod_Approval]: 'Схвальне',
  [ShowcaseStrings.VoteMethod_Weighted]: 'Зважене',
  [ShowcaseStrings.VoteMethod_BordaCount]: 'Підрахунок Борда',
  [ShowcaseStrings.VoteMethod_ScoreVoting]: 'Бальне голосування',
  [ShowcaseStrings.VoteMethod_YesNo]: 'Так/Ні',
  [ShowcaseStrings.VoteMethod_YesNoAbstain]: 'Так/Ні/Утримався',
  [ShowcaseStrings.VoteMethod_Supermajority]: 'Кваліфікована більшість',
  [ShowcaseStrings.VoteMethod_RankedChoice]: 'Рейтингове голосування (IRV)',
  [ShowcaseStrings.VoteMethod_TwoRound]: 'Двотурове',
  [ShowcaseStrings.VoteMethod_STAR]: 'STAR',
  [ShowcaseStrings.VoteMethod_STV]: 'STV',
  [ShowcaseStrings.VoteMethod_Quadratic]: 'Квадратичне',
  [ShowcaseStrings.VoteMethod_Consensus]: 'Консенсусне',
  [ShowcaseStrings.VoteMethod_ConsentBased]: 'На основі згоди',

  // Plurality Demo
  [ShowcaseStrings.Plur_IntroTitle]:
    'Ласкаво просимо на вибори бюджету міста Ріверсайд!',
  [ShowcaseStrings.Plur_IntroStory]:
    'Міська рада виділила $50 мільйонів на великий проект, але не може вирішити, який саме фінансувати. Ось тут на сцену виходите ВИ!',
  [ShowcaseStrings.Plur_IntroSituation]:
    'У бюлетені три пропозиції. Кожна має палких прихильників, але перемогти може лише ОДНА.',
  [ShowcaseStrings.Plur_IntroTeamGreen]:
    'Команда Зелених хоче сонячні панелі на кожній громадській будівлі',
  [ShowcaseStrings.Plur_IntroTransit]:
    'Прихильники транспорту наполягають на новій лінії метро',
  [ShowcaseStrings.Plur_IntroHousing]:
    'Житлова коаліція вимагає доступне житло для 500 сімей',
  [ShowcaseStrings.Plur_IntroChallenge]:
    'Ви голосуватимете за 5 громадян. Кожен голос зашифрований — навіть виборчі чиновники не можуть бачити окремі бюлетені до фінального підрахунку. Ось як мають працювати справжні демократії!',
  [ShowcaseStrings.Plur_DemoTitle]:
    '🗳️ Плюральне голосування — Бюджет міста Ріверсайд',
  [ShowcaseStrings.Plur_DemoTagline]:
    '🏛️ Один голос на особу. Найбільше голосів перемагає. Демократія в дії!',
  [ShowcaseStrings.Plur_CandidatesTitle]: 'Пріоритети міського бюджету',
  [ShowcaseStrings.Plur_VoterInstruction]:
    "Натисніть на пропозицію, щоб подати голос кожного громадянина. Пам'ятайте: їхній вибір зашифрований і конфіденційний!",
  [ShowcaseStrings.Plur_ClosePollsBtn]:
    '📦 Закрити голосування та підрахувати голоси!',
  [ShowcaseStrings.Plur_ResultsTitle]: '🎉 Народ висловився!',
  [ShowcaseStrings.Plur_ResultsIntro]:
    'Після розшифрування всіх голосів, ось що обрав Ріверсайд:',
  [ShowcaseStrings.Plur_TallyTitle]: '📊 Процес підрахунку голосів',
  [ShowcaseStrings.Plur_TallyExplain]:
    'Кожен зашифрований голос був гомоморфно доданий, а потім розшифрований для виявлення підсумків:',
  [ShowcaseStrings.Plur_Cand1_Name]: 'Ініціатива зеленої енергетики',
  [ShowcaseStrings.Plur_Cand1_Desc]:
    'Інвестувати в інфраструктуру відновлюваної енергетики',
  [ShowcaseStrings.Plur_Cand2_Name]: 'Розширення громадського транспорту',
  [ShowcaseStrings.Plur_Cand2_Desc]:
    'Побудувати нові лінії метро та автобусні маршрути',
  [ShowcaseStrings.Plur_Cand3_Name]: 'Програма доступного житла',
  [ShowcaseStrings.Plur_Cand3_Desc]:
    'Субсидувати житло для малозабезпечених сімей',

  // Approval Demo
  [ShowcaseStrings.Appr_IntroTitle]: 'Велике рішення TechCorp!',
  [ShowcaseStrings.Appr_IntroStory]:
    '📢 Екстрена нарада команди: «Нам потрібно обрати технологічний стек на наступні 5 років, але в кожного своя думка!»',
  [ShowcaseStrings.Appr_IntroApprovalVoting]:
    'CTO має блискучу ідею: Голосування схваленням. Замість того, щоб сперечатися за ОДНУ мову, кожен може проголосувати за ВСІ мови, з якими він хотів би працювати.',
  [ShowcaseStrings.Appr_IntroStakes]:
    '🤔 Фішка: Ви можете схвалити скільки завгодно — багато чи мало. Любите TypeScript І Python? Голосуйте за обидва! Довіряєте лише Rust? Це ваш голос!',
  [ShowcaseStrings.Appr_IntroWinner]:
    '🎯 Переможець: Мова, яка отримає найбільше схвалень, стане основною мовою команди.',
  [ShowcaseStrings.Appr_IntroChallenge]:
    'Саме так ООН обирає Генерального секретаря. Без розщеплення голосів, без стратегічних ігор — лише чесні вподобання!',
  [ShowcaseStrings.Appr_StartBtn]: '🚀 Голосуємо!',
  [ShowcaseStrings.Appr_DemoTitle]:
    '✅ Голосування схваленням - Вибір стеку TechCorp',
  [ShowcaseStrings.Appr_DemoTagline]:
    '👍 Голосуйте за ВСІ мови, які схвалюєте. Найбільше схвалень перемагає!',
  [ShowcaseStrings.Appr_CandidatesTitle]: 'Улюблені мови програмування команди',
  [ShowcaseStrings.Appr_Cand1_Desc]: 'Типобезпечна надмножина JavaScript',
  [ShowcaseStrings.Appr_Cand2_Desc]: 'Універсальна скриптова мова',
  [ShowcaseStrings.Appr_Cand3_Desc]: "Системна мова з безпекою пам'яті",
  [ShowcaseStrings.Appr_Cand4_Desc]: 'Швидка мова з підтримкою конкурентності',
  [ShowcaseStrings.Appr_Cand5_Desc]: 'Корпоративна платформа',
  [ShowcaseStrings.Appr_VotersTitle]:
    'Голосування ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Appr_SubmitBtn]: 'Надіслати ({COUNT} обрано)',
  [ShowcaseStrings.Appr_TallyBtn]: 'Підрахувати голоси та показати результати',
  [ShowcaseStrings.Appr_VotedBadge]: '✓ Проголосував',

  // Borda Demo
  [ShowcaseStrings.Borda_IntroTitle]: 'Вибір міста-господаря Олімпіади!',
  [ShowcaseStrings.Borda_IntroStory]:
    "🌍 Зал засідань МОК: П'ять країн мають обрати наступне місто-господар Олімпійських ігор. Але в кожного свої вподобання!",
  [ShowcaseStrings.Borda_IntroPoints]:
    '🎯 Метод Борда нараховує бали за рейтингом: 1-е місце = 3 бали, 2-е = 2 бали, 3-є = 1 бал.',
  [ShowcaseStrings.Borda_IntroChallenge]:
    '💡 Це винагороджує консенсусні варіанти, а не поляризуючі. Місто з найбільшою кількістю балів перемагає!',
  [ShowcaseStrings.Borda_StartBtn]: '🏅 Почати голосування!',
  [ShowcaseStrings.Borda_DemoTitle]:
    '🏆 Метод Борда - Вибір господаря Олімпіади',
  [ShowcaseStrings.Borda_DemoTagline]:
    '📊 Ранжуйте всі міста. Бали = консенсус!',
  [ShowcaseStrings.Borda_CandidatesTitle]: 'Міста-кандидати',
  [ShowcaseStrings.Borda_Cand1_Desc]: 'Місто Світла',
  [ShowcaseStrings.Borda_Cand2_Desc]: 'Країна Сонця, що сходить',
  [ShowcaseStrings.Borda_Cand3_Desc]: 'Місто Ангелів',
  [ShowcaseStrings.Borda_VotersTitle]:
    'Члени МОК ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Borda_RankedBadge]: '✓ Ранжовано!',
  [ShowcaseStrings.Borda_TallyBtn]: '🏅 Підрахувати бали!',
  [ShowcaseStrings.Borda_ResultsTitle]:
    '🎉 Місто-господар Олімпіади оголошено!',
  [ShowcaseStrings.Borda_PointsTemplate]: '{COUNT} балів',
  [ShowcaseStrings.Borda_NewVoteBtn]: 'Нове голосування',

  // Message Passing Demo
  [ShowcaseStrings.Msg_Title]: '💬 Демо передачі повідомлень BrightChain',
  [ShowcaseStrings.Msg_Subtitle]:
    'Надсилайте повідомлення, збережені як CBL блоки у soup!',
  [ShowcaseStrings.Msg_Initializing]: 'Ініціалізація...',
  [ShowcaseStrings.Msg_SendTitle]: 'Надіслати повідомлення',
  [ShowcaseStrings.Msg_FromLabel]: 'Від:',
  [ShowcaseStrings.Msg_ToLabel]: 'Кому:',
  [ShowcaseStrings.Msg_Placeholder]: 'Введіть повідомлення...',
  [ShowcaseStrings.Msg_SendBtn]: '📤 Надіслати повідомлення',
  [ShowcaseStrings.Msg_ListTitleTemplate]: '📬 Повідомлення ({COUNT})',
  [ShowcaseStrings.Msg_NoMessages]:
    'Повідомлень ще немає. Надішліть перше повідомлення! ✨',
  [ShowcaseStrings.Msg_From]: 'Від:',
  [ShowcaseStrings.Msg_To]: 'Кому:',
  [ShowcaseStrings.Msg_Message]: 'Повідомлення:',
  [ShowcaseStrings.Msg_RetrieveBtn]: '📥 Отримати з Soup',
  [ShowcaseStrings.Msg_SendFailed]: 'Не вдалося надіслати повідомлення:',
  [ShowcaseStrings.Msg_RetrieveFailed]: 'Не вдалося отримати повідомлення:',
  [ShowcaseStrings.Msg_ContentTemplate]: 'Вміст повідомлення: {CONTENT}',

  // Ledger Demo
  [ShowcaseStrings.Ledger_Title]: '⛓️ Блокчейн-реєстр',
  [ShowcaseStrings.Ledger_Subtitle]:
    "Реєстр лише для додавання, криптографічно зв'язаний ланцюгом, з цифровим підписом та рольовим управлінням. Додавайте записи, керуйте підписантами та перевіряйте ланцюг.",
  [ShowcaseStrings.Ledger_Initializing]:
    'Генерація пар ключів SECP256k1 для підписантів…',
  [ShowcaseStrings.Ledger_Entries]: 'Записи',
  [ShowcaseStrings.Ledger_ActiveSigners]: 'Активні підписанти',
  [ShowcaseStrings.Ledger_Admins]: 'Адміністратори',
  [ShowcaseStrings.Ledger_BrightTrust]: 'Кворум',
  [ShowcaseStrings.Ledger_ValidateChain]: '🔍 Перевірити ланцюг',
  [ShowcaseStrings.Ledger_Reset]: '🔄 Скинути',
  [ShowcaseStrings.Ledger_ActiveSigner]: '🔑 Активний підписант',
  [ShowcaseStrings.Ledger_AppendEntry]: '📝 Додати запис',
  [ShowcaseStrings.Ledger_PayloadLabel]: 'Дані (текст)',
  [ShowcaseStrings.Ledger_PayloadPlaceholder]: 'Введіть дані…',
  [ShowcaseStrings.Ledger_AppendBtn]: 'Додати до ланцюга',
  [ShowcaseStrings.Ledger_AuthorizedSigners]: '👥 Авторизовані підписанти',
  [ShowcaseStrings.Ledger_Suspend]: 'Призупинити',
  [ShowcaseStrings.Ledger_Reactivate]: 'Відновити',
  [ShowcaseStrings.Ledger_ToAdmin]: '→ Адмін',
  [ShowcaseStrings.Ledger_ToWriter]: '→ Записувач',
  [ShowcaseStrings.Ledger_Retire]: 'Вивести',
  [ShowcaseStrings.Ledger_NewSignerPlaceholder]: "Ім'я нового підписанта",
  [ShowcaseStrings.Ledger_AddSigner]: '+ Додати підписанта',
  [ShowcaseStrings.Ledger_EventLog]: '📋 Журнал подій',
  [ShowcaseStrings.Ledger_Chain]: '⛓️ Ланцюг',
  [ShowcaseStrings.Ledger_Genesis]: '🌱 Генезис',
  [ShowcaseStrings.Ledger_Governance]: '⚖️ Управління',
  [ShowcaseStrings.Ledger_Data]: '📄 Дані',
  [ShowcaseStrings.Ledger_EntryDetails]: 'Деталі запису #{SEQ}',
  [ShowcaseStrings.Ledger_Type]: 'Тип',
  [ShowcaseStrings.Ledger_Sequence]: 'Послідовність',
  [ShowcaseStrings.Ledger_Timestamp]: 'Мітка часу',
  [ShowcaseStrings.Ledger_EntryHash]: 'Хеш запису',
  [ShowcaseStrings.Ledger_PreviousHash]: 'Попередній хеш',
  [ShowcaseStrings.Ledger_NullGenesis]: 'null (генезис)',
  [ShowcaseStrings.Ledger_Signer]: 'Підписант',
  [ShowcaseStrings.Ledger_SignerKey]: 'Ключ підписанта',
  [ShowcaseStrings.Ledger_Signature]: 'Підпис',
  [ShowcaseStrings.Ledger_PayloadSize]: 'Розмір даних',
  [ShowcaseStrings.Ledger_Payload]: 'Дані',
  [ShowcaseStrings.Ledger_BytesTemplate]: '{COUNT} байтів',

  // SkipLink
  [ShowcaseStrings.SkipLink_Text]: 'Перейти до основного вмісту',

  // ScrollIndicator
  [ShowcaseStrings.Scroll_Explore]: 'Прокрутіть для перегляду',

  // CompatibilityWarning
  [ShowcaseStrings.Compat_Title]: '⚠️ Повідомлення про сумісність браузера',
  [ShowcaseStrings.Compat_DismissAriaLabel]: 'Закрити попередження',
  [ShowcaseStrings.Compat_BrowserNotice]:
    'Ваш браузер ({BROWSER} {VERSION}) може не підтримувати всі функції цієї демонстрації.',
  [ShowcaseStrings.Compat_CriticalIssues]: 'Критичні проблеми:',
  [ShowcaseStrings.Compat_Warnings]: 'Попередження:',
  [ShowcaseStrings.Compat_RecommendedActions]: 'Рекомендовані дії:',
  [ShowcaseStrings.Compat_Recommendation]:
    'Для найкращого досвіду, будь ласка, використовуйте останню версію Chrome, Firefox, Safari або Edge.',

  // DebugPanel
  [ShowcaseStrings.Debug_Title]: 'Панель налагодження',
  [ShowcaseStrings.Debug_OpenTitle]: 'Відкрити панель налагодження',
  [ShowcaseStrings.Debug_CloseTitle]: 'Закрити панель налагодження',
  [ShowcaseStrings.Debug_BlockStore]: 'Сховище блоків',
  [ShowcaseStrings.Debug_SessionId]: 'ID сесії:',
  [ShowcaseStrings.Debug_BlockCount]: 'Кількість блоків:',
  [ShowcaseStrings.Debug_TotalSize]: 'Загальний розмір:',
  [ShowcaseStrings.Debug_LastOperation]: 'Остання операція:',
  [ShowcaseStrings.Debug_BlockIdsTemplate]: 'ID блоків ({COUNT})',
  [ShowcaseStrings.Debug_ClearSession]: 'Очистити сесію',
  [ShowcaseStrings.Debug_AnimationState]: 'Стан анімації',
  [ShowcaseStrings.Debug_Playing]: 'Відтворення',
  [ShowcaseStrings.Debug_Paused]: 'Пауза',
  [ShowcaseStrings.Debug_StatusPlaying]: '▶️ Відтворення',
  [ShowcaseStrings.Debug_StatusPaused]: '⏸️ Пауза',
  [ShowcaseStrings.Debug_Speed]: 'Швидкість:',
  [ShowcaseStrings.Debug_Frame]: 'Кадр:',
  [ShowcaseStrings.Debug_Sequence]: 'Послідовність:',
  [ShowcaseStrings.Debug_Progress]: 'Прогрес:',
  [ShowcaseStrings.Debug_Performance]: 'Продуктивність',
  [ShowcaseStrings.Debug_FrameRate]: 'Частота кадрів:',
  [ShowcaseStrings.Debug_FrameTime]: 'Час кадру:',
  [ShowcaseStrings.Debug_DroppedFrames]: 'Пропущені кадри:',
  [ShowcaseStrings.Debug_Memory]: "Пам'ять:",
  [ShowcaseStrings.Debug_Sequences]: 'Послідовності:',
  [ShowcaseStrings.Debug_Errors]: 'Помилки:',

  // ReconstructionAnimation
  [ShowcaseStrings.Recon_Title]: '🔄 Анімація реконструкції файлу',
  [ShowcaseStrings.Recon_Subtitle]:
    'Спостерігайте, як блоки збираються назад у ваш оригінальний файл',
  [ShowcaseStrings.Recon_Step_ProcessCBL]: 'Обробка CBL',
  [ShowcaseStrings.Recon_Step_ProcessCBL_Desc]:
    'Читання метаданих списку складових блоків',
  [ShowcaseStrings.Recon_Step_SelectBlocks]: 'Вибір блоків',
  [ShowcaseStrings.Recon_Step_SelectBlocks_Desc]:
    'Визначення необхідних блоків із soup',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks]: 'Отримання блоків',
  [ShowcaseStrings.Recon_Step_RetrieveBlocks_Desc]: 'Збір блоків зі сховища',
  [ShowcaseStrings.Recon_Step_ValidateChecksums]: 'Перевірка контрольних сум',
  [ShowcaseStrings.Recon_Step_ValidateChecksums_Desc]:
    'Верифікація цілісності блоків',
  [ShowcaseStrings.Recon_Step_Reassemble]: 'Збірка файлу',
  [ShowcaseStrings.Recon_Step_Reassemble_Desc]:
    "Об'єднання блоків та видалення доповнення",
  [ShowcaseStrings.Recon_Step_DownloadReady]: 'Готово до завантаження',
  [ShowcaseStrings.Recon_Step_DownloadReady_Desc]:
    'Реконструкція файлу завершена',
  [ShowcaseStrings.Recon_CBLTitle]: '📋 Список складових блоків',
  [ShowcaseStrings.Recon_CBLSubtitle]: 'Посилання на блоки, витягнуті з CBL',
  [ShowcaseStrings.Recon_BlocksTemplate]: '🥫 Блоки ({COUNT})',
  [ShowcaseStrings.Recon_BlocksSubtitle]:
    'Блоки, що отримуються та перевіряються',
  [ShowcaseStrings.Recon_ReassemblyTitle]: '🔧 Збірка файлу',
  [ShowcaseStrings.Recon_ReassemblySubtitle]:
    "Об'єднання блоків та видалення доповнення",
  [ShowcaseStrings.Recon_Complete]: 'Реконструкція файлу завершена!',
  [ShowcaseStrings.Recon_ReadyForDownload]: 'Ваш файл готовий до завантаження',
  [ShowcaseStrings.Recon_FileName]: "Ім'я файлу:",
  [ShowcaseStrings.Recon_Size]: 'Розмір:',
  [ShowcaseStrings.Recon_Blocks]: 'Блоки:',
  [ShowcaseStrings.Recon_WhatsHappening]: 'Що зараз відбувається',
  [ShowcaseStrings.Recon_TechDetails]: 'Технічні деталі:',
  [ShowcaseStrings.Recon_CBLContainsRefs]: 'CBL містить посилання на всі блоки',
  [ShowcaseStrings.Recon_BlockCountTemplate]: 'Кількість блоків: {COUNT}',
  [ShowcaseStrings.Recon_OriginalSizeTemplate]:
    'Оригінальний розмір файлу: {SIZE} байтів',
  [ShowcaseStrings.Recon_BlockSelection]: 'Вибір блоків:',
  [ShowcaseStrings.Recon_IdentifyingBlocks]: 'Визначення блоків у soup',
  [ShowcaseStrings.Recon_SelectedByChecksums]:
    'Блоки вибираються за їхніми контрольними сумами',
  [ShowcaseStrings.Recon_AllBlocksRequired]:
    'Усі блоки повинні бути присутні для реконструкції',
  [ShowcaseStrings.Recon_ChecksumValidation]: 'Перевірка контрольних сум:',
  [ShowcaseStrings.Recon_EnsuresNotCorrupted]:
    'Гарантує, що блоки не були пошкоджені',
  [ShowcaseStrings.Recon_ComparesChecksums]:
    'Порівнює збережену контрольну суму з обчисленою',
  [ShowcaseStrings.Recon_InvalidBlocksFail]:
    'Недійсні блоки призведуть до невдачі реконструкції',
  [ShowcaseStrings.Recon_FileReassembly]: 'Збірка файлу:',
  [ShowcaseStrings.Recon_CombinedInOrder]:
    "Блоки об'єднуються у правильному порядку",
  [ShowcaseStrings.Recon_PaddingRemoved]: 'Випадкове доповнення видаляється',
  [ShowcaseStrings.Recon_ReconstructedByteForByte]:
    'Оригінальний файл реконструюється байт за байтом',

  // AnimatedBrightChainDemo
  [ShowcaseStrings.Anim_Title]: 'Анімована демонстрація BrightChain Block Soup',
  [ShowcaseStrings.Anim_Subtitle]:
    'Відчуйте процес BrightChain з покроковими анімаціями та навчальним контентом!',
  [ShowcaseStrings.Anim_Initializing]:
    'Ініціалізація анімованої демонстрації BrightChain...',
  [ShowcaseStrings.Anim_PauseAnimation]: 'Призупинити анімацію',
  [ShowcaseStrings.Anim_PlayAnimation]: 'Відтворити анімацію',
  [ShowcaseStrings.Anim_ResetAnimation]: 'Скинути анімацію',
  [ShowcaseStrings.Anim_SpeedTemplate]: 'Швидкість: {SPEED}x',
  [ShowcaseStrings.Anim_PerfMonitor]: '🔧 Монітор продуктивності',
  [ShowcaseStrings.Anim_FrameRate]: 'Частота кадрів:',
  [ShowcaseStrings.Anim_FrameTime]: 'Час кадру:',
  [ShowcaseStrings.Anim_DroppedFrames]: 'Пропущені кадри:',
  [ShowcaseStrings.Anim_Memory]: "Пам'ять:",
  [ShowcaseStrings.Anim_Sequences]: 'Послідовності:',
  [ShowcaseStrings.Anim_Errors]: 'Помилки:',
  [ShowcaseStrings.Anim_DropFilesOrClick]:
    'Перетягніть файли сюди або натисніть для завантаження',
  [ShowcaseStrings.Anim_ChooseFiles]: 'Обрати файли',
  [ShowcaseStrings.Anim_StorageTemplate]: 'Сховище Block Soup ({COUNT} файлів)',
  [ShowcaseStrings.Anim_NoFilesYet]:
    'Файлів ще немає. Завантажте файли, щоб побачити анімовану магію! ✨',
  [ShowcaseStrings.Anim_RetrieveFile]: 'Отримати файл',
  [ShowcaseStrings.Anim_DownloadCBL]: 'Завантажити CBL',
  [ShowcaseStrings.Anim_SizeTemplate]:
    'Розмір: {SIZE} байтів | Блоки: {BLOCKS}',
  [ShowcaseStrings.Anim_EncodingAnimation]: 'Анімація кодування',
  [ShowcaseStrings.Anim_ReconstructionAnimation]: 'Анімація реконструкції',
  [ShowcaseStrings.Anim_CurrentStep]: 'Поточний крок',
  [ShowcaseStrings.Anim_DurationTemplate]: 'Тривалість: {DURATION}мс',
  [ShowcaseStrings.Anim_BlockDetails]: 'Деталі блоку',
  [ShowcaseStrings.Anim_Index]: 'Індекс:',
  [ShowcaseStrings.Anim_Size]: 'Розмір:',
  [ShowcaseStrings.Anim_Id]: 'ID:',
  [ShowcaseStrings.Anim_Stats]: 'Статистика анімації',
  [ShowcaseStrings.Anim_TotalFiles]: 'Всього файлів:',
  [ShowcaseStrings.Anim_TotalBlocks]: 'Всього блоків:',
  [ShowcaseStrings.Anim_AnimationSpeed]: 'Швидкість анімації:',
  [ShowcaseStrings.Anim_Session]: 'Сесія:',
  [ShowcaseStrings.Anim_DataClearsOnRefresh]:
    '(Дані очищуються при оновленні сторінки)',
  [ShowcaseStrings.Anim_WhatsHappening]: 'Що відбувається:',
  [ShowcaseStrings.Anim_Duration]: 'Тривалість:',

  // BrightChainSoupDemo
  [ShowcaseStrings.Soup_Title]: 'Демонстрація BrightChain',
  [ShowcaseStrings.Soup_Subtitle]:
    'Зберігайте файли та повідомлення як блоки в децентралізованому block soup. Все стає кольоровими консервними банками!',
  [ShowcaseStrings.Soup_Initializing]:
    'Ініціалізація SessionIsolatedBrightChain...',
  [ShowcaseStrings.Soup_StoreInSoup]: 'Зберегти дані в Block Soup',
  [ShowcaseStrings.Soup_StoreFiles]: '📁 Зберегти файли',
  [ShowcaseStrings.Soup_DropFilesOrClick]:
    'Перетягніть файли сюди або натисніть для завантаження',
  [ShowcaseStrings.Soup_ChooseFiles]: 'Обрати файли',
  [ShowcaseStrings.Soup_StoreCBLWithMagnet]:
    '🔐 Зберегти CBL у soup з magnet URL',
  [ShowcaseStrings.Soup_StoreCBLInfo]:
    'Зберігає CBL у block soup за допомогою XOR-відбілювання та генерує magnet URL для спільного доступу. Без цього ви отримаєте файл CBL безпосередньо.',
  [ShowcaseStrings.Soup_StoreMessages]: '💬 Зберегти повідомлення',
  [ShowcaseStrings.Soup_From]: 'Від:',
  [ShowcaseStrings.Soup_To]: 'Кому:',
  [ShowcaseStrings.Soup_Message]: 'Повідомлення:',
  [ShowcaseStrings.Soup_TypeMessage]: 'Введіть повідомлення...',
  [ShowcaseStrings.Soup_SendToSoup]: '📤 Надіслати повідомлення в Soup',
  [ShowcaseStrings.Soup_CBLStoredInSoup]: '🔐 CBL збережено в Soup',
  [ShowcaseStrings.Soup_SuperCBLUsed]: '📊 Використано Super CBL',
  [ShowcaseStrings.Soup_HierarchyDepth]: 'Глибина ієрархії:',
  [ShowcaseStrings.Soup_SubCBLs]: 'Під-CBL:',
  [ShowcaseStrings.Soup_LargeFileSplit]:
    'Великий файл розділено на ієрархічну структуру',
  [ShowcaseStrings.Soup_CBLStoredInfo]:
    'Ваш CBL збережено в block soup як два XOR-компоненти. Використовуйте цей magnet URL для отримання файлу:',
  [ShowcaseStrings.Soup_Component1]: 'Компонент 1:',
  [ShowcaseStrings.Soup_Component2]: 'Компонент 2:',
  [ShowcaseStrings.Soup_Copy]: '📋 Копіювати',
  [ShowcaseStrings.Soup_RetrieveFromSoup]: 'Отримати з Soup',
  [ShowcaseStrings.Soup_UploadCBLFile]: 'Завантажити файл CBL',
  [ShowcaseStrings.Soup_UseMagnetURL]: 'Використати Magnet URL',
  [ShowcaseStrings.Soup_CBLUploadInfo]:
    'Завантажте файл .cbl для реконструкції оригінального файлу з block soup. Блоки повинні вже бути в soup для успішної реконструкції.',
  [ShowcaseStrings.Soup_ChooseCBLFile]: 'Обрати файл CBL',
  [ShowcaseStrings.Soup_MagnetURLInfo]:
    'Вставте magnet URL для отримання файлу. Magnet URL посилається на відбілені компоненти CBL, збережені в soup.',
  [ShowcaseStrings.Soup_MagnetPlaceholder]:
    'magnet:?xt=urn:brightchain:cbl&bs=...&b1=...&b2=...',
  [ShowcaseStrings.Soup_Load]: 'Завантажити',
  [ShowcaseStrings.Soup_MessagePassing]: 'Передача повідомлень',
  [ShowcaseStrings.Soup_HideMessagePanel]: 'Сховати панель повідомлень',
  [ShowcaseStrings.Soup_ShowMessagePanel]: 'Показати панель повідомлень',
  [ShowcaseStrings.Soup_SendMessage]: 'Надіслати повідомлення',
  [ShowcaseStrings.Soup_MessagesTemplate]: '📬 Повідомлення ({COUNT})',
  [ShowcaseStrings.Soup_NoMessagesYet]:
    'Повідомлень ще немає. Надішліть перше повідомлення! ✨',
  [ShowcaseStrings.Soup_RetrieveFromSoupBtn]: '📥 Отримати з Soup',
  [ShowcaseStrings.Soup_StoredMessages]: 'Збережені повідомлення',
  [ShowcaseStrings.Soup_StoredFilesAndMessages]:
    'Збережені файли та повідомлення',
  [ShowcaseStrings.Soup_RemoveFromList]: 'Видалити зі списку',
  [ShowcaseStrings.Soup_RemoveConfirmTemplate]:
    'Видалити "{NAME}" зі списку? (Блоки залишаться в soup)',
  [ShowcaseStrings.Soup_RetrieveFile]: '📥 Отримати файл',
  [ShowcaseStrings.Soup_DownloadCBL]: 'Завантажити CBL',
  [ShowcaseStrings.Soup_RetrieveMessage]: '📥 Отримати повідомлення',
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 Magnet URL',
  [ShowcaseStrings.Soup_WhitenedCBLInfo]:
    'Відбілений CBL magnet URL (використовуйте "Використати Magnet URL" для отримання)',
  [ShowcaseStrings.Soup_ProcessingSteps]: 'Кроки обробки',
  [ShowcaseStrings.Soup_CBLStorageSteps]: 'Кроки збереження CBL',
  [ShowcaseStrings.Soup_BlockDetails]: 'Деталі блоку',
  [ShowcaseStrings.Soup_Index]: 'Індекс:',
  [ShowcaseStrings.Soup_Size]: 'Розмір:',
  [ShowcaseStrings.Soup_Id]: 'ID:',
  [ShowcaseStrings.Soup_Color]: 'Колір:',
  [ShowcaseStrings.Soup_SoupStats]: 'Статистика Soup',
  [ShowcaseStrings.Soup_TotalFiles]: 'Всього файлів:',
  [ShowcaseStrings.Soup_TotalBlocks]: 'Всього блоків:',
  [ShowcaseStrings.Soup_BlockSize]: 'Розмір блоку:',
  [ShowcaseStrings.Soup_SessionDebug]: 'Налагодження сесії',
  [ShowcaseStrings.Soup_SessionId]: 'ID сесії:',
  [ShowcaseStrings.Soup_BlocksInMemory]: "Блоки в пам'яті:",
  [ShowcaseStrings.Soup_BlockIds]: 'ID блоків:',
  [ShowcaseStrings.Soup_ClearSession]: 'Очистити сесію',
  [ShowcaseStrings.Soup_Session]: 'Сесія:',
  [ShowcaseStrings.Soup_DataClearsOnRefresh]:
    '(Дані очищуються при оновленні сторінки)',

  // EnhancedSoupVisualization
  [ShowcaseStrings.ESV_SelectFile]: 'Виберіть файл, щоб підсвітити його блоки:',
  [ShowcaseStrings.ESV_BlockSoup]: 'Блок-суп',
  [ShowcaseStrings.ESV_ShowingConnections]: "Показ з'єднань для:",
  [ShowcaseStrings.ESV_EmptySoup]: 'Порожній суп',
  [ShowcaseStrings.ESV_EmptySoupHint]:
    'Завантажте файли, щоб побачити, як вони перетворюються на кольорові банки супу!',
  [ShowcaseStrings.ESV_FileStats]: '{blocks} блоків • {size} байтів',

  // Score Voting Demo
  [ShowcaseStrings.Score_IntroTitle]: 'Вечір нагород кінокритиків!',
  [ShowcaseStrings.Score_IntroStoryAcademy]:
    'Три фільми номіновані на найкращий фільм. Критики повинні оцінити кожен незалежно.',
  [ShowcaseStrings.Score_IntroStoryScoring]:
    'Оцініть кожен фільм від 0 до 10. Подобається один, не подобається інший? Оцінюйте чесно! Найвищий середній бал перемагає.',
  [ShowcaseStrings.Score_IntroChallenge]:
    'На відміну від рейтингу, ви можете дати високі оцінки кільком фільмам, якщо вони всі чудові!',
  [ShowcaseStrings.Score_StartBtn]: '🎬 Почати оцінювання!',
  [ShowcaseStrings.Score_DemoTitle]:
    '⭐ Голосування за балами - Найкращий фільм',
  [ShowcaseStrings.Score_DemoTagline]:
    '🎬 Оцініть кожен фільм від 0 до 10. Найвищий середній бал перемагає!',
  [ShowcaseStrings.Score_NominatedFilms]: 'Номіновані фільми',
  [ShowcaseStrings.Score_Genre_SciFi]: 'Науково-фантастичний епос',
  [ShowcaseStrings.Score_Genre_Romance]: 'Романтична драма',
  [ShowcaseStrings.Score_Genre_Thriller]: 'Технологічний трилер',
  [ShowcaseStrings.Score_VoterRatingsTemplate]: '🎭 Оцінки {VOTER}',
  [ShowcaseStrings.Score_Label_Terrible]: '0 - Жахливо',
  [ShowcaseStrings.Score_Label_Average]: '5 - Середньо',
  [ShowcaseStrings.Score_Label_Masterpiece]: '10 - Шедевр',
  [ShowcaseStrings.Score_SubmitTemplate]:
    'Надіслати оцінки ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Score_Encrypting]: '🔐 Шифрування...',
  [ShowcaseStrings.Score_EncryptingVote]: 'Шифрування голосу...',
  [ShowcaseStrings.Score_CriticsRatedTemplate]:
    '📋 Критики, які оцінили: {COUNT}/{TOTAL}',
  [ShowcaseStrings.Score_TallyBtn]: '🏆 Обчислити середні!',
  [ShowcaseStrings.Score_ResultsTitle]: '🎉 І переможець...',
  [ShowcaseStrings.Score_TallyTitle]: '📊 Процес обчислення середніх балів',
  [ShowcaseStrings.Score_TallyExplain]:
    'Бали кожного фільму були додані та поділені на {COUNT} критиків:',
  [ShowcaseStrings.Score_AverageTemplate]: '{AVG}/10 середній бал',
  [ShowcaseStrings.Score_ResetBtn]: 'Нова церемонія',

  // Weighted Voting Demo
  [ShowcaseStrings.Weight_IntroTitle]: 'Драма в залі засідань StartupCo!',
  [ShowcaseStrings.Weight_IntroStoryScene]:
    'Це щорічні збори акціонерів. Компанія коштує $100M і кожен хоче мати голос у тому, що буде далі.',
  [ShowcaseStrings.Weight_IntroStoryTwist]:
    'Не всі голоси рівні. Венчурний фонд володіє 45% акцій. Засновники володіють 30% і 15%. Працівники та бізнес-ангели володіють рештою.',
  [ShowcaseStrings.Weight_StakeExpand]:
    'Величезний потенціал зростання, але ризиковано',
  [ShowcaseStrings.Weight_StakeAcquire]: 'Усунути конкуренцію, але дорого',
  [ShowcaseStrings.Weight_StakeIPO]:
    'IPO означає ліквідність, але й ретельну перевірку',
  [ShowcaseStrings.Weight_IntroChallenge]:
    'Кожен голос зважується за кількістю акцій. Голос венчурного фонду важить у 18 разів більше, ніж голос бізнес-ангела. Це корпоративна демократія!',
  [ShowcaseStrings.Weight_StartBtn]: '📄 Увійти до зали засідань',
  [ShowcaseStrings.Weight_DemoTitle]:
    '⚖️ Зважене голосування - Засідання правління StartupCo',
  [ShowcaseStrings.Weight_DemoTagline]:
    '💰 Ваші акції = Ваша сила голосу. Ласкаво просимо до корпоративного управління!',
  [ShowcaseStrings.Weight_ProposalsTitle]: 'Стратегічні пропозиції',
  [ShowcaseStrings.Weight_Proposal1_Desc]:
    'Відкрити офіси в Токіо та Сінгапурі',
  [ShowcaseStrings.Weight_Proposal2_Desc]: 'Злиття з TechStartup Inc.',
  [ShowcaseStrings.Weight_Proposal3_Desc]:
    'Вийти на NASDAQ наступного кварталу',
  [ShowcaseStrings.Weight_ShareholdersTemplate]:
    'Акціонери ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Weight_ShareInfoTemplate]: '{SHARES} акцій ({PERCENT}%)',
  [ShowcaseStrings.Weight_VoteCastTemplate]: '✓ Проголосував за {EMOJI} {NAME}',
  [ShowcaseStrings.Weight_TallyBtn]: 'Підрахувати зважені голоси',
  [ShowcaseStrings.Weight_ResultsTitle]: '🏆 Результати (за вагою акцій)',
  [ShowcaseStrings.Weight_SharesTemplate]: '{TALLY} акцій ({PERCENT}%)',
  [ShowcaseStrings.Weight_WinnerNoteTemplate]:
    '💡 Переможна пропозиція отримала {PERCENT}% від загальної кількості акцій',
  [ShowcaseStrings.Weight_ResetBtn]: 'Нове голосування',

  // Yes/No Demo
  [ShowcaseStrings.YN_IntroTitle]: 'Національний референдум!',
  [ShowcaseStrings.YN_IntroQuestion]:
    '🏛️ Питання: «Чи повинна наша країна запровадити 4-денний робочий тиждень?»',
  [ShowcaseStrings.YN_IntroStory]:
    '📊 Референдум Так/Ні: Найпростіша форма демократії. Одне питання, два варіанти, більшість вирішує.',
  [ShowcaseStrings.YN_IntroYesCampaign]:
    '✅ Кампанія ТАК: Кращий баланс роботи та життя, підвищена продуктивність, щасливіші громадяни!',
  [ShowcaseStrings.YN_IntroNoCampaign]:
    '❌ Кампанія НІ: Економічний ризик, порушення бізнесу, неперевірена політика!',
  [ShowcaseStrings.YN_IntroChallenge]:
    '🗳️ Використовується для Брекзіту, незалежності Шотландії та конституційних змін по всьому світу.',
  [ShowcaseStrings.YN_StartBtn]: '🗳️ Голосуйте зараз!',
  [ShowcaseStrings.YN_DemoTitle]:
    '👍 Референдум Так/Ні - 4-денний робочий тиждень',
  [ShowcaseStrings.YN_DemoTagline]:
    '🗳️ Одне питання. Два варіанти. Демократія вирішує.',
  [ShowcaseStrings.YN_ReferendumQuestion]:
    'Чи повинні ми запровадити 4-денний робочий тиждень?',
  [ShowcaseStrings.YN_CitizensVotingTemplate]:
    'Громадяни голосують ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.YN_VotedYes]: '✓ Проголосував 👍 ТАК',
  [ShowcaseStrings.YN_VotedNo]: '✓ Проголосував 👎 НІ',
  [ShowcaseStrings.YN_BtnYes]: '👍 ТАК',
  [ShowcaseStrings.YN_BtnNo]: '👎 НІ',
  [ShowcaseStrings.YN_TallyBtn]: '📊 Підрахувати голоси!',
  [ShowcaseStrings.YN_ResultsTitle]: '🎉 Результати референдуму!',
  [ShowcaseStrings.YN_LabelYes]: 'ТАК',
  [ShowcaseStrings.YN_LabelNo]: 'НІ',
  [ShowcaseStrings.YN_MotionPasses]: '✅ Пропозицію ПРИЙНЯТО!',
  [ShowcaseStrings.YN_MotionFails]: '❌ Пропозицію ВІДХИЛЕНО!',
  [ShowcaseStrings.YN_OutcomePass]:
    'Народ висловився: Ми запроваджуємо 4-денний робочий тиждень!',
  [ShowcaseStrings.YN_OutcomeFail]:
    'Народ висловився: Ми зберігаємо 5-денний робочий тиждень.',
  [ShowcaseStrings.YN_ResetBtn]: 'Новий референдум',

  // Yes/No/Abstain Demo
  [ShowcaseStrings.YNA_IntroTitle]: 'Резолюція Ради Безпеки ООН!',
  [ShowcaseStrings.YNA_IntroResolution]:
    '🌍 Резолюція: «Чи повинна ООН накласти санкції на Країну X за порушення прав людини?»',
  [ShowcaseStrings.YNA_IntroStory]:
    '🤷 Так/Ні/Утримання: Іноді ви не готові вирішувати. Утримання не враховуються в загальному підрахунку, але фіксуються.',
  [ShowcaseStrings.YNA_IntroYes]: '✅ ТАК: Негайно накласти санкції',
  [ShowcaseStrings.YNA_IntroNo]: '❌ НІ: Відхилити резолюцію',
  [ShowcaseStrings.YNA_IntroAbstain]:
    '🤷 УТРИМАННЯ: Нейтрально - не хоче обирати сторону',
  [ShowcaseStrings.YNA_IntroChallenge]:
    '🏛️ Використовується в голосуваннях ООН, парламентських процедурах та засіданнях рад по всьому світу.',
  [ShowcaseStrings.YNA_StartBtn]: '🌎 Голосувати!',
  [ShowcaseStrings.YNA_DemoTitle]: '🤷 Так/Ні/Утримання - Резолюція ООН',
  [ShowcaseStrings.YNA_DemoTagline]:
    '🌍 Три варіанти: Підтримати, Заперечити або Залишитися нейтральним',
  [ShowcaseStrings.YNA_ReferendumQuestion]: 'Накласти санкції на Країну X?',
  [ShowcaseStrings.YNA_CouncilVotingTemplate]:
    'Члени Ради Безпеки ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.YNA_VotedYes]: '✓ 👍 ТАК',
  [ShowcaseStrings.YNA_VotedNo]: '✓ 👎 НІ',
  [ShowcaseStrings.YNA_VotedAbstain]: '✓ 🤷 УТРИМАННЯ',
  [ShowcaseStrings.YNA_BtnYes]: '👍 ТАК',
  [ShowcaseStrings.YNA_BtnNo]: '👎 НІ',
  [ShowcaseStrings.YNA_BtnAbstain]: '🤷 УТРИМАННЯ',
  [ShowcaseStrings.YNA_TallyBtn]: '📊 Підрахунок резолюції!',
  [ShowcaseStrings.YNA_ResultsTitle]: '🌎 Результати резолюції!',
  [ShowcaseStrings.YNA_TallyTitle]: '📊 Підрахунок голосів',
  [ShowcaseStrings.YNA_TallyExplain]:
    'Утримання фіксуються, але не враховуються в рішенні. Переможцю потрібна більшість голосів ТАК/НІ:',
  [ShowcaseStrings.YNA_LabelYes]: 'ТАК',
  [ShowcaseStrings.YNA_LabelNo]: 'НІ',
  [ShowcaseStrings.YNA_LabelAbstain]: 'УТРИМАННЯ',
  [ShowcaseStrings.YNA_AbstainNote]: 'Не враховується в рішенні',
  [ShowcaseStrings.YNA_ResolutionPasses]: '✅ Резолюцію ПРИЙНЯТО!',
  [ShowcaseStrings.YNA_ResolutionFails]: '❌ Резолюцію ВІДХИЛЕНО!',
  [ShowcaseStrings.YNA_DecidingVotesTemplate]:
    'Вирішальні голоси: {DECIDING} | Утримання: {ABSTENTIONS}',
  [ShowcaseStrings.YNA_ResetBtn]: 'Нова резолюція',

  // Supermajority Demo
  [ShowcaseStrings.Super_IntroTitle]: 'Голосування за конституційну поправку!',
  [ShowcaseStrings.Super_IntroStakes]:
    '🏛️ Ставки: Внесення поправок до Конституції вимагає більше, ніж проста більшість. Потрібна КВАЛІФІКОВАНА БІЛЬШІСТЬ!',
  [ShowcaseStrings.Super_IntroThreshold]:
    '🎯 Поріг 2/3: Щонайменше 66,67% повинні проголосувати ТАК, щоб поправка пройшла. Це захищає від поспішних змін.',
  [ShowcaseStrings.Super_IntroAmendment]:
    '📜 Поправка: «Додати обмеження термінів для всіх федеральних суддів»',
  [ShowcaseStrings.Super_IntroHighBar]:
    '⚠️ Висока планка: 6 з 9 штатів повинні ратифікувати (простої більшості недостатньо!)',
  [ShowcaseStrings.Super_IntroChallenge]:
    '🌎 Використовується для конституційних змін, ратифікації договорів та процесів імпічменту.',
  [ShowcaseStrings.Super_StartBtn]: '🗳️ Почати ратифікацію!',
  [ShowcaseStrings.Super_DemoTitle]:
    '🎯 Кваліфікована більшість - Конституційна поправка',
  [ShowcaseStrings.Super_DemoTaglineTemplate]:
    '📊 Потрібно {PERCENT}% для прийняття ({REQUIRED}/{TOTAL} штатів)',
  [ShowcaseStrings.Super_TrackerTitle]:
    '📊 Відстеження порогу в реальному часі',
  [ShowcaseStrings.Super_YesCountTemplate]: '{COUNT} ТАК',
  [ShowcaseStrings.Super_RequiredTemplate]: 'Потрібно {PERCENT}%',
  [ShowcaseStrings.Super_StatusPassingTemplate]:
    '✅ Наразі ПРИЙНЯТО ({YES}/{TOTAL} = {PERCENT}%)',
  [ShowcaseStrings.Super_StatusFailingTemplate]:
    '❌ Наразі ВІДХИЛЕНО ({YES}/{TOTAL} = {PERCENT}%) - Потрібно ще {NEED} ТАК',
  [ShowcaseStrings.Super_LegislaturesTemplate]:
    'Законодавчі органи штатів ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Super_VotedRatify]: '✓ ✅ РАТИФІКУВАТИ',
  [ShowcaseStrings.Super_VotedReject]: '✓ ❌ ВІДХИЛИТИ',
  [ShowcaseStrings.Super_BtnRatify]: '✅ РАТИФІКУВАТИ',
  [ShowcaseStrings.Super_BtnReject]: '❌ ВІДХИЛИТИ',
  [ShowcaseStrings.Super_TallyBtn]: '📜 Фінальний підрахунок!',
  [ShowcaseStrings.Super_ResultsTitle]: '🏛️ Результати поправки!',
  [ShowcaseStrings.Super_CalcTitle]: '📊 Розрахунок кваліфікованої більшості',
  [ShowcaseStrings.Super_CalcRequiredTemplate]:
    'Потрібно: {REQUIRED}/{TOTAL} штатів ({PERCENT}%)',
  [ShowcaseStrings.Super_CalcActualTemplate]:
    'Фактично: {ACTUAL}/{VOTED} штатів ({PERCENT}%)',
  [ShowcaseStrings.Super_RatifyCountTemplate]: '✅ {COUNT} РАТИФІКУВАТИ',
  [ShowcaseStrings.Super_RejectCountTemplate]: '❌ {COUNT} ВІДХИЛИТИ',
  [ShowcaseStrings.Super_ThresholdTemplate]: '⬆️ Поріг {PERCENT}%',
  [ShowcaseStrings.Super_AmendmentRatified]: '✅ ПОПРАВКУ РАТИФІКОВАНО!',
  [ShowcaseStrings.Super_AmendmentFails]: '❌ ПОПРАВКА НЕ ПРОЙШЛА!',
  [ShowcaseStrings.Super_OutcomePassTemplate]:
    'Поправка прийнята {COUNT} штатами ({PERCENT}%)',
  [ShowcaseStrings.Super_OutcomeFailTemplate]:
    'Не досягнуто порогу {THRESHOLD}%. Лише {ACTUAL} з {REQUIRED} необхідних штатів ратифікували.',
  [ShowcaseStrings.Super_ResetBtn]: 'Нова поправка',

  // Ranked Choice Demo
  [ShowcaseStrings.RC_IntroTitle]: 'Велике політичне протистояння!',
  [ShowcaseStrings.RC_IntroStory]:
    '🏛️ Спецвипуск виборчої ночі: Чотири партії борються за владу. Але ось поворот — ніхто не хоче, щоб розщеплення голосів віддало перемогу найменш бажаному кандидату!',
  [ShowcaseStrings.RC_IntroRCV]:
    '🧠 Рейтингове голосування на допомогу! Замість вибору лише одного, ви ранжуєте ВСІХ кандидатів від улюбленого до найменш бажаного.',
  [ShowcaseStrings.RC_IntroHowItWorks]:
    '🔥 Як це працює: Якщо ніхто не отримує 50%+ у 1-му раунді, ми виключаємо останнього і передаємо його голоси другим вибором виборців. Повторюємо, поки хтось не переможе!',
  [ShowcaseStrings.RC_IntroWhyCool]:
    '✨ Чому це круто: Ви можете голосувати серцем у 1-му раунді, не «витрачаючи» свій голос. Ваші запасні варіанти спрацьовують, якщо ваш фаворит вибуває.',
  [ShowcaseStrings.RC_IntroChallenge]:
    '🌎 Використовується в Австралії, Мейні, Алясці та Нью-Йорку! Спостерігайте за миттєвим повторним голосуванням на власні очі.',
  [ShowcaseStrings.RC_StartBtn]: '🗳️ Почати ранжування!',
  [ShowcaseStrings.RC_DemoTitle]:
    '🔄 Рейтингове голосування - Національні вибори',
  [ShowcaseStrings.RC_DemoTagline]:
    '🎯 Ранжуйте ВСІХ! Без спойлерів, без жалю, тільки демократія.',
  [ShowcaseStrings.RC_PartiesTitle]: 'Політичні партії',
  [ShowcaseStrings.RC_Cand1_Platform]:
    "Загальна охорона здоров'я, кліматичні дії",
  [ShowcaseStrings.RC_Cand2_Platform]: 'Нижчі податки, традиційні цінності',
  [ShowcaseStrings.RC_Cand3_Platform]: 'Індивідуальна свобода, малий уряд',
  [ShowcaseStrings.RC_Cand4_Platform]: 'Захист довкілля, сталий розвиток',
  [ShowcaseStrings.RC_RankPreferencesTemplate]:
    'Ранжуйте ваші вподобання ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.RC_VotedBadge]: '✓ Проголосував',
  [ShowcaseStrings.RC_AddToRanking]: 'Додати до рейтингу:',
  [ShowcaseStrings.RC_SubmitBallot]: 'Подати бюлетень',
  [ShowcaseStrings.RC_RunInstantRunoff]:
    'Запустити миттєве повторне голосування',
  [ShowcaseStrings.RC_ShowBulletinBoard]: '📜 Показати дошку оголошень',
  [ShowcaseStrings.RC_HideBulletinBoard]: '📜 Сховати дошку оголошень',
  [ShowcaseStrings.RC_BulletinBoardTitle]:
    '📜 Публічна дошка оголошень (Вимога 1.2)',
  [ShowcaseStrings.RC_BulletinBoardDesc]:
    'Прозора публікація голосів тільки-додавання з верифікацією дерева Меркла',
  [ShowcaseStrings.RC_EntryTemplate]: 'Запис #{SEQ}',
  [ShowcaseStrings.RC_EncryptedVote]: 'Зашифрований голос:',
  [ShowcaseStrings.RC_VoterHash]: 'Хеш виборця:',
  [ShowcaseStrings.RC_Verified]: '✅ Перевірено',
  [ShowcaseStrings.RC_Invalid]: '❌ Недійсний',
  [ShowcaseStrings.RC_MerkleTree]: 'Дерево Меркла:',
  [ShowcaseStrings.RC_MerkleValid]: '✅ Дійсне',
  [ShowcaseStrings.RC_MerkleCompromised]: '❌ Скомпрометоване',
  [ShowcaseStrings.RC_TotalEntries]: 'Всього записів:',
  [ShowcaseStrings.RC_ResultsTitle]:
    '🏆 Результати миттєвого повторного голосування',
  [ShowcaseStrings.RC_EliminationRounds]: 'Раунди виключення',
  [ShowcaseStrings.RC_RoundTemplate]: 'Раунд {ROUND}',
  [ShowcaseStrings.RC_Eliminated]: 'Виключений',
  [ShowcaseStrings.RC_Winner]: 'Переможець!',
  [ShowcaseStrings.RC_FinalWinner]: 'Фінальний переможець',
  [ShowcaseStrings.RC_WonAfterRoundsTemplate]:
    'Переміг після {COUNT} раунд(ів)',
  // Two-Round Demo
  [ShowcaseStrings.TR_IntroTitle]: 'Президентські вибори - Два тури!',
  [ShowcaseStrings.TR_IntroSystem]:
    '🗳️ Система: Чотири кандидати змагаються. Якщо ніхто не отримує 50%+ у Турі 1, топ-2 зустрічаються у Турі 2!',
  [ShowcaseStrings.TR_IntroWhyTwoRounds]:
    '🎯 Чому два тури? Гарантує, що переможець має підтримку більшості. Використовується у Франції, Бразилії та багатьох президентських виборах.',
  [ShowcaseStrings.TR_IntroRound1]:
    '📊 Тур 1: Голосуйте за улюбленого серед усіх 4 кандидатів',
  [ShowcaseStrings.TR_IntroRound2]: '🔄 Тур 2: За потреби, оберіть між топ-2',
  [ShowcaseStrings.TR_IntroChallenge]:
    '⚠️ Це вимагає проміжного дешифрування між турами - голоси не є приватними між турами!',
  [ShowcaseStrings.TR_StartBtn]: '🗳️ Почати Тур 1!',
  [ShowcaseStrings.TR_DemoTitle]:
    '2️⃣ Двотурове голосування - Президентські вибори',
  [ShowcaseStrings.TR_TaglineRound1]: '🔄 Тур 1: Оберіть улюбленого',
  [ShowcaseStrings.TR_TaglineRound2]: '🔄 Тур 2: Фінальний тур!',
  [ShowcaseStrings.TR_Round1Candidates]: 'Кандидати Туру 1',
  [ShowcaseStrings.TR_Cand1_Party]: 'Прогресивна партія',
  [ShowcaseStrings.TR_Cand2_Party]: 'Консервативна партія',
  [ShowcaseStrings.TR_Cand3_Party]: 'Тех Вперед',
  [ShowcaseStrings.TR_Cand4_Party]: 'Коаліція справедливості',
  [ShowcaseStrings.TR_VotersTemplate]:
    'Виборці ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.TR_VotedForTemplate]: '✓ Проголосував за {EMOJI}',
  [ShowcaseStrings.TR_CountRound1]: '📊 Підрахувати голоси Туру 1!',
  [ShowcaseStrings.TR_Round1Results]: '🗳️ Результати Туру 1',
  [ShowcaseStrings.TR_Round1TallyTitle]: '📊 Підрахунок першого туру',
  [ShowcaseStrings.TR_Round1TallyExplain]:
    'Перевірка чи хтось отримав 50%+ більшість...',
  [ShowcaseStrings.TR_AdvanceRound2]: '→ Тур 2',
  [ShowcaseStrings.TR_EliminatedBadge]: 'Виключений',
  [ShowcaseStrings.TR_NoMajority]: '🔄 Немає більшості! Потрібен другий тур!',
  [ShowcaseStrings.TR_TopTwoAdvance]: 'Топ-2 кандидати проходять до Туру 2:',
  [ShowcaseStrings.TR_StartRound2]: '▶️ Почати другий тур!',
  [ShowcaseStrings.TR_Round2Runoff]: '🔥 Другий тур',
  [ShowcaseStrings.TR_Round1ResultTemplate]: 'Тур 1: {VOTES} голосів',
  [ShowcaseStrings.TR_FinalVoteTemplate]:
    'Фінальне голосування ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.TR_FinalCount]: '🏆 Фінальний підрахунок!',
  [ShowcaseStrings.TR_ElectionWinner]: '🎉 Переможець виборів!',
  [ShowcaseStrings.TR_Round2TallyTitle]: '📊 Фінальний підрахунок Туру 2',
  [ShowcaseStrings.TR_Round2TallyExplain]:
    'Пряме протистояння між топ-2 кандидатами:',
  [ShowcaseStrings.TR_WinnerAnnouncementTemplate]: '🏆 {NAME} перемагає!',
  [ShowcaseStrings.TR_WinnerSecuredTemplate]:
    'Отримав {VOTES} голосів ({PERCENT}%) у другому турі',
  [ShowcaseStrings.TR_NewElection]: 'Нові вибори',
  // STAR Demo
  [ShowcaseStrings.STAR_IntroTitle]:
    'STAR голосування - Найкраще з обох світів!',
  [ShowcaseStrings.STAR_IntroAcronym]:
    '🌟 STAR = Оцінка потім Автоматичний Другий Тур',
  [ShowcaseStrings.STAR_IntroStep1]:
    '⭐ Крок 1: Оцініть всіх кандидатів від 0 до 5 зірок (як оцінювати фільми!)',
  [ShowcaseStrings.STAR_IntroStep2]:
    '🔄 Крок 2: Топ-2 за загальним балом йдуть в автоматичний другий тур. Ваші оцінки визначають вашу перевагу!',
  [ShowcaseStrings.STAR_IntroMagic]:
    '🎯 Магія: Ви можете дати високі оцінки кільком кандидатам, але другий тур забезпечує підтримку більшості',
  [ShowcaseStrings.STAR_IntroExample]:
    '💡 Приклад: Ви оцінюєте Alex=5, Jordan=4, Sam=2, Casey=1. Якщо Alex і Jordan у топ-2, ваш голос йде Alex!',
  [ShowcaseStrings.STAR_IntroChallenge]:
    '⚠️ Поєднує виразність оцінкового голосування з вимогою більшості другого туру!',
  [ShowcaseStrings.STAR_StartBtn]: '⭐ Почати оцінювання!',
  [ShowcaseStrings.STAR_DemoTitle]: '⭐🔄 STAR голосування - Міська рада',
  [ShowcaseStrings.STAR_DemoTagline]:
    '⭐ Оцініть, потім автоматичний другий тур!',
  [ShowcaseStrings.STAR_CandidatesTitle]: 'Кандидати',
  [ShowcaseStrings.STAR_Cand1_Platform]: 'Мистецтво та культура',
  [ShowcaseStrings.STAR_Cand2_Platform]: 'Довкілля',
  [ShowcaseStrings.STAR_Cand3_Platform]: 'Економіка',
  [ShowcaseStrings.STAR_Cand4_Platform]: "Охорона здоров'я",
  [ShowcaseStrings.STAR_RatingsTemplate]: '⭐ Оцінки {VOTER} (0-5 зірок)',
  [ShowcaseStrings.STAR_SubmitRatingsTemplate]:
    'Подати оцінки ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STAR_RunSTAR]: '⭐🔄 Запустити алгоритм STAR!',
  [ShowcaseStrings.STAR_Phase1Title]: '⭐ Фаза 1: Підсумки балів',
  [ShowcaseStrings.STAR_Phase1TallyTitle]: '📊 Підсумовування всіх балів',
  [ShowcaseStrings.STAR_Phase1TallyExplain]:
    'Пошук топ-2 кандидатів за загальним балом...',
  [ShowcaseStrings.STAR_PointsTemplate]: '{TOTAL} балів (серед. {AVG})',
  [ShowcaseStrings.STAR_RunoffBadge]: '→ Другий тур',
  [ShowcaseStrings.STAR_AutoRunoffPhase]: '🔄 Фаза автоматичного другого туру',
  [ShowcaseStrings.STAR_TopTwoAdvance]:
    'Топ-2 проходять далі! Перевірка прямих переваг...',
  [ShowcaseStrings.STAR_RunAutoRunoff]: '▶️ Запустити автоматичний другий тур!',
  [ShowcaseStrings.STAR_WinnerTitle]: '🎉 Переможець STAR!',
  [ShowcaseStrings.STAR_Phase2Title]: '🔄 Фаза 2: Автоматичний другий тур',
  [ShowcaseStrings.STAR_Phase2ExplainTemplate]:
    'Порівняння {NAME1} проти {NAME2} за вподобаннями виборців:',
  [ShowcaseStrings.STAR_VotersPreferred]: 'виборців віддали перевагу',
  [ShowcaseStrings.STAR_VS]: 'VS',
  [ShowcaseStrings.STAR_WinnerAnnouncementTemplate]: '🏆 {NAME} перемагає!',
  [ShowcaseStrings.STAR_WonRunoffTemplate]:
    'Переміг в автоматичному другому турі {WINNER} до {LOSER}',
  [ShowcaseStrings.STAR_NewElection]: 'Нові вибори',
  // STV Demo
  [ShowcaseStrings.STV_IntroTitle]: 'STV - Пропорційне представництво!',
  [ShowcaseStrings.STV_IntroGoal]:
    '🏛️ Мета: Обрати 3 представників, що відображають різноманітність вподобань виборців!',
  [ShowcaseStrings.STV_IntroSTV]:
    '📊 STV (Єдиний передаваний голос): Ранжуйте кандидатів. Голоси передаються, коли ваш перший вибір перемагає або вибуває.',
  [ShowcaseStrings.STV_IntroQuotaTemplate]:
    '🎯 Квота: Потрібно {QUOTA} голосів для отримання місця (квота Друпа: {VOTERS}/(3+1) + 1)',
  [ShowcaseStrings.STV_IntroTransfers]:
    '🔄 Передачі: Надлишкові голоси переможців та голоси виключених кандидатів передаються наступним вподобанням',
  [ShowcaseStrings.STV_IntroChallenge]:
    '🌍 Використовується в Ірландії, Сенаті Австралії та багатьох міських радах для справедливого представництва!',
  [ShowcaseStrings.STV_StartBtn]: '📊 Почати ранжування!',
  [ShowcaseStrings.STV_DemoTitle]: '📊 STV - Міська рада ({SEATS} місць)',
  [ShowcaseStrings.STV_DemoTaglineTemplate]:
    '🎯 Квота: {QUOTA} голосів потрібно на місце',
  [ShowcaseStrings.STV_PartiesRunning]: 'Партії-учасники',
  [ShowcaseStrings.STV_RankingTemplate]: '📝 Рейтинг {VOTER}',
  [ShowcaseStrings.STV_RankingInstruction]:
    'Натисніть, щоб додати кандидатів у порядку переваги:',
  [ShowcaseStrings.STV_SubmitRankingTemplate]:
    'Подати рейтинг ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.STV_RunSTVCount]: '📊 Запустити підрахунок STV!',
  [ShowcaseStrings.STV_CouncilElected]: '🏛️ Раду обрано!',
  [ShowcaseStrings.STV_CountingTitle]: '📊 Процес підрахунку STV',
  [ShowcaseStrings.STV_CountingExplainTemplate]:
    'Квота: {QUOTA} голосів | Місця: {SEATS}\nПідрахунок перших переваг визначає початкових переможців',
  [ShowcaseStrings.STV_QuotaMet]: '(Квоту досягнуто!)',
  [ShowcaseStrings.STV_ElectedBadge]: '✓ ОБРАНО',
  [ShowcaseStrings.STV_ElectedReps]: '🎉 Обрані представники',
  [ShowcaseStrings.STV_ElectedExplainTemplate]:
    '💡 Ці {COUNT} партій досягли квоти в {QUOTA} голосів і отримали місця в раді!',
  [ShowcaseStrings.STV_NewElection]: 'Нові вибори',

  // Quadratic Voting Demo
  [ShowcaseStrings.Quad_IntroTitle]:
    'Квадратичне Голосування - Розподіл Бюджету!',
  [ShowcaseStrings.Quad_IntroChallenge]:
    '💰 Виклик: Бюджет $1.4M, 4 проєкти. Як виміряти інтенсивність переваг?',
  [ShowcaseStrings.Quad_IntroQuadratic]:
    '² Квадратичне Голосування: Кожен голос коштує голоси² кредитів. 1 голос = 1 кредит, 2 голоси = 4 кредити, 3 голоси = 9 кредитів!',
  [ShowcaseStrings.Quad_IntroInsecure]:
    '⚠️ НЕБЕЗПЕЧНИЙ МЕТОД: Потребує негомоморфних операцій (квадратний корінь). Індивідуальні голоси видимі!',
  [ShowcaseStrings.Quad_IntroWhyUse]:
    '🎯 Навіщо використовувати? Запобігає домінуванню заможних виборців. Показує інтенсивність переваг, а не лише так/ні.',
  [ShowcaseStrings.Quad_IntroUsedIn]:
    '💡 Використовується в Палаті Колорадо, тайванській платформі vTaiwan та експериментах з корпоративного управління!',
  [ShowcaseStrings.Quad_StartBtn]: '💰 Почати Розподіл!',
  [ShowcaseStrings.Quad_DemoTitle]:
    '² Квадратичне Голосування - Міський Бюджет',
  [ShowcaseStrings.Quad_DemoTagline]:
    '💰 100 голосових кредитів. Голоси коштують голоси²!',
  [ShowcaseStrings.Quad_InsecureBanner]:
    '⚠️ НЕБЕЗПЕЧНО: Цей метод не може використовувати гомоморфне шифрування. Голоси видимі!',
  [ShowcaseStrings.Quad_BudgetProjects]: 'Бюджетні Проєкти',
  [ShowcaseStrings.Quad_Proj1_Name]: 'Новий Парк',
  [ShowcaseStrings.Quad_Proj1_Desc]: '$500 тис.',
  [ShowcaseStrings.Quad_Proj2_Name]: 'Реновація Бібліотеки',
  [ShowcaseStrings.Quad_Proj2_Desc]: '$300 тис.',
  [ShowcaseStrings.Quad_Proj3_Name]: 'Громадський Центр',
  [ShowcaseStrings.Quad_Proj3_Desc]: '$400 тис.',
  [ShowcaseStrings.Quad_Proj4_Name]: 'Ремонт Вулиць',
  [ShowcaseStrings.Quad_Proj4_Desc]: '$200 тис.',
  [ShowcaseStrings.Quad_BudgetTemplate]:
    '💰 Бюджет {VOTER} (залишилось {REMAINING} кредитів)',
  [ShowcaseStrings.Quad_VotesTemplate]:
    '{VOTES} голосів (коштує {COST} кредитів)',
  [ShowcaseStrings.Quad_CostExplanationTemplate]:
    'Наступний голос коштує {NEXT_COST} кредитів (з {CURRENT} до {NEXT_TOTAL})',
  [ShowcaseStrings.Quad_BudgetSummaryTemplate]:
    'Загальна Вартість: {USED}/100 кредитів',
  [ShowcaseStrings.Quad_SubmitTemplate]: 'Подати Розподіл ({CURRENT}/{TOTAL})',
  [ShowcaseStrings.Quad_CalculateTotals]: '💰 Підрахувати Підсумки!',
  [ShowcaseStrings.Quad_ResultsTitle]: '💰 Результати Розподілу Бюджету!',
  [ShowcaseStrings.Quad_TallyTitle]: '📊 Підсумки Квадратичного Голосування',
  [ShowcaseStrings.Quad_TallyExplain]:
    'Загальна кількість голосів (не кредитів) кожного проєкту визначає пріоритет фінансування:',
  [ShowcaseStrings.Quad_TotalVotesTemplate]: 'Всього {TOTAL} голосів',
  [ShowcaseStrings.Quad_TopPriority]: '🏆 Найвищий Пріоритет',
  [ShowcaseStrings.Quad_ExplanationTitle]:
    '💡 Як Працювало Квадратичне Голосування',
  [ShowcaseStrings.Quad_ExplanationP1]:
    'Квадратична вартість запобігла домінуванню будь-кого над одним проєктом. Віддати 10 голосів коштує 100 кредитів (весь ваш бюджет!), але розподілити по 5 голосів на 2 проєкти коштує лише 50 кредитів загалом.',
  [ShowcaseStrings.Quad_ExplanationResult]:
    'Результат: Проєкти з широкою та інтенсивною підтримкою перемагають проєкти з вузькою та екстремальною підтримкою.',
  [ShowcaseStrings.Quad_ResetBtn]: 'Нове Бюджетне Голосування',

  // Consensus Demo
  [ShowcaseStrings.Cons_IntroTitle]: 'Прийняття Рішень Консенсусом!',
  [ShowcaseStrings.Cons_IntroScenario]:
    '🏕️ Сценарій: Невеликий кооператив повинен прийняти важливе рішення. Голос кожного має значення!',
  [ShowcaseStrings.Cons_IntroConsensus]:
    '🤝 Голосування Консенсусом: Потрібно 95%+ згоди. Одне чи два заперечення можуть заблокувати пропозицію.',
  [ShowcaseStrings.Cons_IntroInsecure]:
    '⚠️ НЕБЕЗПЕЧНИЙ МЕТОД: Без конфіденційності - всі бачать, хто підтримує/заперечує!',
  [ShowcaseStrings.Cons_IntroWhyUse]:
    '🎯 Навіщо використовувати? Малі групи, де довіра та єдність важливіші за конфіденційність.',
  [ShowcaseStrings.Cons_IntroUsedIn]:
    '🌍 Використовується в кооперативах, інтенціональних спільнотах та організаціях на основі консенсусу!',
  [ShowcaseStrings.Cons_StartBtn]: '🤝 Почати Голосування!',
  [ShowcaseStrings.Cons_DemoTitle]:
    '🤝 Голосування Консенсусом - Рішення Кооперативу',
  [ShowcaseStrings.Cons_DemoTaglineTemplate]:
    '🎯 Потрібно {PERCENT}% згоди ({REQUIRED}/{TOTAL} членів)',
  [ShowcaseStrings.Cons_InsecureBanner]:
    '⚠️ НЕБЕЗПЕЧНО: Без конфіденційності - всі голоси видимі для побудови консенсусу!',
  [ShowcaseStrings.Cons_Proposal]:
    'Пропозиція: Чи варто інвестувати $50 тис. у сонячні панелі?',
  [ShowcaseStrings.Cons_ProposalDesc]:
    'Це важливе фінансове рішення, що потребує майже одностайної підтримки.',
  [ShowcaseStrings.Cons_TrackerTitle]:
    '📊 Відстеження Консенсусу в Реальному Часі',
  [ShowcaseStrings.Cons_SupportTemplate]: '{COUNT} Підтримка',
  [ShowcaseStrings.Cons_ConsensusReachedTemplate]:
    '✅ КОНСЕНСУС ДОСЯГНУТО ({SUPPORT}/{TOTAL})',
  [ShowcaseStrings.Cons_NeedMoreTemplate]:
    '❌ Потрібно ще {NEEDED} для досягнення консенсусу',
  [ShowcaseStrings.Cons_MembersTemplate]:
    'Члени Кооперативу ({VOTED}/{TOTAL} проголосували)',
  [ShowcaseStrings.Cons_Support]: '✅ Підтримка',
  [ShowcaseStrings.Cons_Oppose]: '❌ Проти',
  [ShowcaseStrings.Cons_BtnSupport]: '✅ Підтримати',
  [ShowcaseStrings.Cons_BtnOppose]: '❌ Заперечити',
  [ShowcaseStrings.Cons_CheckConsensus]: '🤝 Перевірити Консенсус!',
  [ShowcaseStrings.Cons_ResultsTitle]: '🤝 Результат Консенсусу!',
  [ShowcaseStrings.Cons_FinalCountTitle]: '📊 Фінальний Підрахунок',
  [ShowcaseStrings.Cons_RequiredTemplate]:
    'Потрібно: {REQUIRED}/{TOTAL} ({PERCENT}%)',
  [ShowcaseStrings.Cons_ActualTemplate]:
    'Фактично: {SUPPORT}/{VOTED} ({ACTUAL_PERCENT}%)',
  [ShowcaseStrings.Cons_SupportCountTemplate]: '✅ {COUNT} Підтримка',
  [ShowcaseStrings.Cons_OpposeCountTemplate]: '❌ {COUNT} Проти',
  [ShowcaseStrings.Cons_ThresholdTemplate]: '⬆️ Поріг {PERCENT}%',
  [ShowcaseStrings.Cons_ConsensusAchieved]: '✅ КОНСЕНСУС ДОСЯГНУТО!',
  [ShowcaseStrings.Cons_ConsensusFailed]: '❌ КОНСЕНСУС НЕ ДОСЯГНУТО!',
  [ShowcaseStrings.Cons_OutcomePassTemplate]:
    'Пропозиція прийнята за підтримки {COUNT} членів ({PERCENT}%)',
  [ShowcaseStrings.Cons_OutcomeFailTemplate]:
    'Не досягнуто порогу {THRESHOLD}%. {OPPOSE} член(ів) заперечили, заблокувавши консенсус.',
  [ShowcaseStrings.Cons_FailNote]:
    '💡 У прийнятті рішень консенсусом навіть одне чи два заперечення мають значення. Група повинна вирішити проблеми або змінити пропозицію.',
  [ShowcaseStrings.Cons_ResetBtn]: 'Нова Пропозиція',

  // Consent-Based Demo
  [ShowcaseStrings.Consent_IntroTitle]: 'Прийняття Рішень на Основі Згоди!',
  [ShowcaseStrings.Consent_IntroSociocracy]:
    '🏢 Соціократія: Робітничий кооператив повинен приймати рішення, з якими всі можуть жити.',
  [ShowcaseStrings.Consent_IntroConsentBased]:
    '🙋 На Основі Згоди: Не про згоду - а про "відсутність сильних заперечень". Чи можете ви з цим жити?',
  [ShowcaseStrings.Consent_IntroInsecure]:
    '⚠️ НЕБЕЗПЕЧНИЙ МЕТОД: Без конфіденційності - заперечення повинні бути почуті та розглянуті!',
  [ShowcaseStrings.Consent_IntroQuestion]:
    '🎯 Питання: "Чи маєте ви принципове заперечення, яке зашкодить організації?"',
  [ShowcaseStrings.Consent_IntroUsedIn]:
    '🌍 Використовується в соціократичних організаціях, холакратії та колаборативних робочих місцях!',
  [ShowcaseStrings.Consent_StartBtn]: '🙋 Почати Процес!',
  [ShowcaseStrings.Consent_DemoTitle]:
    '🙋 На Основі Згоди - Робітничий Кооператив',
  [ShowcaseStrings.Consent_DemoTagline]:
    '🤝 Без сильних заперечень = згоду досягнуто',
  [ShowcaseStrings.Consent_InsecureBanner]:
    '⚠️ НЕБЕЗПЕЧНО: Без конфіденційності - заперечення відкрито обговорюються!',
  [ShowcaseStrings.Consent_ProposalTitle]:
    'Пропозиція: Запровадити 4-денний робочий тиждень з наступного місяця',
  [ShowcaseStrings.Consent_ProposalQuestion]:
    'Чи маєте ви принципове заперечення, яке зашкодить нашій організації?',
  [ShowcaseStrings.Consent_ProposalNote]:
    '"Я віддаю перевагу 5 дням" - це не принципове заперечення. "Це нас збанкрутує" - це принципове заперечення.',
  [ShowcaseStrings.Consent_ConsentCount]: '✅ Згода',
  [ShowcaseStrings.Consent_ObjectionCount]: '🚫 Заперечення',
  [ShowcaseStrings.Consent_ObjectionWarningTemplate]:
    '⚠️ Висунуто {COUNT} принципових заперечень - пропозицію потрібно змінити або відкликати',
  [ShowcaseStrings.Consent_MembersTemplate]:
    'Члени Кола ({RESPONDED}/{TOTAL} відповіли)',
  [ShowcaseStrings.Consent_NoObjection]: '✅ Без Заперечень',
  [ShowcaseStrings.Consent_PrincipledObjection]: '🚫 Принципове Заперечення',
  [ShowcaseStrings.Consent_BtnNoObjection]: '✅ Без Заперечень',
  [ShowcaseStrings.Consent_BtnObject]: '🚫 Заперечити',
  [ShowcaseStrings.Consent_ObjectionPromptTemplate]:
    '{VOTER}, яке ваше принципове заперечення?',
  [ShowcaseStrings.Consent_CheckConsent]: '🙋 Перевірити Згоду!',
  [ShowcaseStrings.Consent_ResultsTitle]: '🙋 Результат Процесу Згоди!',
  [ShowcaseStrings.Consent_ConsentCheckTitle]: '📊 Перевірка Згоди',
  [ShowcaseStrings.Consent_ConsentCheckExplainTemplate]:
    'Згоду досягнуто при нулі принципових заперечень\nВисунуто заперечень: {COUNT}',
  [ShowcaseStrings.Consent_NoObjectionsGroup]: '✅ Без Заперечень ({COUNT})',
  [ShowcaseStrings.Consent_NoObjectionsDesc]:
    'Ці члени можуть жити з пропозицією',
  [ShowcaseStrings.Consent_ObjectionsGroupTemplate]:
    '🚫 Принципові Заперечення ({COUNT})',
  [ShowcaseStrings.Consent_ObjectionRaised]: 'Заперечення висунуто',
  [ShowcaseStrings.Consent_ConsentAchieved]: '✅ ЗГОДУ ДОСЯГНУТО!',
  [ShowcaseStrings.Consent_ConsentBlocked]: '🚫 ЗГОДУ ЗАБЛОКОВАНО!',
  [ShowcaseStrings.Consent_OutcomePassTemplate]:
    'Усі {COUNT} членів дали згоду (без принципових заперечень). Пропозиція рухається далі.',
  [ShowcaseStrings.Consent_OutcomeFailTemplate]:
    'Висунуто {COUNT} принципових заперечень. Коло повинно вирішити проблеми перед продовженням.',
  [ShowcaseStrings.Consent_NextStepsTitle]: '💡 Наступні Кроки в Соціократії:',
  [ShowcaseStrings.Consent_NextStep1]: 'Повністю вислухати заперечення',
  [ShowcaseStrings.Consent_NextStep2]:
    'Змінити пропозицію для вирішення проблем',
  [ShowcaseStrings.Consent_NextStep3]:
    'Повторно перевірити згоду з оновленою пропозицією',
  [ShowcaseStrings.Consent_NextStep4]:
    'Якщо заперечення залишаються, пропозицію відкликають',
  [ShowcaseStrings.Consent_ResetBtn]: 'Нова Пропозиція',

  // Blog
  [ShowcaseStrings.Blog_Title]: 'Блог BrightChain',
  [ShowcaseStrings.Blog_Subtitle]: 'Думки, навчальні матеріали та оновлення',
  [ShowcaseStrings.Blog_Loading]: 'Завантаження публікацій...',
  [ShowcaseStrings.Blog_NewPost]: '+ Нова Публікація',
  [ShowcaseStrings.Blog_NoPosts]:
    'Ще немає публікацій у блозі. Перевірте пізніше!',
  [ShowcaseStrings.Blog_NewBadge]: '✨ Нове',
  [ShowcaseStrings.Blog_ByAuthorTemplate]: 'Автор: {AUTHOR}',
  [ShowcaseStrings.Blog_BackToHome]: '← Повернутися на Головну',

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
    'Безпечне сховище з нульовим знанням та автоматизованими протоколами відмовостійкості. Криптографічне стирання знищує Рецепт (карту + ключі), роблячи розкидані зашифровані блоки назавжди невідновлюваними при спрацюванні.',
  [ShowcaseStrings.Feat_Burnbag_Cat]: 'Криптографія',
  [ShowcaseStrings.Feat_Burnbag_Tech1]: 'Криптографічне стирання',
  [ShowcaseStrings.Feat_Burnbag_Tech2]: 'Перемикач мертвої людини',
  [ShowcaseStrings.Feat_Burnbag_Tech3]: 'Протокол Канарки',
  [ShowcaseStrings.Feat_Burnbag_HL1]:
    'Архітектура з нульовим знанням: постачальник послуг не може отримати доступ до даних користувача за звичайних обставин',
  [ShowcaseStrings.Feat_Burnbag_HL2]:
    'Криптографічне стирання: знищення Рецепту робить розкидані блоки назавжди невідновлюваними',
  [ShowcaseStrings.Feat_Burnbag_HL3]:
    'Перемикач мертвої людини: моніторинг серцебиття запускає автоматичне знищення Рецепту при неактивності',
  [ShowcaseStrings.Feat_Burnbag_HL4]:
    'Протокол Канарки: механізм правил з моніторингом сторонніх API (Twitter, Fitbit, Google, GitHub)',
  [ShowcaseStrings.Feat_Burnbag_HL5]:
    'Виявлення примусу: спеціальні коди примусу запускають протоколи знищення замість звичайного доступу',
  [ShowcaseStrings.Feat_Burnbag_HL6]:
    'Налаштовувані дії протоколу: видалення файлів, розповсюдження даних, публічне розкриття або користувацькі відповіді',
  [ShowcaseStrings.Feat_Burnbag_HL7]:
    'Архітектура подвійного ключа: керовані користувачем ключі BIP39 плюс додаткові системні ключі умовного зберігання для виконання протоколу',
  [ShowcaseStrings.Feat_Burnbag_HL8]:
    'Кворум наступництва: попередньо авторизовані довірені контакти для безпечного випуску або відновлення даних',
  [ShowcaseStrings.Feat_Burnbag_HL9]:
    'Мутація при читанні: будь-який несанкціонований доступ до Рецепту запускає постійну незмінну мутацію реєстру',
  [ShowcaseStrings.Feat_Burnbag_HL10]:
    'Налаштовувані рівні довіри: нульова довіра, умовна довіра або гібрид за чутливістю файлу',
  [ShowcaseStrings.Feat_Burnbag_HL11]:
    'Багатомовна підтримка: англійська, французька, іспанська, українська та китайська мандаринська',
  [ShowcaseStrings.Feat_Burnbag_HL12]:
    'Шифрування ECIES з ключами secp256k1 та AES-256-GCM для безпеки файлів',

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

export default ShowcaseUkrainianStrings;
