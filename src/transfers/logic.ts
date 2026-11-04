import { ApiError } from '../api/client.ts';
import { compareMoney, subMoney } from '../lib/money.ts';

export type TransferStatus = 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';
export type TransferItem = { id: string; variant: string; sku: string; product_name: string; variant_name: string; quantity: string; received_quantity: string; unit_short_name: string; unit_allow_decimal: boolean };
export type Transfer = {
  id: string;
  reference_no: string;
  from_warehouse: string;
  to_warehouse: string;
  status: TransferStatus;
  from_warehouse_name: string;
  from_branch_name: string;
  to_warehouse_name: string;
  to_branch_name: string;
  dispatched_at: string | null;
  received_at: string | null;
  created_by_name: string | null;
  received_by_name: string | null;
  note: string;
  items: TransferItem[];
  created_at: string;
  total_value?: string;
};

/** Colour and words per status: grey draft, orange on the road, green arrived, red cancelled. */
export const STATUS: Record<TransferStatus, { words: string; tone: 'plain' | 'warn' | 'good' | 'bad'; icon: 'Pencil' | 'ArrowUpRight' | 'CheckCircle' | 'Cancel' }> = {
  DRAFT: { words: 'Not sent yet', tone: 'plain', icon: 'Pencil' },
  DISPATCHED: { words: 'On the way', tone: 'warn', icon: 'ArrowUpRight' },
  RECEIVED: { words: 'Arrived', tone: 'good', icon: 'CheckCircle' },
  CANCELLED: { words: 'Cancelled', tone: 'bad', icon: 'Cancel' },
};

export const CHIPS: { id: string; label: string; status?: TransferStatus }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'way', label: 'On the way', status: 'DISPATCHED' },
  { id: 'draft', label: 'Not sent yet', status: 'DRAFT' },
  { id: 'done', label: 'Arrived', status: 'RECEIVED' },
];

/** Units sent, arrived and still on the road (text math, never JS numbers). */
export const sentOf = (t: Pick<Transfer, 'items'>) => t.items.reduce((s, i) => s + Number(i.quantity), 0);
export const outstanding = (i: Pick<TransferItem, 'quantity' | 'received_quantity'>) => subMoney(i.quantity, i.received_quantity);
export const stillOnTheRoad = (t: Pick<Transfer, 'items'>) => t.items.some((i) => compareMoney(outstanding(i), '0') > 0);
export const anythingReceived = (t: Pick<Transfer, 'items'>) => t.items.some((i) => compareMoney(i.received_quantity, '0') > 0);

export type Move = 'dispatch' | 'receive' | 'undo';

/**
 * What may be done to a transfer next. Sending and undoing need `inventory.transfer`, receiving needs `inventory.receive_transfer`.
 * Which branch may do what is the server's rule (only the source sends, only the destination receives): it refuses the wrong one.
 */
export function nextMoves(t: Pick<Transfer, 'status' | 'items'>, perms: string[] | undefined): Move[] {
  const has = (p: string) => !!perms?.includes(p);
  const out: Move[] = [];
  if (t.status === 'DRAFT' && has('inventory.transfer') && t.items.length > 0) out.push('dispatch');
  if (t.status === 'DISPATCHED' && has('inventory.receive_transfer') && stillOnTheRoad(t)) out.push('receive');
  if (t.status === 'DISPATCHED' && has('inventory.transfer') && !anythingReceived(t)) out.push('undo');
  return out;
}

/** After a lost connection: did the move go through? The status after it is the answer. */
export const doneStatus: Record<Move, TransferStatus> = { dispatch: 'DISPATCHED', receive: 'RECEIVED', undo: 'DRAFT' };
export const alreadyDone = (move: Move, status: TransferStatus) => doneStatus[move] === status;

/** The sentence asked before each move. English keys with `{from}` and `{to}`. */
export const ASK: Record<Move, { title: string; body: string; button: string; danger: boolean; done: string }> = {
  dispatch: { title: 'Send this transfer?', body: 'The goods leave {from} now and wait on the road until {to} receives them.', button: 'Send it', danger: false, done: 'Sent' },
  receive: { title: 'Did everything arrive?', body: 'Everything still on the way will be added to the stock of {to}. This cannot be undone: sending it back is a new transfer.', button: 'Yes, it all arrived', danger: false, done: 'Received' },
  undo: { title: 'Take it back?', body: 'The goods go back on the shelf at {from} and this becomes not sent again. Nothing is deleted from the stock history.', button: 'Yes, take it back', danger: true, done: 'Put back' },
};

/** Words for the ways a transfer move can be refused (codes from the server's registry). English keys, translated on screen. */
export function describeTransferError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (e.code) {
    case 'TRANSFER_NOT_DRAFT':
      return 'This transfer was already sent.';
    case 'TRANSFER_NOT_DISPATCHED':
      return 'This transfer is not on the way.';
    case 'TRANSFER_PARTLY_RECEIVED':
      return 'Some of it has already arrived, so it cannot be taken back.';
    case 'TRANSFER_RECEIVED_NOTHING':
    case 'RECEIVED_EXCEEDS_DISPATCHED':
      return 'Nothing is waiting to be received.';
    case 'TRANSFER_HAS_NO_LINES':
      return 'This transfer has no items.';
    case 'INSUFFICIENT_STOCK':
      return 'There is not enough stock for this.';
    case 'NO_TRANSIT_WAREHOUSE':
      return 'This branch has no transit shelf. Ask the owner.';
    case 'PERMISSION_DENIED':
      return 'You do not have permission to do that.';
    case 'NOT_FOUND':
      return 'That transfer was not found, or it belongs to another branch.';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return 'No connection. Pull down to see whether it went through before trying again.';
    default:
      return e.message || 'Could not do this.';
  }
}
