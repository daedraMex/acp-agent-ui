/**
 * Motor ACP del lado servidor — portado de web/server.mjs (SPEC-2).
 *
 * Una conversación = una conexión ACP contra el goose que corre dentro de la
 * caja de EasyBits. El navegador nunca habla ACP: consume los eventos por SSE.
 */
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { client } from "@agentclientprotocol/sdk";
import { createWebSocketStream } from "@agentclientprotocol/sdk/experimental/ws-client";
import { WebSocket } from "ws";
import type { ConfigOption, ConnectPhase, ImagePayload } from "~/hooks/useAcpStream";

// Sin URL no se inventa una: un fallback hardcodeado manda la sesión a la caja de otro y el
// fallo se ve como "el agente no responde" en vez de "te falta configurar esto".
const WS_URL = process.env.ACP_WS_URL ?? "";

// El token del agente REMOTO. `ACP_SECRET` se acepta como alias porque es el nombre que ya
// está en los .env de la gente.
//
// 🔴 NO es el `GOOSE_SERVER__SECRET_KEY` de la caja, como decía este archivo: ése es un
// secreto interno que se genera en cada arranque y nunca sale de la microVM. El de aquí es el
// token del agente — su `embedToken`, o el `ACP_AGENT_TOKEN` que le pusieran al crearlo.
const TOKEN = process.env.ACP_TOKEN ?? process.env.ACP_SECRET ?? "";

// `/data/work` es lo que existe en una caja ghosty-lite y lo único que sobrevive al sueño.
const CWD = process.env.ACP_CWD ?? "/data/work";
const MAX_CONVERSATIONS = Number(process.env.MAX_CONVERSATIONS ?? 10);
const IDLE_MS = Number(process.env.ACP_IDLE_MS ?? 15 * 60 * 1000);

// ---------------------------------------------------------------------------
// Ciclo de vida de la caja del agente (app-owned): se despierta al hablarle y
// se suspende al quedar inactiva.
// ---------------------------------------------------------------------------
// Opcionales, y sin fallback por la misma razón que WS_URL: apuntaban a una caja y un snapshot
// concretos, así que un .env a medias operaba recursos ajenos. Sin ellos esto es un cliente ACP
// normal y el ciclo de vida simplemente no corre.
const AGENT_BOX = process.env.AGENT_BOX_ID ?? "";
const AGENT_SNAPSHOT = process.env.AGENT_SNAPSHOT_ID ?? "";
const EB_KEY =
  process.env.EASYBITS_API_KEY ??
  (() => {
    try {
      return readFileSync("/root/.ebkey", "utf8").trim();
    } catch {
      return null;
    }
  })();

let ebClient: any = null;
async function getEbClient() {
  if (ebClient) return ebClient;
  if (!EB_KEY) return null;
  try {
    // El SDK es opcional: sin él la app funciona, sólo no gestiona la caja.
    // @ts-ignore -- dependencia opcional, puede no estar instalada
    const { EasybitsClient } = await import("@easybits.cloud/sdk");
    ebClient = new EasybitsClient({ apiKey: EB_KEY });
  } catch (e: any) {
    console.warn("[lifecycle] sin SDK/API key:", e.message);
    ebClient = null;
  }
  return ebClient;
}

// Sube una imagen al workspace de la caja del agente. ghosty sólo ve imágenes
// que sean archivos: los bloques `image` del ACP los ignora, pero un
// resource_link a un archivo real llega al LLM (verificado en vivo).
async function uploadImageToBox(
  data: string,
  mimeType: string
): Promise<{ uri: string; path: string; name: string } | null> {
  if (!AGENT_BOX) return null;
  const eb = await getEbClient();
  if (!eb) return null;
  const ext = (mimeType.split("/")[1] ?? "png").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "png";
  const name = `img-${randomUUID()}.${ext}`;
  const dir = `${CWD}/.uploads`;
  const path = `${dir}/${name}`;
  const sb = await eb.sandboxes.get(AGENT_BOX);
  const r = await sb.exec(
    `mkdir -p ${dir} && echo '${data}' | base64 -d > ${path} && stat -c %s ${path}`,
    { timeoutSeconds: 30 }
  );
  if (r.exitCode !== 0 || !/^\d+$/.test(String(r.stdout ?? "").trim())) {
    console.warn("[upload] falló en la caja:", String(r.stderr ?? r.stdout).slice(0, 120));
    return null;
  }
  return { uri: `file://${path}`, path, name };
}

