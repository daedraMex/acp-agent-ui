import { cn } from "~/lib/utils";

/**
 * Átomo · SidebarBadge
 * Píldora morada con bordes redondeados y texto blanco (ej. "4" en Messages).
 */
export function SidebarBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center justify-center rounded-sm bg-[var(--color-badge-bg)] px-2 text-xs font-medium text-[var(--color-badge-text)]",
        className
      )}
    >
      {children}
    </span>
  );
}
