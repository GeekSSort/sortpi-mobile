import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { resolvedSettings } from '@/settings/api';
import { readShop } from '@/settings/logic';

import { checkCoupon, customerPoints } from './api';
import { couponText, finalTotal, pointsDiscount, readLoyalty, redeemablePoints } from './discounts';

/**
 * Coupon, customer points and whole-taka rounding for the sale being paid. `payable` is the server's own total for the cart.
 * Everything here is derived: the coupon is asked of the server (`/coupons/check/`), the balance is read from the customer, and
 * the points switch belongs to one customer, so changing the customer switches it off without any effect running.
 */
export function useDiscounts(o: { payable?: string; customerId?: string; active: boolean; canSettings: boolean; canCustomer: boolean }) {
  const settings = useQuery({ queryKey: ['settings', 'resolved'], queryFn: resolvedSettings, enabled: o.active && o.canSettings, staleTime: 60_000 });
  const loyalty = readLoyalty(settings.data);
  const rounds = settings.data ? readShop(settings.data).roundWhole : false;

  const [code, setCode] = useState('');
  const couponQ = useQuery({ queryKey: ['coupon', code, o.payable], queryFn: () => checkCoupon(code, o.payable!), enabled: o.active && !!code && !!o.payable, retry: false, staleTime: 0 });
  const coupon = couponQ.data ?? null;
  const afterCoupon = o.payable ? finalTotal({ total: o.payable, coupon: coupon?.discount, rounds: false }).afterCoupon : '0.00';

  const balanceQ = useQuery({ queryKey: ['customer-points', o.customerId], queryFn: () => customerPoints(o.customerId!), enabled: o.active && !!o.customerId && o.canCustomer && !!loyalty?.enabled, staleTime: 0 });
  const balance = balanceQ.data ?? 0;
  const usable = loyalty?.enabled && o.customerId ? redeemablePoints(loyalty, balance, afterCoupon) : 0;
  const [pointsFor, setPointsFor] = useState<string | null>(null);
  const pointsOn = !!o.customerId && pointsFor === o.customerId && usable > 0;
  const points = pointsOn ? usable : 0;
  const worth = loyalty && points ? pointsDiscount(loyalty, points, afterCoupon) : '0.00';
  const usableWorth = loyalty && usable ? pointsDiscount(loyalty, usable, afterCoupon) : '0.00';

  const totals = o.payable ? finalTotal({ total: o.payable, coupon: coupon?.discount, points: worth, rounds }) : null;
  /** Changes whenever anything that moves the total changes, so a total the server named for one state is not used for another. */
  const sig = `${coupon?.code ?? ''}|${points}|${o.payable ?? ''}|${rounds}`;

  return {
    loyalty,
    balance,
    usable,
    usableWorth,
    pointsOn,
    setPoints: (on: boolean) => setPointsFor(on ? (o.customerId ?? null) : null),
    coupon,
    couponCode: coupon?.code,
    appliedCode: code,
    couponError: couponQ.isError ? couponQ.error : null,
    couponBusy: couponQ.isFetching && !!code,
    applyCoupon: (text: string) => setCode(couponText(text)),
    removeCoupon: () => setCode(''),
    points,
    pointsWorth: worth,
    totals,
    sig,
    reset: () => {
      setCode('');
      setPointsFor(null);
    },
  };
}
export type Discounts = ReturnType<typeof useDiscounts>;
