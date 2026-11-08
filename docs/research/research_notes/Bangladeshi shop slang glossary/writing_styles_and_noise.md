# How Bangladeshi shopkeepers and customers write short business questions on a phone: writing styles, noise patterns, and matching techniques

Scope note. Evidence is thin for the exact use case (short shop questions). No public corpus of Bangladeshi shop-owner chat was found. Cited findings come from Unicode documents, transliteration/code-mixing papers and dataset pages. The example catalogue in the Inferences sections is built by the researcher from general knowledge of Bangla, is NOT from a corpus, and every item should be treated as a hypothesis to test (marked "(uncertain)" where weak). Where Bangladesh and West Bengal differ, it is flagged.

---

## Q1. What are the top ways the same question ("ajker bill koto?") gets written, and what error types explain each? (covers Bangla script, Banglish, code-mixing, noise, numbers)

### Takeaway
Banglish has no standard spelling: a Google study counted an average of 3.8 attested romanizations per Bengali word (vs 1.8 for Hindi), and a Bangladeshi benchmark shows the same words written 3 ways in one sentence. Bangla is written as it sounds, so exact string matching on Latin text is hopeless; matching must be phonetic/fuzzy and anchored to the shop's own vocabulary.

### Cited Findings
- Dakshina (Google, LREC 2020): the Bengali romanization lexicon has 25,000 train + 5,000 dev/test native-script word types with an average of 3.8 romanizations per type (Hindi 1.8, Kannada 2.0, Gujarati 4.2). Authors attribute the variation to the "lack of standard orthography in the Latin script" and to Latin-script IMEs/SMS/social media. — [Dakshina paper PDF](https://arxiv.org/pdf/2007.01176) (landing: [ACL Anthology](https://aclanthology.org/2020.lrec-1.294))
- BanglaTLit (EMNLP Findings 2024, Penta Global, Bangladesh): Figure 1 shows one Bangla sentence romanized several ways: "cholo / chlo" (চলো), "khlte / kelte" (খেলতে), "jai / gai / jaye" (যাই), "bhalo / vlo / balo" (ভালো), "post / pst" (পোস্ট), "bhai / vai / vi" (ভাই). The authors say Bangla has a phonemic orthography ("written as it sounds"), which adds flexibility in romanization, and that romanized Bangla is ubiquitous because of QWERTY familiarity. — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- BanglaTLit comes from 42.7k annotated pairs plus a 245.7k-sample romanized pretraining corpus; one big source is the TrickBD site (they manually annotated 35.6k of its samples). — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- Daraz (Bangladesh e-commerce) review corpus BanglishRev, 1.74M reviews: heuristic split found 37.77% Banglish, 31.27% English, 25.04% Bangla, 5.92% code-mixed (paper text is internally inconsistent on these figures). The classifier mislabels misspelled English as Banglish, and authors preprocess Banglish with the `avro` library to get Bangla. — [BanglishRev, arXiv 2412.13161](https://arxiv.org/html/2412.13161)
- Code-switching studies of Bangladeshi social media: Bangla is the matrix language with English mostly inserted as content words; intra-sentential, inter-sentential, tag and intra-word switching all reported; a Facebook/Instagram/WhatsApp study (descriptive, no sample size in abstract) describes mixing within a single clause as widespread and tied to technological compatibility (keyboards). A survey thesis reports about 12.9% prefer Bangla only while about 90% still code-switch. — [Shahriar, IJELR](https://jurnal.utu.ac.id/IJELR/article/view/14906); related records via [BRAC Univ. thesis](https://dspace.bracu.ac.bd/xmlui/handle/10361/15958), [IUB repository](https://ar.iub.edu.bd/handle/11348/1558)
- Bangla homophone confusion is a documented error source: the VAIYAKARANA benchmark (92,830 incorrect + 18,426 correct sentences) notes spelling errors from mixing look-alike or sound-alike characters, e.g. the n/ṇ (ন/ণ) and s/ś/ṣ (স/শ/ষ) sets. — [VAIYAKARANA, arXiv 2406.14284](https://arxiv.org/pdf/2406.14284)
- Phonetic facts: শ, ষ, স have merged into /ʃ/ in standard modern Bengali; ণ is pronounced as alveolar /n/ except in conjuncts with retroflexes; জ and য can both represent /dʒ/. — [Wikipedia: Bengali alphabet](https://en.wikipedia.org/wiki/Bengali_alphabet)
- Bangla digits and traditional fraction words: ০-৯ map to 0-9; Wikipedia lists ৷৹ = 1/4 (সিকি, পোয়া, "সোয়া-"), ৷৷৹ = 1/2 (আধুলি, "সাড়ে-"), ৸৹ = 3/4 ("পৌনে-"), and বিশ/কুড়ি for 20. দেড়, আড়াই, সওয়া, ডজন, গণ্ডা, হালি were NOT covered by that page. — [Wikipedia: Bengali numerals](https://en.wikipedia.org/wiki/Bengali_numerals)
- Avro Phonetic (the dominant Banglish-to-Bangla keyboard in Bangladesh) key map: অ=o, আ=a, ই=i, ঈ=I/ee, উ=u/oo, ঊ=U, এ=e, ঐ=OI, ও=O, ঔ=OU; ক=k, খ=kh, গ=g, জ=j, য=z, ফ=ph/f, ভ=bh/v, শ=sh/S, ষ=Sh, ট=T, ড=D, ণ=N, ড়=R, ঢ়=Rh, য়=y/Y, ং=ng, ঁ=^. Note য=z and জ=j: users who type "zay" for যায় inherit this. — [Borno docs: Avro layout](https://borno.codepotro.com/docs/guide/layout-avro.html)
- Avro was released free on 26 March 2003 (Mehdi Hasan Khan); Bijoy had been the most widely used method in Bangladesh until Avro; Gboard (Android/iOS) offers Bengali with voice typing, handwriting, a Latin-transliteration layout and a traditional layout. — [Wikipedia: Bengali input methods](https://en.wikipedia.org/wiki/Bengali_input_methods)
- Spelling variants exist even in Bangla script and break hash/lookup: the shobdohash package's own example is that বাংলা and বাঙলা should hash alike. — [shobdohash (PyPI)](https://pypi.org/project/shobdohash) (via search snippet; page body not retrievable)
- Real keyboard-typing errors exist as a dataset: BSpell's "Bangla Real Error" set has 6,300 sentences typed by ten participants on an English QWERTY keyboard; its authors name compound characters, phonetically similar single characters and similarly pronounced vowel signs as main error sources. — [BSpell, arXiv 2208.09709](https://arxiv.org/html/2208.09709v2)

### Inferences
Researcher-constructed catalogue for "আজকের বিল কত?" / "ajker bill koto?" (NOT corpus-derived; frequencies unknown; hypotheses to test):

| # | Written form | Error type(s) |
|---|---|---|
| 1 | আজকের বিল কত? | Clean Bangla, NFC, Bangla "?" |
| 2 | আজকের বিল কতো / আজকের বিলটা কত / আজকের বিল কত ? | Spelling variant কত~কতো; extra suffix -টা; space before "?" ; "।" instead of "?" is possible |
| 3 | আজকের bill কত? / আজকের বিল koto? | Code-mixing; mixed scripts within a sentence |
| 4 | ajker bill koto? | Banglish, "standard-ish" |
| 5 | ajker bil kto / ajker bill kto?? | Dropped vowel (koto to kto), single l, repeated "?" |
| 6 | aj ker bill koto / ajkerbill koto | Wrong spaces (split or merged words) |
| 7 | ajkr bil kto / ajkr bill kt | Vowel-less "SMS" skeleton |
| 8 | aajker bill kotooo? / AJKER BILL KOTO | Aa for long vowel, vowel repetition for emphasis, all caps |
| 9 | ajkwr bill koyo / ajker bill kitp | QWERTY adjacent-key slips (e-w, t-y, o-i-p) (uncertain) |
| 10 | Voice typing: "আজকের বিল কত" with no punctuation, or mis-heard words such as আজ কের বিল কত / আজকে বিল কত | ASR word boundaries and dialectal -কে/-কের; ASR output may also be Latin if the keyboard language is English |
| 11 | Pasted Bijoy garble: AvRKvi wej KZ? (constructed from memory of Bijoy mapping, exact glyphs uncertain) | Legacy ANSI text read as Latin |

Systematic Banglish alternations to fold (researcher knowledge; confirm against Dakshina/BanglaTLit lexicons): o~a~u for অ/আ (koto/kata; kotha), a~aa; i~ee~y; u~oo; bh~v~b (bhalo/valo/balo); ph~f; sh~s~x (shob/sob/xob); ch~c~cch (chai/cai); j~z~g (jay/zay, jabo/gabo); w~u; w~b; double letters (bill/bil, tk/taka); dropped vowels (kto, hoyni to hoini to hyni); trailing h (achhe/ache/ase/ashe/asche); ki/kii/key; kno/keno/kenno; 'ng' ~ 'n'; 'ee' ~ 'i'.
Common shop words with plausible Banglish forms (hypothesis): দাম = dam/daam/dham; বাকি = baki/bakee/baaki; টাকা = taka/tk/tka/৳; হিসাব = hisab/hishab/hisaab/hisap; বিক্রি = bikri/bikrii/bikry; জমা = joma/jama/zoma; খরচ = khoroch/khorc/kharoch/khoroc; মাল = mal/maal; স্টক = stock/stok/stk; কত = koto/kto/kotto/kotoo.
Code-mixing patterns likely in shops: English nouns for business objects in Bangla script (বিল, স্টক, পেমেন্ট, ডিউ, প্রফিট, রিটার্ন), Bangla verbs/question words around them; intra-word mixing such as "বিলটা", "stock-এ", "paymentটা", "dueগুলো"; abbreviations tk, pcs, pkt, kg, qty, bal, due, adv, cash, bkash/bKash, nagad, rocket.
Number forms in one sentence (see also number table below): "1500", "১৫০০", "1,500", "১,৫০০/-", "1.5k", "দেড় হাজার", "dir hajar" (uncertain), "দেড়শ" = 150 (not 1500), "দেড়শো", "একশ পঞ্চাশ", "ek sho pochash".

Number words (language knowledge; sources above cover only partial list):
- দেড় = 1.5; আড়াই = 2.5; সাড়ে X = X + 0.5 for X >= 3 (সাড়ে তিন = 3.5; sare tin); সওয়া/সোয়া X = X + 0.25 (সোয়া দুই = 2.25); পৌনে X = X - 0.25 (পৌনে তিন = 2.75; poune tin); ডজন = 12 (ek dojon/dozon); হালি = 4 (ek hali, esp. eggs/fruit); গণ্ডা = 4 (gonda; also unit of four); কুড়ি = 20 (kuri); শ/শো = 100; হাজার = 1,000; লাখ/লক্ষ = 100,000; কোটি = 10,000,000.
- Multiplier trap: "দেড়শ" 150 vs "দেড় হাজার" 1500 vs "সাড়ে তিনশ" 350 vs "সাড়ে তিন হাজার" 3500. West Bengal also uses ডজন and কুড়ি; "পোয়া" (1/4 unit) in some Bangladeshi dairy contexts (uncertain).
- Voice typing risk: spoken numbers may be returned as words or digits unpredictably (no source; see Gaps).

### Gaps
- No corpus-derived frequency of any specific spelling of any shop word (e.g. how often "kto" vs "koto"); Dakshina's lexicon includes attestation counts, which could be mined offline but was not retrieved here.
- No published study of Bangladeshi shop-owner or customer chat; closest are Facebook/Daraz/YouTube comment corpora.
- The claimed "most frequent spellings" ranking could not be sourced.
- Dialect (Chattogram, Sylhet, Noakhali, Rangpur) spelling in typed text: no source found. Do not rely on any dialect entry without native-speaker review (uncertain examples: Sylheti "কিতা" for "what"; Rangpur "কনে/কোনঠে" for "where"; Chattogram elongated/contracted forms).
- Typo/autocorrect behaviour on Banglish: no published measurement found; examples above are plausible, not measured.
- Google Bangla speech recognition error profile for numbers/shop words: not found (OOD-Speech compares Wav2Vec2 vs Google API only at the domain level).

---

## Q2. Which Unicode / keyboard / legacy-encoding / transliteration issues cause real matching failures?

### Takeaway
NFC/NFKC fixes only part of the problem: it unifies the nukta letters (ড়/ঢ়/য়) and two-part vowel signs but does NOT fix confusable letters (ব/র, ন/ণ, শ/ষ/স), ZWJ/ZWNJ noise, khanda-ta variants, legacy Bijoy text, or spelling variants. Add a Bangla-specific cleanup step on top.

### Cited Findings
- Nukta letters have two encodings: atomic U+09DC ড়, U+09DD ঢ়, U+09DF য় versus decomposed U+09A1+U+09BC, U+09A2+U+09BC, U+09AF+U+09BC. The atomics are on the composition-exclusion list, so NFC/NFD yield the decomposed form; Bangladesh's ICT Division submitted proposal L2/20-002 (2020) to change that, noting data anomalies in Bangla corpora and an IDNA2008 inconsistency (09DC..09DD and 09DF DISALLOWED). Keyboards, fonts and old data can emit either; always normalise before indexing. Whether the proposal was adopted was not verified. — [UTC L2/20-002](https://www.unicode.org/L2/L2020/20002-bangla-mods.pdf); [codepoints.net U+09DC](https://codepoints.net/U+09DC)
- Unicode Standard ch.12: conjuncts are consonant + U+09CD (hasant/virama) + consonant; ya-phala is the sequence U+09CD U+09AF; after ra, "র + ্ + য" renders as reph+ya by default, while inserting ZWJ right after the ra (U+09B0 U+200D U+09CD U+09AF) gives ra with ya-phala; elsewhere ZWJ is "not necessary but can be present", so two visually identical ya-phala spellings (with/without ZWJ) can exist. — [Unicode 15 ch.12 PDF](https://www.unicode.org/versions/Unicode15.0.0/ch12.pdf)
- Khanda-ta: use U+09CE ৎ; before Unicode 4.1 the recommended encoding was ত + ্ + ZWJ, so old text may carry the older sequence. Khiya ক্ষ is not a separate character but ক + ্ + ষ. U+09CB ো and U+09CC ৌ are two-part vowel signs; U+09D7 is the au length mark, "always used in conjunction with the left part". — [Unicode 15 ch.12 PDF](https://www.unicode.org/versions/Unicode15.0.0/ch12.pdf)
- ZWJ/ZWNJ: Unicode places U+200C after hasant to prevent conjunct formation (explicit hasant visible), U+200D to request half/alternate forms; the bkit toolkit's docs say ZWNJ is rarely used in Bangla and ZWJ only in specific contexts, and its normalizer has separate character, zero-width, halant, vowel-kar and punctuation-space steps. — [Unicode 15 ch.12 PDF](https://www.unicode.org/versions/Unicode15.0.0/ch12.pdf); [bkit via search snippet](https://pypi.org/project/bkit/0.0.2) (page body not retrievable)
- A Stack Overflow thread reports the csebuetnlp normalizer left ন vs ণ unchanged; a commenter notes Unicode has no normalization rule for it, so a language-specific approach is needed. — [Stack Overflow mirror](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/70677462/unicode-text-normalization-in-bengali)
- csebuetnlp normalizer README: normalises/cleans Bengali and English text, option `unicode_norm` defaulting to NFKC, optional replacement of punctuation, URLs and emojis, and a flag to apply unicode normalization last; licence CC BY-NC-SA 4.0, non-commercial research only (a licensing problem for a commercial app). The source reportedly uses ftfy (mojibake fixing + NFC), a char-replacement table and a regex; a fetch summary also claimed an argument-order bug in the NFKC call, which is unverified, so test before use. — [csebuetnlp/normalizer GitHub](https://github.com/csebuetnlp/normalizer); [PyPI](https://pypi.org/project/csebuetnlp-normalizer)
- Dakshina's authors normalised beyond NFC with "extensive additional visual normalization" (visually identical strings mapped to one), and still measured a mean character error rate of 0.054 between original and re-typed native strings, i.e. even careful human retyping of Bengali-script text differs at about 5 characters per 100 after normalization; they also note variability in spelling of proper names and English loanwords. — [Dakshina paper](https://arxiv.org/pdf/2007.01176)
- Dakshina keeps Latin digits as Latin and maps the danda । to "." when romanizing, so ".", "।" and "?" handling must be unified. — [Dakshina paper](https://arxiv.org/pdf/2007.01176)
- Legacy Bijoy/SutonnyMJ: Bijoy was proprietary (Mustafa Jabbar) and dominant before Avro/Unicode; Bijoy text pasted into a Unicode field appears as odd Latin/symbol strings; different Bijoy versions have different codes; PDFs made with Bijoy fonts often extract as garbage; converters need the right mapping. — [Wikipedia: Bengali input methods](https://en.wikipedia.org/wiki/Bengali_input_methods); [converteraz: common Bijoy conversion errors](https://bijoy.converteraz.com/en/blog/common-bijoy-conversion-errors); [bangladatetoday guide](https://bangladatetoday.com/blog/bijoy-to-unicode-avro-guide); a pure-Python Bijoy-to-Unicode converter exists per [GitHub topic list](https://github.com/topics/bijoy2unicode?l=python)
- The Dakshina paper cites the standard ad hoc romanization problem: "lack of standard orthography in the Latin script" and points to similar issues in Arabic dialect writing. — [Dakshina paper](https://arxiv.org/pdf/2007.01176)

### Inferences
Normalization pipeline that follows from the above (researcher recommendation):
1. NFC (not NFKC blindly; NFKC is harmless for Bangla letters but also folds some punctuation/width forms; both unify the nukta letters to the decomposed form).
2. Delete ZWJ/ZWNJ everywhere except where a test shows they change meaning (keep only the ra+ZWJ+hasant+ya case if you care about "র‍্যা" vs "র্যা" display; for matching, strip all).
3. Map legacy khanda-ta ত+্+ZWJ to ৎ; fix ে+া→ো and ে+ৗ→ৌ if keyboards emit separate parts.
4. Map digits ০-৯ to 0-9 (and Arabic-Indic if present), "," thousand separators, "/-", "৳", "tk", "Tk." to a canonical amount token; map "।", "?", "!" and repeated punctuation to one set; strip emoji.
5. Fold confusables into a matching key only (keep original for display): ণ→ন, শ/ষ→স, য→জ, ঈ→ই, ঊ→উ, য়→য, ড়→র, ঢ়→র? (ড়/ঢ়/র are sometimes typed as র; uncertain), ং/ঙ→ং, ক্ষ→খ, ও/ো kept distinct only for display, ৎ→ত.
6. Detect Bijoy garble by character-class heuristics (Latin text with many †‡ƒ… and capital/lowercase alternation) and run a Bijoy-to-Unicode converter; unlikely in short typed queries, likely only when pasting from old documents/PDFs.
7. Lowercase and strip Banglish diacritics; handle mixed-script tokens by transliterating Bangla-letter pieces and Latin pieces to one canonical phoneme string (see Q3).
Visually confusable letter pairs to include in weighted edit-distance (researcher list): ব/র, ি/ী, ু/ূ, ণ/ন, শ/ষ/স, জ/য, ক্ষ/খ (ক্ষ is pronounced খ-like in many words), ও/ো, ড/ড়, ঢ/ঢ়, ত/ৎ, ঙ/ং/ঞ, ঁ (candrabindu) frequently dropped. West Bengal vs Bangladesh: spelling reforms and Latin romanization conventions differ (e.g. Indian "ph" vs Bangladeshi "f", different choice of ক্ষ/জ্ঞ transliterations like "kkh/gg/gy"); examples (uncertain).

### Gaps
- No published failure-rate data for Unicode issues in Bangla search; evidence is from specs and issue threads only.
- The Unicode standard's authoritative normalization data files (DerivedNormalizationProps.txt, CompositionExclusions.txt) were not fetched; the ড়/ঢ়/য় exclusion is confirmed only via the proposal document and codepoints.net snippets.
- bkit/shobdohash PyPI pages could not be read; their rules are known only from search summaries.
- csebuetnlp normalizer's exact char tables were not retrieved.
- No data on how often Gboard, Samsung Keyboard, Avro Keyboard (Android) or Ridmik emit different ZWJ/nukta sequences. Ridmik and similar Bangladeshi keyboards were not researched.
- No source for "keyboards that insert wrong conjuncts"; plausible mechanism (virama mistyped, ZWJ mis-insertion) only.

---

## Q3. Which on-device-feasible techniques give the best robustness, with sizes and published accuracy?

### Takeaway
No single technique is enough; evidence supports a stack: Bangla-script normalization, a phonetic/skeleton key (Soundex-style) plus character n-gram/weighted edit distance against the shop's own catalogue, optionally a small multilingual embedder, and an optional LLM fallback. Neural back-transliteration is small (about 11M params) but only about 55% top-1 per word, so use it as a candidate generator re-ranked against the catalogue, not as ground truth.

### Cited Findings
- IndicXlit (AI4Bharat Aksharantar): 11M-parameter transformer for romanized to native-script transliteration; decoding uses beam 4 and re-ranks the top-4 with a word-level unigram LM, which improved accuracy by about 12% on average across languages. Bengali top-1: 55.49% on the Dakshina test set (versus 49.40% from Roark et al. 2020), and on the Aksharantar test set 54.06% micro-average; by sub-set Bengali: frequent words 63.03%, uniform sample 60.47%, Indian named entities 40.50%, foreign named entities 36.43%. Bengali Aksharantar test set has 5,009 pairs (Freq 1,071; Uni 1,198; NEF 1,059; NEI 1,681). Models, data and mining scripts are open source. — [Aksharantar paper](https://arxiv.org/pdf/2205.03018); [IndicXlit repo](https://github.com/AI4Bharat/IndicXlit)
- Aksharantar collection method: a maker-checker process where transliterators create multiple romanized variants for a native word and validators can add variants; indicates multiple valid answers per word. — [Aksharantar paper](https://arxiv.org/pdf/2205.03018)
- Dakshina baselines for Bengali single-word Latin to native transliteration: pair 6-gram CER 14.2 / WER 54.0; transformer CER 13.2 / WER 50.6; LSTM CER 13.9 / WER 54.7. For full sentences (whitespace evaluation), Bengali WER: single-word pair 6-gram 35.0, single-word transformer 32.5, noisy-channel with LM 18.6, whitespace transformer 19.7; with pass-through evaluation noisy-channel 25.8 and full-string transformer 33.0. Sentence-level LM context therefore roughly halves the word error rate compared with single-word transliteration. — [Dakshina paper](https://arxiv.org/pdf/2007.01176)
- BanglaTLit back-transliteration benchmark (romanized to Bangla script, test set): BanglaT5_nmt_en_bn BLEU 36.19, ROUGE-L 76.14, BERTScore 94.05; GPT-4 Turbo zero-shot BLEU 26.56, GPT-4o 19.28, GPT-3.5 Turbo 20.73, LLaMA3-8B 3-shot 11.01; BanglaT5-small only BLEU 4.14 and mT5 12.48; best dual-encoder system (TB-XLM-R + BanglaT5_NMT) BLEU 36.07 with BERTScore 98.82. Takeaway: small generative models fail, large ones work, an LLM fallback is competitive but weaker than a fine-tuned BanglaT5. — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)
- IndoTranslit (arXiv 2511.22769): about 975k Bengali romanized sentence pairs generated by a rule-based mapping from Bengali Wikipedia plus 10k Dakshina pairs; single shared 60M-parameter Marian model for Hindi and Bengali, reported multilingual BLEU 73.15 (Bengali about 77.82 in text). Caveat: Bengali pairs are rule-based, not real user noise (Gemini-simulated noise was used for Hindi only). — [IndoTranslit paper](https://arxiv.org/pdf/2511.22769)
- Bangla Soundex: Naushad UzZaman and Mumit Khan (BRAC Univ., 2004) adapted Soundex for Bangla, including conjunct handling, to improve spelling suggestions; open-source Python implementation shobdohash. A UIU thesis combines edit distance, Soundex and Metaphone for Bangla suggestions; nameGist is a phonetic algorithm for bilingual Bengali names (accuracy claims unverified). — [BRAC DSpace](https://dspace.bracu.ac.bd/xmlui/handle/10361/310); [shobdohash](https://libraries.io/pypi/shobdohash); [UIU thesis](https://dspace.uiu.ac.bd/items/ce5eebdd-f109-4444-9196-b28b8f4314ee)
- BSpell (Bangla-script spell correction): hybrid-pretrained BERT-style model, ACC 97.6% on synthetic Prothom-Alo errors (phonetic rule-based baseline 61.2%, clustering baseline 52.3%, BERT-base 91.1%); on its real typed-error set ACC 87.8% without fine-tuning and 91.5% fine-tuned. Parameter count not given in what was retrieved. DPCSpell reports exact-match 94.78 on its Bangla corpus (leaderboard). — [BSpell](https://arxiv.org/html/2208.09709v2); [DPCSpell leaderboard](https://hyper.ai/fr/sota/tasks/bangla-spelling-error-correction/benchmark/bangla-spelling-error-correction-on-dpcspell)
- Unsupervised normalisation of spelling variants in code-mixed social text by clustering distributed word representations improves downstream POS-tagging and sentiment (no numbers in abstract; languages not named). — [arXiv 1804.00804](https://arxiv.org/abs/1804.00804)
- Embedding model sizes (third-party sources): multilingual-e5-small has hidden size 384, 12 layers, weights file about 471 MB (fp32), MIT licence reported, and is listed at 118M parameters on a third-party leaderboard; paraphrase-multilingual-MiniLM-L12-v2 also listed at 118M (0.44 GB fp32). BanglaBERT is an ELECTRA-base encoder, about 110M parameters; csebuetnlp/banglabert_small is 13.7M parameters (256 hidden, 12 layers); BanglishBERT is BanglaBERT further pretrained on Bangla + English. — [e5-small search results](https://huggingface.co/nixiesearch/multilingual-e5-small-onnx/blob/main/README.md); [leaderboard table](https://huggingface.co/spaces/Thun09/leaderboard_demo/blame/162510c93c78b3c6921f3182eb814d16c47c634d/all_data_tasks/4/default.jsonl); [BanglaBERT paper](https://arxiv.org/pdf/2101.00204v3); [BanglaMamba paper (small variant size)](https://arxiv.org/pdf/2608.25190)
- BanglaTLit authors further pretrained encoders on romanized Bangla (BanglaTLit-PT, 245.7k samples) and report gains on romanized sentiment/offensive/emotion tasks (e.g. TB-XLM-R improves TB-Sentiment accuracy by about 3.62% over the best prior model, GPT-3.5 Turbo), showing standard Bangla-script encoders do not handle romanized text well without adaptation. — [BanglaTLit](https://aclanthology.org/2024.findings-emnlp.859.pdf)

### Inferences
- Because the same Bengali word has about 3.8 attested romanizations and exact top-1 recovery is about 50-55%, the assistant should not require correct back-transliteration. Instead, canonicalise BOTH sides to the same lossy phonetic key and compare with fuzzy tolerance: (a) the shop's own item and customer names and the app's own fixed vocabulary (বিল, বাকি, দাম, স্টক, বিক্রি, খরচ, হিসাব, আজ, গতকাল...) are transliterated once to a "phoneme skeleton" (collapse vowels, merge sh/s/x, ph/f, bh/v/b, j/z, ch/c, w/u, kh/k variants, drop doubled letters and trailing h), stored; (b) the user's text, in either script, is mapped to the same skeleton; (c) candidates are scored by character 2-4-gram Jaccard/TF-IDF cosine plus weighted Levenshtein (cheap substitutions: o/u, i/e, a/o, j/z, s/sh, f/ph, v/b, w/u, k/c, d/dh, t/th, double letters), restricted to a small closed vocabulary so false positives stay low.
- Skeleton keys are tiny (KBs), run in microseconds and need no model download; this is the most robust on-device layer for this use case. Bangla Soundex (shobdohash-style) covers Bangla-script input; a simple hand-written Banglish Metaphone-like folding (rules above) covers Latin input; a shared key lets "kto", "koto", "কত" meet.
- Use IndicXlit (about 11M params) only if you need open-ended Banglish names or free text; run n-best (4) and let the catalogue unigram prior re-rank, mirroring Aksharantar's reported +12% re-ranking gain. Even 11M parameters will be tens of MB in int8 on a Pixel (size estimate, not sourced).
- Embeddings: multilingual-e5-small (118M, hundreds of MB fp32, much smaller when int8 or distilled) is feasible on a mid-range phone but heavy relative to phonetic keys; use for intent paraphrases ("hisab dekhao" ≈ "আজকের বিক্রি কত") only if keys fail. E5 is trained mostly on native-script text; its Banglish quality is not published, so test it on BanglaTLit/Dakshina romanized sets first (BanglaTLit evidence says generic encoders underperform on romanized Bangla).
- LLM-based normalization is the best-supported fallback for open-ended garbage (GPT-4 Turbo 0-shot BLEU 26.6 vs 36.2 for a fine-tuned BanglaT5 on BanglaTLit) but needs network or a larger on-device model; reserve for low-confidence queries, ask a confirm question before taking an action with money consequences.
- Edit-distance with uniform costs misses o/u/a and bh/v/b folds; with the folds as zero-cost substitutions it behaves like phonetic matching, so skeleton-then-distance is cheaper than a learned model.
- Bangla-script spell correctors (BSpell-class) fix Unicode-typing errors but do not address Banglish; the phonetic-rule baseline scored only 61.2% on BSpell's synthetic set, so do not over-trust rule-only phonetic Bangla correction for open vocabulary; keep it constrained to the shop's vocabulary.

### Gaps
- No published accuracy for Metaphone/Soundex variants on Banglish (Latin) or on shop vocabulary; nameGist claims were unverified; shobdohash/Bangla Soundex accuracy numbers not found.
- No published benchmark of multilingual-e5 / LaBSE / MiniLM / IndicBERT / BanglaBERT on romanized Bangla retrieval; LaBSE parameter size was not found (about 470M is general knowledge, unverified). mE5 model card could not be read directly, so sizes come from third-party pages.
- On-device int8/quantised sizes and latency on a Pixel: not researched.
- LLM-based Banglish normalization evidence is limited to BanglaTLit's zero-shot rows; no study on short transactional queries.
- IndicBERT-v2 and BanglaTLit-trained encoders were mentioned but not measured here.

---

## Q4. What datasets could be used to test an assistant's robustness?

### Takeaway
There is no ready-made "Banglish shop question" set, but several public datasets cover romanized-Bangla variation and code-mixing; the best practical test set is a self-built, shop-specific one seeded from Dakshina/BanglaTLit variants plus voice-typing samples.

### Cited Findings
- Google Dakshina: 12 South Asian languages incl. Bengali; per language a romanization lexicon (Bengali 25k train + 5k dev/test native words with attested romanizations, 3.8 per word) and 10,000 romanized Wikipedia sentences (12.1 native words per sentence) with native-script originals, annotated by native speakers. Wikipedia-based, so formal vocabulary. — [GitHub](https://www.github.com/google-research-datasets/dakshina); [paper](https://arxiv.org/pdf/2007.01176)
- Aksharantar (AI4Bharat): 26M transliteration pairs, 21 languages; test set of 103k word pairs across 19 languages; Bengali test set 5,009 pairs split Freq/Uni/NEF/NEI. — [paper](https://arxiv.org/pdf/2205.03018); [repo](https://github.com/AI4Bharat/IndicXlit)
- BanglaTLit: 42.7k human-annotated romanized-to-Bangla pairs (38.7k train / 1.5k val / 2.5k test) and 245.7k pretraining sentences, from social media/blog/YouTube style sources; code and data public. — [paper](https://aclanthology.org/2024.findings-emnlp.859.pdf); [repo](https://github.com/farhanishmam/BanglaTLit)
- BanglaDual (Mendeley): about 1.24M pairs, including 1,122,189 Banglish-to-Bangla transliteration pairs and 119,727 Banglish-to-English translation pairs. Licence and noise level unverified. — [Mendeley](https://data.mendeley.com/datasets/pxw2bb4wyt/1)
- Code-mixed Chaos (Mendeley, DOI 10.17632/23dp3t88vk.1): 10,234 Banglish social-media comments with a Bangla-transliterated version (toxicity labels). — [Mendeley](https://data.mendeley.com/datasets/23dp3t88vk)
- BnSentMix: 20,000 Bengali-English code-mixed samples (sentiment, 4 labels). — [arXiv 2408.08964](https://arxiv.org/html/2408.08964v3)
- BanglishRev: 1.74M Daraz reviews incl. about 660k Banglish; the most relevant e-commerce register. — [arXiv 2412.13161](https://arxiv.org/html/2412.13161)
- MixSarc: 9,087 human-annotated Bangla-English code-mixed sentences. — [arXiv 2602.21608](https://arxiv.org/html/2602.21608)
- Spelling-error resources: BSpell real-error set (6,300 sentences typed on QWERTY by ten people; availability not confirmed) and DPCSpell Bangla corpus; VAIYAKARANA (92,830 incorrect + 18,426 correct sentences; repo github.com/Bangla-iitk/Vaiyakarana). — [BSpell](https://arxiv.org/html/2208.09709v2); [DPCSpell](https://cs.paperswithcode.com/paper/dpcspell-a-transformer-based-detector); [VAIYAKARANA](https://arxiv.org/pdf/2406.14284)
- Bangla speech: OOD-Speech is a large Bengali ASR dataset for out-of-distribution benchmarking; Wav2Vec2 beat the Google speech API overall and everything degraded out of distribution. — [OOD-Speech, arXiv 2305.09688](https://arxiv.org/pdf/2305.09688)
- IndoTranslit: about 975k Bengali romanized sentence pairs (rule-based) and a 60M-parameter model; code at github.com/sk-research-community/multilingual-transliterator-llm-training. — [arXiv 2511.22769](https://arxiv.org/pdf/2511.22769)

### Inferences
- Build the robustness test set in three layers: (1) clean intents in Bangla; (2) automatic variants: apply the fold rules (Q3) and a QWERTY-adjacency typo model to each intent, plus Dakshina/BanglaTLit-attested spellings for each word; (3) human layer: have 5-10 real shopkeepers (different districts) dictate and type 50-100 questions, and record voice-typing output verbatim. Measure intent accuracy, slot (item, amount, date) accuracy, and rate of "asks to confirm".
- Dakshina and Aksharantar give word-level variant lists (formal vocabulary, so supplement with shop terms); BanglaTLit/BanglishRev/Code-mixed Chaos give real informal sentence-level noise but in social/review registers, not transactional ones.
- Licences were not checked for any dataset; csebuetnlp normalizer is non-commercial only.

### Gaps
- No public dataset of voice-typed Bangla business queries or of shop/ledger chat messages.
- No public dataset with numerals-in-words (দেড় হাজার, সাড়ে তিন) for Bangla ASR post-processing found.
- No dedicated Bengali SMS corpus (e.g. "Bengali SMS dataset") was found in this pass; Facebook-comment/ review datasets stand in.
- Per-dataset licence and exact Banglish proportion were not verified.
- Bengali-specific Google Input Tools / Gboard transliteration documentation (what conventions the transliteration layout uses) was not retrieved.
