import { ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Átomo · ModelTriggerButton
 * Botón píldora (ej. [DeepSeek V3 ▾]) anclado a la caja de chat, con
 * estados hover/active. El aria-controls/expanded lo conecta al popover.
 */
export function ModelTriggerButton({
  label,
  open,
  onClick,
  controlsId,
  className = "",
}: {
  label: string;
  open: boolean;
  onClick: () => void;
  controlsId: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={controlsId}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-xs font-medium text-[var(--color-text-main)] transition-colors duration-150",
        "hover:bg-[var(--color-primary-subtle)] active:bg-[var(--color-primary-subtle)]",
        className
      )}
    >
      <span className="truncate">{label}</span>
      <ChevronDown
        size={14}
        className={cn(
          "shrink-0 text-[var(--color-text-muted)] transition-transform duration-150",
          open && "rotate-180"
        )}
      />
    </button>
  );
}
