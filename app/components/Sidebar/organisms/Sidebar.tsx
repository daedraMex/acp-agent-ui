import { SidebarLogo } from "../atoms/SidebarLogo";
import { SidebarNav } from "./SidebarNav";
import type { SidebarSectionDef } from "../types";

/**
 * Organismo · Sidebar
 * Ensamblado final: logo en la cabecera superior izquierda y la navegación
 * completa debajo. Fondo del panel vía --color-sidebar, ancho 256px.
 */
export function Sidebar({
  sections,
  className = "",
}: {
  sections: SidebarSectionDef[];
  className?: string;
}) {
  return (
    <div
      id="sidebar"
      className={`flex h-full w-64 flex-col bg-[var(--color-sidebar)] p-4 ${className}`}
    >
      {/* Cabecera: logo arriba a la izquierda */}
      <div className="mb-10 flex justify-start pr-3 sm:px-2">
        <SidebarLogo />
      </div>

      <SidebarNav sections={sections} />
    </div>
  );
}
