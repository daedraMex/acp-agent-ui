/**
 * Input del chat: textarea que crece, Enter envía y Shift+Enter hace salto de
 * línea. Mientras el agente responde, el botón de enviar se vuelve el de parar.
 * Permite adjuntar imágenes (botón, drag & drop) que viajan como bloques de
 * imagen del ACP.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Square, X } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ImagePayload } from "~/hooks/useAcpStream";

const MAX_HEIGHT = 240;
const MAX_IMAGES = 4;

export function ChatInput({
  onSubmit,
  onStop,
  busy = false,
  autoFocus = true,
  placeholder = "Pídele algo al agente…",
  workingDir,
}: {
  onSubmit: (text: string, images?: ImagePayload[]) => void;
  onStop?: () => void;
  busy?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  workingDir?: string;
}) {
  const [value, setValue] = useState("");
  const [images, setImages] = useState<ImagePayload[]>([]);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const list = Array.from(files).slice(0, room);
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result ?? "");
        const comma = url.indexOf(",");
        if (comma === -1) return;
        const data = url.slice(comma + 1);
        setImages((prev) => [...prev, { data, mimeType: file.type || "image/png" }]);
      };
      reader.readAsDataURL(file);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = () => {
    const text = value.trim();
    if ((!text && images.length === 0) || busy) return;
    onSubmit(text, images.length > 0 ? images : undefined);
    setValue("");
    setImages([]);
  };

  // Drag & drop: mismo camino que el botón de adjuntar. El dragleave salta al
  // pasar sobre hijos; sólo se apaga cuando el cursor sale de verdad.
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="relative flex flex-col gap-2 p-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-surface)]/80">
          <p className="text-sm font-medium text-[var(--color-primary)]">Suelta la imagen aquí</p>
        </div>
      )}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-border-secondary">
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={`adjunto ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label={`quitar adjunto ${i + 1}`}
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute right-0.5 top-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-background-inverse/70 text-text-inverse opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="Adjuntar imagen"
            onClick={() => fileRef.current?.click()}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-text-caption)] transition-colors hover:bg-background-secondary hover:text-[var(--color-text-main)]"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => pickFiles(e.target.files)}
            onInput={(e) => pickFiles((e.target as HTMLInputElement).files)}
          />
          <span className="truncate font-mono text-[11px] text-[var(--color-text-caption)]">
            {workingDir}
          </span>
        </div>
        <button
          type="button"
          onClick={busy ? onStop : submit}
          disabled={!busy && value.trim().length === 0 && images.length === 0}
          aria-label={busy ? "Detener" : "Enviar"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
            busy
              ? "bg-background-inverse text-text-inverse"
              : value.trim() || images.length > 0
                ? "bg-background-inverse text-text-inverse"
                : "bg-background-disabled text-text-disabled"
          )}
        >
          {busy ? <Square className="h-3 w-3 fill-current" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
