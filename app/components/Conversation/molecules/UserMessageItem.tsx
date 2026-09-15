import { useEffect, useState } from "react";
import type { Turn } from "~/hooks/useAcpStream";

/**
 * Molécula · UserMessageItem
 * Burbuja derecha: tarjeta elevada del tema (surface + borde + shadow-xs),
 * esquina superior derecha recortada, y timestamp sutil debajo.
 */
export function UserMessageItem({ turn }: { turn: Turn }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col items-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-main)] shadow-xs">
        {turn.text}
      </div>
      {turn.at && mounted && (
        <span className="mt-1 pr-1 text-[10px] text-[var(--color-text-caption)]">
          {new Date(turn.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
