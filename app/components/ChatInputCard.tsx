import type { ReactNode } from "react";

/** La tarjeta que envuelve al input: borde suave y sombra, como en el Desktop. */
export function ChatInputCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
      {children}
    </div>
  );
}
