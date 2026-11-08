# Teaching SortPi to Parse Shop Talk

**Summary.** A phone assistant can turn free-form Bangladeshi shop questions into data lookups without a hand-written question list, because shop questions are built from one small closed grammar: a metric noun (bikri, baki, stock, labh, khoroch), an optional entity (item, customer, supplier, staff, payment method), a period (aj, gotokal, ei mash) and an operation (total, list, top-N, compare, exists). About 15 question words and 20 data nouns are shared by all 15 retail types; the trade-specific part is limited to item names, units and a few ambiguity traps. The hard problem is spelling, not meaning: Google's Dakshina study counted an **average of 3.8 attested romanizations per Bengali word** (Hindi 1.8) ([Dakshina paper](https://arxiv.org/pdf/2007.01176)), so the assistant must match on a phonetic skeleton against the shop's own catalogue instead of matching strings. **Most of the vocabulary in this report is model knowledge and has not been validated.** The researchers' web search found no corpus of real shopkeeper messages, no shop-slang source and no voice-typing data; the verified material is structural (unit values, BAJUS gold classes, the DGDA drug-registry structure, product category names, Unicode behaviour, dataset facts). Every word list, spelling variant and example question below is a hypothesis to test unless it carries an [S] label. Four ambiguities decide whether an answer is right or wrong: **baki** (owed vs remaining), **kal** (yesterday vs tomorrow), **nogod** (cash vs the Nagad wallet) and unit scope (strip vs tablet vs box; vori vs gram). Before any term becomes a hard rule it should be validated with 3-5 shopkeepers per market, 50-100 real utterances per business type, the DGDA/Mendeley medicine dataset and the Dakshina lexicon (steps in the last section).

## How to read the evidence labels

Every claim carries one of the notes' original labels. **[S]** means a fetched page or cited document supports it and a link is given (some [S] items rest only on a search-result summary; those are said so). **[K]** means model knowledge of everyday Bangla and Bangladeshi retail speech, not web-verified; the notes also write this as **[MK]**, and the two are the same. **(uncertain)** means the researcher was not confident the term, spelling, attribution or meaning is right. In the glossary tables below, **a row with no tag is [K]**; sourced rows are tagged [S] and weak rows are tagged (uncertain). All Banglish spellings, typo lists and example questions are constructed by the researchers from how Bangla is typed in Latin letters. They are test seeds, not observations, and their frequencies are unknown. "BD" means Bangladesh and "WB" means West Bengal. Conflicting figures are shown side by side and are not resolved.

## One slot grammar covers all fifteen trades

