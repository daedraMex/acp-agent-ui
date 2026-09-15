import { cn } from "~/lib/utils";
import type { ModelOption } from "~/types/models";
import { ModelBadge } from "../atoms/ModelBadge";
import { ModelCheckIcon } from "../atoms/ModelCheckIcon";

/**
 * Molécula · ModelOptionItem
 * Fila cliqueable del menú: check (o slot reservado) a la izquierda, título
 * semibold + badge opcional a la derecha, subtítulo atenuado debajo.
 * Hover suave con token del tema. role="option" para accesibilidad.
 */
export function ModelOptionItem({
  model,
  selected,
  onSelect,
  onKeyDown,
  innerRef,
}: {
  model: ModelOption;
  selected: boolean;
  onSelect: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  innerRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={innerRef}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cn(
        "flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-150",
        selected
          ? "bg-[var(--color-primary-subtle)]"
          : "hover:bg-[var(--color-surface-subtle)]"
      )}
    >
      <span className="mt-0.5">
        <ModelCheckIcon selected={selected} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-text-main)]">
            {model.name}
          </span>
          {model.badge && <ModelBadge>{model.badge}</ModelBadge>}
        </span>
        <span className="truncate text-xs text-[var(--color-text-muted)]">
          {model.description}
        </span>
      </span>
    </button>
  );
}
