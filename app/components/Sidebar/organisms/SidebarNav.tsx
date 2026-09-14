import { SidebarItem } from "../molecules/SidebarItem";
import { SidebarSectionTitle } from "../molecules/SidebarSectionTitle";
import { SidebarGroup } from "./SidebarGroup";
import type { SidebarSectionDef } from "../types";

/**
 * Organismo · SidebarNav
 * Lista vertical scrolleable con espaciado consistente: secciones con su
 * encabezado ("PAGES"), grupos colapsables e ítems planos con badge.
 */
export function SidebarNav({ sections }: { sections: SidebarSectionDef[] }) {
  return (
    <nav className="flex-1 min-h-0 overflow-y-auto space-y-8">
      {sections.map((section) => (
        <div key={section.id}>
          {section.title && <SidebarSectionTitle>{section.title}</SidebarSectionTitle>}
          <ul className="mt-3">
            {section.groups.map((group) => (
              <SidebarGroup key={group.id} group={group} />
            ))}
            {section.items.map((item) => (
              <li key={item.id} className="mb-0.5 last:mb-0">
                <SidebarItem
                  label={item.label}
                  icon={item.icon}
                  active={item.active}
                  badge={item.badge}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
