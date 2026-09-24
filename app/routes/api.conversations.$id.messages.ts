/**
 * GET /api/conversations/:id/messages — una página del historial.
 * POST /api/conversations/:id/messages — encola un turno (texto y/o imágenes).
 */
import { data } from "react-router";
import type { Route } from "./+types/api.conversations.$id.messages";
import { askConversation, getMessagesWindow } from "~/.server/acp";
import type { ImagePayload } from "~/hooks/useAcpStream";

const MAX_IMAGES = 4;
// ~15 MB por imagen en base64 (4/3 del binario).
const MAX_IMAGE_B64 = 20_000_000;

/**
 * La ventana de historial. Sin `before`, los últimos `limit` mensajes; con
 * él, los `limit` más nuevos anteriores a ese seq (1-based). Responde desde
 * la memoria del hilo abierto o desde la copia en disco: no despierta la caja.
 */
export async function loader({ params, request }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams;
  let before: number | null = null;
  if (q.has("before")) {
    before = Number(q.get("before"));
    if (!Number.isInteger(before) || before < 1) {
      return data({ error: "before inválido: un entero ≥ 1" }, { status: 400 });
    }
  }
  let limit = 50;
  if (q.has("limit")) {
    limit = Number(q.get("limit"));
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return data({ error: "limit inválido: 1..200" }, { status: 400 });
    }
  }
  const w = getMessagesWindow(params.id, before, limit);
  // Sin cola ni historia en disco: ese hilo ni está abierto ni existe aquí.
  if (w.messages.length === 0 && !w.hasMore && before === null) {
    return data({ error: "sin historial para ese hilo" }, { status: 404 });
  }
  return data(w);
}

export async function action({ request, params }: Route.ActionArgs) {
  const body = (await request.json().catch(() => null)) as {
    text?: string;
    images?: ImagePayload[];
  } | null;
  const text = body?.text ? String(body.text).trim() : "";
  const images = Array.isArray(body?.images) ? body.images : [];
  if (!text && images.length === 0) {
    return data({ error: "el mensaje está vacío" }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return data({ error: `máximo ${MAX_IMAGES} imágenes por mensaje` }, { status: 400 });
  }
  for (const img of images) {
    if (typeof img?.data !== "string" || typeof img?.mimeType !== "string") {
      return data({ error: "imagen inválida (faltan datos)" }, { status: 400 });
    }
    if (!img.mimeType.startsWith("image/")) {
      return data({ error: `formato no soportado: ${img.mimeType}` }, { status: 400 });
    }
    if (img.data.length > MAX_IMAGE_B64) {
      return data({
        error: `la imagen pesa ~${Math.round(img.data.length * 0.75 / 1024 / 1024)} MB; el máximo es 15 MB`,
      }, { status: 400 });
    }
  }


  const ok = askConversation(params.id, text, images);
  if (!ok) return data({ error: "conversation not found" }, { status: 404 });
  return data({ queued: true });
}
