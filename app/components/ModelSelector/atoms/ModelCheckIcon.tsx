import { Check } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Átomo · ModelCheckIcon
 * Icono de verificación para la opción seleccionada. Ocupa un slot fijo:
 * si no está seleccionada, el espacio queda reservado para que los títulos
 * alineen en columna (igual que en los menús de Gemini/ChatGPT).
 */
export function ModelCheckIcon({
  selected = false,
  className = "",
}: {
  selected?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex w-4 flex-shrink-0 items-center justify-center", className)}>
      {selected && <Check size={16} className="text-[var(--color-primary)]" aria-hidden="true" />}
    </span>
  );
}
