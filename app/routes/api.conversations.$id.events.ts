/**
 * GET /api/conversations/:id/events — SSE.
 *
 * Es una ruta de recurso: no renderiza nada, devuelve un ReadableStream que se
 * mantiene abierto mientras el navegador escuche.
 */
import type { Route } from "./+types/api.conversations.$id.events";
import { closeSse, HILO_NUEVO, markActivity, openSse, sesionActual, subscribe, type AcpEvent } from "~/.server/acp";

export async function loader({ params, request }: Route.LoaderArgs) {
  // La carga por cola pinta desde disco sin esperar a la caja: este SSE puede
  // llegar antes de que la sesión esté abierta. En vez de un 404 a la primera,
  // se espera un rato: despertar una caja dormida tarda ~1-10 s.
  const techo = Date.now() + Number(process.env.ACP_SSE_WAIT_MS ?? 60_000);
  while (Date.now() < techo && !request.signal.aborted) {
    const s = sesionActual();
    const esEste = s
      ? params.id === HILO_NUEVO
        ? !s.sessionId
        : s.sessionId === params.id
      : false;
    if (esEste) break;
    // La espera cuenta como actividad: que el idle no suspenda la caja justo
    // mientras está despertando.
    markActivity();
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!sesionActual()) {
    return new Response("conversation not found", { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // el cliente ya se fue
        }
      };

      write(": connected\n\n");
      openSse();

      unsubscribe = subscribe(params.id, (e: AcpEvent) => {
        const { type, ...rest } = e;
        write(`event: ${type}\ndata: ${JSON.stringify(rest)}\n\n`);
        if (type === "closed") {
          try {
            controller.close();
          } catch {}
        }
      });

      // Latido: mantiene viva la conexión frente a proxies impacientes.
      const beat = setInterval(() => write(": ping\n\n"), 25_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(beat);
        unsubscribe?.();
        closeSse();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      unsubscribe?.();
      closeSse();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
