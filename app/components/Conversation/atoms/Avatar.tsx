import { User } from "lucide-react";
import { cn } from "~/lib/utils";
import { SidebarLogo } from "~/components/Sidebar/atoms/SidebarLogo";

/**
 * Átomo · Avatar
 * Usuario: círculo con acento primario. Asistente: círculo suave con el
 * isotipo del agente. 8×8, sin colores fijos.
 */
export function Avatar({
  variant,
  className = "",
}: {
  variant: "user" | "assistant";
  className?: string;
}) {
  if (variant === "user") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-badge-text)]",
          className
        )}
      >
        <User size={15} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
        className
      )}
    >
      <SidebarLogo size={16} />
    </span>
  );
}
