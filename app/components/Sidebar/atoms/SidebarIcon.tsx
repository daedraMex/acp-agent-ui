import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Átomo · SidebarIcon
 * Envoltorio para iconos Lucide/SVG. Activo → color primario; inactivo → gris
 * icono (#64748B vía token --color-icon).
 */
export function SidebarIcon({
  icon: Icon,
  active = false,
  size = 16,
  className = "",
}: {
  icon: LucideIcon;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Icon
      size={size}
      className={cn(
        "shrink-0",
        active ? "text-[var(--color-primary-text)]" : "text-[var(--color-text-muted)]",
        className
      )}
    />
  );
}