async function deleteUploadedFiles(paths: string[]) {
  if (!AGENT_BOX || paths.length === 0) return;
  const eb = await getEbClient();
  if (!eb) return;
  try {
    const sb = await eb.sandboxes.get(AGENT_BOX);
    await sb.exec(`rm -f ${paths.join(" ")}`, { timeoutSeconds: 20 });
  } catch (e: any) {
    console.warn("[upload] limpieza falló:", e.message);
  }
}

/**
 * Despierta la caja del agente ANTES de conectar. Es específico de EasyBits y OPCIONAL: sin
 * `EASYBITS_API_KEY` + `AGENT_BOX_ID` esto no corre y el cliente funciona igual contra
 * cualquier agente ACP — sólo que sin despertarlo él (el agente tiene que estar ya arriba).
 */
export async function ensureAgentBox() {
  if (!AGENT_BOX) return null; // cliente ACP genérico: no hay caja que gestionar
  const eb = await getEbClient();
  if (!eb) {
    console.warn("[lifecycle] sin SDK — no gestiono ciclo de vida");
    return null;
  }
  const sb = await eb.sandboxes.get(AGENT_BOX);
  await sb.refresh();
  console.log(`[lifecycle] caja agente status=${sb.status}`);
  if (sb.status === "running") {
    await sb.extend(3600).catch((e: Error) =>
      console.warn("[lifecycle] extend falló:", e.message)
    );
    return sb;
  }
  if (sb.status === "suspended") await sb.resume().catch(() => {});
  try {
    await sb.waitUntilReady(90_000);
    console.log("[lifecycle] caja despierta");
    return sb;
  } catch {
    // caja perdida → self-heal desde snapshot
  }
  // El self-heal desde snapshot creaba una caja NUEVA —con URL nueva— y acto seguido se
  // conectaba a la ACP_WS_URL vieja, así que nunca pudo funcionar: una recuperación que miente
  // es peor que ninguna. Sólo se intenta si hay snapshot configurado, y se avisa de que la URL
  // hay que cambiarla a mano.
  if (!AGENT_SNAPSHOT) {
    throw new Error(
      "El agente no despertó y no hay AGENT_SNAPSHOT_ID para recrearlo. Levántalo de nuevo y actualiza ACP_WS_URL."
    );
  }
  console.warn("[lifecycle] caja perdida; self-heal desde snapshot");
  const [child] = await eb.sandboxes.forkFromSnapshot(AGENT_SNAPSHOT, {});
  await child.waitUntilReady(90_000);
  console.warn(
    `[lifecycle] caja recreada (${child.id}) — ⚠️ su URL es otra: actualiza ACP_WS_URL o seguirás hablando con la anterior`
  );
  return child;
}

