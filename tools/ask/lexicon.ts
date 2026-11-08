// Words and sentence shapes the generator draws from. Written from docs/research (model knowledge, not real shop speech): extend it from the question log.
import type { Period, ToolId } from '../../src/ask/plan.ts';

export type Shop = { trade: string; business: string; features: string[]; categories: string[]; brands: string[]; units: string[]; items: Item[]; allowed: ToolId[] };
export type Item = { en: string; says: string[] };

const CORE: ToolId[] = ['sales_total', 'sales_by_day', 'top_products', 'item_sales', 'sales_by_category', 'sales_by_payment', 'sales_by_cashier', 'sales_by_branch', 'profit', 'bills', 'customer_dues', 'supplier_dues', 'customer_balance', 'stock_summary', 'stock_low', 'stock_out', 'stock_of', 'price_of', 'start_selling'];

export const SHOPS: Shop[] = [
  { trade: 'grocery', business: 'Grocery & supermarket', features: ['expiry', 'mrp', 'multi_unit', 'delivery'], categories: ['Rice', 'Oil', 'Snacks', 'Beverages'], brands: ['Teer', 'Pran', 'Radhuni'], units: ['kg', 'litre', 'pcs'], allowed: [...CORE, 'expiring_soon', 'expired_stock'],
    items: [{ en: 'water', says: ['pani', 'jol', 'পানি', 'water', 'mineral water'] }, { en: 'sugar', says: ['chini', 'চিনি', 'sugar'] }, { en: 'rice', says: ['chal', 'চাল', 'rice'] }, { en: 'oil', says: ['tel', 'তেল', 'soyabin tel', 'oil'] }, { en: 'egg', says: ['dim', 'ডিম', 'egg'] }, { en: 'milk', says: ['dudh', 'দুধ', 'milk'] }, { en: 'salt', says: ['lobon', 'nun', 'লবণ', 'salt'] }, { en: 'flour', says: ['ata', 'atta', 'আটা', 'moyda'] }, { en: 'lentil', says: ['dal', 'ডাল', 'masur dal'] }, { en: 'tea', says: ['cha', 'চা', 'tea'] }, { en: 'coca cola', says: ['coca cola', 'cocacola', 'coke', 'কোকাকোলা'] }, { en: 'sprite', says: ['sprite', 'স্প্রাইট'] }] },
  { trade: 'pharmacy', business: 'Pharmacy', features: ['expiry', 'generic', 'mrp', 'refill', 'multi_unit', 'prescription'], categories: ['Tablet', 'Syrup', 'Capsule', 'Injection'], brands: ['Square', 'Beximco', 'Incepta'], units: ['strip', 'box', 'bottle'], allowed: [...CORE, 'expiring_soon', 'expired_stock'],
    items: [{ en: 'napa', says: ['napa', 'নাপা', 'napa extra'] }, { en: 'saline', says: ['saline', 'স্যালাইন', 'selain'] }, { en: 'paracetamol', says: ['paracetamol', 'প্যারাসিটামল'] }, { en: 'seclo', says: ['seclo', 'সেক্লো'] }, { en: 'ors', says: ['ors', 'orsaline', 'খাবার স্যালাইন'] }, { en: 'dettol', says: ['dettol', 'ডেটল'] }, { en: 'vitamin c', says: ['vitamin c', 'ভিটামিন সি'] }] },
  { trade: 'fabric', business: 'Fabric & textiles', features: ['modal', 'expiry', 'multi_unit', 'tailoring'], categories: ['Saree', 'Lungi', 'Three piece', 'Fabric'], brands: ['Aarong', 'Tangail'], units: ['gaj', 'pis', 'than'], allowed: [...CORE, 'expiring_soon', 'expired_stock', 'orders_due'],
    items: [{ en: 'saree', says: ['saree', 'shari', 'শাড়ি', 'sari'] }, { en: 'lungi', says: ['lungi', 'লুঙ্গি'] }, { en: 'jamdani', says: ['jamdani', 'জামদানি'] }, { en: 'three piece', says: ['three piece', 'থ্রিপিস', '3 pis'] }, { en: 'orna', says: ['orna', 'ওড়না'] }, { en: 'cotton', says: ['suti', 'সুতি', 'cotton'] }] },
  { trade: 'jewellery', business: 'Jewellery & watches', features: ['metal_rate', 'serial', 'repair', 'instalment'], categories: ['Gold', 'Silver', 'Watch', 'Diamond'], brands: ['Casio', 'Titan'], units: ['vori', 'gram', 'pcs'], allowed: [...CORE, 'metal_rates', 'orders_due'],
    items: [{ en: 'ring', says: ['angti', 'আংটি', 'ring'] }, { en: 'necklace', says: ['har', 'হার', 'necklace'] }, { en: 'bangle', says: ['churi', 'চুড়ি', 'bala'] }, { en: 'watch', says: ['ghori', 'watch', 'casio'] }, { en: 'chain', says: ['chain', 'চেইন'] }] },
  { trade: 'electronics', business: 'Electronics & mobile', features: ['serial', 'repair', 'instalment', 'commission'], categories: ['Mobile', 'Accessories', 'Appliances'], brands: ['Samsung', 'Walton', 'Xiaomi'], units: ['pcs', 'set'], allowed: [...CORE, 'orders_due'],
    items: [{ en: 'charger', says: ['charger', 'chargar', 'চার্জার'] }, { en: 'earphone', says: ['earphone', 'hendfree', 'ইয়ারফোন'] }, { en: 'power bank', says: ['power bank', 'পাওয়ার ব্যাংক'] }, { en: 'phone cover', says: ['cover', 'কভার', 'phone cover'] }, { en: 'glass guard', says: ['glass guard', 'গ্লাস গার্ড'] }] },
  { trade: 'hardware', business: 'Hardware & paint', features: ['multi_unit', 'delivery', 'mrp'], categories: ['Cement', 'Rod', 'Paint', 'Tiles'], brands: ['BSRM', 'Berger', 'Akij'], units: ['bag', 'kg', 'feet', 'litre'], allowed: CORE,
    items: [{ en: 'cement', says: ['cement', 'simint', 'সিমেন্ট'] }, { en: 'rod', says: ['rod', 'shariya', 'রড'] }, { en: 'paint', says: ['paint', 'rong', 'রং'] }, { en: 'wire', says: ['wire', 'tar', 'তার'] }, { en: 'tiles', says: ['tiles', 'টাইলস'] }] },
];

