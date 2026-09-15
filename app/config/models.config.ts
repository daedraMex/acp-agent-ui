import type { LLMProviderId, ModelOption, ProviderConfig } from "~/types/models";

/**
 * Catálogo centralizado de proveedores y modelos (agnóstico al proveedor).
 *
 * Los componentes solo consumen ProviderConfig / ModelOption; enchufar un
 * cliente nuevo (claude, gemini, openai) es agregar una entrada aquí — sin
 * tocar UI. El tipo LLMProviderId ya los contempla.
 */
export const MODEL_PROVIDERS: ProviderConfig[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultModelId: "deepseek-chat",
    models: [
      {
        id: "deepseek-chat",
        name: "DeepSeek V3",
        description: "Respuestas rápidas",
      },
      {
        id: "deepseek-reasoner",
        name: "DeepSeek R1",
        description: "Razonamiento avanzado",
        badge: "Beta",
        isThinkingModel: true,
      },
    ],
  },
  {
    id: "easybits",
    name: "EasyBits",
    defaultModelId: "deepseek-v4-flash",
    models: [
      {
        id: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        description: "Respuestas rápidas",
        badge: "Nuevo",
      },
      {
        id: "deepseek-r1",
        name: "DeepSeek R1",
        description: "Razonamiento avanzado",
        isThinkingModel: true,
      },
    ],
  },
  // claude / gemini / openai: listos en el tipo LLMProviderId — se registran
  // aquí cuando haya credenciales, sin cambios en los componentes.
];

export const DEFAULT_PROVIDER_ID: LLMProviderId = "deepseek";

const providerOf = (modelId: string): ProviderConfig | undefined =>
  MODEL_PROVIDERS.find((p) => p.models.some((m) => m.id === modelId));

export function getProvider(id: LLMProviderId): ProviderConfig | undefined {
  return MODEL_PROVIDERS.find((p) => p.id === id);
}

export function getModel(modelId: string): ModelOption | undefined {
  return MODEL_PROVIDERS.flatMap((p) => p.models).find((m) => m.id === modelId);
}

/** Resuelve (provider, modelo) a partir de un modelId, con fallback al default. */
export function resolveSelection(
  providerId?: string | null,
  modelId?: string | null
): { provider: ProviderConfig; model: ModelOption } {
  const provider =
    getProvider((providerId as LLMProviderId) ?? DEFAULT_PROVIDER_ID) ??
    MODEL_PROVIDERS[0];
  const model =
    (modelId && provider.models.find((m) => m.id === modelId)) ||
    provider.models.find((m) => m.id === provider.defaultModelId) ||
    provider.models[0];
  return { provider, model };
}

export { providerOf };
