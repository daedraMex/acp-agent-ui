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
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  History,
  MessageCircle,
  MessageSquarePlus,
  Puzzle,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
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
  const isActive = (path: string) => location.pathname === path;

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
        <button
          onClick={() => setIsChatsExpanded((v) => !v)}
          className="mb-2 mt-6 flex items-center gap-1 self-start px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-caption)] transition-colors hover:text-[var(--color-text-main)]"
        >
          {isChatsExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Chats</span>
        </button>
        {isChatsExpanded && (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {conversations.length === 0 ? (
              <div className="px-3 text-xs italic text-[var(--color-text-caption)]">
                Todavía no hay conversaciones
              </div>
            ) : (
              conversations.map((c) => (
                <SessionRow
                  key={c.id}
                  conversation={c}
                  active={location.pathname === `/c/${c.id}`}
                />
              ))
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
