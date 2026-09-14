import type { LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { SidebarBadge } from "../atoms/SidebarBadge";
import { SidebarChevron } from "../atoms/SidebarChevron";
import { SidebarIcon } from "../atoms/SidebarIcon";

/**
 * Molécula · SidebarItem
 * Fila interactiva: icono + texto + (badge | chevron) opcionales.
 * Estados: inactivo (gris slate), hover (título más oscuro), activo
 * (icono primario y fondo suave — el fondo lo aporta SidebarGroup).
 */
export function SidebarItem({
  label,
  icon,
  active = false,
  badge,
  chevronOpen,
  onClick,
  className = "",
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: string;
  /** Si está definido, muestra el chevron (arriba/abajo según el booleano). */
  chevronOpen?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex grow items-center gap-4">
        <SidebarIcon icon={icon} active={active} />
        <span
          className={cn(
            "truncate text-sm font-medium transition-colors duration-150",
            "text-[var(--color-text-main)]"
          )}
        >
          {label}
        </span>
      </div>
      {badge ? (
        <div className="flex shrink-0 ml-2">
          <SidebarBadge>{badge}</SidebarBadge>
        </div>
      ) : chevronOpen !== undefined ? (
        <div className="flex shrink-0 ml-2">
          <SidebarChevron open={chevronOpen} />
        </div>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between rounded-lg py-2 pl-4 pr-3 text-left transition-colors duration-150",
          active ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-primary-subtle)]",
          className
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href="#0"
      className={cn(
        "flex w-full items-center justify-between rounded-lg py-2 pl-4 pr-3 transition-colors duration-150",
        active ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-primary-subtle)]",
        className
      )}
    >
      {content}
    </a>
  );
}
