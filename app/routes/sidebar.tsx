/**
 * Vista de previsualización del Sidebar (Atomic Design).
 * Monta el organismo con la navegación de referencia de las imágenes.
 * Ruta temporal para inspección visual: /sidebar
 */
import { DEMO_SIDEBAR_SECTIONS, Sidebar } from "~/components/Sidebar";

export default function SidebarPreview() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-row">
      <div className="h-full flex-shrink-0 border-r border-border-primary">
        <Sidebar sections={DEMO_SIDEBAR_SECTIONS} />
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center gap-2 bg-background-secondary p-8">
        <p className="text-sm font-medium text-text-primary">
          Previsualización del Sidebar
        </p>
        <p className="text-xs text-text-secondary">
          Grupo activo: Dashboard (fondo lila, icono primario, "Main" seleccionado) ·
          Badge "4" en Messages
        </p>
      </div>
    </div>
  );
}
