import { cn } from "~/lib/utils";

/**
 * Molécula · SidebarSubItem
 * Enlace indentado de un submenú ("Main", "Analytics", "Fintech").
 * Seleccionado → primario + semibold; inactivo → gris slate suave con hover.
 */
export function SidebarSubItem({
  label,
  active = false,
  className = "",
}: {
  label: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <a
      href="#0"
      className={cn(
        "block truncate text-sm transition-colors duration-150",
        active
          ? "font-semibold text-[var(--color-primary-text)]"
          : "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
        className
      )}
    >
      {label}
    </a>
  );
}
