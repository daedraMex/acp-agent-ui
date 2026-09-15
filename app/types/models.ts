/**
 * Dominio del Selector de Modelo — agnóstico al proveedor LLM.
 *
 * Desacopla "Proveedor" de "Modelo": los componentes visuales consumen
 * ProviderConfig / ModelOption y nunca saben de qué motor de inferencia
 * vienen. Agregar un proveedor nuevo es agregar datos, no UI.
 */

export type LLMProviderId = "deepseek" | "easybits" | "claude" | "gemini" | "openai";

export interface ModelOption {
  id: string; // ej: 'deepseek-chat', 'deepseek-reasoner', 'gemini-1.5-flash', etc.
  name: string; // ej: 'DeepSeek V3', 'DeepSeek R1', 'Flash'
  description: string; // ej: 'Respuestas rápidas', 'Razonamiento avanzado'
  badge?: string; // ej: 'Nuevo', 'Beta'
  isThinkingModel?: boolean;
}

export interface ProviderConfig {
  id: LLMProviderId;
  name: string;
  models: ModelOption[];
  defaultModelId: string;
}
