import { Markdown } from "~/components/Markdown";
import { MessageUsageStats } from "~/components/MessageUsageStats";
import type { ToolEntry, Turn } from "~/hooks/useAcpStream";
import { Avatar } from "../atoms/Avatar";
import { MessageActions } from "./MessageActions";
import { ThinkingAccordion } from "./ThinkingAccordion";

// Una herramienta del agente, con su estado según ACP:
// pending → in_progress → completed | failed.
const STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  in_progress: "●",
  completed: "✓",
  failed: "✗",
};

function ToolRow({ tool }: { tool: ToolEntry }) {
  const status = tool.status ?? "pending";
  const color =
    status === "failed"
      ? "text-[var(--color-danger-text)]"
      : status === "completed"
        ? "text-[var(--color-success-text)]"
        : "text-[var(--color-text-caption)]";
  return (
    <li className="flex min-w-0 items-baseline gap-2 text-xs">
      <span className={`shrink-0 ${color}`} aria-label={status}>
        {STATUS_ICON[status] ?? "•"}
      </span>
      {tool.kind && (
        <span className="shrink-0 rounded bg-[var(--color-surface-subtle)] px-1 font-mono text-[var(--color-text-muted)]">
          {tool.kind}
        </span>
      )}
      <span className="min-w-0 truncate text-[var(--color-text-main)]">
        {tool.title ?? tool.id}
      </span>
      {tool.path && (
        <span className="hidden min-w-0 truncate font-mono text-[var(--color-text-caption)] sm:inline">
          {tool.path}
        </span>
      )}
    </li>
  );
}

/**
 * Molécula · AssistantMessageItem
 * Avatar del agente + cuerpo (razonamiento, herramientas, markdown y uso)
 * + barra de acciones. `onRegenerate` se pasa sólo en el último turno.
 */
export function AssistantMessageItem({
  turn,
  busy = false,
  showActions = false,
  onRegenerate,
}: {
  turn: Turn;
  busy?: boolean;
  showActions?: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <Avatar variant="assistant" />
      <div className="min-w-0 max-w-[90%] flex-1">
        {turn.thought && <ThinkingAccordion thought={turn.thought} busy={busy} />}
        {turn.tools && turn.tools.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1">
            {turn.tools.map((tool) => (
              <ToolRow key={tool.id} tool={tool} />
            ))}
          </ul>
        )}
        {turn.text && <Markdown>{turn.text}</Markdown>}
        {turn.usage && <MessageUsageStats {...turn.usage} />}
        {showActions && turn.text && onRegenerate && (
          <MessageActions text={turn.text} onRegenerate={onRegenerate} busy={busy} />
        )}
      </div>
    </div>
  );
}
