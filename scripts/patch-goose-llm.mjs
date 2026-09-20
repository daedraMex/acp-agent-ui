/**
 * Pisa el LLM de una caja goose ya viva (no crea una caja nueva).
 *
 *   EASYBITS_API_KEY=... DEEPSEEK_API_KEY=... AGENT_BOX_ID=sb_... node scripts/patch-goose-llm.mjs
 *
 * Pasos: despertar si está suspendida → reescribir /root/.config/goose/.env
 * con DeepSeek directo → reiniciar goose-acp.service (systemd solo lee el
 * .env al arrancar, así que sin el restart el proceso viejo sigue con el
 * proveedor anterior en memoria).
 */
const API = "https://www.easybits.cloud/api/v2";
const KEY = process.env.EASYBITS_API_KEY;
if (!KEY) throw new Error("falta EASYBITS_API_KEY");
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_KEY) throw new Error("falta DEEPSEEK_API_KEY");
const ID = process.env.AGENT_BOX_ID;
if (!ID) throw new Error("falta AGENT_BOX_ID");
const MODEL = process.env.GOOSE_MODEL ?? "deepseek-flash";

const rest = async (p, o = {}) => {
  const r = await fetch(API + p, {
    method: o.method ?? "GET",
    headers: { authorization: `Bearer ${KEY}`, ...(o.body ? { "content-type": "application/json" } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${p} → ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
};

const t0 = Date.now();
const since = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

// 1. Despertar si hace falta.
let s = await rest(`/sandboxes/${ID}`);
console.log(`estado inicial: ${s.status} (${since()})`);
if (s.status === "suspended") {
  await rest(`/sandboxes/${ID}/resume`, { method: "POST" });
  for (let i = 0; i < 60; i++) {
    s = await rest(`/sandboxes/${ID}`);
    if (s.status === "running") break;
    if (["error", "stopped", "lost"].includes(s.status)) throw new Error(`caja en ${s.status}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}
console.log(`running (${since()})`);

const exec = async (command, timeoutSeconds = 60) => {
  const r = await rest(`/sandboxes/${ID}/exec`, { method: "POST", body: { command, timeoutSeconds } });
  if (r.exitCode !== 0) throw new Error(`exec falló (${r.exitCode}): ${(r.stderr || r.stdout).slice(-300)}`);
  return r.stdout.trim();
};

// 2. Reescribir el LLM = DeepSeek directo (mismo formato que new-goose-box.mjs).
await exec(`
set -e
printf 'GOOSE_PROVIDER=openai\\nGOOSE_MODEL=%s\\nOPENAI_BASE_URL=https://api.deepseek.com\\nOPENAI_API_KEY=%s\\n' '${MODEL}' '${DEEPSEEK_KEY}' > /root/.config/goose/.env
chmod 600 /root/.config/goose/.env
`);
console.log(`LLM reescrito (${since()})`);

// 3. Reiniciar el servicio: el proceso viejo ya tiene el proveedor anterior
//    cargado en memoria, el archivo solo no alcanza.
console.log(
  "restart",
  await exec(`
set -e
systemctl restart goose-acp.service
sleep 2
systemctl is-active goose-acp.service
`)
);
console.log(`listo (${since()}) — modelo=${MODEL}`);
