import { useLocalSearchParams } from 'expo-router';

import { DocForm } from '@/orders/doc-form';

/** Write down a price for a customer before they buy, or change an open one (`?id=`). */
export default function NewQuotationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <DocForm mode="quote" id={id} />;
}
