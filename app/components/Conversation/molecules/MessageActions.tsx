import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { IconButton } from "../atoms/IconButton";

/**
 * Molécula · MessageActions
 * Barra de acciones bajo la respuesta: copiar, regenerar y feedback.
 * Copiar usa el clipboard; los pulgares son estado local (aria-pressed).
 */
export function MessageActions({
  text,
  onRegenerate,
  busy = false,
}: {
  text: string;
  onRegenerate: () => void;
  busy?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard no disponible: sin drama.
    }
  };

  return (
    <div className="mt-2 flex items-center gap-0.5">
      <IconButton label={copied ? "Copiado" : "Copiar respuesta"} onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </IconButton>
      <IconButton label="Regenerar respuesta" onClick={onRegenerate} disabled={busy}>
        <RotateCcw size={14} />
      </IconButton>
      <IconButton
        label="Me gusta"
        active={feedback === "up"}
        onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
      >
        <ThumbsUp size={14} />
      </IconButton>
      <IconButton
        label="No me gusta"
        active={feedback === "down"}
        onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
      >
        <ThumbsDown size={14} />
      </IconButton>
    </div>
  );
}
