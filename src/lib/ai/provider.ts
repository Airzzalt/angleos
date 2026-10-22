// One door to every AI provider. The rest of the app asks for a provider by name and never talks to Google or xAI directly.
import { generate, listModels as listGemini, type GenOpts, type GenResult } from "./gemini";
import { generateXai, listXaiModels } from "./xai";

export type Provider = "gemini" | "xai";
export const PROVIDER_LABEL: Record<Provider, string> = { gemini: "Gemini", xai: "xAI (Grok)" };
export const asProvider = (v: string): Provider => (v === "gemini" ? "gemini" : "xai");

export function generateWith(provider: Provider, o: GenOpts): Promise<GenResult> {
  return provider === "xai" ? generateXai(o) : generate(o);
}

export const listModelsFor = (provider: Provider) => (provider === "xai" ? listXaiModels() : listGemini());
