/**
 * La conversación. El loader entrega los mensajes ya ocurridos (por si
 * recargas), y de ahí en adelante el hilo lo alimenta el SSE.
 */
import { useEffect, useRef } from "react";
import { useLocation, useLoaderData } from "react-router";
import type { Route } from "./+types/chat";
import { MainPanelLayout } from "~/components/Layout/MainPanelLayout";
import { ChatInputCard } from "~/components/ChatInputCard";
import { ChatInput } from "~/components/ChatInput";
import { ConnectingState } from "~/components/ConnectingState";
import {
  AssistantMessageItem,
  ConversationArea,
  UserMessageItem,
} from "~/components/Conversation";
import { useAcpStream, type Turn } from "~/hooks/useAcpStream";
import { config, getConversation, getMessages } from "~/.server/acp";

export async function loader({ params }: Route.LoaderArgs) {
  const conversation = getConversation(params.id);
  if (!conversation) {
    throw new Response("Esa conversación ya no existe", { status: 404 });
  }
  return {
    id: params.id,
    cwd: config.cwd,
    title: conversation.title,
    messages: getMessages(params.id).map((m) => ({ role: m.role, text: m.text, at: m.at })),
  };
}

// Cada conversación necesita su propio estado: sin la key, React reusa la
// instancia al navegar entre /c/:id y el hilo anterior se queda pegado.
export default function Chat() {
  const { id } = useLoaderData<typeof loader>();
  return <ChatView key={id} />;
}

function ChatView() {
  const { id, cwd, messages } = useLoaderData<typeof loader>();
  const location = useLocation();
  const firstMessage = (location.state as { firstMessage?: string } | null)?.firstMessage;
  const { turns, busy, connected, phase, error, send } = useAcpStream(
    id,
    messages as Turn[]
  );
  const sentFirst = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const lastUserText = [...turns].reverse().find((t) => t.role === "user")?.text;

  // El primer mensaje viene del Hub; se manda una sola vez y en cuanto el
  // agente terminó de conectarse.
  useEffect(() => {
    if (!firstMessage || sentFirst.current || !connected) return;
    sentFirst.current = true;
    void send(firstMessage);
  }, [firstMessage, connected, send]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  return (
    <MainPanelLayout>
      <div className="flex h-full min-h-0 flex-col">
        <ConversationArea>
          {!connected && turns.length === 0 && (
            <ConnectingState phase={phase} error={error} />
          )}
          {turns.map((turn, i) =>
            turn.role === "user" ? (
              <UserMessageItem key={i} turn={turn} />
            ) : (
              <AssistantMessageItem
                key={i}
                turn={turn}
                busy={busy && i === turns.length - 1}
                showActions={i === turns.length - 1}
                onRegenerate={lastUserText ? () => void send(lastUserText) : undefined}
              />
            )
          )}

          {busy && turns[turns.length - 1]?.role === "user" && (
            <div className="flex gap-1 pl-12">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-text-caption)]"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
          {error && (connected || turns.length > 0) && (
            <p className="text-sm text-[var(--color-danger-text)]">{error}</p>
          )}
          <div ref={bottom} />
        </ConversationArea>

        <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6 sm:pb-6">
          <ChatInputCard>
            <ChatInput
              onSubmit={send}
              busy={busy}
              workingDir={cwd}
              placeholder={connected ? "Sigue la conversación…" : "Conectando con el agente…"}
            />
          </ChatInputCard>
        </div>
      </div>
    </MainPanelLayout>
  );
}
