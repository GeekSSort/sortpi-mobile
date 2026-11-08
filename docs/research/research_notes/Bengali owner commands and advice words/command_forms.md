# Bangladeshi shop owners' command and request forms (Bangla and Banglish) for a phone assistant

Legend. "Cited" = I opened the page this session. [MK] = model knowledge, not backed by a source I opened (treat as (uncertain) until a native speaker confirms). Every form is given as Bangla script / Banglish. Bangladesh usage unless flagged. No corpus of real shopkeeper messages was found (see Gaps in each section).

## 1. What command verbs, inflections and misspellings must an assistant recognise (view, list, search, total, send, print)?

### Takeaway
The three-level imperative (tui / tumi / apni) is confirmed by opened grammar sources for bola "say", deoa "give" and khaoa "eat"; the other verbs below follow the same pattern but were not in any table I opened, so they are [MK]. The practical recognition set is about 25 verb stems x 3 levels x a handful of spelling variants, plus "noun + verb", "verb-less noun" and "X kore dao" light-verb forms. No Bangla command corpus for shops exists in what I could reach.

### Cited Findings
- Imperative table for বলা (bola, "say"): তুই বল্ (bol), তুমি বল (bolo), আপনি বলুন (bolun). — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar)
- Imperative table for দেওয়া (deoa, "give"): তুই দে (de), তুমি দাও (dao), আপনি দিন (din). Same page for খাওয়া: খা (kha) / খাও (khao) / খান (khan). — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar)
- The same page says the plural command changes the pronoun but not the verb ending, and that tui/tumi imperatives take no stem change while the others do. — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar)
- FSI course gives the same three levels in romanisation only: bos / bosho / bosun (sit), de / dao / din (give), aash / aasho / asun (come). — [FSI Bengali, unit 6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/)
- Wiktionary: দেখানো (dekhano) = "to show; to make see", example আমাকে সবকিছু দেখাও (amake shobkichu dekhao, "Show me everything"); it is the causative of দেখা (dekha, "to see"). Its table lists দেখাও and দেখান in the present row (these are the same strings as the tumi and apni imperatives). — [Wiktionary দেখানো](https://en.wiktionary.org/wiki/দেখানো)
- Wiktionary দেখা lists only indicative forms: tui দেখিস, tumi দেখ(o), apni দেখেন; future দেখবি / দেখবে / দেখবেন. It has no imperative row. — [Wiktionary দেখা](https://en.wiktionary.org/wiki/দেখা)
- Romanised Bangla is written with no standard. BanglaTLit's Figure 1 shows ভালো romanised as bhalo / vlo / balo, পোস্ট as post / pst, ভাই as bhai / vai / vi. The paper says Bangla is "written as it sounds", which allows many romanisations. — [BanglaTLit, EMNLP Findings 2024](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- BanglaTLit: 42.7k romanised-to-Bangla pairs, sources TrickBD comments, Facebook, YouTube, blogs, Wikipedia. It is general social text, not commerce commands. — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- IndoTranslit (arXiv 2511.22769): 975,215 Bengali romanised sentence pairs made by a rule-based mapper on Bengali Wikipedia, so noise is synthetic, not natural. (Seen in a search summary only, paper not opened.) — [arXiv 2511.22769](https://arxiv.org/pdf/2511.22769)
- Sakib et al. 2023 (BanglaLP): 984 samples, 10 intents, formal Bangla, colloquial Bangla, Sylheti. Intents named in the paper's GPT prompt: BookRestaurant, ShareETA, GetPlaceDetails, ShareCurrentLocation, ComparePlaces, GetDirections, GetTrafficInformation, RequestRide, SearchPlace, GetWeather. Data are English SNIPS samples that were machine-translated then manually re-translated by four doctoral-student annotators, so these are not spontaneous commands and have nothing about shops. The paper describes colloquial Bangla as "predominantly used in Bangladesh" with many English, Arabic, Persian loanwords. GPT-3.5 reached F1 0.94 on intent and 0.51 on slots for colloquial Bangla. — [arXiv 2310.10935](https://arxiv.org/abs/2310.10935) and its PDF [arXiv PDF](https://arxiv.org/pdf/2310.10935)
- BNIntent30 (arXiv 2312.10679): 30 intent classes translated from CLINC150 (search summary only, not opened). — [arXiv 2312.10679](https://arxiv.org/abs/2312.10679v1)
- The Banglish dataset search found no corpus of Banglish commands to apps; the closest are BanglaTLit and IndoTranslit above. — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)

### Inferences
(All tables in this section are [MK] unless a row is covered by a Cited Finding above.)

**A. Verb paradigms. Columns: meaning | tui | tumi | apni | polite-future (apni) | "do it for me" (X-ye dao)**

| Meaning | tui | tumi | apni | polite-future | light-verb |
|---|---|---|---|---|---|
| show | দেখা / dekha | দেখাও / dekhao | দেখান / dekhan | দেখাবেন / dekhaben | দেখিয়ে দে / দাও / দিন (dekhiye de / dao / din) |
| see/look | দেখ / dekh | দেখো / dekho | দেখুন / dekhun | দেখবেন / dekhben | – |
| tell/say | বল / bol | বলো / bolo | বলুন / bolun | বলবেন / bolben | বলে দে / দাও / দিন (bole de / dao / din) |
| inform | জানা / jana | জানাও / janao | জানান / janan | জানাবেন / janaben | জানিয়ে দিন (janiye din) |
| give | দে / de | দাও / dao | দিন / din | দেবেন or দিবেন / deben or diben | দিয়ে দিন (diye din) |
| write/enter | লেখ / lekh | লেখো / lekho | লিখুন / likhun | লিখবেন / likhben | লিখে দিন (likhe din) |
| bring/fetch | আন / an | আনো / ano | আনুন / anun | আনবেন / anben | এনে দিন (ene din) |
| send | পাঠা / patha | পাঠাও / pathao | পাঠান / pathan | পাঠাবেন / pathaben | পাঠিয়ে দিন (pathiye din) |
| find/search | খোঁজ / khoj | খোঁজো / khojo | খুঁজুন / khujun | খুঁজবেন / khujben | খুঁজে দে / দাও / দিন (khuje de / dao / din) |
| take out / list out | বের কর / ber kor | বের করো / ber koro | বের করুন / ber korun | বের করবেন / ber korben | বের করে দিন (ber kore din) |
| lift / withdraw | তোল / tol | তোলো / tolo, tulo | তুলুন / tulun | তুলবেন / tulben | তুলে দিন |
| count | গোন / gon | গোনো / gono | গুনুন / gunun | গুনবেন / gunben | গুনে দিন |
| do (+noun) | কর / kor | করো / koro | করুন / korun | করবেন / korben | করে দিন (kore din) |
| open | খোল / khol | খোলো / kholo | খুলুন / khulun | খুলবেন | – |
| close/stop | বন্ধ কর / bondho kor | বন্ধ করো | বন্ধ করুন | বন্ধ করবেন | – |
| keep/save | রাখ / rakh | রাখো / rakho | রাখুন / rakhun | রাখবেন | রেখে দিন (rekhe din) |
| remove | মোছ / moch | মোছো / mochho | মুছুন / muchhun | মুছবেন | মুছে দিন |
| leave out | বাদ দে / bad de | বাদ দাও / bad dao | বাদ দিন / bad din | বাদ দেবেন | – |
| wait | দাঁড়া / dara | দাঁড়াও / darao | দাঁড়ান / daran | – | – |

Notes:
- The tui form of causatives (দেখা show, জানা inform, পাঠা send) is identical to the stem or to the plain verb noun (দেখা "seeing"). A parser must not treat "dekha" as only "seen".
- The apni imperative of the causative দেখান (show me) differs from the apni imperative of the plain verb দেখুন (look yourself) by one vowel. Typists often swap them: "dekhan" and "dekhun" are both used to mean "show"; apps use দেখুন for "view" (see section 4). Treat the two as the same intent.
- Bare stem commands: "dekhao" is the strong default in shops for "show me", because it is the tumi form and tumi is the usual register between owner, staff and a trusted helper.

**B. Banglish spelling variants, per verb (what to match)**

| Intent | Variants to accept |
|---|---|
| show (tumi) | dekhao, dekhaw, dekhau, dekhaoo, dekao, dekhaao, dkhao, dhekhao, dekhaw, dekhaw na |
| show (apni) | dekhan, dekhaan, dekhn, dekhen |
| see (tumi/apni) | dekho, dekhoo, dekhen, dekhun, dekhn |
| see/let me see | dekhi, dekhi to, dekhbo, dekhte chai, dekhbo ekta |
| give (tumi) | dao, dau, daw, dawo, dau na |
| give (apni) | din, den, dein, diben, deben |
| tell | bolo, bolen, bolun, bol, bole dao, bole den, bole din |
| inform | janao, janan, jananou, jana, janiye din |
| send | pathao, pathau, pathan, pathaw, pathiye den, pathiye dao, pathiye din |
| take out | ber koro, bair koro, ber korun, ber kore dao, ber kore den |
| lift | tulo, tolo, tulun, tule dao |
| search | khujo, khujun, khuje dao, khuje den, khuje din, khoj, search koro, serach koro |
| bring | ano, anen, anun, ene dao, ene den |
| count | gono, gonna, gunun, gona, gon |
| write/enter | likho, likhun, likhen, lekho, likhe dao, likhe den |
| add | jog koro, jug koro, add koro, jog korun, jora dao |
| save | save koro, sev koro, rakho, rekhe dao |
| delete | delete koro, muche dao, muchho, bad dao |

Key typing patterns [MK]: (1) o to u/w: dekhao/dekhau/dekhaw; dao/dau/daw. (2) vowel dropping in chat: dekhao to dkhao, dekao; pathao to ptao. (3) apni "n" forms spelled either "-en" or "-un" or "-an": den/din/dein; dekhen/dekhun/dekhan. (4) "ph/f", "kh/k" collapsing: khujo to kujo; dekhao to dekao. (5) aspirate drop: bhalo/valo/balo, as BanglaTLit shows for ভালো ([BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)). (6) Autocorrect to English: "den" to "then/den", "dao" to "Dao". (7) Bangla-keyboard slips: দেখাও to দেখাউ, দেখাও to দেখাও (no change), খুঁজো to খুজো (no chandrabindu).

**C. Bangla-script spellings and typos [MK]**
- Show: দেখাও, দেখান, দেখা, দেখাউ, দেখাওনা, দেকাও (phonetic), দেখাইয়া দাও (written/Sylheti-style), দেখিয়ে দাও, দেখিয়ে দিন.
- See: দেখো, দেখুন, দেখ, দেখি, দেখবো, দেখতে চাই.
- Give: দাও, দিন, দে, দেন (apni colloquial present, used as polite imperative), দেবেন, দিবেন (spoken spelling), দিয়ে দিন.
- Tell: বলো, বলুন, বল, বলেন, বলবেন, বলে দিন, বলে দাও.
- Inform: জানাও, জানান, জানাবেন, জানাইয়েন (rare).
- Send: পাঠাও, পাঠান, পাঠিয়ে দাও, পাঠিয়ে দিন, পাঠাবেন, শেয়ার করো/করুন.
- Find: খুঁজো, খোঁজো, খুঁজে দাও, খুঁজে দিন, খুঁজুন, সার্চ করো/করুন.
- Bring: আনো, আনুন, আনেন, এনে দাও, এনে দিন.
- Take out: বের করো, বের করুন, বের করে দাও/দিন, বার করো (rarer spelling).
- Count/total: গোনো, গুনুন, গণনা করো/করুন, হিসাব করো/করুন, যোগ করো/করুন, মোট কত, মোট দাও.
- Write: লেখো, লিখুন, লিখে দাও/দিন.
- Print/Download/Export: প্রিন্ট করো/করুন, প্রিন্ট দাও, ডাউনলোড করো/করুন, এক্সপোর্ট করো/করুন.

**D. Data-request verbs by task (use these to build slots rather than a fixed question list)** [MK]

| Task | Typical shop phrasings (Banglish / Bangla) |
|---|---|
| show / see | stock dekhao / স্টক দেখাও; baki dekhao / বাকি দেখাও; ajker bikri dekhi / আজকের বিক্রি দেখি; hisab dekhte chai / হিসাব দেখতে চাই; dekhbo ekta list / একটা লিস্ট দেখবো |
| tell | bikri koto bolo / বিক্রি কত বলো; koto baki bolen / কত বাকি বলেন; bole dao aj koto holo / বলে দাও আজ কত হলো; janao / জানাও |
| list | list dao / লিস্ট দাও; talika / তালিকা; sob item er list / সব আইটেমের লিস্ট; tothyo dao / তথ্য দাও (formal, rare in shops) |
| search/find | khujo / খুঁজো; khuje dao / খুঁজে দাও; search koro / সার্চ করো; X ache ki? / X আছে কি? (is X there?); X kothay? / X কোথায়? |
| count/total | mot koto / মোট কত; gono / গোনো; jog koro / যোগ করো; total koto / টোটাল কত; sob mile koto / সব মিলে কত; hishab koro / হিসাব করো |
| compare | tulona koro / তুলনা করো; compare koro / কম্পেয়ার করো; gotokal er sathe milao / গতকালের সাথে মিলাও; ager mase koto chilo / আগের মাসে কত ছিল |
| print | print koro / প্রিন্ট করো; print dao / প্রিন্ট দাও; slip bar koro / স্লিপ বের করো; memo ber koro / মেমো বের করো |
| send/share | pathao / পাঠাও; share koro / শেয়ার করো; whatsapp e pathao / হোয়াটসঅ্যাপে পাঠাও; SMS koro / এসএমএস করো; X ke pathiye dao / X কে পাঠিয়ে দাও |
| download/export | download koro / ডাউনলোড করো; PDF koro / পিডিএফ করো; excel e dao / এক্সেলে দাও; save koro / সেভ করো |
| add / record | likho / লেখো; jog koro / যোগ করো; entry koro / এন্ট্রি করো; add koro / অ্যাড করো; tule dao / তুলে দাও (record it) |
| delete / undo | muche dao / মুছে দাও; delete koro / ডিলিট করো; bad dao / বাদ দাও; ager ta fire dao / আগেরটা ফিরিয়ে দাও (undo) |

**E. Desire, need and question-as-command forms [MK]**

| Form | Banglish | Bangla | Treat as |
|---|---|---|---|
| want to see | dekhte chai / dekhbo | দেখতে চাই / দেখবো | show |
| want to know | jante chai / jantam | জানতে চাই / জানতাম | tell |
| need | amar X dorkar / X lagbe / X chai | আমার X দরকার / X লাগবে / X চাই | show or give X |
| let me see | dekhi / dekhi to | দেখি / দেখি তো | show (soft) |
| can you show? | ektu dekhaben? / dekhaben ki? / dekhate parben? | একটু দেখাবেন? / দেখাবেন কি? / দেখাতে পারবেন? | show |
| can you tell? | bolte parben? / bolben? / bolben ki? | বলতে পারবেন? / বলবেন? | tell |
| can it be shown? | dekhano jabe? / dekha jabe? / dekha jay? | দেখানো যাবে? / দেখা যাবে? / দেখা যায়? | show |
| is there? | ache? / ache ki? / hobe? | আছে? / আছে কি? / হবে? | check/search (query, not an order) |
| do it for me | kore dao / kore den / kore din | করে দাও / করে দেন / করে দিন | the main verb is the part before kore |
| negative | koro na / korben na / dio na | করো না / করবেন না / দিও না | do NOT act (must stop, not delete); "na" after an imperative can also be soft ("dekhao na" = "please show") |

Disambiguation of "na": at the end of an imperative (dekhao na) it softens it; before the verb (na dekhao) or with "-io" (dekhaio na) it forbids. [MK]

**F. Bare-noun and shortened chat patterns [MK]**
- Noun alone: "stock", "baki", "bikri", "khoroch", "hisab", "lav" (profit), "joma". Treat as "show current X".
- Noun + dekhao / koto: "stock dekhao", "baki koto", "bikri koto".
- Time + noun: "aj bikri", "ajker bikri", "kal er hisab", "ei maser lav".
- Name + noun: "Rahim er baki", "Karim bhai r baki koto", "Rahim ke koto dibo".
- Noun + "?" only: "stock?", "mot baki?".
- Truncations seen in chat generally: "plz", "pls", "plzz", "pliz" (please); "ektu" (a little), "ektu dekhao"; "ta" and "ta ki" suffixes ("stock ta dekhao", "baki ta koto").
- Word order is free: verb-final ("stock dekhao") and verb-first ("dekhao stock") both occur; also "dekhao to stock ta". Do not depend on order; match verb stem, noun slot, and modifiers separately.

**G. Politeness markers [MK unless marked]**
- দয়া করে (doya kore) "kindly" makes any request more polite (cited FSI: "Doya kore eta din", "Doya kore ekta paani din", "Doya kore asun") — [FSI Bengali, unit 6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/). Shopkeeper chat rarely uses it; ektu (একটু) and pls/plz/please do the same job in practice [MK].
- দেখি (dekhi) and তো (to) soften: "dekhao to" = "go on, show me" [MK].
- Honorific address with bhai (ভাই), apu (আপু), sir (স্যার), boss (বস), mama (মামা), chacha (চাচা) is common before the command [MK]; an assistant should strip them.
- Greetings and fillers before the command: "assalamu alaikum", "bhai", "ekta kotha", "ektu" [MK].

### Gaps
- No corpus of real shopkeeper or staff messages to an app or assistant was found; every Banglish variant list above is [MK], not measured frequency.
- The Wikipedia and Wiktionary pages opened do not give imperative tables for দেখা, লেখা, আনা, পাঠানো, খোঁজা, গোনা, করা; only বলা, দেওয়া, খাওয়া. All other rows are pattern-based [MK].
- Future imperative: the opened Wikipedia text says only that for tumi it is formed by changing the vowel in the present imperative; it gave no -io / -ben endings. I have no opened source for -io (দেখিও, করিও) or for -ben as a polite request.
- Bangla Wikipedia verb page returned 404 and the Play Store, bKash and Hishabee pages returned truncated or 403 content, so no Bangla-language grammar or store text was read directly.
- BNIntent30 and IndoTranslit were only seen via search summaries.

## 2. How do politeness level and word order change the form but not the meaning?

### Takeaway
Politeness (tui / tumi / apni) changes only the verb ending and the pronoun; the verb stem, object and meaning stay constant. Word order in colloquial speech is flexible (verb normally last), so a parser should key on verb stem + noun slots, not on position. Question forms ("ektu dekhaben?") and wish forms ("dekhte chai") are polite commands with the same payload.

### Cited Findings
- Four imperative categories exist: very familiar (tui/tora), familiar (tumi/tomra), polite (apni/apnara), third person; plural commands change the pronoun but not the verb ending. — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar)
- FSI labels apni forms "formal", tumi "informal", tui "very informal": Doya kore bosun / Bosho / Bos. — [FSI Bengali, unit 6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/)
- FSI polite request patterns with -ben: "Apni ki amake sahayyo korben?" (Will you help me?), "Apni ki eta korte parben?" (Can you do this?), "Apni ki ashte parben?". The -ben + ki + question pattern is a request form, not a pure future. — [FSI Bengali, unit 6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/)
- FSI conditional request: "Jodi apni paren, doya kore asun" (If you can, please come). — [FSI Bengali, unit 6](https://www.fsi-language-courses.org/fsi-bengali-course/6-making-requests-and-offers/)
- Wiktionary's present rows for দেখা show apni দেখেন and future দেখবেন, the same strings used as polite request forms. — [Wiktionary দেখা](https://en.wiktionary.org/wiki/দেখা)
- Wikipedia notes: for apni the imperative stem changes (বলুন), for tumi it does not (বলো). — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar)

### Inferences
- Same meaning, different register [MK]: "stock dekh" (tui, to a junior) = "stock dekho" (tumi) = "stock dekhun" (apni) = "stock dekhaben?" (polite-future) = "stock ektu dekhan" (softened) = "stock dekhiye den" (do-it-for-me) = "stock dekhte chai" (wish) = "stock dekha jabe?" (can it be done). An assistant that stems the verb to {dekh, dekha, dekhan} and classifies as SHOW covers all.
- A phone app is addressed by owners as a helper or a younger staff member, so tumi is the likely default, apni for politeness, tui for a close or annoyed tone [MK]. Do not reply in tui.
- Respond register: use apni forms in assistant replies (e.g. দেখুন, বলুন) [MK].
- Verb-final vs free order: "aj koto bikri holo", "koto bikri holo aj", "bikri aj koto holo" are the same query [MK]. Treat "koto" (কত, how much) as the question marker, which can replace the verb entirely.
- Imperative vs present vs future share forms for apni: দেখেন (present), দেখবেন (future), দেখান/দেখুন (imperative). In speech, দেন / দিবেন / বলেন can all be requests when the sentence has no subject and ends with "?" or "to" [MK]. Hence classify by the missing subject plus the data noun, not by tense.
- Colloquial dropping of the verb: "ektu stock" = "ektu stock dekhao". The noun carries the intent; the verb adds only SHOW vs SEND vs PRINT vs ADD.
- West Bengal differences [MK, uncertain]: WB uses the same tui/tumi/apni forms, but vocabulary differs (জল vs পানি for water, মাছ/মাংস same, "দোকান" same; "লিস্ট" same). Bangladesh phone users more often type Banglish with English loanwords (stock, baki, due, sales). Sakib et al. note colloquial Bangla in their study is "predominantly used in Bangladesh". — [arXiv 2310.10935](https://arxiv.org/abs/2310.10935) (the claim about shared vocabulary differences is [MK]).

### Gaps
- No source quantifying which register shop owners use with apps; tumi-as-default is [MK].
- No opened source for the exact grammar of "-ben as polite imperative" beyond FSI request examples.
- West Bengal vs Bangladesh differences in commands: no source opened.

## 3. Which command words collide with item names or other words?

### Takeaway
Many command stems are also common nouns in a shop, so an assistant must disambiguate by position (verb slot vs item slot) and by whether a data noun is present. The highest-risk ones are dao/দা, din/দিন, den/den, kor/কর, bol/বল, tel, chal/চাল, baki/বাকি, mot/মোট/মত, kal/কাল, tulo/তুলো, pathao/Pathao, list.

### Cited Findings
- BanglaTLit shows the same Bangla word is romanised several ways and different Bangla words can be romanised to the same Latin string (phonemic spelling; "written as it sounds"). — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- দেওয়া imperative apni = দিন (din) — which is also the Bangla word for "day" in other contexts. — [Wikipedia: Bengali grammar](https://en.wikipedia.org/wiki/Bengali_grammar) (the "day" meaning is [MK]).
- TallyKhata's own copy uses বেচা (becha) where one might expect বিক্রি (bikri), and lists "বাকি বেচা, কেনা, খরচ, স্টক" as the things it tracks. The two sale words co-exist. — [TallyKhata](https://www.tallykhata.com/)

### Inferences
(All [MK] unless noted.)

| Word | Command meaning | Other meaning that can collide | Disambiguation |
|---|---|---|---|
| dao / দাও | give | dao / দা = cleaver, knife (a shop item); also "dao" (Dao) in names | "dao" after a noun or "X dao" = give; "dao" alone as item in a stock list = knife; use presence of qty or price |
| din / দিন | give (apni) | দিন = day; "ajker din" | "din" with "koto/ke" = give; "ei din" is time |
| den / দেন | give (apni) | English "den", "Den" as name; ডেন rare | In Banglish "den"/"dein" almost always give; "dein" is a common typo variant of den/din |
| kor / কর | do (tui) | কর = tax ("kor", "VAT") | "kor" with "koro" family = do; "kor" with "dao" or "ki" = tax; VAT/tax is usually written "ট্যাক্স/ভ্যাট" in shop talk |
| bol / বল | say (tui) | বল = ball (toy item), strength | "bol" next to a number or price = ball |
| tel / তেল | – | oil (soyabin tel, sorisha tel) | not a verb; do not confuse with "dekh/de" stems in "tel dao" (give oil) |
| chal / চাল | – | rice, also "chal" = tactic, walk | item noun in shops: "chal ache?" = rice available? |
| dal / ডাল | – | lentils, branch | item |
| baki / বাকি | – | credit owed (customer baki) OR "remaining" ("baki ase koto?") | "baki dekhao" = show unpaid credits by default; "baki stock" = remaining stock; ask or default to credit |
| mot / মোট | total | মত / মতো = opinion / like | "mot koto" = total how much |
| sob / সব | all | – | stable |
| kal / কাল | tomorrow OR yesterday | – | Bangla কাল means both; use tense of verb: "kal bikri koto holo" = yesterday; "kal ki dibo" = tomorrow |
| aj / আজ / ajke / আজকে | today | – | stable; "ajke" is spoken form |
| tulo / তুলো / tolo / তোলো | lift, withdraw, record | তুলো = cotton (item) | in "taka tulo" = withdraw; "tulo" with qty = cotton |
| ano / আনো | bring | "ano" no known item clash; "anen" ≈ "aner" | stable |
| pathao / পাঠাও | send | Pathao = Bangladeshi ride-hailing/e-commerce brand | Context: "pathao e delivery" is the brand; "report pathao" is the verb |
| list / লিস্ট | show list | list as noun item/heading | "list dao" is both a command (give list) and a noun phrase; treat as SHOW |
| jog / যোগ | add or sum | "jog" in names (Jog) | "jog koro" = add (record) OR total; resolve by presence of a number to add vs a set to sum |
| jama / জমা | deposit / amount received | জমা = also land | stable in shop context |
| dhar / ধার | credit given | ধার = edge, also "sharp" | rare clash |
| khata / খাতা | ledger | notebook (stock item) | rare |
| dekha / দেখা | show (tui) | seen, meeting | by position: end of sentence after noun = show; "dekha hoyeche" = seen |
| dekhi / দেখি | let me see | "see" in "kemon dekhi" | soft show |
| lagbe / লাগবে | will need | – | same as chai/dorkar |
| ber / বের | take out | বের = "out" ("ber hoye jao") | |
| bad / বাদ | omit | বাদ = "except" | "bad dao" = remove |
| hisab / হিসাব | account / calculate | – | noun or verb |

Banglish ambiguity beyond words: "pathao"/"pathan" are also surnames or the Pathan community, "dao" also appears in South-East Asian names, "den" in English. In a shop domain the verb reading is far more likely when the sentence has a data noun (stock, baki, bikri).

Practical rule [MK]: strip politeness and address words first, find a data noun in the vocabulary, then match any remaining token against the verb-stem list. If the remaining token is also a catalogue item (dao, chal, tel, bol), check whether the item exists in the shop's own stock before treating it as a verb.

### Gaps
- No source listing collisions; all rows are model knowledge. The Pathao brand and the cleaver meaning of দা are well known but I did not open a page to confirm them this session.
- No data on which collisions actually cause errors in a Bangla assistant.

## 4. What conventions do Bangladeshi apps use for action labels (button and menu verbs)?

### Takeaway
Bangladeshi apps overwhelmingly use the polite -উন / -ন imperative (apni form) for buttons: দেখুন, পাঠান, নিন, যোগ করুন, সেভ করুন, মুছুন, বাতিল করুন, with English loanwords (সেভ, ডাউনলোড, অ্যাড) kept as nouns plus করুন. Bangla-script Banglish forms of these labels are what users learn to type back. I could verify only a few strings directly because the store pages were not readable.

### Cited Findings
- TallyKhata website (Bangla copy) uses: "ভিডিও দেখুন" (watch the video), "টালিপে QR নিন" (get TallyPay QR), "ডাউনলোড টালিখাতা" (download TallyKhata), "তাগাদা মেসেজ পাঠিয়ে দ্রুত বাকি আদায়" (collect dues quickly by sending reminder messages), "অ্যাড মানি, মানি আউট" (wallet actions in English-loan form), and feature nouns "বাকি বেচা, কেনা, খরচ, স্টক", "ডিজিটাল হিসাব", "হিসাবের ব্যাকআপ থাকে". — [TallyKhata](https://www.tallykhata.com/)
- The TallyKhata page did not contain "যোগ করুন", "বিক্রি", "রিপোর্ট" or an exact "পাঠান" imperative (only পাঠিয়ে / পাঠানো যায়). — [TallyKhata](https://www.tallykhata.com/)
- TallyKhata describes bookkeeping for sales, purchases, expenses, stock and baki (credit owed); works offline; customers receive SMS with purchase amount and total due. — [TallyKhata](https://www.tallykhata.com/en/home-eng/); [TBS News](https://www.tbsnews.net/feature/panorama/tallykhata-digitising-culture-buying-and-selling-credit-154465)
- Play Store title for the app: "টালিখাতা - হিসাব ও বাংলা QR". Hishabee title: "Hishabee - ব্যবসা বাড়ান এখনই" ("ব্যবসা বাড়ান" = grow the business, apni imperative). — [Play Store TallyKhata (title only)](https://play.google.com/store/apps/details?id=com.progoti.tallykhata&hl=bn); [Play Store Hishabee (title only)](https://play.google.com/store/apps/details?id=com.hishabee.business&hl=bn)
- Another search result for TallyKhata shows the app title "টালিখাতা - ব্যবসা চালান সহজে" ("ব্যবসা চালান" = run the business). — [AppGoblin listing](https://appgoblin.info/apps/com.progoti.tallykhata)
- Chaldal's page shows English action labels ("Login", "Start Shopping", "Use my current Location", "Continue", "View All", "File a complaint") with a "বাং" language toggle, i.e. an English-default UI with Bangla as an option. — [Chaldal](https://www.chaldal.com/)
- Hishabee's English pages describe its dashboard overview of sales and balances and an expense book with profit-and-loss reporting. No Bangla UI strings were retrieved. — [Hishabee blog: Dashboard](https://hishabee.business/?p=7236); [Hishabee blog: Expenses](https://hishabee.business/?p=7279)
- bKash site returned HTTP 403 and Hishabee home returned a socket error, so no bKash/Nagad/Daraz/Foodpanda/Pathao Bangla strings were read in this session.

### Inferences
(Everything below is [MK] unless it repeats a cited string above.)

**Button/menu verb conventions in Bangladeshi Bangla UIs**

| English | Bangla label (apni imperative) | Banglish a user may type | Notes |
|---|---|---|---|
| View / see | দেখুন | dekhun | cited at TallyKhata ("ভিডিও দেখুন") |
| View all | সব দেখুন | sob dekhun | also "সবগুলো দেখুন" |
| Add | যোগ করুন | jog korun | "যোগ করুন" also means "sum up" in speech |
| Add (loan form) | অ্যাড করুন / অ্যাড | add korun | "অ্যাড মানি" cited |
| Send | পাঠান | pathan | "পাঠিয়ে দিন" for "send it away" |
| Take / get | নিন | nin | cited "QR নিন"; also "কিনুন" = buy |
| Save | সেভ করুন | save korun | |
| Delete | মুছুন or ডিলিট করুন | muchhun / delete korun | |
| Cancel | বাতিল করুন or ক্যানসেল | batil korun / cancel | |
| Confirm | নিশ্চিত করুন or কনফার্ম করুন | nishchit korun / confirm korun | |
| Search | খুঁজুন or সার্চ করুন | khujun / search korun | |
| Update | আপডেট করুন or হালনাগাদ করুন | update korun | |
| Download | ডাউনলোড করুন | download korun | cited "ডাউনলোড টালিখাতা" |
| Print | প্রিন্ট করুন | print korun | |
| Share | শেয়ার করুন | share korun | |
| Continue / next | পরবর্তী / এগিয়ে যান / চালিয়ে যান | porerti / egiye jan | |
| Back | পেছনে / ফিরে যান | pechone / fire jan | |
| Pay | পেমেন্ট করুন | payment korun | |
| Order | অর্ডার করুন | order korun | |
| Recharge | রিচার্জ করুন | recharge korun | |
| Login | লগইন করুন | login korun | Chaldal shows English "Login" |
| Grow / run | ব্যবসা বাড়ান / ব্যবসা চালান | byabsha baran / chalan | cited in store titles |

- Pattern: [English/loan noun] + করুন (korun) is the dominant structure for newer actions; native verbs (দেখুন, পাঠান, নিন, মুছুন, খুঁজুন) are used for the common ones [MK].
- Nouns, not verbs, name tabs and menu entries: স্টক, বাকি, বিক্রি / বেচা, কেনা, খরচ, হিসাব, রিপোর্ট, ক্যাশ, লেনদেন, গ্রাহক, সরবরাহকারী [MK]. This supports the bare-noun command pattern: an owner who sees "বাকি" as a tab will type "baki".
- Mixed script is normal: loanwords in Bangla script ("অ্যাড মানি", "মানি আউট", "QR", "সেভ করুন") alongside native words, so an assistant must accept English words typed in Bangla script (স্টক, রিপোর্ট, প্রিন্ট) and in Latin script (stock, report, print) as equal [MK, supported by the cited TallyKhata strings].
- Reminder/collection wording: "তাগাদা" (tagada, dunning) and "বাকি আদায়" (baki aday, collect dues) are the standard collection terms in TallyKhata copy (cited).
- Words that modify commands in apps and speech [MK]: মোট (mot, total), সব (sob, all), সর্বমোট (sorbomot, grand total), এখন (ekhon, now), বর্তমান / কারেন্ট (bortoman / current, current), আমার (amar, my), দোকানের (dokaner, the shop's), আজকের (ajker, today's), গতকাল (gotokal, yesterday), এই মাসের (ei masher, this month's), আগের (ager, previous), মোট কত (mot koto, total how much), সব মিলে (sob mile, all together), পুরো (puro, entire), শুধু (shudhu, only), বাকি (baki, remaining or credit), সর্বশেষ (sorboshesh, latest). These attach to a data noun and change scope, not the verb.

### Gaps
- Play Store pages for TallyKhata, Hishabee and bKash returned only titles (JavaScript-rendered), so no verbatim in-app button lists were obtained.
- Dokani, Nagad, Daraz, Foodpanda and Pathao Bangla UI strings were not retrieved.
- Bangla Wikipedia page for verbs returned 404; I had no opened Bangla-language grammar source.
- The label table above is largely [MK]; verify against screenshots of each app before relying on any one label.
- No evidence found about how shopkeepers actually type commands to these apps; none of the apps opened has a chat or command input.
