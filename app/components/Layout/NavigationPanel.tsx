/**
 * Panel de navegación (Sidebar) — estética Cruip sobre tokens del tema.
 *
 * Organismo: contenedor w-64 con fondo --color-sidebar y divisor lateral
 * --color-border. Moléculas: NavRow (ítem de navegación) y SessionRow
 * (conversación). Átomos: SidebarIcon para los iconos. Sin colores fijos:
 * toda la variación claro/oscuro sale de las variables del tema activo.
 *
 * Items, IDs, links y handlers intactos: la lista NAV_ITEMS, el estado de
 * apertura de CHATS y el footer de Ajustes no cambian de comportamiento.
 */
import { Link, useLocation } from "react-router";
import { motion } from "motion/react";
import {
  AppWindow,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  History,
  ListFilter,
  MessageCircle,
  MessageSquarePlus,
  Puzzle,
  RotateCcw,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";
import { SidebarIcon } from "~/components/Sidebar/atoms/SidebarIcon";
import type { ConversationSummary } from "~/.server/acp";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", path: "/", label: "Nueva conversación", icon: MessageSquarePlus },
  { id: "recipes", path: "/recipes", label: "Recetas", icon: FileText },
  { id: "skills", path: "/skills", label: "Habilidades", icon: Zap },
  { id: "apps", path: "/apps", label: "Apps", icon: AppWindow },
  { id: "schedules", path: "/schedules", label: "Agenda", icon: Clock },
  { id: "extensions", path: "/extensions", label: "Extensiones", icon: Puzzle },
  { id: "whatsapp", path: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sessions", path: "/sessions", label: "Historial", icon: History },
];

const SETTINGS_ITEM: NavItem = {
  id: "settings",
  path: "/settings",
  label: "Ajustes",
  icon: Settings,
};

// ---------------------------------------------------------------------------
// Filtro de la lista de chats. Cada fila cicla sus opciones con un clic; los
// índices son posiciones en el arreglo de la misma llave.
// ---------------------------------------------------------------------------
const OPCIONES = {
  tipo: ["Todos", "Con mensajes", "Sin mensajes"],
  estado: ["Todos", "Respondiendo", "En espera"],
  actividad: ["Todo", "Hoy", "7 días", "30 días"],
  agrupar: ["Ninguno", "Por día", "Por semana"],
  ordenar: ["Última actividad", "Nombre", "Mensajes"],
} as const;

type ClaveFiltro = keyof typeof OPCIONES;

const FILTROS_INICIO: Record<ClaveFiltro, number> = {
  tipo: 0,
  estado: 0,
  actividad: 0,
  agrupar: 0,
  ordenar: 0,
};

const DIA_MS = 86_400_000;
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Fila del panel de filtro: etiqueta a la izquierda, valor + chevron a la
 *  derecha. Un clic abre (o cierra) su submenú lateral de opciones. */
function FilaFiltro({
  label,
  valor,
  abierto,
  onClic,
}: {
  label: string;
  valor: string;
  abierto: boolean;
  onClic: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClic}
      className={cn(
        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
        abierto ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-primary-subtle)]"
      )}
    >
      <span className={abierto ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"}>
        {label}
      </span>
      <span className="flex items-center gap-1 text-[var(--color-text-main)]">
        {valor}
        {abierto ? (
          <ChevronDown className="h-3 w-3 text-[var(--color-text-caption)]" />
        ) : (
          <ChevronRight className="h-3 w-3 text-[var(--color-text-caption)]" />
        )}
      </span>
    </button>
  );
}

/**
 * Molécula · fila de navegación.
 * Botón superior (featured): superficie sutil + hover primario sutil.
 * Ítems: activo → píldora primary-subtle, texto primary-text semibold e
 * icono primario; inactivo → texto/icono muted con hover a text-main.
 */
function NavRow({
  item,
  active,
  featured = false,
}: {
  item: NavItem;
  active: boolean;
  featured?: boolean;
}) {
  return (
    <Link
      to={item.path}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150",
        featured &&
          "bg-[var(--color-surface-subtle)] font-medium text-[var(--color-text-main)] hover:bg-[var(--color-primary-subtle)]",
        !featured &&
          (active
            ? "bg-[var(--color-primary-subtle)] font-semibold text-[var(--color-primary-text)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]")
      )}
    >
      <SidebarIcon
        icon={item.icon}
        size={20}
        active={active && !featured}
        className={cn(
          featured && "text-[var(--color-text-main)]",
          !featured &&
            active &&
            "text-[var(--color-primary)]",
          !featured &&
            !active &&
            "text-[var(--color-text-muted)] group-hover:text-[var(--color-text-main)]"
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Molécula · fila de conversación dentro de CHATS. */
function SessionRow({
  conversation,
  active,
}: {
  conversation: ConversationSummary;
  active: boolean;
}) {
  return (
    <Link
      to={`/c/${conversation.id}`}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors",
        active ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-subtle)]"
      )}
    >
      <span className="truncate text-sm text-[var(--color-text-main)]">
        {conversation.title}
      </span>
      <span className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
        {conversation.busy && (
          <span className="h-1.5 w-1.5 flex-shrink-0 animate-pulse rounded-full bg-[var(--color-success-text)]" />
        )}
        {conversation.messageCount} mensajes
      </span>
    </Link>
  );
}

