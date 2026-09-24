/**
 * La conversación. El loader entrega los mensajes ya ocurridos (por si
 * recargas), y de ahí en adelante el hilo lo alimenta el SSE.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/chat";
import { MainPanelLayout } from "~/components/Layout/MainPanelLayout";
import { ChatInputCard } from "~/components/ChatInputCard";
import { ChatInput } from "~/components/ChatInput";
import { ChatConfigBar } from "~/components/ChatConfigBar";
import { Markdown } from "~/components/Markdown";
import { ToolCalls } from "~/components/ToolCalls";
import { MessageUsageStats } from "~/components/MessageUsageStats";
import { ArrowDown } from "lucide-react";
import { ConnectingState } from "~/components/ConnectingState";
import { useAcpStream, type ConnectPhase, type Turn } from "~/hooks/useAcpStream";
import { abrirHilo, config, getMessagesWindow, HILO_NUEVO, TAIL_MENSAJES, tituloDe } from "~/.server/acp";

const plano = (m: { role: "user" | "assistant"; text: string; images?: any[] }) => ({
  role: m.role,
  text: m.text,
  images: m.images,
});

export async function loader({ params }: Route.LoaderArgs) {
  const fallo = (e: unknown) => ({
    id: params.id,
    cwd: config.cwd,
    title: "No pude abrir el hilo",
    messages: [],
    hasMore: false,
    nextBefore: null,
    error: (e as Error).message,
  });

  // Un hilo nuevo no tiene id propio: hay que esperar a que el agente se lo
  // dé para redirigir.
  if (params.id === HILO_NUEVO) {
    try {
      const s = await abrirHilo(HILO_NUEVO);
      const id = s.sessionId ?? HILO_NUEVO;
      if (params.id !== id) throw redirect(`/c/${id}`);
      const ventana = getMessagesWindow(id, null, TAIL_MENSAJES);
      return {
        id,
        cwd: config.cwd,
        title: s.title,
        messages: ventana.messages.map(plano),
        hasMore: ventana.hasMore,
        nextBefore: ventana.nextBefore,
        error: null as string | null,
      };
    } catch (e) {
      if (e instanceof Response) throw e;
      return fallo(e);
    }
  }

  // Carga por cola: para un hilo conocido, pintar YA desde la copia en disco
  // y abrir la sesión en paralelo. El SSE espera a que esté y el evento
  // `history` reconcilia la cola con la memoria de la sesión.
  const ventana = getMessagesWindow(params.id, null, TAIL_MENSAJES);

  // Sin copia en disco (primera vez desde que la app persiste, o hilo vacío):
  // no hay nada que pintar, así que se espera al replay del agente.
  if (ventana.messages.length === 0 && !ventana.hasMore) {
    try {
      const s = await abrirHilo(params.id);
      const id = s.sessionId ?? params.id;
      const fresca = getMessagesWindow(id, null, TAIL_MENSAJES);
      return {
        id,
        cwd: config.cwd,
        title: s.title,
        messages: fresca.messages.map(plano),
        hasMore: fresca.hasMore,
        nextBefore: fresca.nextBefore,
        error: null as string | null,
      };
    } catch (e) {
      return fallo(e);
    }
  }

  // La apertura corre por su cuenta: si falla, el SSE (que espera por la
  // sesión) lo hace visible al rato con su propio error.
  void abrirHilo(params.id).catch(() => {});
  return {
    id: params.id,
    cwd: config.cwd,
    title: tituloDe(params.id) || "Conversación",
    messages: ventana.messages.map(plano),
    hasMore: ventana.hasMore,
    nextBefore: ventana.nextBefore,
    error: null as string | null,
  };
}

function Bubble({ turn }: { turn: Turn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="user-message user-message-bubble max-w-[80%] rounded-2xl rounded-br-md bg-[var(--color-primary-subtle)] px-4 py-2.5 text-sm text-[var(--color-primary-text)]">
          {turn.images && turn.images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {turn.images.map((img, i) => (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={`imagen adjunta ${i + 1}`}
                  className="max-h-48 max-w-56 rounded-lg object-contain"
                />
              ))}
            </div>
          )}
          {turn.text}
        </div>
      </div>
    );
  }
  return (
    <div className="agent-message agent-message-bubble max-w-[90%]">
      {turn.thought && (
        <details className="mb-3 text-xs text-text-secondary">
          <summary className="cursor-pointer select-none">Pensando…</summary>
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-border-secondary pl-3">
            {turn.thought}
          </p>
        </details>
      )}
      {turn.tools && turn.tools.length > 0 && <ToolCalls tools={turn.tools} />}
      {turn.text && <Markdown>{turn.text}</Markdown>}
      {turn.usage && <MessageUsageStats {...turn.usage} />}
    </div>
  );
}

// Cada conversación necesita su propio estado: sin la key, React reusa la
// instancia al navegar entre /c/:id y el hilo anterior se queda pegado.

const ESPERA: Record<ConnectPhase, string> = {
  waking: "despertando la caja",
  connecting: "abriendo el canal ACP",
  session: "creando la sesión",
};

function WaitLabel({ phase }: { phase: ConnectPhase }) {
  const [segundos, setSegundos] = useState(0);
  // Lo que ya pasó, con su duración: distingue una caja dormida (waking largo)
  // de un modelo lento (session largo).
  const [hechos, setHechos] = useState<{ phase: ConnectPhase; secs: number }[]>([]);
  const anterior = useRef<{ phase: ConnectPhase; t0: number } | null>(null);

  useEffect(() => {
    const previo = anterior.current;
    if (previo && previo.phase !== phase) {
      const secs = Math.round((Date.now() - previo.t0) / 1000);
      setHechos((h) => [...h, { phase: previo.phase, secs }]);
    }
    anterior.current = { phase, t0: Date.now() };
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const que = phase === "session" ? "el agente está pensando" : ESPERA[phase];

  return (
    <div className="flex flex-col gap-0.5 text-xs text-text-tertiary">
      {hechos.map((h, i) => (
        <p key={i} className="opacity-60">
          ✓ {ESPERA[h.phase]} · {h.secs}s
        </p>
      ))}
      <p>
        {que} · {segundos}s
      </p>
    </div>
  );
}

export default function Chat() {
  const { id, error } = useLoaderData<typeof loader>();
  // Si el hilo no se pudo abrir no hay nada que transmitir: montar el chat sólo
  // sirve para que el stream falle aparte y se vea un segundo error encima.
  if (error) return <HiloNoDisponible mensaje={error} />;
  return <ChatView key={id} />;
}

function HiloNoDisponible({ mensaje }: { mensaje: string }) {
  return (
    <MainPanelLayout>
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-text-primary">Ese hilo no está en la caja</p>
        <p className="max-w-md text-sm text-text-secondary">{mensaje}</p>
        <Link
          to="/sessions"
          className="rounded-full border border-border-primary px-4 py-1.5 text-sm text-text-secondary transition-colors hover:bg-background-secondary hover:text-text-primary"
        >
          Ver el historial
        </Link>
      </div>
    </MainPanelLayout>
  );
}

function ChatView() {
  const {
    id,
    cwd,
    messages,
    hasMore: hayMas,
    nextBefore: cursor,
    error: loadError,
  } = useLoaderData<typeof loader>();
  const [abajo, setAbajo] = useState(true);
  // Carga por cola: el loader trajo los últimos mensajes (quizá desde disco,
  // sin esperar a la caja); el resto se pide hacia atrás cuando el scroll
  // llega arriba. La cola real de la sesión reconcilia esta base al abrir.
  const [hasMore, setHasMore] = useState(hayMas);
  const [nextBefore, setNextBefore] = useState<number | null>(cursor);
  const [cargandoViejo, setCargandoViejo] = useState(false);
  // Altura del scroller antes de anteponer: se usa para anclar la vista.
  const ancla = useRef<number | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const { turns, busy, connected, phase, error, notice, send, prepend, config, setConfigOption, models, currentModel, setModel } = useAcpStream(
    id,
    messages as Turn[],
    {
      onHistory: ({ hasMore: mas, nextBefore: nuevoCursor }) => {
        setHasMore(mas);
        setNextBefore(nuevoCursor);
      },
    }
  );

  const irAbajo = () =>
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  // El primer mensaje ya no se reenvía desde aquí: el hub lo manda en el mismo
  // POST que crea la conversación, así que llega al loader como un mensaje más
  // y se pinta en el primer render. De paso, ya no hay forma de duplicarlo.

  useEffect(() => {
    if (abajo) irAbajo();
  }, [turns, abajo]);

  // La página anterior entra ARRIBA: sin compensar, el scroll saltaría y el
  // lector perdería el sitio. Se mide la altura de antes y se reancla tras el
  // render (sólo cuando hay una anteposición pendiente).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && ancla.current !== null) {
      el.scrollTop += el.scrollHeight - ancla.current;
      ancla.current = null;
    }
  }, [turns]);

  const cargarAntes = useCallback(async () => {
    if (cargandoViejo || !hasMore || nextBefore === null) return;
    setCargandoViejo(true);
    try {
      const r = await fetch(
        `/api/conversations/${encodeURIComponent(id)}/messages?before=${nextBefore}&limit=50`
      );
      if (!r.ok) return;
      const d = (await r.json()) as {
        messages: Turn[];
        hasMore: boolean;
        nextBefore: number | null;
      };
      const el = scroller.current;
      if (el) ancla.current = el.scrollHeight;
      prepend(d.messages ?? []);
      setHasMore(d.hasMore);
      setNextBefore(d.nextBefore);
    } catch {
      // Sin conexión: se reintenta al volver a subir el scroll.
    } finally {
      setCargandoViejo(false);
    }
  }, [cargandoViejo, hasMore, nextBefore, id, prepend]);

  // "Abajo" con holgura: a menos de 80 px del final cuenta como estar al día.
  // Arriba, cerca del borde: se pide la página anterior del historial.
  const alScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setAbajo(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
    if (el.scrollTop < 120) void cargarAntes();
  };

  return (
    <MainPanelLayout>
      <div className="flex h-full min-h-0 flex-col">
        <div ref={scroller} onScroll={alScroll} className="relative min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
            {!connected && turns.length === 0 && (
              <ConnectingState phase={phase} error={error} />
            )}
            {loadError && (
              <p className="rounded-xl border border-border-primary px-4 py-3 text-sm text-text-secondary">
                {loadError}
              </p>
            )}
            {cargandoViejo && (
              <p className="text-center text-xs text-text-tertiary">cargando anteriores…</p>
            )}
            {turns.map((turn, i) => (
              <Bubble key={i} turn={turn} />
            ))}

            {busy && turns[turns.length - 1]?.role === "user" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-tertiary"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <WaitLabel phase={phase} />
              </div>
            )}
            {notice && (
              <p className="text-sm text-text-tertiary">{notice}</p>
            )}
            {error && (connected || turns.length > 0) && (
              <p className="text-sm text-text-danger">{error}</p>
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6 sm:pb-6">
          {!abajo && (
            <button
              type="button"
              onClick={irAbajo}
              aria-label="Ir al último mensaje"
              className="absolute -top-12 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border-primary bg-background-secondary text-text-secondary shadow-lg transition hover:text-text-primary"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
          <ChatInputCard>
            <ChatConfigBar config={config} onSelect={setConfigOption} />
            <ChatInput
              onSubmit={send}
              busy={busy}
              workingDir={cwd}
              withImages
              models={models}
              currentModel={currentModel}
              onModelChange={setModel}
              placeholder={connected ? "Sigue la conversación…" : "Conectando con el agente…"}
            />
          </ChatInputCard>
        </div>
      </div>
    </MainPanelLayout>
  );
}
