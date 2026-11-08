// The words an invoice prints in each of its languages, ported from the web app (saas/client/src/lib/receiptI18n.ts) so the A4 sheet
// glosses a heading the same way: the shop's main language first, the second in brackets.

export type ReceiptLanguage = 'en' | 'bn' | 'ar';
const LANGUAGES: readonly ReceiptLanguage[] = ['en', 'bn', 'ar'];

export const isRtl = (lang: ReceiptLanguage | null | undefined): boolean => lang === 'ar';

/** A saved language code, or `fallback` when it is not one of the three. */
export function asReceiptLanguage<T extends ReceiptLanguage | ''>(raw: unknown, fallback: T): ReceiptLanguage | T {
  const code = String(raw ?? '').trim().toLowerCase();
  return (LANGUAGES as readonly string[]).includes(code) ? (code as ReceiptLanguage) : fallback;
}

type Entry = Record<ReceiptLanguage, string>;

export const RECEIPT_LABELS = {
  date: { en: 'Date', bn: 'তারিখ', ar: 'تاريخ' },
  invoiceNo: { en: 'Invoice No', bn: 'চালান নং', ar: 'رقم الفاتورة' },
  payMode: { en: 'Pay mode', bn: 'পরিশোধের ধরন', ar: 'نوع الدفع' },
  supplierName: { en: 'Supplier Name', bn: 'সরবরাহকারীর নাম', ar: 'اسم المورد' },
  supplierInvoiceNo: { en: 'Supplier Inv.No', bn: 'সরবরাহকারীর চালান নং', ar: 'رقم فاتورة المورد' },
  phone: { en: 'Phone', bn: 'ফোন', ar: 'هاتف' },
  serialNo: { en: 'S.N', bn: 'ক্র. নং', ar: 'م' },
  itemCode: { en: 'Item code', bn: 'পণ্য কোড', ar: 'كود الصنف' },
  description: { en: 'Description', bn: 'বিবরণ', ar: 'البيان' },
  unit: { en: 'Unit', bn: 'একক', ar: 'الوحدة' },
  quantity: { en: 'Qty', bn: 'পরিমাণ', ar: 'الكمية' },
  price: { en: 'Price', bn: 'দর', ar: 'السعر' },
  lineTotal: { en: 'Item Subtotal', bn: 'পণ্যের মোট', ar: 'المجموع الفرعي للعنصر' },
  customerName: { en: 'Customer', bn: 'ক্রেতা', ar: 'العميل' },
  noItems: { en: 'No items', bn: 'কোনো পণ্য নেই', ar: 'لا توجد أصناف' },
  subtotal: { en: 'Subtotal', bn: 'উপমোট', ar: 'المجموع الفرعي' },
  discount: { en: 'Discount', bn: 'ছাড়', ar: 'الخصم' },
  vat: { en: 'VAT', bn: 'ভ্যাট', ar: 'الضريبة' },
  shipping: { en: 'Shipping', bn: 'পরিবহন খরচ', ar: 'الشحن' },
  grandTotal: { en: 'Grand Total', bn: 'সর্বমোট', ar: 'الإجمالي' },
  paid: { en: 'Paid', bn: 'পরিশোধিত', ar: 'المدفوع' },
  due: { en: 'Due', bn: 'বকেয়া', ar: 'المتبقي' },
  netPayable: { en: 'Net Payable', bn: 'প্রদেয়', ar: 'صافي المستحق' },
  paidBy: { en: 'Paid by', bn: 'পরিশোধের মাধ্যম', ar: 'طريقة الدفع' },
  status: { en: 'Status', bn: 'অবস্থা', ar: 'الحالة' },
  rounding: { en: 'Rounding', bn: 'রাউন্ডিং', ar: 'التقريب' },
  returnedValue: { en: 'Returned value', bn: 'ফেরতের মূল্য', ar: 'قيمة المرتجع' },
  refunded: { en: 'Refunded', bn: 'ফেরতকৃত', ar: 'المسترد' },
  appliedToDue: { en: 'Applied to due', bn: 'বকেয়ায় সমন্বয়', ar: 'خصم من المستحق' },
  totalReceived: { en: 'Total Received', bn: 'মোট আদায়', ar: 'إجمالي المقبوض' },
  totalPaid: { en: 'Total Paid', bn: 'মোট পরিশোধ', ar: 'إجمالي المصروف' },
} satisfies Record<string, Entry>;

export type ReceiptLabelKey = keyof typeof RECEIPT_LABELS;

export const receiptLabel = (key: ReceiptLabelKey, lang: ReceiptLanguage): string => RECEIPT_LABELS[key][lang];
