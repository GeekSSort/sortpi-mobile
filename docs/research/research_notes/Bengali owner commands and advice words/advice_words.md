# Bangladeshi shop owners asking for advice or a decision (Bangla and Banglish): marker words, topics, and what a data-backed assistant can answer

Method note. About 15 tool calls. WebSearch is US-centred and returns AI-written summaries; most Bangla queries returned generic or Indian material. I opened 5 pages in full (marked "opened"). Everything from a search summary only is marked (uncertain: search summary only). Everything else is [MK] = model knowledge, not source-backed. I found NO corpus of real shopkeeper messages, no Facebook-group threads, no YouTube title lists and no Bangladesh Bank / SME Foundation / BSCIC / Daraz / bKash guide I could open. All phrase lists below are therefore [MK] unless a source is cited. No business, financial or legal advice is given here; this is vocabulary only.

Notation: Bangla script / Banglish (common spellings, typos separated by "~"). "BD" = Bangladesh, "WB" = West Bengal / India.

---

## Q1. What are the grammatical markers of advice-seeking in Bangla (future-interrogative "korbo ki?", "uchit", "bhalo hobe") and their Banglish spellings?

### Takeaway
Advice-seeking is mostly carried by a first-person future verb plus a yes/no or choice question ("kinbo ki?", "dibo na ki?"), or by an evaluative predicate ("uchit", "bhalo hobe", "labh hobe", "thik hobe"), often softened by hedges ("mone hoy", "bolen to"). I could not find a source that describes these constructions; the list is [MK] and should be validated on real owner messages. The biggest parsing trap is ki/kee: one Banglish spelling covers both "what" (কী) and the yes/no particle (কি).

