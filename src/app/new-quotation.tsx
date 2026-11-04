import { DocForm } from '@/orders/doc-form';

/** Write down a price for a customer before they buy. */
export default function NewQuotationScreen() {
  return <DocForm mode="quote" />;
}
