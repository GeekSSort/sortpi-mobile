# Bangladeshi shop slang glossary: Pharmacy, Health & Wellness, Cosmetics & Beauty

Provenance legend (read first). Web search found NO corpus of real shopkeeper speech, no pharma trade-slang source, and no Facebook/Reddit Banglish samples. Anything under "Cited Findings" has a URL. Everything under "Inferences" tagged [MK] is model knowledge of everyday Bangla/Banglish usage, NOT web-verified. Treat [MK] as a hypothesis list to validate with real shopkeepers or logged utterances. "(uncertain)" means I am not confident the term/brand/attribution is right. Bangladesh only; West Bengal/India differences flagged "WB".

## 1. How do pharmacists refer to medicines (brand vs generic vs dosage form), and how do they say "expiring soon", "near expiry", "left in stock"?

### Takeaway
Bangladesh is a branded-generic market: one generic (e.g. paracetamol) is sold under dozens of brands, and each brand is split into variants by strength and dosage form, so a shopkeeper's "Napa" is usually a brand token plus a form/strength. Web sources confirm the brand/generic/form/pack structure and the Bangla word for "expired" (মেয়াদোত্তীর্ণ); the spoken phrases for "near expiry" and "left in stock" are not found in any source and are [MK] only.

### Cited Findings
- The market is described as predominantly a branded-generic marketplace; the DGDA registration form asks for (a) the generic name (INN where one exists) and (b) the name under which the drug is proposed to be sold. — [DGDA registration form](https://bangladeshtradeportal.gov.bd/kcfinder/upload/files/Application%20Form%20for%20the%20Registration%20of%20Drugs.pdf); [Pharmexcil Bangladesh report 2020](https://pharmexcil.com/uploads/countryreports/Bangladesh_Market_Regulatory_report2020.pdf)
- The DGDA drug registry identifies finished products by DAR number plus trade name (concept id pattern `{DAR-number}--{trade-name-slug}`). So the trade (brand) name is the registry key, not the generic. — [Bangladesh Core FHIR IG, DGDA drug registry](https://fhir.dghs.gov.bd/core/CodeSystem-dgda-drug-registry.xml.html)
- One generic, many brands: ePharma's paracetamol category lists Napa, Renova, Ace, Xpa, Reset, Aceta, Fast, Longpara. — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever); [ePharma generic: paracetamol](https://epharma.com.bd/en/generic/paracetamol-645?page=1)
- Brand-variant suffix conventions seen on one brand family: Napa 500mg Tablet; Napa Extra (paracetamol + caffeine 65 mg, 12 pcs); Napa Extend (665 mg); Napa Rapid 500 mg; Napa One 1000 mg; Napa Suspension 60 ml; Napa Paediatric Drops 15 ml; Napa Suppository 125/250/500 mg; Napa IV Infusion 100 ml. Other brands use XR/ER (Renova XR 665, Reset ER 665, Ace XR), Max/Power (Renova Max 1000, Ace Power 1000), Plus (Renova Plus, Reset Plus). — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever); [Napa Extra](https://epharma.com.bd/en/medicines/fever/napa-extra-tablet-12pcs-720)
- Dosage forms as listed by one BD e-pharmacy: Tablet, Syrup, Suspension, Drops, Suppository, Infusion, Bottle. Pack labels are English: "10pcs", "1 Strip", "60ml", "510pcs Box" (Napa 500 box), "120pcs Box" (Napa Extra). The Bangla word পাতা does NOT appear on that page (the e-pharmacy site is English-led). — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever)
- Napa 500 mg: MRP 12, selling price 11 (shown as "MRP ৳12 6% off"). So MRP and an actual (discounted) price both exist at retail. — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever)
- Retail prices for the same medicine varied 2-4 fold between pharmacies in a survey; a maximum retail price (MRP) regime exists; originator brands are rarely stocked; payment is mostly out-of-pocket. — [PMC6567665](https://pmc.ncbi.nlm.nih.gov/articles/PMC6567665)
- "Expired" in Bangla press: মেয়াদোত্তীর্ণ ওষুধ (meyadottirno oshudh). Label checks use ব্যাচ নম্বর (batch number), মেয়াদ (expiry) and the strip batch number matched against the box. — [Prothom Alo column](https://www.prothomalo.com/opinion/column/ksa7yim6yh); [ePharma health blog (Bangla)](https://epharma.com.bd/bn/blog/healthcare/nokol-oshudh-chenar-upay-meyadottirno-oshudh-ghore-rakhar-niyom)
- Mitford (Old Dhaka) is the national wholesale medicine hub; wholesale outlets reported ~2,500 in 2015, with most regular customers from outside Dhaka. (Attribution from search snippets; verify at source.) — [Financial Express: blockade halves Mitford drug sales](https://today.thefinancialexpress.com.bd/print/blockade-halves-mitford-drug-sales); [Daily Star: 34 stores fined in Old Dhaka](https://tds-images.thedailystar.net/city/34-medicine-stores-fined-taka-56-lakh-in-old-dhaka-1610491)
- IV saline is sold in bags, in cartons of 10 bags; "normal saline" (0.9% NaCl) is the most used of 11 injectable types. — [Daily Star, saline shortage](https://www.thedailystar.net/node/3388871)
- DGDA FHIR/registry and the Mendeley dataset "Medicinal Products in Bangladesh" (generic names, brand names, strengths, manufacturers; University of Dhaka; CC BY 4.0; DOI 10.17632/zhtvkny53n.1) exist and are the best structured source for a brand-to-generic lookup table; I could not see its schema. — [Mendeley Data](https://data.mendeley.com/datasets/zhtvkny53n)

### Inferences
- [MK] Spoken forms. Shopkeepers and customers say the BRAND, often shortened: "Napa", "Napa Extra", "Seclo", "Ace". The generic ("paracetamol", "প্যারাসিটামল") is used by doctors/educated customers or when comparing brands ("ei company'r paracetamol"). Dosage form is a suffix word: "Napa tab", "Napa shirap/syrup", "Napa drop", "Napa supo". Strength is spoken as a bare number: "Napa 500", "Napa 665", "Ace 1000".
- [MK] Brand-as-generic habit (customer or counter staff says brand for the whole class). Napa = any paracetamol/fever pill; Savlon / Dettol = any antiseptic liquid; Vaseline = any petroleum jelly; Pond's = any face cream; Parachute = coconut hair oil; Lux = soap (the last two are cosmetics-side). Inference supported only by the structure of the market (cited above), not by a source on usage.
- [MK] "Expiring soon" phrasings (Bangla / Banglish): মেয়াদ শেষ হয়ে আসছে (meyad shesh hoye asche); মেয়াদ কাছে (meyad kache); মেয়াদ যাচ্ছে / meyad jacche; expire hoye jabe; near expiry; "expiry er kache"; "ei mashe expire"; "kon kon medicine expire hobe"; "short expiry" / "short date" (trade phrase, uncertain). "Already expired": মেয়াদ শেষ / মেয়াদ উত্তীর্ণ / expire hoye geche / "expired mal" (মাল = goods, common trade word) / ডেট শেষ / "date over".
- [MK] "Left in stock": আছে (ache) = in stock; নাই / নেই (nai / nei) = out; শেষ (shesh) = finished; ফুরিয়ে গেছে (phuriye geche); কত আছে / koto ache; কয় পাতা আছে / koy pata ache; কতটা মাল আছে; স্টক কত; "stock ache?"; "lagbe" (needed / must reorder); "short" / "shortage".
- [MK] Expiry data format on packs is month/year (e.g. "EXP 06/2027"), not a day. So "expiring this month" should be evaluated at month granularity (assumption; validate against how SortPi stores expiry).
- [MK] Return practice: expired or near-expiry stock is commonly returned to company/MR for replacement ("expiry return", "ferot", "replace") (uncertain; practice varies by company).
- [MK] WB/India: "medical" or "chemist" / "medical store" instead of ফার্মেসি; "stockist", "C&F", "Schedule H" are Indian trade/regulatory terms not typical in Bangladesh (uncertain).

### Gaps
- No source for actual spoken phrases for near-expiry or in-stock questions; no transcript or forum corpus found.
- No source confirming brand-as-generic usage ("Napa" = paracetamol) in speech; only product-structure evidence.
- Mendeley dataset schema/size not visible; download it to build the brand-generic-form-strength table.
- Whether returns of expiring stock are routine, and how, is unsourced.

## 2. Which words signal "how much", "how many", "sold", "owed", "profit"?

### Takeaway
Core Bangla question and trade words are stable and well known (কত, কয়টা, বিক্রি, বাকি/পাওনা, লাভ), but none were confirmed by a web source for BD shops; cited material only confirms MRP vs sale price, wholesale (পাইকারি), payment channels, and cash-on-delivery. Several words carry direction or identity ambiguity (বাকি, নগদ, কাল) that the assistant must resolve.

### Cited Findings
- BD retail e-commerce shows an MRP-with-percent-off pattern ("MRP 12, 6% off"), so MRP (এমআরপি) and discount (ডিসকাউন্ট/ছাড়) are real concepts in price lookups. — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever); [Arogga Glow & Lovely page: "6% OFF", COD](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm/bn)
- Arogga exposes a Bangla wholesale prompt: "ব্যবসার জন্য পাইকারি দামে পণ্য কিনতে রেজিস্টেশন করুন" (register to buy at wholesale/পাইকারি price) and "এই পণ্যটি সারা বাংলাদেশ থেকে অর্ডার করা যাবে". — [Arogga product page (bn)](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm/bn)
- Payment channels in BD health e-commerce: bKash, cards, cash on delivery; free home delivery promos; helpline 16778. — [Arogga overview via FutureStartup](https://futurestartup.com/2021/06/20/arogga-started-as-a-digital-pharmacy-aims-to-go-deeper-into-digital-healthcare-in-bangladesh/)
- A pharmacy salesman said companies were prioritising hospitals and that even at double the price he could not supply a bag; distributors "deliver one or two cartons" against orders: shows trade vocabulary of order, carton, supply, double price. — [Daily Star, saline](https://www.thedailystar.net/node/3388871)
- A trader told researchers it is possible to make double the profit by selling counterfeit/sub-standard medicine; shows profit ("লাভ") is a normal retail topic but no margin vocabulary was found. — [New Humanitarian / Asian Scientist on fake medicine](https://www.asianscientist.com/2013/11/pharma/bangladesh-fake-low-standard-medicine-2013/)

### Inferences
All [MK] unless noted.
- HOW MUCH (price/amount/value): কত (koto), কত টাকা, দাম কত (dam koto), রেট কত (rate koto), কত পড়বে (koto porbe), কত হইছে / koto holo, মোট কত (mot koto), "koto taka'r mal". HOW MANY (count): কয়টা (koyta), কয়টি, কয় পাতা (koy pata), কয় বক্স, কতটা (kotota), "koto pis", "koy dozon".
- SOLD: বিক্রি (bikri), বেচা (becha), বেচাকেনা (becha-kena = trade), sale (English, very common: "ajker sale"), বিক্রি হইছে / bikri hoyeche, গেছে / geche ("Napa koto geche" = how many sold), চলে / chole ("ki beshi chole" = what sells most), চলে না / chole na (slow mover / dead stock), উঠছে / uthse (uncertain).
- OWED: বাকি (baki), পাওনা (paona = money owed TO me), দেনা (dena = money I owe), ধার (dhar), বকেয়া (bokeya), ডিউ (due), বাকির খাতা (bakir khata = credit ledger), পার্টি (party = a customer/supplier account), মহাজন (mohajon = wholesaler/creditor, uncertain), জমা (joma = paid in/deposited), পরিশোধ (porishodh). Direction ambiguity: "baki" may mean customers owe the shop or the shop owes a supplier.
- CASH vs MFS: নগদ (nogod) = cash, and also Nagad, the MFS brand (ambiguity!). বিকাশ (bkash, bikash), রকেট (Rocket), নগদ পেমেন্ট, "cash", "ক্যাশ". "Nogod e dilo" is ambiguous.
- PROFIT: লাভ (labh, lav, laab), লস / ক্ষতি (loss / khoti), মুনাফা (formal), margin, "লাভ কত", "profit koto holo", "labh koto thake" (typical margin), "invest / পুঁজি (puji) / capital".
- TRADE: পাইকারি / pikari / paikari (wholesale), পাইকার (paikar = wholesaler or bulk buyer, "pikar" spelling common), হোলসেল / holsel, খুচরা (khuchra = retail), MRP / এমআরপি, TP (trade price) (uncertain), কেনা দাম (kena dam = purchase price), বেচা দাম (becha dam = selling price), ছাড় / ডিসকাউন্ট / discount, কমিয়ে দেন / komiye den / "kombi dao" (reduce the price; haggling), "company discount", ফ্রি (free), "বোনাস" / bonus = free extra units from company, e.g. "10+1" style (uncertain syntax), MR / এমআর / rep / রিপ (medical representative), ডিপো (depot), ডিস্ট্রিবিউটর / ডিলার, অর্ডার, চালান (challan = delivery note/invoice), ক্যাশ মেমো / memo (receipt), হোম ডেলিভারি / delivery, COD.
- TIME words that break date parsing: আজ (aj = today), গতকাল (gotokal = yesterday), আগামীকাল (agamikal = tomorrow), কাল (kal) = BOTH yesterday AND tomorrow in Bangla (resolve by tense: "kal koto bikri hoyechilo" = yesterday), পরশু (porshu) = day after tomorrow OR day before yesterday, এই মাসে (ei mashe), গত মাসে (gotto mashe), এই সপ্তাহ (ei shoptaho), "ei bochhor". Bangla digits (০-৯) and words (দশ, পঞ্চাশ, একশো, হাজার, লাখ) appear in speech-to-text output.
- QUESTION FRAMES: "... koto?" (value), "... koyta?" (count), "... ache?" (exists), "... nai?" (missing), "... kon ta beshi?" (rank), "... kar kache baki?" (owed by whom), "... ke kinse?" (who bought). Verbs: দেখাও / dekhao, বলো / bolo, বের করো / ber koro, হিসাব দাও / hisab dao.
- WB/India: "udhar" (উধার) / "khata" are common in both; WB uses UPI/GPay/PhonePe, not bKash/Nagad; "chemist" and "invoice/bill" more common; "profit" same (uncertain).

### Gaps
- No source on MR/company-discount/bonus slang or how shops talk about "10+1" schemes; searches (EN and BN) returned nothing for BD.
- No source confirming pikar/পাইকার vs পাইকারি spellings or usage.
- No source on how retailers quote margin (percent of MRP vs taka per strip).

## 3. What Banglish spellings/typos are common for medicine and cosmetic names?

### Takeaway
No web source documents Banglish spelling variance, so the variant lists below are [MK] expectations built from standard Bangla romanisation habits and vowel/consonant confusions (a/o, s/sh/ch, c/k, ph/f, z/j, double letters, dropped vowels). Use them to seed fuzzy matching (edit distance + phonetic keys) over a canonical brand table rather than as ground truth. Verified brand names come from ePharma/Arogga.

### Cited Findings
- Verified BD paracetamol brands: Napa, Napa Extra, Napa Extend, Napa Rapid, Napa One, Renova, Ace, Xpa, Reset, Aceta, Fast, Longpara. — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever)
- Ciprocin is cited as a brand-name antibiotic sold without prescription by a shopkeeper in a Business Standard report. — [TBS: Antibiotics sale rampant](https://www.tbsnews.net/bangladesh/antibiotics-sale-without-prescription-rampant-despite-high-court-ban)
- Verified cosmetic listings: "Glow & Lovely" (face cream Ayurvedic Care 25/50 g, Advanced Multivitamin 100 g, BB cream with foundation "Shade 1", Brightening Face Serum with 10% Niacinamide 14 ml, facewash Insta Glow / Bright Glow). Category path: Beauty > Skincare > Cream & Moisturizer > Whitening & Brightening Cream. Sizes written "1 x 50gm tube". — [Arogga Glow & Lovely](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm); [Arogga serum](https://www.arogga.com/product/76069/glow-and-lovely-brightening-face-serum-with-10-niacinamide-complex-14ml); [Arogga BB cream shade 1](https://www.arogga.com/product/67528/glow-and-lovely-bb-multi-vitamin-cream-with-foundation-shade-1/bn)
- Retail price points (retailer listings, change often): Glow & Lovely Advanced Multivitamin 100 g Tk 264 (Arogga) / 255 after 7% off (Rokomari); Ayurvedic Care 50 g ~Tk 183; 25 g Tk 103; serum 14 ml Tk 299. — [Arogga](https://www.arogga.com/product/70782/glow-lovely-advanced-multivitamin-cream-100g); [Rokomari](https://www.rokomari.com/category-brand/3263/Glow-and-Lovely/13295)
- Shajgoj is a Dhaka beauty e-commerce company (founded 2013; ~10,000 products, 400+ brands, stores in Dhaka); app categories include Makeup (Foundation, Lipstick), Body Care. — [Daily Star on Shajgoj](https://www.thedailystar.net/tech-startup/news/shajgoj-how-modern-day-beauty-platform-aims-become-household-name-3019106)
- Hamdard Laboratories (Waqf) Bangladesh, est. 1972 at Tejgaon, makes Unani and Ayurvedic medicines (~200 herbal products as of 2019): capsules, tablets, ointments, syrups. — [Wikipedia](https://en.wikipedia.org/wiki/Hamdard_Laboratories_(Waqf)_Bangladesh)

### Inferences
All [MK]: canonical -> likely spoken/typed variants. Always match on Bangla script AND Latin.
- Medicine words: paracetamol -> প্যারাসিটামল, paracitamol, parasitamol, paracetamul, paracetamoll, "para". napa -> নাপা, nappa, napaa, naapa. antacid -> এন্টাসিড / অ্যান্টাসিড, antasid, anta-sid, antiacid; the user-supplied "ostat" is NOT a form I can confirm for antacid (uncertain; possibly a speech-to-text or local mishearing; treat as unknown token, ask). saline -> স্যালাইন, selain, selaine, salin, saline. ointment -> মলম (molom, standard BD), marham / মারহাম (Urdu/Hindi-origin; uncertain in BD, more Unani/older), onitment, oyntment. syrup -> সিরাপ, shirap, sirap, shiropp, siraap, "tonic". tablet -> ট্যাবলেট, tab, tablate, tebil, tablet; bori / বড়ি (informal "pill", also Ayurvedic). capsule -> ক্যাপসুল, kapsul, capsul, cap (cap also = cap/lid). injection -> ইনজেকশন, inj, injection, enjection, সুই (sui = needle/shot). drops -> ড্রপ, drop, dropp, ফোঁটা (fota). strip -> পাতা, pata, patta, patha (user-supplied "patta" valid), strip, stirp. box -> বক্স, box, bocks. bottle -> শিশি (shishi, sisi), বোতল (botol, bottle). cream -> ক্রিম, cream, kreem. gel -> জেল. powder -> পাউডার, gura (গুঁড়া). sachet -> স্যাশে, sachet, packet (ORS powder packet, uncertain).
- Brand token variants (brand spelling by ear): Seclo -> siklo, seklo, সেকলো (brand verified? Seclo is Square omeprazole: uncertain); Maxpro -> makspro, ম্যাক্সপ্রো (uncertain); Sergel -> sargel, sarjel (uncertain); Ciprocin -> siprosin, cipro (cited brand); azithromycin -> azithro, ajithro, এজিথ্রোমাইসিন; Alatrol -> alatrole, alatrol (antihistamine brand; uncertain); Fexo -> fexo, feksho (uncertain); Ace -> ays, ace; Renova -> renova, rinova.
- Brand-as-generic habit names (BD retail, [MK]): Napa (paracetamol), Savlon (ACI antiseptic) and Dettol (Reckitt), Betadine (povidone-iodine), Vaseline (petroleum jelly), Vicks (balm), Pond's (cream), Lux/Lifebuoy (soap), Parachute (coconut oil), Veet (hair removal), Whisper/Senora (sanitary pad; Senora uncertain), Pampers (diaper). Spellings: Savlon -> সেভলন, saylon, sevlon; Dettol -> ডেটল, detol, dettol.
- Cosmetic words: lipstick -> লিপস্টিক, lipstik, lipstick, lip stic; lip balm -> লিপবাম, lipbam; kajal -> কাজল, kajol, kajal, kazol; eyeliner -> আইলাইনার, ayliner; mascara -> মাসকারা, maskara; foundation -> ফাউন্ডেশন, fandation; compact -> কমপ্যাক্ট; face wash -> ফেসওয়াশ, face-wash, facewash; shampoo -> শ্যাম্পু, shampu, sampu; conditioner -> কন্ডিশনার; lotion -> লোশন, loshon, lotion; moisturizer -> ময়েশ্চারাইজার, moysturaizer; sunscreen -> সানস্ক্রিন, sanskrin; serum -> সিরাম; mehedi -> মেহেদি / মেহেন্দি, mehedi, mehendi, mehandi, henna; attor -> আতর, attor, attar, otor, itor; perfume -> পারফিউম, perfum, parfume, "spray"; deodorant -> ডিও, deo; nail polish -> নেইল পলিশ, nel polish; alta -> আলতা; tip (bindi) -> টিপ; sindoor -> সিঁদুর (Hindu community; sold in some shops, uncertain share); soap -> সাবান, saban, saboon; powder -> পাউডার, pawder; ghamachi powder -> ঘামাচি পাউডার (prickly heat, summer item); hair oil -> চুলের তেল, tel; hair colour/dye -> হেয়ার কালার, রং / rong, dai; fairness cream -> ফর্সা ক্রিম / forsha cream, fairness, fair & lovely (old name, still spoken), glow & lovely, whitening, glow, ujjol (উজ্জ্বল = bright), brightening.
- Wellness words: vitamin -> ভিটামিন, bitamin, vitamin; multivitamin; calcium -> ক্যালসিয়াম, kalsium; iron -> আয়রন, ayron; zinc -> জিংক, jink; folic acid; omega-3 / fish oil -> ফিশ অয়েল; protein -> প্রোটিন, protin; whey; creatine; mass gainer; ইসবগুল (isubgul / isobgul); কালোজিরা (kalojira / kalo jira); মধু (modhu); হারবাল, ইউনানি (unani, unnani), আয়ুর্বেদিক, কবিরাজি (kobiraji), হোমিও (homeo); thermometer -> থার্মোমিটার, tharmometer; BP machine / pressure machine -> প্রেশার মেশিন; glucometer / sugar machine; oximeter -> অক্সিমিটার; nebulizer -> নেবুলাইজার.
- Speech-to-text risk: Bangla ASR often yields Latin brand names in Bangla script (নাপা, সেকলো) and Bangla digits; build normalisation for digits and for Latin <-> Bangla transliteration.

### Gaps
- No real Banglish corpus was found (no Reddit r/bangladesh, Facebook-commerce, or forum samples retrievable).
- Brand-to-company mappings for non-paracetamol brands (Seclo, Maxpro, Sergel, Alatrol, Fexo) are unverified here.
- "ostat" could not be matched to any antacid term or brand.

## 4. Which terms are safety-critical or ambiguous (so an assistant should ask a clarifying question)?

### Takeaway
Ambiguities that change the DATA answer (which product/pack/direction/date) are numerous and should trigger a one-line clarifying question; clinical questions (dose, interaction, pregnancy, children) are out of scope and should not be answered. Antibiotics and prescription status are a documented sensitive area in BD.

### Cited Findings
- Sale of antibiotics without a registered doctor's prescription remains common in BD; the High Court ordered a stop in April 2019; the health minister said licences would be cancelled; a "red mark on antibiotic boxes" was proposed; a BSMMU professor said people often do not know which drugs are antibiotics. A rural shopkeeper said antibiotics "work better and are more profitable, we sometimes do suggest it". — [Daily Star Jan 2020](https://www.thedailystar.net/frontpage/antibiotics-use-and-sale-in-bangladesh-without-prescription-continues-1853359); [TBS](https://www.tbsnews.net/bangladesh/antibiotics-sale-without-prescription-rampant-despite-high-court-ban); [TBS minister](https://www.tbsnews.net/bangladesh/health/sales-non-prescribed-antibiotics-barred-health-minister-508450)
- "Saline" in the dengue context means injectable IV bags (normal saline), sold in cartons of 10. — [Daily Star](https://www.thedailystar.net/node/3388871)
- Doctors advise dengue patients paracetamol only and to avoid other painkillers/antibiotics (reported advice, not a recommendation from this note). — [Daily Star](https://images.thedailystar.net/node/3369926)
- Fake/sub-standard/expired medicine circulates in BD wholesale markets (Mitford) and enforcement fines are common. — [Daily Star: 34 stores fined](https://tds-images.thedailystar.net/city/34-medicine-stores-fined-taka-56-lakh-in-old-dhaka-1610491); [Asian Scientist](https://www.asianscientist.com/2013/11/pharma/bangladesh-fake-low-standard-medicine-2013/)
- A 2004 Daily Star report warned local fairness creams mostly contained hydroquinone as the main active; historical context only. — [Daily Star 2004 PDF](https://epfs.thedailystar.net/TDS/2004/04/11/MAI/5_18/98e7cea4b32deeeb_18.pdf)
- Napa variants differ materially in strength/composition (500 vs 665 vs 1000 mg; Extra = + caffeine; IV vs suppository vs syrup), so "Napa" alone under-specifies the SKU. — [ePharma fever list](https://epharma.com.bd/bn/medicines/fever)

### Inferences
Clarify-first triggers (assistant action = ask, then query). All [MK].
1. Brand vs variant: "Napa koto ache" -> which Napa (500 / Extra / Extend / One / syrup / drops / suppository)? Option: sum all and show breakdown, then offer to filter.
2. Unit: "koto ache" -> strips (পাতা), tablets, boxes, bottles? Show the stored unit and convert, e.g. "42 strips (420 tablets)".
3. "ek ta" / "একটা" -> one tablet or one strip? "ek ta patta" = one strip. Loose-tablet sales need a per-tablet unit.
4. "Box": Napa 500 box = 510 pcs (51 strips), Napa Extra box = 120 pcs (cited); box size differs per product, so never assume 10 strips.
5. "Strip" also = glucose test strips (devices). Ask if the context is glucometer.
6. "Saline": oral rehydration (খাবার স্যালাইন, ORS packet) vs IV saline bag (normal saline / NS / DNS / Hartmann; for dengue). Ask which.
7. "Baki": owed TO the shop (পাওনা) or BY the shop (দেনা)? Customer-level or supplier-level?
8. "Nogod": cash or the Nagad wallet?
9. "Kal": yesterday or tomorrow? Resolve by tense; otherwise ask. "Porshu" likewise.
10. "Cap": capsule vs cap/lid; "drop": eye / ear / nasal / paediatric drops (different SKUs).
11. "Gas", "pressure", "sugar", "ghum" are symptom/condition words (gas = gastric, pressure = blood pressure, sugar = diabetes); for inventory lookups map to category and ask for the product name, but do NOT recommend products to treat anything.
12. Antibiotics, steroids, injections, sleeping/sedative pills, opioid/codeine cough syrups, contraceptive/abortifacient products, and children's/pregnancy use are sensitive. For these the assistant should only report inventory/sales/price/expiry, never advise use or dose, and may add a neutral "prescription item" flag from DGDA data (uncertain: whether SortPi has such a flag). Smuggled India-origin codeine cough syrup (e.g. Phensedyl) is illegal in BD (uncertain, unsourced; do not stock-list).
13. Look-alike/sound-alike brands: Napa vs Napa Extra vs Napa One; Ace vs Ace Plus vs Ace XR; Renova vs Renova Plus; mg vs ml confusion (60 ml vs 500 mg).
14. Expired vs near-expiry vs "dead stock" (slow mover) are distinct reports.
15. "Free" / "bonus" / "company" (supplier discount) are purchase-side concepts, not customer discounts; "discount" alone is ambiguous between supplier discount and customer discount.
16. "Original" vs "duplicate" (অরিজিনাল / ডুপ্লিকেট = counterfeit) on cosmetics and some medicines; ask before mapping to stock status.
17. "Pikari" price vs retail price; "MRP" vs sold price.
18. Fairness/whitening vocabulary is socially loaded; treat as category tags (brightening, whitening), never as recommendations. Hydroquinone/steroid-containing "fairness" creams are a regulatory concern (cited historical); do not advise.
19. Herbal/Unani/homeopathic items: do not claim effects; report stock only. WB differs: "ayurvedic/kabiraji" distinctions and Indian regulatory classes (uncertain).

### Gaps
- No official BD list of OTC vs prescription-only items found.
- No DGDA document on brand-name naming rules beyond the registration form and the registry key; "Plus/Forte/DS/SR/XR" meanings are common pharma knowledge, not a DGDA rule (uncertain).
- Whether a statute (not just a court order) bans non-prescription antibiotic sale was only found as a High Court order and minister statement.

## 5. Per-type glossaries, units, money/trade words, example sentences, and seasonal demand

### Takeaway
Three type-specific glossaries follow, mostly [MK], with the few cited facts noted. Each includes 16-20 realistic Banglish sentences with plain-English meaning for intent mapping (sales / stock / price / dues / expiry / profit). Seasonal demand: dengue peaks June to about November and drives saline and paracetamol demand (cited); Ramadan/Eid/winter/wedding effects are [MK].

### Cited Findings
- Dengue cases in BD typically rise from June and peak around November; IV saline and paracetamol demand spike; retail stores in Dhaka ran out of normal saline in 2023, with demand ~10x normal for one maker and ~40,000 bags/day needed. — [Daily Star](https://images.thedailystar.net/node/3369926); [Daily Star saline](https://www.thedailystar.net/node/3388871); [Daily Star 10x](https://images.thedailystar.net/node/3388156); [Daily Star 40,000 bags](https://images.thedailystar.net/node/3392446); [Asia News Network](https://asianews.network/?p=114821)
- Wholesale/online platforms present sizes as "1 x 50gm tube", "15ml", "60ml", "10pcs", "1 Strip", "510pcs Box". — [Arogga](https://www.arogga.com/product/50136/glow-lovely-face-cream-ayurvedic-care-50gm/bn); [ePharma](https://epharma.com.bd/bn/medicines/fever)
- Hamdard (Unani/Ayurvedic) sells syrups, tablets, capsules, powders, ointments, drops. — [Wikipedia](https://en.wikipedia.org/wiki/Hamdard_Laboratories_(Waqf)_Bangladesh)

### Inferences (all [MK] unless noted)

#### A. PHARMACY (ওষুধের দোকান / ফার্মেসি / medicine er dokan; also ডাক্তারখানা daktarkhana, "drug store")
Shop/people: দোকান, কাউন্টার, কর্মচারী, "bhai/apu" address forms, MR (এমআর), ডাক্তার (daktar), রোগী (rogi), কাস্টমার, পার্টি.
Forms: tab/ট্যাবলেট, cap/ক্যাপসুল, syrup/সিরাপ/shirap, suspension/susp, drop/ড্রপ, inj/ইনজেকশন, সুই, saline/স্যালাইন (IV bag), খাবার স্যালাইন/ORS, ointment/মলম, cream, gel, lotion, spray, inhaler, supp/suppository, eye/ear/nose drop (চোখের/কানের/নাকের ড্রপ), powder/গুঁড়া.
Units: পাতা/pata/patta/strip (blister strip), বক্স/box, কার্টন/carton, শিশি/বোতল (bottle), টিউব, ব্যাগ (IV bag), প্যাকেট, পিস/pc/pcs, ডজন (dozen; for 12 items, uncertain in pharmacy use), ডোজ/dose, কোর্স/course (e.g. antibiotic course packs, count of days), mg, ml, gm, IU, mcg, %, "10's / 10-টা".
Categories shopkeepers use: জ্বরের ওষুধ, ব্যথার ওষুধ, গ্যাসের ওষুধ (gas er oshudh), সর্দি-কাশির ওষুধ, এলার্জির ওষুধ, এন্টিবায়োটিক, ভিটামিন, প্রেশারের ওষুধ, সুগারের ওষুধ, বাচ্চার ওষুধ, ফার্স্ট এইড, বেবি প্রোডাক্ট, পিল/কনডম (SMC brands; uncertain).
Stock/expiry: মাল (mal), স্টক, মজুত, শেষ, নাই, আছে, ডেট, মেয়াদ, এক্সপায়ার, ব্যাচ, শর্ট, ফেরত.
Money/trade: বাকি, ধার, নগদ, বিকাশ, ডিসকাউন্ট, ছাড়, কমিশন, লাভ, পাইকারি, MRP, কোম্পানি, ডিপো, বোনাস, ফ্রি, চালান, হোম ডেলিভারি.
Examples (Banglish typed/spoken -> meaning):
1. "Aj koto sale hoyeche?" -> Total sales today.
2. "gotokal er bikri koto?" -> Sales yesterday.
3. "ei mashe napa koto pata gese?" -> Number of Napa strips sold this month (all Napa variants; clarify).
4. "napa extra ache koyta?" -> Napa Extra stock count (unit: strips? ask).
5. "seclo stock shesh hoye geche?" -> Is Seclo out of stock?
6. "kon kon medicine er stock nai?" -> List out-of-stock items.
7. "ki ki lagbe order dite hobe?" -> Reorder / low-stock list.
8. "kon medicine er meyad ei mashe sesh?" -> Items expiring this month.
9. "meyad kache ashche emon mal dekhao" -> Show near-expiry stock.
10. "expired maal koto taka'r ache?" -> Value of expired stock.
11. "rahim bhai'r baki koto?" -> How much customer Rahim owes (paona).
12. "ke ke baki dhore ache?" -> List of customers with outstanding credit.
13. "company'r kache amar dena koto?" -> Amount the shop owes suppliers.
14. "ajker labh koto?" / "ei mashe lav koto holo?" -> Profit today / this month.
15. "ki ta sob theke beshi chole?" -> Top-selling item(s).
16. "ki ki chole na, poira ache?" -> Slow/dead stock.
17. "napa 500 er dam koto? mrp na kena?" -> Price: selling price (MRP) vs purchase (kena) price; clarify which.
18. "paracetamol er sob company'r list" -> All paracetamol brands (generic -> brand lookup; compare Napa, Ace, Renova...).
19. "ORS ar saline ager mashe koto geche?" -> ORS vs IV saline sold last month (clarify "saline" = oral/IV).
20. "bkash e koto ashlo ajke?" -> bKash receipts today (distinct from "nogod" ambiguity).
21. "dengu mausum e saline er stock koto rakhi?" -> Planning question; give data only (past sales), no clinical advice.
22. "home delivery koyta hoyeche?" -> Number of delivery orders.
Seasonal: dengue (ডেঙ্গু/dengu; June-Nov, cited): saline, paracetamol, ORS, mosquito repellent/coil (মশার কয়েল) (unsourced). Flu / cough / cold (ফ্লু, সর্দি-কাশি, জ্বর): winter and season-change. Diarrhoea (পাতলা পায়খানা, ডায়রিয়া) in rainy season: ORS. Ramadan (রমজান/রোজা, shifts ~11 days earlier each year; ~Feb-Mar in 2026): gastric/acidity (গ্যাস্ট্রিক), sehri/iftar-related complaints, multivitamin/electrolyte; Eid al-Adha (কোরবানি): gastric. Summer: heat rash (ঘামাচি), sunburn, ORS/Saline-N. Monsoon: skin infection/fungus. (All unsourced.)

#### B. HEALTH & WELLNESS (supplements, vitamins, herbal/Unani/Ayurvedic, devices, protein)
Often a sub-department of a pharmacy or a separate "health care / nutrition" shop. Items/words: ভিটামিন (multivitamin, vitamin C, B-complex, D3), ক্যালসিয়াম (calcium), আয়রন (iron), জিংক (zinc), ফলিক এসিড, ওমেগা-৩/ফিশ অয়েল, প্রোটিন/হুই (whey), ক্রিয়েটিন, BCAA, মাস গেইনার, প্রি-ওয়ার্কআউট, "জিম সাপ্লিমেন্ট", "এনার্জি ড্রিংক", "হারবাল", "ইউনানি", "আয়ুর্বেদিক", "কবিরাজি", "হোমিও/homeopathic" (dilutions: ৩০, ২০০, "mother tincture"/MT, uncertain), ইসবগুল, কালোজিরা (তেল), মধু, ত্রিফলা, অশ্বগন্ধা, তুলসী, নিম, সরবত/শরবত, হামদর্দ (Hamdard; cited), সাফি (Safi; uncertain Hamdard product), রোগন বাদাম (uncertain), চ্যবনপ্রাশ (India, Dabur; imported; uncertain), হিমালয়া/ডাবর (Himalaya/Dabur; India-origin; uncertain), বেবি ফুড (Lactogen/Cerelac/Farex; uncertain).
Devices: থার্মোমিটার, BP/প্রেশার মাপার মেশিন (digital), গ্লুকোমিটার + স্ট্রিপ (সুগার মাপার মেশিন), অক্সিমিটার, নেবুলাইজার, ওজন মাপার মেশিন (weight scale), ওয়াকার, হুইলচেয়ার, মাস্ক, গ্লাভস, সিরিঞ্জ, ব্যান্ডেজ, তুলা, প্রেগনেন্সি কিট, ওয়ারেন্টি/গ্যারান্টি (warranty; important for devices), ব্যাটারি, সার্ভিস, "box pack"/"original".
Units: ক্যাপসুল/ট্যাবলেট count (30's, 60's), জার (jar), কৌটা (kouta = tin/jar, uncertain), প্যাকেট, kg/lb (protein tubs are 2 lb / 5 lb / 1 kg), serving ("serving koto"), scoop, বোতল/ml, pcs, piece/set, সেট, বক্স.
Money/trade: same as pharmacy plus ওয়ারেন্টি, EMI (ঈএমআই; uncertain), অরিজিনাল/ডুপ্লিকেট/"imported" (ইম্পোর্টেড), "authentic", "batch", "seal pack".
Examples:
1. "protein er stock koto?" -> Protein stock (clarify brand/flavour/size).
2. "whey protein 2 lb koyta bikri hoyese?" -> Number of 2 lb whey tubs sold.
3. "multivitamin er meyad kobe?" -> Expiry date(s) for multivitamins.
4. "kon vitamin beshi chole?" -> Top-selling vitamins.
5. "omega 3 ar fish oil er dam koto?" -> Price of omega-3/fish oil items.
6. "bp machine koyta ache? warranty koto din?" -> BP machine stock and warranty length.
7. "oximeter ager mashe koto gese?" -> Oximeters sold last month.
8. "glucometer strip er expiry kobe?" -> Expiry for glucose strips (strip here = test strips).
9. "hamdard er product gulo dekhao" -> List Hamdard (Unani/herbal) items.
10. "isubgul ar kalojira stock ache?" -> Stock of psyllium husk / black seed items.
11. "modhu orginal na duplicate?" -> Is the honey genuine? (unanswerable from data; treat as a product-attribute lookup).
12. "ei mashe lav koto, supplement e?" -> Profit this month on supplements category.
13. "kon supplement baki te gese?" -> Supplement sales on credit.
14. "monthly koto taka'r mal kinsi?" -> Purchases this month.
15. "ajker delivery list dao" -> Today's home deliveries.
16. "creatine ar mass gainer shesh?" -> Are creatine/mass gainer out of stock?
17. "company discount ki ase protein e?" -> Supplier discount on protein.
18. "dead stock koto taka'r?" -> Value of unsold/slow stock.
Seasonal: winter (vitamin C, honey, herbal cough syrups; unsourced); Ramadan (dates/খেজুর, ইসবগুল, sharbat/শরবত, multivitamin; unsourced); Eid gift hampers; gym peaks around New Year and pre-summer (unsourced). Note: avoid health claims; report stock only.

#### C. COSMETICS & BEAUTY (কসমেটিক্স দোকান / বিউটি শপ / "cosmetics er dokan"; "parlour" = beauty parlour as trade customer)
Items/words: লিপস্টিক, লিপবাম, লিপগ্লস, কাজল, আইলাইনার, মাসকারা, আইশ্যাডো, ভ্রু পেনসিল (eyebrow pencil), ফাউন্ডেশন, বিবি/সিসি ক্রিম, কমপ্যাক্ট, ব্লাশ, মেকআপ কিট, ফেসওয়াশ, ক্রিম (ফর্সা ক্রিম/fairness, গ্লো, ব্রাইটেনিং, হোয়াইটেনিং), ফেয়ার অ্যান্ড লাভলি / গ্লো অ্যান্ড লাভলি (Fair & Lovely / Glow & Lovely; Glow & Lovely cited), লোশন, ময়েশ্চারাইজার, সানস্ক্রিন (SPF), সিরাম, টোনার, ফেসপ্যাক, স্ক্রাব, শ্যাম্পু, কন্ডিশনার, চুলের তেল, হেয়ার কালার/ডাই, হেয়ার রিমুভাল ক্রিম, সাবান, ডিও/বডি স্প্রে, পারফিউম, আতর (attar; alcohol-free, popular among Muslim buyers), মেহেদি (henna; cone/কোন, powder), নেইল পলিশ, আলতা, টিপ, সিঁদুর (uncertain), ঘামাচি পাউডার, ব্রণের ক্রিম/acne, দাগ (dag = spots/marks), ডার্ক সার্কেল, বেবি কেয়ার (বেবি লোশন, পাউডার, তেল; Shajgoj lists baby care).
Units: টিউব (tube), জার, বোতল, স্যাশে/sachet (shampoo sachets), রিফিল, কোন (cone), পিস, সেট, কম্বো, ml, gm, SPF, "shade no." ("Shade 1" cited), "50gm / 100gm", ডজন (dozen; wholesale, uncertain), কার্টন, বক্স, পাইকারি প্যাকেট.
Money/trade: এমআরপি, ডিসকাউন্ট, অফার, কম্বো অফার, ফ্রি গিফট, বাকি, নগদ, বিকাশ, COD, ডেলিভারি, অরিজিনাল/ডুপ্লিকেট/"Indian"/"Korean"/"Thai"/"imported" (origin tags are important to buyers; uncertain), "local brand", পার্লার পার্টি (parlour accounts), বিয়ের সেট (bridal set).
Examples:
1. "lipstick koto ta ache, shade onujayi dekhao" -> Lipstick stock by shade.
2. "kajol er stock shesh?" -> Is kajal out of stock?
3. "glow and lovely cream koyta bikri?" -> Units sold of Glow & Lovely creams (customers may still say "fair and lovely").
4. "fairness cream er sale koto?" -> Sales of fairness/brightening category (treat as category tag).
5. "shampoo sachet koto packet ache?" -> Shampoo sachet stock in packets.
6. "mehedi cone eid er age koto gese?" -> Henna cones sold before Eid.
7. "attor er stock koto, kon ta beshi chole?" -> Attar stock and best seller.
8. "perfume er mrp koto, kena koto?" -> MRP vs purchase price of perfumes.
9. "ei mashe cosmetics e lav koto?" -> Profit this month in cosmetics.
10. "serum ar sunscreen expire kobe?" -> Expiry for serum/sunscreen (cosmetics expiry/PAO often printed as month/year).
11. "parlour er baki koto?" -> Credit owed by beauty parlours.
12. "kon brand er mal pori ache?" -> Which brand is dead stock.
13. "face wash 100gm koyta ache?" -> Stock of 100 g face wash.
14. "combo offer e koto gese?" -> Sales under combo offers.
15. "original ar duplicate alada dekhao" -> Genuine vs counterfeit (data-field dependent; clarify).
16. "pikari te foundation koto dam?" -> Wholesale price of foundation.
17. "delivery cod e koto baki?" -> COD pending amount (possible ambiguity with credit).
18. "nail polish remover shesh hoye gese?" -> Out of stock check.
Seasonal: Eid (both): mehedi, attar, lipstick, nail polish, চাঁদ রাত (Chand Raat henna night) peaks; Pohela Boishakh (পহেলা বৈশাখ): alta, tip, makeup; wedding season (বিয়ের মৌসুম; winter): bridal makeup, foundation, mehedi, sindoor/alta (Hindu weddings; uncertain); summer: sunscreen, deodorant, ghamachi powder, face wash; winter: lotion, Vaseline, lip balm, moisturizer. All unsourced.

#### D. DGDA / naming notes (all types)
- Each medicine record = {brand/trade name, generic (INN), strength, dosage form, manufacturer, pack/MRP}; registry key is DAR number + trade name (cited). Combos use "+" (e.g. Paracetamol + Caffeine, cited). Brand family suffixes (cited examples: Extra, Extend, Rapid, One, XR, ER, Max, Power, Plus, Paediatric). Drug names on packs are in English; shopkeepers speak brand + number.
- BD companies (for a manufacturer filter): Square, Beximco, Incepta, Renata, Eskayef, ACI, Acme, Opsonin, Aristopharma, Healthcare, Drug International (names recognised from general knowledge; Beximco cited as Napa maker via [ePharma](https://epharma.com.bd/en/medicines/fever/napa-500mg-10pcs-4720)). Which brand belongs to which is unverified except Napa.
- Cosmetics and herbal/Unani products are regulated separately/loosely vs prescription drugs; do not assume DGDA registration data covers cosmetics (the Drug and Cosmetics Act 2023 was referenced by a third-party site; unverified).
- WB/India: "generic name", "Schedule H/H1/X", "Jan Aushadhi", "stockist", "chemist" and Hindi "dawai" are India-side; WB Bengali uses "ওষুধ", "পাতা", "মলম" similarly, but UPI replaces bKash/Nagad and drug brand names differ (e.g. Dolo-650, Crocin vs Napa). Flag any Indian brand input as possibly WB-origin or imported (uncertain).

### Gaps
- No source for MR/company discount/bonus/free-scheme phrasing, expiry-return practice, or typical margins.
- No source for cosmetics shop slang (wholesale units like dozen, origin tags, "original/duplicate" phrasing), nor Eid/Ramadan demand data for BD retail.
- No source on supplements or devices vocabulary beyond Hamdard and product-category names.
- Social-media/Banglish corpus (Facebook commerce, Reddit r/bangladesh) not accessible via the tools used.
- Recommended next step: download the Mendeley dataset for brand-generic-form-strength seeding; collect 50-100 real shopkeeper utterances per type from pilot users; run them through the intent mapper to validate the [MK] vocabulary above.
