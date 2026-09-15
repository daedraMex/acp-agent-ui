import { cn } from "~/lib/utils";

/**
 * Átomo · ModelBadge
 * Píldora sutil (rounded-full) para tags como "Nuevo" / "Beta".
 * Fondo primary-subtle y texto primary-text, siempre vía tokens del tema.
 */
export function ModelBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-[var(--color-primary-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary-text)]",
        className
      )}
    >
      {children}
    </span>
  );
}
