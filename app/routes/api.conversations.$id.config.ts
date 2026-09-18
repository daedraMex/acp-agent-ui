/** POST /api/conversations/:id/config — cambia modelo, modo, esfuerzo, etc. */
import { data } from "react-router";
import type { Route } from "./+types/api.conversations.$id.config";
import { setConversationConfig } from "~/.server/acp";

export async function action({ params, request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "method not allowed" }, { status: 405 });
  }
  const body = (await request.json().catch(() => null)) as {
    optionId?: string;
    value?: string;
  } | null;
  if (!body?.optionId || typeof body.value !== "string") {
    return data({ error: "faltan optionId o value" }, { status: 400 });
  }
  try {
    const options = await setConversationConfig(params.id, body.optionId, body.value);
    if (!options) return data({ error: "conversación no encontrada" }, { status: 404 });
    return data({ options });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 400 });
  }
}
