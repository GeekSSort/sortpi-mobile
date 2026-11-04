import { DocForm } from '@/orders/doc-form';

/** Take an order a customer will collect later. */
export default function NewOrderScreen() {
  return <DocForm mode="order" />;
}
