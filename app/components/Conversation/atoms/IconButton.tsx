import { cn } from "~/lib/utils";

/**
 * Átomo · IconButton
 * Botón de acción discreto (copiar, regenerar, feedback): texto atenuado que
 * se ilumina al hover con fondo suave. `active` lo pinta en primario.
 */
export function IconButton({
  label,
  onClick,
  active = false,
  disabled = false,
  className = "",
  children,
}: {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]",
        active && "text-[var(--color-primary)]",
        disabled && "pointer-events-none opacity-40",
        className
      )}
    >
      {children}
    </button>
  );
}
