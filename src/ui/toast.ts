import { useSyncExternalStore } from 'react';

export type Toast = { id: number; text: string; actionLabel?: string; onAction?: () => void };

/** A short message that fades by itself, with an optional button (Undo). One at a time: a new one replaces the old. */
let current: Toast | null = null;
let counter = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(t: Omit<Toast, 'id'>, ms = 5000): void {
  clearTimeout(timer);
  current = { ...t, id: ++counter };
  emit();
  timer = setTimeout(hideToast, t.onAction ? Math.max(ms, 6000) : ms);
}
export function hideToast(): void {
  clearTimeout(timer);
  current = null;
  emit();
}
export const useToast = (): Toast | null => useSyncExternalStore((l) => (listeners.add(l), () => void listeners.delete(l)), () => current);
