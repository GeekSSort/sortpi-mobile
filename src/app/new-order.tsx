import { useLocalSearchParams } from 'expo-router';

import { DocForm } from '@/orders/doc-form';

/** Take an order a customer will collect later, or change an open one (`?id=`). */
export default function NewOrderScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <DocForm mode="order" id={id} />;
}
