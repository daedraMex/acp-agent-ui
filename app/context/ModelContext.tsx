/**
 * Contexto global del Selector de Modelo.
 *
 * Mantiene el modelo y proveedor activos, persiste la preferencia en
 * localStorage y expone setModel(modelId) — el método que inyecta la
 * selección en el flujo de inferencia (el id viaja en el POST de
 * /api/conversations y la sesión ACP lo guarda).
 *
 * SSR-safe: localStorage se lee después del primer render, igual que
 * NavigationContext, para no desajustar la hidratación.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LLMProviderId, ModelOption, ProviderConfig } from "~/types/models";
import {
  DEFAULT_PROVIDER_ID,
  MODEL_PROVIDERS,
  resolveSelection,
} from "~/config/models.config";

const STORAGE_MODEL = "model.activeModelId";
const STORAGE_PROVIDER = "model.activeProviderId";

interface ModelContextValue {
  providers: ProviderConfig[];
  activeProviderId: LLMProviderId;
  activeProvider: ProviderConfig;
  activeModelId: string;
  activeModel: ModelOption;
  /** Inyecta el modelo elegido en el flujo de inferencia / sesión ACP. */
  setModel: (modelId: string) => void;
  setProvider: (providerId: LLMProviderId) => void;
}

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [activeModelId, setActiveModelId] = useState(MODEL_PROVIDERS[0].defaultModelId);
  const [activeProviderId, setActiveProviderId] = useState<LLMProviderId>(DEFAULT_PROVIDER_ID);

  // Hidratación post-mount para no romper el SSR.
  useEffect(() => {
    const storedModel = localStorage.getItem(STORAGE_MODEL);
    const storedProvider = localStorage.getItem(STORAGE_PROVIDER);
    if (storedProvider) {
      setActiveProviderId(storedProvider as LLMProviderId);
      if (storedModel) setActiveModelId(storedModel);
    } else if (storedModel) {
      setActiveModelId(storedModel);
      const { provider } = resolveSelection(null, storedModel);
      setActiveProviderId(provider.id);
    }
  }, []);

  const { provider: activeProvider, model: activeModel } = resolveSelection(
    activeProviderId,
    activeModelId
  );

  const setModel = (modelId: string) => {
    setActiveModelId(modelId);
    const { provider } = resolveSelection(activeProviderId, modelId);
    setActiveProviderId(provider.id);
    localStorage.setItem(STORAGE_MODEL, modelId);
    localStorage.setItem(STORAGE_PROVIDER, provider.id);
  };

  const setProvider = (providerId: LLMProviderId) => {
    const provider = MODEL_PROVIDERS.find((p) => p.id === providerId);
    if (!provider) return;
    const modelId = provider.defaultModelId;
    setActiveProviderId(providerId);
    setActiveModelId(modelId);
    localStorage.setItem(STORAGE_PROVIDER, providerId);
    localStorage.setItem(STORAGE_MODEL, modelId);
  };

  return (
    <ModelContext.Provider
      value={{
        providers: MODEL_PROVIDERS,
        activeProviderId: activeProvider.id,
        activeProvider,
        activeModelId: activeModel.id,
        activeModel,
        setModel,
        setProvider,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModelSelector() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModelSelector fuera de ModelProvider");
  return ctx;
}
