import { useState } from "react";
import { cn } from "~/lib/utils";
import { SidebarItem } from "../molecules/SidebarItem";
import { SidebarSubItem } from "../molecules/SidebarSubItem";
import type { SidebarGroupDef } from "../types";

/**
 * Organismo · SidebarGroup
 * Grupo colapsable (abierto/cerrado). Activo → contenedor con fondo suave
 * lila (--color-primary-subtle), esquinas redondeadas y padding interno;
 * chevron arriba e icono en primario. El subítem `active` se pinta en
 * primario con semibold.
 */
export function SidebarGroup({ group }: { group: SidebarGroupDef }) {
  const [open, setOpen] = useState(group.defaultOpen ?? group.active ?? false);
  const active = group.active ?? group.subitems.some((s) => s.active);

  return (
    <li className="mb-0.5 last:mb-0">
      <div
        className={cn(
          "rounded-xl transition-colors duration-150 px-1.5 py-1",
          active && "bg-[var(--color-primary-subtle)]"
        )}
      >
        <SidebarItem
          label={group.label}
          icon={group.icon}
          active={active}
          chevronOpen={open}
          onClick={() => setOpen((v) => !v)}
          className={active ? "" : "bg-transparent! hover:bg-transparent!"}
        />
        {open && (
          <ul className="mt-0.5 pb-1 pl-8 pr-3">
            {group.subitems.map((sub) => (
              <li key={sub.id} className="mb-1 last:mb-0">
                <SidebarSubItem label={sub.label} active={sub.active} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
