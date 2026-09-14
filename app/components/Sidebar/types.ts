import type { LucideIcon } from "lucide-react";

/**
 * Contrato del menú lateral. La navegación es data-driven: el organismo
 * Sidebar renderiza SidebarSectionDef[] y cada nivel atómico recibe solo lo
 * que necesita (icono, label, estado).
 */

export interface SidebarSubItemDef {
  id: string;
  label: string;
  /** Selección visual (el "Main" activo de las imágenes). */
  active?: boolean;
  href?: string;
}

export interface SidebarGroupDef {
  id: string;
  label: string;
  icon: LucideIcon;
  subitems: SidebarSubItemDef[];
  /** Grupo activo: fondo suave, icono primario, abierto por defecto. */
  active?: boolean;
  defaultOpen?: boolean;
}

export interface SidebarItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  active?: boolean;
  href?: string;
}

export interface SidebarSectionDef {
  id: string;
  /** Encabezado en mayúsculas ("PAGES"). Vacío para omitir. */
  title?: string;
  groups: SidebarGroupDef[];
  items: SidebarItemDef[];
}
