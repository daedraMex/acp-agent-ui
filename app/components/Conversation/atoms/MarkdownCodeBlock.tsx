import { Check, Copy } from "lucide-react";
import { isValidElement, useRef, useState } from "react";

/**
 * Átomo · MarkdownCodeBlock
 * Bloque de código con barra superior (etiqueta del lenguaje + botón
 * "Copiar código") y cuerpo sobre el fondo del tema. Reemplaza al <pre>
 * del markdown vía `components` de Streamdown.
 */
export function MarkdownCodeBlock(
  props: React.HTMLAttributes<HTMLPreElement> & Record<string, any>
) {
  const { children, className = "", ...rest } = props;
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  // El hijo es el <code>; el lenguaje viaja en su className (`language-ts`).
  let language = "código";
  const codeChild = children as React.ReactElement<{ className?: string }> | null;
  if (isValidElement(children) && typeof codeChild?.props?.className === "string") {
    const m = codeChild.props.className.match(/language-([\w-]+)/);
    if (m) language = m[1];
  }

  const copy = async () => {
    const text = bodyRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard no disponible (permisos/http): el botón no rompe nada.
    }
  };

  return (
    <pre
      {...rest}
      className={`my-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5">
        <span className="font-mono text-[11px] text-[var(--color-text-caption)]">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar código"
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <div ref={bodyRef} className="overflow-x-auto p-3 text-xs leading-relaxed">
        {children}
      </div>
    </pre>
  );
}