### Cited Findings
- A Bangladeshi e-commerce intent dataset (BanglaEComIntent, 15 intents incl. out_of_scope, discount_offer, price_inquiry) contains NO advice/recommendation/"should I" intent and no such example utterances; its card says Banglish has no standard orthography and shows variants such as "kmon" for "kemon" and "kotodam" for "koto dam" (word boundary dropped). — [BanglaEComIntent](https://huggingface.co/datasets/Badhon/BanglaEComIntent) (opened)
- Same dataset: price questions are written like "ei t-shirt tar price koto" and "assalamu alaikum vai ei saree tar dam koto", i.e. a greeting plus "vai" often precedes the question. — [BanglaEComIntent](https://huggingface.co/datasets/Badhon/BanglaEComIntent) (opened)
- A Rasa-based Bangla "business assistant" paper handles Bangla and Bangla-in-English-letters, but its abstract lists no intents or example utterances and says annotated data was not available for the purpose. — [arXiv 2107.05541](https://arxiv.org/abs/2107.05541v4) (opened, abstract only)
- FSI-style Bengali course material gives the "ki + verb" offer/question frames: "Ki korte pari?" (what can I do), "Ami ki korte pari?", "Apni ki ... parben?", "Doya kore ... din / korun" (please give/do), "Jodi apni paren, ekhane bosun". It has no explicit "shall I / should" frames, and it does not say which dialect it teaches. — [FSI Bengali ch.6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/) (opened)
- Search summary of FSI materials lists future forms korbo (I), korbe (informal you), korben (formal you). — [FSI Bengali ch.23](https://www.fsi-language-courses.org/fsi-bengali-course/23-future-plans-and-intentions/) (uncertain: search summary only)
- A Bangla small-business tips page (Khatabook, an Indian publisher) uses "পরামর্শ করে নিতে পারো" and the heading "টিপস"; so "poramorsho" and the English loan "tips" are both normal in published Bangla. — [Khatabook bn](https://khatabook.com/blog/bn/%E0%A6%9B%E0%A7%8B%E0%A6%9F-%E0%A6%AC%E0%A7%8D%E0%A6%AF%E0%A6%AC%E0%A6%B8%E0%A6%BE%E0%A6%AF%E0%A6%BC%E0%A7%87%E0%A6%B0-%E0%A6%9F%E0%A6%BF%E0%A6%AA%E0%A6%B8/) (opened; WB/India register, flag)

### Inferences
All [MK] unless stated.

**1. Core advice frame: 1st-person future + ki/na ki (shall I / should I)**

| Bangla | Banglish (spellings / typos) | Note |
|---|---|---|
| করব কি? / করবো কি? | korbo ki ~ korbo ki? ~ korbu ki ~ krbo ki ~ korbo kee | "shall I do it?" |
| কিনব কি? | kinbo ki ~ kinbo ki? ~ kinbu ki ~ kinmu ki | buy? |
| রাখব কি? | rakhbo ki ~ rakbo ki ~ rakhbo ki | keep/stock? |
| দিব কি? / দেব কি? | dibo ki ~ debo ki ~ dibo ki ~ dimu ki | give/offer? BD usually দিব, WB usually দেব |
| বাড়াব কি? / কমাব কি? | barabo ki ~ barbo ki / komabo ki ~ kombo ki | raise/lower (price) |
| দিব না কি? / দিব নাকি? | dibo na ki ~ dibo naki | "or should I?" (alternative) |
| করব না? | korbo na? | tag-question form, seeks agreement |

- Eastern/southern colloquial first-person future ends in -মু: করমু, দিমু, কিনমু, রাখমু = kormu ~ korumu / dimu / kinmu / rakhmu. Dhaka/Mymensingh/Barisal/Noakhali-type speech [MK, region list uncertain]. Chittagong and Sylhet have their own forms (uncertain, not verified). Must be in the normaliser; voice-to-text may output either.
- BD spelling "দিব/নিব" vs WB "দেব/নেব": treat as the same word (dibo = debo, nibo = nebo).
- ki-position heuristic [MK, unverified on real data]: wh-"what" (কী) sits just before the verb ("ki kinbo", "ki ki kinbo", "ki korbo"); yes/no "ki" (কি) sits after the verb or at the end ("kinbo ki", "korbo ki"). Spoken/typed Banglish does not distinguish them, and users often write কি for both. "ki korbo" = what shall I do; "korbo ki" = shall I do it. Both are advice-seeking, but the first asks for an option list and the second for yes/no.

**2. Evaluative / necessity predicates**

| Bangla | Banglish | Meaning |
|---|---|---|
| করা উচিত | kora uchit ~ kora ucit ~ kora ochit | ought to do |
| উচিত হবে কি? / ঠিক হবে কি? | uchit hobe ki / thik hobe ki ~ thik hobe ki | would it be right |
| ভালো হবে কি? / ভালো হবে? | bhalo hobe ki ~ valo hobe ki ~ balo hobe | would it be good |
| লাভ হবে? | labh hobe ~ laabh hobe ~ lav hobe ~ lab hobe | will it profit |
| চলবে কি? / চলবে? | cholbe ki | will it be OK / work |
| কী করা দরকার? / কী করা লাগবে? | ki kora dorkar ~ ki kora drkar ~ ki kora lagbe | what is needed |
| কী করলে ভালো হয়? | ki korle bhalo hoy ~ ki korle valo hoi | what would be best |
| কী করা যায়? | ki kora jay ~ ki kora jai | what can be done |
| কী করি? / কী করব বুঝতে পারছি না | ki kori / ki korbo bujhte parchi na ~ bujhte partesi na ~ bujhtechi na | stuck, wants options |
| কোনটা ভালো? / কোনটা নিব? | konta bhalo / konta nibo | choose between |
| A নাকি B? | A naki B ~ A na ki B | either/or (strong choice signal) |

- Banglish trap: "lobh" in a business sentence is almost certainly a typo for labh (লাভ). লোভ (greed) is the real word spelled "lobh"; the user's own brief used "lobh beshi" for profit. Map to labh unless context is moral.
- Trap: "kam/kom" (কম = less) vs "kaj/kam" (কাজ/কাম = work): "kom" is the usual Banglish for কম.
- Trap: "dite hobe / dewa lagbe / dewar kotha" (must give, owed) is an obligation lookup (e.g. supplier dues), not a "shall I give?" question. The decisive marker is 1st-person -bo/-mu + ki/na ki versus -te hobe / -a lagbe.

**3. Hedges, politeness, requests for advice** (the "wrapper"; it does NOT decide the intent by itself)

| Bangla | Banglish | Note |
|---|---|---|
| মনে হয় / আপনার কী মনে হয়? | mone hoy ~ mone hoi / apnar ki mone hoy ~ apnar ki mone hoi | opinion request |
| বলেন তো / বলো তো | bolen to ~ bolen to ~ bolun to | "tell me" - can wrap a DATA question too ("bolen to koto baki ache") |
| একটু বুঝিয়ে দেন / বুঝিয়ে বলেন | ektu bujhiye den ~ bujhaiya bolen ~ bujhiye bolen | explain; signals explanation, not necessarily advice |
| ভাই একটা পরামর্শ দেন | bhai ekta poramorsho den ~ vai ekta paramarsho den ~ poramorsh den | direct request |
| সাজেশন / এডভাইস দেন | suggestion den ~ sajestion den ~ advice den ~ advise den ~ adbhais den | English loans, very common [MK] |
| উপদেশ | upodesh ~ updesh | formal/moralising, rare in shop talk [MK] |
| বুদ্ধি দেন | buddhi den ~ buddhi den | "give me an idea", colloquial [MK] |
| আপনি হলে কী করতেন? | apni hole ki korten | hypothetical advice |
| মতামত দেন / কেমন হবে? | motamot den / kemon hobe | opinion |
| ধরেন, ... | dhoren, ... | "suppose" = hypothetical, no write action |
| ভাই / ভাইয়া / আপু / স্যার + request | bhai ~ vai ~ bhaiya / apu ~ apa / sir | address terms; shopkeepers address the assistant as a person |
| দয়া করে / প্লিজ ... দিন | doya kore ... din ~ please ... din | polite request frame (matches FSI) |

- Chat-style wrappers ("assalamu alaikum vai", "bhai", "ektu") appear before real intents in the one Bangladeshi dataset I could open; strip them before classifying. — [BanglaEComIntent](https://huggingface.co/datasets/Badhon/BanglaEComIntent) (opened)

**4. Three-way cue summary for routing** [MK]

| Class | Typical cues |
|---|---|
| Data question | koto (how much), koyta/koyta, ke ke, kon (which), kar kache, kobe, ache/nai, "dekhao", "bolo" with a noun, no first-person future |
| Command | imperative: dao, dekhao, likho, jog koro, bad dao, kore dao; also "-te hobe/-ye dao" |
| Advice / decision | 1st-person future + ki/na ki; uchit; bhalo/thik/labh hobe; ki korle bhalo; poramorsho/suggestion/advice den; konta + comparison; "A naki B" |
| Explanation | keno, ki karone, kivabe (see Q4) |

Guard rule: an advice-shaped sentence should never trigger a write (price change, order, message send, dues reminder) on its own. "dam barabo ki?" is a question; "dam barai dao" is the command. [MK design inference]

### Gaps
- No source on Bangla grammar of উচিত / করব কি / ভালো হবে: searches returned generic grammar pages; polyglotclub question-formation page returned 403.
- No data on how real owners punctuate or spell these questions (voice-to-text vs typing).
- The -mu dialect region list and the ki-position heuristic are [MK] and unverified.
- No BD vs WB comparison source beyond my own knowledge of spelling (দিব vs দেব).

---

## Q2. Which business topics do owners most often ask advice about, and how are they worded?

### Takeaway
I could not find frequency data, so I cannot say "most often". The topic list follows the user's brief and general retail logic; each topic has a recurring phrasing template. Real wording found in sources is limited to a few Bangla news/search items on dues collection and stock.

### Cited Findings
- A Bangladeshi news item reports a trader using a loudspeaker (maiking) at halkhata after customers did not pay dues; 25-30 people then paid. Shows "baki/bokeya" collection is a live, socially loaded topic in BD shops. — [Jago News](https://www.jagonews24.com/country/news/816476) (uncertain: search summary only)
- Bangla news pieces advise: ask calmly and fix a deadline, get a written/stamped agreement for large sums, a dated cheque as security, a written notice before court. — [Bangla Tribune](https://www.banglatribune.com/business/money-and-investment/957735/%E0%A6%9F%E0%A6%BE%E0%A6%95%E0%A6%BE-%E0%A6%A7%E0%A6%BE%E0%A6%B0-%E0%A6%A6%E0%A6%BF%E0%A7%9F%E0%A7%87-%E0%A6%AB%E0%A7%87%E0%A6%B0%E0%A6%A4-%E0%A6%AA%E0%A6%BE%E0%A6%9A%E0%A7%8D%E0%A6%9B%E0%A7%87%E0%A6%A8-%E0%A6%A8%E0%A6%BE-%E0%A6%B8%E0%A6%AE%E0%A7%8D%E0%A6%AA%E0%A6%B0%E0%A7%8D%E0%A6%95-%E0%A6%AC%E0%A6%BE%E0%A6%81%E0%A6%9A%E0%A6%BF%E0%A7%9F%E0%A7%87), [Daily Star Bangla](https://bangla.thedailystar.net/life-living/news-679376) (uncertain: search summary only; legal content, do not repeat in-app)
- OkCredit (Indian ledger app) says regular reminders are the most effective way to collect baki, and that promises fail from lack of money, forgetting, or no records. — [OkCredit on Medium](https://medium.com/okcredit/record-remind-and-payments-a-full-stack-model-that-ticks-all-the-right-boxes-for-merchants-7a465b01f418) (uncertain: search summary only; India)
- A study of a Khulna grocery reportedly says a grocery holds 100+ item types and that stock-outs and overstock are the two typical problems. — [EconPapers entry](https://econpapers.repec.org/RePEc:aif:journl:v:29:y:2023:i:1:p:01-11) (uncertain: search summary only; link may not be the exact paper)
- Margin vocabulary in Bangla (Indian publisher): লাভ মার্জিন (profit margin), খরচ মূল্য (cost price), বিক্রয় মূল্য (selling price), মোট লাভ / মোট মুনাফা (gross profit), নিট লাভ / নিট মুনাফা (net profit). Markup was not in the article. — [Shiprocket bn](https://www.shiprocket.in/bn/blog/how-to-calculate-profit-margin/) (opened; India register, BD owners more likely say "labh" and "bikroy dam" or just "dam")
- A Bangla small-business page uses মুনাফা, খরচ, ব্যয়, মূলধন, টিপস. — [Khatabook bn](https://khatabook.com/blog/bn/%E0%A6%9B%E0%A7%8B%E0%A6%9F-%E0%A6%AC%E0%A7%8D%E0%A6%AF%E0%A6%AC%E0%A6%B8%E0%A6%BE%E0%A6%AF%E0%A6%BC%E0%A7%87%E0%A6%B0-%E0%A6%9F%E0%A6%BF%E0%A6%AA%E0%A6%B8/) (opened; India register)
- Searches for owner-side Bangla stock, pricing and Eid-stocking advice returned buyer-side articles only; no owner phrasing. — see search queries in Method note (no single source)

### Inferences
All phrasings [MK]. "Data part" and "decline part" are detailed in Q3.

| Topic | Bangla | Banglish (variants) |
|---|---|---|
| Reorder what | কী কী কিনব? / কী মাল আনা লাগবে? / কোন মাল কম, কী অর্ডার দিব? | ki ki kinbo ~ ki ki kinbo / ki mal ana lagbe ~ ki mal ana lagbe / kon mal kom, ki order dibo ~ kon mal kom ki order dibo |
| Reorder how much | কতটা কিনব? / কত পিস আনব? | koto ta kinbo ~ kotota kinbo ~ koto ta kinbo / koto pis anbo |
| Stock more/less | এটা বেশি রাখব কি? / কম রাখব? / এটা আর রাখব না | eta beshi rakhbo ki / kom rakhbo / eta ar rakhbo na |
| New item | নতুন মাল ধরব কি? / এই আইটেম তুলব কি? | notun mal dhorbo ki / ei item tulbo ki (mal tola = to bring in stock, [MK uncertain]) |
| Price up/down | দাম বাড়াব/কমাব কি? | dam barabo ki / komabo ki |
| Price level | কত দাম রাখব? | koto dam rakhbo ~ kotodam rakhbo |
| Profit/margin | কত টাকা/কত পার্সেন্ট লাভ রাখব? / মার্জিন কত রাখা ঠিক? | koto taka labh rakhbo / koto percent labh rakhbo / margin koto rakha thik |
| Discount | কত ডিসকাউন্ট/ছাড় দিব? / অফার দিব কি? / ঈদের অফার | koto discount dibo ~ koto chhar dibo / offer dibo ki / eid er offer |
| Give credit | বাকি দিব কি? / এই কাস্টমারকে কত বাকি দেওয়া যায়? / ক্রেডিট লিমিট কত? | baki dibo ki ~ baki dibo ki / ei customer ke koto baki dewa jay / credit limit koto |
| Refuse credit | কে কে কে বাকি দিব না? / ওকে আর বাকি দিব না, ঠিক হবে? | ke ke ke baki dibo na / oke ar baki dibo na thik hobe |
| Collect dues | বাকি কে তাগাদা দিব? / কার কাছে টাকা চাইব? | baki ke tagada dibo ~ togada / kar kache taka chaibo |
| Staff pay | কত বেতন/মাইনা দিব? / লোক রাখব কি? | koto beton ~ betan ~ salary dibo / koto maina dibo / lok rakhbo ki |
| Cut costs | খরচ কমবে কীভাবে? / কোন খরচ কমাব? | khoroch kombe kivabe ~ khorco kombe kibhabe / kon khoroch komabo |
| Slow/dead stock | এই মাল বিক্রি হচ্ছে না, কী করব? | ei mal bikri hocche na ki korbo ~ bikri hochhe na / mal porey ache / ochol mal / taka atke ache |
| Seasonal | ঈদের আগে কী রাখব? | eid er age ki rakhbo / roja ~ ramadan er age / boishakh / halkhata / school session |
| Expansion | নতুন দোকান খুলব কি? / লোন নিব কি? / ব্যবসা বড় করব কি? | notun dokan khulbo ki / loan nibo ki / bebsha boro korbo ki |
| Shut something | এই আইটেম বন্ধ করে দিব কি? | ei item bondho kore dibo ki |

Word notes [MK]:
- মাল (mal) is the everyday word for goods; স্টক (stock), মজুদ (mojud) are formal. "nai" (নাই) = none/out of stock; "shesh / furiye geche / furaiche" = finished.
- বাকি (baki) = shop credit given; ধার/উধার (dhar/udhar) = loan/borrowed; পাওনা (paona) = money owed to you; দেনা (dena) = money you owe; তাগাদা (tagada ~ togada) = dunning; হালখাতা (halkhata) = BD Pohela Boishakh settling of accounts (the Jago item above shows the term in BD news).
- Pricing: "dam/daam", "labh/laabh/lav", "los/loksan" (loss), "kom/beshi" (less/more). Percent: "percent / sotokora / %".
- Salary: বেতন (beton ~ betan), মাইনা/মাহিনা (maina/mahina, colloquial) [MK].
- Both "margin" and "markup" are likely collapsed into "labh" by owners. A source (search summary) notes the two differ (margin = % of selling price, markup = % of cost). — [Shiprocket bn](https://www.shiprocket.in/bn/blog/how-to-calculate-profit-margin/) (opened; margin terms) / difference itself (uncertain: search summary only). The assistant should state which one it shows.
- Seasons in BD retail: Eid ul-Fitr and Eid ul-Adha move about 10-11 days earlier each Gregorian year [MK], so "same time last year" must be Eid-relative, not calendar-date.

### Gaps
- No frequency data: cannot rank topics. No real owner messages found.
- No Bangladesh Bank / SME Foundation / BSCIC / Daraz / bKash guide could be retrieved to show how advisers word decisions.
- Pharmacy, mobile-recharge/MFS agent and tailor/garments owners may have trade-specific wording; not researched.

---

## Q3. Which advice questions can be turned into a data lookup plus a rule (reorder level, top sellers, overdue dues) and which cannot?

### Takeaway
Anything answerable from the shop's own ledger (stock vs reorder level, sales per item, who owes what and how old, cost vs price margin, expenses by category) can be answered as a fact, and a simple owner-visible rule (reorder level, credit limit, "no sale in N days") can be applied. Forecasts, "what should I do", people's character, and legal/religious/medical/loan questions must be declined or flagged as human judgement. This section is design reasoning [MK], not a sourced finding.

### Cited Findings
- Bangla news/finance sources on dues recovery mix practical steps (record, remind, set limits) with legal steps (notice, cheque case, civil suit); legal steps are country-specific and the Indian guide that surfaced cites Indian law, so they must not be borrowed for BD. — [Bangla Tribune](https://www.banglatribune.com/business/money-and-investment/957735/%E0%A6%9F%E0%A6%BE%E0%A6%95%E0%A6%BE-%E0%A6%A7%E0%A6%BE%E0%A6%B0-%E0%A6%A6%E0%A6%BF%E0%A7%9F%E0%A7%87-%E0%A6%AB%E0%A7%87%E0%A6%B0%E0%A6%A4-%E0%A6%AA%E0%A6%BE%E0%A6%9A%E0%A7%8D%E0%A6%9B%E0%A7%87%E0%A6%A8-%E0%A6%A8%E0%A6%BE-%E0%A6%B8%E0%A6%AE%E0%A7%8D%E0%A6%AA%E0%A6%B0%E0%A7%8D%E0%A6%95-%E0%A6%AC%E0%A6%BE%E0%A6%81%E0%A6%9A%E0%A6%BF%E0%A7%9F%E0%A7%87) (uncertain: search summary only)
- A search for credit-limit practice returned only generic English/Indian guidance (per-customer limit with alert near the limit, written terms, scheduled reminders). No BD or WB Bangla source. — search results (uncertain: search summary only)
- The only Bangla intent datasets found have an out_of_scope / reject class and no advice class; a naive split inflates accuracy to ~99.9% by memorising templates (so an advice class needs template-level splits and real messages). — [BanglaEComIntent](https://huggingface.co/datasets/Badhon/BanglaEComIntent) (opened)

### Inferences
[MK] design table. "Safe" = a lookup or arithmetic on the owner's own data, no prediction.

| Advice question type | SAFE data part to answer | Simple owner-visible rule (state it aloud) | DECLINE / flag as human judgement |
|---|---|---|---|
| ki ki kinbo / ki order dibo | Items at or below reorder level; last purchase date, qty, cost; items out of stock now | Below reorder level = list it. Suggested qty = (days owner chooses x avg daily sales) minus on hand, only if owner sets "days" | Demand forecast, "will it sell", supplier choice, bulk-buy bets, price-rise speculation |
| koto ta kinbo | Avg sales per week/month for the item, qty on hand, days of stock left | Same arithmetic; show the working | Eid/season spike size; say "last Eid-window sold X" if data exists, not "this Eid will be Y" |
| Stock more/less | Top sellers by qty and by profit; slow movers; capital tied (qty x cost) | "No sale in N days" (owner-set) = slow | Whether to drop a line; new-item bets |
| dam barabo/komabo? koto dam rakhbo? | Cost price, current price, current margin (state if % of price or % of cost), price that gives owner-chosen margin; recent price history; sales trend after past price changes if recorded | Price = cost / (1 - target margin) when owner supplies target | Competitor/market price (not in data); "right" price; effect on customers |
| koto labh rakhbo / margin | Margin per item (cost vs price), ranking by margin and by total profit | Owner-set minimum margin flag | A recommended margin |
| koto discount dibo / offer dibo ki | Cost, margin, lowest price before loss; what past discounts/offers sold (if logged); stock that is slow | Floor = cost price (no-loss line) | Whether an offer will pay off; Eid campaign design |
| baki dibo ki / koto baki dewa jay / credit limit | Customer's current baki, oldest unpaid age (days), times paid late, average days to pay, total ever paid, vs owner-set limit | Owner-set limit per customer; flag over-limit or over N days | Whether the person is trustworthy or will pay; "ke ke baki dibo na" as a blacklist of people |
| baki ke tagada dibo / kar kache taka chaibo | Overdue list sorted by amount and by age; last reminder date | "Overdue > N days" (owner-set) | Legal notice, cheque case, court, public shaming; draft text only if asked, send only on confirmation |
| koto salary dibo / lok rakhbo ki | Total pay already paid (if logged), pay as share of sales/profit | None | Wage level, hiring/firing, labour-law questions; any accusation about a person |
| khoroch kombe kivabe | Expenses by category, month-on-month change, biggest category | Highlight top 3 categories | Which cost to cut |
| ei mal bikri hocche na ki korbo | Last sale date, qty on hand, value tied up, sales per month trend, margin; whether it ran out earlier (stock-out) | "No sale in N days" | Pick between discount / return to supplier / keep; list options only if asked |
| eid er age ki rakhbo | Last Eid-window (Eid-relative) sales per item if recorded; current stock; reorder level | As above | Forecast for this Eid |
| notun dokan khulbo ki / loan nibo ki | Own profit and cash trend by month, if logged | None | All of it: investment, loan, premises, licence, tax, interest/religious ruling |
| Medical (pharmacy) "ei rogi ke ki oshudh dibo" | Stock and expiry dates only | None | Any dosage / what medicine to give: decline, refer to qualified person |
| People/character "o lok kemon", "ke chuti kore" | Facts: balance history, stock variance by date | None | Judging character, naming a thief, blaming staff/customers |
| Legal/tax/religious (VAT, trade licence, interest on baki, notice, case) | Nothing beyond records | None | Decline; refer to qualified person |

Response shape [MK design suggestion]: (1) answer the part the data supports with numbers and the rule used; (2) name what the data cannot tell (future, other shops, people); (3) hand the decision back ("apni thik korun"). Do not use "apnar uchit ..." phrasing on any row marked DECLINE.

### Gaps
- No source on how BD shops set credit limits or reorder levels in practice; the rules above are generic, to be set by the owner.
- No evidence that owners accept "I can only show the numbers" replies; untested.
- Bangladesh-specific legal/religious position on baki/interest not researched on purpose (out of scope: no legal advice).

---

## Q4. What phrasing signals that the person wants an explanation ("keno", "kibhabe", "karon") rather than a number?

### Takeaway
"Keno / ki karone / karon ki / kivabe" ask for a reason or method, and are often paired with a comparison ("kome gelo", "beshi", "age-r cheye"). A data-backed assistant can usually answer the "what changed" part with numbers; it can only list possible causes that are visible in its own data and must say it does not know outside causes. No source covers this; the markers are [MK].

### Cited Findings
- FSI-style material has "ki"-questions and polite requests but no "keno/kivabe" frames; no source retrieved for explanation markers. — [FSI Bengali ch.6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/) (opened; absence only)
- BanglaEComIntent has complaint, order_status, price_inquiry, etc., but no "why" intent. — [BanglaEComIntent](https://huggingface.co/datasets/Badhon/BanglaEComIntent) (opened; absence only)

### Inferences
[MK] throughout.

**Explanation markers (Bangla / Banglish with variants)**

| Bangla | Banglish | Note |
|---|---|---|
| কেন? | keno ~ kano ~ kno ~ ken ~ keno | why |
| ক্যান? | kyan ~ kan ~ ken | colloquial "why" (also chidingly: "keno ar baki dibo?") |
| কী কারণে? / কারণ কী? | ki karone ~ ki karone / karon ki ~ karon ki | reason |
| কীভাবে / কিভাবে | kivabe ~ kibhabe ~ kibabe ~ kivabe | how (method) |
| কেমনে / ক্যামনে | kemne ~ kemone ~ kemon kore | colloquial "how" |
| মানে কী? | mane ki | what does it mean |
| কী হলো? / ঘটনা কী? | ki holo / ghotona ki | what happened |
| কোথায় গেল? | kothay gelo | "where did it go" (money, stock) |
| বুঝিয়ে বলেন | bujhiye bolen | explain |

**Comparison / analysis questions that look like advice but are data** (the user's group (d))

| Bangla | Banglish | Treat as |
|---|---|---|
| কেন বিক্রি কমে গেল? | keno bikri kome gelo | explanation of a change: show sales this vs last period, by item, count of sales, avg basket, stock-outs |
| কেন লাভ কমল? | keno labh komlo | show margin and cost changes per item, discounts given, expense growth |
| কোন মালে লাভ বেশি? | kon mal e labh beshi (~ lobh beshi, typo) | pure data: margin/profit ranking |
| কোন কাস্টমার সবচেয়ে ভালো? | kon customer shobcheye bhalo | AMBIGUOUS: "best" = highest spend or best payer? Ask or show both numbers; do not rate character |
| কোনটা বেশি বিক্রি হয়? | konta beshi bikri hoy | top sellers by qty |
| কার কাছে সবচেয়ে বেশি বাকি? | kar kache shobcheye beshi baki | data: who owes most |
| টাকা কোথায় গেল? | taka kothay gelo | expenses + stock purchases + baki outstanding breakdown |

- Tell-apart rules: "kon ... beshi/shobcheye" without a first-person future verb = ranking query (data). The same words plus "korbo/kinbo/dibo ki" = advice. "Shobcheye bhalo" needs a metric before answering. Mapping "bhalo" to a person's quality is a character judgement and must be a number (spend, on-time payments), never a verdict.
- "keno" can be rhetorical or a complaint ("keno ami baki dibo?"); look for a question mark, a following number word, or a comparison ("age-r cheye", "gotomas er cheye").
- What a "why" answer may say [MK design]: differences visible in the owner's own records (fewer sales, smaller basket, item out of stock for N days, price changed on date X, a discount ran). Outside causes (competitor, hartal, rain, price of rice, economy) can only be listed as "not in my data / possible, I cannot tell".

### Gaps
- No source for explanation markers or colloquial spelling variants; verify with real messages.
- Whether owners type full Bangla, Banglish or voice dictation unknown; spelling tables are [MK].
- Everything about the "best customer" ambiguity is an inference, not observed.

---

## Overall coverage statement (what I could not find)
- No corpus of real Bangladeshi shopkeeper messages, no Facebook business-group posts, no Bangla YouTube business-advice titles, no Reddit/Quora threads were retrievable. The WebSearch tool is US-centred and returned Indian, Fijian or buyer-side pages for most queries.
- Pages I actually opened: BanglaEComIntent dataset card, arXiv 2107.05541 abstract, FSI Bengali ch.6, Khatabook bn small-business page, Shiprocket bn profit-margin page. Khatabook and Shiprocket are Indian publishers (WB-leaning register); treat their terms as BD-plausible only.
- Everything else tagged "search summary only" is as reported by the search tool and was not independently verified.