Owner questions reduce to `metric + entity/filter + period + operation`. The metric set the notes propose is sales, bills_count, avg_bill, customers_count, stock_qty, stock_value, price, buy_price, margin, profit, expense, receivable, payable, returns, discount, cash, mfs_split, staff_sales, expiry and reorder; entities are item, category, customer, supplier, staff, branch and payment method; operations are total, list, top-N, bottom-N, compare, trend and exists [K]. Bangladeshi khata and POS apps already expose the same concept set (baki/due, sales, purchases, expenses, customers and suppliers, cash, stock alerts, payment reminders), which supports the slot design ([TallyKhata](https://www.tallykhata.com/7-reasons-why-tallykhata-is-the-perfect-bookkeeping-payment-solution-for-shops-and-small-businesses/); [Hishabee](https://blog.hishabee.io/?p=327)). The imperative is optional: "aj er bikri dekhao", "ajker bikri" and "aj koto bikri holo?" are the same request [K]. A slot-filling model answers an unbounded set of phrasings; a fixed list cannot. Three question types do not map to one lookup and need a graceful reply: diagnostic ("bikri kom keno?"), forecast ("kal koto bikri hobe?") and advice ("eid er age koto discount dibo?") [K].

## Fifteen trade glossaries: items, units, money words, phrasings, traps

Each trade below gives item words in Bangla script and Banglish, units and packaging, trade-specific money words, example phrasings and ambiguous or regional terms. Words shared by every trade (koto, koyta, ache, nai, shesh, bikri, baki, labh, khoroch, aj, gotokal, dekhao) are in the cross-category section that follows. Banglish columns list the canonical spelling first, then likely variants. Unless tagged, a row is [K]. Example phrasings are constructed.

### 1. Fabric and textiles (কাপড়ের দোকান; Islampur-style wholesale and retail)

Cloth is priced per **গজ (gaj, yard)** and cut from a full **থান (thaan, bolt)**; width is **বহর (bohor)** in **হাত (hat)**, with phrases such as "আড়াই হাত" and "সাড়ে তিন হাত বহর", and price rises with width ([Prothom Alo](https://www.prothomalo.com/lifestyle/shopping/syftu6xnj4)) [S]. The government dictionary defines গজ as two cubits, a yard, and থান কাপড় as an entire length of woven fabric ([গজ](https://accessibledictionary.gov.bd/bengali-to-english/?q=গজ); [থান](https://accessibledictionary.gov.bd/bengali-to-english/?q=থান)) [S]. Old Dhaka's Islampur market trades gabardine, silk, corduroy, georgette, rayon, polyester, cotton mulmul, markin, voile, lungis, sarees, shalwar kameez and panjabis, plus lace, buttons and stones ([Daily Star](https://www.thedailystar.net/weekend-read/news/islampur-business-hub-centuries-old-vibe-3562351)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| কাপড় | kapor (kapod, kapar, kaporh, kapr) | cloth and also clothes; in a fabric shop = cloth |
| থান | than (thaan, tan, taan) | bolt [S]; "tan" collides with the colour |
| গজ | gaj (goj, gaz, guz) | yard [S]; also elephant and chess bishop [S] |
| শাড়ি | shari (sari, saree, sharee, shaari) | saree; "shadi" is a typo risk |
| জামদানি | jamdani (jamdaani, jamdany) | [S] |
| কাতান | katan (katon) | katan saree; voice risk: sounds like "carton"/কার্টন |
| রাজশাহী সিল্ক, তাঁত | rajshahi silk, tant (taant, tangail tant) | silk; handloom cotton [S] |
| সুতি | suti (shuti, sooti) | cotton [S] |
| মসলিন / মলমল, মার্কিন | muslin / mulmul, markin | [S] |
| জর্জেট, গ্যাবার্ডিন, জ্যাকার্ড, অ্যান্ডি | jorjet, gabardin, jacquard, andi | [S] loanwords in Bangla script |
| স্ক্রিন প্রিন্ট, ব্লক, বাটিক, ডিজিটাল প্রিন্ট, টাইডাই | screen print, block, batik, digital print, tie-dye | print types [S] |
| লুঙ্গি | lungi (lungee, lunghi, lugi) | [S]; often sold by dozen (uncertain per item) |
| ওড়না | orna (urna, odhna, orhna) | [S] |
| থ্রিপিস | three piece (3 pis, 3 pc, 3pc, 3 pice) | kameez + salwar + orna [S]; "3 pice" appears in Othoba ([Othoba](https://othoba.com/salwar-kameez-3)) [S] |
| বেডশিট, পর্দা | bedsheet, porda | home textiles [S] |
| বেনারসি, খাদি, কাটপিস, লট | benarosi, khadi, cut piece, lot | (uncertain) as local terms |
| সুতা, লেস, বোতাম, পাথর | suta, lace, button, pathor | yarn, lace, buttons, stones [S] |

**Units and packaging.** gaj [S], than [S], hat (about half a gaj, from the dictionary definition) [S], bohor [S], inch for tailoring, pis/piece/pc, set, jora (pair), dojon (12), roll [S], kg for yarn or lace (uncertain), meter for imported or online sellers (uncertain). **The length of a thaan in gaj was not found; do not hard-code it.**

**Money and trade words.** baki, dhar, khata/bakir khata, pawna, dena, joma, paikari (wholesale) [S] and khucra (retail), dor/dam, dor-dam (bargaining), chhar/discount, "komiye dewa", last price, bayna/advance (booking money, uncertain), dorji/tailor [S], mojuri (stitching charge, uncertain), bhangti (small change) [S] ([Wikibooks](https://en.wikibooks.org/wiki/Bengali/Shopping)).

| Example phrasing (Banglish / Bangla) | Meaning |
|---|---|
| lal suti than e koto gaj baki? / লাল সুতি থানে কত গজ বাকি? | yards left on a red cotton bolt (baki = remaining) |
| 10 gaj nile koto porbe? / ১০ গজ নিলে কত পড়বে? | price for 10 yards; "koto porbe" is a sourced phrase [S] |
| lungi dozon e koto dam? | lungi price per dozen |
| paikari dam ar khucra dam alada kore bolo | wholesale vs retail price |
| Karim shaheb ke 3 gaj dilam, baki likho | write action: record a credit sale (confirm first) |
| Eid er age ki ki kom ache? | low-stock list before Eid |

**Ambiguous or regional.** gaj (yard/elephant/bishop), than (bolt/whole/"thana"/colour tan), baki, kapor (cloth/clothes), dhar vs dor in Roman typing, katan vs carton by voice, pic/pis (piece vs "picture", as in "pic dao"), set. No verified dialect shop vocabulary exists; only product origins are sourced: Tangail, Pabna and Sirajganj loom cotton and Rajshahi silk (search-summary level, uncertain) ([Alchempro](https://www.alchempro.com/news/fabrics-news/bangladesh-boosts-bid-for-tangail-saree-gi-recognition-reports-293854-newsdetails.htm)). The Islampur peak season starts about 10 days before Shab-e-Barat and runs to the second week of Ramadan [S] ([Daily Star](https://www.thedailystar.net/weekend-read/news/islampur-business-hub-centuries-old-vibe-3562351)); zakat-season lungi and saree surges are (uncertain, summary-level).

### 2. Grocery and supermarket (মুদি দোকান, কাঁচাবাজার, Shwapno/Meena Bazar/Chaldal style)

Chaldal's category tree (Fruits and Vegetables; Meat and Fish; Cooking with Spices, Salt and Sugar, Rice, Dal, Oil, Ghee; Dairy and Eggs; Breakfast; Snacks; Beverages; Baking; Frozen and Canned) is the one sourced canonical taxonomy ([Chaldal](https://chaldal.com/rices)) [S]. Rice is sold under trade names Chinigura, Nazirshail (also Najirshail, Nazirshile) and Miniket with brand and weight ("Teer Chinigura Rice 1 kg") [S]; a Food Minister quoted by Bangladesh Post said no such official paddy varieties exist, so treat them as trade names ([Bangladesh Post](https://bangladeshpost.net/posts/miniket-najirshail-rice-bogus-94628)) [S]. Atta is also named brand-first ("Teer Atta 2 kg") [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| চাল | chal (chaul, caal, chaal) | raw rice; ভাত bhat = cooked rice |
| চিনিগুঁড়া / নাজিরশাইল / মিনিকেট | chinigura, nazirshail (najirshail), miniket (minikit) | rice trade names [S] |
| ডাল | dal (daal, dhal) | lentils; মসুর moshur/masur, মুগ mug, ছোলার cholar, খেসারি khesari; অড়হর arhor (uncertain) |
| আটা / ময়দা / সুজি / বেসন | atta (ata, aata) / moyda (maida, moida, mayda) / suji / beshon (besan) | wheat flour / refined flour / semolina / gram flour |
| চিনি | chini (cheeni) | sugar; collides with chinigura rice |
| লবণ / নুন | lobon (labon) / nun | salt; nun is the WB word, understood in BD ([Wikipedia](https://en.wikipedia.org/wiki/Bengali_vocabulary)) [S] |
| তেল | tel (tail) | generic oil; default is soybean oil; also hair oil, kerosene |
| সয়াবিন তেল / সরিষার তেল | soyabin tel (soybean, soyabean) / shorishar tel | soybean / mustard oil |
| ঘি / ডালডা | ghee (ghi) / dalda | dalda used for any vegetable ghee (uncertain) |
| ডিম | dim (deem) | egg; deshi dim, farm er dim, hasher dim (duck) |
| দুধ, গুঁড়া দুধ | dudh (dud, doodh), gura dudh / powder milk | milk; milk powder |
| পেঁয়াজ, রসুন, আদা | peyaj (piaj, peaj, pyaj), roshun (rosun), ada | onion, garlic, ginger |
| আলু | alu (aloo, allu) | potato |
| মরিচ | morich (moric) | chili; কাঁচা kacha fresh, শুকনা shukna/গুঁড়া gura dry/powder; WB lonka [S] |
| হলুদ, ধনে, জিরা, মসলা, গরম মসলা | holud (halud), dhone, jira (zira), mosla (masla, masala), gorom mosla | turmeric, coriander, cumin, spices, whole-spice mix |
| চা | cha (chaa, tea) | tea; চা পাতা cha pata = leaf |
| বিস্কুট, চানাচুর, মুড়ি, চিড়া | biscuit (biskut), chanachur, muri, chira | |
| পানি / জল | pani / jol | water; BD uses both [S] |

Vegetables, fish and meat follow the same pattern (begun, lau, potol, korola, ilish, rui, katla, telapia, shutki, goru, khashi, murgi, broiler; all [K], with mach/mangsho as the category words). Sylheti food words found: maas (fish), shutki, shorisha (mustard) ([Wikiversity](https://en.wikiversity.org/wiki/Sylheti_language/Animals)) [S].

**Units and packaging.** kg/keji/kilo (everyday word "kilo"), gram, ltr, ml, **ser/sher about 0.933 kg** ([Wikibooks](https://en.wikibooks.org/wiki/Bengali/Shopping)) [S], **poa/pao = a quarter ser** (Wikibooks) [S] (about 233 g by that arithmetic; the notes elsewhere say about 250 g, unverified, and no source states the metric conversion), chhatak (1/16 ser, [K], uncertain), mon (40 ser in most sources), hali, dojon, half dozen, bosta (sack, 25/50 kg varies), khola (loose, as in khola tel), packet, carton, tin, botol, shishi (small bottle), tukra, "aro ekta" (one more), "ekta kom" (one less) [S]. Fractions are hard-coded words: adha (half), ded/der (1.5), arai (2.5), sare (+0.5) ("sare tin kg" = 3.5 kg).

**Money and trade words.** baki, dhar/udhar, khata, hisab, pawna/dena, joma, shodh/porishodh (repay), nogod, bkash, dam/dor, discount/chhar, "komiye dao", MRP, paikari/khuchra, kena/becha, labh/munafa, loksan/khoti, puji (capital), mohajon (supplier, wholesaler or lender), arot/arotdar (commission depot), mal ("mal tola" = stocking, uncertain), supplier/dealer/agent, bayna (advance, uncertain), bhangti [S], memo/bill, halkhata (the Boishakh ledger reset when customers clear baki) [K].

| Example phrasing | Meaning |
|---|---|
| chinir stok koto ache? | sugar on hand |
| soyabin tel koto litre baki ache | litres of soybean oil remaining (baki = remaining) |
| Rahim bhai er kache koto baki? | what Rahim owes (person subject) |
| ke ke 5000 takar upore dhar nise? | customers owing over 5,000 |
| ek hali dim er dam koto? | price of 4 eggs |
| sare tin kg chal er dam kot hobe? | price for 3.5 kg rice |
| Pran juice er carton koto ta ache? | brand-generic: resolve to beverage > juice |
| মসুর ডাল কত কেজি আছে? | Bangla-script stock query |

**Brand-as-generic habits (all (uncertain), validate).** "Pran juice/Frooto" for any packaged juice, "Dettol" for any antiseptic, "Horlicks", "Colgate", "Dano" for milk powder, "Radhuni" for packet masala, "Teer", "Fresh", "Rupchanda", "Pusti", "Ispahani" as brand+product (Teer atta/rice/chini are confirmed brands on Chaldal) [S], "Milk Vita" for pasteurised milk. Keep an alias table brand to {category, generic names}.

**Ambiguous or regional.** tel (cooking/hair/kerosene), adha (half) vs ada (ginger), pau (bread) vs pao (quarter ser), tin (three) vs tin (container), chini vs chinigura, cha vs cha pata, baki, kal, nogod. Dhaka/WB pairs confirmed: pani/jol, lobon/nun, morich/lonka, dawat/nimontron, khala/mashi ([Wikipedia](https://en.wikipedia.org/wiki/Bengali_vocabulary)) [S]. Other WB differences ("sabji" vs "torkari") are (uncertain). Ramadan lifts demand for sugar, oil, lentils, chickpeas, onions, ginger and dates ([Daily Star](https://www.thedailystar.net/backpage/news/hike-essentials-prices-crooked-traders-out-cash-ramadan-1734355)) [S]; the quoted percentages (sugar and oil nearly double, lentil about 113%, chickpea 860%) could not be mapped to a specific article and date, so treat them as (uncertain).

### 3. Pharmacy (ওষুধের দোকান, ফার্মেসি, ডাক্তারখানা)

Bangladesh is a branded-generic market. The DGDA registry identifies finished products by DAR number plus trade name, so the **brand is the key, not the generic** ([Bangladesh Core FHIR IG](https://fhir.dghs.gov.bd/core/CodeSystem-dgda-drug-registry.xml.html)) [S]. One generic has many brands: ePharma's paracetamol list shows Napa, Renova, Ace, Xpa, Reset, Aceta, Fast, Longpara, and the Napa family splits into 500 mg, Extra (with caffeine), Extend (665 mg), Rapid, One (1000 mg), suspension, paediatric drops, suppository and IV infusion ([ePharma](https://epharma.com.bd/bn/medicines/fever)) [S]. Suffix conventions seen: XR/ER, Max/Power, Plus [S]. Pack labels are "10pcs", "1 Strip", "60ml" and "510pcs Box" for Napa 500, "120pcs Box" for Napa Extra [S]. Napa 500 showed MRP 12 and a selling price 11, so MRP and sold price both exist [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| ট্যাবলেট / ক্যাপসুল | tab (tablet, tablate) / capsule (kapsul, cap) | cap also = lid; বড়ি bori = informal pill |
| সিরাপ / ড্রপ / মলম | shirap (sirap, syrup) / drop / molom | marham/মারহাম (uncertain in BD) |
| ইনজেকশন, সুই | inj, injection, sui | sui = needle/shot |
| স্যালাইন, খাবার স্যালাইন | saline (selain, salin), khabar saline / ORS | IV bag vs oral rehydration: ask |
| পাতা | pata (patta, patha, strip) | blister strip; "koy pata ache" |
| প্যারাসিটামল / নাপা | paracetamol (paracitamol, parasitamol), para / napa (nappa) | generic vs brand; Napa often used for the class |
| অ্যান্টাসিড | antasid (antiacid) | "ostat" was supplied in the brief and could not be matched to any antacid (uncertain): treat as unknown and ask |
| মেয়াদ, মেয়াদোত্তীর্ণ | meyad, meyadottirno | expiry; "expired medicine" [S] ([Prothom Alo](https://www.prothomalo.com/opinion/column/ksa7yim6yh)) |
| ব্যাচ নম্বর | batch | label checks use batch number and expiry [S] |

Brand spellings by ear (all (uncertain), brand-to-company mapping unverified): Seclo (siklo, seklo, সেকলো), Maxpro, Sergel, Alatrol, Fexo, Ace (ays), Renova (rinova), Ciprocin (siprosin, cipro; cited as a non-prescription antibiotic brand in a TBS report ([TBS](https://www.tbsnews.net/bangladesh/antibiotics-sale-without-prescription-rampant-despite-high-court-ban)) [S]). Brand-as-generic: Napa, Savlon/Dettol, Betadine, Vaseline, Vicks, Pond's, Parachute [K].

**Units and packaging.** pata/strip, box (size differs per product: never assume 10 strips), carton (saline: 10 bags per carton [S] ([Daily Star](https://www.thedailystar.net/node/3388871))), shishi/botol, tube, bag, packet, pc, dose, course, mg, ml, IU. Pack expiry is month/year ("EXP 06/2027"), so "expiring this month" is a month-granularity test (assumption, validate against SortPi's stored format) [K].

**Money and trade words.** MRP (selling vs MRP), pikari/paikari price, kena dam, becha dam, company, MR (medical representative), depot, distributor/dealer, bonus/free ("10+1" style, uncertain), company discount (supplier side), challan (delivery note/invoice), cash memo, COD, home delivery, baki/paona/dena, bokeya (arrears), party (an account), mohajon (uncertain). Arogga shows a Bangla wholesale prompt, "ব্যবসার জন্য পাইকারি দামে পণ্য কিনতে রেজিস্টেশন করুন" ([Arogga](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm/bn)) [S]. Mitford (Old Dhaka) is the wholesale hub (search-snippet attribution) ([Financial Express](https://today.thefinancialexpress.com.bd/print/blockade-halves-mitford-drug-sales)) [S].

"Expiring soon" phrasings: meyad shesh hoye asche, meyad kache, expire hoye jabe, near expiry, "short date" (uncertain). "Already expired": meyad shesh, expired mal, date over. In stock: ache/nai/shesh/phuriye geche, "koy pata ache", "lagbe" (needs reorder). Returning expiring stock to the company ("expiry return", "replace") is practice-dependent (uncertain).

| Example phrasing | Meaning |
|---|---|
| ei mashe napa koto pata gese? | strips sold this month; ask which Napa |
| napa extra ache koyta? | stock count; unit (strips?) to confirm |
| kon kon medicine er meyad ei mashe sesh? | expiring this month |
| expired maal koto taka'r ache? | value of expired stock |
| company'r kache amar dena koto? | payable to suppliers |
| napa 500 er dam koto? mrp na kena? | selling vs purchase price: clarify |
| ORS ar saline ager mashe koto geche? | oral vs IV: clarify |
| paracetamol er sob company'r list | generic to brands lookup |

**Safety-critical handling.** Antibiotics sold without prescription remain common; the High Court ordered a stop in April 2019 and a shopkeeper said they "work better and are more profitable" ([Daily Star](https://www.thedailystar.net/frontpage/antibiotics-use-and-sale-in-bangladesh-without-prescription-continues-1853359)) [S]. For antibiotics, steroids, injections, sedatives, codeine syrups, contraceptives and anything for children or pregnancy, the assistant reports stock, sales, price and expiry only and never advises use or dose [K]. Symptom words such as gas, pressure, sugar, ghum map to a category plus a request for the product name [K]. Dengue peaks from June to about November and drives saline and paracetamol demand [S] ([Daily Star](https://images.thedailystar.net/node/3369926)); other seasonal links (winter flu, rainy-season diarrhoea and ORS, Ramadan gastric complaints) are unsourced. India-side terms (stockist, Schedule H, "dawai", Dolo-650, Crocin) are WB-origin (uncertain).

### 4. Fashion and clothing

Panjabi, fatua, kurta, salwar-kameez and three-piece are the Eid and Pohela Boishakh staples; price bands from a Dhaka Tribune piece were panjabi Tk 1,000-2,000, fatua 1,200-3,000, sari 1,200-6,000, salwar kamiz 2,000-5,000 ([Dhaka Tribune](https://www.dhakatribune.com/business/173316/fashion-houses-upbeat-as-pohela-boishakh-promises)) [S]. Othoba titles follow [Fabric/Technique] [Descriptor] [Construction] [Garment] For [Audience], with "Semi Stitched", "Ready made", colour appended after a hyphen, and typos such as "Jorjet" and "3 Pice" ([Othoba](https://othoba.com/salwar-kameez-3)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| পাঞ্জাবি | panjabi (punjabi, ponjabi, panjaby) | [S] |
| ফতুয়া | fotua (fatua, futua, fotuya) | short kurta [S] |
| কুর্তা / কুর্তি | kurta / kurti | men's long shirt / women's top |
| শার্ট, টি-শার্ট, পোলো, প্যান্ট, জিন্স | shirt, t-shirt, polo, pant, jeans | |
| থ্রিপিস / টু-পিস / ওয়ান-পিস | 3 pis / 2 pis / 1 pis | set counts |
| গাউন, ড্রেস, ম্যাক্সি, কাবলি | gown, dress, maxi, kabli | [S] |
| লেহেঙ্গা, শারারা, প্যালাজো | lehenga, sharara, palazzo | party wear (uncertain frequency) |
| বোরকা, হিজাব, স্কার্ফ, নিকাব | borka (burka, burqa, borkha), hijab, scarf, nikab | (uncertain, not in fetched sources) |
| গেঞ্জি, মোজা, রুমাল | genji, moja, rumal | often by dozen |
| ফ্রক, বেবি ড্রেস | frock, baby dress | [S] baby and kids' wear |
| রেডিমেড, আনস্টিচড, সেমি স্টিচড | ready made, unstitched, semi stitched | [S] |
| কপি, ইমপোর্টেড, লোকাল | copy, imported, local | origin tags; Pakistani/Indian three-piece suits are a big Eid share ([UNB](https://unb.com.bd/category/Special/pakistani-attires-reign-supreme-in-dhakas-eid-shopping-frenzy/156667)) [S] |

**Variants.** Colours: লাল lal, নীল nil, সবুজ sabuj, হলুদ holud, কালো kalo, সাদা shada/sada, গোলাপি golapi, বেগুনি beguni, কমলা komola, খয়েরি khoyeri, ধূসর dhushor, আকাশি akashi, মেরুন maroon; "rong/color/kolor" as a suffix. Size tokens S/M/L/XL/XXL and chest numbers (38-44 for panjabi, uncertain); sleeve words full hata/half hata (uncertain). Fit words choto, boro, lomba, khato, bhari, halka are standard shopping phrasings ([Wikibooks](https://en.wikibooks.org/wiki/Bengali/Shopping)) [S].

**Units.** pis/pc/pcs, set, jora, dozen (socks, genji, rumal), size, "3pc/2pc" shorthand. **Money words.** baki, advance/bayna, exchange/ferot/return, discount, kena dam vs bikri dam, labh, bkash, nogod.

| Example phrasing | Meaning |
|---|---|
| panjabi 40 size koyta ache? | stock by garment and size |
| kon design ta cholche na? | slow movers (chole na) |
| Sumi apu 2ta kurti nise, 1500 baki | write action: credit sale (confirm) |
| Eid collection er sell koto? | sales of a seasonal line |
| discount dile ki lav thakbe? | margin after discount |
| kon size shobcheye kom ache? | lowest-stock size |

**Ambiguous or regional.** "number" (size vs phone number), set, pic/pis. Seasonality: Eid-ul-Fitr is reported as about 40% of leading fashion brands' profit and Pohela Boishakh about 10% (FEAB, via a March 2026 Dhaka Tribune piece whose URL was not retained: **(uncertain)**), while another search summary puts Boishakh plus Eid near 75% of local fashion-brand sales (**(uncertain)**). The two figures conflict and are kept as is. Eid-ul-Adha, wedding-season, Falgun and school-season effects were not found in any source.

### 5. Electronics and mobile

"Set" (সেট) means the handset in a phone shop [K]; "mobil" (engine oil) is its homophone trap. Official versus unofficial is a core attribute: official handsets are in BTRC's NEIR database, unofficial ones risk blocking and lose warranty, and IMEI status is checked by SMS "KYD <IMEI>" to 16002 ([Star Tech](https://www.startech.com.bd/blog/how-to-check-official-and-unofficial-phone); [TBS](https://www.tbsnews.net/explainer/what-national-equipment-identity-register-neir-1290026)) [S]; bdnews24 reported the registration system "in limbo for 10 months" on 28 Oct 2026 ([bdnews24](https://bdnews24.com/business/m3tw408h11)) [S], so enforcement status is unclear.

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| মোবাইল, সেট, ফোন, হ্যান্ডসেট | mobile, set, phone, handset (mobail, mobil) | "set" = phone only in a phone shop |
| বাটন ফোন, স্মার্টফোন | button phone, keypad, smartfone, android set | |
| চার্জার, অ্যাডাপ্টার | charger (chargar, charjar), adapter | adapter only or adapter + cable: ask |
| ক্যাবল, ডাটা ক্যাবল | cable, data cable, type-c (taip si), micro, lightning | |
| পাওয়ার ব্যাংক | power bank (pawar bank) | key attribute mAh |
| হ্যান্ডফ্রি, ইয়ারফোন, ইয়ারবাড | handfree (hendfree), earphone, earbuds, TWS | |
| কভার, ব্যাক কভার | cover (kover) | model-specific |
| গ্লাস গার্ড | glass guard (gard), tempered, screen protector | types: tempered glass, ceramic, privacy, TPU, PET [S] ([Star Tech](https://startech.com.bd/mobile-phone-accessories)) |
| ব্যাটারি, মেমোরি কার্ড, পেনড্রাইভ, সিম | battery, memory card, pendrive, sim | operators GP, Robi, BL, Teletalk |
| র‍্যাম / রম | "4/64", "8+128", "6 gb 128 gb" | shorthand RAM/ROM |
| ডিসপ্লে, টাচ, ফোল্ডার | display, tach (touch), folder | repair parts; "folder" = display with frame (uncertain) |
| আইপিএস, স্ট্যাবিলাইজার | IPS, UPS, stabilizer | IPS = home inverter-UPS in BD (fairly confident, unsourced) |
| ফ্রেশ, ইউজড, সেকেন্ড হ্যান্ড, ওপেন বক্স, ফুল বক্স | fresh, used, 2nd hand, refurb, open box, full box | fresh = new sealed; "full box" = all accessories (uncertain) |
| অফিসিয়াল, আনঅফিসিয়াল | official, unofficial, PTA | "PTA" is a Pakistani term; some BD sellers may still say it (uncertain) |

**Units.** pis/ta, set, joda, dozen, box/carton, GB, mAh, watt, volt, amp, inch (TV), ton (AC capacity), litre (fridge).

**Money and trade words.** kisti/EMI (bank credit-card EMI is a common offer ([Bangladesh Monitor](https://bangladeshmonitor.com.bd/en/grameenphone-ebl-bring-smartphones-on-interest-free-installments)) [S]; written ads keep "EMI" in Latin letters and write কিস্তি, সার্ভিস চার্জ, ডিসকাউন্ট, ক্যাশব্যাক in Bangla script ([Apple Gadgets BD](https://www.applegadgetsbd.com/blog/%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE/%E0%A6%95%E0%A6%BF%E0%A6%B8%E0%A7%8D%E0%A6%A4%E0%A6%BF%E0%A6%A4%E0%A7%87-%E0%A6%AE%E0%A7%8B%E0%A6%AC%E0%A6%BE%E0%A6%87%E0%A6%B2-%E0%A6%AB%E0%A7%8B%E0%A6%A8/)) [S]); warranty/guarantee/gyarenti (interchangeable in speech, uncertain), original/copy/first copy/A1, replace, baki, bkash, nogod, challan.

| Example phrasing | Meaning |
|---|---|
| Redmi 12 er dam koto? | model number is the product key, not a quantity |
| Samsung A15 4/128 stock e ache? | stock by RAM/ROM variant |
| Aj koyta set bikri hoyeche? | phones sold today |
| Ei set er warranty kobe sesh hobe? | warranty end; needs IMEI or invoice date |
| Realme C55 official na unofficial? | provenance attribute |
| Kisti te kon kon set diyechi? | installment sales |
| Power bank 10000 mah koyta baki? | baki = remaining |

**Ambiguous or regional.** set (phone/kit/commode set), mobil vs mobile, "ek set / ek joda", numbers inside names (Redmi 12, A15 are not quantities; "10 ta" with ta is a count), cover, original vs good-quality copy. WB differs on payments (UPI/GPay/PhonePe) and regulation (CEIR), and does not use bKash/Nagad/Rocket [K]. Eid brings EMI and kisti demand; budget-time duty news moves prices (both uncertain).

### 6. Cosmetics and beauty (কসমেটিক্স, বিউটি শপ; parlours as trade customers)

Verified listings show "Glow & Lovely" face cream (Ayurvedic Care 25/50 g, Advanced Multivitamin 100 g, BB cream "Shade 1", serum 14 ml), sizes written "1 x 50gm tube", category path Beauty > Skincare > Whitening and Brightening Cream ([Arogga](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm/bn)) [S]. Shajgoj lists makeup (foundation, lipstick) and body care ([Daily Star](https://www.thedailystar.net/tech-startup/news/shajgoj-how-modern-day-beauty-platform-aims-become-household-name-3019106)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| লিপস্টিক, লিপবাম | lipstick (lipstik), lipbam | |
| কাজল, আইলাইনার, মাসকারা | kajal (kajol, kazol), ayliner, maskara | |
| ফাউন্ডেশন, কমপ্যাক্ট, বিবি ক্রিম | foundation, compact, BB cream | "shade no." is the variant [S] |
| ফেসওয়াশ, লোশন, ময়েশ্চারাইজার, সানস্ক্রিন, সিরাম | face wash, loshon, moysturaizer, sanskrin, serum | |
| ফর্সা ক্রিম / গ্লো অ্যান্ড লাভলি | forsha cream, fair and lovely, glow and lovely | old name still spoken; treat as category tags |
| শ্যাম্পু, কন্ডিশনার, চুলের তেল, হেয়ার কালার | shampu (sampu), conditioner, chuler tel, hair color | sachets sold |
| মেহেদি | mehedi (mehendi, mehandi, henna) | cone/কোন or powder |
| আতর | attor (attar, otor) | alcohol-free perfume |
| পারফিউম, ডিও | perfume (perfum), deo | |
| নেইল পলিশ, আলতা, টিপ, সিঁদুর | nail polish, alta, tip, sindoor | sindoor share uncertain |
| ঘামাচি পাউডার | ghamachi powder | summer item |

**Units.** tube, jar, botol, sachet, refill, cone, pis, set, combo, ml, gm, SPF, shade no., dozen/carton for wholesale (uncertain). **Money words.** MRP, discount/offer, combo offer, free gift, baki, COD, delivery, original/duplicate/Indian/Korean/Thai/imported/local brand, parlour party accounts, bridal set.

| Example phrasing | Meaning |
|---|---|
| lipstick koto ta ache, shade onujayi dekhao | stock by shade |
| glow and lovely cream koyta bikri? | customers may still say "fair and lovely" |
| mehedi cone eid er age koto gese? | seasonal henna sales |
| parlour er baki koto? | credit owed by parlours |
| original ar duplicate alada dekhao | data-field dependent; clarify |

**Ambiguous or regional.** original vs duplicate (counterfeit), COD pending vs credit baki, fairness vocabulary is socially loaded: treat whitening/brightening as category tags and never recommend. A 2004 Daily Star report warned that local fairness creams mostly used hydroquinone ([Daily Star 2004](https://epfs.thedailystar.net/TDS/2004/04/11/MAI/5_18/98e7cea4b32deeeb_18.pdf)) [S] (historical context only). Eid (chand raat henna, attar, lipstick), Pohela Boishakh (alta, tip), summer (sunscreen, ghamachi powder) and winter (lotion, lip balm) demand are unsourced.

### 7. Health and wellness (supplements, herbal, devices)

Often a pharmacy sub-department. Hamdard (Waqf) Bangladesh, founded 1972 at Tejgaon, makes about 200 Unani and Ayurvedic products as capsules, tablets, ointments and syrups ([Wikipedia](https://en.wikipedia.org/wiki/Hamdard_Laboratories_%28Waqf%29_Bangladesh)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| ভিটামিন, ক্যালসিয়াম, আয়রন, জিংক | vitamin (bitamin), kalsium, ayron, jink | |
| ফিশ অয়েল / ওমেগা-৩ | fish oil, omega 3 | |
| প্রোটিন, হুই, ক্রিয়েটিন, মাস গেইনার | protin, whey, creatine, mass gainer | tubs sold 2 lb / 5 lb / 1 kg |
| ইসবগুল, কালোজিরা, মধু | isubgul (isobgul), kalojira, modhu | |
| হারবাল, ইউনানি, আয়ুর্বেদিক, কবিরাজি, হোমিও | herbal, unani, ayurvedic, kobiraji, homeo | report stock only; no effect claims |
| থার্মোমিটার, প্রেশার মেশিন, গ্লুকোমিটার, অক্সিমিটার, নেবুলাইজার | thermometer, BP machine, glucometer (sugar machine), oximeter, nebulizer | devices carry warranty |

**Units.** capsule/tablet count (30's, 60's), jar, kouta (uncertain), packet, lb, kg, serving, scoop, botol/ml, set, box. **Money words.** warranty/guarantee, EMI (uncertain), original/duplicate/imported, batch, seal pack, company discount.

| Example phrasing | Meaning |
|---|---|
| whey protein 2 lb koyta bikri hoyese? | units of one pack size sold |
| bp machine koyta ache? warranty koto din? | stock plus warranty length |
| glucometer strip er expiry kobe? | here "strip" means test strips |
| creatine ar mass gainer shesh? | out-of-stock check |

**Ambiguous.** strip (blister strip vs glucose test strip), "modhu orginal na duplicate?" is a product-attribute lookup and cannot be judged from data. Seasonal notes (winter vitamin C and honey, Ramadan dates and isubgul, gym peaks around New Year) are unsourced.

### 8. Hardware and paint

Retail price reports confirm unit habits: cement as a "50 kg packet" (brands Shah, Crown, Akij, Scan, Premier), rod per tonne (BSRM, AKS, GPH, KSRM), bricks per piece (24 x 11.5 x 7 cm), sand per গাড়ি (truckload, one described as 180 ft) and stone per ফুট, tiles by brand, finish and cm size (24x24, 32x32, 30x30, 40x80, 80x80, 100x100), and paint by brand, type and pack (3.64 L, 5 kg, 18 L drum, 20 L) ([Prothom Alo](https://www.prothomalo.com/business/un1adf221m)) [S]. The standard concrete mix is cement : sand : khoa = 1:2:4 ([teachers.gov.bd](https://teachers.gov.bd/content/details/1491672)) [S]. Rods have grades (grade 60 in one report) and swing 10-14k per tonne in a month ([Bangla Tribune topic page](https://www.banglatribune.com/topic/%E0%A6%B0%E0%A6%A1%E0%A7%87%E0%A6%B0-%E0%A6%A6%E0%A6%BE%E0%A6%AE)) [S] (search-snippet level).

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| রড | rod, shariya (soria, sariya) | sizes in mm (8-25) [K]; older "সুতা" system not found; সরিয়া also means mustard |
| সিমেন্ট | cement (simint, siment, cimint) | OPC/PCC; brands [S] |
| বালু / বালি | balu / bali | sand: both spellings in BD sources [S] ([Prothom Alo](https://www.prothomalo.com/business/un1adf221m); [Bikroy](https://bikroy.com/bn/building-materials/concrete)) |
| ইট, খোয়া / চিপস, পাথর | eet (it), khoa (khoya), chips, pathor | grades 1st/2nd/picket (uncertain) |
| টাইলস | tiles (tails, tilas) | size in cm or feet ("২ বাই ২") [S] |
| কমোড, প্যান, বেসিন | commode (kamod), pan, basin | one-piece/two-piece/wall-hung |
| কল, ট্যাপ | kol, tap, bib cock, stop cock | |
| পাইপ, ফিটিংস | pipe (paip), PVC, GI, elbow, tee, socket, reducer, valve | inch sizes (1/2", 3/4", 1", 4") |
| তার, সুইচ, সকেট, এমসিবি | tar, wire, switch (soich), socket, MCB | wire in mm² (1.5, 2.5); "number"/gauge (uncertain) |
| রং, ইমালশন, ডিসটেম্পার, এনামেল, পুটি, প্রাইমার, থিনার | rong, emulsion, distemper, enamel, putty, primer, thinner | Bikroy says রং, Prothom Alo uses brand+type [S] |
| ব্রাশ, রোলার, শিরিষ কাগজ | brush (brash), roller, sandpaper | |
| হাতুড়ি, স্ক্রু ড্রাইভার, প্লাস, তালা, কব্জা | hammer, screwdriver, plas, tala, kobja | |
| টিন, সিআই শিট | tin, CI sheet, dheu tin | gauge number |

**Units.** bosta/packet (50 kg), tonne, bundle/coil/roll, ft/inch/mm/cm, borgofut/sft, ghonofut/cft, gari, litre/gallon/drum (3.64 L tin probably one gallon by inference; 18 L paint drum [S]), kg, dozen, per piece, box, "per 1000 bricks" (uncertain). **Money words.** wholesale/retail, dealer vs mill price, baki, bayna, challan/memo/VAT, "1 number/2 number" quality grade (uncertain), mistri (craftsman: mason, electrician, mechanic; ask which).

| Example phrasing | Meaning |
|---|---|
| Rod 10 mm er ton koto? | price per tonne |
| Shah cement 50 kg er rate koto? | price per bag |
| Bali ek gari koto? | price per truckload |
| Tiles 24x24 box e koto? | box vs piece: ask |
| Berger emulsion 3.64 litre ache? | brand + type + pack |
| Rod er dam barse na komse? | price trend, not one lookup |

**Ambiguous or regional.** ton (tonne vs AC ton), drum (18 L paint [S] vs 200 L oil, uncertain), gallon, ft (linear/square/cubic), pan (toilet/frying/paan), tar, kol/tap, rod (steel vs con-rod in auto shops), tar. WB uses "TMT bar/Fe500D" and "WC", and sells paint in 1/4/10/20 L (all unsourced). Dry-season (Nov-Apr) construction peak and monsoon slowdown are unsourced.

### 9. Footwear and bags

Footwear is counted in **pairs** (Banglapedia output figures) ([Banglapedia](https://en.banglapedia.org/index.php/Footwear_Industry)) [S]. Bikroy Bangla listings use "স্যান্ডেল", "স্লিপ-অন জুতা", "ফ্ল্যাট স্লিপার", "ক্যাজুয়াল" and Bangla-digit sizes ("সাইজ ৪০", "সাইজ ৩৭") ([Bikroy](https://bikroy.com/bn/55-sandals)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| জুতা / জুতো | juta (jutha, juto, jutta, joota) | generic |
| স্যান্ডেল, চপ্পল, স্লিপার | sandal (sandel), chappal (chapol, choppol), slipper | [S] |
| ফ্ল্যাট, হিল, ক্যাজুয়াল, ফরমাল, স্পোর্টস শু | flat, heel, casual, formal, sports shoe | [S] |
| কেডস, স্নিকার, বুট, লোফার | keds (uncertain as local), sneaker, boot, loafer | |
| ফিতা, সোল, ইনসোল, চামড়া, রেক্সিন | fita, sole, insole, chamra, rexine | rexine (uncertain) |
| ব্যাগ, ভ্যানিটি ব্যাগ, স্কুল ব্যাগ, ব্যাকপ্যাক, ট্রলি | bag (byag, beg), vanity bag, school bag, backpack, trolley | vanity bag (uncertain) |
| মানিব্যাগ, ওয়ালেট, বেল্ট | manibag, wallet, belt | |
| চেইন, জিপ | chain, zip | chain = zipper in BD; collides with jewellery chain |

**Units.** jora (pair) [S], number/size (numeric: ladies 36-41, men 39-45 EU-style typical, UK 6-11 uncertain: **the size system used by Bata/Apex was not verified**), carton (pairs per carton varies), dozen (socks), pis. **Money words.** paikari per-pair price, exchange, baki, bkash, nogod. Brands named in coverage: Bata, Apex, Bay, Lotto, Crescent, Janis (search summaries, uncertain) ([TBS](https://www.tbsnews.net/node/412366)).

| Example phrasing | Meaning |
|---|---|
| 41 number juta koyta ache? | "number" = size |
| aj koita jora biki hoise? | pairs sold today |
| kon size shobcheye beshi bikri hoy? | best-selling size |
| carton e koyta jora thake? | pairs per carton |
| paikari e 12 jora nile jora prothom koto? | wholesale per pair |

**Ambiguous or regional.** number (size vs phone), chain, jora/joda, katan vs carton. Eid-ul-Fitr is reported at about 30-40% of footwear turnover and Bata is said to earn about 35% of annual revenue from major festivals (search summaries, uncertain which pages) ([Daily Star on Bata](https://www.thedailystar.net/business/news/bata-shoe-sinks-losses-the-first-time-its-58-year-stay-bangladesh-1937989)). Hubs: Bhairab, Mirpur, Siddique Bazar, Bangabazar ([TBS Bhairab](https://www.tbsnews.net/node/35501)) [S].

### 10. Bakery and sweets (মিষ্টির দোকান, বেকারি)

The Wikipedia list of Bangladeshi sweets has 40 items with regional ties (Pantua of Manikganj, Chomchom of Porabari/Tangail, Kanchagolla of Natore, Roshomalai of Cumilla, Roshkodom of Rajshahi, Mishti doi/Bogurar doi of Bogra, Shahi jilapi of Old Dhaka) ([Wikipedia](https://en.wikipedia.org/wiki/List_of_Bangladeshi_sweets_and_desserts); [Banglapedia](https://en.banglapedia.org/index.php/Sweetmeats)) [S]. Attribution is contested: the Wikipedia list ties Amriti to Sylhet, the Daily Star to Barishal ([Daily Star](https://www.thedailystar.net/life-living/news/rich-history-and-tradition-our-sweets-3296651)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| রসগোল্লা | rosogolla (roshogolla, rasgulla, rasagolla) | [S]; "sponge rosogolla" a variant [S] |
| সন্দেশ | shondesh (sondesh, sandesh) | many types (pera, gur, jolbhora) |
| জিলাপি | jilapi (jilipi, jalebi, zilapi) | shahi jilapi [S], chanar jilapi [S] |
| চমচম, রসমালাই, পান্তুয়া | chomchom (chamcham), roshomalai (rasmalai), pantua (pantoa) | [S] |
| কালোজাম / গোলাপজাম | kalojam / golap jamun | same family [S] |
| মিষ্টি দই / বগুড়ার দই | mishti doi (misti doy) / Bogurar doi | sold by হাঁড়ি hari (earthen pot) or weight (uncertain unit) |
| পাউরুটি, বান, কেক, রাস্ক, টোস্ট, বিস্কুট | pauruti (pau ruti), bun, cake, rusk, toast, biscuit | retail bakery names [S] ([Othoba](https://othoba.com/bread)) |
| বাকরখানি | bakorkhani (bakarkhani) | Old Dhaka [S] |
| সিঙ্গারা / সমুচা | shingara / samosa | naming varies by shop (uncertain) |
| পিঠা, ক্ষীর, পায়েস, ফিরনি | pitha, khir, payesh, firni | |

**Units.** kg, pis, hari, dozen, packet/box, "pound" for cake size (1 pound about 450 g; 1/2/3 pound; uncertain). **Money words.** bayna/advance (cake orders; uncertain), baki, dhar, bill (payable to milk and sugar suppliers), paikar price (rusk), labh. Ramadan items (piyaju, beguni, jilapi, muri, haleem, chhola; "roja kholai" = iftar in a Dhaka press usage) are sourced ([Dhaka Tribune](https://www.dhakatribune.com/bangladesh/dhaka/375201/dhaka-streets-abuzz-with-iftar-delicacies-on)) [S].

| Example phrasing | Meaning |
|---|---|
| aj koto pis rosogolla bikri hoise? | pieces sold |
| kal er cake koyta baki ache? | yesterday's cakes left ("er" with a noun) |
| misti doi er hari koyta ache | pots in stock |
| birthday cake 2 pound er dam koto? | pound as a size |
| kar kache bayna nisi aj? | advance orders taken today |
| aj ki ki nosto hoise? | wastage ("nosto", usage uncertain) |

**Ambiguous.** pau (bread) vs pao (quarter ser), mishti (taste vs product), cake vs dry cake vs rusk, doz (eggs vs cake pieces), ros (juice vs syrup), kg for sweets vs vegetables, "set" (set menu). Unconfirmed: "mal tola", "bayna", "nosto", "pound".

### 11. Books and stationery

Rokomari's top categories are in Bangla script (বই, ইসলামি বই, একাডেমিক, স্টেশনারি, কিডস জোন, and exam-prep) and product names mix English tokens (HSC, Admission Test Preparation, 2026) ([Rokomari](https://www.rokomari.com)) [S]. Guide-trade vocabulary: গাইড, মডেল গাইড, জোড়া বই (an English 2nd-paper plus Bangla 2nd-paper pair sold together), প্যাকেট (bundle), অবিক্রীত (unsold), ছাড়, কমিশন (paid to schools), publishers Lecture and Panjeri; a Class 8 pair was Tk 1,060 in March 2025 ([Prothom Alo](https://www.prothomalo.com/bangladesh/district/lum6249tku)) [S]. The education minister said in 2026 that note-guides are being phased out in favour of "সহায়ক বই" (search-summary level), so a shop database may hold both words ([Prothom Alo](https://www.prothomalo.com/education/gvqlexvmjp)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| বই | boi (boy, bai) | |
| পাঠ্যবই, গাইড, সহায়ক বই, মডেল টেস্ট | pathyo boi, guide (gaid), sohayok boi, model test | policy flag [S] |
| খাতা | khata (kata, copy) | notebook and also ledger |
| কলম, পেন্সিল | kolom (kalam), pencil (pensil) | pen vs pencil are separate |
| রাবার, স্কেল | rubber (raber), scale | eraser; ruler (not a weighing scale) |
| জ্যামিতি বক্স, ফাইল, স্টেপলার, মার্কার | geometry box, file, stapler, marker | |
| কাগজ, রিম, দিস্তা | kagoj, ream (rim, reem), dista (dosta) | ream = 500 sheets in current listings [S] ([Rokomari](https://www.rokomari.com/product/283606/papertech-a4-offset-paper-80-gsm-500-sheets); [Chaldal "1 rim"](https://chaldal.com/bashundhara-a4-size-paper-gsm-80)); dista traditionally 24 sheets (25 by some), (uncertain) |
| ক্লাস / শ্রেণি | class 9 = ক্লাস নাইন = নবম = IX | normalise to one value |
| এসএসসি, এইচএসসি | SSC, HSC, "1st year/2nd year" | HSC years called 1st/2nd year [K] |
| ১ম / ২য় পত্র | 1st paper / 2nd paper | [S] |

A books lookup uses {class, subject, paper, publisher, medium (Bangla/English version), edition-year, kind}; stationery uses {item, brand, size/GSM, pack, colour} [K]. **Units.** pis, dozen, box, ream, pack, pg (page count), A4/A3, GSM 70/80. **Money words.** baki, chhar/discount, commission, advance for school orders, wholesale, memo/voucher. Government textbooks are normally distributed free through schools, so how shops treat them is (uncertain).

| Example phrasing | Meaning |
|---|---|
| class 9 er boi koyta ache? | needs subject: ask |
| Panjeri er class 8 guide ache ki? | publisher + class |
| A4 ream er stock koto? | ream |
| khata 200 pg koyta ase | page count attribute |
| school er order er advance koto nisi? | advance on an order |

**Ambiguous.** khata (notebook vs ledger), "rubber" (eraser), "scale", dista, nogod. New-year guides typically reach the market in February; the Class 8 pairs were delayed to March 2025 [S]; Ekushey book fair (February) is distinct from the January textbook festival (uncertain).

### 12. Furniture and homeware

Bed sizes are written in feet: Bikroy ads use "৫/৭", "৬/৭", "৪/৭" and "৬×৭ ফুট কিং সাইজ" with a cheaper "কুইন সাইজ" (asking prices only) ([Bikroy](https://bikroy.com/bn/20-bed-frames)) [S]. Wood names with uses: সেগুন teak, মেহগনি mahogany, গামারি, গর্জন, plywood/MDF/particle board, with a monsoon-damage warning for MDF and particle board ([Daily Star Bangla](https://bangla.thedailystar.net/business/news-3956856)) [S]. Hatil's menu lists King, Queen, Semi Double and "Toshok" ([Hatil](https://hatil.com/mattress)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| খাট | khat (khaat, kaht), bed | bed frame; mattress is separate; পালঙ্ক palonko (big ornate wooden bed) |
| চৌকি | chowki (choki) | low plank bed |
| আলমারি | almari (almirah, almera, wardrobe) | steel vs wooden; 2/3 door |
| ড্রেসিং টেবিল, ডাইনিং সেট, শোকেস | dressing table, dining 4/6 chair, showcase | showcase seen on Bikroy [S] |
| সোফা সেট | sofa set, 3+1+1, 3+2+1, L-shape | seater pattern matters |
| তোশক / গদি | toshok (tushok, toshak) / godi (gadi), foam | toshok [S]; foam thickness in inches |
| বালিশ, লেপ, কম্বল, মশারি, পর্দা | balish, lep, kombol, moshari, porda | |
| চেয়ার, টুল, মোড়া | chair, tool (stool), mora | "tool" misspells stool |
| হাঁড়ি, পাতিল, ডেকচি, কড়াই | hari, patil, dekchi, korai | patil common in Dhaka/Chattogram (uncertain) |
| প্লেট, গ্লাস, বাটি, ডিনার সেট | plate, glass, bati, dinner set (32 pcs) | |

Lookup attributes: {item, size (6/7), wood/material, brand (Hatil, Otobi, Partex, Navana), set contents, colour, new vs used, doors/drawers} [K]; Partex appears on Bikroy ads [S]. **Units.** pis, set, jora, dozen (pots), feet/inch. **Money words.** kisti/EMI (Hatil advertises flexible EMI and a 3-day return with a 10% service charge, search-summary level [S]), advance/bayna for made-to-order, delivery charge/gari bhara, baki, discount.

| Example phrasing | Meaning |
|---|---|
| 6/7 khat ache koyta? | beds of 6 x 7 ft |
| toshok koyta ache, godi koyta | cotton vs foam mattress |
| Karim shaheb er kisti koto baki? | remaining installments |
| dressing table er advance koto nisi? | advance on orders |

**Ambiguous.** korai (pan) vs kori (the wood কড়ই), tool, set, godi (foam mattress or seat cushion), "6/7" vs "king" mapping (queen often 5x7 or 5.5x7, uncertain), mattress size vs bed size.

### 13. Auto parts and accessories

Shopkeepers name parts as "<bike or car model> er <part>" ("Pulsar er chain set") [K]. Bikroy and Othoba categories show motorcycle parts, brakes, suspension, oils, chains, brake pads, discs, spark plugs ([Bikroy](https://bikroy.com/bn/12-motorcycle-chains); [Othoba](https://othoba.com/parts-spares)) [S]; Bajaj parts are distributed by Runner ([Daily Star](https://www.thedailystar.net/node/1603282)) [S].

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| প্লাগ | plug (plag), spark plug | also electrical plug |
| ফিল্টার | filter (filtar) | air/oil/fuel: ask |
| ক্লাচ প্লেট, ক্লাচ সেট | clutch plate (clach), clutch set | |
| ব্রেক প্যাড / ব্রেক শু | brake pad (brek pad) / brake shoe | disc vs drum; both listed [S] |
| শক | shock (shok, shocker) | sold per pair (জোড়া) |
| চেইন সেট | chain set (chen set), chain sprocket | chain + two sprockets |
| পিস্টন কিট, বিয়ারিং | piston kit, bearing | 6203 is a part number, not a count |
| টায়ার, টিউব | tyre (tire, taiyar), tube | size 2.75-17, 90/90-17, 155/65R13 |
| ব্যাটারি | battery, 12V 35Ah, "35 amp" | |
| মবিল | mobil, engine oil, 20W-50, 10W-30 | not the phone "mobile" |
| সিএনজি | CNG | three-wheeler auto in BD (fairly confident, unsourced for speech); used CNG autos are listed from about Tk 88,000 ([Bdstall](https://www.bdstall.com/bn/cng/)) [S] |
| পালসার, ডিসকভার, হাঙ্ক, জিক্সার, ফ্যাজার, সিবিআর, রানার | Pulsar, Discover, Hunk, Gixxer, Fazer, CBR, Runner | |
| অরিজিনাল, কোম্পানি মাল, কপি, লোকাল, চায়না, ইন্ডিয়ান, তাইওয়ান, রিকন্ডিশন | original, company mal, copy, local, china, indian, taiwan, recon | origin words double as quality tiers (uncertain) |

**Units.** pis, set (chain/clutch/piston), joda, litre/drum, cc (150cc is a primary compatibility key), tyre size, volt/Ah, dozen. **Money words.** dhar/baki, original vs copy price, company mal vs local, warranty/guarantee. Example phrasings include "Pulsar 150 er chain set ache?", "Mobil 20W-50 kon ta ache, koto?", "Shock ek joda 1800 hobe?", "Tyre 2.75-17 koyta ache?", "Honda plug koto?" (ambiguous, uncertain), "Rahim mistri r baki koto?". **Ambiguous.** filter, plug, mobil, "original" (genuine vs original-quality copy), mistri, numbers in names (150, 125 are cc), rickshaw parts (uncertain). Winter battery demand is (uncertain).

### 14. Jewellery and watches

BAJUS publishes four rate classes per bhori: ২২ ক্যারেট, ২১ ক্যারেট, ১৮ ক্যারেট and সনাতন পদ্ধতির সোনা ([TBS Bangla, 2 Feb 2026](https://www.tbsnews.net/bangla/bangladesh/news-details-447521)) [S]. A dated snapshot, 21 Jul 2026: 22K Tk 2,21,441; 21K Tk 2,11,468; 18K Tk 1,81,608; traditional Tk 1,48,366 per bhori ([TBS](https://www.tbsnews.net/bangladesh/bajus-raises-gold-price-tk1633-bhori-1493736)) [S]. Rates change many times a month, so always show a timestamp. No source defines the purity of the "সনাতন" class.

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| সোনা, স্বর্ণ | sona (shona), shorno, swarno, gold | spoken vs news/BAJUS |
| রুপা, হীরা | rupa, hira (heera), diamond | |
| পান্না, চুনি, নীলা, মুক্তা, প্রবাল, গোমেদ | panna, chuni, nila, mukta, probal, gomed | gemstones; রাশিপাথর rashi pathor |
| চুড়ি, বালা | churi, bala | bangle set / thick bangle |
| হার, নেকলেস, চোকার, মটর হার | har, necklace, choker, motor har | choker, tikli, motor har, prem phas named in press ([Prothom Alo](https://www.prothomalo.com/lifestyle/shopping/l5k6t5x84a)) [S] (search-summary level) |
| আংটি | angti (aungti), ring | |
| নাকফুল, কানের দুল, কানবালা, ঝুমকা | nakful, kaner dul, kanbala, jhumka | |
| টিকলি, লকেট, চেইন, ব্রেসলেট, পায়েল | tikli, locket, chain, bracelet, payel | |
| বার | gold bar, 10 tola bar | 10-tola bar most commonly traded ([Wikipedia](https://en.wikipedia.org/wiki/Tola_%28unit%29)) [S] |
| ঘড়ি | ghori (watch), wall clock = দেয়াল ঘড়ি | collides with ভরি bhori by voice and typo |
| ওয়ারেন্টি, সার্ভিসিং, ব্যাটারি/সেল, স্ট্র্যাপ | warranty, servicing, cell, strap | |
| অরিজিনাল, মাস্টার কপি, ফার্স্ট কপি | original, master copy, first copy | master/first copy (uncertain, no source) |
| Casio, Titan, Fastrack, Rolex, Seiko, Citizen | kasio, titan, fastrak | Titan/Fastrack/Casio/Rolex listings on Bikroy ([Bikroy](https://bikroy.com/bn/watches/fastrack)) [S] |

**Weights, safe conversions.** 1 ভরি = 11.664 g = 16 আনা = 96 রতি ([bn Wikipedia](https://bn.wikipedia.org/wiki/ভরি); BAJUS notices) [S]; 1 ana = 0.729 g; 1 roti = 0.1215 g (6 roti per ana) [S]; tola is the same weight in BD use (British standard 11.6638038 g) ([Wikipedia](https://en.wikipedia.org/wiki/Tola_%28unit%29)) [S]. "Point" as 1/10 roti (0.01215 g) rests on one secondary source ([teachers.gov.bd](https://teachers.gov.bd/blog/details/849243)) and is (uncertain). The Indian ratti is quoted at about 0.12125 g, and some Indian states define a "pavan/bhori" as 8 g: do not import these ([IIFL Bangla](https://www.iifl.com/bn/blogs/gold-loans/gold-weight-measures-used-in-different-indian-states)) [S] (search-summary level). Karat (purity: 22K = 91.67%, 21K = 87.5%, 18K = 75%, arithmetic from 24 parts) is different from carat (gem weight, 0.2 g) [K]. Internally carry grams, parse mixed weights ("২ ভরি ৫ আনা ৩ রতি" = 27.3375 g, arithmetic from the table, not a sourced figure), price = weight x class rate + making charge (+ VAT if the rate excludes it), ana price = vori price / 16, roti price = vori price / 96 [S for the division]. Diamond ornaments need a cash memo stating colour and carat and a certificate above "50 cents" (0.50 ct) under BAJUS's 2023 guidelines ([Financial Express](https://thefinancialexpress.com.bd/trade/bajus-rolls-out-new-jewellery-guidelines)) [S].

**Money and trade words.** মজুরি mojuri / making charge [S], ক্ষয় khoy (wastage, spoken, not in BAJUS sources, uncertain), exchange/bodol, buy-back, purano sona, cash memo/roshid (required for old-gold purchase) [S], hallmark, kisti, advance/bayna, baki, paona/dena. "moni" and "kombi" were suggested in the brief; **no source and no convincing meaning was found, so do not use them**.

**Conflicting figures kept as conflicts (do not hard-code; make them per-shop settings).**

| Item | Figures reported | Source |
|---|---|---|
| Minimum making charge | Tk 300 per gram of gold and Tk 26 per gram of silver (2023); 6% (15 May 2024); 6% "varying with design" (Feb 2026) | [Financial Express](https://thefinancialexpress.com.bd/trade/bajus-rolls-out-new-jewellery-guidelines); [ITV Bangla](https://www.itvbd.com/economy/147638); [TBS Bangla](https://www.tbsnews.net/bangla/bangladesh/news-details-447521) |
| VAT | 5% added on top (TBS Bangla, 2 Feb 2026) vs already included in the price (TBS, 21 Jul 2026); the 2024 ITV article does not mention VAT | as above, [TBS](https://www.tbsnews.net/bangladesh/bajus-raises-gold-price-tk1633-bhori-1493736) |
| Gold exchange deduction | 10% of current weight (2023), 10% (2024) | FE; ITV |
| Gold buy-back / old gold | 20% (2023); 15% (2024); about 17% (July 2026, via [Khobor Sangjog](https://www.khoborsangjog.com/117753), page not directly readable) | as listed |
| Silver / diamond | silver exchange 30%, buy-back 40%; diamond discount max 25%, exchange 15%, buy-back 25% (2023) | FE |

Which BAJUS notice is binding now could not be confirmed (no official BAJUS page was fetched).

| Example phrasing | Meaning |
|---|---|
| ajker sonar dor koto? / 22 karat vori koto ajke? | today's rate; class slot needed, default 22K and echo |
| ei churi 2 vori 3 ana, dam koto hobe? | 25.515 g by the table (arithmetic) |
| 6% mojuri dile 4 vori er set er total koto? | total with making charge |
| purano gold diye notun har nile koto katbe? | deduction: shop-config |
| gold diamond ring 25 point | likely 0.25 ct diamond; follow up |
| Titan er women watch warranty kotodin? | warranty months |
| gold loan baki | ledger balance or a bank loan: ask |

**Seasonal.** Wedding season (often winter), Eid, Puja (Hindu customers), Pohela Boishakh (halkhata) are [K]; wedding-season months are not verified.

### 15. Toys and gifts

Chawkbazar (Dhaka) holds one of the country's largest wholesale toy markets, supplied by factories in Kamrangirchar ([bdnews24](https://bdnews24.com/media-en/image/x2el6uy2mr)) [S]. Eid fairs sell plastic toys, whistles and balloons, and Eidi (gift money) goes with or instead of gifts ([Dhaka Tribune](https://www.dhakatribune.com/amp/feature/405633/children-and-eid-joy); [Daily Star](https://www.thedailystar.net/news/eid-gifts)) [S]. No Bangladesh-specific toy-shop product list was found; the table is category knowledge plus these press snippets.

| Bangla | Banglish (variants) | Meaning / note |
|---|---|---|
| খেলনা | khelna (khelona, kheloona), toy | generic |
| পুতুল | putul (puthul), doll | "Barbie" as generic for fashion doll (uncertain) |
| টেডি বিয়ার | teddy (tedy), soft toy | |
| রিমোট গাড়ি | remote gari, rc car | |
| বেলুন, বাঁশি | belun (balloon), banshi (whistle) | [S] |
| ব্লক, লেগো | block, lego | "Lego" generic for blocks (uncertain) |
| লুডু, ক্যারাম, দাবা, ধাঁধা | ludu, carrom, daba, puzzle | |
| শোপিস, গিফট বক্স | showpiece (shopis), gift box, wrapping | |
| ঈদি | eidi (eidy) | gift money [S] |
| সেল / ব্যাটারি | cell, battery | "cell" = AA/AAA battery (uncertain) |
| চায়না মাল, লোকাল, অরিজিনাল, কপি, ফার্স্ট কপি | china mal, local, original, copy, first copy, A-grade | quality/origin flags, not just origin (uncertain) |

Age words: shishu, bachcha, chhele, meye, "boyosh", "5-6 bochhor". **Units.** pis, dozen (wholesale "dojon dore"), packet/pkt (balloons), set, box. **Money words.** paikari/dojon rate, baki, discount, advance, bkash, nogod.

| Example phrasing | Meaning |
|---|---|
| remote gari ar koyta ache? | stock |
| cell lage emon toy koyta ache? | battery-powered filter (uncertain) |
| Eid er age ki ki mal tulbo? | reorder/seasonal; data only, no advice |
| 5-6 bochhor er jonno ki ki ache? | catalogue by age |
| বাচ্চাদের গাড়ি কয়টা আছে? | Bangla-script stock |

**Ambiguous.** set (kitchen-set toy vs set menu), cell, box (gift box vs sweet box), original/copy, "pic". Toy and gift seasonal items beyond balloons, whistles, toys and Eidi are [K].

## The words every trade shares

### Question words and function words

| Meaning | Banglish variants (common first) | Bangla | Note |
|---|---|---|---|
| how much | koto, kto, kato, kt | কত | "koto taka"; most frequent word in the domain |
| how many | koyta, koita, koyti, koy, koyjon (people) | কয়টা, কয়টি, কয়জন | -ta/-ti classifier suffixes (ekta, duita, tinta, charta) |
| what / yes-no | ki, kii, ky | কী (what), কি (particle) | "ase ki?" = is there; "ki ase?" = what is there |
| which | kon, kon kon | কোন | list answer |
| who / whose | ke, ke ke / kar, kader, kake | কে / কার, কাদের | "kar kache baki" = from whom due |
| when / where / why | kobe, kokhon / kothay / keno | কবে, কখন / কোথায় / কেন | keno = diagnostic, not one lookup |
| is there / none | ache, ase, achhe, ashe / nai, nei, nay | আছে / নেই, নাই | "ase" also spells ashe (comes) |
| finished | sesh, shesh, ses | শেষ | "stock sesh" |
| more / less | beshi, besi / kom, kam, kum | বেশি / কম | kam (work) vs kom (less) collide when o is typed a |
| most | shobcheye, sobcheye, shob theke | সবচেয়ে | "sobcheye beshi bikri" = best seller |
| all / total / average | shob, sob / mot, total / gor, average | সব / মোট / গড় | |
| previous / last / next | ager, goto / porer, agami | আগের, গত / পরের, আগামী | |
| this / now | ei, ajker / ekhon, ekhono | এই, আজকের / এখন | |
| or | na, naki | না, নাকি | "beshi na kom?" |

Command verbs (shopkeepers address the phone like a clerk; the verb may be omitted): show = dekhao, dekhan, dekhi, dekhe dao; tell = bolo, bolen, bolun; give = dao, den, ber koro; find = khujo, khuje dao; calculate = gono, hishab koro; send = pathao, pathan; "batao" is Hindi-influenced WB usage, used by some BD youth [K].

### Data nouns and trade words (condensed)

| Concept | Banglish | Bangla | Note |
|---|---|---|---|
| sale | bikri (bikkri, sell, sale, becha) | বিক্রি, বেচা | "sell" used as an English noun |
| purchase | kena, kroy, kenakata | কেনা, ক্রয় | kroy is accounting-formal |
| bill / receipt | bill, memo, cash memo, invoice, voucher, roshid, chalan | বিল, মেমো, রসিদ, চালান | challan: delivery note in trade; also a deposit slip in BD (scope uncertain) |
| ledger | hisab, khata, jer, bakir khata | হিসাব, খাতা, জের | jer = balance carried forward; "hisab mele na" = books don't tally |
| stock / goods | stock, mojud, maal, jinis | স্টক, মজুদ, মাল | maal is universal in BD shops; never use of people |
| price | dam, dor, rate, mullo, MRP | দাম, দর, মূল্য | kena dam = cost; becha dam = selling price |
| owed to me | baki, dhar, udhar, pabo, pawna | বাকি, ধার, পাওনা | direction is the issue |
| I owe | dibo, dena, dite hobe | দেবো, দেনা | |
| profit / loss | labh, lav, munafa / loksan, khoti | লাভ, মুনাফা / লোকসান, ক্ষতি | |
| expense / income | khoroch, kharcha / aay | খরচ / আয় | |
| discount | discount, chhar, komiye dewa | ছাড় | |
| return | ferot, pherot, return, bodol/exchange | ফেরত | "fercha" could not be confirmed as a real shop term (uncertain) |
| cash / MFS | nogod, cash / bkash, nagad, rocket, upay | নগদ, ক্যাশ / বিকাশ, নগদ, রকেট | upay in speech (uncertain) |
| supplier | mohajon, paikar, supplier, company, dealer, party | মহাজন, পাইকার | direction depends on trade; mohajon can be a moneylender |
| customer | khoddor, customer, grahok, party | খদ্দের, গ্রাহক | "party" = credit customer in wholesale trades |
| staff / owner | staff, salesman, boy, malik | কর্মচারী, মালিক | |
| expiry | expiry, meyad | মেয়াদ | |
| slow / best | chole na, pore ache / bhalo cholche, sera | চলে না / ভালো চলছে | |
| reorder | lagbe, order dite hobe, anbo | লাগবে | "ki ki lagbe?" |
| daily closing | closing, din sesh, aj er hisab, cash mela | ক্লোজিং | |
| tagada (reminder) | tagada message | তাগাদা | TallyKhata feature name [S] |

"Baki" and "khata" are the core words of BD khata apps ([TallyKhata](https://www.tallykhata.com/7-reasons-why-tallykhata-is-the-perfect-bookkeeping-payment-solution-for-shops-and-small-businesses/)) [S]; a TBS feature records that credit is written in a ledger, month-end disputes are common, and TallyKhata sends an SMS with item price and outstanding balance ([TBS](https://www.tbsnews.net/feature/panorama/tallykhata-digitising-culture-buying-and-selling-credit-154465)) [S]. Common fillers to drop: please, plz, bolo, bolen, dekhi, ektu, bhai, apu, boss, sir, ta, to [K]. Honorifics (bhai, apa, chacha, mama, sir, madam, dada) are stripped for name matching; apni/tumi/tui are not reliable intent cues [K].

### Shared units and counting words

Retail BD mixes metric (kg, gram, litre, piece, dozen, carton, packet) with traditional Bangla counts (hali, gonda, kuri, pon, joda) and pre-metric weights (ser, mon); metric was introduced by ordinance in 1982 ([Banglapedia](https://en.banglapedia.org/index.php?title=Agrometrology)) [S]. Traditional values vary by item and district, so they should be configured per shop rather than hard-coded.

| Unit | Banglish | Value / note |
|---|---|---|
| piece / classifier | pis, pcs, -ta, -ti, -khana | each |
| dozen | dojon, dozen, dz | 12 |
| hali | hali | 4 in most retail use (eggs, fruit) |
| gonda | gonda, ganda | 4 items |
| pon | pon | 80 |
| kuri | kuri | 20 |
| pair | joda, jora | 2 |
| packet, carton, sack, bundle, roll, bottle, box, tin | packet, carton, bosta, bundle, roll, botol, box, tin | trade-specific sizes |
| strip | pata, strip | pharmacy |
| ser, pao, mon | ser, pao/poa, mon | ser about 0.933 kg [S]; pao = quarter ser [S]; mon = 40 ser in most BD usage |
| metre / yard / gaj | meter, yard, gaj | cloth |
| ton | ton | 1,000 kg bulk; AC capacity in electronics |

**Conflicts kept as conflicts (Banglapedia and others).** hali is 4 in most use, 5 for banana and mango, 4 in Barisal and 7 for fish in Noakhali; in Faridpur 1 pon = 20 hali with hali = 4 items. Pon is 80 items (20 ganda) in one entry, 80 numbers in Rajshahi and 2 ganda in Dinajpur. Ganda is 4 numbers in Gaibandha, but one Barisal entry gives 1 ganda = 4 hali (i.e. 16). Kuri is 20 generally but 22, 24 or 25 for fish, banana and betel nut by district. A seer is 80 tola (Tangail) but a milk seer is 105 tola. A maund (mon) is 40 seer (Rajshahi, Gaibandha, Noakhali) but a Chittagong entry gives 4 ari x 18 seer = 72; a dhara/dhari is 5 seers in some districts and 5 kg in others (Dinajpur, Mymensingh). One poa is also the betel-leaf count of 32 bira ([Banglapedia](https://en.banglapedia.org/index.php?title=Agrometrology)) [S]. The seer-to-kg figures also disagree between sources: about 0.933 kg (Wikibooks) vs "roughly 1 kg" (unverified, notes) vs "about 37.3 kg" for a mon from the 0.933 value vs "treated as 40 kg" in rice trade (unverified). In land measure, 1 kani = 20 gonda = 120 decimal and 1 gonda = 4 kora, with a different Sylheti system ([Legal Seba](https://legalseba.com/bd-services/land-measurement-system-in-bangladesh/)) [S]. Ream is 500 sheets in current listings (historically 480, [K]) and dista is 24 or 25 (uncertain). The notes' recommendation is to store the unit as the shop writes it plus a per-unit conversion with a region option.

### Shared money and payment vocabulary, time and season anchors

Amounts appear as ৳, Tk, Tk., TK, tk, taka, টাকা, "/-", "500 only", BDT and "500tk"; "taka" and "paisa" also mean money in general ("taka nai") [K]. "Rs" is WB/India and rare in BD [K]. Payment channels are cash, bKash, Nagad, Rocket, Upay (uncertain in speech), card/POS, bank deposit, cheque, COD. MFS names are brands, not Bangla words ("bkash e dilo"). Seasonal anchors: Eid-ul-Fitr, Eid-ul-Adha, Ramadan, Shab-e-Barat, Durga Puja, Pohela Boishakh and halkhata, Pohela Falgun, Boi Mela (February), 21 Feb, 16 Dec, winter (shit), monsoon (borsha), wedding season [K]. "Eid er age/pore" must be resolved from a per-year holiday table because Eid follows the lunar Hijri calendar and moves about 10 to 11 days earlier each Gregorian year [K, not verified in the notes' session]. Regional dialect shop vocabulary (Chattogram, Sylhet, Noakhali, Barishal, Rajshahi, Rangpur) was not researched; the only confirmed dialect-level facts are that Chittagonian draws far more on Arabic, Persian and Turkish and that Sylheti differs significantly in vocabulary and syntax ([Chittagonian mirror](https://bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq.ipfs.dweb.link/wiki/Chatgaya.html); [Sylheti mirror](https://www.wikiwand.com/en/articles/Sylheti_language)) [S]. Candidate dialect forms such as Sylheti "kita" for "what", Rangpur "kone/kothe" for "where", "naai" (Sylhet) and "sesh hoiya gese" (Chattogram/Noakhali) are (uncertain) and need native-speaker review.

## Writing styles and noise: six ways one question arrives

The same question, "আজকের বিল কত?" / "ajker bill koto?", reaches the assistant in many forms. The catalogue below was constructed by the researchers (not corpus-derived; frequencies unknown) and its job is to seed a robustness test set.

| # | Written form | What went wrong or varied |
|---|---|---|
| 1 | আজকের বিল কত? | clean Bangla, NFC, Bangla question mark |
| 2 | আজকের বিল কতো / আজকের বিলটা কত / আজকের বিল কত ? | spelling variant কত~কতো; suffix -টা; space before "?"; "।" instead of "?" |
| 3 | আজকের bill কত? / আজকের বিল koto? | code-mixing, two scripts in one sentence |
| 4 | ajker bill koto? | Banglish, standard-ish |
| 5 | ajker bil kto / ajker bill kto?? | dropped vowel, single l, repeated "?" |
| 6 | aj ker bill koto / ajkerbill koto | wrong word boundaries (split or merged) |
| 7 | ajkr bil kto / ajkr bill kt | vowel-less SMS skeleton |
| 8 | aajker bill kotooo? / AJKER BILL KOTO | long-vowel doubling, emphasis, all caps |
| 9 | ajkwr bill koyo | QWERTY adjacent-key slips (uncertain) |
| 10 | voice typing: "আজকের বিল কত" with no punctuation, or আজ কের বিল কত / আজকে বিল কত | ASR word boundaries and -কে/-কের; ASR output may be Latin if the keyboard language is English |
| 11 | AvRKvi wej KZ? | pasted legacy Bijoy text read as Latin (constructed from memory, exact glyphs uncertain) |

### Banglish spelling variation is systematic

BanglaTLit's Figure 1 shows one sentence romanized several ways: "cholo/chlo", "khlte/kelte", "jai/gai/jaye", "bhalo/vlo/balo", "bhai/vai/vi"; the authors note Bangla is phonemic ("written as it sounds"), which gives writers latitude ([BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859)) [S]. Wikipedia's romanisation article lists the known mismatches: অ is "a" in ISO but pronounced /ɔ~o/ and written "o" in Avro; ভ is bh or v; ফ is ph or f; শ/ষ/স are all usually [ʃ] ([Wikipedia](https://en.wikipedia.org/wiki/Romanisation_of_Bengali)) [S]. The Avro Phonetic map (অ=o, আ=a, ই=i, ঈ=I/ee, উ=u/oo, জ=j, য=z, ফ=ph/f, ভ=bh/v, ট=T, ড=D, ণ=N, ড়=R, য়=y/Y) explains inherited habits such as "zay" for যায় ([Borno docs](https://borno.codepotro.com/docs/guide/layout-avro.html)) [S]; OmicronLab itself says JavaScript re-implementations of Avro are not 100% compatible ([OmicronLab](https://omicronlab.com/developers.html)) [S], and the Avro statements beyond vowels in the notes are [K]. Fold rules to apply when building a matching key [K]:

| Sound | Typed variants | Fold |
|---|---|---|
| অ / আ | o, a, aa (koto/kato, mohajon/mahajan) | o ≈ a in non-initial position |
| ই ঈ | i, ee, ii, y at end (baki/baky) | collapse |
| উ ঊ | u, oo, uu (mullo/mulyo; mojud/moojud) | collapse |
| ক খ / গ ঘ / ত থ / দ ধ | k/kh, g/gh, t/th, d/dh | aspirate often dropped (dhar/dar, dudh/dud, khata/kata) |
| চ ছ | c, ch, chh | merge |
| জ য | j, z | merge |
| প ফ | p, ph, f | ph = f |
| ব ভ | b, v, bh | merge (bhai/vai/bai) |
| শ ষ স | s, sh, S | merge (shob/sob; shesh/sesh) |
| ও consonant | w, o, u (pawna, dewa/deya) | merge |
| doubled consonants | kk, tt, ll, bb (bikkri, lokkho, mullo) | collapse |
| ঁ | omitted (pach/panch/paach) | |
| ড় ঢ় | r, R, rh | |

Other documented patterns: all lower-case, vowels dropped in speed typing ("kt tk", "bkri", "hsb"), "r" for "er" ("ajkr"), missing question marks so the question word is the only clue, and "bhai/vai", "plz" at line start [K]. Even reputable pages disagree on one word: nazirshail / najirshail / nazirshile; roshogolla / rasagolla / rasgulla; chomchom / chamcham ([Chaldal](https://chaldal.com/rices); [Wikipedia sweets](https://en.wikipedia.org/wiki/List_of_Bangladeshi_sweets_and_desserts)) [S]. Wikibooks' scholarly romanisation (dôjon, pãchsho, ṭaka) differs from what shopkeepers type (dojon, pachsho, taka) ([Wikibooks](https://en.wikibooks.org/wiki/Bengali/Shopping)) [S]. The frequency ranking of variants (how often "kto" vs "koto") is unmeasured; Dakshina's lexicon carries attestation counts that could be mined offline.

### Unicode and keyboard traps in Bangla script

NFC/NFKC fixes only part of the problem. The nukta letters have two encodings, atomic U+09DC ড়, U+09DD ঢ়, U+09DF য় versus decomposed base + U+09BC; the atomics are on the composition-exclusion list so normalisation yields the decomposed form, and Bangladesh's ICT Division submitted proposal L2/20-002 (2020) to change this (whether it was adopted was not verified) ([UTC L2/20-002](https://www.unicode.org/L2/L2020/20002-bangla-mods.pdf)) [S]. Conjuncts are consonant + hasant (U+09CD) + consonant; after র, "র + ্ + য" renders as reph + ya by default and inserting ZWJ after the ra gives ya-phala, so two visually identical spellings can exist; khanda-ta should be U+09CE ৎ but pre-Unicode-4.1 text may carry ত + ্ + ZWJ; ো and ৌ are two-part vowel signs ([Unicode 15 ch.12](https://www.unicode.org/versions/Unicode15.0.0/ch12.pdf)) [S]. NFC does not fix confusable letters (ন/ণ, শ/ষ/স), and a Stack Overflow thread notes the csebuetnlp normalizer left ন vs ণ unchanged ([mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/70677462/unicode-text-normalization-in-bengali)) [S]. Even Dakshina's authors, after "extensive additional visual normalization", measured a mean character error rate of 0.054 between original and re-typed native strings ([Dakshina paper](https://arxiv.org/pdf/2007.01176)) [S]. Spelling variants also exist inside Bangla script (বাংলা / বাঙলা; কত / কতো; বাকি / বাকী; বিক্রি / বিক্রী; পেঁয়াজ / পেয়াজ; রসুন / রসুণ). Legacy Bijoy/SutonnyMJ text pasted into a Unicode field appears as odd Latin symbols ([Wikipedia](https://en.wikipedia.org/wiki/Bengali_input_methods)) [S]; it is unlikely in short typed queries and likely only when pasting from old documents.

The researchers' recommended normalisation steps [K]: (1) NFC; (2) strip ZWJ/ZWNJ for matching; (3) map ত+্+ZWJ to ৎ and fix split vowel signs; (4) map digits ০-৯ to 0-9, strip Indian-grouping commas, canonicalise ৳/Tk/"/-", unify "।", "?", "!" and drop emoji; (5) fold confusables into a matching key only, keeping the original for display (ণ→ন, শ/ষ→স, য→জ, ঈ→ই, ঊ→উ, ড়/ঢ়→র with (uncertain) status, ৎ→ত, ক্ষ→খ); (6) detect Bijoy garble by character-class heuristics; (7) lower-case and tokenise per script, then map both scripts to one phoneme skeleton.

### Typos, code-mixing and voice artefacts

Real keyboard errors in Bangla script have a dataset: BSpell's "Bangla Real Error" set has 6,300 sentences typed by ten participants on an English QWERTY keyboard, with compound characters, similar-sounding single letters and similar vowel signs as the main error sources ([BSpell](https://arxiv.org/abs/2208.09709)) [S]. The VAIYAKARANA benchmark (92,830 incorrect and 18,426 correct sentences) names ন/ণ and স/শ/ষ as confusion sets ([VAIYAKARANA](https://arxiv.org/abs/2406.14284)) [S]. QWERTY adjacent-key slips for Banglish are plausible but unmeasured (uncertain).

Code-mixing is the norm, not the exception. Bangla is the matrix language with English inserted mostly as content words, and intra-sentential, inter-sentential, tag and intra-word switching are all reported in Bangladeshi social media ([IJELR](https://jurnal.utu.ac.id/IJELR/article/view/14906)) [S]. A survey thesis reports about 12.9% prefer Bangla only while about 90% still code-switch ([BRAC thesis](https://dspace.bracu.ac.bd/xmlui/handle/10361/15958)) [S]. On Daraz, 1.74M reviews split roughly 37.77% Banglish, 31.27% English, 25.04% Bangla and 5.92% code-mixed by heuristic (the paper's text is internally inconsistent on these figures), and misspelled English is mislabelled as Banglish ([BanglishRev](https://arxiv.org/abs/2412.13161)) [S]. In shops, expect English nouns in Bangla script with Bangla verbs and question words around them (বিল, স্টক, পেমেন্ট, ডিউ, প্রফিট, রিটার্ন), affixes glued to loanwords ("বিলটা", "stock-এ", "paymentটা", "dueগুলো"), both scripts in one query ("aj er bikri ta ক্যাশ ও bkash alada dekhao"), and abbreviations tk, pcs, pkt, kg, qty, bal, due, adv [K]. Bangladeshi fintech apps themselves write English loanwords in Bangla script (সাপ্লায়ার, রিটেইলার, মোবাইল রিচার্জ) ([TallyKhata](https://www.tallykhata.com/en/home-eng/)) [S], so supplier and সাপ্লায়ার must be one key.

Voice-to-text artefacts are an engineering inference; no source and no test was found. Bangla dictation outputs Bangla script and renders English nouns either phonetically (স্টক, বিল, ডিসকাউন্ট, প্রফিট, ক্যাশ, সাপ্লায়ার) or in Latin, depending on the engine; numbers arrive as words ("পাঁচশো"), Bangla digits ("৫০০") or Latin digits; punctuation is missing; and frequent confusions are শ/ষ/স, ই/ঈ, উ/ঊ, ণ/ন, য/জ, ড়/র, ো/ও, তাকা/টাকা, কত/কতো, কয়টা/কটা, কাল (tense) [K]. Voice-specific homophone risks from the glossaries: ঘড়ি/ভরি, রতি/রুটি, কাতান/কার্টন, VAT/ভাত bhat, মবিল/মোবাইল, "ostat". No dataset of voice-typed Bangla business queries or of Bangla ASR errors on retail vocabulary exists; OOD-Speech only shows that Wav2Vec2 beat the Google API overall and everything degraded out of distribution ([OOD-Speech](https://arxiv.org/abs/2305.09688)) [S]. Voice behaviour must be tested with real recordings.

### Numbers, money and units inside sentences

Bangla digits ০-৯ map one-to-one to 0-9 and large units are হাজার (1,000), লাখ (1,00,000) and কোটি (1,00,00,000) with South Asian grouping; কুড়ি is an alternate word for 20 and compound numbers 1-99 are irregular, so use a lookup table rather than rules ([Bengali numerals](https://en.wikipedia.org/wiki/Bengali_numerals)) [S]. The parser must accept Bangla digits, Latin digits, number words and mixed forms ("১.৫ lakh", "5 hajar 5 sho") [K].

| Spoken / written | Value | Note |
|---|---|---|
| ek hajar pach sho / hajar pach sho | 1,500 | leading "ek" dropped |
| deRh hajar (derh, dedh) | 1,500 | দেড় = 1.5 |
| aRai hajar (arai) | 2,500 | আড়াই = 2.5 |
| shaRe tin hajar (sare) | 3,500 | সাড়ে = n + 0.5, works for 3.5 to 9.5 |
| shoya sho (soya) | 125 | সোয়া = +¼; BD vs WB use uncertain |
| paune du hajar (poune) | 1,750 | পৌনে = −¼; frequency uncertain |
| দেড়শ / দেড়শো | 150 | **multiplier trap:** দেড় হাজার = 1,500; সাড়ে তিনশ = 350; সাড়ে তিন হাজার = 3,500 |
| 5k / 50k | 5,000 / 50,000 | adoption among older owners uncertain |
| 1,50,000 vs 150,000 | 150,000 | both groupings |
| koti / crore | 10,000,000 | crore increasingly common in banks |

Digits are not always quantities: "Redmi 12", "A15", "Pulsar 150", "10 mm rod", "24x24", "6/7", "4/64", "25 point" are model numbers, sizes or specs, and the unit word (mm, cc, GB, ft, ml, L) or the count marker "ta" decides. Class names normalise (ক্লাস নাইন = নবম = IX = 9). Dates run day/month/year (25/12/2026, ২৫/১২/২০২৬), month-first is unusual, and Bangla ordinal suffixes appear (১লা, ২রা, ৫ই, ১৯শে) [K].

### Relative dates and the kal rule

কাল means tomorrow (synonyms আগামীকাল, কালকে) and yesterday (synonyms গতকাল, কালকে), plus time/era, season and grammatical tense ([Wiktionary](https://en.wiktionary.org/wiki/কাল)) [S]. No NLP paper documenting a tense heuristic was found, so the rule set below is an engineering proposal [K].

| # | Evidence in the sentence | Resolve kal to |
|---|---|---|
| 1 | past marker: -echhe/-eche, -echilo, -lo (holo, gelo, dilo), -lam, "ashlo", "chilo", "ferot ashlo" | yesterday |
| 2 | future marker: -be/-bo (hobe, korbo, dibo, ashbe), "lagbe", "dite hobe", "kinbo", "jabe" | tomorrow |
| 3 | no verb ("kal er bikri", "kal er bill gulo") | yesterday by default (data exists only for the past); ask when the noun is a plan or order ("kal er order/delivery/due") |
| 4 | promise phrases ("kal diye dibo", "kal pabo") | tomorrow |
| 5 | "kal raate" | past tense: last night; future: tomorrow night |
| 6 | "porshu" | same rule: past = day before yesterday; future = day after tomorrow |
| 7 | qualifiers gotokal, ager din, agamikal, pore | unambiguous; use them |
| 8 | spellings kalke, kaleke, kalka, kal-ke | same word and same rule; kalo (কালো, black) is a colour, not a date |
| 9 | still ambiguous | ask |

Other period words: aj/ajke, ei soptahe (week) / ei mashe / ei bochhor, goto soptah / goto mash / ager mash, "last 7 days" (goto 7 din), "ekhon porjonto", weekdays (Shanibar through Shukrobar, with Jumma for Friday), "Eid er age/pore", "Ramadan e", "Boishakhi sale". BD weeks conventionally start on Saturday and Friday is the weekly holiday; "ei soptahe" can mean the calendar week or the last 7 days, so implement a rolling 7 days or ask (uncertain). Two calendars coexist: Gregorian for trade, banking and bKash statements and Bangabda mainly for Pohela Boishakh, halkhata and some festival timing. The BD national calendar was reformed under Muhammad Shahidullah (Bangla Academy, 1966) and adopted officially in 1987, so 1 Baishakh is always 14 April in BD, while in WB it varies between 14 and 15 April ([Wikipedia](https://en.wikipedia.org/wiki/Bangladeshi_national_calendar); [BanglaDateToday](https://www.bangladatetoday.com/blog/pohela-boishakh-1434-date-and-why-april-14)) [S]. Sources conflict on month lengths: one account gives Boishakh to Bhadra 31 days, Ashwin to Magh 30, Falgun 29/30; another says a 2019 revision made Boishakh to Ashwin 31, Kartik to Magh 30, Falgun 29 (30 in leap years), Chaitra 30 ([Wikipedia](https://en.wikipedia.org/wiki/Bangladeshi_national_calendar); [BanglaDateToday](https://www.bangladatetoday.com/blog/bengali-months-names-meaning)) [S]. The conflict is unresolved: do not accept Bengali-month dates without a verified mapping table. Bengali month names: বৈশাখ, জ্যৈষ্ঠ, আষাঢ়, শ্রাবণ, ভাদ্র, আশ্বিন, কার্তিক, অগ্রহায়ণ, পৌষ, মাঘ, ফাল্গুন, চৈত্র [K]; how shopkeepers actually use them in business questions is undocumented.

## Ambiguity table: when the assistant should ask, and what to ask

Ask a follow-up only when the ambiguity changes the data answer and the context cannot settle it. Follow-up wordings are suggested phrasings in plain Banglish; those marked with a source in the notes are quoted from them, the rest are proposals [K]. Default behaviours are the researchers' proposals.

| Term | Possible meanings | Default / resolve by | Follow-up to ask |
|---|---|---|---|
| baki | customer owes shop; shop owes supplier; stock remaining | item subject or ache/nai nearby = remaining; person name, honorific or "khata" = dues | "Baki taka na baki mal?" (from electronics note) |
| X er baki / dhar / pabo | X owes me, or I owe X | "ami pabo" = owed to me; "o pabe" = I owe; prefer pawna/dena | "X apnake dibe na apni X ke dibe?" (from electronics note) |
| kal | yesterday or tomorrow | tense rule above | "Gotokal na agamikal?" |
| porshu | day before yesterday or day after tomorrow | tense rule | "Ager na porer porshu?" |
| nogod | cash or Nagad wallet | "nagad e/theke/number" = brand; "nogod bikri/ase" = cash | "Cash na Nagad?" (from electronics note: "nogod taka na Nagad?") |
| dhar vs dor / dar | credit vs rate (Roman typing) | person subject = credit; item subject = rate | "Dhar na dor?" |
| set | phone / kit / commode set / sofa set / dinner set | trade context | "Set e ki ki ache?" |
| mobil / mobile | engine oil or phone | auto vs electronics context | "Phone na engine oil?" (from electronics note) |
| filter, plug | air/oil/fuel; spark plug/electrical plug | context | "Air, oil na fuel filter?" |
| cover, chain | phone/TV/bike cover; zipper/jewellery chain | model or trade context | "Kon model er?" |
| number | shoe size vs phone number | footwear = size | confirm only if unclear |
| pic / pis | piece or photo | "pic dao" = send photo | |
| Napa, Ace, Renova etc. (brand alone) | many SKUs by strength and form | sum all and show breakdown | "Kon Napa: 500, Extra, Extend, One, syrup?" |
| koto ache (pharmacy) | strips, tablets, boxes, bottles | show stored unit with conversion | "Pata, tablet na box?" |
| ek ta / একটা | one tablet or one strip | "ek ta patta" = one strip | |
| box (pharmacy, tiles) | box size differs by product (Napa 500 box = 510 pcs [S]) | never assume 10 strips | confirm box size or piece vs box for tiles |
| strip | blister strip or glucose test strip | by category | "Glucometer strip?" |
| saline | ORS packet or IV bag | | "Khabar saline na IV saline?" |
| cap, drop | capsule vs lid; eye/ear/nasal/paediatric drops | | "Kon drop?" |
| pau / pao / poa | bread; quarter ser; betel-leaf count | grocery weight vs bakery | confirm |
| adha / ada | half vs ginger | numeric context | |
| tin | three vs container | | |
| tel | cooking oil / hair oil / kerosene | grocery default soybean | "Kon tel?" |
| chini vs chinigura | sugar vs rice | | |
| hali, kuri, pon, ganda, dista | count varies by district and item | use the shop's stored conversion | "Ekta hali te koyta?" |
| ton | tonne weight or AC capacity | trade | |
| drum, gallon | 18 L [S]/200 L (uncertain); 3.64 L (inference)/4/5 L | | "Koto litre er?" |
| ft / foot | linear, square, cubic | rod/tiles/sand context | |
| pan, tar, kol/tap | toilet/frying pan/paan; wire/string; tap/touch | hardware context | |
| rod | construction rod vs engine con-rod | by shop | |
| tool / korai | stool; pan vs the wood কড়ই | furniture vs homeware | |
| khata | notebook vs ledger | stationery = notebook; "baki khata" = ledger | |
| ghori / bhori | watch vs gold unit | "price/weight/ana" next = bhori; "battery/strap/Casio" = watch | |
| vori / tola | 11.664 g in BD | normalise silently; ask if the shop serves Indian-origin customers or the number looks 10 g-based | |
| roti / ruti | 1/96 vori; bread (voice slip) | | "Roti (gold) na ruti?" |
| ana | 1/16 vori or old coin | jewellery = 1/16 vori | |
| point | gold 1/10 roti (uncertain); diamond 0.01 ct; decimal point | | "Hirar point na sonar?" |
| carat / karat | gem weight vs gold purity | by item | |
| 21K vs 22K vs "sonatoni" | BAJUS classes; "traditional" purity undefined | default 22K, echo it, offer others | "BAJUS er shonaton line ta?" |
| gold rate | per vori 22K, per gram, international ounce | per vori 22K | |
| VAT included? | Feb 2026 extra vs Jul 2026 included [S] | shop setting | ask once, store flag |
| making charge | % vs Tk per gram vs per design | shop setting | "Percent na taka per gram?" |
| old-gold deduction | 10/15/17/20% | shop setting | |
| original / copy / first copy / A1 / duplicate | genuine, good copy, counterfeit | | "Company mal na?" (from electronics note) |
| official (phone) | local warranty and NEIR registration | | check NEIR/IMEI |
| profit | gross vs net; today vs month | ask period and gross/net | "Gross na net?" |
| discount | supplier/company vs customer | | "Customer discount na company discount?" |
| bonus / free | supplier free units, not a customer discount | | |
| sell | sale amount vs count | | "Takar hisab na ta?" |
| mistri | mason / mechanic / electrician / craftsman | | "Kon mistri?" |
| mal | goods; "mal tola" meaning uncertain | | |
| 10, 150, 125 | quantity / model / cc / size | check unit (cc, mm, GB) | |
| 6/7 vs king | bed size; queen mapping uncertain | | "6x7 ft na king?" |
| class 9 / nine / IX / নবম | same | normalise | |
| gold loan baki | ledger vs bank loan | | ask |

Questions that need no lookup follow-up but a different reply: "why" (keno), forecasts, advice and any clinical question are declined or answered with a data-only substitute (for example recent average sales). Write actions ("baki likho", "dhar shodh hoise, khata theke bad dao") must be confirmed before they change data [K].

## Techniques that avoid a question list, and the datasets behind them

The evidence supports a stack, not one technique. No technique has published accuracy on shop vocabulary.

**1. Normalise, then key.** Apply the normalisation steps above, then convert both the user text (either script) and the shop's own vocabulary into the same lossy phonetic skeleton (collapse vowels, merge s/sh, ph/f, bh/v/b, j/z, ch/c, w/u, drop doubled letters and trailing h). Transliterate the app's fixed vocabulary (বিল, বাকি, দাম, স্টক, বিক্রি, খরচ, হিসাব, আজ, গতকাল) and the shop's item and customer names once and store the keys; they are kilobytes and run in microseconds [K]. Bangla Soundex (Naushad UzZaman and Mumit Khan, BRAC University, 2004) adapted Soundex for Bangla including conjuncts, and the open-source `shobdohash` implements it ([BRAC DSpace](https://dspace.bracu.ac.bd/xmlui/handle/10361/310); [shobdohash](https://pypi.org/project/shobdohash)) [S]. No published accuracy for Soundex/Metaphone variants on Banglish or on shop words was found.

**2. Score against a closed vocabulary.** Rank candidates with character 2-4-gram Jaccard or TF-IDF cosine plus weighted Levenshtein with cheap substitutions (o/u, i/e, a/o, j/z, s/sh, f/ph, v/b, w/u, k/c, double letters); keep the candidate set to the shop's catalogue so false positives stay low [K]. Uniform-cost edit distance misses o/u/a and bh/v/b folds; with the folds as zero-cost substitutions it behaves like phonetic matching [K].

**3. Optional neural back-transliteration, as a candidate generator only.** IndicXlit (AI4Bharat) is an 11M-parameter transformer; decoding with beam 4 and re-ranking with a word-level unigram language model improved accuracy by about 12% on average; Bengali top-1 is 55.49% on the Dakshina test set (Roark et al. baseline 49.40%) and 54.06% on the Aksharantar test set, but only 36-40% on named entities ([Aksharantar](https://arxiv.org/abs/2205.03018); [IndicXlit](https://github.com/AI4Bharat/IndicXlit)) [S]. Dakshina's own baselines for single-word Latin-to-Bengali are CER 13.2-14.2 and WER 50.6-54.7; sentence context roughly halves the WER (noisy channel with LM 18.6) ([Dakshina paper](https://arxiv.org/pdf/2007.01176)) [S]. At about 3.8 romanizations per word and 50-55% top-1 recovery, never require correct back-transliteration; use n-best candidates re-ranked by the catalogue prior. On-device int8 size and Pixel latency were not researched.

**4. LLM or embeddings only as fallbacks.** On the BanglaTLit back-transliteration test, fine-tuned BanglaT5 reached BLEU 36.19 against 26.56 for GPT-4 Turbo zero-shot, 20.73 for GPT-3.5 Turbo, 19.28 for GPT-4o and 11.01 for LLaMA3-8B (3-shot); small generative models failed (BanglaT5-small BLEU 4.14) ([BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859)) [S]. Generic Bangla-script encoders underperform on romanized text without adaptation (same paper) [S]. multilingual-e5-small is 118M parameters (about 471 MB fp32, third-party figures) and its Banglish quality is unpublished, so test it on BanglaTLit and Dakshina romanized sets first; BanglaBERT is about 110M parameters and its small variant 13.7M [S]. Reserve an LLM for low-confidence queries and confirm before any money-affecting action [K].

**5. Bangla-script spell correction** (BSpell-class: ACC 97.6% on synthetic Prothom Alo errors, 87.8% on its real typed-error set without fine-tuning and 91.5% fine-tuned; phonetic rule baseline only 61.2%) ([BSpell](https://arxiv.org/abs/2208.09709)) [S] fixes Unicode typing slips but not Banglish, and rule-only phonetic correction should stay constrained to the shop's vocabulary [K].

**Datasets and licence cautions.**

| Dataset | What it offers | Licence / caution |
|---|---|---|
| Dakshina (Google, LREC 2020) | Bengali romanization lexicon (25,000 train + 2,500 dev + 2,500 test word types, each with romanization and attestation counts, multiple annotators); 10,000 romanized Wikipedia sentences; use as a variant dictionary ([GitHub](https://github.com/google-research-datasets/dakshina)) [S] | CC BY-SA 4.0: share-alike obligations apply to derived data, review before bundling a derived lexicon in the app. Formal Wikipedia vocabulary, so no baki/mojud/khoroch/memo coverage is assumed |
| Aksharantar / IndicXlit | ~26M pairs, 21 languages; Bengali test set 5,009 pairs; Bengali training count about 1.34M (verify in paper) [S] | code and models MIT, benchmark/manual data CC-BY (from the notes) |
| BanglaTLit (EMNLP Findings 2024) | 42.7k annotated romanized-to-Bangla pairs (38.7k/1.5k/2.5k) and 245.7k pretraining samples; much from TrickBD ([repo](https://github.com/farhanishmam/BanglaTLit)) [S] | licence not checked |
| BanglaDual (Mendeley 2026) | 1,122,189 Banglish-to-Bangla pairs and 119,727 Banglish-to-English pairs; 85% Wikipedia text ([Mendeley](https://data.mendeley.com/datasets/pxw2bb4wyt/1)) [S] | CC BY 4.0; spelling variation not discussed; noise level unverified |
| Code-mixed Chaos (Mendeley 2025) | 10,234 Banglish comments with Bangla version ([Mendeley](https://data.mendeley.com/datasets/23dp3t88vk/1)) [S] | licence not checked |
| BanglishRev | 1.74M Daraz reviews, ~660k Banglish, the closest e-commerce register ([arXiv](https://arxiv.org/abs/2412.13161)) [S] | licence not checked; pre-processed with the `avro` library |
| MixSarc (9,087), BnSentMix (20,000), BanTH (37,300) | code-mixed social text ([MixSarc](https://arxiv.org/abs/2602.21608); [BnSentMix](https://arxiv.org/abs/2408.08964)) [S] | licences not checked; social/review registers, not transactional |
| IndoTranslit | ~975k rule-generated Bengali romanized pairs, 60M-parameter Marian model ([arXiv](https://arxiv.org/abs/2511.22769)) [S] | release status not stated; Bengali pairs are rule-based, not real user noise |
| DGDA Mendeley "Medicinal Products in Bangladesh" | generic names, brand names, strengths, manufacturers; best structured brand-to-generic table ([Mendeley](https://data.mendeley.com/datasets/zhtvkny53n)) [S] | CC BY 4.0; schema and size not seen, download and inspect |
| csebuetnlp normalizer | NFKC, ftfy, replacement tables ([GitHub](https://github.com/csebuetnlp/normalizer)) [S] | **CC BY-NC-SA 4.0, non-commercial research only: a problem for a commercial app**; a reported argument-order bug in the NFKC call is unverified, so test before use |
| BSpell real-error set, VAIYAKARANA, DPCSpell | Bangla-script error data | availability and licences not confirmed |

There is no public dataset of voice-typed Bangla business queries, Bangla SMS or shop-ledger chat, or of numerals-in-words for Bangla ASR post-processing.

## How to use this in the assistant

The notes' recommended pipeline (engineering suggestion, not from a single source), adapted so no question list is needed [K]:

1. **Detect script per token** and normalise (NFC, strip ZWJ/ZWNJ, digits, money tokens, punctuation, emoji); keep the original for display.
2. **Build keys.** Map Banglish and Bangla tokens to the shared phoneme skeleton; fold Bangla-script loanwords (স্টক = stock, প্যাকেট = packet, ডিসকাউন্ট = discount, কার্টন = carton, কেজি = kg, লিটার = litre, বোতল = bottle, ডজন = dozen, পিস = piece, বিকাশ = bkash, ক্যাশ = cash, প্রফিট = profit) to the same key as their Latin forms.
3. **Fuzzy-match tokens** to three lexicons: the fixed lexicon (question words, data nouns, commands, time words, units: sections above), the shop's catalogue and customer/supplier names (stored in both scripts, honorifics stripped), and a per-trade alias table (brand to category and generic names, for example "Pran juice" resolves to beverage > juice and keeps the brand as a filter if the data has a brand field).
4. **Classify intent and fill slots** (metric, entity, period, op) with embeddings or a small LLM, using cue words: price (dam, rate, koto + item), how many (koyta, koto ta), stock (ache, nai, shesh, mojud, baki with an item), sold (bikri, sell, gelo, chole), owed (baki, pabo, dhar, pawna, dena with a person or supplier), profit (labh, munafa), expiry (meyad), warranty (kobe, koto din), top/bottom (sobcheye beshi/kom), compare (cheye, theke, ager).
5. **Resolve dates** with the kal rule and a per-year holiday table; resolve numbers with the number-word table and unit sanity checks (digits next to cc, mm, GB, ft are specs).
6. **Resolve units** from the shop's own stored conversions; keep gold weight in grams internally and echo ("2 vori = 23.328 g, ok?") when confidence is low.
7. **Ask once, one line, when the ambiguity table says so**; otherwise answer with the default and say the assumption in the answer ("showing 22K").
8. **Answer from data only.** Pharmacy, health and cosmetics questions return stock, sales, price and expiry and add no dosing or health advice; fairness and herbal terms are category tags. Diagnostic, forecast and advice questions return the nearest data (trend, top movers, recent average) and say what cannot be answered.
9. **Confirm writes** (credit entries, repayments, deletions) before executing.
10. **Make rule-like values shop settings**: making charge (% or per gram), VAT included or not, old-gold and exchange deductions, unit conversions per region (hali, pon, ser, mon, dista), size system for shoes, bed-size mapping. Do not hard-code any of the conflicting figures above.
11. **Log real queries** after launch (with consent) and derive typo rankings and new aliases from them; Dakshina's attestation counts are the best public proxy until then.

## What to validate before any of this ships

Nearly all vocabulary here is [K]. The notes recommend this order of validation: (1) interview **3-5 shopkeepers per market** across different trades and districts; the electronics/auto/hardware notes name Bangshal, Elephant Road/Multiplan, Nawabpur, Jatrabari and Chawkbazar as places to find shopkeepers, and other notes identify Islampur (fabric), Mitford (medicine wholesale) and Chawkbazar (toys) as trade hubs; (2) collect **50-100 real utterances per business type** (typed and dictated), recording voice-typing output verbatim from 5-10 shopkeepers in different districts, and run them through the intent mapper to find what the [K] lists missed (the notes' minimum for one type was 20 utterances; use 50-100); (3) **download the DGDA/Mendeley medicine dataset** and build the brand-generic-form-strength table for the pharmacy, check which Napa-style variants and Seclo/Maxpro/Sergel/Alatrol/Fexo mappings are right; (4) **mine the Dakshina Bengali lexicon** for attested romanization variants of the shared vocabulary and run a spot test of whether shop words (baki, mojud, khoroch, memo, labh) appear at all; (5) check the licences of every dataset before bundling (Dakshina share-alike, csebuetnlp non-commercial, unchecked ones above); (6) build the test set in three layers: clean Bangla intents, automatic variants from the fold rules plus QWERTY-adjacency typos plus Dakshina/BanglaTLit-attested spellings, and the human layer; measure intent accuracy, slot accuracy (item, amount, date) and the rate of "asks to confirm".

Terms the notes flagged specifically for confirmation: fercha, dhimi, upay in speech, chalan scope, "mal tola", bayna, mojud, nosto, "pound" as cake size, dista/dosta length, hali/gonda/pon per district, "master copy/first copy", PTA used by BD sellers, "keds", "vanity bag", "ostat", "shoya/paune" frequency in BD, "5k" adoption, "ei soptahe" meaning, the Bengali-month length rule, and the current BAJUS making-charge, VAT and deduction rules. Not covered by any note: Facebook-commerce or Reddit corpora, Google Input Tools/Gboard transliteration rules, dialect shop vocabulary, on-device model sizes and latency, and the effect of Eid-ul-Adha, wedding season and Falgun on retail demand.

## Conclusion

The practical finding is that the fifteen trades are one problem with two layers. The shared layer (about 15 question words, 20 data nouns, a tense-based date rule, a number grammar with half-multiples, and four ambiguity traps: baki, kal, nogod, units) is small enough to hard-code and carries most of the meaning. The trade layer is mostly item names and unit scopes that the shop's own catalogue already contains, so the assistant's real job is phonetic matching against that catalogue plus a short list of clarifying questions, which is why no pre-built question list is needed. Two parts cannot be generalised from the vocabulary at all: values the law or the district sets (BAJUS making charges, VAT and deductions; hali, pon, ser, mon) conflict across sources and must be per-shop settings, and pharmacy answers must stay inside inventory, price and expiry.

What changes after this research is where the risk sits. Spelling variation looked like the main threat, but it is manageable with phonetic keys and a closed vocabulary; the larger exposure is the unverified vocabulary itself and the absence of any voice-typing data. Until 3-5 shopkeepers per market and 50-100 real utterances per type confirm or correct the [K] lists, treat every glossary entry as a seed for fuzzy matching and a candidate for logging, not as a rule.