export const NAMES: { en: string; says: string[] }[] = [
  { en: 'karim', says: ['karim', 'kareem', 'করিম'] }, { en: 'rahim', says: ['rahim', 'raheem', 'রহিম'] }, { en: 'salma', says: ['salma', 'সালমা'] }, { en: 'rahima', says: ['rahima', 'রহিমা'] },
  { en: 'hasan', says: ['hasan', 'hasan', 'হাসান'] }, { en: 'jahid', says: ['jahid', 'zahid', 'জাহিদ'] }, { en: 'nusrat', says: ['nusrat', 'নুসরাত'] }, { en: 'sumon', says: ['sumon', 'shumon', 'সুমন'] },
];

export const PERIODS: Record<Period, string[]> = {
  today: ['ajker', 'aj', 'ajke', 'আজকের', 'আজ', 'today', 'aajker'],
  yesterday: ['gotokal', 'gotokaler', 'গতকাল', 'গতকালের', 'yesterday'],
  week: ['ei soptahe', 'ei soptaher', 'goto 7 diner', 'এই সপ্তাহে', 'this week', 'ei saptahe'],
  month: ['ei mashe', 'ei masher', 'goto mashe', 'এই মাসে', 'this month', 'ei month e'],
};

/** Sentence shapes. {P} period word (optional), {I} item, {N} person; they are filled with a spelling chosen at random. */
export type Shape = { id: string; tool: ToolId; period?: boolean; text: string[] };
export const SHAPES: Shape[] = [
  { id: 'sales', tool: 'sales_total', period: true, text: ['{P} koto bikri', '{P} bill koto', '{P} sale koto holo', '{P} bikri koto hoyeche', '{P} koto taka bikri', '{P} er hisab dekhao', '{P} total bikri', 'bikri dekhao {P}', '{P} kemon bikri', '{P} sales koto'] },
  { id: 'byday', tool: 'sales_by_day', period: true, text: ['{P} din onujayi bikri', '{P} daily bikri chart', '{P} bikri graph dekhao'] },
  { id: 'top', tool: 'top_products', period: true, text: ['kon mal beshi bikri hoy {P}', 'sobcheye beshi bikri kon mal', '{P} best seller dekhao', 'top mal koto {P}', 'ki ki beshi bikri hocche'] },
  { id: 'itemsales', tool: 'item_sales', period: true, text: ['{P} {I} koto bikri hoyeche', '{I} koto bikri holo {P}', '{P} {I} er bikri dekhao', '{I} er sale koto {P}'] },
  { id: 'bycat', tool: 'sales_by_category', period: true, text: ['{P} kon category beshi bikri', 'category onujayi bikri {P}', '{P} category wise sale dekhao'] },
  { id: 'bypay', tool: 'sales_by_payment', period: true, text: ['{P} cash koto ashche', '{P} bkash e koto ashlo', '{P} nagad koto', '{P} payment onujayi dekhao', '{P} koto taka cash holo'] },
  { id: 'bycashier', tool: 'sales_by_cashier', period: true, text: ['{P} kon cashier koto bikri korse', 'cashier onujayi bikri {P}', '{P} staff er bikri dekhao'] },
  { id: 'bybranch', tool: 'sales_by_branch', period: true, text: ['{P} branch onujayi bikri', 'kon branch e beshi bikri {P}', 'shakha onujayi sale dekhao'] },
  { id: 'profit', tool: 'profit', period: true, text: ['{P} labh koto', '{P} koto labh holo', '{P} profit koto', 'labh dekhao {P}', '{P} munafa koto'] },
  { id: 'bills', tool: 'bills', period: true, text: ['{P} er bill gulo dekhao', '{P} bill list', '{P} er sob bill dekhao', 'bill dekhao {P}'] },
  { id: 'custdues', tool: 'customer_dues', text: ['customer der baki koto', 'baki koto', 'baki dekhao', 'kar kache koto baki', 'amar baki dekhao', 'customer er dhar koto', 'kar kache koto taka pabo', 'baki list dao'] },
  { id: 'suppdues', tool: 'supplier_dues', text: ['supplier ke koto dite hobe', 'supplier baki koto', 'mahajon ke koto dibo', 'amar supplier er pawna koto'] },
  { id: 'custbal', tool: 'customer_balance', text: ['{N} er baki koto', '{N} er hisab dekhao', '{N} ke koto baki', '{N} er kache koto pabo', '{N} er dhar koto'] },
  { id: 'stocksum', tool: 'stock_summary', text: ['stock dekhao', 'mot stock koto', 'stock', 'amar stock dekhao', 'stock er hisab dekhao', 'sob mal koto ase', 'stock value koto', 'stock dekhan', 'ektu stock ta dekhaben'] },
  { id: 'low', tool: 'stock_low', text: ['kon mal kom ase', 'stock kom ki ase', 'kom mal dekhao', 'ki ki kinbo', 'kon mal kinte hobe', 'ki mal ana lagbe', 'kon kon product kom'] },
  { id: 'out', tool: 'stock_out', text: ['kon mal sesh', 'kon kon mal sesh hoye gese', 'sesh hoye jawa mal dekhao', 'ki ki sesh'] },
  { id: 'stockof', tool: 'stock_of', text: ['{I} koyta ase', '{I} koto ase', '{I} stock koto', '{I} stock dekhao', '{I} ache ki', '{I} koy {U} ase', '{I} er stock bolo'] },
  { id: 'priceof', tool: 'price_of', text: ['{I} er dam koto', '{I} dam koto', '{I} er price', '{I} er dam bolo', '{I} koto taka'] },
  { id: 'sell', tool: 'start_selling', text: ['bikri korbo', 'notun bill korbo', 'sale suru korbo', 'bill korbo'] },
  { id: 'expsoon', tool: 'expiring_soon', text: ['kon mal er meyad sesh hobe', 'meyad sesh hoye jabe emon mal', 'expiry hobe ki ki', 'near expiry mal dekhao'] },
  { id: 'expired', tool: 'expired_stock', text: ['meyad sesh hoye geche', 'expired mal koto', 'meyad pera mal dekhao'] },
  { id: 'rates', tool: 'metal_rates', text: ['sonar dam koto', 'ajker gold rate', 'rupar dam koto', 'gold rate dekhao', 'sonar rate koto ajke'] },
  { id: 'orders', tool: 'orders_due', text: ['kon order dite hobe', 'order koyta baki', 'ei soptahe kon order dite hobe', 'pending order dekhao', 'order delivery baki koyta'] },
];

/** Things that must NOT become a lookup: advice, forecasts, actions that change records, chat and noise. */
export const REFUSE: string[] = [
  'dam barabo ki', 'dam komabo ki', 'koto discount dibo', '{N} ke baki dibo ki', 'notun dokan khulbo ki', 'koto salary dibo', 'ei mal ta rakhbo ki', 'ki korle labh beshi hobe', 'kal koto bikri hobe', 'eid e koto bikri hobe', 'bhalo bikri hobe ki',
  '{N} ke 500 taka dilam', '{N} er kach theke 2000 niyechi', 'baki likho', 'bill kete dao', 'dam bodlao', 'dam komao', 'notun mal jog koro', 'ei bill ta cancel koro', 'mal eshechhe 20 ta', 'baki khata e tolo', 'stock ta update koro',
  'weather kemon', 'ki koro', 'hello', 'ajker tarikh koto', 'tumi ke', 'gaan chalao', 'tumi ki korte paro', 'asdfgh', 'ok', 'thik ache', 'dhonnobad', 'assalamu alaikum',
];
