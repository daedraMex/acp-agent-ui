# Dónde estamos

> Actualizado el 22 de septiembre de 2026. Este archivo es la foto operativa: qué corre, dónde, y qué
> hay que saber para retomar sin releer todo. Lo conceptual va en [`docs/`](docs/).

## Lo que funciona hoy

Un turno completo desde el navegador: llega al agente, responde en markdown y reporta tokens y costo.
**Las imágenes van como bloques ACP estándar y el agente las ve** (auto-switch a `deepseek-flash` con
ida y vuelta al terminar el turno). La **memoria la tiene el agente**: `session/list`/`session/load`,
una sola sesión viva, respaldo del `sessions.db` con `scripts/backup-sessions.mjs`/`restore-sessions.mjs`,
títulos y catálogo de modelos recordados en `.data/`.

| Pieza | Dónde | Estado |
|---|---|---|
| Interfaz | la raíz de este repo | ✅ SSR, rutas del hub/chat/sessions |
| Motor ACP | `app/.server/acp.ts` | ✅ una sola sesión viva, agente como fuente de verdad |
| SSE | `app/routes/api.conversations.$id.events.ts` | ✅ con latido y replay para recargas |
| Agente | caja `agente-goose` (`sb_ca6d7dd0-…`), goose 1.51.0 | ✅ `goose-acp.service` |
| LLM | DeepSeek directo (`api.deepseek.com`), `deepseek-chat`/`deepseek-flash` | ✅ con visión (`deepseek-flash`) |
| Respaldo | `scripts/backup-sessions.mjs` + `restore-sessions.mjs` | ✅ `sessions.db` fuera de la caja |
| Repo | fork `daedraMex/acp-agent-ui`, upstream `blissito/acp-agent-ui` | público |

## Para arrancar

```sh
npm install
npm run dev        # necesita .env
```

El `.env` (fuera del repo) lleva `ACP_WS_URL`, `ACP_SECRET`, `ACP_CWD`, `AGENT_BOX_ID` y
`EASYBITS_API_KEY`. **Sin la llave la app funciona pero no gestiona la caja** (el log dice
"sin SDK"); `@easybits.cloud/sdk` ya es dependencia.

Si la caja muere, [`scripts/new-goose-box.mjs`](scripts/new-goose-box.mjs) levanta otra de cero
en ~25 s (crear, instalar goose, LLM = EasyBits, `/data/work`, unidad, expose) y reescribe el
`.env`. Sólo necesita `EASYBITS_API_KEY` en el entorno. Pasó el 2 sep: la primera `goose-demo`
desapareció del host sin aviso (404 "sandbox not found") mientras figuraba `running`.

## Lo que hay que saber

- **EasyBits inyecta `OPENAI_BASE_URL=https://www.easybits.cloud/api/v2/compute/v1` + `OPENAI_API_KEY` como
  ambiente en los dev-boxes.** Ghosty se niega a mandar credenciales ambientales a endpoints custom
  ("must be bound explicitly"), así que una caja ghosty reanudada por sandbox-agent muere en cada turno
  si no se relanza con `env -u OPENAI_BASE_URL -u OPENAI_API_KEY`. La unidad de goose está blindada:
  sus `EnvironmentFile` pisan las ambientales.

- **Visión por DeepSeek.** `deepseek-flash` (el `deepseek-chat` actual) es multimodal y ve imágenes;
  goose le pasa los bloques `image` del ACP tal cual. Cuando un mensaje trae imágenes, el server cambia
  solo al modelo con visión de la familia (`ensureVisionModel` en `acp.ts`). La caja vieja de ghosty
  (`agente-acp`) queda suspendida como respaldo; ghosty ignoraba los bloques `image` y exigía el
  workaround de subir la imagen al workspace + `resource_link` (sigue en `acp.ts`, activado por el
  nombre del agente).

- **Las herramientas y el pensamiento se ven.** `tool_call` / `tool_call_update` llegan al
  navegador como evento `tool` (upsert por id) y `agent_thought_chunk` como `thought`; el chat
  pinta el pensamiento colapsado y una fila por herramienta con su estado. Hecho el 2 sep para la
  sesión 2.
- **`terminal: false` en `initialize`.** Con `true` goose pide `terminal/create` al cliente y,
  como no lo implementamos, cada `shell` termina en `failed`. El shell corre en la caja.
- **`POST /extend` da 500 en una caja con TTL vencido** (viva por la siesta): el host suma sobre
  el `expiresAt` viejo y rechaza con 400, y EasyBits lo convierte en 500. Arreglos en rama en
  `sandbox-host` y `easybits`, pendientes de desplegar.

- **La caja se suspende sola** al quedar inactiva. La despierta el propio `Upgrade` del WebSocket
  (verificado el 1 sep 2026); `ensureAgentBox` sólo extiende el TTL, suspende al ocio y avisa si la
  caja ya no existe. La unidad de systemd relanza `goose serve` al arrancar. Antes de eso, cada
  suspensión dejaba la app muerta con un 401 que parecía de credenciales.
- **Node 22.16 contra 22.22.** React Router pide ≥ 22.22 y avisa en cada arranque; funciona igual.
  Vale la pena subir la versión para dejar de leer el aviso.
- **Nada se persiste.** Las conversaciones viven en un `Map` del proceso: reiniciar el server las
  borra. Es justo el tema de la [sesión 3](docs/spec3-revivir.md).
- **El permiso se auto-aprueba.** `session/request_permission` se acepta solo, en
  `app/.server/acp.ts`. Tema de la [sesión 4](docs/spec4-permisos-extensiones.md).
- **El botón de parar no interrumpe.** Está dibujado; falta `session/cancel`.
- **Los métodos son `_unstable`.** Todo lo que llene las vistas vacías lleva ese sufijo en goose:
  pueden cambiar sin aviso.

## Lo siguiente

Las sesiones 3 a 6 están planteadas en `docs/`, cada una con lo que ya se sabe del protocolo y lo
que falta decidir. El orden natural es el del temario: primero revivir (sesión 3), porque todo lo
demás se apoya en que el estado sobreviva.

Dos cosas sueltas antes de empezar:

- `.agents/skills/react-router/` viene del scaffold. **No borrar**: en la sesión 1 sirve de
  ejemplo en vivo de que las skills salen del `cwd` que viaja en `session/new` — goose la lee
  del proyecto y la anuncia al editor en `available_commands_update`.
- El `Dockerfile` es el del scaffold y hace `npm start`, que ahora exige `.env`: si se despliega en
  Fly, las variables van como secrets.
