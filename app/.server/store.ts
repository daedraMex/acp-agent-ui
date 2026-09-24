/**
 * El historial que es nuestro.
 *
 * El agente guarda los hilos en su caja y los re-playa por `session/load` cada
 * vez que se abren. Esa copia vale mientras hay sesión viva: sin ella, la app
 * no tiene de dónde pintar un hilo sin despertar la caja — y la caja cobra por
 * estar despierta. Aquí se guarda lo que pasa por la app (el replay y cada
 * turno) para que el historial se lea de disco. Es la base de la carga por
 * cola: sin esto no hay query que armar.
 *
 * Formato: jsonl, un mensaje por línea. La secuencia es el orden de las
 * líneas; appender es barato y un corte a media escritura no corrompe el
 * archivo. Los snapshots (replay) se escriben a un temporal y se renombran.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { StoredMessage } from "./acp";

const MESSAGES_DIR = process.env.ACP_MESSAGES_DIR ?? ".data/messages";

/** El archivo de un hilo. El id del agente es un UUID; se limpia por si acaso. */
function archivoDe(id: string): string {
  return join(MESSAGES_DIR, `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.jsonl`);
}

/** Lo que hay en disco de un hilo. Sin archivo (o roto) no hay historia: `[]`. */
export function leerMensajes(id: string): StoredMessage[] {
  try {
    const raw = readFileSync(archivoDe(id), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as StoredMessage);
  } catch {
    return [];
  }
}

/**
 * Snapshot completo: lo que el agente acaba de re-playar reemplaza lo de
 * disco. El replay no trae ids de mensaje, así que no hay dedupe posible: la
 * copia es "lo último que vimos", no una unión. Atómico: temporal + rename.
 */
export function guardarMensajes(id: string, msgs: StoredMessage[]): void {
  try {
    const f = archivoDe(id);
    mkdirSync(dirname(f), { recursive: true });
    const tmp = `${f}.tmp`;
    writeFileSync(tmp, msgs.map((m) => JSON.stringify(m)).join("\n") + (msgs.length ? "\n" : ""));
    renameSync(tmp, f);
  } catch (e) {
    console.warn("[store] no pude guardar el hilo:", String(e).slice(0, 120));
  }
}

/** Los mensajes de un turno, añadidos al final. Crea el archivo si no existe. */
export function añadirMensajes(id: string, msgs: StoredMessage[]): void {
  if (msgs.length === 0) return;
  try {
    const f = archivoDe(id);
    mkdirSync(dirname(f), { recursive: true });
    appendFileSync(f, msgs.map((m) => JSON.stringify(m)).join("\n") + "\n");
  } catch (e) {
    console.warn("[store] no pude añadir al hilo:", String(e).slice(0, 120));
  }
}

/** Lo que responde una página de historial. */
export interface VentanaDeMensajes {
  messages: StoredMessage[];
  hasMore: boolean;
  /** Cursor de la página anterior: el seq del más viejo devuelto, o null. */
  nextBefore: number | null;
}

/**
 * La ventana de lectura: los `limit` mensajes más nuevos con seq < `before`
 * (sin `before`, los últimos `limit`). El seq es la posición 1-based en el
 * jsonl, así que el cursor de una página es la línea del mensaje más viejo
 * que devolvió.
 */
export function ventanaDe(
  msgs: StoredMessage[],
  before: number | null,
  limit: number
): VentanaDeMensajes {
  const total = msgs.length;
  const corte = before === null ? total : Math.min(Math.max(0, before - 1), total);
  const inicio = Math.max(0, corte - limit);
  return {
    messages: msgs.slice(inicio, corte),
    hasMore: inicio > 0,
    nextBefore: inicio > 0 ? inicio + 1 : null,
  };
}

export function leerVentana(id: string, before: number | null, limit: number): VentanaDeMensajes {
  return ventanaDe(leerMensajes(id), before, limit);
}
