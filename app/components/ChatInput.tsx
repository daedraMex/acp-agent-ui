/**
 * Input del chat: textarea que crece, Enter envía y Shift+Enter hace salto de
 * línea. Mientras el agente responde, el botón de enviar se vuelve el de parar.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Folder, Square } from "lucide-react";
import { cn } from "~/lib/utils";
import { ModelSelectorPopover } from "~/components/ModelSelector";

const MAX_HEIGHT = 240;

export function ChatInput({
  onSubmit,
  onStop,
  busy = false,
  autoFocus = true,
  placeholder = "Pídele algo al agente…",
  workingDir,
}: {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  workingDir?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // rAF es más confiable que autoFocus cuando el render cruza una frontera async.
  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  // Crece con el contenido. Vacío se queda en su altura de una línea: dejarlo
  // en `auto` dentro del flex lo estira a lo alto de la tarjeta.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!value) {
      el.style.height = "";
      return;
    }
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    onSubmit(text);
    setValue("");
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-60 min-h-[24px] w-full flex-none resize-none overflow-y-auto bg-transparent px-1 text-sm leading-6 text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-caption)]"
      />
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2.5 py-1">
          <Folder size={12} className="shrink-0 text-[var(--color-text-caption)]" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] text-[var(--color-text-caption)]">
            {workingDir}
          </span>
        </span>
        <div className="flex flex-shrink-0 items-center gap-2">
          <ModelSelectorPopover />
          <button
            type="button"
            onClick={busy ? onStop : submit}
            disabled={!busy && value.trim().length === 0}
            aria-label={busy ? "Detener" : "Enviar"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150",
              busy
                ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                : value.trim()
                  ? "bg-[var(--color-primary)] text-[var(--color-badge-text)] shadow-sm hover:bg-[var(--color-primary-hover)] active:scale-95"
                  : "bg-[var(--color-surface-subtle)] text-[var(--color-text-caption)]"
            )}
          >
            {busy ? <Square className="h-3 w-3 fill-current" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
