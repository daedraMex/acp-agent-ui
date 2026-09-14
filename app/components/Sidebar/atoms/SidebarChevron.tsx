import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Átomo · SidebarChevron
 * Indicador expandible: flecha abajo (cerrado) que rota a arriba (abierto),
 * sutil en gris icono.
 */
export function SidebarChevron({ open = false, className = "" }: { open?: boolean; className?: string }) {
  return (
    <ChevronDown
      size={12}
      className={cn(
        "shrink-0 text-[var(--color-text-muted)] transition-transform duration-150",
        open && "rotate-180",
        className
      )}
    />
  );
}
