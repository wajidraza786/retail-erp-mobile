/**
 * Write notifications. Every service calls `notifyDataChanged()` after a committed
 * write; the query layer subscribes and refreshes lists and reports.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onDataChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyDataChanged() {
  listeners.forEach((fn) => fn());
}
