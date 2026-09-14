import { cn } from "~/lib/utils";

/**
 * Molécula · SidebarSectionTitle
 * Label de sección en mayúsculas ("PAGES"): gris atenuado #94A3B8
 * (token --color-text-caption), semibold, tracking amplio.
 */
export function SidebarSectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "pl-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-caption)]",
        className
      )}
    >
      {children}
    </h3>
  );
}