/**
 * Organismo · Sidebar de la app.
 * w-64 h-screen flex-col p-4 con divisor lateral del tema. El ancho final lo
 * gobierna el contenedor redimensionable de AppLayout (por defecto 256px).
 */
export function NavigationPanel({
  conversations,
}: {
  conversations: ConversationSummary[];
}) {
  const location = useLocation();
  const [isChatsExpanded, setIsChatsExpanded] = useState(true);
  // Panel de filtros: se abre y cierra con el icono del embudo; al cerrarlo,
  // los valores vuelven al inicio (así no quedan filtros invisibles).
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  // Qué fila tiene su submenú lateral abierto, y dónde pintarlo: el sidebar
  // recorta lo que se sale de él (overflow-hidden para la animación de
  // colapso), así que el submenú se dibuja en un portal sobre <body>.
  const [submenuAbierto, setSubmenuAbierto] = useState<ClaveFiltro | null>(null);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [filtros, setFiltros] = useState<Record<ClaveFiltro, number>>(FILTROS_INICIO);
  const limpiarFiltros = () => {
    setFiltros(FILTROS_INICIO);
    cerrarSubmenu();
  };
  const cerrarSubmenu = () => {
    setSubmenuAbierto(null);
    setSubmenuPos(null);
  };
  const abrirSubmenu = (k: ClaveFiltro) => {
    if (submenuAbierto === k) return cerrarSubmenu();
    const r = panelRef.current?.getBoundingClientRect();
    // Anclado a la derecha del panel; se encaja al viewport si no cabe.
    setSubmenuPos(
      r ? { top: r.top, left: Math.min(r.right + 6, window.innerWidth - 164) } : null
    );
    setSubmenuAbierto(k);
  };
  const elegirFiltro = (k: ClaveFiltro, i: number) => {
    setFiltros((f) => ({ ...f, [k]: i }));
    cerrarSubmenu();
  };
  const isActive = (path: string) => location.pathname === path;

  const ahora = Date.now();
  // Filtrado → orden. La agrupación se dibuja como encabezados en la lista.
  const chats = [...conversations]
    .filter((c) => {
      if (filtros.tipo === 1 && c.messageCount === 0) return false;
      if (filtros.tipo === 2 && c.messageCount > 0) return false;
      if (filtros.estado === 1 && !c.busy) return false;
      if (filtros.estado === 2 && c.busy) return false;
      if (filtros.actividad === 1 && !mismoDia(new Date(c.updatedAt), new Date())) return false;
      if (filtros.actividad === 2 && c.updatedAt < ahora - 7 * DIA_MS) return false;
      if (filtros.actividad === 3 && c.updatedAt < ahora - 30 * DIA_MS) return false;
      return true;
    })
    .sort((a, b) => {
      if (filtros.ordenar === 1) return a.title.localeCompare(b.title, "es");
      if (filtros.ordenar === 2) return b.messageCount - a.messageCount;
      return b.updatedAt - a.updatedAt;
    });

  const grupoDe = (c: ConversationSummary): string => {
    const d = new Date(c.updatedAt);
    if (filtros.agrupar === 1) {
      if (mismoDia(d, new Date())) return "Hoy";
      if (mismoDia(d, new Date(ahora - DIA_MS))) return "Ayer";
      return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    }
    if (filtros.agrupar === 2) {
      const hoy = new Date();
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - hoy.getDay());
      if (d >= inicio) return "Esta semana";
      const anterior = new Date(inicio.getTime() - 7 * DIA_MS);
      if (d >= anterior) return "Semana pasada";
      return `${d.toLocaleDateString("es-MX", { month: "short" })} ${d.getFullYear()}`;
    }
    return "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="flex h-full w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-4 outline-none"
    >
      {/* Espacio para el botón flotante de AppLayout (PanelLeft) */}
      <div className="h-[48px]" />

      {/* Menú principal */}
      <div className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavRow
            key={item.id}
            item={item}
            active={isActive(item.path)}
            featured={item.id === "home"}
          />
        ))}
      </div>

      {/* Sección CHATS */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 mt-6 flex items-center justify-between gap-1 pr-1">
          <button
            onClick={() => setIsChatsExpanded((v) => !v)}
            className="flex items-center gap-1 self-start px-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-caption)] transition-colors hover:text-[var(--color-text-main)]"
          >
            {isChatsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Chats</span>
          </button>
          {/* A la derecha del título: historial de chat y filtro de la lista. */}
          <div className="flex items-center gap-0.5">
            <Link
              to="/sessions"
              title="Historial de chat"
              aria-label="Historial de chat"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-caption)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
            >
              <History className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setFiltroAbierto((v) => !v);
                cerrarSubmenu();
                if (filtroAbierto) setFiltros(FILTROS_INICIO);
              }}
              title={filtroAbierto ? "Cerrar filtro" : "Filtrar chats"}
              aria-label="Filtrar chats"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                filtroAbierto
                  ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary-text)]"
                  : "text-[var(--color-text-caption)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text-main)]"
              )}
            >
              <ListFilter className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {filtroAbierto && (
          <div
            ref={panelRef}
            className="relative mb-2 flex flex-col gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-1.5"
          >
            <FilaFiltro
              label="Tipo"
              valor={OPCIONES.tipo[filtros.tipo]}
              abierto={submenuAbierto === "tipo"}
              onClic={() => abrirSubmenu("tipo")}
            />
            <FilaFiltro
              label="Estado"
              valor={OPCIONES.estado[filtros.estado]}
              abierto={submenuAbierto === "estado"}
              onClic={() => abrirSubmenu("estado")}
            />
            <FilaFiltro
              label="Última actividad"
              valor={OPCIONES.actividad[filtros.actividad]}
              abierto={submenuAbierto === "actividad"}
              onClic={() => abrirSubmenu("actividad")}
            />
            {/* Separador: la vista (agrupar/ordenar) va aparte del filtrado. */}
            <div className="mx-1 my-0.5 border-t border-[var(--color-border-subtle)]" />
            <FilaFiltro
              label="Agrupar por"
              valor={OPCIONES.agrupar[filtros.agrupar]}
              abierto={submenuAbierto === "agrupar"}
              onClic={() => abrirSubmenu("agrupar")}
            />
            <FilaFiltro
              label="Ordenar por"
              valor={OPCIONES.ordenar[filtros.ordenar]}
              abierto={submenuAbierto === "ordenar"}
              onClic={() => abrirSubmenu("ordenar")}
            />
            <button
              type="button"
              onClick={limpiarFiltros}
              className="mt-0.5 flex w-full items-center justify-center gap-1.5 rounded-lg border-t border-[var(--color-border-subtle)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-text-main)]"
            >
              <RotateCcw className="h-3 w-3" />
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Submenú lateral: en un portal sobre <body>, para que el sidebar
            (overflow-hidden) no lo recorte. */}
        {filtroAbierto && submenuAbierto && submenuPos &&
          createPortal(
            <>
              {/* Clic afuera cierra el submenú (y deja el panel abierto). */}
              <div className="fixed inset-0 z-40" onClick={cerrarSubmenu} />
              <div
                style={{ top: submenuPos.top, left: submenuPos.left }}
                className="fixed z-50 flex min-w-[150px] flex-col gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-sidebar)] p-1.5 shadow-xl"
              >
                {OPCIONES[submenuAbierto].map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => elegirFiltro(submenuAbierto, i)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                      i === filtros[submenuAbierto]
                        ? "bg-[var(--color-primary-subtle)] font-medium text-[var(--color-primary-text)]"
                        : "text-[var(--color-text-main)] hover:bg-[var(--color-surface-subtle)]"
                    )}
                  >
                    <span className="truncate">{opt}</span>
                    {i === filtros[submenuAbierto] && (
                      <Check className="h-3 w-3 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}
        {isChatsExpanded && (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {conversations.length === 0 ? (
              <div className="px-3 text-xs italic text-[var(--color-text-caption)]">
                Todavía no hay conversaciones
              </div>
            ) : chats.length === 0 ? (
              <div className="px-3 text-xs italic text-[var(--color-text-caption)]">
                Nada coincide con el filtro
              </div>
            ) : (
              chats.map((c, i) => {
                const cap = grupoDe(c);
                const abreGrupo = cap && (i === 0 || grupoDe(chats[i - 1]) !== cap);
                return (
                  <Fragment key={c.id}>
                    {abreGrupo && (
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-caption)]">
                        {cap}
                      </div>
                    )}
                    <SessionRow
                      conversation={c}
                      active={location.pathname === `/c/${c.id}`}
                    />
                  </Fragment>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Footer: Ajustes anclado abajo */}
      <div className="mt-auto border-t border-[var(--color-border-subtle)] pt-4">
        <NavRow item={SETTINGS_ITEM} active={isActive(SETTINGS_ITEM.path)} />
      </div>
    </motion.div>
  );
}