async function suspendAgentBox() {
  if (!AGENT_BOX) return;
  const eb = await getEbClient();
  if (!eb) return;
  try {
    const sb = await eb.sandboxes.get(AGENT_BOX);
    await sb.refresh();
    if (sb.status === "running") {
      await sb.suspend();
      console.log("[lifecycle] caja suspendida (idle)");
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Tipos de los eventos que viajan al navegador
// ---------------------------------------------------------------------------
export type AcpEvent =
  | { type: "started"; sessionId: string }
  | { type: "chunk"; text: string }
  | { type: "thought"; text: string }
  | {
      // Una herramienta del agente: tool_call la crea, tool_call_update la
      // avanza. El mismo id llega varias veces; el navegador hace upsert.
      type: "tool";
      id: string;
      title?: string;
      kind?: string;
      status?: string;
      path?: string;
      input?: unknown;
      output?: string;
    }
  | { type: "usage"; used: number; size: number; cost: number }
  | { type: "config"; options: ConfigOption[] }
  | { type: "done"; stopReason: string; usage: unknown }
  | { type: "error"; message: string }
  // Por dónde va la conexión, para que la UI no diga "Conectando…" a secas
  // durante los ~15s que tarda despertar una caja dormida.
  | { type: "status"; phase: ConnectPhase }
  | { type: "closed" };

// Del `content` de un tool_call_update (bloques tipo {type:"content",
// content:{type:"text",text:…}}) saca el texto legible para la UI.
function toolOutputText(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const text = content
    .map((b: any) => (typeof b?.content?.text === "string" ? b.content.text : ""))
    .join("");
  return text.trim() ? text : undefined;
}

// Normaliza los configOptions del agente a la forma que consume la UI.
// Los agentes no coinciden en los nombres de campo (ghosty manda `name` y
// `currentValue`; el spec dice `title` y `selected`), así que se leen ambos.
function configOptionsToWire(raw: unknown): ConfigOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((o: any) => {
    if (!o || o.type !== "select" || typeof o.id !== "string") return [];
    const values = (Array.isArray(o.options) ? o.options : []).flatMap((v: any) =>
      v && typeof v.value === "string"
        ? [{ value: v.value as string, title: typeof v.name === "string" ? v.name : typeof v.title === "string" ? v.title : undefined }]
        : []
    );
    return [
      {
        id: o.id as string,
        name: typeof o.name === "string" ? o.name : o.id,
        category: typeof o.category === "string" ? o.category : null,
        description: typeof o.description === "string" ? o.description : null,
        currentValue:
          typeof o.currentValue === "string"
            ? o.currentValue
            : typeof o.selected === "string"
              ? o.selected
              : null,
        values,
      },
    ];
  });
}

// El modelo con visión que corresponde a cada familia, en orden de
// preferencia. Se matchea contra `${modelo} ${provider}` (el modelo elegido
// manda) y contra la lista de modelos que el agente ofrece: si la familia no
// tiene candidato con visión disponible, no se cambia nada y el turno sigue
// con el modelo actual (DeepSeek de texto, por ejemplo, no ve imágenes).
const VISION_MODEL_CANDIDATES: { family: RegExp; models: RegExp[] }[] = [
  // deepseek-flash es el único de la familia que goose marca con visión.
  { family: /deepseek/i, models: [/deepseek.*flash/i] },
  { family: /qwen|dashscope|aliyun|bailian/i, models: [/qwen.*(vl|max)/i, /^qwen3\.\d+-max$/i] },
  { family: /gpt|openai|modelstudio/i, models: [/gpt-5\.6-luna/i, /gpt-5\.6/i, /gpt-5\.5/i, /gpt-4o/i] },
  { family: /claude|anthropic/i, models: [/claude.*(sonnet|opus|haiku)/i] },
  { family: /gemini|google/i, models: [/gemini/i] },
  { family: /glm|zai|zhipu/i, models: [/glm-4\.\dv/i, /glm-5/i] },
];

// Cuando el provider elegido no tiene modelo con visión, se prueba con éste,
// que en esta caja trae los Qwen/GLM con llave de DashScope ya configurada.
// Si el agente no lo ofrece o el cambio falla, el turno sigue como estaba.
const VISION_PROVIDER_FALLBACK = {
  provider: "modelstudio-token-plan",
  models: [/^qwen3\.\d+-max$/i, /qwen.*(vl|max)/i, /glm-5/i],
};

// Un turno que se cuelga no debe dejar la conversación en "Pensando…" para
// siempre: cada espera lleva su techo, y al vencer el turno termina con error.
const UPDATE_TIMEOUT_MS = Number(process.env.ACP_UPDATE_TIMEOUT_MS ?? 5 * 60 * 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.ACP_REQUEST_TIMEOUT_MS ?? 60 * 1000);

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(message)), ms);
    timer.unref?.();
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

