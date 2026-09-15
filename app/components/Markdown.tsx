import { Streamdown } from "streamdown";
import { MarkdownCodeBlock } from "~/components/Conversation/atoms/MarkdownCodeBlock";

/**
 * Markdown en streaming — tolera el bloque de código a medio cerrar.
 * La paleta de la prosa sale de los tokens del tema (ver app.css, variables
 * --tw-prose-*); los bloques de código se renderizan con MarkdownCodeBlock
 * (barra de lenguaje + copiar).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none text-[var(--color-text-main)]">
      <Streamdown components={{ pre: MarkdownCodeBlock }}>{children}</Streamdown>
    </div>
  );
}
