/**
 * Las herramientas que usó el agente en el turno. Cada una es una tarjeta del
 * hilo: icono según el tipo, título, ruta y una etiqueta con su estado; si el
 * evento trae argumentos o resultado, la tarjeta se expande para pintarlos.
 *
 * Todo el bloque es plegable: quien sólo quiere el resultado lo cierra desde
 * el encabezado y la preferencia se recuerda (localStorage). Si una
 * herramienta falla, el bloque se abre solo para que el fallo no pase
 * inadvertido.
 */
import { useEffect, useState } from "react";
import {
  ChevronDown,
  Code2,
  FilePen,
  FileText,
  FolderOpen,
  Globe,
  LoaderCircle,
  Search,
  Terminal,
  Wrench,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import type { ToolEntry } from "~/hooks/useAcpStream";

const STORAGE_KEY = "acp-tools-collapsed";

// El icono según el kind que reporta ACP. Mapeo generoso: cada agente escribe
// el suyo (ghosty manda casi todo como "other"), así que también se mira el
// título — "read: …", "edit: …", "bash …" — y basta con que contenga la palabra.
function KindIcon({ kind, title }: { kind: string; title: string }) {
  const k = `${kind} ${title}`.toLowerCase();
  const Icon = /shell|terminal|bash/.test(k)
    ? Terminal
    : /write|edit|patch/.test(k)
      ? FilePen
      : /read|cat|view|open/.test(k)
        ? FileText
        : /search/.test(k)
          ? Search
          : /web|fetch|http|url|browse/.test(k)
            ? Globe
            : /code/.test(k)
              ? Code2
              : /dir|folder|ls/.test(k)
                ? FolderOpen
                : Wrench;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border-secondary bg-background-tertiary/60 text-text-secondary">
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

const STATUS_CHIP = {
  pending: { label: "Pendiente", cls: "bg-background-tertiary/60 text-text-tertiary", spin: false },
  in_progress: { label: "En curso", cls: "bg-background-warning/15 text-text-warning", spin: true },
  completed: { label: "Listo", cls: "bg-background-success/15 text-text-success", spin: false },
  failed: { label: "Falló", cls: "bg-background-danger/15 text-text-danger", spin: false },
} as const;

// Un punto por herramienta, coloreado por estado — el resumen que queda a la
// vista cuando el bloque está cerrado (y acompaña al encabezado abierto).
function StatusDots({ tools }: { tools: ToolEntry[] }) {
  const shown = tools.slice(0, 8);
  const dotCls = (status: string) =>
    status === "completed"
      ? "bg-text-success"
      : status === "failed"
        ? "bg-text-danger"
        : status === "in_progress"
          ? "animate-pulse bg-text-warning"
          : "bg-text-tertiary/50";
  return (
    <span className="flex shrink-0 items-center gap-1" aria-hidden>
      {shown.map((t) => (
        <span key={t.id} className={`h-1.5 w-1.5 rounded-full ${dotCls(t.status ?? "pending")}`} />
      ))}
      {tools.length > shown.length && (
        <span className="text-[9px] leading-none">+{tools.length - shown.length}</span>
      )}
    </span>
  );
}

// El estado del turno en una palabra, para el encabezado.
function summaryOf(tools: ToolEntry[]) {
  const failed = tools.filter((t) => t.status === "failed").length;
  if (failed > 0) return { text: `${failed} de ${tools.length} falló`, cls: "text-text-danger" };
  const running = tools.some((t) => t.status === "in_progress" || t.status === "pending");
  if (running) return { text: "en curso…", cls: "text-text-warning" };
  return { text: `${tools.length} ${tools.length === 1 ? "lista" : "listas"}`, cls: "text-text-success" };
}

function ToolRow({ tool }: { tool: ToolEntry }) {
  const status = tool.status ?? "pending";
  const chip = STATUS_CHIP[status as keyof typeof STATUS_CHIP] ?? STATUS_CHIP.pending;
  const [open, setOpen] = useState(false);
  const inputJson = tool.input === undefined ? null : JSON.stringify(tool.input, null, 2);
  const expandable = Boolean(tool.output || (inputJson && inputJson !== "{}"));
  return (
    <li className="rounded-xl border border-border-secondary bg-background-secondary/50 transition-colors hover:bg-background-secondary">
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        aria-expanded={expandable ? open : undefined}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${expandable ? "cursor-pointer" : "cursor-default"}`}
      >
        {tool.kind && <KindIcon kind={tool.kind} title={tool.title ?? ""} />}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-text-primary">
            {tool.title ?? tool.id}
          </span>
          {tool.path && (
            <span className="mt-0.5 block truncate font-mono text-[10px] text-text-tertiary">
              {tool.path}
            </span>
          )}
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${chip.cls}`}
          aria-label={`estado: ${chip.label}`}
        >
          {chip.spin ? (
            <LoaderCircle className="h-3 w-3 animate-spin" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          )}
          {chip.label}
        </span>
        {expandable && (
          <ChevronDown
            className={`h-3 w-3 shrink-0 text-text-tertiary transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
        )}
      </button>
      {open && (
        <div className="space-y-1.5 px-3 pb-2.5">
          {inputJson && inputJson !== "{}" && (
            <div>
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
                entrada
              </p>
              <pre className="max-h-32 overflow-auto rounded-md border border-border-secondary/60 bg-background-primary/50 p-2 font-mono text-[10px] leading-relaxed text-text-tertiary">
                {inputJson}
              </pre>
            </div>
          )}
          {tool.output && (
            <div>
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
                salida
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border-secondary/60 bg-background-primary/50 p-2 font-mono text-[10px] leading-relaxed text-text-secondary">
                {tool.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function ToolCalls({ tools }: { tools: ToolEntry[] }) {
  const [collapsed, setCollapsed] = useState(
    () => typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );
  const persist = (value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // sin storage (privado/incógnito): la preferencia vive sólo este turno
    }
  };

  // Un fallo no debe pasar inadvertido: si el bloque estaba cerrado, se abre.
  useEffect(() => {
    if (collapsed && tools.some((t) => t.status === "failed")) persist(false);
  }, [tools, collapsed]);

  const summary = summaryOf(tools);

  return (
    <Collapsible open={!collapsed} onOpenChange={(open) => persist(!open)} className="mb-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group mb-1.5 flex w-full cursor-pointer items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
          Herramientas
          <StatusDots tools={tools} />
          <span className={`ml-auto font-medium normal-case tracking-normal ${summary.cls}`}>
            {summary.text}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <ul className="flex flex-col gap-1.5">
          {tools.map((tool) => (
            <ToolRow key={tool.id} tool={tool} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