// Un handshake que no responde no debe dejar la UI esperando para siempre:
// un 401 del WSS (secret ausente) o una caja que no contesta se ven así.
const CONNECT_TIMEOUT_MS = Number(process.env.ACP_CONNECT_TIMEOUT_MS ?? 60_000);

export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  at: number;
}

// ---------------------------------------------------------------------------
// GooseSession — una conexión ACP por conversación.
// ---------------------------------------------------------------------------
class GooseSession extends EventEmitter {
  sessionId: string | null = null;
  busy = false;
  ready = false;
  closed = false;
  phase: ConnectPhase = "waking";
  lastError: string | null = null;
  cost = 0;
  tokens = 0;
  contextSize = 0;
  title = "Nueva conversación";
  createdAt = Date.now();
  updatedAt = Date.now();
  messages: StoredMessage[] = [];
  configOptions: ConfigOption[] = [];

  private conn: any = null;
  private ctx: any = null;
  private session: any = null;
  private agentName = "";
  private queue: { text: string; images?: ImagePayload[]; needsVision?: boolean }[] = [];
  private idleTimer: NodeJS.Timeout | null = null;
  private current: string | null = null;

  constructor(
    private wsUrl: string,
    private secret: string,
    private cwd: string
  ) {
    super();
  }

  private resetIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.closed) return;
    this.idleTimer = setTimeout(() => this.close(), IDLE_MS);
    this.idleTimer.unref?.();
  }

  private setPhase(phase: ConnectPhase) {
    this.phase = phase;
    this.emit("event", { type: "status", phase });
  }

  async connect() {
    try {
      // Sin URL no se intenta nada: el error dice qué falta, en vez de dejar al usuario
      // mirando un spinner y luego un timeout genérico.
      if (!this.wsUrl) {
        throw new Error(
          "Falta ACP_WS_URL. Es el `agentUrl` del agente (wss://…/acp); ponlo en el .env."
        );
      }
      this.setPhase("waking");
      // El fallo de ciclo de vida SÍ se cuenta: antes iba sólo a console.warn y la UI pintaba
      // "Despertando la caja" en verde aunque no se hubiera despertado nada, así que el
      // siguiente error parecía venir de otro sitio.
      await ensureAgentBox().catch((e) => {
        console.warn("[lifecycle] ensureAgentBox:", e.message);
        this.emit("event", {
          type: "warning",
          message: `No pude despertar la caja (${e.message}). Sigo: puede que ya esté arriba.`,
        });
      });
      this.setPhase("connecting");
      let timer: NodeJS.Timeout | null = null;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `El agente no respondió en ${Math.round(CONNECT_TIMEOUT_MS / 1000)}s. Revisa que el agente esté vivo y que ACP_WS_URL sea el suyo.`
              )
            ),
          CONNECT_TIMEOUT_MS
        );
        timer.unref?.();
      });
      await Promise.race([this.handshake(), timeout]);
      if (timer) clearTimeout(timer);
    } catch (e) {
      const raw = (e as Error).message;
      // "Unexpected server response: 401" no le dice nada a quien lo ve.
      this.lastError = /\b401\b/.test(raw)
        ? "El agente rechazó la conexión (401): el token no es el suyo. Es el `embedToken` que devolvió al crearlo — salvo que le hayas puesto un `ACP_AGENT_TOKEN` propio en el `env`, y entonces es ése."
        : /\b(404|502|503)\b/.test(raw)
          ? `Esa URL no está sirviendo un agente (${raw}). Comprueba ACP_WS_URL: la da el propio agente en su campo agentUrl.`
          : raw;
      this.emit("event", { type: "error", message: this.lastError });
    }
  }

  private async handshake() {
    // El token va por las DOS vías que acepta un agente ACP, y por eso funciona con cualquiera:
    //   · `?token=` en la URL — lo único que todo cliente sabe pasar (un WebSocket de navegador
    //     no puede poner cabeceras), y lo que espera ghosty-lite.
    //   · `Authorization: Bearer` — lo correcto cuando el cliente es Node, como éste.
    // Antes iba por `X-Secret-Key`, que el front de la caja DESCARTA: 401 garantizado, con un
    // mensaje que además culpaba al secreto interno de goose. Medido: ?token= → 200,
    // X-Secret-Key con el mismo valor → 401.
    // Si la URL ya trae el token, se respeta: quien la copió entera del panel no se queda fuera.
    const target = new URL(this.wsUrl);
    if (this.secret && !target.searchParams.has("token")) {
      target.searchParams.set("token", this.secret);
    }
    const headers = this.secret ? { Authorization: `Bearer ${this.secret}` } : undefined;
    const stream = createWebSocketStream(target.toString(), { WebSocket, headers } as any);

    // El handler de permisos se registra ANTES de conectar.
    const app = client({ name: "acp-web3" } as any);
    app.onRequest("session/request_permission", ({ params }: any) => {
      const options = params.options ?? [];
      const allow = options.find((o: any) => o.kind === "allow_once") ?? options[0];
      const optionId = allow?.optionId ?? options[0]?.optionId;
      // Se auto-aprueba (tema de la sesión 4), pero la petición se enseña.
      this.emit("event", {
        type: "tool",
        id: params.toolCall?.toolCallId ?? "?",
        title: params.toolCall?.title ?? "herramienta",
        status: "pending",
      });
      return { outcome: { outcome: "selected", optionId } };
    });

    this.conn = app.connect(stream);
    this.ctx = this.conn.agent;
    const ctx = this.ctx;
    const init: any = await ctx.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        // Sin terminal del lado del cliente: el agente corre el shell en su
        // propia caja. Con true, goose pide terminal/create y, como no lo
        // implementamos, cada shell termina en failed.
        terminal: false,
      },
    });
    // El agente se identifica; se usa para elegir cómo mandarle imágenes.
    this.agentName = String(init?.agentInfo?.name ?? "").toLowerCase();
    this.setPhase("session");
    this.session = await ctx.buildSession({ cwd: this.cwd, mcpServers: [] }).start();
    this.sessionId = this.session.sessionId;
    this.ready = true;
    // Las opciones de sesión (modelo, modo, esfuerzo…) que el agente anuncia:
    // se guardan para reenviarlas a quien llegue tarde y para la UI.
    this.configOptions = configOptionsToWire(this.session.newSessionResponse?.configOptions);
    this.emit("event", { type: "started", sessionId: this.sessionId });
    if (this.configOptions.length > 0) {
      this.emit("event", { type: "config", options: this.configOptions });
    }
    this.resetIdle();
    this.pump();
  }

  ask(text: string, images?: ImagePayload[]) {
    if (this.closed) return;
    this.resetIdle();
    this.messages.push({ role: "user", text, at: Date.now() });
    if (this.messages.length === 1) {
      this.title = text ? text.slice(0, 60) : (images?.length ? "Imagen adjunta" : "Nueva conversación");
    }
    this.updatedAt = Date.now();
    this.queue.push({ text, images, needsVision: (images?.length ?? 0) > 0 });
    this.pump();
  }

  private optionValue(id: string): string | null {
    return this.configOptions.find((o) => o.id === id)?.currentValue ?? null;
  }

  private optionValues(id: string): string[] {
    return this.configOptions.find((o) => o.id === id)?.values.map((v) => v.value) ?? [];
  }

  // Si el mensaje trae imágenes, cambia al modelo con visión de la familia
  // elegida (deepseek→su VL, gpt→su gpt multimodal, qwen→su max…). Si la
  // familia no tiene candidato, se intenta con cualquier modelo con visión
  // del catálogo (qwen primero). Devuelve false si no hay ninguno y el turno
  // sigue con el modelo actual.
  private async ensureVisionModel(): Promise<boolean> {
    const provider = this.optionValue("provider") ?? "";
    const current = this.optionValue("model") ?? "";
    const offered = this.optionValues("model");
    const key = `${current} ${provider}`;
    const entry = VISION_MODEL_CANDIDATES.find((c) => c.family.test(key));
    if (entry) {
      // Si el modelo actual ya ve imágenes, no se toca nada: cambiarlo a otro
      // candidato puede caer en uno que el agente marca sin visión.
      if (entry.models.some((pattern) => pattern.test(current))) return true;
      for (const pattern of entry.models) {
        const hit = offered.find((m) => pattern.test(m));
        if (hit && hit !== current) {
          await this.setConfigOption("model", hit);
          return true;
        }
      }
    }
    // El provider elegido no tiene visión: se prueba el provider de respaldo
    // (Model Studio con los Qwen), y dentro de él, el modelo con visión.
    if (
      provider !== VISION_PROVIDER_FALLBACK.provider &&
      this.optionValues("provider").includes(VISION_PROVIDER_FALLBACK.provider)
    ) {
      try {
        await this.setConfigOption("provider", VISION_PROVIDER_FALLBACK.provider);
        const fallbackModels = this.optionValues("model");
        for (const pattern of VISION_PROVIDER_FALLBACK.models) {
          const hit = fallbackModels.find((m) => pattern.test(m));
          if (hit && hit !== current) {
            await this.setConfigOption("model", hit);
            return true;
          }
        }
      } catch {
        // El agente no aceptó el cambio: se sigue con lo que había.
      }
    }
    // Último recurso: cualquier modelo con visión del catálogo actual.
    for (const other of VISION_MODEL_CANDIDATES) {
      for (const pattern of other.models) {
        const hit = offered.find((m) => pattern.test(m));
        if (hit && hit !== current) {
          await this.setConfigOption("model", hit);
          return true;
        }
      }
    }
    return false;
  }

  // Cambia una opción de sesión (modelo, modo, esfuerzo…) vía ACP.
  // ghosty (y el spec v1) esperan { sessionId, configId, value }.
  async setConfigOption(optionId: string, value: string): Promise<ConfigOption[]> {
    if (this.closed || !this.ready || !this.sessionId) {
      throw new Error("la sesión del agente no está lista");
    }
    this.resetIdle();
    const res: any = await this.ctx.request("session/set_config_option", {
      sessionId: this.sessionId,
      configId: optionId,
      value,
    });
    this.configOptions = configOptionsToWire(res?.configOptions);
    this.emit("event", { type: "config", options: this.configOptions });
    return this.configOptions;
  }

  private pump() {
    if (!this.ready || this.busy || this.queue.length === 0) return;
    this.busy = true;
    const item = this.queue.shift()!;
    let turnUsage: unknown = null;
    let answer = "";
    const uploaded: string[] = [];
    // Si el turno con imagen cambió el modelo, al terminar se regresa al de
    // antes: texto con el modelo de texto, imágenes con el que ve.
    let visionSwitchFrom: string | null = null;

    (async () => {
      // Con imágenes, primero ajusta el modelo al que ve de la familia elegida.
      if (item.needsVision) {
        const before = this.optionValue("model");
        try {
          await withTimeout(this.ensureVisionModel(), REQUEST_TIMEOUT_MS, "cambiar el modelo tardó demasiado");
        } catch {
          // Sin candidato o sin permiso: el turno sigue con el modelo actual.
        }
        if (this.optionValue("model") !== before) {
          visionSwitchFrom = before;
        }
        if (this.closed) {
          this.busy = false;
          this.pump();
          return;
        }
      }
      // El prompt viaja como content blocks: texto y un bloque por imagen.
      // goose y los agentes spec-compliant procesan el bloque `image` estándar.
      // ghosty lo ignora y sólo ve imágenes que sean archivos de su workspace:
      // para él se suben a la caja (EasyBits) y se referencian con
      // resource_link. Ambos caminos verificados en vivo.
      const blocks: any[] = [];
      if (item.text) blocks.push({ type: "text", text: item.text });
      if (this.agentName.includes("ghosty")) {
        for (const img of item.images ?? []) {
          const ref = await uploadImageToBox(img.data, img.mimeType).catch(() => null);
          if (ref) {
            uploaded.push(ref.path);
            blocks.push({
              type: "resource_link",
              uri: ref.uri,
              mimeType: img.mimeType,
              title: ref.name,
            });
          } else {
            blocks.push({ type: "image", data: img.data, mimeType: img.mimeType });
          }
        }
      } else {
        for (const img of item.images ?? []) {
          blocks.push({ type: "image", data: img.data, mimeType: img.mimeType });
        }
      }
      const promptP = this.session.prompt(blocks);
      while (true) {
        const m: any = await withTimeout(
          this.session.nextUpdate(),
          UPDATE_TIMEOUT_MS,
          "el agente se quedó en silencio (timeout)"
        );
        if (m.kind === "stop") break;
        if (m.kind !== "session_update") continue;
        const u = m.update ?? {};
        if (u.sessionUpdate === "agent_message_chunk") {
          const t = u.content?.text ?? "";
          if (t) {
            answer += t;
            this.emit("event", { type: "chunk", text: t });
          }
        } else if (u.sessionUpdate === "agent_thought_chunk") {
          const t = u.content?.text ?? "";
          if (t) this.emit("event", { type: "thought", text: t });
        } else if (
          u.sessionUpdate === "tool_call" ||
          u.sessionUpdate === "tool_call_update"
        ) {
          // En el update sólo viajan los campos que cambiaron; los null se omiten.
          const ev: AcpEvent = { type: "tool", id: u.toolCallId };
          if (u.title) ev.title = u.title;
          if (u.kind) ev.kind = u.kind;
          if (u.status) ev.status = u.status;
          const path = u.locations?.[0]?.path;
          if (path) ev.path = path;
          if (u.rawInput) ev.input = u.rawInput;
          const output = toolOutputText(u.content);
          if (output) ev.output = output;
          this.emit("event", ev);
        } else if (u.sessionUpdate === "config_option_update") {
          // El agente puede cambiar opciones por su cuenta (o confirmar un
          // cambio): se reenvía el set completo para mantener la UI al día.
          const options = configOptionsToWire((u as any).configOptions);
          if (options.length > 0) {
            this.configOptions = options;
            this.emit("event", { type: "config", options });
          }
        } else if (u.sessionUpdate === "usage_update") {
          const used = u.used ?? 0;
          const size = u.size ?? 0;
          const cost = u.cost?.amount ?? 0;
          this.tokens = used;
          this.contextSize = size;
          this.cost += cost;
          turnUsage = { used, size, cost };
          this.emit("event", { type: "usage", used, size, cost });
        }
      }
      const r = await promptP;
      this.messages.push({ role: "assistant", text: answer, at: Date.now() });
      this.updatedAt = Date.now();
      this.emit("event", { type: "done", stopReason: r.stopReason, usage: turnUsage });
      // El turno con imagen terminó: se regresa al modelo que había antes,
      // para que el texto siga con su modelo de siempre (si el usuario no
      // lo cambió a mano entretanto).
      if (visionSwitchFrom && this.optionValue("model") !== visionSwitchFrom) {
        try {
          await this.setConfigOption("model", visionSwitchFrom);
        } catch {
          // Sin revertir no pasa nada: la píldora muestra el modelo real.
        }
      }
    })()
      .catch((e) => this.emit("event", { type: "error", message: e.message }))
      .finally(() => {
        // Las imágenes subidas al workspace de la caja ya cumplieron su turno.
        if (uploaded.length > 0) {
          deleteUploadedFiles(uploaded).catch(() => {});
        }
        this.busy = false;
        this.pump();
      });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    try {
      this.session?.dispose();
    } catch {}
    try {
      this.conn?.close?.();
    } catch {}
    this.emit("event", { type: "closed" });
  }
}

