import { useLocalSearchParams } from 'expo-router';

import { DocForm } from '@/orders/doc-form';

/** Take an order a customer will collect later, or change an open one (`?id=`). */
export default function NewOrderScreen() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: string }>();
  return <DocForm mode="order" id={id} kind={kind === 'REPAIR' || kind === 'TAILORING' ? kind : undefined} />;
}
