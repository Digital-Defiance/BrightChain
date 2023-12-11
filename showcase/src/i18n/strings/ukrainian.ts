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
  [ShowcaseStrings.FAQ_BrightDB_Logo_Alt]: 'Логотип BrightDB',
  [ShowcaseStrings.FAQ_TopSecret_Logo_Alt]: 'Цілком таємний dApp',
  [ShowcaseStrings.FAQ_BrightChat_Logo_Alt]: 'Логотип BrightChat',
  [ShowcaseStrings.FAQ_BrightID_Logo_Alt]: 'Логотип BrightID',
  [ShowcaseStrings.FAQ_BrightHub_Logo_Alt]: 'Логотип BrightHub',
  [ShowcaseStrings.FAQ_BrightVote_Logo_Alt]: 'Логотип BrightVote',
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
  [ShowcaseStrings.FAQ_Title_Technical]: 'BrightChain Часті Запитання',
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
  [ShowcaseStrings.FAQ_BrightChart_Logo_Alt]: 'Логотип BrightChart',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Title]:
    'Медичні записи, що належать пацієнту',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightChart_Text]:
    'Електронна медична картка, де пацієнт тримає ключі. BrightChart зберігає медичні дані, сумісні з FHIR R4, як зашифровані блоки на BrightChain — немає центральної бази даних для злому. Пацієнти надають гранулярний доступ постачальникам через делегування BrightTrust, і кожна подія доступу записується в незмінному аудиторському сліді. Підтримує медичні, стоматологічні та ветеринарні практики з єдиної кодової бази.',
  [ShowcaseStrings.FAQ_BrightCal_Logo_Alt]: 'Логотип BrightCal',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Title]: 'Управління спільним та особистим календарем',
  [ShowcaseStrings.FAQ_Tech_Q11_BrightCal_Text]:
    'Система календаря, де власник зберігає ключі. BrightCal забезпечує безпечне зашифроване планування з детальним контролем доступу. Події зберігаються як зашифровані блоки. Усі дані календаря є незмінними та відновлюваними, з підтримкою повторюваних подій, нагадувань та інтеграції з традиційними системами календаря.',
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
  [ShowcaseStrings.About_OtherImpl_P1_Before]:
    'Хоча ця реалізація на TypeScript/Node.js є основною та найбільш зрілою версією, ',
  [ShowcaseStrings.About_OtherImpl_P1_CppLink]: 'основна бібліотека C++',
  [ShowcaseStrings.About_OtherImpl_P1_AppleLink]: 'інтерфейс macOS/iOS',
  [ShowcaseStrings.About_OtherImpl_P1_After]:
    ' знаходиться в розробці. Ця нативна реалізація приносить можливості конфіденційності та продуктивності BrightChain безпосередньо на пристрої Apple.',
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
  [ShowcaseStrings.Soup_MagnetURL]: '🧲 Магнітне посилання',
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

  // BlogPost.tsx
  [ShowcaseStrings.BlogPost_Loading]: 'Завантаження публікації...',
  [ShowcaseStrings.BlogPost_NotFoundTitle]: 'Публікацію не знайдено',
  [ShowcaseStrings.BlogPost_NotFoundDesc]:
    'Публікація, яку ви шукаєте, не існує.',
  [ShowcaseStrings.BlogPost_BackToBlog]: '← Повернутися до блогу',
  [ShowcaseStrings.BlogPost_NewBanner]:
    '✨ Ця публікація щойно опублікована! Вона з\'явиться у списку блогу після наступного оновлення сайту.',
  [ShowcaseStrings.BlogPost_ByAuthorTemplate]: 'Автор: {AUTHOR}',

  // Components.tsx feature cards
  [ShowcaseStrings.Feat_BrightDB_Desc]:
    'Конкурентна MongoDB документна база даних, що зберігає дані в файловій системі без власника. Кожен документ прозоро зберігається як відбілені блоки з архітектурою TUPLE для правдоподібного заперечення.',
  [ShowcaseStrings.Feat_BrightDB_Cat]: 'Сховище',
  [ShowcaseStrings.Feat_BrightDB_Tech1]: 'Сховище документів',
  [ShowcaseStrings.Feat_BrightDB_Tech2]: 'ACID-транзакції',
  [ShowcaseStrings.Feat_BrightDB_Tech3]: 'Конвеєр агрегації',
  [ShowcaseStrings.Feat_BrightDB_HL1]:
    'API в стилі MongoDB: колекції, CRUD, запити, індекси, транзакції',
  [ShowcaseStrings.Feat_BrightDB_HL2]:
    '15 операторів запитів: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $regex, $exists, $and, $or, $not, $nor, $elemMatch',
  [ShowcaseStrings.Feat_BrightDB_HL3]:
    'Конвеєр агрегації: $match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup',
  [ShowcaseStrings.Feat_BrightDB_HL4]:
    'Однопольові, складені та унікальні індекси зі структурами B-дерева',
  [ShowcaseStrings.Feat_BrightDB_HL5]:
    'Багатодокументні ACID-транзакції з commit/abort та оптимістичною конкурентністю',
  [ShowcaseStrings.Feat_BrightDB_HL6]:
    'Потоки змін для підписок на події вставки/оновлення/видалення в реальному часі',
  [ShowcaseStrings.Feat_BrightDB_HL7]:
    'Express REST middleware для plug-and-play API доступу до колекцій',
  [ShowcaseStrings.Feat_BrightDB_HL8]:
    'TTL індекси для автоматичного закінчення терміну дії документів',
  [ShowcaseStrings.Feat_BrightDB_HL9]:
    'Валідація схеми з суворими/помірними рівнями та значеннями за замовчуванням',
  [ShowcaseStrings.Feat_BrightDB_HL10]:
    'Повнотекстовий пошук із зваженими полями та оператором $text',
  [ShowcaseStrings.Feat_BrightDB_HL11]:
    'Сховище copy-on-write: блоки ніколи не видаляються, оновлюються лише відображення',
  [ShowcaseStrings.Feat_BrightDB_HL12]:
    'Кожен документ зберігається як 3-блоковий TUPLE (дані + 2 рандомізатори) для правдоподібного заперечення',
  [ShowcaseStrings.Feat_BrightDBPools_Title]: 'Пули BrightDB',
  [ShowcaseStrings.Feat_BrightDBPools_Desc]:
    'Легкі пули зберігання, ізольовані простором імен, які логічно розділяють блоки без окремого фізичного сховища. Кожен пул застосовує власні межі ACL, шифрування та відбілювання — забезпечуючи багатоорендну, багатододаткову ізоляцію даних на одному вузлі BrightChain.',
  [ShowcaseStrings.Feat_BrightDBPools_Cat]: 'Сховище',
  [ShowcaseStrings.Feat_BrightDBPools_Tech1]: 'Ізоляція простору імен',
  [ShowcaseStrings.Feat_BrightDBPools_Tech2]: 'ACL пулів',
  [ShowcaseStrings.Feat_BrightDBPools_Tech3]: 'Виявлення Gossip',
  [ShowcaseStrings.Feat_BrightDBPools_HL1]:
    'Ключі зберігання з префіксом простору імен (poolId:hash) — логічна ізоляція без фізичного розділення',
  [ShowcaseStrings.Feat_BrightDBPools_HL2]:
    'ACL для кожного пулу з дозволами на читання, запис, реплікацію та адміністрування, застосованими на рівні сховища',
  [ShowcaseStrings.Feat_BrightDBPools_HL3]:
    'XOR відбілювання в межах пулу: кортежі ніколи не перетинають межі пулу, зберігаючи правдоподібне заперечення для кожного пулу',
  [ShowcaseStrings.Feat_BrightDBPools_HL4]:
    'Виявлення пулів на основі gossip між вузлами з налаштовуваними тайм-аутами запитів та кешуванням',
  [ShowcaseStrings.Feat_BrightDBPools_HL5]:
    'Початкове заповнення пулу: генерація криптографічних випадкових блоків як матеріалу для відбілювання нових пулів',
  [ShowcaseStrings.Feat_BrightDBPools_HL6]:
    'Безпечна валідація видалення — перевіряє міжпульні XOR залежності перед видаленням пулу',
  [ShowcaseStrings.Feat_BrightDBPools_HL7]:
    'Bloom-фільтри та маніфести в межах пулу для ефективної узгодженості між вузлами',
  [ShowcaseStrings.Feat_BrightDBPools_HL8]:
    'Управління кворумом кількох адміністраторів: оновлення ACL вимагають >50% підписів адміністраторів',
  [ShowcaseStrings.Feat_BrightDBPools_HL9]:
    'Публічні прапорці читання/запису для відкритих пулів або заблокований доступ лише для членів',
  [ShowcaseStrings.Feat_OFFS_Title]: 'Owner-Free File System (OFFS)',
  [ShowcaseStrings.Feat_OFFS_Desc]:
    'Спираючись на оригінальну концепцію Owner-Free File System, BrightChain виводить OFFS на новий рівень. Ми додали асиметричне шифрування ECIES, блоки парності Ріда-Соломона для надмірності та довговічності, а також цифровий блокчейн-реєстр. На цій основі Digital Burnbag використовує унікальні властивості OFFS для гарантованого знищення файлів без того, щоб їх вміст коли-небудь був прочитаний. Повні математичні основи наведено у нашому технічному документі Digital Burnbag Vault.',
  [ShowcaseStrings.Feat_OFFS_Cat]: 'Сховище',
  [ShowcaseStrings.Feat_OFFS_Tech1]: 'ECIES шифрування',
  [ShowcaseStrings.Feat_OFFS_Tech2]: 'Reed-Solomon FEC',
  [ShowcaseStrings.Feat_OFFS_Tech3]: 'Блокчейн-реєстр',
  [ShowcaseStrings.Feat_OFFS_HL1]:
    'На основі оригінальної концепції OFFS — файли змішуються XOR з випадковими даними, тому жоден блок не містить ідентифікованого контенту',
  [ShowcaseStrings.Feat_OFFS_HL2]:
    'Доповнено асиметричним шифруванням ECIES для криптографічного рівня безпеки поверх XOR-обфускації',
  [ShowcaseStrings.Feat_OFFS_HL3]:
    'Блоки парності Reed-Solomon FEC забезпечують надмірність і довговічність навіть якщо вузли відключаються',
  [ShowcaseStrings.Feat_OFFS_HL4]:
    'Цифровий блокчейн-реєстр веде захищені від підробки записи всіх операцій із блоками',
  [ShowcaseStrings.Feat_OFFS_HL5]:
    'Digital Burnbag гарантує знищення файлів без будь-якого доступу до вмісту — доводиться через реєстр',
  [ShowcaseStrings.Feat_OFFS_HL6]:
    'Детальні математичні основи наведено у технічному документі Digital Burnbag Vault — https://github.brightchain.org/docs/papers/digital-burnbag-vault/',
  [ShowcaseStrings.Feat_Messaging_Title]: 'Система обміну повідомленнями',
  [ShowcaseStrings.Feat_Messaging_Desc]:
    'Безпечна децентралізована передача повідомлень з шифруванням, маршрутизацією, відстеженням доставки та gossip протоколом для епідемічного поширення. Побудована на сховищі блоків з доставкою в реальному часі через WebSocket.',
  [ShowcaseStrings.Feat_Messaging_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_Messaging_Tech1]: 'Gossip протокол',
  [ShowcaseStrings.Feat_Messaging_Tech2]: 'ECIES',
  [ShowcaseStrings.Feat_Messaging_Tech3]: 'WebSocket',
  [ShowcaseStrings.Feat_Messaging_Tech4]: 'Bloom-фільтри',
  [ShowcaseStrings.Feat_Messaging_HL1]:
    'Зашифрована передача повідомлень з шифруванням для кожного одержувача або спільним ключем',
  [ShowcaseStrings.Feat_Messaging_HL2]:
    'Епідемічне gossip поширення з пріоритетною доставкою',
  [ShowcaseStrings.Feat_Messaging_HL3]:
    'Автоматичне повторення з експоненціальним відступом для невдалих доставок',
  [ShowcaseStrings.Feat_Messaging_HL4]:
    'Протокол виявлення на основі Bloom-фільтрів для ефективного пошуку блоків',
  [ShowcaseStrings.Feat_Messaging_HL5]:
    'WebSocket події в реальному часі для доставки повідомлень та підтверджень',
  [ShowcaseStrings.Feat_Messaging_HL6]:
    'Постійне відстеження доставки зі статусом для кожного одержувача',
  [ShowcaseStrings.Feat_BrightMail_Desc]:
    'Електронна пошта, сумісна з RFC 5322/2045, з потоками, конфіденційністю BCC, вкладеннями, операціями вхідних повідомлень та відстеженням доставки. Повне створення, надсилання та отримання електронної пошти на основі інфраструктури обміну повідомленнями.',
  [ShowcaseStrings.Feat_BrightMail_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_BrightMail_Tech1]: 'RFC 5322',
  [ShowcaseStrings.Feat_BrightMail_Tech2]: 'RFC 2045',
  [ShowcaseStrings.Feat_BrightMail_Tech3]: 'MIME',
  [ShowcaseStrings.Feat_BrightMail_Tech4]: 'Потоки',
  [ShowcaseStrings.Feat_BrightMail_HL1]:
    'Формат інтернет-повідомлень, сумісний з RFC, з підтримкою MIME',
  [ShowcaseStrings.Feat_BrightMail_HL2]:
    'Потоки через заголовки In-Reply-To та References',
  [ShowcaseStrings.Feat_BrightMail_HL3]:
    'Конфіденційність BCC з криптографічно розділеними копіями для кожного одержувача',
  [ShowcaseStrings.Feat_BrightMail_HL4]:
    'Кілька вкладень з підтримкою Content-ID для вбудованих зображень',
  [ShowcaseStrings.Feat_BrightMail_HL5]:
    'Операції вхідних повідомлень: запит, фільтр, сортування, пошук з пагінацією',
  [ShowcaseStrings.Feat_BrightMail_HL6]:
    'Відстеження доставки для кожного одержувача через gossip підтвердження',
  [ShowcaseStrings.Feat_BrightMail_HL7]:
    'Кілька схем шифрування: ECIES, спільний ключ, S/MIME',
  [ShowcaseStrings.Feat_BrightMail_HL8]:
    'Цифрові підписи для автентифікації відправника',
  [ShowcaseStrings.Feat_BrightMail_HL9]:
    'Пересилання/відповідь із заголовками Resent-*, сумісними з RFC',
  [ShowcaseStrings.Feat_BrightCal_Desc]:
    'Система спільного календаря рівня Google Calendar, інтегрована з BrightMail. Сумісна з iCal/CalDAV, наскрізне шифрування подій, гранулярні дозволи спільного доступу, бронювання зустрічей та виявлення конфліктів.',
  [ShowcaseStrings.Feat_BrightCal_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_BrightCal_Tech1]: 'iCal/RFC 5545',
  [ShowcaseStrings.Feat_BrightCal_Tech2]: 'CalDAV',
  [ShowcaseStrings.Feat_BrightCal_Tech3]: 'Шифрування ECIES',
  [ShowcaseStrings.Feat_BrightCal_Tech4]: 'iTIP/iMIP',
  [ShowcaseStrings.Feat_BrightCal_HL1]:
    'Формат iCalendar RFC 5545 з повною підтримкою VEVENT, VTODO, VJOURNAL та VFREEBUSY',
  [ShowcaseStrings.Feat_BrightCal_HL2]:
    'Серверний протокол CalDAV для нативної синхронізації з Apple Calendar, Thunderbird та Android',
  [ShowcaseStrings.Feat_BrightCal_HL3]:
    'Наскрізно зашифровані події, збережені як ECIES-зашифровані блоки у файловій системі без власника',
  [ShowcaseStrings.Feat_BrightCal_HL4]:
    'Гранулярний спільний доступ: перегляд зайнятості, перегляд деталей, редагування або делегування для кожного календаря та користувача',
  [ShowcaseStrings.Feat_BrightCal_HL5]:
    'Запрошення на зустрічі через iTIP/iMIP з інтеграцією BrightMail та відстеженням RSVP',
  [ShowcaseStrings.Feat_BrightCal_HL6]:
    'Виявлення конфліктів та запити доступності між спільними календарями з агрегацією зайнятості',
  [ShowcaseStrings.Feat_BrightCal_HL7]:
    'Сторінки бронювання з налаштовуваними вікнами доступності, буферним часом та потоками підтвердження',
  [ShowcaseStrings.Feat_BrightCal_HL8]:
    'Підтримка повторюваних подій з RRULE, EXDATE та обробкою перевизначень для кожного випадку',
  [ShowcaseStrings.Feat_BrightCal_HL9]:
    'Відображення кількох часових зон з автоматичною обробкою DST та прив\'язкою часової зони для кожної події',
  [ShowcaseStrings.Feat_BrightCal_HL10]:
    'UI-віджети день/тиждень/місяць/порядок денний з перетягуванням для перепланування та вбудованим редагуванням',
  [ShowcaseStrings.Feat_BrightChat_Desc]:
    'Комунікаційна платформа рівня Discord з наскрізним шифруванням рівня Signal. Прямі повідомлення, групові чати та канали з присутністю в реальному часі, індикаторами набору тексту та рольовими дозволами.',
  [ShowcaseStrings.Feat_BrightChat_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_BrightChat_Tech1]: 'Наскрізне шифрування',
  [ShowcaseStrings.Feat_BrightChat_Tech2]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightChat_Tech3]: 'Ротація ключів',
  [ShowcaseStrings.Feat_BrightChat_Tech4]: 'RBAC',
  [ShowcaseStrings.Feat_BrightChat_HL1]:
    'Прямі повідомлення для зашифрованих розмов між двома особами',
  [ShowcaseStrings.Feat_BrightChat_HL2]:
    'Групові чати зі спільним шифруванням та автоматичною ротацією ключів',
  [ShowcaseStrings.Feat_BrightChat_HL3]:
    'Канали з чотирма режимами видимості: публічний/приватний/секретний/невидимий',
  [ShowcaseStrings.Feat_BrightChat_HL4]:
    'Система присутності в реальному часі: онлайн/офлайн/неактивний/не турбувати',
  [ShowcaseStrings.Feat_BrightChat_HL5]:
    'Рольові дозволи: Власник/Адміністратор/Модератор/Учасник',
  [ShowcaseStrings.Feat_BrightChat_HL6]:
    'Індикатори набору тексту, реакції та редагування повідомлень через WebSocket',
  [ShowcaseStrings.Feat_BrightChat_HL7]:
    'Обмежені за часом та використанням токени запрошень для каналів',
  [ShowcaseStrings.Feat_BrightChat_HL8]:
    'Повнотекстовий пошук повідомлень в історії каналу',
  [ShowcaseStrings.Feat_BrightChat_HL9]:
    'Безшовне підвищення розмов від прямих повідомлень до груп',
  [ShowcaseStrings.Feat_BrightPass_Desc]:
    'Менеджер паролів рівня 1Password з архітектурою VCBL для ефективного зашифрованого зберігання облікових даних. TOTP/2FA, виявлення витоків, екстрений доступ та імпорт з основних менеджерів паролів.',
  [ShowcaseStrings.Feat_BrightPass_Cat]: 'Ідентичність',
  [ShowcaseStrings.Feat_BrightPass_Tech1]: 'VCBL',
  [ShowcaseStrings.Feat_BrightPass_Tech2]: 'TOTP',
  [ShowcaseStrings.Feat_BrightPass_Tech3]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_BrightPass_Tech4]: 'Розділення секрету Шаміра',
  [ShowcaseStrings.Feat_BrightPass_HL1]:
    'VCBL (Vault Constituent Block List) для ефективного зашифрованого зберігання',
  [ShowcaseStrings.Feat_BrightPass_HL2]:
    'Кілька типів записів: логін, захищена нотатка, кредитна картка, ідентичність',
  [ShowcaseStrings.Feat_BrightPass_HL3]:
    'Криптографічно безпечна генерація паролів з обмеженнями',
  [ShowcaseStrings.Feat_BrightPass_HL4]:
    'Підтримка TOTP/2FA з генерацією QR-кодів для автентифікаторів',
  [ShowcaseStrings.Feat_BrightPass_HL5]:
    'Виявлення витоків через k-анонімність за допомогою Have I Been Pwned API',
  [ShowcaseStrings.Feat_BrightPass_HL6]:
    'Зашифрований журнал аудиту тільки для додавання для всіх операцій сховища',
  [ShowcaseStrings.Feat_BrightPass_HL7]:
    'Екстрений доступ через розділення секрету Шаміра для відновлення',
  [ShowcaseStrings.Feat_BrightPass_HL8]:
    'Спільне використання сховища кількома учасниками з ECIES шифруванням для кожного одержувача',
  [ShowcaseStrings.Feat_BrightPass_HL9]:
    'Імпорт з 1Password, LastPass, Bitwarden, Chrome, Firefox, KeePass, Dashlane',
  [ShowcaseStrings.Feat_BrightPass_HL10]:
    'API автозаповнення для розширення браузера готовий',
  [ShowcaseStrings.Feat_BrightVote_Desc]:
    'Вибори зі збереженням конфіденційності з використанням гомоморфного шифрування Пайє з ключами, виведеними з ECDH. Підтримує 15+ методів голосування від простого плюрального до складного рейтингового з функціями відповідності державним вимогам.',
  [ShowcaseStrings.Feat_BrightVote_Cat]: 'Управління',
  [ShowcaseStrings.Feat_BrightVote_Tech1]: 'Шифрування Пайє',
  [ShowcaseStrings.Feat_BrightVote_Tech2]: 'ECDH',
  [ShowcaseStrings.Feat_BrightVote_Tech3]: 'Гомоморфна криптографія',
  [ShowcaseStrings.Feat_BrightVote_HL1]:
    'Міст ECDH-Пайє виводить гомоморфні ключі з ключів ECDSA/ECDH',
  [ShowcaseStrings.Feat_BrightVote_HL2]:
    'Агрегація голосів зі збереженням конфіденційності через гомоморфне додавання',
  [ShowcaseStrings.Feat_BrightVote_HL3]:
    '15+ методів голосування: плюральне, схвальне, зважене, Борда, бальне, рейтингове, IRV, STAR, STV, квадратичне, консенсусне тощо',
  [ShowcaseStrings.Feat_BrightVote_HL4]:
    'Класифікації безпеки: повністю гомоморфне, багатораундове, небезпечне',
  [ShowcaseStrings.Feat_BrightVote_HL5]:
    'Відповідність державним вимогам: незмінні журнали аудиту, публічна дошка оголошень, верифіковані квитанції',
  [ShowcaseStrings.Feat_BrightVote_HL6]:
    'Ієрархічна агрегація: Дільниця → Округ → Штат → Національний',
  [ShowcaseStrings.Feat_BrightVote_HL7]:
    '128-бітний рівень безпеки з тестом простоти Міллера-Рабіна (256 раундів)',
  [ShowcaseStrings.Feat_BrightVote_HL8]:
    'Кросплатформний детермінізм (середовища Node.js та браузера)',
  [ShowcaseStrings.Feat_BrightVote_HL9]:
    'Стійкість до атак за часом з операціями постійного часу',
  [ShowcaseStrings.Feat_BrightHub_Desc]:
    'Децентралізована соціальна мережа рівня Twitter з унікальним синтаксисом розмітки іконок FontAwesome. Пости, потоки, прямі повідомлення, списки контактів, хаби для конфіденційності та сповіщення в реальному часі через WebSocket.',
  [ShowcaseStrings.Feat_BrightHub_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_BrightHub_Tech1]: 'WebSocket',
  [ShowcaseStrings.Feat_BrightHub_Tech2]: 'Обмін повідомленнями в реальному часі',
  [ShowcaseStrings.Feat_BrightHub_Tech3]: 'Управління контактами',
  [ShowcaseStrings.Feat_BrightHub_HL1]:
    'Пости з обмеженням 280 символів, markdown та унікальним синтаксисом {{icon}} для FontAwesome',
  [ShowcaseStrings.Feat_BrightHub_HL2]:
    'Потокові розмови з 10-рівневою вкладеністю та ієрархіями відповідей',
  [ShowcaseStrings.Feat_BrightHub_HL3]:
    'Списки контактів, категорії та хаби для організації зв\'язків',
  [ShowcaseStrings.Feat_BrightHub_HL4]:
    'Прямі повідомлення з підтвердженнями прочитання, індикаторами набору тексту та реакціями',
  [ShowcaseStrings.Feat_BrightHub_HL5]:
    'Групові розмови (до 50 учасників) з ролями адміністраторів',
  [ShowcaseStrings.Feat_BrightHub_HL6]:
    'Запити на повідомлення для не-підписників з робочим процесом прийняття/відхилення',
  [ShowcaseStrings.Feat_BrightHub_HL7]:
    'Сповіщення в реальному часі через WebSocket з розумним групуванням',
  [ShowcaseStrings.Feat_BrightHub_HL8]:
    'Налаштування сповіщень: тихі години, режим "не турбувати", налаштування за категоріями',
  [ShowcaseStrings.Feat_BrightHub_HL9]:
    'Захищені акаунти з робочим процесом схвалення запитів на підписку',
  [ShowcaseStrings.Feat_BrightHub_HL10]:
    'Аналітика контактів: розрахунок сили зв\'язку, спільні контакти, рекомендації',
  [ShowcaseStrings.Feat_BrightHub_HL11]:
    'Видимість контенту на основі хабів для приватного обміну в групах',
  [ShowcaseStrings.Feat_BrightHub_HL12]:
    'Форматування тексту з захистом від XSS та підтримкою емодзі',
  [ShowcaseStrings.Feat_Anonymity_Title]: 'Посередницька анонімність та BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_Desc]:
    'Складний механізм конфіденційності, що забезпечує анонімні операції зі збереженням відповідальності. Інформація про ідентичність шифрується та розділяється за допомогою розділення секрету Шаміра, відновлювана лише через консенсус більшості BrightTrust.',
  [ShowcaseStrings.Feat_Anonymity_Cat]: 'Управління',
  [ShowcaseStrings.Feat_Anonymity_Tech1]: 'Розділення секрету Шаміра',
  [ShowcaseStrings.Feat_Anonymity_Tech2]: 'Пряме виправлення помилок',
  [ShowcaseStrings.Feat_Anonymity_Tech3]: 'Консенсус BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL1]:
    'Анонімні публікації з зашифрованою резервною копією ідентичності',
  [ShowcaseStrings.Feat_Anonymity_HL2]:
    'Шарди ідентичності розподілені між ~24 членами BrightTrust',
  [ShowcaseStrings.Feat_Anonymity_HL3]:
    'Для відновлення інформації про ідентичність потрібне голосування більшості',
  [ShowcaseStrings.Feat_Anonymity_HL4]:
    'Обмежена за часом відповідальність — дані закінчуються після строку давності',
  [ShowcaseStrings.Feat_Anonymity_HL5]:
    'Механізм юридичної відповідності для ордерів FISA та судових наказів',
  [ShowcaseStrings.Feat_Anonymity_HL6]:
    'Постійний захист конфіденційності після закінчення періоду',
  [ShowcaseStrings.Feat_Encryption_Title]: 'Передовий стек шифрування',
  [ShowcaseStrings.Feat_Encryption_Desc]:
    'Найсучасніше шифрування, що поєднує ECIES для виведення ключів з AES-256-GCM для безпеки файлів. Повна криптосистема з автентифікацією BIP39/32 та криптографією еліптичних кривих SECP256k1.',
  [ShowcaseStrings.Feat_Encryption_Cat]: 'Криптографія',
  [ShowcaseStrings.Feat_Encryption_Tech1]: 'ECIES',
  [ShowcaseStrings.Feat_Encryption_Tech2]: 'AES-256-GCM',
  [ShowcaseStrings.Feat_Encryption_Tech3]: 'BIP39/32',
  [ShowcaseStrings.Feat_Encryption_Tech4]: 'SECP256k1',
  [ShowcaseStrings.Feat_Encryption_HL1]:
    'Шифрування ECIES з виведенням ключів для кожного користувача',
  [ShowcaseStrings.Feat_Encryption_HL2]:
    'AES-256-GCM для автентифікованого шифрування файлів',
  [ShowcaseStrings.Feat_Encryption_HL3]:
    'Автентифікація на основі мнемоніки BIP39/32',
  [ShowcaseStrings.Feat_Encryption_HL4]:
    'Еліптична крива SECP256k1 (простір ключів, сумісний з Ethereum)',
  [ShowcaseStrings.Feat_Encryption_HL5]:
    'Верифікована цілісність даних на рівні блоків з функціональністю XOR',
  [ShowcaseStrings.Feat_Encryption_HL6]:
    'Кросплатформні криптографічні операції',
  [ShowcaseStrings.Feat_Storage_Title]: 'Децентралізована мережа зберігання',
  [ShowcaseStrings.Feat_Storage_Desc]:
    'Однорангова розподілена файлова система, що монетизує невикористане сховище на персональних пристроях. Архітектура типу IPFS з енергоефективним доказом роботи та стимулами на основі репутації.',
  [ShowcaseStrings.Feat_Storage_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_Storage_Tech1]: 'P2P мережі',
  [ShowcaseStrings.Feat_Storage_Tech2]: 'DHT',
  [ShowcaseStrings.Feat_Storage_Tech3]: 'Реплікація блоків',
  [ShowcaseStrings.Feat_Storage_HL1]:
    'Використання марного простору зберігання на персональних комп\'ютерах та пристроях',
  [ShowcaseStrings.Feat_Storage_HL2]:
    'Розподілена хеш-таблиця (DHT) для ефективного відстеження блоків',
  [ShowcaseStrings.Feat_Storage_HL3]:
    'Налаштовувані вимоги до довговічності та доступності блоків',
  [ShowcaseStrings.Feat_Storage_HL4]:
    'Динамічна реплікація на основі корисності блоків та патернів доступу',
  [ShowcaseStrings.Feat_Storage_HL5]:
    'Енергоефективна альтернатива традиційному майнінгу з доказом роботи',
  [ShowcaseStrings.Feat_Storage_HL6]:
    'Кредити за зберігання та компенсація пропускної здатності для операторів вузлів',
  [ShowcaseStrings.Feat_Sealing_Title]: 'Запечатування документів на основі BrightTrust',
  [ShowcaseStrings.Feat_Sealing_Desc]:
    'Передовий захист документів з налаштовуваними пороговими вимогами для відновлення доступу. Групи можуть запечатувати конфіденційну інформацію, що вимагає налаштовуваного консенсусу більшості для розпечатування.',
  [ShowcaseStrings.Feat_Sealing_Cat]: 'Управління',
  [ShowcaseStrings.Feat_Sealing_Tech1]: 'Порогова криптографія',
  [ShowcaseStrings.Feat_Sealing_Tech2]: 'Розділення секрету',
  [ShowcaseStrings.Feat_Sealing_Tech3]: 'Багатосторонні обчислення',
  [ShowcaseStrings.Feat_Sealing_HL1]:
    'Запечатування документів з налаштовуваними пороговими кворумами (наприклад, 3-з-5, 7-з-10)',
  [ShowcaseStrings.Feat_Sealing_HL2]:
    'Розподілене зберігання шардів серед довірених членів BrightTrust',
  [ShowcaseStrings.Feat_Sealing_HL3]:
    'Математична гарантія безпеки до досягнення порогу',
  [ShowcaseStrings.Feat_Sealing_HL4]:
    'Гнучке розпечатування для юридичної відповідності або групових рішень',
  [ShowcaseStrings.Feat_Sealing_HL5]:
    'Підтримка робочих процесів організаційного управління та відповідності',
  [ShowcaseStrings.Feat_Sealing_HL6]:
    'Закінчення терміну дії за часом для автоматичного захисту конфіденційності',
  [ShowcaseStrings.Feat_BrightID_Desc]:
    'Складне управління ідентичністю, що забезпечує конфіденційність та контроль користувача. Підтримка зареєстрованих псевдонімів, анонімних публікацій та криптографічної верифікації ідентичності.',
  [ShowcaseStrings.Feat_BrightID_Cat]: 'Ідентичність',
  [ShowcaseStrings.Feat_BrightID_Tech1]: 'Інфраструктура відкритих ключів',
  [ShowcaseStrings.Feat_BrightID_Tech2]: 'BIP39/32',
  [ShowcaseStrings.Feat_BrightID_Tech3]: 'Управління ідентичністю',
  [ShowcaseStrings.Feat_BrightID_HL1]:
    'Генерація ідентичності на основі мнемоніки BIP39/32',
  [ShowcaseStrings.Feat_BrightID_HL2]:
    'Кілька зареєстрованих псевдонімів на один обліковий запис',
  [ShowcaseStrings.Feat_BrightID_HL3]:
    'Анонімні публікації з опціональним відновленням ідентичності',
  [ShowcaseStrings.Feat_BrightID_HL4]:
    'Автентифікація на основі відкритого ключа (SECP256k1)',
  [ShowcaseStrings.Feat_BrightID_HL5]:
    'Пряме виправлення помилок для резервного копіювання ідентичності',
  [ShowcaseStrings.Feat_BrightID_HL6]:
    'Верифікація ідентичності зі збереженням конфіденційності',
  [ShowcaseStrings.Feat_Reputation_Title]: 'Репутація та відстеження енергії',
  [ShowcaseStrings.Feat_Reputation_Desc]:
    'Революційна система репутації, що відстежує енергетичні витрати в Джоулях. Добросовісні учасники мають мінімальні вимоги до доказу роботи, тоді як зловмисники стикаються зі збільшеним обчислювальним навантаженням.',
  [ShowcaseStrings.Feat_Reputation_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_Reputation_Tech1]: 'Доказ роботи',
  [ShowcaseStrings.Feat_Reputation_Tech2]: 'Системи репутації',
  [ShowcaseStrings.Feat_Reputation_Tech3]: 'Енергетичний облік',
  [ShowcaseStrings.Feat_Reputation_HL1]:
    'Енергетичні витрати вимірюються в реальних Джоулях для кореляції з реальним світом',
  [ShowcaseStrings.Feat_Reputation_HL2]:
    'Динамічний доказ роботи на основі репутації користувача',
  [ShowcaseStrings.Feat_Reputation_HL3]:
    'Творці контенту винагороджуються, коли їхній контент споживається',
  [ShowcaseStrings.Feat_Reputation_HL4]:
    'Зловмисники обмежуються збільшеними обчислювальними вимогами',
  [ShowcaseStrings.Feat_Reputation_HL5]:
    'Витрати на зберігання та пропускну здатність відстежуються та компенсуються',
  [ShowcaseStrings.Feat_Reputation_HL6]:
    'Стимулює позитивні внески та якісний контент',
  [ShowcaseStrings.Feat_BlockTemp_Title]: 'Температура блоків та життєвий цикл',
  [ShowcaseStrings.Feat_BlockTemp_Desc]:
    'Інтелектуальне управління блоками з рівнями гарячого/холодного зберігання. Часто використовувані блоки залишаються "гарячими" з високою реплікацією, тоді як невикористані блоки охолоджуються та можуть закінчитися.',
  [ShowcaseStrings.Feat_BlockTemp_Cat]: 'Сховище',
  [ShowcaseStrings.Feat_BlockTemp_Tech1]: 'Рівні зберігання',
  [ShowcaseStrings.Feat_BlockTemp_Tech2]: 'Життєвий цикл блоків',
  [ShowcaseStrings.Feat_BlockTemp_Tech3]: 'Патерни доступу',
  [ShowcaseStrings.Feat_BlockTemp_HL1]:
    'Контракти "Зберігати щонайменше до" для мінімальної тривалості зберігання',
  [ShowcaseStrings.Feat_BlockTemp_HL2]:
    'Корисність блоку зростає з доступом, застарілість зменшується',
  [ShowcaseStrings.Feat_BlockTemp_HL3]:
    'Динамічна реплікація на основі патернів доступу та температури',
  [ShowcaseStrings.Feat_BlockTemp_HL4]:
    'Автоматичне продовження контрактів для часто використовуваних блоків',
  [ShowcaseStrings.Feat_BlockTemp_HL5]:
    'Енергетичні кредити повертаються за блоки, що виявилися корисними',
  [ShowcaseStrings.Feat_BlockTemp_HL6]:
    'Налаштовувані вимоги до довговічності та доступності',
  [ShowcaseStrings.Feat_ZeroMining_Title]: 'Нульове марнотратство майнінгу',
  [ShowcaseStrings.Feat_ZeroMining_Desc]:
    'Побудований на основі Ethereum, але спроектований без обмежень доказу роботи. Всі обчислення служать корисним цілям — зберігання, верифікація та мережеві операції.',
  [ShowcaseStrings.Feat_ZeroMining_Cat]: 'Мережа',
  [ShowcaseStrings.Feat_ZeroMining_Tech1]: 'Простір ключів Ethereum',
  [ShowcaseStrings.Feat_ZeroMining_Tech2]: 'Ефективний консенсус',
  [ShowcaseStrings.Feat_ZeroMining_Tech3]: 'Зелений блокчейн',
  [ShowcaseStrings.Feat_ZeroMining_HL1]:
    'Без марнотратного майнінгу — всі обчислення служать корисним цілям',
  [ShowcaseStrings.Feat_ZeroMining_HL2]:
    'Простір ключів та криптографія, сумісні з Ethereum (SECP256k1)',
  [ShowcaseStrings.Feat_ZeroMining_HL3]:
    'Доказ роботи використовується лише для обмеження транзакцій',
  [ShowcaseStrings.Feat_ZeroMining_HL4]:
    'Енергоефективні механізми консенсусу',
  [ShowcaseStrings.Feat_ZeroMining_HL5]:
    'Сталий блокчейн без впливу на довкілля',
  [ShowcaseStrings.Feat_ZeroMining_HL6]:
    'Фокус на зберіганні та обчисленнях, а не штучному дефіциті',
  [ShowcaseStrings.Feat_CrossPlatform_Title]: 'Кросплатформний детермінізм',
  [ShowcaseStrings.Feat_CrossPlatform_Desc]:
    'Ідентичні криптографічні операції в середовищах Node.js та браузера. Детерміністична генерація ключів забезпечує узгоджені результати незалежно від платформи.',
  [ShowcaseStrings.Feat_CrossPlatform_Cat]: 'Криптографія',
  [ShowcaseStrings.Feat_CrossPlatform_Tech1]: 'Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_Tech2]: 'Browser Crypto',
  [ShowcaseStrings.Feat_CrossPlatform_Tech3]: 'Детерміністичні алгоритми',
  [ShowcaseStrings.Feat_CrossPlatform_HL1]:
    'Уніфіковані криптографічні операції на різних платформах',
  [ShowcaseStrings.Feat_CrossPlatform_HL2]:
    'Детерміністична генерація випадкових бітів (HMAC-DRBG)',
  [ShowcaseStrings.Feat_CrossPlatform_HL3]:
    'Узгоджене виведення ключів Пайє з ключів ECDH',
  [ShowcaseStrings.Feat_CrossPlatform_HL4]: 'Сумісність з браузером та Node.js',
  [ShowcaseStrings.Feat_CrossPlatform_HL5]:
    'Відтворювані криптографічні результати',
  [ShowcaseStrings.Feat_CrossPlatform_HL6]:
    'Кросплатформне тестування та верифікація',
  [ShowcaseStrings.Feat_Contracts_Title]: 'Цифрові контракти та управління',
  [ShowcaseStrings.Feat_Contracts_Desc]:
    'Можливості смарт-контрактів для децентралізованих додатків. Управління на основі BrightTrust з налаштовуваними порогами голосування для мережевих рішень та застосування політик.',
  [ShowcaseStrings.Feat_Contracts_Cat]: 'Управління',
  [ShowcaseStrings.Feat_Contracts_Tech1]: 'Смарт-контракти',
  [ShowcaseStrings.Feat_Contracts_Tech2]: 'Управління',
  [ShowcaseStrings.Feat_Contracts_Tech3]: 'Системи голосування',
  [ShowcaseStrings.Feat_Contracts_HL1]:
    'Виконання цифрових контрактів у децентралізованій мережі',
  [ShowcaseStrings.Feat_Contracts_HL2]:
    'Прийняття рішень на основі BrightTrust для мережевого управління',
  [ShowcaseStrings.Feat_Contracts_HL3]:
    'Налаштовувані вимоги більшості для різних дій',
  [ShowcaseStrings.Feat_Contracts_HL4]:
    'Гомоморфне голосування для управління зі збереженням конфіденційності',
  [ShowcaseStrings.Feat_Contracts_HL5]: 'Механізми голосування, зважені за репутацією',
  [ShowcaseStrings.Feat_Contracts_HL6]:
    'Прозорі та перевіряємі процеси управління',
  [ShowcaseStrings.Feat_SecretsJS_Title]: 'Secrets.js (форк)',
  [ShowcaseStrings.Feat_SecretsJS_Desc]:
    'Покращена реалізація розділення секрету Шаміра для безпечного розділення та реконструкції даних. Чистий TypeScript з нативною підтримкою браузера, криптографічно перевірений та оптимізований для розділення будь-якого секрету (паролі, ключі, файли) на шарди з пороговим відновленням.',
  [ShowcaseStrings.Feat_SecretsJS_Cat]: 'Криптографія',
  [ShowcaseStrings.Feat_SecretsJS_Tech1]: 'Розділення секрету Шаміра',
  [ShowcaseStrings.Feat_SecretsJS_Tech2]: 'Безпека даних',
  [ShowcaseStrings.Feat_SecretsJS_Tech3]: 'TypeScript',
  [ShowcaseStrings.Feat_SecretsJS_Tech4]: 'CSPRNG',
  [ShowcaseStrings.Feat_SecretsJS_HL1]:
    'Розділення секретів на n шардів з налаштовуваним пороговим відновленням t-з-n',
  [ShowcaseStrings.Feat_SecretsJS_HL2]:
    'Інформаційно-теоретична безпека — шарди нижче порогу не розкривають жодної інформації',
  [ShowcaseStrings.Feat_SecretsJS_HL3]:
    'Аудит безпеки Cure53 (липень 2019) з нульовою кількістю знайдених проблем',
  [ShowcaseStrings.Feat_SecretsJS_HL4]:
    'Нативна підтримка браузера без поліфілів (crypto.getRandomValues)',
  [ShowcaseStrings.Feat_SecretsJS_HL5]:
    'Кросплатформні детерміністичні операції (Node.js та браузер)',
  [ShowcaseStrings.Feat_SecretsJS_HL6]:
    'Повна підтримка TypeScript з вичерпними визначеннями типів',
  [ShowcaseStrings.Feat_SecretsJS_HL7]:
    'Конвертація паролів, файлів та ключів у/з hex з автоматичним доповненням',
  [ShowcaseStrings.Feat_SecretsJS_HL8]:
    'Динамічна генерація нових шардів з існуючих шардів',
  [ShowcaseStrings.Feat_SecretsJS_HL9]:
    'Налаштовуване поле Галуа (3-20 біт) з підтримкою до 1 048 575 шардів',
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

  // BrightChart (EMR) Feature
  [ShowcaseStrings.Feat_BrightChart_Desc]:
    'Електронна медична картка, що належить пацієнту, побудована на криптографії BrightChain. Ваші медичні дані залишаються вашими — зашифровані, децентралізовані та доступні лише з вашими ключами.',
  [ShowcaseStrings.Feat_BrightChart_Cat]: 'Ідентичність',
  [ShowcaseStrings.Feat_BrightChart_Tech1]: 'EMR без власника',
  [ShowcaseStrings.Feat_BrightChart_Tech2]: 'Наскрізне шифрування',
  [ShowcaseStrings.Feat_BrightChart_Tech3]: 'Контрольований пацієнтом доступ',
  [ShowcaseStrings.Feat_BrightChart_HL1]:
    'Пацієнт володіє та контролює всі медичні записи через криптографічні ключі',
  [ShowcaseStrings.Feat_BrightChart_HL2]:
    'Наскрізно зашифровані медичні дані зберігаються на BrightChain — немає центрального сервера для злому',
  [ShowcaseStrings.Feat_BrightChart_HL3]:
    'Гранулярна згода: діліться конкретними записами з постачальниками через делегування BrightTrust',
  [ShowcaseStrings.Feat_BrightChart_HL4]:
    'Незмінний аудиторський слід для кожного доступу, редагування та події обміну',
  [ShowcaseStrings.Feat_BrightChart_HL5]:
    "Портативність між постачальниками — без прив'язки до вендора, без даних у заручниках",
  [ShowcaseStrings.Feat_BrightChart_HL6]:
    'Екстрений доступ через розділення секрету Шаміра з налаштовуваним кворумом',
  [ShowcaseStrings.Feat_BrightChart_HL7]:
    'Версіонована медична історія з криптографічною перевіркою цілісності',
  [ShowcaseStrings.Feat_BrightChart_HL8]:
    'Підписані постачальником записи гарантують автентичність діагнозів та призначень',
  [ShowcaseStrings.Feat_BrightChart_HL9]:
    'Працює офлайн: зашифровані записи кешуються локально, синхронізуються при підключенні',
  [ShowcaseStrings.Feat_BrightChart_HL10]:
    'Вбудований Digital Burnbag для чутливих записів, що потребують гарантованого знищення',
  [ShowcaseStrings.Feat_BrightChart_HL11]:
    'Інтероперабельний рівень даних, розроблений для FHIR-сумісного обміну медичними записами',
  [ShowcaseStrings.Feat_BrightChart_HL12]:
    'Докази з нульовим розголошенням дозволяють верифікацію страхування без розкриття повної медичної історії',

  // Remaining
  [ShowcaseStrings.Soup_Time]: 'Час',
  [ShowcaseStrings.Soup_AlertRetrieveFailed]:
    'Не вдалося отримати файл: {ERROR}',
  [ShowcaseStrings.Soup_AlertUploadCBLOnly]: 'Будь ласка, завантажте файл .cbl',
  [ShowcaseStrings.Soup_AlertCBLLoaded]:
    'CBL завантажено! Файл: {NAME} ({BLOCKS} блоків). Тепер ви можете отримати файл, якщо всі блоки є в супі.',
  [ShowcaseStrings.Soup_AlertParseCBLFailed]: 'Не вдалося розібрати CBL: {ERROR}',
  [ShowcaseStrings.Soup_AlertReconstructed]:
    'Файл успішно відновлено! Розмір: {SIZE} байт. Файл завантажено.',
  [ShowcaseStrings.Soup_AlertMagnetFailed]:
    'Не вдалося обробити magnet URL: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageSent]: 'Повідомлення надіслано та збережено в супі!',
  [ShowcaseStrings.Soup_AlertSendFailed]: 'Не вдалося надіслати повідомлення: {ERROR}',
  [ShowcaseStrings.Soup_AlertMessageRetrieved]:
    'Повідомлення отримано з супу: {TEXT}',
  [ShowcaseStrings.Soup_AlertRetrieveMessageFailed]:
    'Не вдалося отримати повідомлення: {ERROR}',
  [ShowcaseStrings.Soup_AlertCopied]: 'Magnet URL скопійовано в буфер обміну!',
  [ShowcaseStrings.Anim_PauseBtn]: 'Призупинити анімацію',
  [ShowcaseStrings.Anim_PlayBtn]: 'Відтворити анімацію',
  [ShowcaseStrings.Anim_ResetBtn]: 'Скинути анімацію',
  [ShowcaseStrings.Anim_SpeedLabel]: 'Швидкість: {SPEED}x',
  [ShowcaseStrings.Anim_PerfTitle]: '🔧 Монітор продуктивності',
  [ShowcaseStrings.Anim_PerfFrameRate]: 'Частота кадрів:',
  [ShowcaseStrings.Anim_PerfFrameTime]: 'Час кадру:',
  [ShowcaseStrings.Anim_PerfDropped]: 'Пропущені кадри:',
  [ShowcaseStrings.Anim_PerfMemory]: "Пам'ять:",
  [ShowcaseStrings.Anim_PerfSequences]: 'Послідовності:',
  [ShowcaseStrings.Anim_PerfErrors]: 'Помилки:',
  [ShowcaseStrings.Anim_WhatHappening]: 'Що відбувається:',
  [ShowcaseStrings.Anim_DurationLabel]: 'Тривалість:',
  [ShowcaseStrings.Anim_SizeInfo]: 'Розмір: {SIZE} байт | Блоки: {BLOCKS}',

  // Educational/Encoding
  [ShowcaseStrings.Edu_CloseTooltip]: 'Закрити підказку',
  [ShowcaseStrings.Edu_WhatsHappening]: '🔍 Що відбувається',
  [ShowcaseStrings.Edu_WhyItMatters]: '💡 Чому це важливо',
  [ShowcaseStrings.Edu_TechnicalDetails]: '⚙️ Технічні деталі',
  [ShowcaseStrings.Edu_RelatedConcepts]: '🔗 Пов\'язані концепції',
  [ShowcaseStrings.Edu_VisualCues]: '👁️ Візуальні підказки',
  [ShowcaseStrings.Edu_GetHelp]: 'Отримати допомогу з цим кроком',
  [ShowcaseStrings.Edu_UnderstandContinue]: '✅ Зрозуміло - Продовжити',
  [ShowcaseStrings.Edu_SkipStep]: '⏭️ Пропустити цей крок',
  [ShowcaseStrings.Edu_GlossaryTitle]: '📚 Глосарій концепцій BrightChain',
  [ShowcaseStrings.Edu_CloseGlossary]: 'Закрити глосарій',
  [ShowcaseStrings.Edu_BackToGlossary]: '← Повернутися до глосарію',
  [ShowcaseStrings.Edu_Definition]: 'Визначення',
  [ShowcaseStrings.Edu_TechnicalDefinition]: 'Технічне визначення',
  [ShowcaseStrings.Edu_Examples]: 'Приклади',
  [ShowcaseStrings.Edu_RelatedTerms]: 'Пов\'язані терміни',
  [ShowcaseStrings.Edu_SearchPlaceholder]: 'Пошук концепцій...',
  [ShowcaseStrings.Edu_ProcessOverview]: 'Огляд процесу',
  [ShowcaseStrings.Edu_WhatWeAccomplished]: 'Що ми досягли',
  [ShowcaseStrings.Edu_TechnicalOutcomes]: 'Технічні результати',
  [ShowcaseStrings.Edu_WhatsNext]: 'Що далі?',
  [ShowcaseStrings.Edu_LearningProgress]: 'Прогрес навчання',
  [ShowcaseStrings.Edu_StepsCompleted]:
    '{COMPLETED} з {TOTAL} кроків завершено',
  [ShowcaseStrings.Enc_Title]: '🎬 Анімація кодування файлу',
  [ShowcaseStrings.Enc_Subtitle]:
    'Спостерігайте, як ваш файл перетворюється на блоки BrightChain',
  [ShowcaseStrings.Enc_ChunksTitle]: '📦 Фрагменти файлу ({COUNT})',
  [ShowcaseStrings.Enc_ChunksSubtitle]:
    'Кожен фрагмент стане блоком у супі',
  [ShowcaseStrings.Enc_EduWhatsHappening]: '🎓 Що зараз відбувається',
  [ShowcaseStrings.Enc_TechDetails]: 'Технічні деталі:',
  [ShowcaseStrings.Enc_BlockSizeInfo]: 'Розмір блоку: {SIZE} байт',
  [ShowcaseStrings.Enc_ExpectedChunks]: 'Очікувані фрагменти: {COUNT}',
  [ShowcaseStrings.Enc_ChunkBecomesBlock]:
    'Кожен фрагмент стає блоком у супі',
  [ShowcaseStrings.Enc_WhyPadding]: 'Навіщо доповнення?',
  [ShowcaseStrings.Enc_PaddingSameSize]: 'Усі блоки повинні бути однакового розміру',
  [ShowcaseStrings.Enc_PaddingPreventsAnalysis]:
    'Випадкове доповнення запобігає аналізу даних',
  [ShowcaseStrings.Enc_PaddingRemoved]:
    'Доповнення видаляється під час відновлення',
  [ShowcaseStrings.Enc_ChecksumPurpose]: 'Призначення контрольної суми:',
  [ShowcaseStrings.Enc_EnsuresIntegrity]: 'Забезпечує цілісність даних',
  [ShowcaseStrings.Enc_UniqueIdentifier]: 'Використовується як унікальний ідентифікатор блоку',
  [ShowcaseStrings.Enc_EnablesVerification]:
    'Дозволяє перевірку під час отримання',

  // ProcessCompletionSummary
  [ShowcaseStrings.Edu_KeyLearningPoints]: '🧠 Ключові навчальні моменти',
  [ShowcaseStrings.Edu_CloseSummary]: 'Закрити підсумок',
  [ShowcaseStrings.Edu_Overview]: 'Огляд',
  [ShowcaseStrings.Edu_Achievements]: 'Досягнення',
  [ShowcaseStrings.Edu_Technical]: 'Технічне',
  [ShowcaseStrings.Edu_NextSteps]: 'Наступні кроки',
  [ShowcaseStrings.Edu_Previous]: '← Назад',
  [ShowcaseStrings.Edu_Next]: 'Далі →',
  [ShowcaseStrings.Edu_Finish]: 'Завершити',

  // EducationalModeControls
  [ShowcaseStrings.Edu_EducationalMode]: '🎓 Навчальний режим',
  [ShowcaseStrings.Edu_AnimationSpeed]: 'Швидкість анімації:',
  [ShowcaseStrings.Edu_SpeedVerySlow]: '0.25x (Дуже повільно)',
  [ShowcaseStrings.Edu_SpeedSlow]: '0.5x (Повільно)',
  [ShowcaseStrings.Edu_SpeedModerate]: '0.75x (Помірно)',
  [ShowcaseStrings.Edu_SpeedNormal]: '1x (Нормально)',
  [ShowcaseStrings.Edu_SpeedFast]: '1.5x (Швидко)',
  [ShowcaseStrings.Edu_SpeedVeryFast]: '2x (Дуже швидко)',
  [ShowcaseStrings.Edu_StepByStep]: 'Покроковий режим',
  [ShowcaseStrings.Edu_ShowTooltips]: 'Показати підказки',
  [ShowcaseStrings.Edu_ShowExplanations]: 'Показати пояснення',
  [ShowcaseStrings.Edu_AutoAdvance]: 'Автоматичне просування кроків',

  // Privacy Policy Page
  [ShowcaseStrings.PP_Title]: 'Політика конфіденційності',
  [ShowcaseStrings.PP_LastUpdated]: 'Останнє оновлення: 20 квітня 2026',
  [ShowcaseStrings.PP_BackToHome]: '← Повернутися на головну',

  // Section 1: Introduction
  [ShowcaseStrings.PP_S1_Title]: '1. Вступ',
  [ShowcaseStrings.PP_S1_P1]:
    'BrightChain — це децентралізована платформа з відкритим кодом, яку експлуатує Digital Defiance, некомерційна організація 501(c)(3) («ми» або «наш»). Ця Політика конфіденційності описує, як ми збираємо, використовуємо, зберігаємо та розкриваємо інформацію, коли ви використовуєте платформу BrightChain, веб-сайт, додатки та пов\'язані послуги (разом — «Послуги»).',
  [ShowcaseStrings.PP_S1_P2]:
    'Отримуючи доступ до Послуг або використовуючи їх, ви підтверджуєте, що прочитали, зрозуміли та погоджуєтесь дотримуватися цієї Політики конфіденційності. Якщо ви не згодні, ви не повинні використовувати Послуги.',

  // Section 2: How BrightChain Works
  [ShowcaseStrings.PP_S2_Title]:
    '2. Як працює BrightChain — Архітектурний контекст',
  [ShowcaseStrings.PP_S2_P1]:
    'BrightChain побудований на моделі файлової системи без власника (OFF). Усі дані, що зберігаються в мережі, розбиваються на блоки фіксованого розміру, піддаються XOR з криптографічно випадковими блоками (процес, який називається «TUPLE-відбілювання») і розподіляються між вузлами-учасниками. В результаті:',
  [ShowcaseStrings.PP_S2_Li1]:
    'Окремі блоки не відрізняються від випадкових даних і не можуть бути прочитані без повного набору складових блоків та відповідного Списку складових блоків (CBL).',
  [ShowcaseStrings.PP_S2_Li2]:
    'Дані можуть бути додатково зашифровані за допомогою схеми інтегрованого шифрування на еліптичних кривих (ECIES) з використанням AES-256-GCM, забезпечуючи конфіденційність для кожного отримувача на додаток до правдоподібного заперечення, що забезпечується TUPLE-відбілюванням.',
  [ShowcaseStrings.PP_S2_Li3]:
    'Оператори вузлів — включаючи Digital Defiance — як правило, не можуть визначити вміст, власність або характер будь-якого окремого блоку, що зберігається в мережі.',
  [ShowcaseStrings.PP_S2_P2]:
    'Ця архітектура означає, що захист конфіденційності, описаний у цій політиці, у багатьох випадках забезпечується математикою, а не лише політикою.',

  // Section 3: Information We Collect
  [ShowcaseStrings.PP_S3_Title]: '3. Інформація, яку ми збираємо',
  [ShowcaseStrings.PP_S3_1_Title]: '3.1 Інформація облікового запису',
  [ShowcaseStrings.PP_S3_1_P1]:
    'Коли ви створюєте обліковий запис BrightChain, ми збираємо ім\'я користувача, адресу електронної пошти та ваш публічний криптографічний ключ (отриманий з вашого мнемоніка BIP39). Ми не збираємо, не зберігаємо і не маємо доступу до вашої мнемонічної фрази або приватних ключів.',
  [ShowcaseStrings.PP_S3_2_Title]: '3.2 Контент, створений користувачем',
  [ShowcaseStrings.PP_S3_2_P1]:
    'Файли, повідомлення, облікові дані та інший контент, який ви зберігаєте в мережі, розбиваються на TUPLE-відбілені блоки. Ми не маємо можливості читати, реконструювати або перевіряти цей контент. Якщо ви використовуєте додаткове шифрування ECIES, контент додатково шифрується для конкретних отримувачів і є недоступним для будь-кого — включаючи нас — без відповідного приватного ключа.',
  [ShowcaseStrings.PP_S3_3_Title]: '3.3 Автоматично зібрана інформація',
  [ShowcaseStrings.PP_S3_3_P1]:
    'Коли ви взаємодієте з нашими веб-сервісами, ми можемо автоматично збирати стандартні дані журналів сервера, включаючи IP-адреси, тип браузера, URL-адреси переходу, відвідані сторінки та мітки часу. Ця інформація використовується виключно для операційних цілей (моніторинг безпеки, запобігання зловживанням та надійність сервісу) і зберігається не більше 90 днів.',
  [ShowcaseStrings.PP_S3_4_Title]: '3.4 Записи блокчейн-реєстру',
  [ShowcaseStrings.PP_S3_4_P1]:
    'Певні операції (створення сховищ, читання сховищ, знищення сховищ, голосування з управління) записуються в блокчейн-реєстр, що працює лише на додавання. Ці записи містять тип операції, мітку часу та криптографічні хеші — а не вміст базових даних. Записи реєстру є незмінними за конструкцією і не можуть бути видалені.',

  // Section 4: How We Use Information
  [ShowcaseStrings.PP_S4_Title]: '4. Як ми використовуємо інформацію',
  [ShowcaseStrings.PP_S4_P1]: 'Ми використовуємо зібрану інформацію для:',
  [ShowcaseStrings.PP_S4_Li1]: 'Надання, підтримки та покращення Послуг',
  [ShowcaseStrings.PP_S4_Li2]:
    'Автентифікації користувачів та управління обліковими записами',
  [ShowcaseStrings.PP_S4_Li3]:
    'Виявлення та запобігання шахрайству, зловживанням та інцидентам безпеки',
  [ShowcaseStrings.PP_S4_Li4]:
    'Дотримання застосовних правових зобов\'язань',
  [ShowcaseStrings.PP_S4_Li5]:
    'Зв\'язку з вами щодо Послуг (наприклад, оголошення про сервіс, сповіщення про безпеку)',
  [ShowcaseStrings.PP_S4_P2]:
    'Ми не продаємо, не здаємо в оренду і не обмінюємо вашу особисту інформацію з третіми сторонами. Ми не використовуємо ваші дані для реклами або профілювання.',

  // Section 5: Data Storage and Security
  [ShowcaseStrings.PP_S5_Title]: '5. Зберігання та безпека даних',
  [ShowcaseStrings.PP_S5_P1]:
    'Контент, створений користувачем, зберігається у вигляді TUPLE-відбілених блоків, розподілених по децентралізованій мережі. Метадані облікового запису (ім\'я користувача, електронна пошта, публічний ключ) зберігаються в наших операційних базах даних із заходами безпеки, що відповідають галузевим стандартам, включаючи шифрування в стані спокою та при передачі.',
  [ShowcaseStrings.PP_S5_P2]:
    'Після збереження даних у вигляді відбілених блоків та їх розподілу по мережі дані інших учасників можуть стати залежними від тих самих блоків через процес XOR-відбілювання. Це означає, що видалення окремих блоків може бути технічно неможливим без впливу на дані інших користувачів. Однак для відновлення файлу потрібен Список Складових Блоків (CBL) — впорядкований рецепт ідентифікаторів блоків. Без CBL розподілені блоки обчислювально не відрізняються від випадкових даних і не можуть бути повторно зібрані. Видалення або знищення CBL достатньо для того, щоб зробити базові дані назавжди недоступними.',
  [ShowcaseStrings.PP_S5_P3]:
    'CBL можуть зберігатися в різних місцях залежно від застосунку. Digital Burnbag зберігає CBL у своїй системі сховищ, підкріпленій BrightDB. Користувачі також можуть зберігати CBL як посилання MagnetURL. У всіх випадках знищення CBL — незалежно від місця зберігання — є ефективним механізмом видалення даних, навіть коли базові блоки залишаються в мережі.',

  // Section 6: Cryptographic Protections
  [ShowcaseStrings.PP_S6_Title]:
    '6. Криптографічний захист та обмеження',
  [ShowcaseStrings.PP_S6_P1]:
    'BrightChain використовує потужний криптографічний захист, включаючи хешування SHA3-512, ECIES з secp256k1, симетричне шифрування AES-256-GCM, печатки HMAC-SHA3-512 та гомоморфне шифрування Пайє для голосування зі збереженням конфіденційності. Ці засоби захисту забезпечуються протоколом і не залежать від нашої співпраці чи доброї волі.',
  [ShowcaseStrings.PP_S6_P2]:
    'При правильному використанні BrightChain може забезпечити дуже потужний захист конфіденційності. Однак ми не гарантуємо, що будь-який конкретний криптографічний алгоритм залишатиметься безпечним нескінченно. Досягнення в обчислювальній техніці (включаючи квантові обчислення) можуть вплинути на безпеку поточних криптографічних примітивів. Користувачі несуть відповідальність за розуміння доступних їм засобів захисту та відповідне налаштування використання Послуг.',

  // Section 7: Law Enforcement
  [ShowcaseStrings.PP_S7_Title]:
    '7. Правоохоронні органи та правові запити',
  [ShowcaseStrings.PP_S7_P1]:
    'Digital Defiance діє як мережевий оператор та постачальник інфраструктури. Ми виконуємо дійсні правові процедури, включаючи повістки, судові накази та ордери на обшук, видані судами компетентної юрисдикції, в межах технічної можливості.',
  [ShowcaseStrings.PP_S7_P2]:
    'Однак через архітектурний дизайн BrightChain:',
  [ShowcaseStrings.PP_S7_Li1]:
    'Ми, як правило, не можемо надати вміст даних, створених користувачем та збережених у вигляді TUPLE-відбілених блоків, оскільки не володіємо CBL або ключами дешифрування, необхідними для реконструкції або дешифрування цих даних.',
  [ShowcaseStrings.PP_S7_Li2]:
    'Ми можемо надати метадані облікового запису (ім\'я користувача, електронну пошту, публічний ключ) та дані журналів сервера в межах їх зберігання.',
  [ShowcaseStrings.PP_S7_Li3]:
    'Записи блокчейн-реєстру є незмінними і можуть бути надані у відповідь на дійсну правову процедуру.',
  [ShowcaseStrings.PP_S7_Li4]:
    'Якщо сховище Digital Burnbag було криптографічно знищено, доказ знищення є єдиним залишковим артефактом — він доводить, що дані зникли, а не те, що вони містили.',
  [ShowcaseStrings.PP_S7_P3]:
    'Ми повідомимо постраждалих користувачів про правові запити в межах, дозволених законом. Ми залишаємо за собою право оскаржувати правові запити, які вважаємо надмірно широкими, юридично недостатніми або іншим чином неналежними.',

  // Section 8: Brokered Anonymity
  [ShowcaseStrings.PP_S8_Title]: '8. Посередницька анонімність',
  [ShowcaseStrings.PP_S8_P1]:
    'BrightChain підтримує протокол «Посередницької анонімності», в якому справжня особа користувача може бути запечатана за допомогою схеми розділення секрету Шаміра та розподілена серед членів управління BrightTrust. Відновлення особи вимагає порогового голосування членів BrightTrust і підлягає налаштовуваному строку давності, після якого фрагменти особи назавжди видаляються, а справжня особа стає невідновлюваною. Цей механізм розроблений для балансування конфіденційності з підзвітністю під колективним управлінням.',

  // Section 9: Third-Party Services
  [ShowcaseStrings.PP_S9_Title]: '9. Послуги третіх сторін',
  [ShowcaseStrings.PP_S9_P1]:
    'Певні функції (такі як моніторинг активності протоколу канарки) можуть інтегруватися з послугами третіх сторін (наприклад, GitHub, Fitbit, Slack). Використання вами цих інтеграцій регулюється відповідними політиками конфіденційності третіх сторін. Ми отримуємо доступ лише до мінімальної інформації, необхідної для надання запитуваної функціональності (наприклад, мітки часу нещодавньої активності для моніторингу перемикача мертвої людини) і не зберігаємо облікові дані третіх сторін на наших серверах — автентифікація здійснюється через токени OAuth, які ви можете відкликати в будь-який час.',

  // Section 10: Children's Privacy
  [ShowcaseStrings.PP_S10_Title]: '10. Конфіденційність дітей',
  [ShowcaseStrings.PP_S10_P1]:
    'Послуги не призначені для дітей віком до 13 років (або відповідного віку цифрової згоди у вашій юрисдикції). Ми свідомо не збираємо особисту інформацію від дітей. Якщо ми дізнаємося, що зібрали особисту інформацію від дитини, ми вживемо заходів для негайного видалення цієї інформації.',

  // Section 11: International Users
  [ShowcaseStrings.PP_S11_Title]: '11. Міжнародні користувачі',
  [ShowcaseStrings.PP_S11_P1]:
    'Digital Defiance базується в Сполучених Штатах. Якщо ви отримуєте доступ до Послуг з-за меж Сполучених Штатів, ваша інформація може бути передана, збережена та оброблена в Сполучених Штатах або інших юрисдикціях, де працює наша інфраструктура. Використовуючи Послуги, ви погоджуєтесь на таку передачу та обробку.',
  [ShowcaseStrings.PP_S11_1_Title]:
    '11.1 Європейський економічний простір (ЄЕП) та Сполучене Королівство',
  [ShowcaseStrings.PP_S11_1_P1]:
    'Якщо ви перебуваєте в ЄЕП або Сполученому Королівстві, ви можете мати права відповідно до Загального регламенту захисту даних (GDPR) або GDPR Великобританії, включаючи право на доступ, виправлення, видалення, обмеження обробки та перенесення ваших персональних даних, а також право на заперечення проти обробки. Для реалізації цих прав зв\'яжіться з нами за адресою нижче. Зверніть увагу, що певні дані (записи блокчейн-реєстру, розподілені TUPLE-блоки) можуть бути технічно неможливими для видалення через децентралізовану та незмінну природу системи. Можливість доказового знищення BrightChain (через Digital Burnbag) розроблена для підтримки відповідності праву на видалення за статтею 17 GDPR для даних, контрольованих користувачем.',

  // Section 12: Data Retention
  [ShowcaseStrings.PP_S12_Title]: '12. Зберігання даних',
  [ShowcaseStrings.PP_S12_P1]:
    'Метадані облікового запису зберігаються, поки ваш обліковий запис активний або за потреби для надання Послуг. Журнали сервера зберігаються до 90 днів. Записи блокчейн-реєстру зберігаються безстроково як частина незмінного реєстру. TUPLE-відбілені блоки зберігаються в мережі відповідно до умов контракту на зберігання та економіки енергетичного балансу; блоки, контракти на зберігання яких закінчуються і не поновлюються, можуть бути зібрані вузлами.',

  // Section 13: Disclaimer
  [ShowcaseStrings.PP_S13_Title]:
    '13. Відмова від гарантій та обмеження відповідальності',
  [ShowcaseStrings.PP_S13_P1]:
    'ПОСЛУГИ НАДАЮТЬСЯ «ЯК Є» ТА «ЗА НАЯВНОСТІ» БЕЗ БУДЬ-ЯКИХ ГАРАНТІЙ, ЯВНИХ, НЕЯВНИХ АБО ПЕРЕДБАЧЕНИХ ЗАКОНОМ, ВКЛЮЧАЮЧИ, АЛЕ НЕ ОБМЕЖУЮЧИСЬ, НЕЯВНІ ГАРАНТІЇ ТОВАРНОЇ ПРИДАТНОСТІ, ПРИДАТНОСТІ ДЛЯ КОНКРЕТНОЇ МЕТИ, ПРАВА ВЛАСНОСТІ ТА НЕПОРУШЕННЯ ПРАВ.',
  [ShowcaseStrings.PP_S13_P2]:
    'DIGITAL DEFIANCE, ЙОГО ПОСАДОВІ ОСОБИ, ДИРЕКТОРИ, ПРАЦІВНИКИ, ВОЛОНТЕРИ ТА УЧАСНИКИ (ВКЛЮЧАЮЧИ JESSICA MULEIN) НЕ НЕСУТЬ ВІДПОВІДАЛЬНОСТІ ЗА БУДЬ-ЯКІ НЕПРЯМІ, ВИПАДКОВІ, СПЕЦІАЛЬНІ, НАСЛІДКОВІ АБО ШТРАФНІ ЗБИТКИ, АБО БУДЬ-ЯКУ ВТРАТУ ПРИБУТКУ, ДАНИХ, ВИКОРИСТАННЯ, ДІЛОВОЇ РЕПУТАЦІЇ АБО ІНШИХ НЕМАТЕРІАЛЬНИХ ВТРАТ, ЩО ВИНИКАЮТЬ ВНАСЛІДОК (A) ВАШОГО ДОСТУПУ АБО ВИКОРИСТАННЯ АБО НЕМОЖЛИВОСТІ ДОСТУПУ АБО ВИКОРИСТАННЯ ПОСЛУГ; (B) БУДЬ-ЯКОЇ ПОВЕДІНКИ АБО КОНТЕНТУ ТРЕТІХ ОСІБ У ПОСЛУГАХ; (C) БУДЬ-ЯКОГО КОНТЕНТУ, ОТРИМАНОГО З ПОСЛУГ; (D) НЕСАНКЦІОНОВАНОГО ДОСТУПУ, ВИКОРИСТАННЯ АБО ЗМІНИ ВАШИХ ПЕРЕДАЧ АБО КОНТЕНТУ; АБО (E) ЗБОЮ БУДЬ-ЯКОГО КРИПТОГРАФІЧНОГО МЕХАНІЗМУ, НЕЗАЛЕЖНО ВІД ТОГО, ЧИ БАЗУЄТЬСЯ ЦЕ НА ГАРАНТІЇ, КОНТРАКТІ, ДЕЛІКТІ (ВКЛЮЧАЮЧИ НЕДБАЛІСТЬ) АБО БУДЬ-ЯКІЙ ІНШІЙ ПРАВОВІЙ ТЕОРІЇ, НЕЗАЛЕЖНО ВІД ТОГО, ЧИ БУЛИ МИ ПОІНФОРМОВАНІ ПРО МОЖЛИВІСТЬ ТАКОГО ЗБИТКУ.',
  [ShowcaseStrings.PP_S13_P3]:
    'У ЖОДНОМУ ВИПАДКУ СУКУПНА ВІДПОВІДАЛЬНІСТЬ DIGITAL DEFIANCE ТА ЙОГО ПОСАДОВИХ ОСІБ, ДИРЕКТОРІВ, ПРАЦІВНИКІВ, ВОЛОНТЕРІВ ТА УЧАСНИКІВ ЗА ВСІ ПРЕТЕНЗІЇ, ПОВ\'ЯЗАНІ З ПОСЛУГАМИ, НЕ ПЕРЕВИЩУВАТИМЕ БІЛЬШУ З ДВОХ СУМ: СТО ДОЛАРІВ США (100,00 ДОЛАРІВ США) АБО СУМУ, ЯКУ ВИ СПЛАТИЛИ НАМ ПРОТЯГОМ ДВАНАДЦЯТИ (12) МІСЯЦІВ, ЩО ПЕРЕДУЮТЬ ПРЕТЕНЗІЇ.',
  [ShowcaseStrings.PP_S13_P4]:
    'ДЕЯКІ ЮРИСДИКЦІЇ НЕ ДОЗВОЛЯЮТЬ ВИКЛЮЧЕННЯ АБО ОБМЕЖЕННЯ ПЕВНИХ ГАРАНТІЙ АБО ВІДПОВІДАЛЬНОСТІ. У ТАКИХ ЮРИСДИКЦІЯХ НАША ВІДПОВІДАЛЬНІСТЬ ОБМЕЖУЄТЬСЯ МАКСИМАЛЬНОЮ МІРОЮ, ДОЗВОЛЕНОЮ ЗАКОНОМ.',

  // Section 14: Indemnification
  [ShowcaseStrings.PP_S14_Title]: '14. Відшкодування',
  [ShowcaseStrings.PP_S14_P1]:
    'Ви погоджуєтесь відшкодувати, захищати та звільняти від відповідальності Digital Defiance, його посадових осіб, директорів, працівників, волонтерів та учасників (включаючи Jessica Mulein) від і проти всіх претензій, зобов\'язань, збитків, втрат, витрат та видатків (включаючи розумні гонорари адвокатів), що виникають з або будь-яким чином пов\'язані з вашим доступом або використанням Послуг, вашим порушенням цієї Політики конфіденційності або вашим порушенням будь-якого застосовного закону чи прав будь-якої третьої сторони.',

  // Section 15: Governing Law
  [ShowcaseStrings.PP_S15_Title]:
    '15. Застосовне право та вирішення спорів',
  [ShowcaseStrings.PP_S15_P1]:
    'Ця Політика конфіденційності регулюється та тлумачиться відповідно до законів штату Вашингтон, Сполучені Штати, без урахування його положень про колізію законів. Будь-який спір, що виникає з або пов\'язаний з цією Політикою конфіденційності або Послугами, вирішується виключно в державних або федеральних судах, розташованих у окрузі Кінг, Вашингтон, і ви погоджуєтесь з персональною юрисдикцією таких судів.',

  // Section 16: Open Source
  [ShowcaseStrings.PP_S16_Title]: '16. Відкритий код',
  [ShowcaseStrings.PP_S16_P1_Before]:
    'BrightChain — це програмне забезпечення з відкритим кодом. Вихідний код публічно доступний за адресою ',
  [ShowcaseStrings.PP_S16_P1_LinkText]:
    'github.com/Digital-Defiance/BrightChain',
  [ShowcaseStrings.PP_S16_P1_After]:
    '. Ми заохочуємо вас переглянути код для перевірки властивостей конфіденційності, описаних у цій політиці. Криптографічний захист, описаний у цьому документі, реалізований у кодовій базі та може бути перевірений шляхом інспекції.',

  // Section 17: Changes
  [ShowcaseStrings.PP_S17_Title]: '17. Зміни до цієї політики',
  [ShowcaseStrings.PP_S17_P1]:
    'Ми можемо час від часу оновлювати цю Політику конфіденційності. Ми повідомимо вас про суттєві зміни, опублікувавши оновлену політику в Послугах з переглянутою датою «Останнє оновлення». Ваше подальше використання Послуг після дати набрання чинності будь-яких змін означає вашу згоду з переглянутою політикою.',

  // Section 18: Contact
  [ShowcaseStrings.PP_S18_Title]: '18. Зв\'яжіться з нами',
  [ShowcaseStrings.PP_S18_P1]:
    'Якщо у вас є запитання щодо цієї Політики конфіденційності або ви бажаєте скористатися своїми правами на захист даних, будь ласка, зверніться:',
  [ShowcaseStrings.PP_S18_OrgName]: 'Digital Defiance',
  [ShowcaseStrings.PP_S18_EmailLabel]: 'Електронна пошта:',
  [ShowcaseStrings.PP_S18_WebLabel]: 'Веб:',
};

export default ShowcaseUkrainianStrings;
