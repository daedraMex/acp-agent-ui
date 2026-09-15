/**
 * Molécula · ThinkingAccordion
 * Vista colapsable del razonamiento del agente: acordeón con borde izquierdo
 * primario y fondo translúcido suave. Mientras el agente piensa, muestra
 * spinner + "Pensando…" y se abre por defecto.
 */
export function ThinkingAccordion({
  thought,
  busy = false,
}: {
  thought: string;
  busy?: boolean;
}) {
  return (
    <details
      open={busy}
      className="mb-3 rounded-lg border-l-2 border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/30 px-3 py-2"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 text-xs font-medium text-[var(--color-text-muted)] [&::-webkit-details-marker]:hidden">
        {busy ? (
          <span
            aria-hidden="true"
            className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent"
          />
        ) : (
          <span aria-hidden="true" className="h-3 w-3" />
        )}
        {busy ? "Pensando…" : "Razonamiento"}
      </summary>
      <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[var(--color-text-muted)]">
        {thought}
      </p>
    </details>
  );
}
