/**
 * Organismo · ModelSelectorPopover
 * Menú flotante anclado al trigger: modelos del proveedor activo, separador
 * para la sección de razonamiento, y un pie para cambiar de proveedor.
 * Cierre por click exterior, Escape, y navegación con flechas + Enter.
 */
import { useEffect, useId, useRef, useState } from "react";
import type { LLMProviderId } from "~/types/models";
import { useModelSelector } from "~/context/ModelContext";
import { ModelCheckIcon } from "../atoms/ModelCheckIcon";
import { ModelTriggerButton } from "../atoms/ModelTriggerButton";
import { ModelOptionItem } from "../molecules/ModelOptionItem";

export function ModelSelectorPopover() {
  const { activeModel, activeProvider, providers, setModel, setProvider } =
    useModelSelector();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const models = activeProvider.models;
  const regular = models.filter((m) => !m.isThinkingModel);
  const thinking = models.filter((m) => m.isThinkingModel);

  const close = () => setOpen(false);
  const toggle = () => {
    setActiveIndex(0);
    setOpen((v) => !v);
  };

  // Click exterior y Escape.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mueve el foco con las flechas; Enter selecciona.
  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, models.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
  };

  const select = (modelId: string) => {
    setModel(modelId);
    close();
  };

  const renderModel = (model: (typeof models)[number], index: number) => (
    <ModelOptionItem
      key={model.id}
      model={model}
      selected={model.id === activeModel.id}
      onSelect={() => select(model.id)}
      onKeyDown={onListKeyDown}
      innerRef={(el) => {
        optionRefs.current[index] = el;
      }}
    />
  );

  return (
    <div ref={containerRef} className="relative flex items-center">
      <ModelTriggerButton
        label={activeModel.name}
        open={open}
        onClick={toggle}
        controlsId={popoverId}
      />

      {open && (
        <div
          id={popoverId}
          role="listbox"
          aria-label="Selector de modelo"
          className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg"
        >
          {regular.map((m) => renderModel(m, models.indexOf(m)))}

          {thinking.length > 0 && (
            <>
              <div className="my-1 border-t border-[var(--color-border)]" />
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-caption)]">
                Razonamiento ampliado
              </p>
              {thinking.map((m) => renderModel(m, models.indexOf(m)))}
            </>
          )}

          {/* Pie: cambiar de proveedor */}
          <div className="my-1 border-t border-[var(--color-border)]" />
          <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-caption)]">
            Proveedor
          </p>
          {providers.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setProvider(p.id as LLMProviderId);
                close();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
            >
              <ModelCheckIcon selected={p.id === activeProvider.id} />
              {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