// ---------------------------------------------------------------------------
// Registro de conversaciones. Vive en el módulo, así que sobrevive entre
// peticiones — pero no entre reinicios del server (el POC no persiste).
// ---------------------------------------------------------------------------
const conversations = new Map<string, GooseSession>();

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  tokens: number;
  contextSize: number;
  cost: number;
  busy: boolean;
  closed: boolean;
}

const summarize = (id: string, s: GooseSession): ConversationSummary => ({
  id,
  title: s.title,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
  messageCount: s.messages.length,
  tokens: s.tokens,
  contextSize: s.contextSize,
  cost: s.cost,
  busy: s.busy,
  closed: s.closed,
});

export async function createConversation() {
  if (conversations.size >= MAX_CONVERSATIONS) {
    throw new Error("too many conversations");
  }
  // La caja se despierta DENTRO de connect(): así el navegador aterriza en la
  // conversación al instante y ve las fases, en vez de esperar el POST a ciegas.
  const id = randomUUID();
  const s = new GooseSession(WS_URL, TOKEN, CWD);
  void s.connect();
  conversations.set(id, s);
  s.on("event", (e: AcpEvent) => {
    if (e.type === "closed" && conversations.get(id) === s) conversations.delete(id);
  });
  return id;
}

export function getConversation(id: string) {
  return conversations.get(id) ?? null;
}

