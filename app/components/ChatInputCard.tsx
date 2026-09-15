import type { ReactNode } from "react";

/** La tarjeta que envuelve al input: borde suave y sombra, como en el Desktop. */
export function ChatInputCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md transition-[box-shadow,border-color] duration-150 focus-within:border-[var(--color-primary)]/40 focus-within:shadow-lg focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
      {children}
    </div>
  );
}
