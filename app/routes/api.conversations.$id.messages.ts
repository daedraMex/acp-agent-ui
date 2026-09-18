/** POST /api/conversations/:id/messages — encola un turno (texto y/o imágenes). */
import { data } from "react-router";
import type { Route } from "./+types/api.conversations.$id.messages";
import { askConversation } from "~/.server/acp";
import type { ImagePayload } from "~/hooks/useAcpStream";

const MAX_IMAGES = 4;
// ~15 MB por imagen en base64 (4/3 del binario).
const MAX_IMAGE_B64 = 20_000_000;

export async function action({ request, params }: Route.ActionArgs) {
  const body = (await request.json().catch(() => null)) as {
    text?: string;
    images?: ImagePayload[];
  } | null;
  const text = body?.text ? String(body.text) : "";
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