export function listConversations(): ConversationSummary[] {
  return [...conversations.entries()]
    .map(([id, s]) => summarize(id, s))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getMessages(id: string): StoredMessage[] {
  return conversations.get(id)?.messages ?? [];
}

export function closeConversation(id: string) {
  const s = conversations.get(id);
  if (!s) return false;
  s.close();
  conversations.delete(id);
  return true;
}

export function askConversation(id: string, text: string, images?: ImagePayload[]) {
  const s = conversations.get(id);
  if (!s) return false;
  s.ask(text, images);
  markActivity();
  return true;
}

/** Cambia una opción de configuración (modelo, modo, esfuerzo…) de una conversación. */
export async function setConversationConfig(id: string, optionId: string, value: string) {
  const s = conversations.get(id);
  if (!s) return null;
  markActivity();
  return s.setConfigOption(optionId, value);
}

/** Suscribe a los eventos de una conversación; devuelve la baja. */
export function subscribe(id: string, onEvent: (e: AcpEvent) => void) {
  const s = conversations.get(id);
  if (!s) return null;
  const handler = (e: AcpEvent) => onEvent(e);
  s.on("event", handler);
  // Quien llega tarde (recarga, segunda pestaña) no vio el started original:
  // se le repite para que el input no se quede en "Conectando…", junto con
  // las opciones de configuración si el agente las anunció.
  if (s.ready && s.sessionId && !s.closed) {
    onEvent({ type: "started", sessionId: s.sessionId });
    if (s.configOptions.length > 0) {
      onEvent({ type: "config", options: s.configOptions });
    }
  } else if (!s.closed) {
    onEvent({ type: "status", phase: s.phase });
    if (s.lastError) onEvent({ type: "error", message: s.lastError });
  }
  return () => s.off("event", handler);
}

export const config = { wsUrl: WS_URL, cwd: CWD, agentBox: AGENT_BOX, idleMs: IDLE_MS };

// ---------------------------------------------------------------------------
// Suspend al idle: sin sockets SSE ni turnos en vuelo durante IDLE_MS.
// ---------------------------------------------------------------------------
let lastActivity = Date.now();
let activeSse = 0;
export const markActivity = () => (lastActivity = Date.now());
export const openSse = () => {
  activeSse++;
  markActivity();
};
export const closeSse = () => {
  activeSse = Math.max(0, activeSse - 1);
};

setInterval(() => {
  const busy = [...conversations.values()].some((s) => s.busy);
  if (activeSse === 0 && !busy && Date.now() - lastActivity > IDLE_MS) {
    suspendAgentBox().catch(() => {});
    lastActivity = Date.now();
  }
}, 30_000).unref?.();
