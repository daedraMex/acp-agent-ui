/**
 * La barra de selectores del chat: modelo, modo, esfuerzo y cualquier otra
 * opción de sesión que el agente anuncie en session/new (configOptions).
 */
import { Brain, ChevronDown, Compass, Cpu, SlidersHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { ConfigOption } from "~/hooks/useAcpStream";

// Etiquetas e iconos para las categorías que el spec reserva; las demás usan
// el nombre que manda el agente.
const CATEGORY_LABEL: Record<string, string> = {
  mode: "Modo",
  model: "Modelo",
  model_config: "Modelo",
  thought_level: "Esfuerzo",
};

const CATEGORY_ICON: Record<string, typeof Cpu> = {
  mode: Compass,
  model: Cpu,
  model_config: Cpu,
  thought_level: Brain,
};

export function ChatConfigBar({
  config,
  onSelect,
}: {
  config: ConfigOption[];
  onSelect: (optionId: string, value: string) => void;
}) {
  if (config.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-secondary px-3 pb-2 pt-2.5">
      {config.map((option) => {
        const label = CATEGORY_LABEL[option.category ?? ""] ?? option.name;
        const Icon = CATEGORY_ICON[option.category ?? ""] ?? SlidersHorizontal;
        const current = option.values.find((v) => v.value === option.currentValue);
        return (
          <DropdownMenu key={option.id}>
            <DropdownMenuTrigger
              title={option.description ?? label}
              className="flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-border-secondary bg-background-secondary/60 px-2.5 py-1 text-[11px] outline-none transition-colors hover:bg-background-secondary focus-visible:ring-2 focus-visible:ring-border-primary data-[state=open]:bg-background-secondary"
            >
              <Icon className="h-3 w-3 text-text-tertiary" />
              <span className="font-medium text-text-secondary">{label}</span>
              <span className="max-w-32 truncate text-text-primary">
                {current?.title ?? option.currentValue ?? "—"}
              </span>
              <ChevronDown className="h-3 w-3 text-text-tertiary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={option.currentValue ?? ""}
                onValueChange={(value) => onSelect(option.id, value)}
              >
                {option.values.map((v) => (
                  <DropdownMenuRadioItem key={v.value} value={v.value}>
                    <span className="truncate">{v.title ?? v.value}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}
