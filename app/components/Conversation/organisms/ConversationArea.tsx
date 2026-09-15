import type { ReactNode } from "react";

/**
 * Organismo · ConversationArea
 * Columna scrolleable de la conversación: ancho máximo centrado, espaciado
 * vertical consistente y padding de respiro. Recibe los mensajes ya resueltos
 * (el estado de streaming lo maneja el hook y el route).
 */
export function ConversationArea({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
